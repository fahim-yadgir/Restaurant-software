import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/layout/AppLayout'
import LoginPage from '../pages/LoginPage'
import SetupPage from '../pages/SetupPage'
import DashboardPage from '../pages/DashboardPage'
import BillingPage from '../pages/BillingPage'
import MenuPage from '../pages/MenuPage'
import ExpensesPage from '../pages/ExpensesPage'
import StaffPage from '../pages/StaffPage'
import ReportsPage from '../pages/ReportsPage'
import DaybookPage from '../pages/DaybookPage'
import SettingsPage from '../pages/SettingsPage'
import AdminPage from '../pages/AdminPage'
import SubscriptionPage from '../pages/SubscriptionPage'
import { initialFoods, initialExpenses, initialStaff } from '../data/demo'
import { readLocal, writeLocal } from '../services/localStore'
import { createLicense, getLicenseStatus, renewDemoLicense } from '../services/license'

const KEYS = { setup: 'rd_setup_complete', role: 'rd_role', foods: 'rd_foods', expenses: 'rd_expenses', staff: 'rd_staff', bills: 'rd_bills', license: 'rd_license' }

export default function App() {
  const [setupDone, setSetupDone] = useState(() => localStorage.getItem(KEYS.setup) === 'true')
  const [role, setRole] = useState(() => localStorage.getItem(KEYS.role) || '')
  const [page, setPage] = useState('dashboard')
  const [foods, setFoods] = useState(() => readLocal(KEYS.foods, initialFoods))
  const [expenses, setExpenses] = useState(() => readLocal(KEYS.expenses, initialExpenses))
  const [staff, setStaff] = useState(() => readLocal(KEYS.staff, initialStaff))
  const [bills, setBills] = useState(() => readLocal(KEYS.bills, []))
  const [license, setLicense] = useState(() => readLocal(KEYS.license, null))
  const [now, setNow] = useState(Date.now())

  useEffect(() => { writeLocal(KEYS.foods, foods) }, [foods])
  useEffect(() => { writeLocal(KEYS.expenses, expenses) }, [expenses])
  useEffect(() => { writeLocal(KEYS.staff, staff) }, [staff])
  useEffect(() => { writeLocal(KEYS.bills, bills) }, [bills])
  useEffect(() => { writeLocal(KEYS.license, license) }, [license])
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])

  const licenseStatus = useMemo(() => getLicenseStatus(license, now), [license, now])
  const completeSetup = (details) => {
    const newLicense = createLicense(details)
    setLicense(newLicense)
    setSetupDone(true)
    localStorage.setItem(KEYS.setup, 'true')
  }
  const login = (selectedRole) => {
    setRole(selectedRole)
    localStorage.setItem(KEYS.role, selectedRole)
    setPage(selectedRole === 'admin' ? 'admin' : 'dashboard')
  }
  const logout = () => {
    setRole('')
    localStorage.removeItem(KEYS.role)
  }
  const renew = () => {
    const updated = renewDemoLicense(license)
    setLicense(updated)
  }

  if (!setupDone) return <SetupPage onComplete={completeSetup} />
  if (!role) return <LoginPage onLogin={login} />
  if (role === 'owner' && licenseStatus.expired) return <SubscriptionPage license={license} onRenew={renew} />
  let content
  if (role === 'admin') content = <AdminPage />
  else switch (page) {
    case 'billing': content = <BillingPage foods={foods} onSaveBill={bill => setBills(old => [bill, ...old])} />; break
    case 'menu': content = <MenuPage foods={foods} setFoods={setFoods} />; break
    case 'expenses': content = <ExpensesPage expenses={expenses} setExpenses={setExpenses} />; break
    case 'staff': content = <StaffPage staff={staff} setStaff={setStaff} />; break
    case 'reports': content = <ReportsPage bills={bills} expenses={expenses} />; break
    case 'daybook': content = <DaybookPage bills={bills} expenses={expenses} />; break
    case 'settings': content = <SettingsPage />; break
    default: content = <DashboardPage bills={bills} expenses={expenses} />
  }
  return <AppLayout page={role === 'admin' ? 'admin' : page} setPage={setPage} role={role} onLogout={logout} licenseStatus={licenseStatus}>{content}</AppLayout>
}
