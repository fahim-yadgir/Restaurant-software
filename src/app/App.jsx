import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import AdminRoutes, { ADMIN_PATHS } from '@/app/AdminRoutes'
import OwnerRoutes from '@/app/OwnerRoutes'

import AdminLoginPage from '@/pages/auth/AdminLoginPage'
import LoginPage from '@/pages/auth/LoginPage'
import SubscriptionPage from '@/pages/subscription/SubscriptionPage'
import ForcePasswordPage from '@/pages/auth/ForcePasswordPage'

import usePersistentState from '@/hooks/usePersistentState'
import useTrustedClock from '@/hooks/useTrustedClock'

import {
  ADMIN_UNAUTHORIZED_EVENT,
  adminLogout as apiAdminLogout,
  adminMe,
  apiCreateRestaurant,
  apiAddPayment,
  apiDeletePayment,
  apiUpdatePayment,
  fetchRecentPayments,
  apiDeleteRestaurant,
  fetchRevenue,
  apiPermanentDelete,
  apiRestoreRestaurant,
  fetchDeletedRestaurants,
  apiRenewRestaurant,
  apiResetDevice,
  apiResetPassword,
  apiUpdateRestaurant,
  fetchRestaurants,
  getAdminToken,
} from '@/lib/adminApi'
import { readLocal } from '@/lib/localStore'
import { getOrCreateDeviceId } from '@/lib/device'
import { notifyError } from '@/lib/toast'

import {
  ApiError,
  ownerChangePassword as apiOwnerChangePassword,
  ownerLogin as apiOwnerLogin,
  refreshLicense as apiRefreshLicense,
} from '@/lib/api'

import {
  getLicenseStatus,
  isLicenseForDevice,
  trustedNow,
  verifyLicenseToken,
  verifyOwnerPassword,
} from '@/lib/license'

import {
  DAY_MS,
  REGISTRY_KEY,
  createRestaurantRecord,
  generatePassword,
  normalizeEmail,
  normalizeMobile,
  planLabel,
  renewRecord,
} from '@/lib/registry'

const KEYS = {
  role: 'rd_role',
  licenseToken: 'rd_license_token',
}

// The server no longer accepts this license (device reset, account removed, or not genuine).
const REVOKE_CODES = ['DEVICE_REVOKED', 'NOT_FOUND', 'ACCOUNT_REMOVED', 'INVALID_LICENSE']

