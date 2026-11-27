// Restaurant owner (the PC app): sign in, refresh the license, change the password.
// These are the only calls the PC app needs the internet for.
//
// Rule: ONE login works on ONE device. The first sign-in links the device (and starts the plan).
// Any other device is refused until the admin presses "Reset device".

import { ApiError, badRequest } from '../utils/errors.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import { issueLicense, verifyLicense } from '../utils/license.js'
import { normalizeEmail, normalizeMobile } from '../utils/validate.js'
import { assertNotLocked, attemptKey, clearFailures, recordFailure } from '../utils/rateLimit.js'
import { DAY_MS } from '../services/plan.js'

const MIN_PASSWORD_LENGTH = 6
const MAX_IDENTIFIER_FAILURES = 5 // per account, per visitor
const MAX_VISITOR_FAILURES = 30 // per visitor, across all accounts

const INVALID_LOGIN = 'Incorrect email / mobile or password.'

const removedError = () =>
  new ApiError(403, 'ACCOUNT_REMOVED', 'This restaurant account has been removed. Contact the software owner.')

const revokedError = () =>
  new ApiError(403, 'DEVICE_REVOKED', 'This device is no longer linked to the account. Please sign in again.')

// A hash to compare against when the account does not exist, so the response time
// does not reveal whether an email / mobile is registered.
let dummyHash = null

async function dummy(env) {
  if (!dummyHash) dummyHash = await hashPassword('no-such-account', env)

  return dummyHash
}

const getRow = (db, id) => db.prepare('SELECT * FROM restaurants WHERE id = ?').bind(id).first()

// ---------- first sign-in on a device ----------
async function bindDevice(db, row, deviceId) {
  const now = Date.now()
  const lifetime = row.plan_type === 'lifetime'

  // The plan starts at the first sign-in ever. A device reset keeps the existing expiry.
  const activatedAt = row.activated_at || now
  const expiresAt = lifetime ? null : row.activated_at ? row.expires_at : now + row.duration_days * DAY_MS

  // "AND device_id IS NULL": if two devices sign in at the same moment, only one wins.
  const result = await db
    .prepare(
      `UPDATE restaurants
          SET device_id = ?, device_bound_at = ?, activated_at = ?, expires_at = ?, last_seen_at = ?
        WHERE id = ? AND device_id IS NULL`
    )
    .bind(deviceId, now, activatedAt, expiresAt, now, row.id)
    .run()

  if (result.meta.changes !== 1) {
    const fresh = await getRow(db, row.id)

    if (!fresh || fresh.device_id !== deviceId) throw deviceMismatch()

    return fresh
  }

  if (!row.activated_at) {
    // Give the plan rows that were waiting for the first sign-in their real dates (one after another).
    const { results } = await db
      .prepare('SELECT id, plan_type, duration_days FROM subscriptions WHERE restaurant_id = ? AND starts_at IS NULL ORDER BY created_at')
      .bind(row.id)
      .all()

    let cursor = now

    const updates = results.map((plan) => {
      const endsAt = plan.plan_type === 'lifetime' ? null : cursor + plan.duration_days * DAY_MS
      const statement = db
        .prepare('UPDATE subscriptions SET starts_at = ?, ends_at = ? WHERE id = ?')
        .bind(cursor, endsAt, plan.id)

      if (endsAt) cursor = endsAt

      return statement
    })

    if (updates.length) await db.batch(updates)
  }

  return getRow(db, row.id)
}

const deviceMismatch = () =>
  new ApiError(
    403,
    'DEVICE_MISMATCH',
    'This account is already active on another device. Ask the software owner to reset the device.'
  )

