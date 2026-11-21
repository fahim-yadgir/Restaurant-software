import {useState} from 'react'
import {Plus} from 'lucide-react'
import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import PaidFromSelect from '@/components/pigmy/PaidFromSelect'
import {money} from '@/lib/format'
import {localDate,newId,parsePaidFrom,balancesOf} from '@/lib/pigmy'

export default function ExpensesPage({expenses,setExpenses,accounts=[],entries=[],setEntries}) {
  const [title,setTitle]=useState(''),[amount,setAmount]=useState(''),[category,setCategory]=useState('Purchase'),[paidFrom,setPaidFrom]=useState('mode:Cash'),[error,setError]=useState('')
  const balances=balancesOf(accounts,entries)
  const bankName=id=>accounts.find(a=>a.id===id)?.bankName||'Bank account'

  const submit=e=>{
    e.preventDefault()
    if(!title.trim()||!amount) return
    const n=Number(amount)
    if(!(n>0)) return setError('Enter an amount above 0.')
    const {mode,accountId}=parsePaidFrom(paidFrom)
    if(accountId){
      const acc=accounts.find(a=>a.id===accountId&&a.status!=='Closed')
      if(!acc) return setError('This account is not available. Choose another one.')
      if(n>(balances[accountId]||0)) return setError(`Not enough balance in this account (${money(balances[accountId]||0)}).`)
    }
    const id=newId(), date=localDate()
    setExpenses([{id,date,title:title.trim(),amount:n,category,mode,...(accountId?{accountId}:{})},...expenses])
    // Paying from a bank / pigmy account also reduces that account's balance.
    if(accountId) setEntries(old=>[...old,{id:newId(),accountId,date,type:'withdraw',amount:n,note:`Paid: ${title.trim()}`,source:'expense',sourceId:id}])
    setTitle('');setAmount('');setError('')
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-extrabold">Daily expenses & purchases</h2>
        <p className="mt-1 text-sm text-slate-500">Record shop expenses, supplier purchases, petty cash and salary payouts. Choose a bank / pigmy account in “Paid from” to deduct the amount from it.</p>
      </div>

      <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-5">
        <Field label="Particulars" value={title} onChange={setTitle} placeholder="e.g. Milk purchase"/>
        <Field label="Amount (₹)" type="number" value={amount} onChange={setAmount} placeholder="0"/>
        <label className="space-y-1.5 text-xs font-semibold text-slate-600">Category
          <select value={category} onChange={e=>setCategory(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option>Purchase</option><option>Utilities</option><option>Rent</option><option>Salary</option><option>Other</option></select>
        </label>
        <PaidFromSelect value={paidFrom} onChange={setPaidFrom} accounts={accounts} balances={balances}/>
        <div className="flex items-end"><Button type="submit"><Plus size={15}/> Add entry</Button></div>
        {error&&<p className="form-error md:col-span-5">{error}</p>}
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Date','Particulars','Category','Paid from','Amount'].map(x=><th className="px-5 py-4" key={x}>{x}</th>)}</tr></thead>
          <tbody>
            {expenses.map(x=>(
              <tr key={x.id} className="border-t border-slate-100">
                <td className="px-5 py-4 text-slate-500">{x.date}</td>
                <td className="px-5 py-4 font-semibold">{x.title}</td>
                <td className="px-5 py-4">{x.category}</td>
                <td className="px-5 py-4">{x.accountId?`Bank · ${bankName(x.accountId)}`:x.mode}</td>
                <td className="px-5 py-4 font-bold text-rose-600">{money(x.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}