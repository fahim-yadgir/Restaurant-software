// Admin (software owner) sign-in, sign-out and password change.
//
// The admin is stored in the `admins` table. The very first login creates that row from
// ADMIN_EMAIL (wrangler.jsonc vars) and ADMIN_PASSWORD (secret). After that the password in the
// database is the only one that works, so changing it from the Account page really changes it.
//
// Forgot the password?  Delete the row, then the ADMIN_PASSWORD secret works again:
//   npx wrangler d1 execute restrodesk --remote --command "DELETE FROM admins"

import { ApiError, badRequest } from '../utils/errors.js'
import { hashPassword, safeEqual, verifyPassword } from '../utils/password.js'
import { signJwt } from '../utils/jwt.js'
import { newId } from '../utils/validate.js'
import { assertNotLocked, attemptKey, clearFailures, recordFailure } from '../utils/rateLimit.js'

const TOKEN_LIFETIME_SEC = 12 * 60 * 60 // 12 hours
const MIN_PASSWORD_LENGTH = 8

const issueToken = (admin, secret) =>
  signJwt(
    // pwv = password version. When the password changes, every older token stops working.
    { role: 'admin', sub: admin.id, email: admin.email, pwv: admin.password_changed_at },
    secret,
    TOKEN_LIFETIME_SEC
  )

// First login ever: create the admin from ADMIN_EMAIL / ADMIN_PASSWORD.
async function seedAdmin(c, email) {
  const now = Date.now()

  await c.env.DB
    .prepare(
      'INSERT OR IGNORE INTO admins (id, email, password_hash, password_changed_at, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(newId('adm'), email, await hashPassword(c.env.ADMIN_PASSWORD, c.env), now, now)
    .run()

  return c.env.DB.prepare('SELECT * FROM admins WHERE email = ?').bind(email).first()
}

// POST /api/admin/login      body: { email, password }
export async function login(c) {
  const db = c.env.DB
  const body = await c.req.json().catch(() => null)

  if (!body || typeof body !== 'object') throw badRequest('Send email and password as JSON.')

  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')

  if (!email || !password) throw badRequest('Enter admin email and password.')

  const key = attemptKey(c, 'login')

  await assertNotLocked(db, key)

  let admin = await db.prepare('SELECT * FROM admins ORDER BY created_at LIMIT 1').first()
  let ok = false

  if (admin) {
    // Both checks always run, so the response time does not reveal which one was wrong.
    const emailOk = await safeEqual(email, admin.email)
    const passwordOk = await verifyPassword(password, admin.password_hash)

    ok = emailOk && passwordOk
  } else {
    const envEmail = String(c.env.ADMIN_EMAIL || '').trim().toLowerCase()
    const emailOk = await safeEqual(email, envEmail)
    const passwordOk = await safeEqual(password, c.env.ADMIN_PASSWORD)

    ok = emailOk && passwordOk && !!envEmail

    if (ok) admin = await seedAdmin(c, envEmail)
  }

  if (!ok) {
    const left = await recordFailure(db, key)

    if (left === 0) await assertNotLocked(db, key)

    throw new ApiError(
      401,
      'INVALID',
      left <= 2
        ? `Incorrect admin email or password. ${left} attempt${left === 1 ? '' : 's'} left before a 15 minute lock.`
        : 'Incorrect admin email or password.'
    )
  }

  await clearFailures(db, key)

  const token = await issueToken(admin, c.env.JWT_SECRET)

  return c.json({ token, expiresIn: TOKEN_LIFETIME_SEC, admin: { email: admin.email } })
}

// GET /api/admin/me          header: Authorization: Bearer <token>
// Lets the React app check that a saved token still works.
export function me(c) {
  const admin = c.get('admin')

  return c.json({ admin: { email: admin.email }, expiresAt: admin.exp * 1000 })
}

// POST /api/admin/change-password      body: { currentPassword, newPassword }
// Every older token stops working. A new token is returned so this browser stays signed in.
export async function changePassword(c) {
  const db = c.env.DB
  const session = c.get('admin')
  const body = await c.req.json().catch(() => null)

  if (!body || typeof body !== 'object') throw badRequest('Send the passwords as JSON.')

  const currentPassword = String(body.currentPassword || '')
  const newPassword = String(body.newPassword || '')

  if (!currentPassword) throw badRequest('Enter your current password.')

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw badRequest(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  }

  if (newPassword === currentPassword) throw badRequest('New password must be different from the current one.')

  // Someone holding a stolen token must not be able to guess the current password endlessly.
  const key = attemptKey(c, 'change')

  await assertNotLocked(db, key)

  const admin = await db.prepare('SELECT * FROM admins WHERE id = ?').bind(session.sub).first()

  if (!admin) throw new ApiError(401, 'UNAUTHORIZED', 'Please sign in again.')

  // 400 (not 401), so the app shows the message instead of signing the admin out.
  if (!(await verifyPassword(currentPassword, admin.password_hash))) {
    const left = await recordFailure(db, key)

    if (left === 0) await assertNotLocked(db, key)

    throw new ApiError(400, 'WRONG_PASSWORD', 'Current password is incorrect.')
  }

  await clearFailures(db, key)

  const now = Date.now()

  await db
    .prepare('UPDATE admins SET password_hash = ?, password_changed_at = ? WHERE id = ?')
    .bind(await hashPassword(newPassword, c.env), now, admin.id)
    .run()

  const token = await issueToken({ ...admin, password_changed_at: now }, c.env.JWT_SECRET)

  return c.json({ token, expiresIn: TOKEN_LIFETIME_SEC })
}

// POST /api/admin/logout     header: Authorization: Bearer <token>
// The token is saved as revoked, so it stops working right away (even if someone copied it).
export async function logout(c) {
  const admin = c.get('admin')
  const db = c.env.DB
  const expiresAt = admin.exp * 1000

  await db.batch([
    db.prepare('INSERT OR IGNORE INTO revoked_tokens (jti, expires_at) VALUES (?, ?)').bind(admin.jti, expiresAt),
    // Housekeeping: tokens that have expired anyway no longer need to be remembered.
    db.prepare('DELETE FROM revoked_tokens WHERE expires_at < ?').bind(Date.now()),
  ])

  return c.json({ ok: true })
}