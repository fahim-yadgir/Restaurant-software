
export const REGISTRY_KEY = 'rd_registry'

export const DAY_MS = 24 * 60 * 60 * 1000

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PASSWORD_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'

function randomChars(length, chars) {
  const values = new Uint32Array(length)

  crypto.getRandomValues(values)

  return Array.from(
    values,
    (value) => chars[value % chars.length]
  ).join('')
}

export const generatePassword = () =>
  randomChars(8, PASSWORD_CHARS)

export const randomSalt = () =>
  randomChars(16, PASSWORD_CHARS)

export function generateActivationCode(existing = []) {
  const used = new Set(existing.map((r) => r.code))

  let code

  do {
    code = `RD-${randomChars(4, CODE_CHARS)}-${randomChars(4, CODE_CHARS)}`
  } while (used.has(code))

  return code
}

export const normalizeCode = (value) =>
  String(value || '').trim().toUpperCase().replace(/\s+/g, '')

export const normalizeMobile = (value) =>
  String(value || '').replace(/\D/g, '').slice(-10)

export const normalizeEmail = (value) =>
  String(value || '').trim().toLowerCase()

export async function hashPassword(password, salt) {
  const text = `${salt}:${password}`

  if (globalThis.crypto?.subtle) {
    const buffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(text)
    )

    return Array.from(
      new Uint8Array(buffer),
      (b) => b.toString(16).padStart(2, '0')
    ).join('')
  }

  let h = 5381

  for (const ch of text) {
    h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0
  }

  return `x${h.toString(16)}`
}

export function validateRegistration(form, registry) {
  if (!form.name.trim()) return 'Enter the restaurant name.'

  if (!form.ownerName.trim()) return 'Enter the owner name.'

  if (!/^[6-9]\d{9}$/.test(normalizeMobile(form.mobile))) {
    return 'Enter a valid 10-digit mobile number.'
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
    return 'Enter a valid email address.'
  }

  if (!Number(form.days)) {
    return 'Choose a subscription duration.'
  }

  if ((form.password || '').length < 6) {
    return 'Owner password must be at least 6 characters.'
  }

  const email = normalizeEmail(form.email)
  const mobile = normalizeMobile(form.mobile)

  if (registry.some((r) => normalizeEmail(r.email) === email)) {
    return 'A restaurant with this email is already registered.'
  }

  if (registry.some((r) => normalizeMobile(r.mobile) === mobile)) {
    return 'A restaurant with this mobile number is already registered.'
  }

  return ''
}

export async function createRestaurantRecord(form, existing) {
  const salt = randomSalt()

  return {
    id: `rest_${Date.now().toString(36)}${randomChars(3, PASSWORD_CHARS)}`,
    name: form.name.trim(),
    ownerName: form.ownerName.trim(),
    mobile: normalizeMobile(form.mobile),
    email: normalizeEmail(form.email),
    durationDays: Number(form.durationDays),
    code: generateActivationCode(existing),
    salt,
    passwordHash: await hashPassword(form.password, salt),
    createdAt: Date.now(),
    activatedAt: null,
    expiresAt: null,
  }
}

export function getRestaurantStatus(record, now = Date.now()) {
  if (!record.activatedAt) return 'pending'

  if (!record.expiresAt || record.expiresAt <= now) {
    return 'expired'
  }

  if (record.expiresAt - now <= 7 * DAY_MS) {
    return 'expiring'
  }

  return 'active'
}

// Renew an existing subscription.
// Pending restaurants get additional plan days.
// Activated restaurants get additional expiry days.
export function renewRecord(record, days, now = Date.now()) {
  const duration = Number(days)

  if (!Number.isInteger(duration) || duration <= 0) {
    throw new Error('Invalid renewal duration.')
  }

  if (!record.activatedAt) {
    return {
      ...record,
      durationDays: Number(record.durationDays || 0) + duration,
    }
  }

  const currentExpiry = Number(record.expiresAt || 0)
  const base = Math.max(now, currentExpiry)

  return {
    ...record,
    durationDays: Number(record.durationDays || 0) + duration,
    expiresAt: base + duration * DAY_MS,
  }
}

export const formatDate = (timestamp) =>
  timestamp
    ? new Date(timestamp).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—'

export function formatRemaining(expiresAt, now = Date.now()) {
  if (!expiresAt) return 'Not activated yet'

  const ms = expiresAt - now

  if (ms <= 0) return 'Expired'

  const days = Math.floor(ms / DAY_MS)
  const hours = Math.floor((ms % DAY_MS) / 3600000)

  return `${days}d ${hours}h left`
}
