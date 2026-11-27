import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { SUPPORT, EXPIRY_WARNING_DAYS } from '@/lib/appConfig'

const titles = {
  dashboard: 'Owner Dashboard',
  billing: 'Customer Billing',
  menu: 'Menu & GST Setup',
  expenses: 'Expense Book',
  staff: 'Staff & Salary',
  pigmy: 'Pigmy & Investment',
  reports: 'Sales & Accounting Reports',
  daybook: 'Live Accounting Daybook',
  settings: 'Restaurant Settings',
  admin: 'Admin Overview',
  adminPlans: 'Restaurants & Subscriptions',
  adminDeleted: 'Deleted Restaurants',
  adminRevenue: 'Revenue',
  adminAccount: 'Account & Security',
}

export default function AppLayout({
  page,
  setPage,
  role,
  onLogout,
  license,
  licenseStatus,
  children,
}) {
  const isAdmin = role === 'admin'

  const expiringSoon =
    !isAdmin &&
    licenseStatus &&
    !licenseStatus.expired &&
    licenseStatus.days < EXPIRY_WARNING_DAYS

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={setPage}
        role={role}
        onLogout={onLogout}
        licenseStatus={licenseStatus}
      />

      <div className="app-main">
        {!isAdmin && (
          <Topbar
            title={titles[page] || 'RestroDesk POS'}
            subtitle={license?.restaurantName || 'Restaurant workspace'}
            initialsFrom={license?.restaurantName}
            licenseStatus={licenseStatus}
          />
        )}

        <main className="app-content">
          {expiringSoon && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <b>Subscription expiry reminder</b>
              <p className="mt-1">
                {licenseStatus.days === 0
                  ? 'Your subscription expires in less than one day.'
                  : `${licenseStatus.days} days remaining on your subscription.`}
              </p>
              <p className="mt-1">
                Contact {SUPPORT.name} at {SUPPORT.phone} to renew.
              </p>
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  )
}