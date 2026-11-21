import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { SUPPORT, EXPIRY_WARNING_DAYS } from '@/lib/appConfig'

const titles = { dashboard: 'Owner Dashboard', billing: 'Customer Billing', menu: 'Menu & GST Setup', expenses: 'Expense Book', staff: 'Staff & Salary', reports: 'Sales & Accounting Reports', daybook: 'Live Accounting Daybook', settings: 'Restaurant Settings', admin: 'Admin Overview', adminPlans: 'Restaurants & Subscriptions' }

export default function AppLayout({ page, setPage, role, onLogout, license, licenseStatus, children }) {
  const isAdmin = role === 'admin'
  const subtitle = isAdmin ? 'Platform administration' : license?.restaurantName || 'Restaurant management workspace'
  const expiringSoon = !isAdmin && licenseStatus && !licenseStatus.expired && licenseStatus.days < EXPIRY_WARNING_DAYS
  return <div className="app-shell">
    <Sidebar page={page} setPage={setPage} role={role} onLogout={onLogout} />
    <div className="app-main"><Topbar title={titles[page] || 'RestroDesk POS'} subtitle={subtitle} initialsFrom={isAdmin ? 'Platform Admin' : license?.restaurantName} licenseStatus={isAdmin ? null : licenseStatus} />
      <main className="app-content">
        {expiringSoon && <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><b>Subscription ending soon.</b> {licenseStatus.days === 0 ? 'Less than a day is left.' : `${licenseStatus.days} day(s) left.`} Contact {SUPPORT.name} on {SUPPORT.phone} to renew before operations are locked.</div>}
        {children}
      </main>
    </div>
  </div>
}
