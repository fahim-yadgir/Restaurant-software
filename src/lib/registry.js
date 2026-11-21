// Restaurant registry (DEMO).
// The Platform Admin registers restaurants here; the setup screen verifies activation codes against it.
// It is stored in this browser's localStorage, so admin and restaurant must use the same browser profile.
// For separate computers, replace these functions with calls to a server API.
export const REGISTRY_KEY = 'rd_registry'
export const DAY_MS = 24 * 60 * 60 * 1000
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I to avoid typing mistakes
const PASSWORD_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'

function randomChars(length, chars) {
  const values = new Uint32Array(length)
  crypto.getRandomValues(values)
  return Array.from(values, (v) => chars[v % chars.length]).join('')
}

export const generatePassword = () => randomChars(8, PASSWORD_CHARS)
export const randomSalt = () => randomChars(16, PASSWORD_CHARS)

export function generateActivationCode(existing = []) {
  const used = new Set(existing.map((r) => r.code))
  let code
  do { code = `RD-${randomChars(4, CODE_CHARS)}-${randomChars(4, CODE_CHARS)}` } while (used.has(code))
  return code
}

export const normalizeCode = (value) => String(value || '').trim().toUpperCase().replace(/\s+/g, '')
export const normalizeMobile = (value) => String(value || '').replace(/\D/g, '').slice(-10)
export const normalizeEmail = (value) => String(value || '').trim().toLowerCase()

export async function hashPassword(password, salt) {
  const text = `${salt}:${password}`
  if (globalThis.crypto?.subtle) {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('')
  }
  // Fallback for non-secure contexts (plain http on a LAN). Weak: demo only.
  let h = 5381
  for (const ch of text) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0
  return `x${h.toString(16)}`
}

export function validateRegistration(form, registry) {
  if (!form.name.trim()) return 'Enter the restaurant name.'
  if (!form.ownerName.trim()) return 'Enter the owner name.'
  if (!/^[6-9]\d{9}$/.test(normalizeMobile(form.mobile))) return 'Enter a valid 10-digit mobile number.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) return 'Enter a valid email address.'
  if (!Number(form.days)) return 'Choose a subscription duration.'
  if ((form.password || '').length < 6) return 'Owner password must be at least 6 characters.'
  const email = normalizeEmail(form.email)
  const mobile = normalizeMobile(form.mobile)
  if (registry.some((r) => r.email === email)) return 'A restaurant with this email is already registered.'
  if (registry.some((r) => r.mobile === mobile)) return 'A restaurant with this mobile number is already registered.'
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
    activatedAt: null, // set when the restaurant activates; the countdown starts then
    expiresAt: null,
  }
}

export function getRestaurantStatus(record, now = Date.now()) {
  if (!record.activatedAt) return 'pending'
  if (record.expiresAt <= now) return 'expired'
  if (record.expiresAt - now <= 7 * DAY_MS) return 'expiring'
  return 'active'
}

// Renewal extends from the current expiry (or from now if already expired).
export function renewRecord(record, days, now = Date.now()) {
  if (!record.activatedAt) return { ...record, durationDays: record.durationDays + days }
  const base = Math.max(now, record.expiresAt)
  return { ...record, durationDays: record.durationDays + days, expiresAt: base + days * DAY_MS }
}

export const formatDate = (ts) =>
  ts ? new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export function formatRemaining(expiresAt, now = Date.now()) {
  const ms = expiresAt - now
  if (ms <= 0) return 'Expired'
  const days = Math.floor(ms / DAY_MS)
  const hours = Math.floor((ms % DAY_MS) / 3600000)
  return `${days}d ${hours}h left`
}
