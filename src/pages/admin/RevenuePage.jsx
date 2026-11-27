import { useEffect, useMemo, useState } from 'react'
import {
  IndianRupee,
  CalendarDays,
  TrendingUp,
  ReceiptText,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react'

import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import BarRow from '@/components/dashboard/BarRow'

import { formatDate, getRestaurantStatus } from '@/lib/registry'
import { notifyConfirm, notifyError, notifySuccess } from '@/lib/toast'

import {
  PAYMENT_METHODS,
  PAYMENT_TYPES,
  RANGE_OPTIONS,
  countRows,
  groupRows,
  monthlyFromRows,
  rowsInRange,
  rupees,
  sumRows,
} from '@/lib/revenue'

const selectClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm transition-colors duration-200 hover:border-orange-300 focus:border-orange-400 focus:outline-none'

const STAT_STYLES = {
  green: {
    border: 'border-l-emerald-500 hover:border-emerald-300',
    iconBg: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
  },
  orange: {
    border: 'border-l-orange-500 hover:border-orange-300',
    iconBg: 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
  },
  blue: {
    border: 'border-l-blue-500 hover:border-blue-300',
    iconBg: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
  },
  purple: {
    border: 'border-l-purple-500 hover:border-purple-300',
    iconBg: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
  },
}

// Smooth count-up hook for numbers / currency
function useCountUp(target, duration = 700, enabled = true) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!enabled || typeof target !== 'number' || Number.isNaN(target)) {
      setDisplay(0)
      return
    }

    let rafId
    const start = performance.now()
    const from = 0

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(from + (target - from) * eased)
      setDisplay(current)

      if (progress < 1) {
        rafId = requestAnimationFrame(tick)
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [target, duration, enabled])

  return display
}

