
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

  const [role, setRole] = useState(() =>
    localStorage.getItem(KEYS.role) === 'owner' ? 'owner' : ''
  )

  const [isAdmin, setIsAdmin] = useState(
    () => sessionStorage.getItem(KEYS.adminSession) === 'true'
  )

  const [registry, setRegistry] = usePersistentState(REGISTRY_KEY, [])

  const [license, setLicense] = usePersistentState(
    KEYS.license,
    null,
    (saved) => (saved?.restaurantId ? saved : null)
  )

  const now = useTrustedClock()

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)

    window.addEventListener('popstate', onPop)

    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === REGISTRY_KEY) {
        setRegistry(readLocal(REGISTRY_KEY, []))
      }
    }

    window.addEventListener('storage', onStorage)

    return () => window.removeEventListener('storage', onStorage)
  }, [setRegistry])

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

  // Admin login
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

  const navigateAdmin = (key) =>
    go(ADMIN_PATHS[key] || ADMIN_PATHS.adminOverview)

  // Register restaurant
  const createRestaurant = async (form) => {
    const record = await createRestaurantRecord(form, registry)
    setRegistry((old) => [record, ...old])
    return record
  }

  // Update restaurant
  const updateRestaurant = (id, updates) => {
    const name = String(updates.name || '').trim()
    const ownerName = String(updates.ownerName || '').trim()
    const mobile = normalizeMobile(updates.mobile)
    const email = normalizeEmail(updates.email)
    const durationDays = Number(updates.durationDays)

    if (!name || !ownerName) {
      throw new Error('Restaurant and owner names are required.')
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      throw new Error('Enter a valid 10-digit mobile number.')
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw new Error('Enter a valid email address.')
    }

    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      throw new Error('Enter a valid subscription duration.')
    }

    const duplicate = registry.find(
      (r) =>
        r.id !== id &&
        (r.email === email || r.mobile === mobile)
    )

    if (duplicate) {
      throw new Error(
        'Another restaurant already uses this email or mobile number.'
      )
    }

    const existing = registry.find((r) => r.id === id)

    if (!existing) {
      throw new Error('Restaurant not found.')
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
              expiresAt: r.activatedAt
                ? r.activatedAt + durationDays * DAY_MS
                : null,
            }
          : r
      )
    )
  }

  // Renew subscription
  const renewRestaurant = (id, days) => {
    if (!Number.isFinite(days) || days <= 0) {
      throw new Error('Invalid renewal duration.')
    }

    const existing = registry.find((r) => r.id === id)

    if (!existing) {
      throw new Error('Restaurant not found.')
    }

    setRegistry((old) =>
      old.map((r) =>
        r.id === id
          ? renewRecord(r, days, trustedNow())
          : r
      )
    )
  }

  // Reset owner password
  const resetPassword = async (id) => {
    const existing = registry.find((r) => r.id === id)

    if (!existing) {
      throw new Error('Restaurant not found.')
    }

    const password = generatePassword()
    const salt = randomSalt()
    const passwordHash = await hashPassword(password, salt)

    setRegistry((old) =>
      old.map((r) =>
        r.id === id
          ? { ...r, salt, passwordHash }
          : r
      )
    )

    return password
  }

  // Delete restaurant
  const deleteRestaurant = (id) => {
    const existing = registry.find((r) => r.id === id)

    if (!existing) {
      throw new Error('Restaurant not found.')
    }

    setRegistry((old) => old.filter((r) => r.id !== id))

    if (license?.restaurantId === id) {
      setLicense(null)
      setRole('')
      localStorage.removeItem(KEYS.role)
      go('/')
    }
  }

  // Activation
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
      return { error: 'This activation code has already been used.' }
    }

    return { restaurant }
  }

  const activateRestaurant = (id) => {
    const record = registry.find((r) => r.id === id)

    if (!record || record.activatedAt) return false

    const activatedAt = trustedNow()

    const activated = {
      ...record,
      activatedAt,
      expiresAt: activatedAt + record.durationDays * DAY_MS,
    }

    setRegistry((old) =>
      old.map((r) => (r.id === id ? activated : r))
    )

    setLicense(buildLicense(activated))
    go('/login')

    return true
  }

  // Owner login and logout
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

  // Owner password change
  const changeOwnerPassword = async (current, next) => {
    if (
      (await hashPassword(current, license.salt)) !== license.passwordHash
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

    setLicense((old) => ({ ...old, salt, passwordHash }))

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

  // Admin routes
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
