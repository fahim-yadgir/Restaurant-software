import {useState} from 'react'
import {Plus} from 'lucide-react'
import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import PaidFromSelect from '@/components/pigmy/PaidFromSelect'
import {money} from '@/lib/format'
import {localDate,parsePaidFrom} from '@/lib/pigmy'

const CATEGORIES=['Purchase','Utilities','Rent','Salary','Maintenance','Other']

// Add expense. Shown inside a popup.
export default function ExpenseForm({accounts,balances,onAdd,onCancel}) {
  const [title,setTitle]=useState('')
  const [amount,setAmount]=useState('')
  const [category,setCategory]=useState('Purchase')
  const [date,setDate]=useState(localDate())
  const [paidFrom,setPaidFrom]=useState('mode:Cash')
  const [error,setError]=useState('')

  const submit=e=>{
    e.preventDefault()
    if(!title.trim()) return setError('Enter what the expense is for.')
    const n=Number(amount)
    if(!(n>0)) return setError('Enter an amount above 0.')
    if(!date) return setError('Choose a date.')
    const {accountId}=parsePaidFrom(paidFrom)
    if(accountId){
      if(!accounts.some(a=>a.id===accountId&&a.status!=='Closed')) return setError('This account is not available. Choose another one.')
      if(n>(balances[accountId]||0)) return setError(`Not enough balance in this account (${money(balances[accountId]||0)}).`)
    }
    onAdd({title:title.trim(),amount:n,category,date,paidFrom})
  }

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2"><Field label="Particulars" value={title} onChange={setTitle} placeholder="e.g. Milk purchase" autoFocus/></div>
      <Field label="Amount (₹)" type="number" min="0" value={amount} onChange={setAmount} placeholder="0"/>
      <Field label="Date" type="date" value={date} onChange={setDate}/>
      <label className="space-y-1.5 text-xs font-semibold text-slate-600">Category
        <select value={category} onChange={e=>setCategory(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          {CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
      </label>
      <PaidFromSelect value={paidFrom} onChange={setPaidFrom} accounts={accounts} balances={balances}/>
      {error&&<p className="form-error md:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 md:col-span-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit"><Plus size={15}/> Add expense</Button>
      </div>
    </form>
  )
}