import {useState} from 'react'
import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import PaidFromSelect from '@/components/pigmy/PaidFromSelect'
import {money} from '@/lib/format'
import {localDate,parsePaidFrom} from '@/lib/pigmy'

// Salary / advance payment for one staff member. Shown inside a popup.
export default function StaffPaymentForm({defaultType='Salary',remaining,accounts,balances,onPay,onCancel}) {
  const [type,setType]=useState(defaultType)
  const [amount,setAmount]=useState('')
  const [date,setDate]=useState(localDate())
  const [paidFrom,setPaidFrom]=useState('mode:Cash')
  const [note,setNote]=useState('')
  const [error,setError]=useState('')

  const submit=e=>{
    e.preventDefault()
    const n=Number(amount)
    if(!(n>0)) return setError('Enter an amount above 0.')
    if(!date) return setError('Choose a date.')
    const {accountId}=parsePaidFrom(paidFrom)
    if(accountId&&n>(balances[accountId]||0)) return setError(`Not enough balance in this account (${money(balances[accountId]||0)}).`)
    onPay({type,amount:n,date,paidFrom,note:note.trim()})
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5 text-xs font-semibold text-slate-600">Payment type
          <select value={type} onChange={e=>setType(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
            <option>Salary</option><option>Advance</option>
          </select>
        </label>
        <Field label="Date" type="date" value={date} onChange={setDate}/>
      </div>
      <div>
        <Field label="Amount (₹)" type="number" min="0" value={amount} onChange={setAmount} placeholder="0" autoFocus/>
        {remaining>0&&<button type="button" onClick={()=>setAmount(String(remaining))} className="mt-1.5 text-[11px] font-bold text-orange-600">Use remaining {money(remaining)}</button>}
      </div>
      <PaidFromSelect value={paidFrom} onChange={setPaidFrom} accounts={accounts} balances={balances}/>
      <Field label="Note (optional)" value={note} onChange={setNote} placeholder="e.g. Diwali advance"/>
      {error&&<p className="form-error">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save payment</Button>
      </div>
    </form>
  )
}