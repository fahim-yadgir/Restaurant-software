// Admin: revenue (income) numbers and manual payments.
// Payments are written by register / renew / restore (adminRestaurants.controller.js).
// They are never deleted when a restaurant is deleted, so income history is permanent.

import { badRequest, notFound } from '../utils/errors.js'
import { PAYMENT_METHODS, newId, parseAmount, parseMethod, readJson } from '../utils/validate.js'
import { toPayment } from '../db/mappers.js'
import { planLabel } from '../services/plan.js'

const PAYMENT_TYPES = ['new', 'renewal', 'upgrade', 'other']

// A payment date (epoch ms): 2020 or later, not more than a day in the future.
function parsePaidOn(value, now) {
  const paidOn = Math.trunc(Number(value))

  if (!Number.isFinite(paidOn) || paidOn < Date.UTC(2020, 0, 1) || paidOn > now + 24 * 60 * 60 * 1000) {
    throw badRequest('Enter a valid payment date (not in the future).')
  }

  return paidOn
}

const parseNote = (value) => String(value || '').trim().slice(0, 200)

function parsePaymentAmount(value) {
  const amount = parseAmount(value)

  if (!(amount > 0) || amount > 100000000) throw badRequest('Enter an amount greater than 0.')

  return amount
}

// ---------- GET /api/admin/revenue?offset=330 ----------
// ONE query, grouped by month / reason / method / plan. The page builds every card and chart
// from these few rows, so switching "This month / This year" in the browser costs no extra reads.
// offset = the admin's time zone in minutes east of UTC (India = 330), so a payment made at
// 11:30 PM on the 30th lands in the right month.
export async function revenue(c) {
  const offsetMin = Math.max(-840, Math.min(840, Math.trunc(Number(c.req.query('offset')) || 0)))
  const offsetMs = offsetMin * 60 * 1000

  const { results } = await c.env.DB
    .prepare(
      `SELECT strftime('%Y-%m', (paid_on + ?) / 1000, 'unixepoch') AS ym,
              type, method, plan,
              SUM(amount) AS total, COUNT(*) AS count
         FROM payments
        GROUP BY ym, type, method, plan`
    )
    .bind(offsetMs)
    .all()

  return c.json({
    rows: results.map((r) => ({
      ym: r.ym,
      type: r.type,
      method: r.method,
      plan: r.plan || '',
      total: Number(r.total) || 0,
      count: Number(r.count) || 0,
    })),
    generatedAt: Date.now(),
  })
}

// ---------- POST /api/admin/payments ----------
// A payment received outside register / renew (for example a lifetime upgrade).
// body: { restaurantId, amount, type?, method?, paidOn?, note? }
export async function createPayment(c) {
  const db = c.env.DB
  const body = await c.req.json().catch(() => null)

  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest('Send the details as JSON.')

  const restaurantId = String(body.restaurantId || '')

  if (!restaurantId) throw badRequest('Select a restaurant.')

  const restaurant = await db
    .prepare('SELECT id, name, plan_type, duration_days FROM restaurants WHERE id = ?')
    .bind(restaurantId)
    .first()

  if (!restaurant) throw notFound('Restaurant not found.')

  const amount = parsePaymentAmount(body.amount)
  const type = PAYMENT_TYPES.includes(body.type) ? body.type : 'other'
  const method = parseMethod(body.method)
  const note = parseNote(body.note)
  const now = Date.now()

  const hasDate = body.paidOn !== undefined && body.paidOn !== null && body.paidOn !== ''
  const paidOn = hasDate ? parsePaidOn(body.paidOn, now) : now

  const id = newId('pay')

  await db
    .prepare(
      `INSERT INTO payments (id, restaurant_id, restaurant_name, type, plan, amount, method, note, paid_on, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, restaurant.id, restaurant.name, type,
      planLabel(restaurant.plan_type, restaurant.duration_days),
      amount, method, note, paidOn, now
    )
    .run()

  const row = await db.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first()

  return c.json({ payment: toPayment(row) }, 201)
}

// ---------- GET /api/admin/payments/recent?limit=10 ----------
// The latest payments (newest first), so a wrong entry can be corrected or removed.
export async function recentPayments(c) {
  const limit = Math.min(50, Math.max(1, Math.trunc(Number(c.req.query('limit')) || 10)))

  const { results } = await c.env.DB
    .prepare('SELECT * FROM payments ORDER BY paid_on DESC LIMIT ?')
    .bind(limit)
    .all()

  return c.json({ payments: results.map(toPayment) })
}

// ---------- PATCH /api/admin/payments/:id ----------
// Send only what changes: { amount, type, method, paidOn, note }. The restaurant cannot be changed.
export async function updatePayment(c) {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await readJson(c)
  const row = await db.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first()

  if (!row) throw notFound('Payment not found.')

  const now = Date.now()

  const amount = body.amount !== undefined ? parsePaymentAmount(body.amount) : row.amount

  if (body.type !== undefined && !PAYMENT_TYPES.includes(body.type)) throw badRequest('Choose a valid reason.')
  if (body.method !== undefined && !PAYMENT_METHODS.includes(body.method)) throw badRequest('Choose a valid payment method.')

  const type = body.type !== undefined ? body.type : row.type
  const method = body.method !== undefined ? body.method : row.method
  const note = body.note !== undefined ? parseNote(body.note) : row.note
  const paidOn = body.paidOn !== undefined ? parsePaidOn(body.paidOn, now) : row.paid_on

  await db
    .prepare('UPDATE payments SET amount = ?, type = ?, method = ?, note = ?, paid_on = ? WHERE id = ?')
    .bind(amount, type, method, note, paidOn, id)
    .run()

  const updated = await db.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first()

  return c.json({ payment: toPayment(updated) })
}

// ---------- DELETE /api/admin/payments/:id ----------
// Removes only the income entry. The restaurant and its plan are not changed.
export async function removePayment(c) {
  const db = c.env.DB
  const id = c.req.param('id')
  const row = await db.prepare('SELECT id FROM payments WHERE id = ?').bind(id).first()

  if (!row) throw notFound('Payment not found.')

  await db.batch([
    db.prepare('UPDATE subscriptions SET payment_id = NULL WHERE payment_id = ?').bind(id),
    db.prepare('DELETE FROM payments WHERE id = ?').bind(id),
  ])

  return c.json({ ok: true })
}