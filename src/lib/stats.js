// Real figures for the Dashboard, Reports and Daybook, calculated only from the records the owner has saved.
import {localDate,prevMonth} from '@/lib/pigmy'

const pad=n=>String(n).padStart(2,'0')
const num=v=>Number(v)||0
const sumBy=(list,f)=>list.reduce((t,x)=>t+f(x),0)

export const compactMoney=n=>`₹${new Intl.NumberFormat('en-IN',{notation:'compact',maximumFractionDigits:1}).format(n||0)}`
export const pct=(v,total)=>total>0?Math.round((v/total)*100):0

/* ---------- Report periods ---------- */
export const PERIODS=[['today','Today'],['7d','Last 7 days'],['month','This month'],['lastMonth','Last month'],['fy','This financial year'],['all','All time']]

export function periodRange(key){
  const now=new Date(), today=localDate(now), y=now.getFullYear(), m=now.getMonth()
  if(key==='today') return {from:today,to:today}
  if(key==='7d') return {from:localDate(new Date(y,m,now.getDate()-6)),to:today}
  if(key==='month') return {from:`${y}-${pad(m+1)}-01`,to:today}
  if(key==='lastMonth') return {from:localDate(new Date(y,m-1,1)),to:localDate(new Date(y,m,0))}
  if(key==='fy'){const sy=m>=3?y:y-1;return {from:`${sy}-04-01`,to:today}}   // Indian financial year: 1 Apr - 31 Mar
  return null                                                                 // all time
}
export const inRange=(date,range)=>!range||(!!date&&date>=range.from&&date<=range.to)

/* ---------- Sales (bills) ---------- */
// Bills saved by Billing: total (gross, incl. GST), subtotal, discount, tax, payment, items[{name,qty,price,gst}]
export function summarizeBills(bills){
  const t={count:0,gross:0,taxable:0,gst:0,discount:0,byPayment:{},bySlab:{},items:{}}
  bills.forEach(b=>{
    const subtotal=num(b.subtotal), disc=num(b.discount)
    const taxable=Math.max(0,subtotal-disc), factor=subtotal>0?taxable/subtotal:0
    t.count+=1; t.gross+=num(b.total); t.taxable+=taxable; t.gst+=num(b.tax); t.discount+=disc
    t.byPayment[b.payment||'Other']=(t.byPayment[b.payment||'Other']||0)+num(b.total)
    ;(b.items||[]).forEach(it=>{
      const line=num(it.price)*num(it.qty), rate=num(it.gst)
      const slab=t.bySlab[rate]||(t.bySlab[rate]={taxable:0,tax:0})
      slab.taxable+=line*factor; slab.tax+=line*factor*rate/100
      const dish=t.items[it.name]||(t.items[it.name]={name:it.name,qty:0,amount:0})
      dish.qty+=num(it.qty); dish.amount+=line
    })
  })
  return t
}

/* ---------- Expenses (includes staff salary / advance payments) ---------- */
export function summarizeExpenses(list){
  const byCategory={}
  list.forEach(e=>{const c=e.category||'Other';byCategory[c]=(byCategory[c]||0)+num(e.amount)})
  return {count:list.length,total:sumBy(list,e=>num(e.amount)),byCategory}
}

// Sales (excl. GST) and expenses for the last `count` months.
export function monthlySeries(bills,expenses,count=6){
  const now=new Date(), out=[]
  for(let i=count-1;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1)
    out.push({key:`${d.getFullYear()}-${pad(d.getMonth()+1)}`,label:d.toLocaleString('en-IN',{month:'short'}),sales:0,expenses:0})
  }
  bills.forEach(b=>{const r=out.find(x=>x.key===String(b.date||'').slice(0,7));if(r) r.sales+=Math.max(0,num(b.subtotal)-num(b.discount))})
  expenses.forEach(e=>{const r=out.find(x=>x.key===String(e.date||'').slice(0,7));if(r) r.expenses+=num(e.amount)})
  return out
}

/* ---------- Cash in drawer ---------- */
// Recorded cash sales - cash expenses - cash put into bank / pigmy + cash taken out of them.
// (There is no opening balance, so this is based only on entries saved in the app.)
export function cashInDrawer({bills,expenses,pigmyEntries=[]}){
  const cashSales=sumBy(bills.filter(b=>b.payment==='Cash'),b=>num(b.total))
  const cashExpenses=sumBy(expenses.filter(e=>e.mode==='Cash'&&!e.accountId),e=>num(e.amount))
  const manual=pigmyEntries.filter(e=>!e.source)
  const deposited=sumBy(manual.filter(e=>e.type==='deposit'),e=>num(e.amount))
  const withdrawn=sumBy(manual.filter(e=>e.type==='withdraw'),e=>num(e.amount))
  return cashSales-cashExpenses-deposited+withdrawn
}

/* ---------- Staff ---------- */
// Salary still to be paid this month, after payments and any carry-forward from last month.
export function staffRemaining(staff,expenses){
  const month=localDate().slice(0,7), last=prevMonth(month)
  return sumBy(staff,s=>{
    const pays=expenses.filter(x=>x.staffId===s.id)
    const inMonth=m=>sumBy(pays.filter(x=>String(x.date).slice(0,7)===m),x=>num(x.amount))
    const carry=Math.max(0,inMonth(last)-num(s.salary))
    return Math.max(0,Math.max(0,num(s.salary)-carry)-inMonth(month))
  })
}

/* ---------- Ledger (Daybook + Dashboard recent activity) ---------- */
export function ledgerRows({bills,expenses,pigmy=[],pigmyEntries=[]}){
  const bank=id=>pigmy.find(a=>a.id===id)?.bankName||'Bank'
  const rows=[]
  bills.forEach(b=>rows.push({
    sort:b.date?`${b.date}T${b.time||'23:59'}`:'',
    time:b.date?`${b.date}${b.time?` · ${b.time}`:''}`:'Earlier',
    title:`Customer Bill ${b.id}`,type:'Sale Income',
    mode:b.accountId?`${b.payment} → ${bank(b.accountId)}`:b.payment,amount:b.total,
  }))
  expenses.forEach(e=>rows.push({
    sort:e.date?`${e.date}T00:00`:'',time:e.date||'—',title:e.title,type:'Expense',
    mode:e.accountId?`Bank · ${bank(e.accountId)}`:e.mode,amount:e.amount,
  }))
  // Entries linked to an expense, salary payment or sale already show above, so they are skipped here.
  pigmyEntries.filter(e=>!e.source).forEach(e=>rows.push({
    sort:e.date?`${e.date}T00:00`:'',time:e.date||'—',
    title:`${bank(e.accountId)} · ${e.type==='deposit'?'Deposit':'Withdrawal'}${e.reversalOf?' (reversal)':''}${e.note&&!e.reversalOf?` — ${e.note}`:''}`,
    type:e.type==='deposit'?'Investment Deposit':'Investment Withdrawal',mode:'Bank',amount:e.amount,
  }))
  return rows.sort((a,b)=>String(b.sort).localeCompare(String(a.sort)))
}