function go(path, replace = false) {
  window.history[replace ? 'replaceState' : 'pushState']({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname)

  const [role, setRole] = useState(() =>
    localStorage.getItem(KEYS.role) === 'owner' ? 'owner' : ''
  )

  const [isAdmin, setIsAdmin] = useState(() => !!getAdminToken())

  // Restaurants of the admin panel come from the server (D1), not from localStorage.
  const [adminRestaurants, setAdminRestaurants] = useState([])

  // Deleted restaurants: null = not loaded yet (loaded only when that page is opened).
  const [deletedRestaurants, setDeletedRestaurants] = useState(null)

  const [registry, setRegistry] = usePersistentState(REGISTRY_KEY, [])

  // Revenue page data { rows (grouped, for the charts), recent (last 10 payments) }.
  // null = not loaded (loaded when that page opens, and again after a payment changes).
  const [revenueRows, setRevenueRows] = useState(null)

  // The signed license the server gave this PC (a text token). Only the token is saved.
  const [licenseToken, setLicenseToken] = usePersistentState(
    KEYS.licenseToken,
    '',
    (saved) => (typeof saved === 'string' ? saved : '')
  )

  // Its content, once the signature was checked. null = no license, or it was edited / is not genuine.
  const [verifiedLicense, setVerifiedLicense] = useState(null)
  const [licenseChecked, setLicenseChecked] = useState(false)

  const now = useTrustedClock()
  const deviceId = useMemo(() => getOrCreateDeviceId(), [])

  useEffect(() => {
    let alive = true

    verifyLicenseToken(licenseToken).then((payload) => {
      if (!alive) return

      setVerifiedLicense(payload)
      setLicenseChecked(true)
    })

    return () => {
      alive = false
    }
  }, [licenseToken])

  // A license is only valid on the device it was issued for (one login = one device).
  const license = isLicenseForDevice(verifiedLicense, deviceId) ? verifiedLicense : null

  // Latest values for callbacks that must not change on every refresh.
  const sessionRef = useRef({ token: '', license: null })

  useEffect(() => {
    sessionRef.current = { token: licenseToken, license }
  })

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

  // A 401 from any admin call (expired or signed-out token) -> back to the login page.
  useEffect(() => {
    const onUnauthorized = () => {
      setIsAdmin(false)
      setAdminRestaurants([])
      setDeletedRestaurants(null)
      setRevenueRows(null)
      go(ADMIN_PATHS.login, true)
    }

    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, onUnauthorized)

    return () => window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  // On page load, check the saved token with the server (a 401 fires the event above).
  useEffect(() => {
    if (getAdminToken()) adminMe().catch(() => {})
  }, [])

  // Load the restaurants whenever the admin is signed in.
  useEffect(() => {
    if (!isAdmin) return

    fetchRestaurants()
      .then(setAdminRestaurants)
      .catch((err) => {
        if (err.code !== 'UNAUTHORIZED') notifyError(err.message)
      })
  }, [isAdmin])

  // Revenue is read from the database when the dashboard or Revenue page is opened (and again after a payment changes).
  useEffect(() => {
    if (!isAdmin || revenueRows !== null) return
    // Needed by the dashboard (income cards) and the Revenue page; loaded once, shared by both.
    const onDashboard = path.replace(/\/+$/, '') === ADMIN_PATHS.adminOverview

    if (!onDashboard && !path.startsWith(ADMIN_PATHS.adminRevenue)) return

    Promise.all([fetchRevenue(), fetchRecentPayments(10)])
      .then(([rows, recent]) => setRevenueRows({ rows, recent }))
      .catch((err) => {
        if (err.code !== 'UNAUTHORIZED') notifyError(err.message)
      })
  }, [isAdmin, path, revenueRows])

  // The deleted list is read from the database only when its page is opened.
  useEffect(() => {
    if (!isAdmin || deletedRestaurants !== null) return
    if (!path.startsWith(ADMIN_PATHS.adminDeleted)) return

    fetchDeletedRestaurants()
      .then(setDeletedRestaurants)
      .catch((err) => {
        if (err.code !== 'UNAUTHORIZED') notifyError(err.message)
      })
  }, [isAdmin, path, deletedRestaurants])

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
  // result = { license, token } from the server (or the saved license, for an offline sign-in)
  const startOwnerSession = (result) => {
    setLicenseToken(result.token)
    setVerifiedLicense(result.license)
    setLicenseChecked(true)
    setRole('owner')
    localStorage.setItem(KEYS.role, 'owner')
    go('/dashboard')
  }

  // The server no longer recognises this device: drop the license and sign out.
  const revokeDevice = useCallback(() => {
    setLicenseToken('')
    setVerifiedLicense(null)
    setRole('')
    localStorage.removeItem(KEYS.role)
    go('/login', true)
  }, [setLicenseToken])

  // Online only: fetch the latest license (renewals, plan changes, device check).
  const pullLicense = useCallback(async () => {
    if (!restaurantId) {
      return { error: 'No restaurant is set up on this device.' }
    }

    if (!navigator.onLine) {
      return { error: 'Internet connection is required.' }
    }

    try {
      const fresh = await apiRefreshLicense({
        token: sessionRef.current.token,
        deviceId,
      })

      // Every signature is different, so keep the saved license when its content did not change.
      if (JSON.stringify(fresh.license) !== JSON.stringify(sessionRef.current.license)) {
        setLicenseToken(fresh.token)
        setVerifiedLicense(fresh.license)
      }

      return { license: fresh.license }
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
  }, [restaurantId, deviceId, revokeDevice, setLicenseToken])

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
    setIsAdmin(true)
    go(ADMIN_PATHS.adminOverview)
  }

  const adminLogout = async () => {
    await apiAdminLogout()
    setIsAdmin(false)
    setAdminRestaurants([])
    setDeletedRestaurants(null)
    setRevenueRows(null)
    go(ADMIN_PATHS.login)
  }

  const navigateAdmin = (key) =>
    go(ADMIN_PATHS[key] || ADMIN_PATHS.adminOverview)

  // ---------------------------------------------------------------
  // Admin actions (these become API calls when the backend exists)
  // ---------------------------------------------------------------
  // A payment recorded by hand. The server adds the restaurant name and plan.
  const addPayment = async (entry) => {
    await apiAddPayment(entry)
    setRevenueRows(null) // reload revenue next
  }

  const updatePayment = async (id, changes) => {
    await apiUpdatePayment(id, changes)
    setRevenueRows(null)
  }

  const deletePayment = async (id) => {
    await apiDeletePayment(id)
    setRevenueRows(null)
  }

  // Every restaurant action calls the server; the list on screen is updated from its answer.
  // Payments made here (register / renew / restore) are saved by the server; revenue reloads when opened.
  const createRestaurant = async (form) => {
    const { restaurant } = await apiCreateRestaurant({
      name: form.name,
      ownerName: form.ownerName,
      mobile: form.mobile,
      email: form.email,
      password: form.password,
      planType: form.planType,
      durationDays: form.durationDays,
      amount: form.amount,
      method: form.method,
    })

    setAdminRestaurants((old) => [restaurant, ...old])
    setRevenueRows(null)

    return restaurant
  }

  const updateRestaurant = async (id, updates) => {
    const restaurant = await apiUpdateRestaurant(id, updates)

    setAdminRestaurants((old) => old.map((r) => (r.id === id ? restaurant : r)))
  }

  // payment = { amount, method } received for this renewal (optional)
  const renewRestaurant = async (id, days, payment = {}) => {
    const restaurant = await apiRenewRestaurant(id, {
      days,
      amount: payment.amount,
      method: payment.method,
    })

    setAdminRestaurants((old) => old.map((r) => (r.id === id ? restaurant : r)))
    setRevenueRows(null)
  }

  // Returns the new password (shown once to the admin).
  const resetPassword = (id) => apiResetPassword(id)

  // Unlink the device. The next login links a new device. The plan keeps running.
  const resetDevice = async (id) => {
    await apiResetDevice(id)

    setAdminRestaurants((old) =>
      old.map((r) => (r.id === id ? { ...r, deviceId: null, deviceBoundAt: null } : r))
    )
  }

  // Soft delete: the restaurant moves to the Deleted page (its payments stay in Revenue).
  const deleteRestaurant = async (id) => {
    await apiDeleteRestaurant(id)

    setAdminRestaurants((old) => old.filter((r) => r.id !== id))
    setDeletedRestaurants(null) // reload the deleted list next time it is opened
  }

  // body: {} to only restore, or { days, amount, method } to restore and renew.
  const restoreRestaurant = async (id, body) => {
    const restaurant = await apiRestoreRestaurant(id, body)

    setAdminRestaurants((old) => [restaurant, ...old])
    setDeletedRestaurants((old) => (old ? old.filter((r) => r.id !== id) : old))
    setRevenueRows(null)
  }

  const permanentDeleteRestaurant = async (id) => {
    await apiPermanentDelete(id)

    setDeletedRestaurants((old) => (old ? old.filter((r) => r.id !== id) : old))
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

      if (!(await verifyOwnerPassword(password, license.passwordHash))) {
        return 'Incorrect email / mobile or password.'
      }

      startOwnerSession({ license, token: licenseToken })

      return ''
    }

    if (!navigator.onLine) {
      return localLogin()
    }

    try {
      const result = await apiOwnerLogin({
        identifier: id,
        password,
        deviceId,
      })

      startOwnerSession(result)

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
    setLicenseToken('')
    setVerifiedLicense(null)
    go('/login')
  }

  // The password is kept on the server too (it is used to sign in offline), so this needs internet.
  // Returns an error message, or '' on success.
  const changeOwnerPassword = async (current, next) => {
    if (!navigator.onLine) {
      return 'Internet connection is required to change the password.'
    }

    try {
      const result = await apiOwnerChangePassword({
        token: licenseToken,
        deviceId,
        currentPassword: current,
        newPassword: next,
      })

      setLicenseToken(result.token)
      setVerifiedLicense(result.license)

      return ''
    } catch (err) {
      if (err instanceof ApiError && REVOKE_CODES.includes(err.code)) {
        revokeDevice()
        notifyError(err.message)
      }

      return err instanceof ApiError ? err.message : 'Could not change the password. Try again.'
    }
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
        registry={adminRestaurants}
        revenue={revenueRows}
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
        onUpdatePayment={updatePayment}
        onDeletePayment={deletePayment}
        deleted={deletedRestaurants}
        onRestore={restoreRestaurant}
        onPermanentDelete={permanentDeleteRestaurant}
      />
    )
  }

  // Checking the saved license's signature (a moment at start-up).
  if (!licenseChecked) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">
        Loading…
      </div>
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

  // Still on the temporary password from the admin: choose a new one first.
  if (license.mustChangePassword) {
    return (
      <ForcePasswordPage
        license={license}
        onChangePassword={changeOwnerPassword}
        onLogout={ownerLogout}
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