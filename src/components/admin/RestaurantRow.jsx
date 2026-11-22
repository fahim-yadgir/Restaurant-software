
import { Pencil } from 'lucide-react'
import Button from '@/components/ui/Button'
import CopyButton from '@/components/ui/CopyButton'
import StatusBadge from '@/components/admin/StatusBadge'
import {
  getRestaurantStatus,
  formatDate,
  formatRemaining,
} from '@/lib/registry'

export default function RestaurantRow({ r, now, onManage }) {
  const status = getRestaurantStatus(r, now)

  return (
    <tr className="border-t border-slate-100 align-top">
      <td className="px-5 py-4">
        <div className="font-bold">{r.name}</div>
        <div className="text-xs text-slate-400">
          Registered {formatDate(r.createdAt)}
        </div>
      </td>

      <td className="px-5 py-4">
        <div>{r.ownerName}</div>
        <div className="text-xs text-slate-500">{r.mobile}</div>
        <div className="text-xs text-slate-500">{r.email}</div>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <code className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold tracking-wider">
            {r.code}
          </code>
          <CopyButton text={r.code} label="" />
        </div>
      </td>

      <td className="px-5 py-4">
        {r.durationDays} days
      </td>

      <td className="px-5 py-4">
        <StatusBadge status={status} />
      </td>

      <td className="px-5 py-4 text-xs">
        {r.activatedAt ? (
          <>
            <div className="font-semibold">{formatDate(r.expiresAt)}</div>
            <div className="text-slate-500">
              {formatRemaining(r.expiresAt, now)}
            </div>
          </>
        ) : (
          <span className="text-slate-500">Starts on activation</span>
        )}
      </td>

      <td className="px-5 py-4">
        <Button
          variant="secondary"
          onClick={() => onManage(r)}
          className="!px-4 !py-2 text-xs"
        >
          <Pencil size={14} />
          Edit
        </Button>
      </td>
    </tr>
  )
}
