// Admin: manage restaurant accounts. Only profile + plan + payments live here;
// the restaurant's own business data (bills, menu...) never reaches the server.

import { ApiError, badRequest, notFound } from '../utils/errors.js'
import { hashPassword, randomPassword } from '../utils/password.js'
import {
  isMobile, newId, normalizeMobile,
  parseAmount, parseMethod, parseOptionalEmail, parsePlan, readJson,
} from '../utils/validate.js'
import { toRestaurant, toSubscription } from '../db/mappers.js'
import { DAY_MS, planLabel, renewPlan, restaurantStatus } from '../services/plan.js'

// ---------- helpers ----------
const withStatus = (row) => {
  const restaurant = toRestaurant(row)

  return { ...restaurant, status: restaurantStatus(restaurant) }
}

// Deleted restaurants are hidden from every action unless includeDeleted is set.
async function getRow(db, id, { includeDeleted = false } = {}) {
  const row = await db.prepare('SELECT * FROM restaurants WHERE id = ?').bind(id).first()

  if (!row) throw notFound('Restaurant not found.')

  if (row.deleted_at && !includeDeleted) {
    throw new ApiError(409, 'DELETED', 'This restaurant is deleted. Restore it first.')
  }

  return row
}

// 409 when another restaurant already uses this mobile (or email, if one was given).
async function assertUnique(db, { email, mobile, exceptId = '' }) {
  const dup = await db
    .prepare(
      `SELECT mobile, deleted_at FROM restaurants
        WHERE (mobile = ? OR (? IS NOT NULL AND email = ?)) AND id != ?`
    )
    .bind(mobile, email, email, exceptId)
    .first()

  if (dup?.deleted_at) {
    throw new ApiError(
      409,
      'DUPLICATE',
      'This mobile or email belongs to a deleted restaurant. Restore it from Deleted restaurants, or delete it permanently first.'
    )
  }

  if (dup) {
    throw new ApiError(
      409,
      'DUPLICATE',
      dup.mobile === mobile
        ? 'A restaurant with this mobile number is already registered.'
        : 'A restaurant with this email is already registered.'
    )
  }
}

const insertSubscription = (db, s) =>
  db
    .prepare(
      `INSERT INTO subscriptions (id, restaurant_id, plan_type, duration_days, starts_at, ends_at, payment_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(s.id, s.restaurantId, s.planType, s.durationDays, s.startsAt, s.endsAt, s.paymentId, s.createdAt)

const insertPayment = (db, p) =>
  db
    .prepare(
      `INSERT INTO payments (id, restaurant_id, restaurant_name, type, plan, amount, method, note, paid_on, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, '', ?, ?)`
    )
    .bind(p.id, p.restaurantId, p.restaurantName, p.type, p.plan, p.amount, p.method, p.paidOn, p.paidOn)

// ---------- GET /api/admin/restaurants ----------
export async function list(c) {
  const { results } = await c.env.DB
    .prepare('SELECT * FROM restaurants WHERE deleted_at IS NULL ORDER BY created_at DESC')
    .all()

  return c.json({ restaurants: results.map(withStatus) })
}

// ---------- GET /api/admin/restaurants/deleted ----------
// The "Deleted restaurants" page. Newest deleted first.
export async function listDeleted(c) {
  const { results } = await c.env.DB
    .prepare('SELECT * FROM restaurants WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC')
    .all()

  return c.json({ restaurants: results.map(withStatus) })
}

// ---------- GET /api/admin/restaurants/:id ----------
export async function getOne(c) {
  return c.json({ restaurant: withStatus(await getRow(c.env.DB, c.req.param('id'), { includeDeleted: true })) })
}

// ---------- POST /api/admin/restaurants ----------
// body: { name, ownerName, mobile, email?, password?, planType, durationDays, amount?, method? }
// Leave password out and the server makes one and returns it ONCE in the response.
export async function create(c) {
  const db = c.env.DB
  const body = await readJson(c)

  const name = String(body.name || '').trim()
  const ownerName = String(body.ownerName || '').trim()
  const mobile = normalizeMobile(body.mobile)
  const email = parseOptionalEmail(body.email)

  if (!name) throw badRequest('Enter the restaurant name.')
  if (!ownerName) throw badRequest('Enter the owner name.')
  if (!isMobile(mobile)) throw badRequest('Enter a valid 10-digit mobile number.')

  const { planType, durationDays } = parsePlan(body.planType, body.durationDays)
  const amount = parseAmount(body.amount)
  const method = parseMethod(body.method)

  let password = String(body.password || '')
  const generated = !password

  if (generated) password = randomPassword(8)
  else if (password.length < 6) throw badRequest('Owner password must be at least 6 characters.')

  await assertUnique(db, { email, mobile })

  const now = Date.now()
  const id = newId('rest')
  const paymentId = amount > 0 ? newId('pay') : null
  const passwordHash = await hashPassword(password, c.env)

  const statements = [
    db
      .prepare(
        `INSERT INTO restaurants (id, name, owner_name, mobile, email, password_hash, plan_type, duration_days, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, name, ownerName, mobile, email, passwordHash, planType, durationDays, now),
    // The plan starts at the owner's first login, so starts_at / ends_at stay empty for now.
    insertSubscription(db, {
      id: newId('sub'), restaurantId: id, planType, durationDays,
      startsAt: null, endsAt: null, paymentId, createdAt: now,
    }),
  ]

  if (paymentId) {
    statements.push(
      insertPayment(db, {
        id: paymentId, restaurantId: id, restaurantName: name, type: 'new',
        plan: planLabel(planType, durationDays), amount, method, paidOn: now,
      })
    )
  }

  await db.batch(statements) // all or nothing

  return c.json(
    { restaurant: withStatus(await getRow(db, id)), ...(generated ? { password } : {}) },
    201
  )
}