function AnimatedStatCard({
  label,
  numericValue,
  isCurrency = false,
  loading = false,
  sub,
  icon: Icon,
  tone = 'green',
}) {
  const animatedNum = useCountUp(numericValue, 700, !loading)
  const palette = STAT_STYLES[tone] || STAT_STYLES.green

  const formattedValue = loading
    ? '…'
    : isCurrency
      ? rupees(animatedNum)
      : animatedNum

  return (
    <div
      className={`group rounded-2xl border border-slate-200 border-l-4 ${palette.border} bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-slate-500">{label}</div>
          <div className="mt-2 font-display text-2xl font-extrabold text-slate-900 tabular-nums">
            {formattedValue}
          </div>
          {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
        </div>

        {Icon && (
          <div
            className={`rounded-xl p-2.5 transition-colors duration-200 ${palette.iconBg}`}
          >
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  )
}

const dateInput = (timestamp = Date.now()) => {
  const d = new Date(timestamp)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const todayInput = () => dateInput()

const emptyForm = () => ({
  restaurantId: '',
  type: 'other',
  amount: '',
  method: 'UPI',
  date: todayInput(),
  note: '',
})

function ChartCard({ title, items, total, color }) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="font-bold text-slate-800">{title}</div>

      {items.length === 0 && (
        <p className="text-sm text-slate-500">No payments in this period.</p>
      )}

      {items.map(([label, amount]) => (
        <div
          key={label}
          className="rounded-xl p-1.5 transition-colors duration-150 hover:bg-slate-50"
        >
          <BarRow
            label={label}
            value={rupees(amount)}
            percent={total ? (amount / total) * 100 : 0}
            color={color}
          />
        </div>
      ))}
    </div>
  )
}

export default function RevenuePage({
  registry,
  rows,
  recent,
  now,
  onAddPayment,
  onUpdatePayment,
  onDeletePayment,
}) {
  const [range, setRange] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [editing, setEditing] = useState(null)
  const [edit, setEdit] = useState(null)
  const [editError, setEditError] = useState('')

  const setEditField = (key) => (value) =>
    setEdit((old) => ({ ...old, [key]: value }))

  const openEdit = (payment) => {
    setEditing(payment)
    setEdit({
      amount: String(payment.amount),
      type: payment.type,
      method: payment.method,
      date: dateInput(payment.paidOn),
      note: payment.note || '',
    })
    setEditError('')
  }

  const submitEdit = async (event) => {
    event.preventDefault()

    const amount = Number(edit.amount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setEditError('Enter an amount greater than 0.')
      return
    }

    const changes = { amount, type: edit.type, method: edit.method, note: edit.note }

    if (edit.date !== dateInput(editing.paidOn)) {
      changes.paidOn = new Date(`${edit.date}T12:00:00`).getTime()
    }

    setBusy(true)
    setEditError('')

    try {
      await onUpdatePayment(editing.id, changes)
      notifySuccess('Payment updated.')
      setEditing(null)
    } catch (err) {
      const message = err?.message || 'Could not update the payment.'
      setEditError(message)
      notifyError(message)
    } finally {
      setBusy(false)
    }
  }

  const removePayment = async (payment) => {
    const ok = await notifyConfirm(
      `Remove the ${rupees(payment.amount)} payment from ${payment.restaurantName}? Only this income entry is removed (revenue totals will change). The restaurant's plan stays as it is.`,
      'Delete payment?'
    )

    if (!ok) return

    try {
      await onDeletePayment(payment.id)
      notifySuccess('Payment deleted.')
    } catch (err) {
      notifyError(err?.message || 'Could not delete the payment.')
    }
  }

  const set = (key) => (value) =>
    setForm((old) => ({ ...old, [key]: value }))

  const minute = Math.floor(now / 60000)

  const data = useMemo(() => {
    const at = minute * 60000
    const all = rows || []
    const thisMonth = rowsInRange(all, 'month', at)
    const lastMonth = rowsInRange(all, 'lastMonth', at)
    const filtered = rowsInRange(all, range, at)

    return {
      total: sumRows(all),
      count: countRows(all),
      thisMonth: sumRows(thisMonth),
      lastMonth: sumRows(lastMonth),
      thisYear: sumRows(rowsInRange(all, 'year', at)),
      months: monthlyFromRows(all, at, 12),
      filteredTotal: sumRows(filtered),
      filteredCount: countRows(filtered),
      byType: groupRows(filtered, 'type', { labels: PAYMENT_TYPES }),
      byMethod: groupRows(filtered, 'method'),
      byPlan: groupRows(filtered, 'plan', { otherLabel: 'Other plans' }),
    }
  }, [rows, range, minute])

  const maxMonth = Math.max(...data.months.map((m) => m.total), 1)

  const expiringSoon = registry.filter((r) => {
    const status = getRestaurantStatus(r, now)
    return status === 'expiring' || status === 'expired'
  }).length

  const change = data.lastMonth
    ? Math.round(((data.thisMonth - data.lastMonth) / data.lastMonth) * 100)
    : null

  const submit = async (event) => {
    event.preventDefault()

    const amount = Number(form.amount)

    if (!form.restaurantId) {
      setError('Select a restaurant.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter an amount greater than 0.')
      return
    }

    setBusy(true)
    setError('')

    try {
      await onAddPayment({
        restaurantId: form.restaurantId,
        type: form.type,
        amount,
        method: form.method,
        note: form.note,
        paidOn: new Date(`${form.date}T12:00:00`).getTime() || Date.now(),
      })

      notifySuccess('Payment recorded.')
      setShowForm(false)
    } catch (err) {
      const message = err?.message || 'Could not save the payment.'
      setError(message)
      notifyError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold">Revenue</h2>
          <p className="mt-1 text-sm text-slate-500">
            Subscription payments received from restaurants. Payments stay here even after a restaurant is deleted.
          </p>
        </div>

        <Button
          onClick={() => {
            setForm(emptyForm())
            setError('')
            setShowForm(true)
          }}
          disabled={registry.length === 0}
          className="transition-transform duration-150 hover:scale-[1.02] active:scale-[0.99]"
        >
          <Plus size={15} />
          Record payment
        </Button>
      </div>

      {/* Stat Cards with Left Colored Border, Hover & Count-up */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AnimatedStatCard
          label="Total revenue"
          numericValue={data.total}
          isCurrency
          loading={!rows}
          sub={rows ? `${data.count} payments` : 'Loading'}
          icon={IndianRupee}
          tone="green"
        />
        <AnimatedStatCard
          label="This month"
          numericValue={data.thisMonth}
          isCurrency
          loading={!rows}
          sub={
            change === null
              ? `Last month ${rupees(data.lastMonth)}`
              : `${change >= 0 ? '+' : ''}${change}% vs last month (${rupees(data.lastMonth)})`
          }
          icon={CalendarDays}
          tone="orange"
        />
        <AnimatedStatCard
          label="This year"
          numericValue={data.thisYear}
          isCurrency
          loading={!rows}
          sub={`${new Date(now).getFullYear()}`}
          icon={TrendingUp}
          tone="blue"
        />
        <AnimatedStatCard
          label="Renewals due"
          numericValue={expiringSoon}
          sub="Expiring soon or expired"
          icon={ReceiptText}
          tone="purple"
        />
      </div>

      {/* Monthly chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:border-slate-300 hover:shadow-md">
        <div className="mb-4 font-bold text-slate-800">Monthly revenue (last 12 months)</div>

        <div className="flex h-44 items-end gap-2 overflow-x-auto">
          {data.months.map((m) => (
            <div
              key={m.key}
              className="group flex h-full min-w-[34px] flex-1 flex-col items-center justify-end gap-1 rounded-lg px-0.5 py-1 transition-colors duration-150 hover:bg-orange-50/60"
              title={`${m.label}: ${rupees(m.total)}`}
            >
              <span className="text-[10px] font-semibold text-slate-500 transition-colors group-hover:text-orange-600">
                {m.total ? rupees(m.total) : ''}
              </span>
              <div
                className={`w-full origin-bottom rounded-t-md transition-all duration-200 group-hover:scale-x-105 group-hover:brightness-95 ${
                  m.current ? 'bg-orange-500' : 'bg-orange-300'
                }`}
                style={{
                  height: `${m.total ? Math.max(4, (m.total / maxMonth) * 100) : 2}%`,
                  opacity: m.total ? 1 : 0.25,
                }}
              />
              <span className="text-[10px] text-slate-500 transition-colors group-hover:font-semibold group-hover:text-slate-800">
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Range filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          {rows ? (
            <>
              Showing <b>{rupees(data.filteredTotal)}</b> from {data.filteredCount} payments
            </>
          ) : (
            'Loading revenue…'
          )}
        </div>

        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm transition-all duration-200 hover:border-orange-400 hover:shadow-sm focus:border-orange-400 focus:outline-none"
        >
          {RANGE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Breakdown charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="By reason" items={data.byType} total={data.filteredTotal} color="bg-orange-500" />
        <ChartCard title="By payment method" items={data.byMethod} total={data.filteredTotal} color="bg-emerald-500" />
        <ChartCard title="By plan" items={data.byPlan} total={data.filteredTotal} color="bg-blue-500" />
      </div>

      {/* Recent payments */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:border-slate-300 hover:shadow-md">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="font-bold text-slate-800">Recent payments</div>
          <div className="text-xs text-slate-500">The last 10 payments. Edit or delete one if it was entered wrongly.</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                {['Date', 'Restaurant', 'Reason', 'Method', 'Amount', ''].map((heading, i) => (
                  <th className="px-5 py-3" key={`${heading}-${i}`}>{heading}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {(recent || []).map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-slate-100 align-top transition-colors duration-150 hover:bg-orange-50/40"
                >
                  <td className="px-5 py-3 text-xs">{formatDate(p.paidOn)}</td>
                  <td className="px-5 py-3">
                    <div className="font-bold text-slate-800">{p.restaurantName}</div>
                    <div className="text-xs text-slate-400">
                      {p.plan}
                      {p.note ? ` · ${p.note}` : ''}
                    </div>
                  </td>
                  <td className="px-5 py-3">{PAYMENT_TYPES[p.type] || 'Other'}</td>
                  <td className="px-5 py-3">{p.method}</td>
                  <td className="px-5 py-3 font-bold text-slate-900">{rupees(p.amount)}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="rounded-lg p-2 text-slate-400 transition-all duration-150 hover:scale-105 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Edit payment"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePayment(p)}
                        className="rounded-lg p-2 text-slate-400 transition-all duration-150 hover:scale-105 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Delete payment"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {recent === null && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">Loading…</td>
                </tr>
              )}

              {recent !== null && recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    No payments yet. They appear when you register, renew or record a payment with an amount.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && edit && (
        <Modal
          title="Edit payment"
          subtitle={editing.restaurantName}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={submitEdit} className="grid gap-3 md:grid-cols-2">
            <Field
              label="Amount received (₹)"
              value={edit.amount}
              onChange={setEditField('amount')}
              inputMode="decimal"
            />

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">Reason</span>
              <select
                value={edit.type}
                onChange={(e) => setEditField('type')(e.target.value)}
                className={selectClass}
              >
                {Object.entries(PAYMENT_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">Payment method</span>
              <select
                value={edit.method}
                onChange={(e) => setEditField('method')(e.target.value)}
                className={selectClass}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </label>

            <Field
              label="Date received"
              type="date"
              value={edit.date}
              onChange={setEditField('date')}
            />

            <div className="md:col-span-2">
              <Field
                label="Note (optional)"
                value={edit.note}
                onChange={setEditField('note')}
              />
            </div>

            <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 md:col-span-2">
              Changing a payment only changes your income record. It does not change the restaurant's plan.
            </p>

            {editError && (
              <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 md:col-span-2">{editError}</p>
            )}

            <div className="flex justify-end gap-2 md:col-span-2">
              <Button variant="secondary" onClick={() => setEditing(null)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {showForm && (
        <Modal
          title="Record payment"
          subtitle="Add a payment received outside register / renew (for example a lifetime upgrade)"
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            <label className="block space-y-1.5 md:col-span-2">
              <span className="text-xs font-semibold text-slate-600">
                Restaurant
              </span>
              <select
                value={form.restaurantId}
                onChange={(e) => set('restaurantId')(e.target.value)}
                className={selectClass}
              >
                <option value="">Select restaurant</option>
                {registry.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>

            <Field
              label="Amount received (₹)"
              value={form.amount}
              onChange={set('amount')}
              placeholder="e.g. 19999"
              inputMode="decimal"
            />

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">
                Reason
              </span>
              <select
                value={form.type}
                onChange={(e) => set('type')(e.target.value)}
                className={selectClass}
              >
                {Object.entries(PAYMENT_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">
                Payment method
              </span>
              <select
                value={form.method}
                onChange={(e) => set('method')(e.target.value)}
                className={selectClass}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </label>

            <Field
              label="Date received"
              type="date"
              value={form.date}
              onChange={set('date')}
            />

            <div className="md:col-span-2">
              <Field
                label="Note (optional)"
                value={form.note}
                onChange={set('note')}
                placeholder="e.g. upgraded to lifetime"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 md:col-span-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 md:col-span-2">
              <Button variant="secondary" onClick={() => setShowForm(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving...' : 'Save payment'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}