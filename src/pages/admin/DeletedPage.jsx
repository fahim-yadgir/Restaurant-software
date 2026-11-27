import { useMemo, useState } from 'react'
import { RotateCcw, Trash2 } from 'lucide-react'

import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import StatusBadge from '@/components/admin/StatusBadge'

import { PAYMENT_METHODS } from '@/lib/revenue'
import { formatDate, getRestaurantStatus, isLifetime, isValidPlanDays, planLabel } from '@/lib/registry'
import { notifyConfirm, notifyError, notifySuccess } from '@/lib/toast'

const PAGE_SIZE = 15

const selectClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm'

// restaurants = null while the list is loading.
export default function DeletedPage({ restaurants, now, onRestore, onPermanentDelete }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [target, setTarget] = useState(null) // restaurant being restored
  const [days, setDays] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('UPI')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')

    return (restaurants || []).filter(
      (r) =>
        !q ||
        [r.name, r.ownerName, r.email].some((v) => String(v || '').toLowerCase().includes(q)) ||
        (digits && String(r.mobile || '').includes(digits))
    )
  }, [restaurants, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const firstIndex = (currentPage - 1) * PAGE_SIZE
  const pageRows = filtered.slice(firstIndex, firstIndex + PAGE_SIZE)

  const openRestore = (restaurant) => {
    setTarget(restaurant)
    setDays('')
    setAmount('')
    setMethod('UPI')
    setError('')
  }

  const submitRestore = async (event) => {
    event.preventDefault()

    const lifetime = isLifetime(target)
    const wantsRenewal = !lifetime && days.trim() !== ''

    if (wantsRenewal && !isValidPlanDays(days)) {
      setError('Enter renewal days between 1 and 3650, or leave it empty.')
      return
    }

    if (amount !== '' && !(Number(amount) >= 0)) {
      setError('Enter a valid amount received.')
      return
    }

    setBusy(true)
    setError('')

    try {
      await onRestore(
        target.id,
        wantsRenewal ? { days: Number(days), amount: Number(amount) || 0, method } : {}
      )

      notifySuccess(wantsRenewal ? 'Restaurant restored and renewed.' : 'Restaurant restored.')
      setTarget(null)
    } catch (err) {
      const message = err?.message || 'Could not restore the restaurant.'

      setError(message)
      notifyError(message)
    } finally {
      setBusy(false)
    }
  }

  const handlePermanentDelete = async (restaurant) => {
    const confirmed = await notifyConfirm(
      `${restaurant.name} and its plan history will be removed for good. Its payments stay in Revenue. This cannot be undone.`,
      'Delete permanently?'
    )

    if (!confirmed) return

    try {
      await onPermanentDelete(restaurant.id)
      notifySuccess('Restaurant deleted permanently.')
    } catch (err) {
      notifyError(err?.message || 'Could not delete the restaurant.')
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-extrabold">Deleted restaurants</h2>

        <p className="mt-1 text-sm text-slate-500">
          Deleted restaurants cannot sign in. Restore (or restore and renew) them, or delete them
          permanently. Their payments always stay in Revenue.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Search name, owner, mobile or email"
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 sm:w-80"
        />

        {restaurants && (
          <span className="text-xs text-slate-500">
            {filtered.length} of {restaurants.length} deleted
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              {['Restaurant', 'Owner', 'Plan', 'Plan status', 'Deleted on', 'Actions'].map((heading) => (
                <th className="px-5 py-4" key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 align-top">
                <td className="px-5 py-4">
                  <div className="font-bold">{r.name}</div>
                  <div className="text-xs text-slate-400">Registered {formatDate(r.createdAt)}</div>
                </td>

                <td className="px-5 py-4">
                  <div>{r.ownerName}</div>
                  <div className="text-xs text-slate-500">{r.mobile}</div>
                  {r.email && <div className="text-xs text-slate-500">{r.email}</div>}
                </td>

                <td className="px-5 py-4">{planLabel(r)}</td>

                <td className="px-5 py-4">
                  <StatusBadge status={getRestaurantStatus(r, now)} />
                  {r.activatedAt && !isLifetime(r) && (
                    <div className="mt-1 text-xs text-slate-500">Expires {formatDate(r.expiresAt)}</div>
                  )}
                </td>

                <td className="px-5 py-4 text-xs">{formatDate(r.deletedAt)}</td>

                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => openRestore(r)} className="!px-3 !py-2 text-xs">
                      <RotateCcw size={14} />
                      Restore / Renew
                    </Button>

                    <Button
                      variant="danger"
                      onClick={() => handlePermanentDelete(r)}
                      className="!px-3 !py-2 text-xs"
                    >
                      <Trash2 size={14} />
                      Delete permanently
                    </Button>
                  </div>
                </td>
              </tr>
            ))}

            {restaurants === null && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-500">Loading…</td>
              </tr>
            )}

            {restaurants !== null && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                  {restaurants.length === 0 ? 'No deleted restaurants.' : 'No deleted restaurant matches this search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Showing {firstIndex + 1}–{Math.min(firstIndex + PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="!px-3 !py-1.5 text-xs"
            >
              Previous
            </Button>

            <span>Page {currentPage} of {totalPages}</span>

            <Button
              variant="secondary"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="!px-3 !py-1.5 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {target && (
        <Modal
          title="Restore restaurant"
          subtitle={target.name}
          onClose={() => setTarget(null)}
        >
          <form onSubmit={submitRestore} className="space-y-4">
            {isLifetime(target) ? (
              <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                Lifetime plan: the restaurant will simply be restored. No renewal is needed.
              </p>
            ) : (
              <>
                <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  Leave the days empty to only restore the restaurant (the plan stays as it was).
                  Enter days to restore <b>and</b> renew it; the amount is saved in Revenue.
                </p>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Field
                    label="Renew for (days)"
                    value={days}
                    onChange={setDays}
                    placeholder="Optional"
                    inputMode="numeric"
                  />

                  <Field
                    label="Amount received (₹)"
                    value={amount}
                    onChange={setAmount}
                    placeholder="Any amount"
                    inputMode="decimal"
                  />

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-slate-600">Payment method</span>

                    <select value={method} onChange={(e) => setMethod(e.target.value)} className={selectClass}>
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            )}

            {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setTarget(null)} disabled={busy}>
                Cancel
              </Button>

              <Button type="submit" disabled={busy}>
                {busy ? 'Please wait...' : days.trim() && !isLifetime(target) ? 'Restore & renew' : 'Restore'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}