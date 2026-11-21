import { LayoutDashboard, Receipt, Utensils, Wallet, Users, ChartNoAxesCombined, Settings, ShieldCheck, LogOut, BookOpen } from 'lucide-react'
const links = [['Dashboard','dashboard',LayoutDashboard],['Billing','billing',Receipt],['Menu & GST','menu',Utensils],['Expenses','expenses',Wallet],['Staff','staff',Users],['Reports','reports',ChartNoAxesCombined],['Daybook','daybook',BookOpen],['Settings','settings',Settings]]
export default function Sidebar({ page, setPage, role, onLogout }) {
  const items = role === 'admin' ? [['Admin Overview','admin',ShieldCheck],['Restaurants & Plans','adminPlans',Users]] : links
  return <aside className="app-sidebar">
    <div className="sidebar-brand"><div className="sidebar-logo">R</div><div><b>RestroDesk</b><small>LOCAL COUNTER EDITION</small></div></div>
    <div className="sidebar-label">{role === 'admin' ? 'Software administration' : 'Restaurant workspace'}</div>
    <nav className="sidebar-nav">{items.map(([name,key,Icon])=><button key={key} onClick={()=>setPage(key)} className={`sidebar-link ${page===key?'active':''}`}><Icon size={18}/><span>{name}</span></button>)}</nav>
    <div className="sidebar-footer"><b>Offline-ready workspace</b><p>Your demo data stays in this browser on this device.</p><button onClick={onLogout}><LogOut size={15}/> Sign out</button></div>
  </aside>
}
