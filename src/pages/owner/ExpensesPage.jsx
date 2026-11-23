import {useState} from 'react'
import {Plus,Pencil,Trash2} from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ExpenseForm from '@/components/expenses/ExpenseForm'
import {money} from '@/lib/format'
import {notifyConfirm} from '@/lib/toast'
import {newId,parsePaidFrom,balancesOf} from '@/lib/pigmy'

export default function ExpensesPage({expenses,setExpenses,accounts=[],entries=[],setEntries}) {
  const [adding,setAdding]=useState(false)
  const [editing,setEditing]=useState(null)
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

  // Edit: update the expense and keep its linked bank / pigmy entry in step.
  const save=({title,amount,category,date,paidFrom})=>{
    const old=editing
    const {mode,accountId}=parsePaidFrom(paidFrom)
    const updated={...old,title,amount,category,date,mode}
    if(accountId) updated.accountId=accountId; else delete updated.accountId
    // setExpenses returns false when the change was blocked (for example, offline).
    if(setExpenses(expenses.map(x=>x.id===old.id?updated:x))===false) return
    setEntries(list=>{
      const linked=list.find(e=>e.source==='expense'&&e.sourceId===old.id)
      const rest=list.filter(e=>e!==linked)
      if(!accountId) return rest
      const note=old.staffId&&linked?.note?linked.note:`Paid: ${title}`
      return [...rest,{id:linked?.id||newId(),accountId,date,type:'withdraw',amount,note,source:'expense',sourceId:old.id}]
    })
    setEditing(null)
  }

  // Delete: remove the expense and give the amount back to its bank / pigmy account.
  const remove=async x=>{
    const extra=[
      x.accountId?`The ${money(x.amount)} will be added back to ${bankName(x.accountId)}.`:'',
      x.staffId?'This is a staff payment, so that staff member\'s paid / remaining salary will change.':'',
    ].filter(Boolean).join(' ')
    const ok=await notifyConfirm(`Delete "${x.title}" (${money(x.amount)})? ${extra}`.trim(),'Delete expense?')
    if(!ok) return
    if(setExpenses(expenses.filter(e=>e.id!==x.id))===false) return
    if(x.accountId) setEntries(list=>list.filter(e=>!(e.source==='expense'&&e.sourceId===x.id)))
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
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Date','Particulars','Category','Paid from','Amount','Actions'].map(x=><th className="px-5 py-4" key={x}>{x}</th>)}</tr></thead>
          <tbody>
            {sorted.length===0&&<tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No expenses yet. Click “Add expense” to record one.</td></tr>}
            {sorted.map(x=>(
              <tr key={x.id} className="border-t border-slate-100">
                <td className="px-5 py-4 text-slate-500">{x.date}</td>
                <td className="px-5 py-4 font-semibold">{x.title}{x.staffId&&<div className="text-xs font-normal text-slate-400">Staff payment</div>}</td>
                <td className="px-5 py-4">{x.category}</td>
                <td className="px-5 py-4">{x.accountId?`Bank · ${bankName(x.accountId)}`:x.mode}</td>
                <td className="px-5 py-4 font-bold text-rose-600">{money(x.amount)}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={()=>setEditing(x)} className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold text-indigo-600 hover:text-indigo-800"><Pencil size={13}/> Edit</button>
                    <button type="button" onClick={()=>remove(x)} className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold text-rose-600 hover:text-rose-700"><Trash2 size={13}/> Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding&&(
        <Modal title="Add expense" subtitle="Purchases, bills and other shop expenses" onClose={()=>setAdding(false)}>
          <ExpenseForm accounts={accounts} balances={balances} onSave={add} onCancel={()=>setAdding(false)}/>
        </Modal>
      )}

      {editing&&(
        <Modal title="Edit expense" subtitle={editing.title} onClose={()=>setEditing(null)}>
          <ExpenseForm key={editing.id} accounts={accounts} balances={balances} initialExpense={editing} onSave={save} onCancel={()=>setEditing(null)}/>
        </Modal>
      )}
    </div>
  )
}