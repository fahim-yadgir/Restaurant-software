import { DAY_MS } from '@/lib/registry'

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