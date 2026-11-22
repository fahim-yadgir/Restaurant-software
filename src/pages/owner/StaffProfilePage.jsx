import {useState} from 'react'
import {ArrowLeft,Pencil,Banknote,HandCoins,Phone,CalendarDays} from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import StaffForm from '@/components/staff/StaffForm'
import StaffPaymentForm from '@/components/staff/StaffPaymentForm'
import {money} from '@/lib/format'
import {newId,parsePaidFrom,balancesOf} from '@/lib/pigmy'
import {staffLedger,fmtDay,monthLabel,initials} from '@/lib/staff'

const card='rounded-2xl border border-slate-200 bg-white p-5'

// One staff member's profile + manage page: summary, pay salary / advance, month-wise and full payment history.
export default function StaffProfilePage({member,expenses,setExpenses,accounts=[],entries=[],setEntries,onBack,onUpdate}) {
  const [payType,setPayType]=useState(null)     // 'Salary' | 'Advance' | null
  const [editing,setEditing]=useState(false)
  const balances=balancesOf(accounts,entries)
  const bankName=id=>accounts.find(a=>a.id===id)?.bankName||'Bank account'
  const l=staffLedger(member,expenses)

  // Saved as an expense (category Salary) linked to this staff member; paying from an account also reduces its balance.
  const pay=({type,amount,paidFrom,date,note})=>{
    const {mode,accountId}=parsePaidFrom(paidFrom)
    const id=newId()
    setExpenses([{id,date,title:`${type} – ${member.name}`,amount,category:'Salary',mode,staffId:member.id,payType:type,note,...(accountId?{accountId}:{})},...expenses])
    if(accountId) setEntries(old=>[...old,{id:newId(),accountId,date,type:'withdraw',amount,note:`${type} paid to ${member.name}`,source:'expense',sourceId:id}])
    setPayType(null)
  }

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-orange-600"><ArrowLeft size={16}/> All staff</button>

      <div className={`${card} flex flex-wrap items-center justify-between gap-4`}>
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-orange-50 text-lg font-extrabold text-orange-600">{initials(member.name)}</div>
          <div>
            <h2 className="font-display text-xl font-extrabold">{member.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <Badge tone="blue">{member.role}</Badge>
              <span className="inline-flex items-center gap-1"><Phone size={12}/>{member.mobile||'Mobile not added'}</span>
              <span className="inline-flex items-center gap-1"><CalendarDays size={12}/>Joined {fmtDay(member.joinedOn)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={()=>setEditing(true)}><Pencil size={14}/> Edit details</Button>
          <Button variant="secondary" onClick={()=>setPayType('Advance')}><HandCoins size={15}/> Give advance</Button>
          <Button onClick={()=>setPayType('Salary')}><Banknote size={15}/> Pay salary</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Monthly salary',money(l.salary),'Fixed salary',''],
          ['Carry-forward',l.carry>0?`−${money(l.carry)}`:'—','Extra paid last month, deducted now',l.carry>0?'text-rose-600':''],
          [`Paid in ${monthLabel(l.month)}`,money(l.paid),`Payable this month ${money(l.due)}`,''],
          ['Remaining this month',money(l.remaining),l.excess>0?`Paid extra ${money(l.excess)} · deducted next month`:'Still to pay',l.remaining>0?'text-rose-600':'text-emerald-600'],
        ].map(([a,b,c,tone])=>(
          <div key={a} className={card}>
            <div className="text-sm text-slate-500">{a}</div>
            <div className={`mt-2 font-display text-2xl font-extrabold ${tone}`}>{b}</div>
            <div className="mt-1 text-xs text-slate-500">{c}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        <div className={card}>
          <h3 className="font-bold">Month-wise summary</h3>
          <p className="mt-1 text-xs text-slate-500">Total paid compared with the monthly salary</p>
          <div className="mt-4 space-y-3">
            {l.months.length===0
              ? <p className="py-6 text-center text-sm text-slate-400">No payments yet</p>
              : l.months.map(m=>{
                  const diff=l.salary-m.paid
                  return (
                    <div key={m.month} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 text-sm">
                      <div><div className="font-semibold">{monthLabel(m.month)}</div><div className="text-xs text-slate-500">Paid {money(m.paid)}</div></div>
                      <span className={`text-xs font-bold ${diff>0?'text-rose-600':'text-emerald-600'}`}>{diff>0?`Short ${money(diff)}`:diff<0?`Extra ${money(-diff)}`:'Settled'}</span>
                    </div>
                  )
                })}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold">Payment history</h3>
            <p className="mt-1 text-xs text-slate-500">Every salary and advance paid to {member.name}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Date','Type','Paid from','Note','Amount'].map(h=><th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {l.history.length===0&&<tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No payments yet. Use “Pay salary” or “Give advance”.</td></tr>}
                {l.history.map(x=>(
                  <tr key={x.id} className="border-t border-slate-100">
                    <td className="whitespace-nowrap px-5 py-3 text-slate-500">{fmtDay(x.date)}</td>
                    <td className="px-5 py-3"><Badge tone={x.payType==='Advance'?'orange':'green'}>{x.payType||'Payment'}</Badge></td>
                    <td className="px-5 py-3 text-slate-500">{x.accountId?`Bank · ${bankName(x.accountId)}`:x.mode}</td>
                    <td className="px-5 py-3 text-slate-500">{x.note||'—'}</td>
                    <td className="px-5 py-3 font-bold">{money(x.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="text-xs leading-5 text-slate-500">Example: salary ₹10,000 and total paid ₹12,000 → ₹2,000 is carried forward and deducted from next month, so next month payable is ₹8,000. Every payment is also saved in Expenses (category Salary) and the Daybook. Payments are never deleted.</p>

      {payType&&(
        <Modal title={payType==='Advance'?'Give advance':'Pay salary'} subtitle={`${member.name} · remaining this month ${money(l.remaining)}`} onClose={()=>setPayType(null)}>
          <StaffPaymentForm defaultType={payType} remaining={l.remaining} accounts={accounts} balances={balances} onPay={pay} onCancel={()=>setPayType(null)}/>
        </Modal>
      )}
      {editing&&(
        <Modal title="Edit staff details" subtitle={member.name} onClose={()=>setEditing(false)}>
          <StaffForm initial={member} onSubmit={d=>{onUpdate(d);setEditing(false)}} onCancel={()=>setEditing(false)}/>
        </Modal>
      )}
    </div>
  )
}