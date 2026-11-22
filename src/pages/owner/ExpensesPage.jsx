import {useState} from 'react'
import {Plus} from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ExpenseForm from '@/components/expenses/ExpenseForm'
import {money} from '@/lib/format'
import {newId,parsePaidFrom,balancesOf} from '@/lib/pigmy'

export default function ExpensesPage({expenses,setExpenses,accounts=[],entries=[],setEntries}) {
  const [adding,setAdding]=useState(false)
  const balances=balancesOf(accounts,entries)
  const bankName=id=>accounts.find(a=>a.id===id)?.bankName||'Bank account'
  const sorted=[...expenses].sort((a,b)=>String(b.date).localeCompare(String(a.date)))

  const add=({title,amount,category,date,paidFrom})=>{
    const {mode,accountId}=parsePaidFrom(paidFrom)
    const id=newId()
    setExpenses([{id,date,title,amount,category,mode,...(accountId?{accountId}:{})},...expenses])
    // Paying from a bank / pigmy account also reduces that account's balance.
    if(accountId) setEntries(old=>[...old,{id:newId(),accountId,date,type:'withdraw',amount,note:`Paid: ${title}`,source:'expense',sourceId:id}])
    setAdding(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold">Daily expenses & purchases</h2>
          <p className="mt-1 text-sm text-slate-500">Record shop expenses, supplier purchases, petty cash and salary payouts. Choose a bank / pigmy account in “Paid from” to deduct the amount from it.</p>
        </div>
        <Button onClick={()=>setAdding(true)}><Plus size={15}/> Add expense</Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Date','Particulars','Category','Paid from','Amount'].map(x=><th className="px-5 py-4" key={x}>{x}</th>)}</tr></thead>
          <tbody>
            {sorted.length===0&&<tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No expenses yet. Click “Add expense” to record one.</td></tr>}
            {sorted.map(x=>(
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

      {adding&&(
        <Modal title="Add expense" subtitle="Purchases, bills and other shop expenses" onClose={()=>setAdding(false)}>
          <ExpenseForm accounts={accounts} balances={balances} onAdd={add} onCancel={()=>setAdding(false)}/>
        </Modal>
      )}
    </div>
  )
}