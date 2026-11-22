// Staff helpers: monthly ledger for one staff member.
import {localDate,prevMonth} from '@/lib/pigmy'

const num=v=>Number(v)||0

// 'YYYY-MM-DD' -> '22 Nov 2026' (no time-zone shift)
export const fmtDay=d=>{
  if(!d) return '—'
  const [y,m,day]=String(d).split('-').map(Number)
  return new Date(y,m-1,day).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})
}
export const monthLabel=ym=>{
  const [y,m]=ym.split('-').map(Number)
  return new Date(y,m-1,1).toLocaleString('en-IN',{month:'long',year:'numeric'})
}
export const initials=name=>String(name||'?').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('')||'?'

// Salary and advance payments are saved as expenses with staffId.
export function staffLedger(member,expenses){
  const month=localDate().slice(0,7), last=prevMonth(month)
  const pays=expenses.filter(x=>x.staffId===member.id)
  const inMonth=m=>pays.filter(x=>String(x.date).slice(0,7)===m).reduce((t,x)=>t+num(x.amount),0)
  const salary=num(member.salary)
  const paid=inMonth(month)
  const carry=Math.max(0,inMonth(last)-salary)        // overpaid last month, deducted this month
  const due=Math.max(0,salary-carry)
  const months=[...new Set(pays.map(x=>String(x.date).slice(0,7)))].sort().reverse().map(m=>({month:m,paid:inMonth(m)}))
  return {
    month,salary,paid,carry,due,
    remaining:Math.max(0,due-paid),
    excess:Math.max(0,paid-due),
    months,
    history:[...pays].sort((a,b)=>String(b.date).localeCompare(String(a.date))),
  }
}