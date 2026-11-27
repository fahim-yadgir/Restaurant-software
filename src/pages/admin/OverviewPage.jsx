import { useMemo } from 'react'
import {
  Store,
  BadgeCheck,
  Clock3,
  TriangleAlert,
  IndianRupee,
  TrendingUp,
  CalendarClock,
} from 'lucide-react'

import StatusBadge from '@/components/admin/StatusBadge'
import Button from '@/components/ui/Button'
import StatCard from '@/components/dashboard/StatCard'
import BarRow from '@/components/dashboard/BarRow'

import { getRestaurantStatus, formatDate, formatRemaining, isLifetime } from '@/lib/registry'
import {
  PAYMENT_TYPES,
  countRows,
  monthlyFromRows,
  rowsInRange,
  rupees,
  sumRows,
} from '@/lib/revenue'

const ATTENTION_LIMIT = 8

// Most urgent first: about to expire, then expired, then never logged in.
const ATTENTION_ORDER = { expiring: 0, expired: 1, pending: 2 }

const BOX_HOVER = 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md'

// registry = active restaurants. revenue = { rows, recent } or null while it loads.
export default function OverviewPage({ registry, revenue, now, onOpenRestaurants, onOpenRevenue }) {
  const minute = Math.floor(now / 60000)

  const data = useMemo(() => {
    const at = minute * 60000
    const items = registry.map((r) => ({ r, status: getRestaurantStatus(r, at) }))
    const countOf = (status) => items.filter((x) => x.status === status).length

    const attention = items
      .filter((x) => x.status !== 'active')
      .sort((a, b) => {
        if (a.status !== b.status) return ATTENTION_ORDER[a.status] - ATTENTION_ORDER[b.status]
        if (a.status === 'expiring') return a.r.expiresAt - b.r.expiresAt
        if (a.status === 'expired') return b.r.expiresAt - a.r.expiresAt

        return b.r.createdAt - a.r.createdAt
      })

    const rows = revenue ? revenue.rows : null
    const thisMonth = rows ? sumRows(rowsInRange(rows, 'month', at)) : 0
    const lastMonth = rows ? sumRows(rowsInRange(rows, 'lastMonth', at)) : 0

    return {
      total: registry.length,
      lifetime: registry.filter(isLifetime).length,
      active: countOf('active'),
      expiring: countOf('expiring'),
      expired: countOf('expired'),
      pending: countOf('pending'),
      attention,
      loaded: !!rows,
      thisMonth,
      lastMonth,
      change: lastMonth ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null,
      revenueTotal: rows ? sumRows(rows) : 0,
      paymentCount: rows ? countRows(rows) : 0,
      months: monthlyFromRows(rows || [], at, 6),
    }
  }, [registry, revenue, minute])

  const maxMonth = Math.max(...data.months.map((m) => m.total), 1)
  const percentOf = (n) => (data.total ? (n / data.total) * 100 : 0)

  const statusBars = [
    ['Active', data.active, 'bg-emerald-500'],
    ['Expiring soon (7 days or less)', data.expiring, 'bg-amber-500'],
    ['Expired', data.expired, 'bg-rose-500'],
    ['Awaiting first login', data.pending, 'bg-slate-400'],
  ]

  const latest = revenue ? revenue.recent.slice(0, 5) : []

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold">Software admin</h2>
          <p className="mt-1 text-sm text-slate-500">
            Overview of every registered restaurant, its subscription and your income.
          </p>
        </div>

        <Button onClick={onOpenRestaurants}>Register a restaurant</Button>
      </div>

      {/* Restaurants */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={`rounded-2xl border-l-4 border-l-blue-500 ${BOX_HOVER}`}>
          <StatCard
            label="Registered restaurants"
            value={data.total}
            sub={data.lifetime ? `${data.lifetime} on lifetime plan` : 'Deleted ones are not counted'}
            icon={Store}
            tone="blue"
          />
        </div>
        <div className={`rounded-2xl border-l-4 border-l-emerald-500 ${BOX_HOVER}`}>
          <StatCard
            label="Active subscriptions"
            value={data.active + data.expiring}
            sub={`${data.expiring} expiring soon`}
            icon={BadgeCheck}
            tone="green"
          />
        </div>
        <div className={`rounded-2xl border-l-4 border-l-purple-500 ${BOX_HOVER}`}>
          <StatCard
            label="Awaiting first login"
            value={data.pending}
            sub="Plan starts at the first login"
            icon={Clock3}
            tone="purple"
          />
        </div>
        <div className={`rounded-2xl border-l-4 border-l-orange-500 ${BOX_HOVER}`}>
          <StatCard
            label="Expired"
            value={data.expired}
            sub="Need renewal"
            icon={TriangleAlert}
            tone="orange"
          />
        </div>
      </div>

      {/* Income */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={`rounded-2xl border-l-4 border-l-emerald-500 ${BOX_HOVER}`}>
          <StatCard
            label="Income this month"
            value={data.loaded ? rupees(data.thisMonth) : '…'}
            sub={
              !data.loaded
                ? 'Loading'
                : data.change === null
                  ? `Last month ${rupees(data.lastMonth)}`
                  : `${data.change >= 0 ? '+' : ''}${data.change}% vs last month (${rupees(data.lastMonth)})`
            }
            icon={IndianRupee}
            tone="green"
          />
        </div>
        <div className={`rounded-2xl border-l-4 border-l-blue-500 ${BOX_HOVER}`}>
          <StatCard
            label="Total revenue"
            value={data.loaded ? rupees(data.revenueTotal) : '…'}
            sub={data.loaded ? `${data.paymentCount} payments` : 'Loading'}
            icon={TrendingUp}
            tone="blue"
          />
        </div>
        <div className={`rounded-2xl border-l-4 border-l-amber-500 ${BOX_HOVER}`}>
          <StatCard
            label="Renewals due soon"
            value={data.expiring}
            sub="Expiring within 7 days"
            icon={CalendarClock}
            tone="orange"
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div
          className={`space-y-4 rounded-2xl border border-slate-200 border-l-4 border-l-indigo-500 bg-white p-5 hover:border-slate-300 ${BOX_HOVER}`}
        >
          <div className="font-bold">Restaurants by status</div>

          {data.total === 0 && <p className="text-sm text-slate-500">No restaurants registered yet.</p>}

          {data.total > 0 &&
            statusBars.map(([label, count, color]) => (
              <BarRow key={label} label={label} value={count} percent={percentOf(count)} color={color} />
            ))}
        </div>

        <div
          className={`rounded-2xl border border-slate-200 border-l-4 border-l-orange-500 bg-white p-5 hover:border-slate-300 ${BOX_HOVER}`}
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="font-bold">Income, last 6 months</div>

            <button
              type="button"
              onClick={onOpenRevenue}
              className="text-xs font-semibold text-orange-600 transition-colors hover:text-orange-700 hover:underline"
            >
              Open revenue
            </button>
          </div>

          <div className="flex h-40 items-end gap-3">
            {data.months.map((m) => (
              <div
                key={m.key}
                className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
                title={`${m.label}: ${rupees(m.total)}`}
              >
                <span className="text-[10px] font-semibold text-slate-500 transition-colors group-hover:text-slate-800">
                  {m.total ? rupees(m.total) : ''}
                </span>

                <div
                  className={`w-full rounded-t-md transition-all duration-200 group-hover:brightness-95 ${
                    m.current ? 'bg-orange-500' : 'bg-orange-300'
                  }`}
                  style={{
                    height: `${m.total ? Math.max(4, (m.total / maxMonth) * 100) : 2}%`,
                    opacity: m.total ? 1 : 0.25,
                  }}
                />

                <span className="text-[10px] text-slate-500 transition-colors group-hover:text-slate-800">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Needs attention */}
      <div
        className={`overflow-hidden rounded-2xl border border-slate-200 border-l-4 border-l-rose-500 bg-white hover:border-slate-300 ${BOX_HOVER}`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="font-bold">Needs attention</div>

          {data.attention.length > ATTENTION_LIMIT && (
            <button
              type="button"
              onClick={onOpenRestaurants}
              className="text-xs font-semibold text-orange-600 transition-colors hover:text-orange-700 hover:underline"
            >
              View all {data.attention.length}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <tbody>
              {data.attention.slice(0, ATTENTION_LIMIT).map(({ r, status }) => (
                <tr
                  key={r.id}
                  className="border-t border-slate-100 transition-colors first:border-0 hover:bg-slate-50/90"
                >
                  <td className="px-5 py-4 font-bold">
                    {r.name}
                    <div className="text-xs font-normal text-slate-500">
                      {r.ownerName} · {r.mobile}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge status={status} />
                  </td>

                  <td className="px-5 py-4 text-xs text-slate-500">
                    {r.activatedAt
                      ? `${formatDate(r.expiresAt)} · ${formatRemaining(r.expiresAt, now)}`
                      : 'Not logged in yet'}
                  </td>
                </tr>
              ))}

              {data.attention.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500">
                    {registry.length ? 'All restaurants are active.' : 'No restaurants registered yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Latest payments */}
      <div
        className={`overflow-hidden rounded-2xl border border-slate-200 border-l-4 border-l-emerald-500 bg-white hover:border-slate-300 ${BOX_HOVER}`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="font-bold">Latest payments</div>

          <button
            type="button"
            onClick={onOpenRevenue}
            className="text-xs font-semibold text-orange-600 transition-colors hover:text-orange-700 hover:underline"
          >
            Edit or add payments
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {latest.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm transition-colors hover:bg-slate-50/90"
            >
              <div>
                <div className="font-bold">{p.restaurantName}</div>
                <div className="text-xs text-slate-500">
                  {PAYMENT_TYPES[p.type] || 'Other'} · {p.method} · {formatDate(p.paidOn)}
                </div>
              </div>

              <div className="font-bold">{rupees(p.amount)}</div>
            </div>
          ))}

          {!revenue && <p className="px-5 py-6 text-center text-sm text-slate-500">Loading…</p>}

          {revenue && latest.length === 0 && (
            <p className="px-5 py-6 text-center text-sm text-slate-500">No payments yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}