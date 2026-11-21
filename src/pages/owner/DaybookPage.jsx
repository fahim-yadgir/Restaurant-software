import DaybookTable from '@/components/dashboard/DaybookTable'

export default function DaybookPage({bills,expenses,pigmy=[],pigmyEntries=[]}) {
  const bank=id=>pigmy.find(a=>a.id===id)?.bankName||'Bank'

  // Entries linked to an expense, staff payment or sale are already shown as that expense / sale, so they are skipped here.
  const pigmyRows=pigmyEntries.filter(e=>!e.source).map(e=>{
    const label=e.type==='deposit'?'Deposit':'Withdrawal'
    return {
      time:e.date,
      title:`${bank(e.accountId)} · ${label}${e.reversalOf?' (reversal)':''}${e.note&&!e.reversalOf?` — ${e.note}`:''}`,
      type:e.type==='deposit'?'Investment Deposit':'Investment Withdrawal',
      mode:'Bank',
      amount:e.amount,
    }
  })
  const rows=[
    ...bills.map(b=>({time:'Today',title:`Customer Bill ${b.id}`,type:'Sale Income',mode:b.accountId?`${b.payment} → ${bank(b.accountId)}`:b.payment,amount:b.total})),
    ...expenses.map(e=>({time:e.date,title:e.title,type:'Expense',mode:e.accountId?`Bank · ${bank(e.accountId)}`:e.mode,amount:e.amount})),
    ...pigmyRows,
  ].sort((a,b)=>String(b.time).localeCompare(String(a.time)))
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-extrabold">Income vs expense ledger</h2>
      <p className="text-sm text-slate-500">All recorded entries in chronological order. Sales are already included as income; do not record the same sale twice. Pigmy / investment deposits and withdrawals are shown for cash tracking but are not counted as expenses. Expenses and salary paid from a bank account show once, as expenses.</p>
      <DaybookTable rows={rows}/>
    </div>
  )
}