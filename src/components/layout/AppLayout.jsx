import Sidebar from './Sidebar'
import Topbar from './Topbar'
export default function AppLayout({ page, setPage, role, onLogout, licenseStatus, children }) {
  const titles = { dashboard:'Owner Dashboard', billing:'Customer Billing', menu:'Menu & GST Setup', expenses:'Expense Book', staff:'Staff & Salary', reports:'Sales & Accounting Reports', daybook:'Live Accounting Daybook', settings:'Restaurant Settings', admin:'Admin Overview', adminPlans:'Restaurants & Subscriptions' }
  return <div className="app-shell">
    <Sidebar page={page} setPage={setPage} role={role} onLogout={onLogout}/>
    <div className="app-main"><Topbar title={titles[page] || 'RestroDesk POS'} licenseStatus={licenseStatus}/>
      <main className="app-content">{children}</main>
    </div>
  </div>
}
