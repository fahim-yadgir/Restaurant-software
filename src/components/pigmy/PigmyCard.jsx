import {History,ArrowDownToLine,ArrowUpFromLine,Pencil,Check,Zap} from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import {money} from '@/lib/format'
import {maskAccount} from '@/lib/pigmy'

const tone={Active:'green',Matured:'orange',Closed:'slate'}

export default function PigmyCard({account,sum,onQuickDeposit,onDeposit,onWithdraw,onHistory,onEdit,onToggleClosed}) {
  const closed=account.status==='Closed'
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-bold">{account.bankName}</div>
          <div className="mt-0.5 truncate text-xs text-slate-500">{account.accountName||'Account name not added'} · {maskAccount(account.accountNumber)}</div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge tone={tone[sum.status]}>{sum.status}</Badge>
          <div className="rounded-xl bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">{money(account.dailyAmount)}/day</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
        <div><div className="font-semibold uppercase tracking-wide text-slate-400">Start</div><div className="mt-0.5 text-slate-700">{account.startDate||'—'}</div></div>
        <div><div className="font-semibold uppercase tracking-wide text-slate-400">Expire</div><div className="mt-0.5 text-slate-700">{account.expireDate||'—'}</div></div>
        <div><div className="font-semibold uppercase tracking-wide text-slate-400">Days left</div><div className="mt-0.5 text-slate-700">{sum.daysLeft==null?'—':sum.daysLeft}</div></div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="text-slate-500">Deposited {money(sum.deposited)} of {sum.expected?money(sum.expected):'—'}</span>
          <b>{sum.progress}%</b>
        </div>
        <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-orange-500" style={{width:`${sum.progress}%`}}/></div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-slate-50 p-3"><div className="text-[11px] text-slate-500">Balance</div><b>{money(sum.balance)}</b></div>
        <div className="rounded-xl bg-slate-50 p-3"><div className="text-[11px] text-slate-500">Pending deposits</div><b className={sum.pending>0?'text-rose-600':''}>{money(sum.pending)}</b></div>
        <div className="rounded-xl bg-slate-50 p-3"><div className="text-[11px] text-slate-500">Total deposited</div><b>{money(sum.deposited)}</b></div>
        <div className="rounded-xl bg-slate-50 p-3"><div className="text-[11px] text-slate-500">Total withdrawn</div><b>{money(sum.withdrawn)}</b></div>
      </div>

      {(sum.received>0||sum.paidOut>0)&&(
        <div className="mt-2 flex justify-between rounded-xl border border-dashed border-slate-200 px-3 py-2 text-[11px] text-slate-500">
          <span>Sales received <b className="text-emerald-600">{money(sum.received)}</b></span>
          <span>Paid out <b className="text-rose-600">{money(sum.paidOut)}</b></span>
        </div>
      )}

      {account.note&&<p className="mt-3 text-xs italic text-slate-500">“{account.note}”</p>}

      <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
        <Button className="w-full px-3 py-2 text-xs" disabled={closed||sum.depositedToday} onClick={onQuickDeposit}>
          {sum.depositedToday?<><Check size={14}/> Today's deposit done</>:<><Zap size={14}/> Deposit today · {money(account.dailyAmount)}</>}
        </Button>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" className="px-2 py-2 text-xs" disabled={closed} onClick={onDeposit}><ArrowDownToLine size={13}/> Deposit</Button>
          <Button variant="secondary" className="px-2 py-2 text-xs" disabled={closed||sum.balance<=0} onClick={onWithdraw}><ArrowUpFromLine size={13}/> Withdraw</Button>
          <Button variant="secondary" className="px-2 py-2 text-xs" onClick={onHistory}><History size={13}/> History</Button>
        </div>
        <div className="flex justify-between pt-1 text-xs font-bold">
          <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-slate-600 hover:text-orange-600"><Pencil size={12}/> Edit details</button>
          <button type="button" onClick={onToggleClosed} className="text-slate-500 hover:text-orange-600">{closed?'Reopen account':'Close account'}</button>
        </div>
      </div>
    </div>
  )
}