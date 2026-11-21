import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import DashboardPage from '@/pages/owner/DashboardPage'
import BillingPage from '@/pages/owner/BillingPage'
import MenuPage from '@/pages/owner/MenuPage'
import ExpensesPage from '@/pages/owner/ExpensesPage'
import StaffPage from '@/pages/owner/StaffPage'
import PigmyPage from '@/pages/owner/PigmyPage'
import ReportsPage from '@/pages/owner/ReportsPage'
import DaybookPage from '@/pages/owner/DaybookPage'
import SettingsPage from '@/pages/owner/SettingsPage'
import usePersistentState from '@/hooks/usePersistentState'
import { initialFoods, initialExpenses, initialStaff, initialPigmy, initialPigmyEntries } from '@/lib/demoData'
import { localDate, newId } from '@/lib/pigmy'

// localStorage keys for the restaurant's own business data
export const DATA_KEYS = { foods: 'rd_foods', expenses: 'rd_expenses', staff: 'rd_staff', bills: 'rd_bills', pigmy: 'rd_pigmy', pigmyEntries: 'rd_pigmy_entries' }

// Restaurant owner workspace. Only rendered after activation, while the subscription is valid and the owner is signed in.
export default function OwnerRoutes({ license, licenseStatus, onLogout }) {
  const [page, setPage] = useState('dashboard')
  const [foods, setFoods] = usePersistentState(DATA_KEYS.foods, initialFoods)
  const [expenses, setExpenses] = usePersistentState(DATA_KEYS.expenses, initialExpenses)
  const [staff, setStaff] = usePersistentState(DATA_KEYS.staff, initialStaff)
  const [bills, setBills] = usePersistentState(DATA_KEYS.bills, [])
  const [pigmy, setPigmy] = usePersistentState(DATA_KEYS.pigmy, initialPigmy)
  const [pigmyEntries, setPigmyEntries] = usePersistentState(DATA_KEYS.pigmyEntries, initialPigmyEntries)
  const restaurantName = license.restaurantName
  const openAccounts = pigmy.filter((a) => a.status !== 'Closed')

  // Save a bill. If its UPI / card money was credited to an account, add the deposit to that account.
  const saveBill = (bill) => {
    setBills((old) => [bill, ...old])
    if (bill.accountId) {
      setPigmyEntries((old) => [...old, { id: newId(), accountId: bill.accountId, date: localDate(), type: 'deposit', amount: bill.total, note: `Sales receipt ${bill.id}`, source: 'bill', sourceId: bill.id }])
    }
  }

  let content
  switch (page) {
    case 'billing': content = <BillingPage foods={foods} restaurantName={restaurantName} accounts={openAccounts} onSaveBill={saveBill} />; break
    case 'menu': content = <MenuPage foods={foods} setFoods={setFoods} />; break
    case 'expenses': content = <ExpensesPage expenses={expenses} setExpenses={setExpenses} accounts={pigmy} entries={pigmyEntries} setEntries={setPigmyEntries} />; break
    case 'staff': content = <StaffPage staff={staff} setStaff={setStaff} expenses={expenses} setExpenses={setExpenses} accounts={pigmy} entries={pigmyEntries} setEntries={setPigmyEntries} />; break
    case 'pigmy': content = <PigmyPage accounts={pigmy} setAccounts={setPigmy} entries={pigmyEntries} setEntries={setPigmyEntries} />; break
    case 'reports': content = <ReportsPage bills={bills} expenses={expenses} />; break
    case 'daybook': content = <DaybookPage bills={bills} expenses={expenses} pigmy={pigmy} pigmyEntries={pigmyEntries} />; break
    case 'settings': content = <SettingsPage license={license} licenseStatus={licenseStatus} />; break
    default: content = <DashboardPage bills={bills} expenses={expenses} pigmyEntries={pigmyEntries} restaurantName={restaurantName} />
  }
  return <AppLayout page={page} setPage={setPage} role="owner" onLogout={onLogout} license={license} licenseStatus={licenseStatus}>{content}</AppLayout>
}