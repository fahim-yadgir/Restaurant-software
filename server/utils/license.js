// Signed license: the proof, kept on the restaurant's PC, that a plan is valid.
//
//   token = <payload as base64url JSON> . <ECDSA P-256 signature>
//
// The server signs with LICENSE_PRIVATE_KEY (secret). The app only holds the PUBLIC key
// (src/lib/licenseKey.js), so it can check a license but can never create or edit one:
// changing even one letter (for example the expiry date) makes the signature fail.

import { b64uDecode, b64uEncode, fromUtf8, utf8 } from './encoding.js'

const SIGN = { name: 'ECDSA', hash: 'SHA-256' }
const KEY_ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' }

let cached = { raw: '', privateKey: null, publicKey: null }

async function getKeys(env) {
  if (cached.privateKey && cached.raw === env.LICENSE_PRIVATE_KEY) return cached

  const jwk = JSON.parse(env.LICENSE_PRIVATE_KEY)

  // The public half is inside the private JWK (x, y), so only one secret is needed.
  const privateKey = await crypto.subtle.importKey('jwk', jwk, KEY_ALGORITHM, false, ['sign'])
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y },
    KEY_ALGORITHM,
    false,
    ['verify']
  )

  cached = { raw: env.LICENSE_PRIVATE_KEY, privateKey, publicKey }

  return cached
}

export async function signLicense(payload, env) {
  const { privateKey } = await getKeys(env)
  const body = b64uEncode(JSON.stringify(payload))
  const signature = new Uint8Array(await crypto.subtle.sign(SIGN, privateKey, utf8(body)))

  return `${body}.${b64uEncode(signature)}`
}

// Returns the payload, or null when the token is malformed or the signature is wrong.
export async function verifyLicense(token, env) {
  try {
    const [body, signature] = String(token || '').split('.')

    if (!body || !signature) return null

    const { publicKey } = await getKeys(env)
    const valid = await crypto.subtle.verify(SIGN, publicKey, b64uDecode(signature), utf8(body))

    return valid ? JSON.parse(fromUtf8(b64uDecode(body))) : null
  } catch {
    return null
  }
}

// What the PC needs to run offline: who, which plan, which device, and the password hash
// (so the owner can sign in without internet). `row` is a restaurants table row.
export const licensePayload = (row) => ({
  v: 1,
  restaurantId: row.id,
  restaurantName: row.name,
  ownerName: row.owner_name,
  ownerMobile: row.mobile,
  ownerEmail: row.email,
  passwordHash: row.password_hash,
  mustChangePassword: !!row.must_change_password,
  deviceId: row.device_id,
  activatedAt: row.activated_at,
  expiresAt: row.expires_at,
  planType: row.plan_type,
  durationDays: row.duration_days,
})

// Signed license + the readable payload, ready to send to the app.
export async function issueLicense(row, env) {
  const license = licensePayload(row)

  return { license, token: await signLicense(license, env) }
}