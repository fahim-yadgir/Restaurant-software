import Badge from '@/components/ui/Badge'
import {money} from '@/lib/format'

// Money coming in. Everything else is money going out.
const INCOME=['Sale Income','Investment Withdrawal']
const toneOf=t=>t==='Sale Income'?'green':t.startsWith('Investment')?'blue':'orange'

export default function DaybookTable({rows}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="font-bold text-slate-900">Live accounting daybook</h3>
          <p className="mt-1 text-xs text-slate-500">Chronological sales, expense and investment entries</p>
        </div>
        <Badge tone="green">Live ledger</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>{['Time','Particulars / Voucher','Type','Mode','Amount'].map(x=><th key={x} className="px-5 py-3 font-semibold">{x}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>{
              const income=INCOME.includes(r.type)
              return (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-5 py-4 text-slate-500">{r.time}</td>
                  <td className="px-5 py-4 font-semibold text-slate-800">{r.title}</td>
                  <td className="px-5 py-4"><Badge tone={toneOf(r.type)}>{r.type}</Badge></td>
                  <td className="px-5 py-4 text-slate-500">{r.mode}</td>
                  <td className={`px-5 py-4 font-bold ${income?'text-emerald-600':'text-rose-600'}`}>{income?'+':'−'}{money(r.amount)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}