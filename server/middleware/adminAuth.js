// Put this in front of any route that only the software owner (admin) may use:
//
//   router.get('/restaurants', adminAuth, listRestaurants)
//
// It reads "Authorization: Bearer <token>", checks the signature and expiry,
// makes sure the token was not signed out (revoked) and is from the current password, and saves the token's
// data in c.get('admin').

import { unauthorized } from '../utils/errors.js'
import { verifyJwt } from '../utils/jwt.js'

export async function adminAuth(c, next) {
  const header = c.req.header('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''

  const payload = await verifyJwt(token, c.env.JWT_SECRET)

  // Tokens without a jti are from before logout existed: sign in again.
  if (!payload || payload.role !== 'admin' || !payload.jti) {
    throw unauthorized('Admin sign-in required. Please sign in again.')
  }

  // One round trip: was this token signed out, and is it from the admin's current password?
  const row = await c.env.DB
    .prepare(
      `SELECT (SELECT 1 FROM revoked_tokens WHERE jti = ?) AS revoked,
              (SELECT password_changed_at FROM admins WHERE id = ?) AS pwv`
    )
    .bind(payload.jti, String(payload.sub || ''))
    .first()

  if (row?.revoked) throw unauthorized('You are signed out. Please sign in again.')

  // The password was changed (or the account was reset) after this token was issued.
  if (!row || row.pwv === null || row.pwv !== payload.pwv) {
    throw unauthorized('Your sign-in is no longer valid. Please sign in again.')
  }

  c.set('admin', payload)

  await next()
}