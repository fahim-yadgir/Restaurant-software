// MOCK API — plays the role of the future backend (server/).
// Only this file knows where the data lives. When the Express server is ready,
// keep the function names + return shapes and replace the bodies with fetch() calls.
//
//   ownerLogin({ identifier, password, deviceId })  -> POST /api/auth/owner/login
//   refreshLicense({ restaurantId, deviceId })      -> GET  /api/license/refresh
//
// Rules enforced here (and later on the server):
//   * 1 account = 1 device. First login links the device, other devices are rejected.
//   * The subscription starts on the first login.
//   * Admin "Reset device" clears the link, the next login links a new device.

import { readLocal, writeLocal } from '@/lib/localStore'
import { buildLicense } from '@/lib/license'
import {
  DAY_MS,
  REGISTRY_KEY,
  isLifetime,
  hashPassword,
  normalizeEmail,
  normalizeMobile,
} from '@/lib/registry'

export class ApiError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

const loadRegistry = () => readLocal(REGISTRY_KEY, [])
const saveRegistry = (list) => writeLocal(REGISTRY_KEY, list)

function assertOnline() {
  if (!navigator.onLine) {
    throw new ApiError(
      'NETWORK',
      'Internet connection is required. Please connect and try again.'
    )
  }
}

const INVALID = 'Incorrect email / mobile or password.'

export async function ownerLogin({ identifier, password, deviceId }) {
  assertOnline()

  const id = String(identifier || '').trim()
  const registry = loadRegistry()

  const record = registry.find((r) =>
    id.includes('@')
      ? r.email === normalizeEmail(id)
      : r.mobile === normalizeMobile(id)
  )

  if (!record) throw new ApiError('INVALID', INVALID)

  const hash = await hashPassword(password, record.salt)

  if (hash !== record.passwordHash) throw new ApiError('INVALID', INVALID)

  if (record.deviceId && record.deviceId !== deviceId) {
    throw new ApiError(
      'DEVICE_MISMATCH',
      'This account is already active on another device. Ask the software owner to reset the device.'
    )
  }

  let updated = record

  if (!record.deviceId) {
    const now = Date.now()

    updated = {
      ...record,
      deviceId,
      deviceBoundAt: now,
      // Plan starts on first login. A device reset keeps the existing expiry.
      activatedAt: record.activatedAt || now,
      // Lifetime plans never get an expiry date.
      expiresAt: isLifetime(record)
        ? null
        : record.activatedAt
          ? record.expiresAt
          : now + record.durationDays * DAY_MS,
    }

    saveRegistry(registry.map((r) => (r.id === record.id ? updated : r)))
  }

  return { license: buildLicense(updated) }
}

export async function refreshLicense({ restaurantId, deviceId }) {
  assertOnline()

  const record = loadRegistry().find((r) => r.id === restaurantId)

  if (!record) {
    throw new ApiError(
      'NOT_FOUND',
      'This restaurant account no longer exists.'
    )
  }

  if (record.deviceId !== deviceId) {
    throw new ApiError(
      'DEVICE_REVOKED',
      'This device is no longer linked to the account. Please sign in again.'
    )
  }

  return { license: buildLicense(record) }
}