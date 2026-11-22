
import { useEffect, useMemo, useState } from 'react'

import AdminRoutes, { ADMIN_PATHS } from '@/app/AdminRoutes'
import OwnerRoutes from '@/app/OwnerRoutes'

import AdminLoginPage from '@/pages/auth/AdminLoginPage'
import LoginPage from '@/pages/auth/LoginPage'
import SetupPage from '@/pages/setup/SetupPage'
import SubscriptionPage from '@/pages/subscription/SubscriptionPage'

import usePersistentState from '@/hooks/usePersistentState'
import useTrustedClock from '@/hooks/useTrustedClock'

import { readLocal } from '@/lib/localStore'

import {
  buildLicense,
  getLicenseStatus,
  syncLicenseFromRegistry,
  trustedNow,
} from '@/lib/license'

import {
  DAY_MS,
  REGISTRY_KEY,
  createRestaurantRecord,
  generatePassword,
  hashPassword,
  normalizeCode,
  normalizeEmail,
  normalizeMobile,
  randomSalt,
  renewRecord,
} from '@/lib/registry'

const KEYS = {
  role: 'rd_role',
  license: 'rd_license',
  adminSession: 'rd_admin_session',
}

function go(path, replace = false) {
  window.history[replace ? 'replaceState' : 'pushState']({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname)

  const [role, setRole] = useState(
    () => localStorage.getItem(KEYS.role) === 'owner' ? 'owner' : ''
  )

  const [isAdmin, setIsAdmin] = useState(
    () => sessionStorage.getItem(KEYS.adminSession) === 'true'
  )

  const [registry, setRegistry] = usePersistentState(REGISTRY_KEY, [])

  const [license, setLicense] = usePersistentState(
    KEYS.license,
    null,
    (saved) => saved?.restaurantId ? saved : null
  )

  const now = useTrustedClock()

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)

    window.addEventListener('popstate', onPop)

    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Synchronize changes between tabs using the same browser storage.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === REGISTRY_KEY) {
        setRegistry(readLocal(REGISTRY_KEY, []))
      }
    }

    window.addEventListener('storage', onStorage)

    return () => window.removeEventListener('storage', onStorage)
  }, [setRegistry])

  // Synchronize admin changes into the owner's saved license.
  useEffect(() => {
    const synced = syncLicenseFromRegistry(license, registry)

    if (synced !== license) {
      setLicense(synced)
    }
  }, [registry, license, setLicense])

  useEffect(() => {
    if (isAdmin && path === ADMIN_PATHS.login) {
      go(ADMIN_PATHS.adminOverview, true)
    }
  }, [isAdmin, path])

  const setupDone = !!license?.restaurantId

  const licenseStatus = useMemo(
    () => getLicenseStatus(license, now),
    [license, now]
  )

  // --------------------------------
  // ADMIN AUTHENTICATION
  // --------------------------------

  const adminLogin = () => {
    sessionStorage.setItem(KEYS.adminSession, 'true')
    setIsAdmin(true)
    go(ADMIN_PATHS.adminOverview)
  }

  const adminLogout = () => {
    sessionStorage.removeItem(KEYS.adminSession)
    setIsAdmin(false)
    go(ADMIN_PATHS.login)
  }

  const navigateAdmin = (key) => {
    go(ADMIN_PATHS[key] || ADMIN_PATHS.adminOverview)
  }

  // --------------------------------
  // CREATE RESTAURANT
  // --------------------------------

  const createRestaurant = async (form) => {
    const record = await createRestaurantRecord(form, registry)

    setRegistry((old) => [record, ...old])

    return record
  }

  // --------------------------------
  // UPDATE RESTAURANT
  // --------------------------------

  const updateRestaurant = (id, updates) => {
    const name = String(updates.name || '').trim()
    const ownerName = String(updates.ownerName || '').trim()
    const mobile = normalizeMobile(updates.mobile)
    const email = normalizeEmail(updates.email)
    const durationDays = Number(updates.durationDays)

    if (!name || !ownerName) {
      return 'Restaurant and owner names are required.'
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return 'Enter a valid 10-digit mobile number.'
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return 'Enter a valid email address.'
    }

    if (
      !Number.isInteger(durationDays) ||
      durationDays <= 0
    ) {
      return 'Enter a valid subscription duration.'
    }

    const current = registry.find((r) => r.id === id)

    if (!current) {
      return 'Restaurant not found.'
    }

    const duplicate = registry.find(
      (r) =>
        r.id !== id &&
        (
          normalizeEmail(r.email) === email ||
          normalizeMobile(r.mobile) === mobile
        )
    )

    if (duplicate) {
      return 'Another restaurant already uses this email or mobile number.'
    }

    // If already activated, adjust expiry by the difference
    // between the new and previous subscription duration.
    const durationDifference = durationDays - Number(current.durationDays || 0)

    let updatedExpiry = current.expiresAt

    if (current.activatedAt && current.expiresAt) {
      updatedExpiry = Math.max(
        trustedNow(),
        current.expiresAt + durationDifference * DAY_MS
      )
    }

    setRegistry((old) =>
      old.map((r) =>
        r.id === id
          ? {
              ...r,
              name,
              ownerName,
              mobile,
              email,
              durationDays,
              expiresAt: updatedExpiry,
              updatedAt: trustedNow(),
            }
          : r
      )
    )

    return ''
  }

  // --------------------------------
  // RENEW SUBSCRIPTION
  // --------------------------------

  const renewRestaurant = (id, days) => {
    const duration = Number(days)

    if (!Number.isInteger(duration) || duration <= 0) {
      return 'Select a valid renewal duration.'
    }

    const exists = registry.some((r) => r.id === id)

    if (!exists) {
      return 'Restaurant not found.'
    }

    setRegistry((old) =>
      old.map((r) => {
        if (r.id !== id) return r

        return {
          ...renewRecord(r, duration, trustedNow()),
          updatedAt: trustedNow(),
        }
      })
    )

    return ''
  }

  // --------------------------------
  // RESET OWNER PASSWORD
  // --------------------------------

  const resetPassword = async (id) => {
    const exists = registry.some((r) => r.id === id)

    if (!exists) {
      throw new Error('Restaurant not found.')
    }

    const password = generatePassword()
    const salt = randomSalt()
    const passwordHash = await hashPassword(password, salt)

    setRegistry((old) =>
      old.map((r) =>
        r.id === id
          ? {
              ...r,
              salt,
              passwordHash,
              updatedAt: trustedNow(),
            }
          : r
      )
    )

    return password
  }

  // --------------------------------
  // DELETE RESTAURANT
  // --------------------------------

  const deleteRestaurant = (id) => {
    setRegistry((old) =>
      old.filter((r) => r.id !== id)
    )
  }

  // --------------------------------
  // ACTIVATION
  // --------------------------------

  const lookupActivation = (rawCode) => {
    const code = normalizeCode(rawCode)

    if (!code) {
      return { error: 'Enter the activation code.' }
    }

    const restaurant = registry.find((r) => r.code === code)

    if (!restaurant) {
      return {
        error: 'Activation code not found. Check the code with the software owner.',
      }
    }

    if (restaurant.activatedAt) {
      return {
        error: 'This activation code has already been used.',
      }
    }

    return { restaurant }
  }

  const activateRestaurant = (id) => {
    const record = registry.find((r) => r.id === id)

    if (!record || record.activatedAt) {
      return false
    }

    const activatedAt = trustedNow()

    const activated = {
      ...record,
      activatedAt,
      expiresAt: activatedAt + record.durationDays * DAY_MS,
    }

    setRegistry((old) =>
      old.map((r) => r.id === id ? activated : r)
    )

    setLicense(buildLicense(activated))

    go('/login')

    return true
  }

  // --------------------------------
  // OWNER ACTIONS
  // --------------------------------

  const ownerLogin = () => {
    setRole('owner')
    localStorage.setItem(KEYS.role, 'owner')
    go('/dashboard')
  }

  const ownerLogout = () => {
    setRole('')
    localStorage.removeItem(KEYS.role)
    go('/login')
  }

  const activateDifferentRestaurant = () => {
    setRole('')
    localStorage.removeItem(KEYS.role)
    setLicense(null)
    go('/')
  }

  const changeOwnerPassword = async (current, next) => {
    if (
      (await hashPassword(current, license.salt)) !==
      license.passwordHash
    ) {
      return 'Current password is incorrect.'
    }

    const salt = randomSalt()
    const passwordHash = await hashPassword(next, salt)

    setRegistry((old) =>
      old.map((r) =>
        r.id === license.restaurantId
          ? { ...r, salt, passwordHash }
          : r
      )
    )

    setLicense((old) => ({
      ...old,
      salt,
      passwordHash,
    }))

    return ''
  }

  const checkRenewal = () => {
    const fresh = readLocal(REGISTRY_KEY, [])

    setRegistry(fresh)

    const synced = syncLicenseFromRegistry(license, fresh)

    if (synced !== license) {
      setLicense(synced)
    }

    return !getLicenseStatus(synced, trustedNow()).expired
  }

  // --------------------------------
  // ROUTING
  // --------------------------------

  if (path === '/admin' || path.startsWith('/admin/')) {
    if (!isAdmin) {
      return <AdminLoginPage onLogin={adminLogin} />
    }

    return (
      <AdminRoutes
        path={path}
        registry={registry}
        now={now}
        onNavigate={navigateAdmin}
        onLogout={adminLogout}
        onCreate={createRestaurant}
        onUpdate={updateRestaurant}
        onRenew={renewRestaurant}
        onResetPassword={resetPassword}
        onDelete={deleteRestaurant}
      />
    )
  }

  if (!setupDone) {
    return (
      <SetupPage
        onLookup={lookupActivation}
        onActivate={activateRestaurant}
      />
    )
  }

  if (licenseStatus.expired) {
    return (
      <SubscriptionPage
        license={license}
        onCheckRenewal={checkRenewal}
      />
    )
  }

  if (role !== 'owner') {
    return (
      <LoginPage
        license={license}
        onLogin={ownerLogin}
        onActivateDifferent={activateDifferentRestaurant}
      />
    )
  }

  return (
    <OwnerRoutes
      license={license}
      licenseStatus={licenseStatus}
      onLogout={ownerLogout}
      onChangePassword={changeOwnerPassword}
    />
  )
}