// ---------- PATCH /api/admin/restaurants/:id ----------
// Send only what changes: { name, ownerName, mobile, email, planType, durationDays }
export async function update(c) {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await readJson(c)
  const old = await getRow(db, id)

  const name = body.name !== undefined ? String(body.name).trim() : old.name
  const ownerName = body.ownerName !== undefined ? String(body.ownerName).trim() : old.owner_name
  const mobile = body.mobile !== undefined ? normalizeMobile(body.mobile) : old.mobile
  const email = body.email !== undefined ? parseOptionalEmail(body.email) : old.email

  if (!name || !ownerName) throw badRequest('Restaurant and owner names are required.')
  if (!isMobile(mobile)) throw badRequest('Enter a valid 10-digit mobile number.')

  const { planType, durationDays } = parsePlan(
    body.planType ?? old.plan_type,
    body.durationDays ?? old.duration_days
  )

  await assertUnique(db, { email, mobile, exceptId: id })

  // The plan end date follows the new duration (only once the plan has started).
  const expiresAt =
    planType === 'lifetime' || !old.activated_at ? null : old.activated_at + durationDays * DAY_MS

  const statements = [
    db
      .prepare(
        `UPDATE restaurants
            SET name = ?, owner_name = ?, mobile = ?, email = ?, plan_type = ?, duration_days = ?, expires_at = ?
          WHERE id = ?`
      )
      .bind(name, ownerName, mobile, email, planType, durationDays, expiresAt, id),
  ]

  // A changed plan is added to the history.
  if (planType !== old.plan_type || durationDays !== old.duration_days) {
    statements.push(
      insertSubscription(db, {
        id: newId('sub'), restaurantId: id, planType, durationDays,
        startsAt: old.activated_at, endsAt: expiresAt, paymentId: null, createdAt: Date.now(),
      })
    )
  }

  await db.batch(statements)

  return c.json({ restaurant: withStatus(await getRow(db, id)) })
}

// ---------- POST /api/admin/restaurants/:id/renew ----------
// body: { days, amount?, method? }
export async function renew(c) {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await readJson(c)
  const row = await getRow(db, id)

  if (row.plan_type === 'lifetime') {
    throw badRequest('Lifetime plans never expire, so they do not need renewal.')
  }

  const days = Number(body.days)

  if (!Number.isInteger(days) || days <= 0 || days > 3650) throw badRequest('Invalid renewal duration.')

  const amount = parseAmount(body.amount)
  const method = parseMethod(body.method)
  const now = Date.now()
  const next = renewPlan(row, days, now)
  const paymentId = amount > 0 ? newId('pay') : null

  const statements = [
    db
      .prepare('UPDATE restaurants SET duration_days = ?, expires_at = ?, renewed_at = ? WHERE id = ?')
      .bind(next.durationDays, next.expiresAt, now, id),
    insertSubscription(db, {
      id: newId('sub'), restaurantId: id, planType: 'period', durationDays: days,
      startsAt: next.startsAt, endsAt: next.endsAt, paymentId, createdAt: now,
    }),
  ]

  if (paymentId) {
    statements.push(
      insertPayment(db, {
        id: paymentId, restaurantId: id, restaurantName: row.name, type: 'renewal',
        plan: planLabel('period', days), amount, method, paidOn: now,
      })
    )
  }

  await db.batch(statements)

  return c.json({ restaurant: withStatus(await getRow(db, id)) })
}

