import {useState} from 'react'
import {Plus,Save} from 'lucide-react'
import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import {money} from '@/lib/format'
import {suggestExpected} from '@/lib/pigmy'

// Used for both "Add pigmy account" and "Edit details".
export default function PigmyForm({initial,onSubmit,onCancel}) {
  const editing=!!initial
  const [bankName,setBankName]=useState(initial?.bankName||'')
  const [dailyAmount,setDailyAmount]=useState(initial?.dailyAmount!=null?String(initial.dailyAmount):'')
  const [note,setNote]=useState(initial?.note||'')
  const [accountName,setAccountName]=useState(initial?.accountName||'')
  const [accountNumber,setAccountNumber]=useState(initial?.accountNumber||'')
  const [startDate,setStartDate]=useState(initial?.startDate||'')
  const [expireDate,setExpireDate]=useState(initial?.expireDate||'')
  const [expectedAmount,setExpectedAmount]=useState(initial?.expectedAmount?String(initial.expectedAmount):'')
  const [error,setError]=useState('')

  const suggested=suggestExpected(dailyAmount,startDate,expireDate)

  const submit=e=>{
    e.preventDefault()
    if(!bankName.trim()) return setError('Enter the bank name.')
    if(!(Number(dailyAmount)>0)) return setError('Enter a daily payment amount above 0.')
    if(startDate&&expireDate&&expireDate<startDate) return setError('Expire date cannot be before the start date.')
    if(expectedAmount!==''&&!(Number(expectedAmount)>=0)) return setError('Expected investment amount is not valid.')
    onSubmit({
      bankName:bankName.trim(),
      dailyAmount:Number(dailyAmount),
      note:note.trim(),
      accountName:accountName.trim(),
      accountNumber:accountNumber.trim(),
      startDate,
      expireDate,
      expectedAmount:expectedAmount===''?0:Number(expectedAmount),
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <div>
        <div className="mb-3 text-sm font-bold">{editing?'Edit pigmy account':'New pigmy account'}</div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Bank name *" value={bankName} onChange={setBankName} placeholder="e.g. State Bank of India"/>
          <Field label="Daily payment amount (₹) *" type="number" min="0" value={dailyAmount} onChange={setDailyAmount} placeholder="500"/>
          <Field label="Note" value={note} onChange={setNote} placeholder="e.g. Collected by agent Suresh"/>
        </div>
      </div>

      <div className="border-t border-dashed border-slate-200 pt-4">
        <div className="mb-3 text-sm font-bold">Account details <span className="text-xs font-medium text-slate-400">(optional, can be filled later)</span></div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Account name" value={accountName} onChange={setAccountName} placeholder="Name on the account"/>
          <Field label="Account number" value={accountNumber} onChange={setAccountNumber} placeholder="Account number"/>
          <Field label="Expected investment amount (₹)" type="number" min="0" value={expectedAmount} onChange={setExpectedAmount} placeholder="182500"/>
          <Field label="Start date" type="date" value={startDate} onChange={setStartDate}/>
          <Field label="Expire date" type="date" value={expireDate} onChange={setExpireDate}/>
          <div className="flex items-end pb-1 text-xs text-slate-500">
            {suggested>0&&Number(expectedAmount)!==suggested
              ? <span>Daily amount × days = <b>{money(suggested)}</b> <button type="button" onClick={()=>setExpectedAmount(String(suggested))} className="ml-1 font-bold text-orange-600">Use this</button></span>
              : <span>Add daily amount and both dates to get a suggested total.</span>}
          </div>
        </div>
      </div>

      {error&&<p className="form-error">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit">{editing?<><Save size={15}/> Save changes</>:<><Plus size={15}/> Add account</>}</Button>
        {onCancel&&<Button variant="secondary" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  )
}