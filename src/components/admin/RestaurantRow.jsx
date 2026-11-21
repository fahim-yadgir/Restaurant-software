import { useState } from 'react'
import { KeyRound, Trash2, RefreshCw } from 'lucide-react'
import Button from '@/components/ui/Button'
import CopyButton from '@/components/ui/CopyButton'
import StatusBadge from '@/components/admin/StatusBadge'
import { DURATION_OPTIONS } from '@/lib/appConfig'
import { getRestaurantStatus, formatDate, formatRemaining } from '@/lib/registry'

const selectClass = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs'

export default function RestaurantRow({ r, now, onRenew, onResetPassword, onDelete, onShowCredentials }) {
  const [days, setDays] = useState('30')
  const status = getRestaurantStatus(r, now)
  const reset = async () => {
    if (!window.confirm(`Reset the owner password for ${r.name}?`)) return
    onShowCredentials(r, await onResetPassword(r.id))
  }
  return <tr className="border-t border-slate-100 align-top">
    <td className="px-5 py-4"><div className="font-bold">{r.name}</div><div className="text-xs text-slate-400">Registered {formatDate(r.createdAt)}</div></td>
    <td className="px-5 py-4"><div>{r.ownerName}</div><div className="text-xs text-slate-500">{r.mobile}</div><div className="text-xs text-slate-500">{r.email}</div></td>
    <td className="px-5 py-4"><div className="flex items-center gap-2"><code className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold tracking-wider">{r.code}</code><CopyButton text={r.code} label="" /></div></td>
    <td className="px-5 py-4">{r.durationDays} days</td>
    <td className="px-5 py-4"><StatusBadge status={status} /></td>
    <td className="px-5 py-4 text-xs">{r.activatedAt ? <><div className="font-semibold">{formatDate(r.expiresAt)}</div><div className="text-slate-500">{formatRemaining(r.expiresAt, now)}</div></> : <span className="text-slate-500">Starts on activation</span>}</td>
    <td className="px-5 py-4"><div className="flex flex-wrap items-center gap-2">
      <select value={days} onChange={(e) => setDays(e.target.value)} className={selectClass}>{DURATION_OPTIONS.filter((o) => o.days > 7).map((o) => <option key={o.days} value={o.days}>+{o.days} days</option>)}</select>
      <Button variant="secondary" onClick={() => onRenew(r.id, Number(days))} className="!px-3 !py-2 text-xs"><RefreshCw size={14}/> Renew</Button>
      <Button variant="ghost" onClick={reset} className="!px-3 !py-2 text-xs"><KeyRound size={14}/> Reset password</Button>
      {!r.activatedAt && <Button variant="ghost" onClick={() => window.confirm(`Delete ${r.name}? Its activation code will stop working.`) && onDelete(r.id)} className="!px-3 !py-2 text-xs text-rose-600"><Trash2 size={14}/></Button>}
    </div></td>
  </tr>
}
