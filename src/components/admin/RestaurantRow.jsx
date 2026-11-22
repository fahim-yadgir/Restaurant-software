
import { useState } from 'react'
import { KeyRound, Trash2, RefreshCw } from 'lucide-react'

import Button from '@/components/ui/Button'
import CopyButton from '@/components/ui/CopyButton'
import StatusBadge from '@/components/admin/StatusBadge'

import { DURATION_OPTIONS } from '@/lib/appConfig'

import {
  getRestaurantStatus,
  formatDate,
  formatRemaining,
} from '@/lib/registry'

import { notifySuccess, notifyError } from '@/lib/toast'

const selectClass =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs'

export default function RestaurantRow({
  r,
  now,
  onRenew,
  onResetPassword,
  onDelete,
  onShowCredentials,
}) {
  const [days, setDays] = useState('30')
  const [busy, setBusy] = useState(false)

  const status = getRestaurantStatus(r, now)

  const renew = async () => {
    try {
      setBusy(true)
      await onRenew(r.id, Number(days))
      notifySuccess('Subscription renewed successfully!')
    } catch (error) {
      notifyError(error.message || 'Could not renew subscription.')
    } finally {
      setBusy(false)
    }
  }

  const reset = async () => {
    if (!window.confirm(`Reset the owner password for ${r.name}?`)) {
      return
    }

    try {
      setBusy(true)

      const password = await onResetPassword(r.id)

      onShowCredentials(r, password)

      notifySuccess('Password reset successfully!')
    } catch (error) {
      notifyError(error.message || 'Could not reset password.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Delete ${r.name}? Its activation code will stop working.`)) {
      return
    }

    try {
      await onDelete(r.id)
      notifySuccess('Restaurant deleted successfully!')
    } catch (error) {
      notifyError(error.message || 'Could not delete restaurant.')
    }
  }

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
            <div className="font-semibold">
              {formatDate(r.expiresAt)}
            </div>
            <div className="text-slate-500">
              {formatRemaining(r.expiresAt, now)}
            </div>
          </>
        ) : (
          <span className="text-slate-500">
            Starts on activation
          </span>
        )}
      </td>

      <td className="px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={days}
            onChange={(event) => setDays(event.target.value)}
            className={selectClass}
            disabled={busy}
          >
            {DURATION_OPTIONS
              .filter((option) => option.days > 7)
              .map((option) => (
                <option key={option.days} value={option.days}>
                  +{option.days} days
                </option>
              ))}
          </select>

          <Button
            variant="secondary"
            onClick={renew}
            disabled={busy}
            className="!px-3 !py-2 text-xs"
          >
            <RefreshCw size={14} />
            Renew
          </Button>

          <Button
            variant="ghost"
            onClick={reset}
            disabled={busy}
            className="!px-3 !py-2 text-xs"
          >
            <KeyRound size={14} />
            Reset password
          </Button>

          {!r.activatedAt && (
            <Button
              variant="ghost"
              onClick={remove}
              disabled={busy}
              className="!px-3 !py-2 text-xs text-rose-600"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}
