// Admin (software owner) sign-in / sign-out. The admin is NOT in the database:
// email = ADMIN_EMAIL (wrangler.jsonc vars), password = ADMIN_PASSWORD (secret).

import { ApiError, badRequest } from '../utils/errors.js'
import { safeEqual } from '../utils/password.js'
import { signJwt } from '../utils/jwt.js'

const TOKEN_LIFETIME_SEC = 12 * 60 * 60 // 12 hours

// POST /api/admin/login      body: { email, password }
export async function login(c) {
  const body = await c.req.json().catch(() => null)

  if (!body || typeof body !== 'object') throw badRequest('Send email and password as JSON.')

  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')

  if (!email || !password) throw badRequest('Enter admin email and password.')

  // Both checks always run, so the response time does not reveal which one was wrong.
  const emailOk = await safeEqual(email, String(c.env.ADMIN_EMAIL || '').trim().toLowerCase())
  const passwordOk = await safeEqual(password, c.env.ADMIN_PASSWORD)

  if (!emailOk || !passwordOk) {
    throw new ApiError(401, 'INVALID', 'Incorrect admin email or password.')
  }

  const token = await signJwt({ role: 'admin', sub: email }, c.env.JWT_SECRET, TOKEN_LIFETIME_SEC)

  return c.json({ token, expiresIn: TOKEN_LIFETIME_SEC, admin: { email } })
}

// GET /api/admin/me          header: Authorization: Bearer <token>
// Lets the React app check that a saved token still works.
export function me(c) {
  const admin = c.get('admin')

  return c.json({ admin: { email: admin.sub }, expiresAt: admin.exp * 1000 })
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