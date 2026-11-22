import {useState} from 'react'
import {money} from '@/lib/format'
import {summarize} from '@/lib/pigmy'
import BarRow from '@/components/dashboard/BarRow'
import {PERIODS,periodRange,inRange,summarizeBills,summarizeExpenses,monthlySeries,compactMoney,pct} from '@/lib/stats'

const card='rounded-2xl border border-slate-200 bg-white p-5'
const empty=(text)=><p className="py-6 text-center text-sm text-slate-400">{text}</p>

export default function ReportsPage({bills,expenses,pigmy=[],pigmyEntries=[]}) {
  const [period,setPeriod]=useState('month')
  const label=PERIODS.find(p=>p[0]===period)[1]
  const range=periodRange(period)

  const fBills=bills.filter(b=>inRange(b.date,range))
  const fExp=expenses.filter(e=>inRange(e.date,range))
  const sales=summarizeBills(fBills)
  const spent=summarizeExpenses(fExp)
  const profit=sales.taxable-spent.total               // sales excluding GST minus expenses
  const undated=bills.filter(b=>!b.date).length

  const series=monthlySeries(bills,expenses,6)
  const chartMax=Math.max(0,...series.flatMap(m=>[m.sales,m.expenses]))
  const bar=v=>chartMax>0?Math.max(v>0?2:0,(v/chartMax)*100):0

  const slabs=Object.entries(sales.bySlab).map(([rate,v])=>({rate:Number(rate),...v})).sort((a,b)=>a.rate-b.rate)
  const payments=Object.entries(sales.byPayment).sort((a,b)=>b[1]-a[1])
  const categories=Object.entries(spent.byCategory).sort((a,b)=>b[1]-a[1])
  const topItems=Object.values(sales.items).sort((a,b)=>b.amount-a.amount).slice(0,5)

  const sums=pigmy.map(a=>summarize(a,pigmyEntries))
  const bankBalance=sums.reduce((t,s)=>t+s.balance,0)
  const paidFromAccounts=fExp.filter(e=>e.accountId).reduce((t,e)=>t+Number(e.amount||0),0)
  const receivedInAccounts=fBills.filter(b=>b.accountId).reduce((t,b)=>t+Number(b.total||0),0)

  const exportCsv=()=>{
    const rows=[
      ['Report period',label],[],
      ['Summary','Amount'],['Bills',sales.count],['Gross sales (incl. GST)',sales.gross],['Sales excl. GST',sales.taxable],['Discounts given',sales.discount],['Total expenses',spent.total],['Net operating profit',profit],[],
      ['GST slab','Taxable value','CGST','SGST','Total GST'],...slabs.map(s=>[`${s.rate}%`,s.taxable.toFixed(2),(s.tax/2).toFixed(2),(s.tax/2).toFixed(2),s.tax.toFixed(2)]),[],
      ['Payment method','Amount'],...payments,[],
      ['Expense category','Amount'],...categories,[],
      ['Dish','Qty sold','Sales'],...Object.values(sales.items).sort((a,b)=>b.amount-a.amount).map(d=>[d.name,d.qty,d.amount]),
    ]
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const a=document.createElement('a')
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download=`restrodesk-report-${period}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold">Sales analytics, P&L & GST</h2>
          <p className="mt-1 text-sm text-slate-500">Calculated from your saved bills, expenses, staff payments and bank entries.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={period} onChange={e=>setPeriod(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold">
            {PERIODS.map(([k,l])=><option key={k} value={k}>{l}</option>)}
          </select>
          <button onClick={exportCsv} className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white">Export CA CSV</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Gross sales (incl. GST)',money(sales.gross),`${sales.count} bill${sales.count===1?'':'s'}`,''],
          ['Sales excl. GST',money(sales.taxable),`Discounts given ${money(sales.discount)}`,''],
          ['Expenses & purchases',money(spent.total),`${spent.count} entr${spent.count===1?'y':'ies'}`,''],
          ['Net operating profit',money(profit),'Sales excl. GST minus expenses',profit<0?'text-rose-600':'text-emerald-600'],
        ].map(([a,b,c,tone])=>(
          <div key={a} className={card}>
            <div className="text-sm text-slate-500">{a}</div>
            <div className={`mt-3 font-display text-2xl font-extrabold ${tone}`}>{b}</div>
            <div className="mt-1 text-xs text-slate-500">{c}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className={card}>
          <h3 className="font-bold">Monthly sales vs expenses</h3>
          <p className="mt-1 text-xs text-slate-500">Last 6 months · sales excl. GST</p>
          {chartMax===0?empty('No sales or expenses in the last 6 months'):(
            <>
              <div className="mt-5 flex justify-around gap-2 border-b border-slate-200 pb-1">
                {series.map(m=>(
                  <div key={m.key} className="flex flex-1 items-end justify-center gap-1">
                    <div className="flex h-44 items-end gap-1">
                      <div title={`Sales ${money(m.sales)}`} style={{height:`${bar(m.sales)}%`}} className="w-4 rounded-t-md bg-orange-500 sm:w-6"/>
                      <div title={`Expenses ${money(m.expenses)}`} style={{height:`${bar(m.expenses)}%`}} className="w-4 rounded-t-md bg-slate-300 sm:w-6"/>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-around gap-2 text-center">
                {series.map(m=>(
                  <div key={m.key} className="flex-1 text-[11px] text-slate-500">
                    <div className="font-semibold text-slate-700">{m.label}</div>
                    <div>{compactMoney(m.sales)}</div>
                    <div className="text-slate-400">{compactMoney(m.expenses)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-4 text-xs text-slate-500"><span><span className="text-orange-500">■</span> Sales (top value)</span><span><span className="text-slate-300">■</span> Expenses (lower value)</span></div>
            </>
          )}
        </div>

        <div className={card}>
          <h3 className="font-bold">GST & payment summary</h3>
          <p className="mt-1 text-xs text-slate-500">{label}</p>
          <div className="mt-4 space-y-3 text-sm">
            {[['GST collected (CGST + SGST)',sales.gst],['CGST',sales.gst/2],['SGST',sales.gst/2],['Taxable sales value',sales.taxable]].map(([a,b])=>(
              <div key={a} className="flex justify-between border-b border-slate-100 pb-3"><span className="text-slate-500">{a}</span><b>{money(b)}</b></div>
            ))}
          </div>
          <div className="mt-5 space-y-4">
            {payments.length===0?empty('No sales in this period'):payments.map(([m,v])=><BarRow key={m} label={m} value={`${pct(v,sales.gross)}% · ${money(v)}`} percent={pct(v,sales.gross)}/>)}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className={card}>
          <h3 className="font-bold">GST by slab</h3>
          <p className="mt-1 text-xs text-slate-500">Uses the GST rate set on each menu item, including custom rates</p>
          {slabs.length===0?empty('No sales in this period'):(
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-xs text-slate-500"><tr>{['Slab','Taxable value','CGST','SGST','Total GST'].map(h=><th key={h} className="pb-2 font-semibold">{h}</th>)}</tr></thead>
                <tbody>
                  {slabs.map(s=>(
                    <tr key={s.rate} className="border-t border-slate-100">
                      <td className="py-2.5 font-semibold">{s.rate}%</td><td>{money(s.taxable)}</td><td>{money(s.tax/2)}</td><td>{money(s.tax/2)}</td><td className="font-bold">{money(s.tax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={card}>
          <h3 className="font-bold">Expenses by category</h3>
          <p className="mt-1 text-xs text-slate-500">Includes salary and advances paid from the Staff page</p>
          <div className="mt-5 space-y-4">
            {categories.length===0?empty('No expenses in this period'):categories.map(([c,v])=><BarRow key={c} label={c} value={`${pct(v,spent.total)}% · ${money(v)}`} percent={pct(v,spent.total)} color="bg-slate-400"/>)}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className={card}>
          <h3 className="font-bold">Top selling dishes</h3>
          <p className="mt-1 text-xs text-slate-500">By sales value · {label}</p>
          <div className="mt-4 space-y-3">
            {topItems.length===0?empty('No dishes sold in this period'):topItems.map((d,i)=>(
              <div key={d.name} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 text-sm">
                <span className="truncate"><b className="mr-2 text-slate-400">{i+1}</b>{d.name}</span>
                <span className="shrink-0 text-right"><b>{money(d.amount)}</b><span className="ml-2 text-xs text-slate-500">× {d.qty}</span></span>
              </div>
            ))}
          </div>
        </div>

        <div className={card}>
          <h3 className="font-bold">Bank & pigmy accounts</h3>
          <p className="mt-1 text-xs text-slate-500">Balances as of now · money moved in {label.toLowerCase()}</p>
          <div className="mt-4 space-y-3">
            {pigmy.length===0?empty('No bank / pigmy accounts added'):sums.map((s,i)=>(
              <div key={pigmy[i].id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 text-sm">
                <span className="truncate">{pigmy[i].bankName}<span className="ml-2 text-xs text-slate-500">{s.status}{s.pending>0?` · pending ${money(s.pending)}`:''}</span></span>
                <b className="shrink-0">{money(s.balance)}</b>
              </div>
            ))}
            {pigmy.length>0&&<>
              <div className="flex justify-between text-sm font-bold"><span>Total balance</span><span>{money(bankBalance)}</span></div>
              <div className="flex justify-between text-xs text-slate-500"><span>Sales received into accounts</span><span>{money(receivedInAccounts)}</span></div>
              <div className="flex justify-between text-xs text-slate-500"><span>Expenses & salary paid from accounts</span><span>{money(paidFromAccounts)}</span></div>
            </>}
          </div>
        </div>
      </div>

      <p className="text-xs leading-5 text-slate-500">
        Net operating profit = sales excluding GST − expenses (GST collected is money owed to the government, so it is not counted as income). Pigmy and bank deposits and withdrawals are not expenses. Verify tax figures with your CA before filing.
        {period!=='all'&&undated>0&&` ${undated} older bill${undated===1?'':'s'} saved without a date appear only under “All time”.`}
      </p>
    </div>
  )
}