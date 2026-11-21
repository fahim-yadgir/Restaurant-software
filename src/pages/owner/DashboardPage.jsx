import {IndianRupee,TrendingDown,ChartNoAxesCombined,Wallet,ArrowUpRight,CalendarDays,PiggyBank} from 'lucide-react'
import StatCard from '@/components/dashboard/StatCard'
import DaybookTable from '@/components/dashboard/DaybookTable'
import {money} from '@/lib/format'

export default function DashboardPage({bills,expenses,pigmyEntries=[],restaurantName=""}) {
  const sales=bills.reduce((s,b)=>s+b.total,28450)
  const cost=expenses.reduce((s,e)=>s+Number(e.amount),11200)
  const profit=sales-cost
  // money currently held in pigmy / investment accounts (deposits - withdrawals)
  const invested=pigmyEntries.reduce((s,e)=>s+(e.type==='deposit'?1:-1)*Number(e.amount||0),0)

  const rows=[
    {time:'08:45 PM',title:'Customer Bill #INV-0842',type:'Sale Income',mode:'UPI QR',amount:662},
    {time:'06:15 PM',title:'Commercial Gas Cylinder Refill',type:'Expense',mode:'Cash',amount:3800},
    {time:'05:30 PM',title:'Customer Bill #INV-0841',type:'Sale Income',mode:'Cash',amount:1140},
    ...bills.map(b=>({time:'Just now',title:`Customer Bill ${b.id}`,type:'Sale Income',mode:b.payment,amount:b.total})),
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold">Good evening, {restaurantName}</h2>
          <p className="mt-1 text-sm text-slate-500">Here’s what is happening at your restaurant today.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"><CalendarDays size={15}/> Today · Local data</div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's Gross Sales" value={money(sales)} sub="64 bills paid" icon={IndianRupee} tone="orange"/>
        <StatCard label="Today's Expenses" value={money(cost)} sub="Gas, milk, vegetables" icon={TrendingDown} tone="blue"/>
        <StatCard label="Today's Net Profit" value={money(profit)} sub="Sales minus expenses" icon={ChartNoAxesCombined} tone="green"/>
        <StatCard label="Cash in Drawer" value="₹9,450" sub="UPI ₹15.8k · Card ₹3.2k" icon={Wallet} tone="purple"/>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <DaybookTable rows={rows}/>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-bold">Quick overview</h3>
          <p className="mt-1 text-xs text-slate-500">Illustrative demo figures</p>
          <div className="mt-6 space-y-5">
            {[['UPI collection','52%','w-[52%]'],['Cash collection','34%','w-[34%]'],['Card collection','14%','w-[14%]']].map(([a,b,w])=>(
              <div key={a}>
                <div className="mb-2 flex justify-between text-sm"><span className="text-slate-600">{a}</span><b>{b}</b></div>
                <div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full bg-orange-500 ${w}`}/></div>
              </div>
            ))}
          </div>

          <div className="mt-7 flex items-center justify-between rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-violet-50 p-2.5 text-violet-600"><PiggyBank size={18}/></span>
              <div><div className="text-xs text-slate-500">Total invested (Pigmy)</div><div className="font-display text-lg font-extrabold">{money(invested)}</div></div>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-orange-50 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-orange-800"><ArrowUpRight size={16}/> Keep your books up to date</div>
            <p className="mt-1 text-xs leading-5 text-orange-700">Record purchases and daily expenses to get a more accurate profit view.</p>
          </div>
        </div>
      </div>
    </div>
  )
}