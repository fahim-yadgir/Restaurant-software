import {money} from '@/lib/format'

export const MODES=['Cash','UPI','Card','Bank']

// One dropdown for "where did the money come from": counter cash / UPI / card, or a bank / pigmy account.
// value: 'mode:Cash' | 'acc:<accountId>'
export default function PaidFromSelect({label='Paid from',value,onChange,accounts=[],balances={},modes=MODES}) {
  const open=accounts.filter(a=>a.status!=='Closed')
  return (
    <label className="space-y-1.5 text-xs font-semibold text-slate-600">{label}
      <select value={value} onChange={e=>onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
        <optgroup label="Counter / other">
          {modes.map(m=><option key={m} value={`mode:${m}`}>{m}</option>)}
        </optgroup>
        {open.length>0&&<optgroup label="Bank / pigmy account">
          {open.map(a=><option key={a.id} value={`acc:${a.id}`}>{a.bankName}{a.accountName?` · ${a.accountName}`:''} (balance {money(balances[a.id]||0)})</option>)}
        </optgroup>}
      </select>
    </label>
  )
}