// ---------- GET /api/admin/restaurants/:id/subscriptions ----------
// The plan history of one restaurant, newest first.
export async function subscriptions(c) {
  const db = c.env.DB
  const id = c.req.param('id')

  await getRow(db, id, { includeDeleted: true })

  const { results } = await db
    .prepare(
      `SELECT s.*, p.amount AS amount, p.method AS method
         FROM subscriptions s
         LEFT JOIN payments p ON p.id = s.payment_id
        WHERE s.restaurant_id = ?
        ORDER BY s.created_at DESC`
    )
    .bind(id)
    .all()

  return c.json({ subscriptions: results.map(toSubscription) })
}

// ---------- POST /api/admin/restaurants/:id/reset-device ----------
// Unlinks the device. The next login links a new one. The plan keeps running.
export async function resetDevice(c) {
  const id = c.req.param('id')

  await getRow(c.env.DB, id)
  await c.env.DB.prepare('UPDATE restaurants SET device_id = NULL, device_bound_at = NULL WHERE id = ?').bind(id).run()

  return c.json({ ok: true })
}

// ---------- POST /api/admin/restaurants/:id/reset-password ----------
// Makes a new password and returns it ONCE. Only its hash is saved.
export async function resetPassword(c) {
  const id = c.req.param('id')

  await getRow(c.env.DB, id)

  const password = randomPassword(8)

  await c.env.DB
    .prepare('UPDATE restaurants SET password_hash = ?, must_change_password = 1 WHERE id = ?')
    .bind(await hashPassword(password, c.env), id)
    .run()

  return c.json({ password })
}

// ---------- DELETE /api/admin/restaurants/:id ----------
// Soft delete: the restaurant moves to "Deleted restaurants". Nothing is erased, and the
// payments (income) stay exactly as they were. The owner can no longer sign in.
export async function remove(c) {
  const db = c.env.DB
  const id = c.req.param('id')

  await getRow(db, id)
  await db.prepare('UPDATE restaurants SET deleted_at = ? WHERE id = ?').bind(Date.now(), id).run()

  return c.json({ ok: true })
}

// ---------- POST /api/admin/restaurants/:id/restore ----------
// body (optional): { days, amount?, method? }
//   no days  -> only brings the restaurant back, the plan stays as it was
//   days     -> brings it back AND renews the plan by that many days (with the payment)
export async function restore(c) {
  const db = c.env.DB
  const id = c.req.param('id')
  const raw = await c.req.json().catch(() => null)
  const body = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const row = await getRow(db, id, { includeDeleted: true })

  if (!row.deleted_at) throw badRequest('This restaurant is not deleted.')

  const wantsRenewal = body.days !== undefined && body.days !== null && body.days !== '' && Number(body.days) !== 0

  if (!wantsRenewal) {
    await db.prepare('UPDATE restaurants SET deleted_at = NULL WHERE id = ?').bind(id).run()

    return c.json({ restaurant: withStatus(await getRow(db, id)) })
  }

  if (row.plan_type === 'lifetime') {
    throw badRequest('Lifetime plans never expire, so they do not need renewal.')
  }

  const days = Number(body.days)

  if (!Number.isInteger(days) || days <= 0 || days > 3650) throw badRequest('Invalid renewal duration.')

  const amount = parseAmount(body.amount)
  const method = parseMethod(body.method)
  const now = Date.now()
  const next = renewPlan(row, days, now)
  const paymentId = amount > 0 ? newId('pay') : null

  const statements = [
    db
      .prepare('UPDATE restaurants SET deleted_at = NULL, duration_days = ?, expires_at = ?, renewed_at = ? WHERE id = ?')
      .bind(next.durationDays, next.expiresAt, now, id),
    insertSubscription(db, {
      id: newId('sub'), restaurantId: id, planType: 'period', durationDays: days,
      startsAt: next.startsAt, endsAt: next.endsAt, paymentId, createdAt: now,
    }),
  ]

  if (paymentId) {
    statements.push(
      insertPayment(db, {
        id: paymentId, restaurantId: id, restaurantName: row.name, type: 'renewal',
        plan: planLabel('period', days), amount, method, paidOn: now,
      })
    )
  }

  await db.batch(statements)

  return c.json({ restaurant: withStatus(await getRow(db, id)) })
}

// ---------- DELETE /api/admin/restaurants/:id/permanent ----------
// Only for restaurants that are already deleted. Removes the account and its plan history for good.
// Payments stay, so revenue totals never change.
export async function removePermanently(c) {
  const db = c.env.DB
  const id = c.req.param('id')
  const row = await getRow(db, id, { includeDeleted: true })

  if (!row.deleted_at) {
    throw badRequest('Delete the restaurant first. Only deleted restaurants can be removed permanently.')
  }

  await db.batch([
    db.prepare('DELETE FROM subscriptions WHERE restaurant_id = ?').bind(id),
    db.prepare('DELETE FROM restaurants WHERE id = ?').bind(id),
  ])

  return c.json({ ok: true })
}