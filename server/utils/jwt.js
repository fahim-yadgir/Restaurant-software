// Login tokens (JWT, HS256). The server signs a token after a successful login;
// the browser sends it back in the "Authorization: Bearer <token>" header.
// Nobody can change the token's content without knowing JWT_SECRET.
//
//   const token = await signJwt({ role: 'admin' }, c.env.JWT_SECRET, 60 * 60 * 12)
//   const payload = await verifyJwt(token, c.env.JWT_SECRET)   // payload, or null if invalid / expired

import { b64uDecode, b64uEncode, utf8, fromUtf8 } from './encoding.js'

const importKey = (secret, usages) =>
  crypto.subtle.importKey('raw', utf8(secret), { name: 'HMAC', hash: 'SHA-256' }, false, usages)

// expiresInSec: how long the token stays valid (seconds)
export async function signJwt(payload, secret, expiresInSec) {
  const now = Math.floor(Date.now() / 1000)
  const header = b64uEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    // jti = unique id of this token, so it can be revoked on logout
  const body = b64uEncode(
    JSON.stringify({ ...payload, jti: crypto.randomUUID(), iat: now, exp: now + expiresInSec })
  )
  const data = `${header}.${body}`

  const key = await importKey(secret, ['sign'])
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, utf8(data)))

  return `${data}.${b64uEncode(signature)}`
}

// Returns the payload, or null when the token is malformed, tampered with or expired.
export async function verifyJwt(token, secret) {
  try {
    const [header, body, signature] = String(token || '').split('.')

    if (!header || !body || !signature) return null

    const parsedHeader = JSON.parse(fromUtf8(b64uDecode(header)))

    if (parsedHeader.alg !== 'HS256') return null

    const key = await importKey(secret, ['verify'])
    const valid = await crypto.subtle.verify('HMAC', key, b64uDecode(signature), utf8(`${header}.${body}`))

    if (!valid) return null

    const payload = JSON.parse(fromUtf8(b64uDecode(body)))

    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}