import {useState} from 'react'
import {Plus,Check} from 'lucide-react'
import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import PaidFromSelect from '@/components/pigmy/PaidFromSelect'
import {money} from '@/lib/format'
import {localDate,parsePaidFrom} from '@/lib/pigmy'

const CATEGORIES=['Purchase','Utilities','Rent','Salary','Maintenance','Other']

// Add or edit an expense. Shown inside a popup.
// Pass initialExpense to edit; onSave receives {title,amount,category,date,paidFrom}.
export default function ExpenseForm({accounts,balances,initialExpense=null,onSave,onCancel}) {
  const editing=!!initialExpense
  const [title,setTitle]=useState(initialExpense?.title||'')
  const [amount,setAmount]=useState(editing?String(initialExpense.amount):'')
  const [category,setCategory]=useState(initialExpense?.category||'Purchase')
  const [date,setDate]=useState(initialExpense?.date||localDate())
  const [paidFrom,setPaidFrom]=useState(
    editing?(initialExpense.accountId?`acc:${initialExpense.accountId}`:`mode:${initialExpense.mode||'Cash'}`):'mode:Cash'
  )
  const [error,setError]=useState('')

  // While editing, the old amount is given back to its account before the new amount is checked.
  const available=id=>(balances[id]||0)+(initialExpense?.accountId===id?Number(initialExpense.amount)||0:0)
  const shownBalances=initialExpense?.accountId?{...balances,[initialExpense.accountId]:available(initialExpense.accountId)}:balances
  const categories=CATEGORIES.includes(category)?CATEGORIES:[...CATEGORIES,category]

  const submit=e=>{
    e.preventDefault()
    if(!title.trim()) return setError('Enter what the expense is for.')
    const n=Number(amount)
    if(!(n>0)) return setError('Enter an amount above 0.')
    if(!date) return setError('Choose a date.')
    const {accountId}=parsePaidFrom(paidFrom)
    if(accountId){
      if(!accounts.some(a=>a.id===accountId&&a.status!=='Closed')) return setError('This account is not available. Choose another one.')
      if(n>available(accountId)) return setError(`Not enough balance in this account (${money(available(accountId))}).`)
    }
    onSave({title:title.trim(),amount:n,category,date,paidFrom})
  }

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2"><Field label="Particulars" value={title} onChange={setTitle} placeholder="e.g. Milk purchase" autoFocus/></div>
      <Field label="Amount (₹)" type="number" min="0" value={amount} onChange={setAmount} placeholder="0"/>
      <Field label="Date" type="date" value={date} onChange={setDate}/>
      <label className="space-y-1.5 text-xs font-semibold text-slate-600">Category
        <select value={category} onChange={e=>setCategory(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          {categories.map(c=><option key={c}>{c}</option>)}
        </select>
      </label>
      <PaidFromSelect value={paidFrom} onChange={setPaidFrom} accounts={accounts} balances={shownBalances}/>
      {initialExpense?.staffId&&<p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 md:col-span-2">This is a staff payment. Changing the amount or date also changes that staff member's paid / remaining salary.</p>}
      {error&&<p className="form-error md:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 md:col-span-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{editing?<><Check size={15}/> Update expense</>:<><Plus size={15}/> Add expense</>}</Button>
      </div>
    </form>
  )
}