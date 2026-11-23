import { useCallback, useEffect, useMemo, useState } from 'react'

import AdminRoutes, { ADMIN_PATHS } from '@/app/AdminRoutes'
import OwnerRoutes from '@/app/OwnerRoutes'

import AdminLoginPage from '@/pages/auth/AdminLoginPage'
import LoginPage from '@/pages/auth/LoginPage'
import SubscriptionPage from '@/pages/subscription/SubscriptionPage'

import usePersistentState from '@/hooks/usePersistentState'
import useTrustedClock from '@/hooks/useTrustedClock'

import { readLocal } from '@/lib/localStore'
import { getOrCreateDeviceId } from '@/lib/device'
import { notifyError } from '@/lib/toast'
import { PAYMENTS_KEY, createPayment } from '@/lib/revenue'

import {
  ApiError,
  ownerLogin as apiOwnerLogin,
  refreshLicense as apiRefreshLicense,
} from '@/lib/api'

import {
  getLicenseStatus,
  isLicenseForDevice,
  trustedNow,
} from '@/lib/license'

import {
  DAY_MS,
  REGISTRY_KEY,
  createRestaurantRecord,
  generatePassword,
  hashPassword,
  normalizeEmail,
  normalizeMobile,
  planLabel,
  randomSalt,
  renewRecord,
} from '@/lib/registry'

const KEYS = {
  role: 'rd_role',
  license: 'rd_license',
  adminSession: 'rd_admin_session',
}

