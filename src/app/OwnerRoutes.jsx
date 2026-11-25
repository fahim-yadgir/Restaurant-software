import { useEffect, useState } from 'react'

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

const DATA_KEYS = {
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
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator !== 'undefined' ? navigator.onLine : false
  )

  // Monitor internet connection.
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Prevent all changes when internet is unavailable.
  const checkInternet = () => {
    const connected =
      typeof navigator !== 'undefined' && navigator.onLine

    if (!connected) {
      setIsOnline(false)
      window.alert(
        'Internet connection required!\n\nPlease connect to the internet and try again.'
      )
      return false
    }

    setIsOnline(true)
    return true
  }

  const setPage = (next) => {
    setStaffId(null)
    setPageState(next)
  }

  // Persistent application data.
  // Restaurant details printed on the bill (GSTIN, address). Saved from Settings.
  const [profile, setProfile] = usePersistentState('rd_profile', {})

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

  // Soft-deleted dishes stay stored (so old bills keep their names)
  // but are hidden from the Menu and Billing screens.
  const liveFoods = foods.filter((food) => !food.deleted)

  // Common function for protected updates.
  const updateData = (setter, value, successMessage) => {
    if (!checkInternet()) return false

    setter(value)

    notifySuccess(successMessage)

    return true
  }

  // Menu updates.
  const updateFoods = (value) =>
    updateData(
      setFoods,
      value,
      'Menu updated successfully!'
    )

  // Expense updates.
  const updateExpenses = (value) =>
    updateData(
      setExpenses,
      value,
      'Expense records updated successfully!'
    )

  // Staff updates.
  const updateStaff = (value) =>
    updateData(
      setStaff,
      value,
      'Staff details updated successfully!'
    )

  // Pigmy account updates.
  const updatePigmy = (value) =>
    updateData(
      setPigmy,
      value,
      'Pigmy account updated successfully!'
    )

  // Pigmy transaction updates.
  const updatePigmyEntries = (value) =>
    updateData(
      setPigmyEntries,
      value,
      'Pigmy transaction saved successfully!'
    )

  const restaurantName = license?.restaurantName || 'Restaurant'

  const openAccounts = pigmy.filter(
    (account) => account.status !== 'Closed'
  )

  // Save bill and optional Pigmy deposit.
  const saveBill = (bill) => {
    if (!checkInternet()) return false

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

    return true
  }

  // Selected staff member.
  const staffMember = staff.find(
    (member) => member.id === staffId
  )

  let content

  switch (page) {
    case 'billing':
      content = (
        <BillingPage
          foods={liveFoods}
          restaurantName={restaurantName}
          profile={profile}
          phone={license.ownerMobile}
          accounts={openAccounts}
          onSaveBill={saveBill}
        />
      )
      break

    case 'menu':
      content = (
        <MenuPage
          foods={liveFoods}
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
              {
                ...data,
                id: Date.now(),
              },
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
          profile={profile}
          onSaveProfile={setProfile}
          onLogout={onLogout}
          onChangePassword={(...args) => {
            if (!checkInternet()) return false
            return onChangePassword?.(...args)
          }}
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