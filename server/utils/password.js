// Password hashing with PBKDF2-SHA256 (built into Workers, no extra package).
//
// Stored text:   pbkdf2$<iterations>$<salt>$<hash>
//
// - A random salt per password, so two owners with the same password get different hashes.
// - The iteration count is stored inside the text. If you change PBKDF2_ITERATIONS later,
//   old passwords keep working.

import { b64uDecode, b64uEncode, bytesEqual, utf8 } from './encoding.js'

const MAX_ITERATIONS = 100000 // Cloudflare Workers allows at most 100000
const DEFAULT_ITERATIONS = 100000

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', utf8(password), 'PBKDF2', false, [
    'deriveBits',
  ])

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256
  )

  return new Uint8Array(bits)
}

// env = c.env (reads the optional PBKDF2_ITERATIONS setting)
export async function hashPassword(password, env = {}) {
  const iterations = Math.min(
    MAX_ITERATIONS,
    Math.max(1000, Number(env.PBKDF2_ITERATIONS) || DEFAULT_ITERATIONS)
  )

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(String(password), salt, iterations)

  return `pbkdf2$${iterations}$${b64uEncode(salt)}$${b64uEncode(hash)}`
}

export async function verifyPassword(password, stored) {
  const [scheme, iterations, salt, hash] = String(stored || '').split('$')

  if (scheme !== 'pbkdf2' || !iterations || !salt || !hash) return false

  const actual = await derive(String(password ?? ''), b64uDecode(salt), Number(iterations))

  return bytesEqual(actual, b64uDecode(hash))
}

// Compares two secrets (like the admin password) without leaking their length or
// content through timing.
export async function safeEqual(a, b) {
  const [x, y] = await Promise.all(
    [a, b].map(async (value) =>
      new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(String(value ?? ''))))
    )
  )

  return bytesEqual(x, y)
}

// Easy-to-read password (no 0/o/1/l/i). Used for "Reset password".
const PASSWORD_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'

export function randomPassword(length = 8) {
  const values = new Uint32Array(length)

  crypto.getRandomValues(values)

  return Array.from(values, (v) => PASSWORD_CHARS[v % PASSWORD_CHARS.length]).join('')
}