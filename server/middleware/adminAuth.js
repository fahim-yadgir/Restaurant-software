// Put this in front of any route that only the software owner (admin) may use:
//
//   router.get('/restaurants', adminAuth, listRestaurants)
//
// It reads "Authorization: Bearer <token>", checks the signature and expiry,
// makes sure the token was not signed out (revoked), and saves the token's
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

  const revoked = await c.env.DB
    .prepare('SELECT 1 AS found FROM revoked_tokens WHERE jti = ?')
    .bind(payload.jti)
    .first()

  if (revoked) throw unauthorized('You are signed out. Please sign in again.')

  c.set('admin', payload)

  await next()
}