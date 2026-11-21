import {useState} from 'react'
import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import {money} from '@/lib/format'
import {localDate} from '@/lib/pigmy'

// type: 'deposit' | 'withdraw'
export default function PigmyEntryModal({account,type,balance,onSave,onClose}) {
  const isDeposit=type==='deposit'
  const [date,setDate]=useState(localDate())
  const [amount,setAmount]=useState(isDeposit?String(account.dailyAmount||''):'')
  const [note,setNote]=useState('')
  const [error,setError]=useState('')

  const submit=e=>{
    e.preventDefault()
    const n=Number(amount)
    if(!date) return setError('Choose a date.')
    if(!(n>0)) return setError('Enter an amount above 0.')
    if(!isDeposit&&n>balance) return setError(`Withdrawal cannot be more than the balance (${money(balance)}).`)
    onSave({accountId:account.id,date,type,amount:n,note:note.trim()})
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
        <div>
          <h3 className="text-lg font-extrabold">{isDeposit?'Deposit money':'Withdraw money'}</h3>
          <p className="mt-1 text-xs text-slate-500">{account.bankName}{account.accountName?` · ${account.accountName}`:''} · Balance {money(balance)}</p>
        </div>
        <Field label="Date" type="date" value={date} onChange={setDate}/>
        <div>
          <Field label="Amount (₹)" type="number" min="0" value={amount} onChange={setAmount} placeholder="0"/>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
            {isDeposit&&account.dailyAmount>0&&<button type="button" onClick={()=>setAmount(String(account.dailyAmount))} className="rounded-lg border border-orange-200 px-2.5 py-1 text-orange-700 hover:bg-orange-50">Daily amount {money(account.dailyAmount)}</button>}
            {!isDeposit&&balance>0&&<button type="button" onClick={()=>setAmount(String(balance))} className="rounded-lg border border-orange-200 px-2.5 py-1 text-orange-700 hover:bg-orange-50">Full balance {money(balance)}</button>}
          </div>
        </div>
        <Field label="Note (optional)" value={note} onChange={setNote} placeholder={isDeposit?'e.g. Extra deposit':'e.g. Cash needed for supplier'}/>
        {error&&<p className="form-error">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">{isDeposit?'Save deposit':'Save withdrawal'}</Button>
        </div>
      </form>
    </div>
  )
}