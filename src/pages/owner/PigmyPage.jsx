import {useState} from 'react'
import {Plus} from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import PigmyForm from '@/components/pigmy/PigmyForm'
import PigmyCard from '@/components/pigmy/PigmyCard'
import PigmyEntryModal from '@/components/pigmy/PigmyEntryModal'
import PigmyHistoryModal from '@/components/pigmy/PigmyHistoryModal'
import {money} from '@/lib/format'
import {summarize,localDate,newId} from '@/lib/pigmy'

export default function PigmyPage({accounts,setAccounts,entries,setEntries}) {
  const [showForm,setShowForm]=useState(false)
  const [editId,setEditId]=useState(null)
  const [entryModal,setEntryModal]=useState(null)   // {accountId,type}
  const [historyId,setHistoryId]=useState(null)

  const sums=Object.fromEntries(accounts.map(a=>[a.id,summarize(a,entries)]))
  const totalInvested=accounts.reduce((s,a)=>s+sums[a.id].balance,0)
  const totalPending=accounts.reduce((s,a)=>s+(a.status==='Closed'?0:sums[a.id].pending),0)
  const activeCount=accounts.filter(a=>sums[a.id].status==='Active').length

  const addEntry=e=>setEntries(old=>[...old,{...e,id:newId()}])

  const addAccount=data=>{setAccounts([...accounts,{...data,id:newId(),status:'Active'}]);setShowForm(false)}
  const saveAccount=data=>{setAccounts(accounts.map(a=>a.id===editId?{...a,...data}:a));setEditId(null)}

  const quickDeposit=a=>addEntry({accountId:a.id,date:localDate(),type:'deposit',amount:Number(a.dailyAmount),note:'Daily pigmy deposit'})

  const toggleClosed=a=>{
    const closing=a.status!=='Closed'
    if(closing&&!window.confirm(`Close the ${a.bankName} account? You can reopen it later.`)) return
    setAccounts(accounts.map(x=>x.id===a.id?{...x,status:closing?'Closed':'Active'}:x))
  }

  const reverse=e=>{
    const acc=accounts.find(a=>a.id===e.accountId)
    if(!acc) return
    if(e.type==='deposit'&&Number(e.amount)>sums[acc.id].balance){
      window.alert('This deposit cannot be reversed because part of it has already been withdrawn.')
      return
    }
    if(!window.confirm(`Reverse this ${e.type} of ${money(e.amount)}? An opposite entry will be added.`)) return
    setEntries(old=>[
      ...old.map(x=>x.id===e.id?{...x,reversed:true}:x),
      {id:newId(),accountId:e.accountId,date:localDate(),type:e.type==='deposit'?'withdraw':'deposit',amount:e.amount,note:`Reversal of ${e.date} entry`,reversalOf:e.id},
    ])
  }

  const modalAccount=entryModal&&accounts.find(a=>a.id===entryModal.accountId)
  const historyAccount=historyId&&accounts.find(a=>a.id===historyId)
  const editAccount=editId&&accounts.find(a=>a.id===editId)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold">Pigmy & investment accounts</h2>
          <p className="mt-1 text-sm text-slate-500">Track daily bank deposits, withdrawals, maturity dates and expected investment.</p>
        </div>
        <Button onClick={()=>{setEditId(null);setShowForm(true)}}><Plus size={15}/> New pigmy account</Button>
      </div>

      {showForm&&(
        <Modal title="New pigmy account" subtitle="Bank, daily amount and account details" size="lg" onClose={()=>setShowForm(false)}>
          <PigmyForm key="new" onSubmit={addAccount} onCancel={()=>setShowForm(false)}/>
        </Modal>
      )}
      {editAccount&&(
        <Modal title="Edit account details" subtitle={editAccount.bankName} size="lg" onClose={()=>setEditId(null)}>
          <PigmyForm key={editAccount.id} initial={editAccount} onSubmit={saveAccount} onCancel={()=>setEditId(null)}/>
        </Modal>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[['Total balance in accounts',money(totalInvested)],['Active accounts',String(activeCount)],['Pending deposits',money(totalPending)]].map(([a,b])=>(
          <div key={a} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm text-slate-500">{a}</div>
            <div className="mt-2 font-display text-2xl font-extrabold">{b}</div>
          </div>
        ))}
      </div>

      {accounts.length===0
        ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">No pigmy accounts yet. Click “New pigmy account” to add one.</div>
        : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {accounts.map(a=>(
              <PigmyCard key={a.id} account={a} sum={sums[a.id]}
                onQuickDeposit={()=>quickDeposit(a)}
                onDeposit={()=>setEntryModal({accountId:a.id,type:'deposit'})}
                onWithdraw={()=>setEntryModal({accountId:a.id,type:'withdraw'})}
                onHistory={()=>setHistoryId(a.id)}
                onEdit={()=>{setShowForm(false);setEditId(a.id)}}
                onToggleClosed={()=>toggleClosed(a)}/>
            ))}
          </div>}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        <b>How it is counted:</b> manual deposits and withdrawals are shown in the Daybook as investment entries and are not expenses. Expenses and staff payments made from an account, and UPI / card sales credited to an account, are linked entries: they change the balance here but appear in the Daybook only once, as an expense or a sale. Linked entries cannot be reversed here. Entries are never deleted; use Reverse in History to correct a manual entry. Only the last 4 digits of the account number are shown on cards.
      </div>

      {modalAccount&&<PigmyEntryModal key={entryModal.type+modalAccount.id} account={modalAccount} type={entryModal.type} balance={sums[modalAccount.id].balance} onSave={e=>{addEntry(e);setEntryModal(null)}} onClose={()=>setEntryModal(null)}/>}
      {historyAccount&&<PigmyHistoryModal account={historyAccount} entries={entries} onReverse={reverse} onClose={()=>setHistoryId(null)}/>}
    </div>
  )
}