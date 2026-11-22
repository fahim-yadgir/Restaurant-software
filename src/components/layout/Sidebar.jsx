
import {
  LayoutDashboard,
  Receipt,
  Utensils,
  Wallet,
  Users,
  ChartNoAxesCombined,
  Settings,
  ShieldCheck,
  LogOut,
  BookOpen,
  Store,
  PiggyBank,
  UserCog,
  CalendarClock,
} from 'lucide-react'

import { EXPIRY_WARNING_DAYS } from '@/lib/appConfig'

const links = [
  ['Dashboard', 'dashboard', LayoutDashboard],
  ['Billing', 'billing', Receipt],
  ['Menu & GST', 'menu', Utensils],
  ['Expenses', 'expenses', Wallet],
  ['Staff', 'staff', Users],
  ['Pigmy & Investment', 'pigmy', PiggyBank],
  ['Reports', 'reports', ChartNoAxesCombined],
  ['Daybook', 'daybook', BookOpen],
  ['Settings', 'settings', Settings],
]

const adminLinks = [
  ['Admin Overview', 'admin', ShieldCheck],
  ['Restaurants & Plans', 'adminPlans', Store],
  ['Account & Security', 'adminAccount', UserCog],
]

export default function Sidebar({
  page,
  setPage,
  role,
  onLogout,
  licenseStatus,
}) {
  const isAdmin = role === 'admin'
  const items = isAdmin ? adminLinks : links

  const showExpiry =
    !isAdmin &&
    licenseStatus &&
    !licenseStatus.expired &&
    licenseStatus.days < EXPIRY_WARNING_DAYS

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">R</div>
        <div>
          <b>RestroDesk</b>
          <small>
            {isAdmin ? 'PLATFORM ADMIN' : 'RESTAURANT WORKSPACE'}
          </small>
        </div>
      </div>

      <div className="sidebar-label">
        {isAdmin ? 'Administration' : 'Restaurant workspace'}
      </div>

      <nav className="sidebar-nav">
        {items.map(([name, key, Icon]) => (
          <button
            key={key}
            onClick={() => setPage(key)}
            className={`sidebar-link ${page === key ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span>{name}</span>
          </button>
        ))}
      </nav>

      {showExpiry && (
        <div className="mx-3 mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-bold">
            <CalendarClock size={15} />
            Expiry reminder
          </div>
          <p className="mt-1 font-semibold">
            {licenseStatus.days === 0
              ? 'Less than 1 day remaining'
              : `${licenseStatus.days} days remaining`}
          </p>
          <p className="mt-1">
            Renew your plan before expiry.
          </p>
        </div>
      )}

      <div className="sidebar-footer">
        <b>{isAdmin ? 'Platform administration' : 'Offline-ready workspace'}</b>
        <p>
          {isAdmin
            ? 'Manage restaurant accounts and plans.'
            : 'Your restaurant workspace.'}
        </p>
        <button onClick={onLogout}>
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
