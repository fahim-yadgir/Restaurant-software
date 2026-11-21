// DEMO LICENSE ONLY. Production must validate a server-signed license and trusted time.
const YEAR_MS = 365 * 24 * 60 * 60 * 1000
export function createLicense(details = {}) {
  const activatedAt = Date.now()
  return { id: `DEMO-${activatedAt}`, restaurantName: details.restaurantName || '', ownerName: details.ownerName || '', activatedAt, expiresAt: activatedAt + YEAR_MS, durationDays: 365, mode: 'local-demo' }
}
export function getLicenseStatus(license, now = Date.now()) {
  if (!license?.expiresAt) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0, expiresAt: null }
  const remaining = Math.max(0, license.expiresAt - now)
  const totalSeconds = Math.floor(remaining / 1000)
  return { expired: remaining <= 0, days: Math.floor(totalSeconds / 86400), hours: Math.floor((totalSeconds % 86400) / 3600), minutes: Math.floor((totalSeconds % 3600) / 60), seconds: totalSeconds % 60, expiresAt: license.expiresAt }
}
export function renewDemoLicense(previous) {
  const now = Date.now()
  return { ...(previous || {}), activatedAt: now, expiresAt: now + YEAR_MS, durationDays: 365, mode: 'local-demo' }
}
