import {IndianRupee,TrendingDown,ChartNoAxesCombined,Wallet,CalendarDays,PiggyBank,Users} from 'lucide-react'
import StatCard from '@/components/dashboard/StatCard'
import DaybookTable from '@/components/dashboard/DaybookTable'
import BarRow from '@/components/dashboard/BarRow'
import {money} from '@/lib/format'
import {localDate,summarize} from '@/lib/pigmy'
import {summarizeBills,summarizeExpenses,cashInDrawer,staffRemaining,ledgerRows,pct} from '@/lib/stats'

const greeting=()=>{const h=new Date().getHours();return h<12?'Good morning':h<17?'Good afternoon':'Good evening'}

export default function DashboardPage({bills,expenses,staff=[],pigmy=[],pigmyEntries=[],restaurantName=''}) {
  const today=localDate()

  // Today's real figures
  const sales=summarizeBills(bills.filter(b=>b.date===today))
  const spent=summarizeExpenses(expenses.filter(e=>e.date===today))
  const topCategory=Object.entries(spent.byCategory).sort((a,b)=>b[1]-a[1])[0]
  const profit=sales.taxable-spent.total              // sales excluding GST minus expenses
  const cash=cashInDrawer({bills,expenses,pigmyEntries})

  // Bank / pigmy and staff
  const sums=pigmy.map(a=>summarize(a,pigmyEntries))
  const bankBalance=sums.reduce((t,s)=>t+s.balance,0)
  const pigmyPending=pigmy.reduce((t,a,i)=>t+(a.status==='Closed'?0:sums[i].pending),0)
  const staffDue=staffRemaining(staff,expenses)

  const split=Object.entries(sales.byPayment).sort((a,b)=>b[1]-a[1])
  const rows=ledgerRows({bills,expenses,pigmy,pigmyEntries}).slice(0,8)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold">{greeting()}, {restaurantName}</h2>
          <p className="mt-1 text-sm text-slate-500">Here’s what is happening at your restaurant today.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"><CalendarDays size={15}/> Today · {today}</div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's Gross Sales" value={money(sales.gross)} sub={`${sales.count} bill${sales.count===1?'':'s'} · incl. GST ${money(sales.gst)}`} icon={IndianRupee} tone="orange"/>
        <StatCard label="Today's Expenses" value={money(spent.total)} sub={spent.count?`${spent.count} entr${spent.count===1?'y':'ies'} · top: ${topCategory[0]}`:'No expenses recorded today'} icon={TrendingDown} tone="blue"/>
        <StatCard label="Today's Net Profit" value={money(profit)} sub="Sales excl. GST minus expenses" icon={ChartNoAxesCombined} tone="green"/>
        <StatCard label="Cash in Drawer" value={money(cash)} sub={`Today: UPI ${money(sales.byPayment.UPI||0)} · Card ${money(sales.byPayment.Card||0)}`} icon={Wallet} tone="purple"/>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <DaybookTable rows={rows} title="Recent activity" subtitle="Latest sales, expenses and bank entries"/>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold">Today's collections</h3>
            <p className="mt-1 text-xs text-slate-500">Payment method share of today's sales</p>
            <div className="mt-5 space-y-4">
              {split.length===0
                ? <p className="py-4 text-center text-sm text-slate-400">No sales yet today</p>
                : split.map(([method,amount])=><BarRow key={method} label={method} value={`${pct(amount,sales.gross)}% · ${money(amount)}`} percent={pct(amount,sales.gross)}/>)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold">Money position</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-slate-600"><span className="rounded-lg bg-violet-50 p-1.5 text-violet-600"><PiggyBank size={15}/></span>Bank & pigmy balance</span>
                <b>{money(bankBalance)}</b>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="pl-9 text-slate-500">Pigmy deposits pending</span>
                <b className={pigmyPending>0?'text-rose-600':''}>{money(pigmyPending)}</b>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-slate-600"><span className="rounded-lg bg-blue-50 p-1.5 text-blue-600"><Users size={15}/></span>Salary still to pay (this month)</span>
                <b className={staffDue>0?'text-rose-600':''}>{money(staffDue)}</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}