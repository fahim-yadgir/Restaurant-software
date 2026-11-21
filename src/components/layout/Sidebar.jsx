import {LayoutDashboard,Receipt,Utensils,Wallet,Users,ChartNoAxesCombined,Settings,ShieldCheck,LogOut,BookOpen} from 'lucide-react'
const links=[['Dashboard','dashboard',LayoutDashboard],['Billing & Print','billing',Receipt],['Menu & GST','menu',Utensils],['Expense Book','expenses',Wallet],['Staff & Salary','staff',Users],['Sales Reports','reports',ChartNoAxesCombined],['Daybook','daybook',BookOpen],['Settings','settings',Settings]]
export default function Sidebar({page,setPage,role,onLogout}) {
 const items=role==='admin'?[['Admin Overview','admin',ShieldCheck],['Restaurants & Plans','adminPlans',Users]]:links
 return <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-[#171f2d] px-4 py-5 text-white">
  <div className="mb-9 flex items-center gap-3 px-2"><div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500 font-extrabold">R</div><div><div className="font-extrabold tracking-tight">RestroDesk</div><div className="text-[11px] text-slate-400">LOCAL COUNTER EDITION</div></div></div>
  <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">{role==='admin'?'Software administration':'Restaurant workspace'}</div>
  <nav className="space-y-1">{items.map(([name,key,Icon])=><button key={key} onClick={()=>setPage(key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${page===key?'bg-orange-500 text-white shadow-lg shadow-orange-950/20':'text-slate-300 hover:bg-white/5 hover:text-white'}`}><Icon size={18}/>{name}</button>)}</nav>
  <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-xs font-semibold">Offline-ready workspace</div><div className="mt-1 text-[11px] leading-5 text-slate-400">Your demo data stays in this browser on this device.</div><button onClick={onLogout} className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white"><LogOut size={15}/> Sign out</button></div>
 </aside>
}