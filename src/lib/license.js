// Device license (DEMO). Created when a restaurant activates, then used offline.
// It carries the owner's login (salted hash) so sign-in works without internet.
// Not tamper-proof: production needs a server-signed license.
import { DAY_MS } from '@/lib/registry'

const LAST_SEEN_KEY = 'rd_last_seen'

// Never lets the clock go backwards: if the PC date is set back, the last time seen is used instead.
export function trustedNow() {
  const real = Date.now()
  let last = 0
  try { last = Number(localStorage.getItem(LAST_SEEN_KEY)) || 0 } catch { /* ignore */ }
  const value = Math.max(real, last)
  try { localStorage.setItem(LAST_SEEN_KEY, String(value)) } catch { /* ignore */ }
  return value
}

export function buildLicense(record) {
  return {
    restaurantId: record.id,
    code: record.code,
    restaurantName: record.name,
    ownerName: record.ownerName,
    ownerMobile: record.mobile,
    ownerEmail: record.email,
    salt: record.salt,
    passwordHash: record.passwordHash,
    activatedAt: record.activatedAt,
    expiresAt: record.expiresAt,
    durationDays: record.durationDays,
  }
}

// Copies renewals / password resets made by the admin into this device's license.
export function syncLicenseFromRegistry(license, registry) {
  if (!license) return license
  const record = registry.find((r) => r.id === license.restaurantId)
  if (!record || record.activatedAt !== license.activatedAt) return license
  const changed = ['expiresAt', 'durationDays', 'salt', 'passwordHash'].some((k) => record[k] !== license[k])
  if (!changed) return license
  return { ...license, expiresAt: record.expiresAt, durationDays: record.durationDays, salt: record.salt, passwordHash: record.passwordHash }
}

export function getLicenseStatus(license, now = Date.now()) {
  if (!license?.expiresAt) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0, expiresAt: null }
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
