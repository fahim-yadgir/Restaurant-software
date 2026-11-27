import { DAY_MS } from '@/lib/registry'
import { LICENSE_PUBLIC_KEY } from '@/lib/licenseKey'

const LAST_SEEN_KEY = 'rd_last_seen'

export function trustedNow() {
  const real = Date.now()

  let last = 0

  try {
    last = Number(localStorage.getItem(LAST_SEEN_KEY)) || 0
  } catch {
    // Ignore unavailable local storage.
  }

  const value = Math.max(real, last)

  try {
    localStorage.setItem(LAST_SEEN_KEY, String(value))
  } catch {
    // Ignore unavailable local storage.
  }

  return value
}

// ---------------------------------------------------------------
// Signed license: token = <payload base64url JSON>.<ECDSA signature>
// The server signs it; this app only has the PUBLIC key, so it can check a license
// but can never create or change one (editing the expiry date breaks the signature).
// ---------------------------------------------------------------
const b64uToBytes = (text) => {
  const base64 = String(text).replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))

  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

let publicKeyPromise = null

const getPublicKey = () => {
  if (!LICENSE_PUBLIC_KEY) return Promise.reject(new Error('License public key is not set. Run "npm run keys".'))

  publicKeyPromise ??= crypto.subtle.importKey(
    'jwk',
    LICENSE_PUBLIC_KEY,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  )

  return publicKeyPromise
}

// Returns the license (payload) when the signature is genuine, otherwise null.
export async function verifyLicenseToken(token) {
  try {
    const [body, signature] = String(token || '').split('.')

    if (!body || !signature) return null

    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      await getPublicKey(),
      b64uToBytes(signature),
      new TextEncoder().encode(body)
    )

    return valid ? JSON.parse(new TextDecoder().decode(b64uToBytes(body))) : null
  } catch {
    return null
  }
}

// Offline sign-in: checks a password against the hash inside the license
// (format  pbkdf2$<iterations>$<salt>$<hash>, the same as the server).
export async function verifyOwnerPassword(password, stored) {
  try {
    const [scheme, iterations, salt, hash] = String(stored || '').split('$')

    if (scheme !== 'pbkdf2' || !iterations || !salt || !hash) return false

    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(password)), 'PBKDF2', false, ['deriveBits'])

    const bits = new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt: b64uToBytes(salt), iterations: Number(iterations) },
        key,
        256
      )
    )

    const expected = b64uToBytes(hash)

    if (bits.length !== expected.length) return false

    let diff = 0

    for (let i = 0; i < bits.length; i += 1) diff |= bits[i] ^ expected[i]

    return diff === 0
  } catch {
    return false
  }
}

// The license a device keeps for offline use. Today it is built from the mock
// registry; later the server returns it signed and the app verifies the signature.
export function buildLicense(record) {
  return {
    restaurantId: record.id,
    restaurantName: record.name,
    ownerName: record.ownerName,
    ownerMobile: record.mobile,
    ownerEmail: record.email,
    salt: record.salt,
    passwordHash: record.passwordHash,
    deviceId: record.deviceId,
    activatedAt: record.activatedAt,
    expiresAt: record.expiresAt,
    planType: record.planType || 'period',
    durationDays: record.durationDays,
  }
}

// A license only counts on the device it was issued for.
export const isLicenseForDevice = (license, deviceId) =>
  !!license?.restaurantId && !!deviceId && license.deviceId === deviceId

export function getLicenseStatus(license, now = Date.now()) {
  // Lifetime plans never expire. days = Infinity keeps "days < 7" warnings off.
  if (license?.planType === 'lifetime') {
    return {
      expired: false,
      lifetime: true,
      days: Infinity,
      hours: 0,
      minutes: 0,
      seconds: 0,
      expiresAt: null,
    }
  }

  if (!license?.expiresAt) {
    return {
      expired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      expiresAt: null,
    }
  }

  const remaining = Math.max(0, license.expiresAt - now)
  const totalSeconds = Math.floor(remaining / 1000)

  return {
    expired: remaining <= 0,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expiresAt: license.expiresAt,
  }
}

export { DAY_MS }