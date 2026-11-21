import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import {money} from '@/lib/format'

const SOURCE_LABEL={expense:'EXPENSE / SALARY',bill:'SALE'}

// Entries are never deleted. A wrong manual entry is fixed with "Reverse", which adds an opposite entry.
// Entries linked to an expense, staff payment or sale belong to that record and cannot be reversed here.
export default function PigmyHistoryModal({account,entries,onReverse,onClose}) {
  const mine=entries.filter(e=>e.accountId===account.id)
  let running=0
  const rows=[...mine].sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(e=>{
    running+=e.type==='deposit'?Number(e.amount):-Number(e.amount)
    return {...e,running}
  }).reverse()

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold">Transaction history</h3>
            <p className="mt-1 text-xs text-slate-500">{account.bankName}{account.accountName?` · ${account.accountName}`:''}</p>
          </div>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>

        <div className="overflow-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>{['Date','Type','Amount','Note','Balance',''].map(h=><th key={h} className="px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.length===0&&<tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No transactions yet</td></tr>}
              {rows.map(e=>(
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-500">{e.date}</td>
                  <td className="px-4 py-3">
                    <Badge tone={e.type==='deposit'?'green':'orange'}>{e.type==='deposit'?'Deposit':'Withdraw'}</Badge>
                    {e.source&&<span className="ml-1.5 text-[10px] font-bold text-blue-500">{SOURCE_LABEL[e.source]||'LINKED'}</span>}
                    {e.reversalOf&&<span className="ml-1.5 text-[10px] font-bold text-slate-400">REVERSAL</span>}
                    {e.reversed&&<span className="ml-1.5 text-[10px] font-bold text-slate-400">REVERSED</span>}
                  </td>
                  <td className={`px-4 py-3 font-bold ${e.type==='deposit'?'text-emerald-600':'text-rose-600'}`}>{e.type==='deposit'?'+':'−'}{money(e.amount)}</td>
                  <td className="px-4 py-3 text-slate-500">{e.note||'—'}</td>
                  <td className="px-4 py-3 font-semibold">{money(e.running)}</td>
                  <td className="px-4 py-3 text-right">
                    {!e.reversalOf&&!e.reversed&&!e.source&&<button type="button" onClick={()=>onReverse(e)} className="text-xs font-bold text-orange-600">Reverse</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-slate-400">Entries are never deleted. Use Reverse to correct a manual deposit or withdrawal. Entries tagged EXPENSE / SALARY or SALE come from the Expenses, Staff or Billing pages.</p>
      </div>
    </div>
  )
}