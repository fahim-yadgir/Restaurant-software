import DaybookTable from '@/components/dashboard/DaybookTable'
import {ledgerRows} from '@/lib/stats'

export default function DaybookPage({bills,expenses,pigmy=[],pigmyEntries=[]}) {
  const rows=ledgerRows({bills,expenses,pigmy,pigmyEntries})
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-extrabold">Income vs expense ledger</h2>
      <p className="text-sm text-slate-500">All recorded entries, newest first. Sales are already included as income; do not record the same sale twice. Pigmy / investment deposits and withdrawals are shown for cash tracking but are not counted as expenses. Expenses, salary and sales linked to a bank account show once.</p>
      <DaybookTable rows={rows}/>
    </div>
  )
}