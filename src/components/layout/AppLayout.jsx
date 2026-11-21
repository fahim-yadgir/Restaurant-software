import Sidebar from './Sidebar'
import Topbar from './Topbar'
export default function AppLayout({page,setPage,role,onLogout,children}) {
 const titles={dashboard:'Owner Dashboard',billing:'Customer Billing',menu:'Menu & GST Setup',expenses:'Expense Book',staff:'Staff & Salary',reports:'Sales & Accounting Reports',daybook:'Live Accounting Daybook',settings:'Restaurant Settings',admin:'Admin Overview',adminPlans:'Restaurants & Subscriptions'}
 return <div className="min-h-screen bg-[#f5f6f8]"><Sidebar page={page} setPage={setPage} role={role} onLogout={onLogout}/><div className="min-h-screen pl-64"><Topbar title={titles[page]||'RestroDesk POS'}/><main className="mx-auto max-w-[1500px] p-8">{children}</main></div></div>
}