
import { useState } from 'react'

import AppLayout from '@/components/layout/AppLayout'

import DashboardPage from '@/pages/owner/DashboardPage'
import BillingPage from '@/pages/owner/BillingPage'
import MenuPage from '@/pages/owner/MenuPage'
import ExpensesPage from '@/pages/owner/ExpensesPage'
import StaffPage from '@/pages/owner/StaffPage'
import StaffProfilePage from '@/pages/owner/StaffProfilePage'
import PigmyPage from '@/pages/owner/PigmyPage'
import ReportsPage from '@/pages/owner/ReportsPage'
import DaybookPage from '@/pages/owner/DaybookPage'
import SettingsPage from '@/pages/owner/SettingsPage'

import usePersistentState from '@/hooks/usePersistentState'

import {
  initialFoods,
  initialExpenses,
  initialStaff,
  initialPigmy,
  initialPigmyEntries,
} from '@/lib/demoData'

import { newId } from '@/lib/pigmy'

import {
  cleanExpenses,
  cleanStaff,
  cleanPigmy,
  cleanPigmyEntries,
} from '@/lib/seedCleanup'

import { notifySuccess } from '@/lib/toast'

export const DATA_KEYS = {
  foods: 'rd_foods',
  expenses: 'rd_expenses',
  staff: 'rd_staff',
  bills: 'rd_bills',
  pigmy: 'rd_pigmy',
  pigmyEntries: 'rd_pigmy_entries',
}

export default function OwnerRoutes({
  license,
  licenseStatus,
  onLogout,
  onChangePassword,
}) {
  const [page, setPageState] = useState('dashboard')
  const [staffId, setStaffId] = useState(null)

  const setPage = (next) => {
    setStaffId(null)
    setPageState(next)
  }

  const [foods, setFoods] = usePersistentState(
    DATA_KEYS.foods,
    initialFoods
  )

  const [expenses, setExpenses] = usePersistentState(
    DATA_KEYS.expenses,
    initialExpenses,
    cleanExpenses
  )

  const [staff, setStaff] = usePersistentState(
    DATA_KEYS.staff,
    initialStaff,
    cleanStaff
  )

  const [bills, setBills] = usePersistentState(
    DATA_KEYS.bills,
    []
  )

  const [pigmy, setPigmy] = usePersistentState(
    DATA_KEYS.pigmy,
    initialPigmy,
    cleanPigmy
  )

  const [pigmyEntries, setPigmyEntries] = usePersistentState(
    DATA_KEYS.pigmyEntries,
    initialPigmyEntries,
    cleanPigmyEntries
  )

  // Notification-enabled setters
  const updateFoods = (value) => {
    setFoods(value)
    notifySuccess('Menu updated successfully!')
  }

  const updateExpenses = (value) => {
    setExpenses(value)
    notifySuccess('Expense records updated successfully!')
  }

  const updateStaff = (value) => {
    setStaff(value)
    notifySuccess('Staff details updated successfully!')
  }

  const updatePigmy = (value) => {
    setPigmy(value)
    notifySuccess('Pigmy account updated successfully!')
  }

  const updatePigmyEntries = (value) => {
    setPigmyEntries(value)
    notifySuccess('Pigmy transaction saved successfully!')
  }

  const restaurantName = license.restaurantName

  const openAccounts = pigmy.filter(
    (account) => account.status !== 'Closed'
  )

  // Save a bill and optionally record its account deposit.
  const saveBill = (bill) => {
    setBills((old) => [bill, ...old])

    if (bill.accountId) {
      setPigmyEntries((old) => [
        ...old,
        {
          id: newId(),
          accountId: bill.accountId,
          date: bill.date,
          type: 'deposit',
          amount: bill.total,
          note: `Sales receipt ${bill.id}`,
          source: 'bill',
          sourceId: bill.id,
        },
      ])
    }

    notifySuccess('Bill saved successfully!')
  }

  const staffMember = staff.find(
    (member) => member.id === staffId
  )

  let content

  switch (page) {
    case 'billing':
      content = (
        <BillingPage
          foods={foods}
          restaurantName={restaurantName}
          accounts={openAccounts}
          onSaveBill={saveBill}
        />
      )
      break

    case 'menu':
      content = (
        <MenuPage
          foods={foods}
          setFoods={updateFoods}
        />
      )
      break

    case 'expenses':
      content = (
        <ExpensesPage
          expenses={expenses}
          setExpenses={updateExpenses}
          accounts={pigmy}
          entries={pigmyEntries}
          setEntries={updatePigmyEntries}
        />
      )
      break

    case 'staff':
      content = staffMember ? (
        <StaffProfilePage
          member={staffMember}
          expenses={expenses}
          setExpenses={updateExpenses}
          accounts={pigmy}
          entries={pigmyEntries}
          setEntries={updatePigmyEntries}
          onBack={() => setStaffId(null)}
          onUpdate={(data) =>
            updateStaff((old) =>
              old.map((member) =>
                member.id === staffMember.id
                  ? { ...member, ...data }
                  : member
              )
            )
          }
        />
      ) : (
        <StaffPage
          staff={staff}
          onOpen={setStaffId}
          onAdd={(data) =>
            updateStaff((old) => [
              ...old,
              { ...data, id: Date.now() },
            ])
          }
        />
      )
      break

    case 'pigmy':
      content = (
        <PigmyPage
          accounts={pigmy}
          setAccounts={updatePigmy}
          entries={pigmyEntries}
          setEntries={updatePigmyEntries}
        />
      )
      break

    case 'reports':
      content = (
        <ReportsPage
          bills={bills}
          expenses={expenses}
          staff={staff}
          pigmy={pigmy}
          pigmyEntries={pigmyEntries}
        />
      )
      break

    case 'daybook':
      content = (
        <DaybookPage
          bills={bills}
          expenses={expenses}
          pigmy={pigmy}
          pigmyEntries={pigmyEntries}
        />
      )
      break

    case 'settings':
      content = (
        <SettingsPage
          license={license}
          licenseStatus={licenseStatus}
          onLogout={onLogout}
          onChangePassword={onChangePassword}
        />
      )
      break

    default:
      content = (
        <DashboardPage
          bills={bills}
          expenses={expenses}
          staff={staff}
          pigmy={pigmy}
          pigmyEntries={pigmyEntries}
          restaurantName={restaurantName}
        />
      )
  }

  return (
    <AppLayout
      page={page}
      setPage={setPage}
      role="owner"
      onLogout={onLogout}
      license={license}
      licenseStatus={licenseStatus}
    >
      {content}
    </AppLayout>
  )
}
