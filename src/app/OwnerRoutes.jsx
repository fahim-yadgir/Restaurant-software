import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import DashboardPage from '@/pages/owner/DashboardPage'
import BillingPage from '@/pages/owner/BillingPage'
import MenuPage from '@/pages/owner/MenuPage'
import ExpensesPage from '@/pages/owner/ExpensesPage'
import StaffPage from '@/pages/owner/StaffPage'
import ReportsPage from '@/pages/owner/ReportsPage'
import DaybookPage from '@/pages/owner/DaybookPage'
import SettingsPage from '@/pages/owner/SettingsPage'
import usePersistentState from '@/hooks/usePersistentState'
import { initialFoods, initialExpenses, initialStaff } from '@/lib/demoData'

// localStorage keys for the restaurant's own business data
export const DATA_KEYS = { foods: 'rd_foods', expenses: 'rd_expenses', staff: 'rd_staff', bills: 'rd_bills' }

// Restaurant owner workspace. Only rendered after activation, while the subscription is valid and the owner is signed in.
export default function OwnerRoutes({ license, licenseStatus, onLogout }) {
  const [page, setPage] = useState('dashboard')
  const [foods, setFoods] = usePersistentState(DATA_KEYS.foods, initialFoods)
  const [expenses, setExpenses] = usePersistentState(DATA_KEYS.expenses, initialExpenses)
  const [staff, setStaff] = usePersistentState(DATA_KEYS.staff, initialStaff)
  const [bills, setBills] = usePersistentState(DATA_KEYS.bills, [])
  const restaurantName = license.restaurantName

  let content
  switch (page) {
    case 'billing': content = <BillingPage foods={foods} restaurantName={restaurantName} onSaveBill={(bill) => setBills((old) => [bill, ...old])} />; break
    case 'menu': content = <MenuPage foods={foods} setFoods={setFoods} />; break
    case 'expenses': content = <ExpensesPage expenses={expenses} setExpenses={setExpenses} />; break
    case 'staff': content = <StaffPage staff={staff} setStaff={setStaff} />; break
    case 'reports': content = <ReportsPage bills={bills} expenses={expenses} />; break
    case 'daybook': content = <DaybookPage bills={bills} expenses={expenses} />; break
    case 'settings': content = <SettingsPage license={license} licenseStatus={licenseStatus} />; break
    default: content = <DashboardPage bills={bills} expenses={expenses} restaurantName={restaurantName} />
  }
  return <AppLayout page={page} setPage={setPage} role="owner" onLogout={onLogout} license={license} licenseStatus={licenseStatus}>{content}</AppLayout>
}
