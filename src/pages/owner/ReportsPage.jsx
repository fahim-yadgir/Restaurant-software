
import { useState, useMemo } from 'react'
import {
  Search,
  GripVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

import { money } from '@/lib/format'
import { summarize } from '@/lib/pigmy'

import BarRow from '@/components/dashboard/BarRow'

import {
  PERIODS,
  periodRange,
  inRange,
  summarizeBills,
  summarizeExpenses,
  monthlySeries,
  compactMoney,
  pct,
} from '@/lib/stats'

const card = 'rounded-2xl border border-slate-200 bg-white p-5'

const empty = text => (
  <p className="py-6 text-center text-sm text-slate-400">
    {text}
  </p>
)

const GST_COLUMNS = [
  { key: 'rate', label: 'GST Slab' },
  { key: 'taxable', label: 'Taxable Value' },
  { key: 'cgst', label: 'CGST' },
  { key: 'sgst', label: 'SGST' },
  { key: 'tax', label: 'Total GST' },
]

export default function ReportsPage({
  bills = [],
  expenses = [],
  pigmy = [],
  pigmyEntries = [],
}) {
  const [period, setPeriod] = useState('month')

  // GST search and filter
  const [gstSearch, setGstSearch] = useState('')
  const [gstFilter, setGstFilter] = useState('All')

  // GST column sorting
  const [gstSort, setGstSort] = useState({
    key: null,
    direction: null,
  })

  // GST column arrangement
  const [gstColumnOrder, setGstColumnOrder] = useState([
    'rate',
    'taxable',
    'cgst',
    'sgst',
    'tax',
  ])

  const [gstDraggedColumn, setGstDraggedColumn] = useState(null)

  const label = PERIODS.find(p => p[0] === period)?.[1] || 'This month'
  const range = periodRange(period)

  const fBills = bills.filter(b => inRange(b.date, range))
  const fExp = expenses.filter(e => inRange(e.date, range))

  const sales = summarizeBills(fBills)
  const spent = summarizeExpenses(fExp)

  const profit = sales.taxable - spent.total
  const undated = bills.filter(b => !b.date).length

  const series = monthlySeries(bills, expenses, 6)

  const chartMax = Math.max(
    0,
    ...series.flatMap(m => [m.sales, m.expenses])
  )

  const bar = v =>
    chartMax > 0
      ? Math.max(v > 0 ? 2 : 0, (v / chartMax) * 100)
      : 0

  // GST slab data
  const slabs = Object.entries(sales.bySlab)
    .map(([rate, value]) => ({
      rate: Number(rate),
      ...value,
    }))
    .sort((a, b) => a.rate - b.rate)

  const gstTabs = [
    'All',
    ...slabs.map(s => `${s.rate}%`),
  ]

  // Search, filter and sort GST records
  const filteredSlabs = useMemo(() => {
    const query = gstSearch.trim().toLowerCase()

    let result = slabs.filter(s => {
      const matchesTab =
        gstFilter === 'All' ||
        `${s.rate}%` === gstFilter

      const matchesSearch =
        !query ||
        `${s.rate}%`.toLowerCase().includes(query) ||
        String(s.taxable).includes(query) ||
        String(s.tax).includes(query)

      return matchesTab && matchesSearch
    })

    if (gstSort.key && gstSort.direction) {
      result = [...result].sort((a, b) => {
        const getValue = row => {
          switch (gstSort.key) {
            case 'rate':
              return row.rate

            case 'taxable':
              return row.taxable

            case 'cgst':
            case 'sgst':
              return row.tax / 2

            case 'tax':
              return row.tax

            default:
              return 0
          }
        }

        const comparison = getValue(a) - getValue(b)

        return gstSort.direction === 'desc'
          ? -comparison
          : comparison
      })
    }

    return result
  }, [slabs, gstSearch, gstFilter, gstSort])

  // Ascending -> Descending -> Default
  const sortGstColumn = key => {
    setGstSort(current => {
      if (current.key !== key) {
        return {
          key,
          direction: 'asc',
        }
      }

      if (current.direction === 'asc') {
        return {
          key,
          direction: 'desc',
        }
      }

      return {
        key: null,
        direction: null,
      }
    })
  }

  // Drag and drop GST columns
  const moveGstColumn = targetKey => {
    if (
      !gstDraggedColumn ||
      gstDraggedColumn === targetKey
    ) {
      setGstDraggedColumn(null)
      return
    }

    setGstColumnOrder(current => {
      const next = [...current]

      const fromIndex = next.indexOf(gstDraggedColumn)
      const toIndex = next.indexOf(targetKey)

      if (fromIndex === -1 || toIndex === -1) {
        return current
      }

      next.splice(fromIndex, 1)
      next.splice(toIndex, 0, gstDraggedColumn)

      return next
    })

    setGstDraggedColumn(null)
  }

  const payments = Object.entries(sales.byPayment)
    .sort((a, b) => b[1] - a[1])

  const categories = Object.entries(spent.byCategory)
    .sort((a, b) => b[1] - a[1])

  const topItems = Object.values(sales.items)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  const sums = pigmy.map(a => summarize(a, pigmyEntries))

  const bankBalance = sums.reduce(
    (t, s) => t + s.balance,
    0
  )

  const paidFromAccounts = fExp
    .filter(e => e.accountId)
    .reduce((t, e) => t + Number(e.amount || 0), 0)

  const receivedInAccounts = fBills
    .filter(b => b.accountId)
    .reduce((t, b) => t + Number(b.total || 0), 0)

  // Export report CSV
  const exportCsv = () => {
    const rows = [
      ['Report period', label],
      [],
      ['Summary', 'Amount'],
      ['Bills', sales.count],
      ['Gross sales (incl. GST)', sales.gross],
      ['Sales excl. GST', sales.taxable],
      ['Discounts given', sales.discount],
      ['Total expenses', spent.total],
      ['Net operating profit', profit],
      [],
      ['GST slab', 'Taxable value', 'CGST', 'SGST', 'Total GST'],
      ...slabs.map(s => [
        `${s.rate}%`,
        s.taxable.toFixed(2),
        (s.tax / 2).toFixed(2),
        (s.tax / 2).toFixed(2),
        s.tax.toFixed(2),
      ]),
      [],
      ['Payment method', 'Amount'],
      ...payments,
      [],
      ['Expense category', 'Amount'],
      ...categories,
      [],
      ['Dish', 'Qty sold', 'Sales'],
      ...Object.values(sales.items)
        .sort((a, b) => b.amount - a.amount)
        .map(d => [d.name, d.qty, d.amount]),
    ]

    const csv = rows
      .map(r =>
        r
          .map(c => `"${String(c).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n')

    const a = document.createElement('a')

    a.href = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv' })
    )

    a.download = `restrodesk-report-${period}.csv`
    a.click()

    URL.revokeObjectURL(a.href)
  }

  // GST heading sort icon
  const getGstSortIcon = key => {
    if (gstSort.key !== key) {
      return (
        <ArrowUpDown
          size={15}
          className="shrink-0 text-slate-400"
        />
      )
    }

    if (gstSort.direction === 'asc') {
      return (
        <ArrowUp
          size={15}
          className="shrink-0 text-indigo-700"
        />
      )
    }

    return (
      <ArrowDown
        size={15}
        className="shrink-0 text-indigo-700"
      />
    )
  }

  // GST table cell
  const renderGstCell = (slab, key) => {
    switch (key) {
      case 'rate':
        return <b>{slab.rate}%</b>

      case 'taxable':
        return money(slab.taxable)

      case 'cgst':
        return money(slab.tax / 2)

      case 'sgst':
        return money(slab.tax / 2)

      case 'tax':
        return (
          <b className="text-slate-900">
            {money(slab.tax)}
          </b>
        )

      default:
        return '—'
    }
  }

  return (
    <div className="space-y-5">

      {/* Page heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold">
            Sales analytics, P&L & GST
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Calculated from your saved bills, expenses, staff payments and bank entries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold"
          >
            {PERIODS.map(([key, text]) => (
              <option key={key} value={key}>
                {text}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={exportCsv}
            className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600"
          >
            Export CA CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            'Gross sales (incl. GST)',
            money(sales.gross),
            `${sales.count} bills`,
            '',
          ],
          [
            'Sales excl. GST',
            money(sales.taxable),
            `Discounts given ${money(sales.discount)}`,
            '',
          ],
          [
            'Expenses & purchases',
            money(spent.total),
            `${spent.count} entries`,
            '',
          ],
          [
            'Net operating profit',
            money(profit),
            'Sales excl. GST minus expenses',
            profit < 0 ? 'text-rose-600' : 'text-emerald-600',
          ],
        ].map(([title, value, sub, tone]) => (
          <div key={title} className={card}>
            <div className="text-sm text-slate-500">
              {title}
            </div>

            <div className={`mt-3 font-display text-2xl font-extrabold ${tone}`}>
              {value}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Sales and GST summary */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={card}>
          <h3 className="font-bold">
            Monthly sales vs expenses
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Last 6 months · sales excl. GST
          </p>

          {chartMax === 0 ? (
            empty('No sales or expenses in the last 6 months')
          ) : (
            <>
              <div className="mt-5 flex justify-around gap-2 border-b border-slate-200 pb-1">
                {series.map(m => (
                  <div
                    key={m.key}
                    className="flex flex-1 items-end justify-center gap-1"
                  >
                    <div className="flex h-44 items-end gap-1">
                      <div
                        title={`Sales ${money(m.sales)}`}
                        style={{ height: `${bar(m.sales)}%` }}
                        className="w-4 rounded-t-md bg-orange-500 sm:w-6"
                      />

                      <div
                        title={`Expenses ${money(m.expenses)}`}
                        style={{ height: `${bar(m.expenses)}%` }}
                        className="w-4 rounded-t-md bg-slate-300 sm:w-6"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex justify-around gap-2 text-center">
                {series.map(m => (
                  <div
                    key={m.key}
                    className="flex-1 text-[11px] text-slate-500"
                  >
                    <div className="font-semibold text-slate-700">
                      {m.label}
                    </div>

                    <div>{compactMoney(m.sales)}</div>

                    <div className="text-slate-400">
                      {compactMoney(m.expenses)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-4 text-xs text-slate-500">
                <span>🟠 Sales</span>
                <span>▪ Expenses</span>
              </div>
            </>
          )}
        </div>

        <div className={card}>
          <h3 className="font-bold">
            GST & payment summary
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            {label}
          </p>

          <div className="mt-4 space-y-3 text-sm">
            {[
              ['GST collected (CGST + SGST)', sales.gst],
              ['CGST', sales.gst / 2],
              ['SGST', sales.gst / 2],
              ['Taxable sales value', sales.taxable],
            ].map(([title, value]) => (
              <div
                key={title}
                className="flex justify-between border-b border-slate-100 pb-3"
              >
                <span className="text-slate-500">
                  {title}
                </span>

                <b>{money(value)}</b>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-4">
            {payments.length === 0
              ? empty('No sales in this period')
              : payments.map(([method, value]) => (
                  <BarRow
                    key={method}
                    label={method}
                    value={`${pct(value, sales.gross)}% · ${money(value)}`}
                    percent={pct(value, sales.gross)}
                  />
                ))}
          </div>
        </div>
      </div>

      {/* GST table */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">
              GST by slab
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              GST calculation based on the selected report period.
            </p>
          </div>

          <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-900">
            {filteredSlabs.length} GST slabs
          </span>
        </div>

        {/* GST search */}
        <div className="relative mt-4">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            value={gstSearch}
            onChange={e => setGstSearch(e.target.value)}
            placeholder="Search GST slab or amount..."
            className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>

        {/* GST filter tabs */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {gstTabs.map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setGstFilter(tab)}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                gstFilter === tab
                  ? 'bg-indigo-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab === 'All'
                ? `All - ${slabs.length}`
                : tab}
            </button>
          ))}
        </div>

        {/* GST data table */}
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left text-sm">

              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600">
                <tr>
                  {/* Fixed serial number column */}
                  <th className="whitespace-nowrap border-b border-r border-slate-200 px-4 py-4 text-center">
                    Sr. No.
                  </th>

                  {gstColumnOrder.map(key => {
                    const column = GST_COLUMNS.find(
                      item => item.key === key
                    )

                    if (!column) return null

                    return (
                      <th
                        key={key}
                        draggable
                        onDragStart={() => setGstDraggedColumn(key)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => moveGstColumn(key)}
                        onDragEnd={() => setGstDraggedColumn(null)}
                        className={`whitespace-nowrap border-b border-r border-slate-200 px-4 py-4 last:border-r-0 ${
                          gstDraggedColumn === key
                            ? 'bg-indigo-100 opacity-50'
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">

                          {/* Drag handle */}
                          <GripVertical
                            size={17}
                            className="shrink-0 cursor-grab text-slate-400 active:cursor-grabbing"
                          />

                          {/* Sort button */}
                          <button
                            type="button"
                            onClick={() => sortGstColumn(key)}
                            className="flex items-center gap-2 whitespace-nowrap"
                            title="Click to sort ascending or descending"
                          >
                            {column.label}

                            {getGstSortIcon(key)}
                          </button>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>

              <tbody>
                {filteredSlabs.map((slab, index) => (
                  <tr
                    key={slab.rate}
                    className="border-b border-slate-100 transition hover:bg-slate-50"
                  >
                    <td className="border-r border-slate-100 px-4 py-4 text-center text-slate-500">
                      {index + 1}
                    </td>

                    {gstColumnOrder.map(key => (
                      <td
                        key={key}
                        className="border-r border-slate-100 px-4 py-4 last:border-r-0"
                      >
                        {renderGstCell(slab, key)}
                      </td>
                    ))}
                  </tr>
                ))}

                {filteredSlabs.length === 0 && (
                  <tr>
                    <td
                      colSpan={gstColumnOrder.length + 1}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      {gstSearch || gstFilter !== 'All'
                        ? 'No matching GST records found.'
                        : 'No GST records for this period.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <GripVertical size={14} />
              Drag the six-dot handle to move columns.
            </span>

            <span className="mx-2">·</span>

            Click a column heading to sort ascending, descending or reset.

            <span className="mx-2">·</span>

            Scroll horizontally on mobile.
          </div>
        </div>
      </div>

      {/* Expenses by category */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={card}>
          <h3 className="font-bold">
            Expenses by category
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Includes salary and advances paid from the Staff page.
          </p>

          <div className="mt-5 space-y-4">
            {categories.length === 0
              ? empty('No expenses in this period')
              : categories.map(([category, value]) => (
                  <BarRow
                    key={category}
                    label={category}
                    value={`${pct(value, spent.total)}% · ${money(value)}`}
                    percent={pct(value, spent.total)}
                    color="bg-slate-400"
                  />
                ))}
          </div>
        </div>

        <div className={card}>
          <h3 className="font-bold">
            Top selling dishes
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            By sales value · {label}
          </p>

          <div className="mt-4 space-y-3">
            {topItems.length === 0
              ? empty('No dishes sold in this period')
              : topItems.map((dish, index) => (
                  <div
                    key={dish.name}
                    className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 text-sm"
                  >
                    <span className="truncate">
                      <b className="mr-2 text-slate-400">
                        {index + 1}
                      </b>

                      {dish.name}
                    </span>

                    <span className="shrink-0 text-right">
                      <b>{money(dish.amount)}</b>

                      <span className="ml-2 text-xs text-slate-500">
                        × {dish.qty}
                      </span>
                    </span>
                  </div>
                ))}
          </div>
        </div>
      </div>

      {/* Bank and Pigmy */}
      <div className={card}>
        <h3 className="font-bold">
          Bank & pigmy accounts
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          Balances as of now · money moved in {label.toLowerCase()}
        </p>

        <div className="mt-4 space-y-3">
          {pigmy.length === 0
            ? empty('No bank / pigmy accounts added')
            : sums.map((summary, index) => (
                <div
                  key={pigmy[index].id}
                  className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 text-sm"
                >
                  <span className="truncate">
                    {pigmy[index].bankName}

                    <span className="ml-2 text-xs text-slate-500">
                      {summary.status}

                      {summary.pending > 0
                        ? ` · pending ${money(summary.pending)}`
                        : ''}
                    </span>
                  </span>

                  <b className="shrink-0">
                    {money(summary.balance)}
                  </b>
                </div>
              ))}

          {pigmy.length > 0 && (
            <>
              <div className="flex justify-between text-sm font-bold">
                <span>Total balance</span>
                <span>{money(bankBalance)}</span>
              </div>

              <div className="flex justify-between text-xs text-slate-500">
                <span>Sales received into accounts</span>
                <span>{money(receivedInAccounts)}</span>
              </div>

              <div className="flex justify-between text-xs text-slate-500">
                <span>Expenses & salary paid from accounts</span>
                <span>{money(paidFromAccounts)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="text-xs leading-5 text-slate-500">
        Net operating profit = sales excluding GST − expenses.
        GST collected is money owed to the government, so it is not
        counted as income. Pigmy and bank deposits and withdrawals
        are not expenses. Verify tax figures with your CA before filing.

        {period !== 'all' && undated > 0 &&
          ` ${undated} older bills saved without a date appear only under All time.`}
      </p>
    </div>
  )
}
