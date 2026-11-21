import {useState} from 'react'
import {Plus} from 'lucide-react'
import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import StaffPaymentForm from '@/components/staff/StaffPaymentForm'
import {money} from '@/lib/format'
import {localDate,newId,parsePaidFrom,balancesOf,prevMonth} from '@/lib/pigmy'

export default function StaffPage({staff,setStaff,expenses=[],setExpenses,accounts=[],entries=[],setEntries}) {
  const [name,setName]=useState(''),[role,setRole]=useState('Waiter'),[salary,setSalary]=useState('')
  const balances=balancesOf(accounts,entries)
  const bankName=id=>accounts.find(a=>a.id===id)?.bankName||'Bank account'

  // Salary and advance payments are saved as expenses (category Salary) linked to the staff member.
  const month=localDate().slice(0,7), lastMonth=prevMonth(month)
  const ledgerOf=s=>{
    const pays=expenses.filter(x=>x.staffId===s.id)
    const inMonth=m=>pays.filter(x=>String(x.date).slice(0,7)===m).reduce((t,x)=>t+Number(x.amount),0)
    const paid=inMonth(month)
    const carry=Math.max(0,inMonth(lastMonth)-Number(s.salary))   // overpaid last month, deducted this month
    const due=Math.max(0,Number(s.salary)-carry)
    return {paid,carry,due,remaining:Math.max(0,due-paid),excess:Math.max(0,paid-due),recent:pays.slice(0,3)}
  }

  const pay=(s,{type,amount,paidFrom,date,note})=>{
    const {mode,accountId}=parsePaidFrom(paidFrom)
    const id=newId()
    setExpenses([{id,date,title:`${type} – ${s.name}`,amount,category:'Salary',mode,staffId:s.id,payType:type,note,...(accountId?{accountId}:{})},...expenses])
    if(accountId) setEntries(old=>[...old,{id:newId(),accountId,date,type:'withdraw',amount,note:`${type} paid to ${s.name}`,source:'expense',sourceId:id}])
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-extrabold">Staff & salary ledger</h2>
        <p className="mt-1 text-sm text-slate-500">Track employee profiles, monthly salary, advances and carry-forward balances. Payments can be made from counter cash or from a bank / pigmy account.</p>
      </div>

      <form onSubmit={e=>{e.preventDefault();if(name&&salary){setStaff([...staff,{id:Date.now(),name,role,mobile:'',salary:Number(salary)}]);setName('');setSalary('')}}} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-4">
        <Field label="Employee name" value={name} onChange={setName} placeholder="Employee name"/>
        <label className="space-y-1.5 text-xs font-semibold text-slate-600">Role
          <select value={role} onChange={e=>setRole(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option>Waiter</option><option>Chef</option><option>Cashier</option><option>Manager</option><option>Other</option></select>
        </label>
        <Field label="Monthly salary (₹)" type="number" value={salary} onChange={setSalary} placeholder="10000"/>
        <div className="flex items-end"><Button type="submit"><Plus size={15}/> Add staff</Button></div>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {staff.map(s=>{
          const l=ledgerOf(s)
          return (
            <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div><div className="font-bold">{s.name}</div><div className="mt-1 text-xs text-slate-500">{s.role}</div></div>
                <div className="rounded-xl bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700">{money(s.salary)}/mo</div>
              </div>

              <div className="mt-4 space-y-1.5 text-sm">
                {l.carry>0&&<div className="flex justify-between text-slate-500"><span>Carry-forward from last month</span><b className="text-rose-600">−{money(l.carry)}</b></div>}
                <div className="flex justify-between text-slate-500"><span>Paid this month</span><b className="text-slate-900">{money(l.paid)}</b></div>
                <div className="flex justify-between"><span className="text-slate-500">Remaining this month</span><b>{money(l.remaining)}</b></div>
                {l.excess>0&&<div className="flex justify-between text-amber-700"><span>Paid extra (deducted next month)</span><b>{money(l.excess)}</b></div>}
              </div>

              {l.recent.length>0&&<div className="mt-3 space-y-1 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">
                {l.recent.map(x=>(
                  <div key={x.id} className="flex justify-between gap-2">
                    <span className="truncate">{x.date} · {x.payType||'Payment'} · {x.accountId?bankName(x.accountId):x.mode}</span>
                    <b className="text-slate-700">{money(x.amount)}</b>
                  </div>
                ))}
              </div>}

              <StaffPaymentForm remaining={l.remaining} accounts={accounts} balances={balances} onPay={p=>pay(s,p)}/>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        <b>Carry-forward example:</b> Monthly salary ₹10,000. If total advances/payments are ₹12,000, ₹2,000 is carried forward and deducted from next month's ₹10,000 salary. Next month payable = ₹8,000. Every payment is saved in Expenses (category Salary) and in the Daybook, and when you pay from a bank / pigmy account its balance goes down automatically. Never delete or overwrite the original ledger entries.
      </div>
    </div>
  )
}