const REVOKE_CODES = ['DEVICE_REVOKED', 'NOT_FOUND']

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

  const [payments, setPayments] = usePersistentState(PAYMENTS_KEY, [])

  const [savedLicense, setLicense] = usePersistentState(
    KEYS.license,
    null,
    (saved) => (saved?.restaurantId ? saved : null)
  )

  const now = useTrustedClock()
  const deviceId = useMemo(() => getOrCreateDeviceId(), [])

  // A license is only valid on the device it was issued for.
  // Old licenses (from the activation-code version) have no deviceId,
  // so the owner simply signs in once online to link this device.
  const license = isLicenseForDevice(savedLicense, deviceId)
    ? savedLicense
    : null

  const restaurantId = license?.restaurantId || ''

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
    if (isAdmin && path === ADMIN_PATHS.login) {
      go(ADMIN_PATHS.adminOverview, true)
    }
  }, [isAdmin, path])

  const licenseStatus = useMemo(
    () => getLicenseStatus(license, now),
    [license, now]
  )

  // ---------------------------------------------------------------
  // Owner session helpers
  // ---------------------------------------------------------------
  const startOwnerSession = (nextLicense) => {
    setLicense(nextLicense)
    setRole('owner')
    localStorage.setItem(KEYS.role, 'owner')
    go('/dashboard')
  }

  // The server no longer recognises this device: drop the license and sign out.
  const revokeDevice = useCallback(() => {
    setLicense(null)
    setRole('')
    localStorage.removeItem(KEYS.role)
    go('/login', true)
  }, [setLicense])

  // Online only: fetch the latest license (renewals, plan changes, device check).
  const pullLicense = useCallback(async () => {
    if (!restaurantId) {
      return { error: 'No restaurant is set up on this device.' }
    }

    if (!navigator.onLine) {
      return { error: 'Internet connection is required.' }
    }

    try {
      const { license: fresh } = await apiRefreshLicense({
        restaurantId,
        deviceId,
      })

      // MOCK ONLY: the mock "server" lives in localStorage, so re-read it.
      setRegistry(readLocal(REGISTRY_KEY, []))

      setLicense((old) =>
        JSON.stringify(old) === JSON.stringify(fresh) ? old : fresh
      )

      return { license: fresh }
    } catch (err) {
      if (err instanceof ApiError && REVOKE_CODES.includes(err.code)) {
        revokeDevice()
        notifyError(err.message)
      }

      return {
        error:
          err instanceof ApiError
            ? err.message
            : 'Could not reach the server. Try again.',
      }
    }
  }, [restaurantId, deviceId, revokeDevice, setLicense, setRegistry])

  // While signed in: refresh when the app opens and whenever the network returns.
  useEffect(() => {
    if (role !== 'owner' || !restaurantId) return undefined

    const sync = () => {
      pullLicense()
    }

    sync()
    window.addEventListener('online', sync)

    return () => window.removeEventListener('online', sync)
  }, [role, restaurantId, pullLicense])

  // ---------------------------------------------------------------
  // Admin session
  // ---------------------------------------------------------------
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

  // ---------------------------------------------------------------
  // Admin actions (these become API calls when the backend exists)
  // ---------------------------------------------------------------
  const addPayment = (entry) =>
    setPayments((old) => [createPayment(entry), ...old])

  const deletePayment = (id) =>
    setPayments((old) => old.filter((p) => p.id !== id))

  const createRestaurant = async (form) => {
    const record = await createRestaurantRecord(form)
    setRegistry((old) => [record, ...old])

    // Revenue: record the amount received at registration (skip trial / free).
    if (Number(form.amount) > 0) {
      addPayment({
        restaurantId: record.id,
        restaurantName: record.name,
        type: 'new',
        plan: planLabel(record),
        amount: form.amount,
        method: form.method,
      })
    }

    return record
  }

  const updateRestaurant = (id, updates) => {
    const name = String(updates.name || '').trim()
    const ownerName = String(updates.ownerName || '').trim()
    const mobile = normalizeMobile(updates.mobile)
    const email = normalizeEmail(updates.email)
    const lifetime = updates.planType === 'lifetime'
    const durationDays = lifetime ? null : Number(updates.durationDays)

    if (!name || !ownerName) {
      throw new Error('Restaurant and owner names are required.')
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      throw new Error('Enter a valid 10-digit mobile number.')
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw new Error('Enter a valid email address.')
    }

    if (!lifetime && (!Number.isFinite(durationDays) || durationDays <= 0)) {
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
              planType: lifetime ? 'lifetime' : 'period',
              durationDays,
              expiresAt:
                lifetime || !r.activatedAt
                  ? null
                  : r.activatedAt + durationDays * DAY_MS,
            }
          : r
      )
    )
  }

  // payment = { amount, method } received for this renewal (optional)
  const renewRestaurant = (id, days, payment = {}) => {
    if (!Number.isFinite(days) || days <= 0) {
      throw new Error('Invalid renewal duration.')
    }

    const existing = registry.find((r) => r.id === id)

    if (!existing) {
      throw new Error('Restaurant not found.')
    }

    setRegistry((old) =>
      old.map((r) =>
        r.id === id ? renewRecord(r, days, trustedNow()) : r
      )
    )

    if (Number(payment.amount) > 0) {
      addPayment({
        restaurantId: id,
        restaurantName: existing.name,
        type: 'renewal',
        plan: `${days} days`,
        amount: payment.amount,
        method: payment.method,
      })
    }
  }

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
        r.id === id ? { ...r, salt, passwordHash } : r
      )
    )

    return password
  }

  // Unlink the device. The next login links a new device. The plan keeps running.
  const resetDevice = (id) => {
    const existing = registry.find((r) => r.id === id)

    if (!existing) {
      throw new Error('Restaurant not found.')
    }

    setRegistry((old) =>
      old.map((r) =>
        r.id === id
          ? { ...r, deviceId: null, deviceBoundAt: null }
          : r
      )
    )
  }

  const deleteRestaurant = (id) => {
    const existing = registry.find((r) => r.id === id)

    if (!existing) {
      throw new Error('Restaurant not found.')
    }

    setRegistry((old) => old.filter((r) => r.id !== id))

    // Same-browser demo only: clear the owner session without leaving the admin page.
    if (savedLicense?.restaurantId === id) {
      setLicense(null)
      setRole('')
      localStorage.removeItem(KEYS.role)
    }
  }

  // ---------------------------------------------------------------
  // Owner actions
  // ---------------------------------------------------------------
  // Returns an error message, or '' on success.
  const ownerLogin = async (identifier, password) => {
    const id = String(identifier || '').trim()

    if (!id || !password) {
      return 'Enter your email/mobile number and password.'
    }

    // This device already belongs to a restaurant: only that account can sign in.
    if (license) {
      const sameAccount = id.includes('@')
        ? normalizeEmail(id) === license.ownerEmail
        : normalizeMobile(id) === license.ownerMobile

      if (!sameAccount) {
        return `This device is set up for ${license.restaurantName}. Use "Switch restaurant" to sign in with a different account.`
      }
    }

    // Offline check against the license stored on this device.
    const localLogin = async () => {
      if (!license) {
        return 'Internet connection is required for the first sign-in on this device.'
      }

      const hash = await hashPassword(password, license.salt)

      if (hash !== license.passwordHash) {
        return 'Incorrect email / mobile or password.'
      }

      startOwnerSession(license)

      return ''
    }

    if (!navigator.onLine) {
      return localLogin()
    }

    try {
      const { license: fresh } = await apiOwnerLogin({
        identifier: id,
        password,
        deviceId,
      })

      // MOCK ONLY: the mock "server" lives in localStorage, so re-read it.
      setRegistry(readLocal(REGISTRY_KEY, []))

      startOwnerSession(fresh)

      return ''
    } catch (err) {
      if (err instanceof ApiError) {
        // Server unreachable but this device has a license: allow offline sign-in.
        if (err.code === 'NETWORK' && license) {
          return localLogin()
        }

        return err.message
      }

      console.error('Login error:', err)

      return 'Unable to sign in. Please try again.'
    }
  }

  const ownerLogout = () => {
    setRole('')
    localStorage.removeItem(KEYS.role)
    go('/login')
  }

  // Forget this restaurant on this computer.
  // The account stays linked to this device until the software owner resets it.
  const switchRestaurant = () => {
    setRole('')
    localStorage.removeItem(KEYS.role)
    setLicense(null)
    go('/login')
  }

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

  // Returns an error message, or '' when the plan is active again.
  const checkRenewal = async () => {
    const { license: fresh, error } = await pullLicense()

    if (error) return error

    return getLicenseStatus(fresh, trustedNow()).expired
      ? 'No renewal found yet. Contact the software owner, then try again.'
      : ''
  }

  // ---------------------------------------------------------------
  // Screens
  // ---------------------------------------------------------------
  if (path === '/admin' || path.startsWith('/admin/')) {
    if (!isAdmin) {
      return <AdminLoginPage onLogin={adminLogin} />
    }

    return (
      <AdminRoutes
        path={path}
        registry={registry}
        payments={payments}
        now={now}
        onNavigate={navigateAdmin}
        onLogout={adminLogout}
        onCreate={createRestaurant}
        onUpdate={updateRestaurant}
        onRenew={renewRestaurant}
        onResetPassword={resetPassword}
        onResetDevice={resetDevice}
        onDelete={deleteRestaurant}
        onAddPayment={addPayment}
        onDeletePayment={deletePayment}
      />
    )
  }

  // No license on this device yet: sign in (online) to link the device.
  if (!license) {
    return (
      <LoginPage
        license={null}
        onLogin={ownerLogin}
        onSwitchRestaurant={switchRestaurant}
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
        onSwitchRestaurant={switchRestaurant}
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