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
import { buildLicense, getLicenseStatus, syncLicenseFromRegistry, trustedNow } from '@/lib/license'
import {
  DAY_MS, REGISTRY_KEY, createRestaurantRecord, generatePassword, hashPassword,
  normalizeCode, randomSalt, renewRecord,
} from '@/lib/registry'

const KEYS = { role: 'rd_role', license: 'rd_license', adminSession: 'rd_admin_session' }

function go(path, replace = false) {
  window.history[replace ? 'replaceState' : 'pushState']({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

// App = shared state + the gates every visitor passes through:
//   /admin/*  → admin login → AdminRoutes
//   otherwise → activation (SetupPage) → subscription check → owner login → OwnerRoutes
export default function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [role, setRole] = useState(() => (localStorage.getItem(KEYS.role) === 'owner' ? 'owner' : ''))
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem(KEYS.adminSession) === 'true')
  const [registry, setRegistry] = usePersistentState(REGISTRY_KEY, [])
  // Licenses from the old demo build have no restaurantId, so they are ignored and setup runs again.
  const [license, setLicense] = usePersistentState(KEYS.license, null, (saved) => (saved?.restaurantId ? saved : null))
  const now = useTrustedClock()

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  // Keep the registry in step when the admin and the restaurant are open in two tabs.
  useEffect(() => {
    const onStorage = (event) => { if (event.key === REGISTRY_KEY) setRegistry(readLocal(REGISTRY_KEY, [])) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [setRegistry])
  // Pull renewals and password resets made by the admin into this device's license.
  useEffect(() => {
    const synced = syncLicenseFromRegistry(license, registry)
    if (synced !== license) setLicense(synced)
  }, [registry, license, setLicense])
  useEffect(() => { if (isAdmin && path === ADMIN_PATHS.login) go(ADMIN_PATHS.adminOverview, true) }, [isAdmin, path])

  const setupDone = !!license?.restaurantId
  const licenseStatus = useMemo(() => getLicenseStatus(license, now), [license, now])

  // ---- Platform admin actions ----
  const adminLogin = () => { sessionStorage.setItem(KEYS.adminSession, 'true'); setIsAdmin(true); go(ADMIN_PATHS.adminOverview) }
  const adminLogout = () => { sessionStorage.removeItem(KEYS.adminSession); setIsAdmin(false); go(ADMIN_PATHS.login) }
  const navigateAdmin = (key) => go(ADMIN_PATHS[key === 'adminPlans' ? 'adminPlans' : 'adminOverview'])

  const createRestaurant = async (form) => {
    const record = await createRestaurantRecord(form, registry)
    setRegistry((old) => [record, ...old])
    return record
  }
  const renewRestaurant = (id, days) => setRegistry((old) => old.map((r) => (r.id === id ? renewRecord(r, days, trustedNow()) : r)))
  const resetPassword = async (id) => {
    const password = generatePassword()
    const salt = randomSalt()
    const passwordHash = await hashPassword(password, salt)
    setRegistry((old) => old.map((r) => (r.id === id ? { ...r, salt, passwordHash } : r)))
    return password
  }
  const deleteRestaurant = (id) => setRegistry((old) => old.filter((r) => r.id !== id || r.activatedAt)) // activated restaurants cannot be deleted

  // ---- Restaurant activation ----
  const lookupActivation = (rawCode) => {
    const code = normalizeCode(rawCode)
    if (!code) return { error: 'Enter the activation code.' }
    const restaurant = registry.find((r) => r.code === code)
    if (!restaurant) return { error: 'Activation code not found. Check the code with the software owner.' }
    if (restaurant.activatedAt) return { error: 'This activation code has already been used.' }
    return { restaurant }
  }
  const activateRestaurant = (id) => {
    const record = registry.find((r) => r.id === id)
    if (!record || record.activatedAt) return false
    const activatedAt = trustedNow()
    const activated = { ...record, activatedAt, expiresAt: activatedAt + record.durationDays * DAY_MS }
    setRegistry((old) => old.map((r) => (r.id === id ? activated : r)))
    setLicense(buildLicense(activated))
    go('/login')
    return true
  }

  // ---- Restaurant owner actions ----
  const ownerLogin = () => { setRole('owner'); localStorage.setItem(KEYS.role, 'owner'); go('/dashboard') }
  const ownerLogout = () => { setRole(''); localStorage.removeItem(KEYS.role); go('/login') }
  // Lets a device switch to another restaurant. The saved license is removed; the restaurant's old code stays "used".
  const activateDifferentRestaurant = () => {
    setRole(''); localStorage.removeItem(KEYS.role)
    setLicense(null)
    go('/')
  }
  const checkRenewal = () => {
    const fresh = readLocal(REGISTRY_KEY, [])
    setRegistry(fresh)
    const synced = syncLicenseFromRegistry(license, fresh)
    if (synced !== license) setLicense(synced)
    return !getLicenseStatus(synced, trustedNow()).expired
  }

  if (path === '/admin' || path.startsWith('/admin/')) {
    if (!isAdmin) return <AdminLoginPage onLogin={adminLogin} />
    return <AdminRoutes path={path} registry={registry} now={now} onNavigate={navigateAdmin} onLogout={adminLogout}
      onCreate={createRestaurant} onRenew={renewRestaurant} onResetPassword={resetPassword} onDelete={deleteRestaurant} />
  }
  if (!setupDone) return <SetupPage onLookup={lookupActivation} onActivate={activateRestaurant} />
  if (licenseStatus.expired) return <SubscriptionPage license={license} onCheckRenewal={checkRenewal} />
  if (role !== 'owner') return <LoginPage license={license} onLogin={ownerLogin} onActivateDifferent={activateDifferentRestaurant} />
  return <OwnerRoutes license={license} licenseStatus={licenseStatus} onLogout={ownerLogout} />
}