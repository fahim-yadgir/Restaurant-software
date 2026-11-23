// Subscription payments received by the software owner (admin).
// Stored in localStorage for now. With the backend this becomes a `payments` table.

export const PAYMENTS_KEY = 'rd_payments'

export const PAYMENT_METHODS = ['UPI', 'Cash', 'Bank transfer', 'Other']

export const PAYMENT_TYPES = {
  new: 'New plan',
  renewal: 'Renewal',
  upgrade: 'Upgrade',
  other: 'Other',
}

export const RANGE_OPTIONS = [
  ['all', 'All time'],
  ['month', 'This month'],
  ['lastMonth', 'Last month'],
  ['year', 'This year'],
]

export const rupees = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export function createPayment({
  restaurantId,
  restaurantName,
  type = 'new',
  plan = '',
  amount,
  method = 'UPI',
  note = '',
  paidOn = Date.now(),
}) {
  return {
    id: `pay_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    restaurantId,
    restaurantName, // kept so history survives deleting the restaurant
    type,
    plan,
    amount: Number(amount) || 0,
    method,
    note: String(note || '').trim(),
    paidOn,
  }
}

export const sumAmount = (list) =>
  list.reduce((total, p) => total + Number(p.amount || 0), 0)

const monthIndex = (ts) => {
  const d = new Date(ts)
  return d.getFullYear() * 12 + d.getMonth()
}

export function inRange(payment, range, now = Date.now()) {
  if (range === 'all') return true

  const diff = monthIndex(now) - monthIndex(payment.paidOn)

  if (range === 'month') return diff === 0
  if (range === 'lastMonth') return diff === 1

  if (range === 'year') {
    return new Date(payment.paidOn).getFullYear() === new Date(now).getFullYear()
  }

  return true
}

// Last `count` months (oldest first), including months with no payments.
export function monthlyTotals(payments, now = Date.now(), count = 12) {
  const current = new Date(now)

  return Array.from({ length: count }, (_, i) => {
    const date = new Date(
      current.getFullYear(),
      current.getMonth() - (count - 1 - i),
      1
    )

    const index = date.getFullYear() * 12 + date.getMonth()

    return {
      key: index,
      label: date.toLocaleDateString('en-IN', {
        month: 'short',
        year: '2-digit',
      }),
      total: sumAmount(payments.filter((p) => monthIndex(p.paidOn) === index)),
      current: i === count - 1,
    }
  })
}

// [[label, total], ...] sorted by highest first.
export function groupTotals(payments, field) {
  const totals = {}

  for (const p of payments) {
    const key = p[field] || 'Other'
    totals[key] = (totals[key] || 0) + Number(p.amount || 0)
  }

  return Object.entries(totals).sort((a, b) => b[1] - a[1])
}