// ---------- POST /api/auth/owner/login ----------
// body: { identifier (mobile or email), password, deviceId }
// returns: { license, token }  (token = the signed license the PC keeps)
export async function login(c) {
  const db = c.env.DB
  const body = await c.req.json().catch(() => null)

  if (!body || typeof body !== 'object') throw badRequest('Send the sign-in details as JSON.')

  const identifier = String(body.identifier || '').trim()
  const password = String(body.password || '')
  const deviceId = String(body.deviceId || '').trim()

  if (!identifier || !password) throw badRequest('Enter your email/mobile number and password.')

  if (deviceId.length < 8 || deviceId.length > 100) {
    throw badRequest('This device could not be identified. Restart the app and try again.')
  }

  const isEmail = identifier.includes('@')
  const value = isEmail ? normalizeEmail(identifier) : normalizeMobile(identifier)

  const visitorKey = attemptKey(c, 'owner-visitor')
  const accountKey = `${attemptKey(c, 'owner')}:${value}`

  await assertNotLocked(db, visitorKey)
  await assertNotLocked(db, accountKey)

  const row = await db
    .prepare(isEmail ? 'SELECT * FROM restaurants WHERE email = ?' : 'SELECT * FROM restaurants WHERE mobile = ?')
    .bind(value)
    .first()

  const passwordOk = await verifyPassword(password, row ? row.password_hash : await dummy(c.env))

  if (!row || !passwordOk) {
    const left = await recordFailure(db, accountKey, MAX_IDENTIFIER_FAILURES)

    await recordFailure(db, visitorKey, MAX_VISITOR_FAILURES)

    if (left === 0) await assertNotLocked(db, accountKey)

    throw new ApiError(
      401,
      'INVALID',
      left <= 2
        ? `${INVALID_LOGIN} ${left} attempt${left === 1 ? '' : 's'} left before a 15 minute lock.`
        : INVALID_LOGIN
    )
  }

  await clearFailures(db, accountKey)

  if (row.deleted_at) throw removedError()

  let current = row

  if (!row.device_id) {
    current = await bindDevice(db, row, deviceId)
  } else if (row.device_id !== deviceId) {
    throw deviceMismatch()
  } else {
    await db.prepare('UPDATE restaurants SET last_seen_at = ? WHERE id = ?').bind(Date.now(), row.id).run()
  }

  return c.json(await issueLicense(current, c.env))
}

// Checks the license the PC sent: genuine (our signature), for this device, account still there.
async function authorize(c, body) {
  const deviceId = String(body.deviceId || '').trim()
  const payload = await verifyLicense(body.token, c.env)

  if (!payload || !payload.restaurantId) {
    throw new ApiError(401, 'INVALID_LICENSE', 'This license is not valid. Please sign in again.')
  }

  const row = await getRow(c.env.DB, payload.restaurantId)

  if (!row) throw new ApiError(404, 'NOT_FOUND', 'This restaurant account no longer exists.')

  if (row.deleted_at) throw removedError()

  // The device was reset (device_id empty), or this is another computer.
  if (!deviceId || !row.device_id || row.device_id !== deviceId || payload.deviceId !== deviceId) {
    throw revokedError()
  }

  return row
}

// ---------- POST /api/license/refresh ----------
// body: { token, deviceId }   returns: { license, token }
// Call it after a renewal, a plan change or a device reset. An expired plan can still refresh.
export async function refresh(c) {
  const body = await c.req.json().catch(() => null)

  if (!body || typeof body !== 'object') throw badRequest('Send the license as JSON.')

  const row = await authorize(c, body)

  await c.env.DB.prepare('UPDATE restaurants SET last_seen_at = ? WHERE id = ?').bind(Date.now(), row.id).run()

  return c.json(await issueLicense(row, c.env))
}

// ---------- POST /api/owner/change-password ----------
// body: { token, deviceId, currentPassword, newPassword }   returns: { license, token }
// The password lives in the cloud too (the app uses it to sign in offline), so this needs internet.
export async function changePassword(c) {
  const db = c.env.DB
  const body = await c.req.json().catch(() => null)

  if (!body || typeof body !== 'object') throw badRequest('Send the passwords as JSON.')

  const currentPassword = String(body.currentPassword || '')
  const newPassword = String(body.newPassword || '')

  if (!currentPassword) throw badRequest('Enter your current password.')

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw badRequest(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  }

  if (newPassword === currentPassword) throw badRequest('New password must be different from the current one.')

  const row = await authorize(c, body)
  const key = `owner-change:${row.id}`

  await assertNotLocked(db, key)

  if (!(await verifyPassword(currentPassword, row.password_hash))) {
    const left = await recordFailure(db, key)

    if (left === 0) await assertNotLocked(db, key)

    throw new ApiError(400, 'WRONG_PASSWORD', 'Current password is incorrect.')
  }

  await clearFailures(db, key)

  await db
    .prepare('UPDATE restaurants SET password_hash = ?, must_change_password = 0 WHERE id = ?')
    .bind(await hashPassword(newPassword, c.env), row.id)
    .run()

  return c.json(await issueLicense(await getRow(db, row.id), c.env))
}