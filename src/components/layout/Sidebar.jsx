import { LayoutDashboard, Receipt, Utensils, Wallet, Users, ChartNoAxesCombined, Settings, ShieldCheck, LogOut, BookOpen, Store, PiggyBank } from 'lucide-react'
const links = [['Dashboard','dashboard',LayoutDashboard],['Billing','billing',Receipt],['Menu & GST','menu',Utensils],['Expenses','expenses',Wallet],['Staff','staff',Users],['Pigmy & Investment','pigmy',PiggyBank],['Reports','reports',ChartNoAxesCombined],['Daybook','daybook',BookOpen],['Settings','settings',Settings]]
const adminLinks = [['Admin Overview','admin',ShieldCheck],['Restaurants & Plans','adminPlans',Store]]
export default function Sidebar({ page, setPage, role, onLogout }) {
  const isAdmin = role === 'admin'
  const items = isAdmin ? adminLinks : links
  return <aside className="app-sidebar">
    <div className="sidebar-brand"><div className="sidebar-logo">R</div><div><b>RestroDesk</b><small>{isAdmin ? 'PLATFORM ADMIN' : 'LOCAL COUNTER EDITION'}</small></div></div>
    <div className="sidebar-label">{isAdmin ? 'Software administration' : 'Restaurant workspace'}</div>
    <nav className="sidebar-nav">{items.map(([name,key,Icon])=><button key={key} onClick={()=>setPage(key)} className={`sidebar-link ${page===key?'active':''}`}><Icon size={18}/><span>{name}</span></button>)}</nav>
    <div className="sidebar-footer"><b>{isAdmin ? 'Demo registry' : 'Offline-ready workspace'}</b><p>{isAdmin ? 'Restaurant records are saved in this browser.' : 'Your demo data stays in this browser on this device.'}</p><button onClick={onLogout}><LogOut size={15}/> Sign out</button></div>
  </aside>
}