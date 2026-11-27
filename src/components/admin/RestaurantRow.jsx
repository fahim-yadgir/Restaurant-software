import { Pencil } from 'lucide-react'
import Button from '@/components/ui/Button'
import CopyButton from '@/components/ui/CopyButton'
import StatusBadge from '@/components/admin/StatusBadge'
import {
  getRestaurantStatus,
  formatDate,
  shortDeviceId,
  isLifetime,
  planLabel,
  remainingText,
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
        {r.email && <div className="text-xs text-slate-500">{r.email}</div>}
      </td>

      <td className="px-5 py-4">
        {r.deviceId ? (
          <>
            <div className="flex items-center gap-2">
              <code className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold">
                {shortDeviceId(r.deviceId)}
              </code>
              <CopyButton text={r.deviceId} label="" />
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Linked {formatDate(r.deviceBoundAt)}
            </div>
          </>
        ) : (
          <span className="text-xs text-slate-500">Not linked yet</span>
        )}
      </td>

      <td className="px-5 py-4">
        {planLabel(r)}
      </td>

      <td className="px-5 py-4">
        <StatusBadge status={status} />
      </td>

      <td className="px-5 py-4 text-xs">
        {r.activatedAt ? (
          <>
            <div className="font-semibold">{isLifetime(r) ? 'Never' : formatDate(r.expiresAt)}</div>
            <div className="text-slate-500">
              {remainingText(r, now)}
            </div>
          </>
        ) : (
          <span className="text-slate-500">Starts on first login</span>
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