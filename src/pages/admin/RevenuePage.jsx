import { useMemo, useState } from 'react'
import {
  IndianRupee,
  CalendarDays,
  TrendingUp,
  ReceiptText,
  Plus,
  Trash2,
} from 'lucide-react'

import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import StatCard from '@/components/dashboard/StatCard'
import BarRow from '@/components/dashboard/BarRow'

import { formatDate, getRestaurantStatus, planLabel } from '@/lib/registry'
import { notifyConfirm, notifyError, notifySuccess } from '@/lib/toast'

import {
  PAYMENT_METHODS,
  PAYMENT_TYPES,
  RANGE_OPTIONS,
  groupTotals,
  inRange,
  monthlyTotals,
  rupees,
  sumAmount,
} from '@/lib/revenue'

const selectClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm'

const todayInput = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const emptyForm = () => ({
  restaurantId: '',
  type: 'other',
  amount: '',
  method: 'UPI',
  date: todayInput(),
  note: '',
})

export default function RevenuePage({
  registry,
  payments,
  now,
  onAddPayment,
  onDeletePayment,
}) {
  const [range, setRange] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const set = (key) => (value) =>
    setForm((old) => ({ ...old, [key]: value }))

  const stats = useMemo(() => {
    const thisMonth = sumAmount(payments.filter((p) => inRange(p, 'month', now)))
    const lastMonth = sumAmount(payments.filter((p) => inRange(p, 'lastMonth', now)))
    const thisYear = sumAmount(payments.filter((p) => inRange(p, 'year', now)))

    return {
      total: sumAmount(payments),
      thisMonth,
      lastMonth,
      thisYear,
      months: monthlyTotals(payments, now, 12),
    }
  }, [payments, now])

  const filtered = useMemo(
    () => payments.filter((p) => inRange(p, range, now)),
    [payments, range, now]
  )

  const byPlan = groupTotals(filtered, 'plan')
  const byMethod = groupTotals(filtered, 'method')
  const filteredTotal = sumAmount(filtered)
  const maxMonth = Math.max(...stats.months.map((m) => m.total), 1)

  const expiringSoon = registry.filter((r) => {
    const status = getRestaurantStatus(r, now)
    return status === 'expiring' || status === 'expired'
  }).length

  const sorted = [...filtered].sort((a, b) => b.paidOn - a.paidOn)

  const submit = (event) => {
    event.preventDefault()

    const restaurant = registry.find((r) => r.id === form.restaurantId)
    const amount = Number(form.amount)

    if (!restaurant) {
      setError('Select a restaurant.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter an amount greater than 0.')
      return
    }

    onAddPayment({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      type: form.type,
      plan: planLabel(restaurant),
      amount,
      method: form.method,
      note: form.note,
      paidOn: new Date(`${form.date}T12:00:00`).getTime() || Date.now(),
    })

    notifySuccess('Payment recorded.')
    setShowForm(false)
  }

  const remove = async (payment) => {
    const ok = await notifyConfirm(
      `Remove the ${rupees(payment.amount)} payment from ${payment.restaurantName}? This changes your revenue totals.`,
      'Delete payment?'
    )

    if (!ok) return

    try {
      onDeletePayment(payment.id)
      notifySuccess('Payment deleted.')
    } catch (err) {
      notifyError(err?.message || 'Could not delete the payment.')
    }
  }

  const change = stats.lastMonth
    ? Math.round(((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100)
    : null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold">Revenue</h2>
          <p className="mt-1 text-sm text-slate-500">
            Subscription payments received from restaurants.
          </p>
        </div>

        <Button
          onClick={() => {
            setForm(emptyForm())
            setError('')
            setShowForm(true)
          }}
          disabled={registry.length === 0}
        >
          <Plus size={15} />
          Record payment
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total revenue"
          value={rupees(stats.total)}
          sub={`${payments.length} payments`}
          icon={IndianRupee}
          tone="green"
        />
        <StatCard
          label="This month"
          value={rupees(stats.thisMonth)}
          sub={
            change === null
              ? `Last month ${rupees(stats.lastMonth)}`
              : `${change >= 0 ? '+' : ''}${change}% vs last month (${rupees(stats.lastMonth)})`
          }
          icon={CalendarDays}
          tone="orange"
        />
        <StatCard
          label="This year"
          value={rupees(stats.thisYear)}
          sub={`${new Date(now).getFullYear()}`}
          icon={TrendingUp}
          tone="blue"
        />
        <StatCard
          label="Renewals due"
          value={expiringSoon}
          sub="Expiring soon or expired"
          icon={ReceiptText}
          tone="purple"
        />
      </div>

      {/* Monthly chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 font-bold">Monthly revenue (last 12 months)</div>

        <div className="flex h-44 items-end gap-2 overflow-x-auto">
          {stats.months.map((m) => (
            <div
              key={m.key}
              className="flex h-full min-w-[34px] flex-1 flex-col items-center justify-end gap-1"
              title={`${m.label}: ${rupees(m.total)}`}
            >
              <span className="text-[10px] font-semibold text-slate-500">
                {m.total ? rupees(m.total) : ''}
              </span>
              <div
                className={`w-full rounded-t-md ${m.current ? 'bg-orange-500' : 'bg-orange-300'}`}
                style={{
                  height: `${m.total ? Math.max(4, (m.total / maxMonth) * 100) : 2}%`,
                  opacity: m.total ? 1 : 0.25,
                }}
              />
              <span className="text-[10px] text-slate-500">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Range filter + breakdowns */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          Showing <b>{rupees(filteredTotal)}</b> from {filtered.length} payments
        </div>

        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
        >
          {RANGE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="font-bold">By plan</div>
          {byPlan.length === 0 && (
            <p className="text-sm text-slate-500">No payments in this period.</p>
          )}
          {byPlan.map(([label, total]) => (
            <BarRow
              key={label}
              label={label}
              value={rupees(total)}
              percent={filteredTotal ? (total / filteredTotal) * 100 : 0}
            />
          ))}
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="font-bold">By payment method</div>
          {byMethod.length === 0 && (
            <p className="text-sm text-slate-500">No payments in this period.</p>
          )}
          {byMethod.map(([label, total]) => (
            <BarRow
              key={label}
              label={label}
              value={rupees(total)}
              percent={filteredTotal ? (total / filteredTotal) * 100 : 0}
              color="bg-emerald-500"
            />
          ))}
        </div>
      </div>

      {/* Payments table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              {['Date', 'Restaurant', 'Reason', 'Plan', 'Method', 'Amount', ''].map(
                (heading, i) => (
                  <th className="px-5 py-4" key={`${heading}-${i}`}>
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {sorted.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 align-top">
                <td className="px-5 py-4 text-xs">{formatDate(p.paidOn)}</td>
                <td className="px-5 py-4">
                  <div className="font-bold">{p.restaurantName}</div>
                  {p.note && (
                    <div className="text-xs text-slate-400">{p.note}</div>
                  )}
                </td>
                <td className="px-5 py-4">{PAYMENT_TYPES[p.type] || 'Other'}</td>
                <td className="px-5 py-4">{p.plan || '—'}</td>
                <td className="px-5 py-4">{p.method}</td>
                <td className="px-5 py-4 font-bold">{rupees(p.amount)}</td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => remove(p)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Delete payment"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}

            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                  No payments recorded yet. Payments are added when you register
                  or renew a restaurant with an amount.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit">Save payment</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}