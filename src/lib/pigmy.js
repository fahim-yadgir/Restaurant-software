// Helpers for the Pigmy / Investment module.

// Today's date as YYYY-MM-DD in the device's local time zone.
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const dayNumber = s => Math.round(Date.parse(`${s}T00:00:00Z`) / 86400000)

// Number of days from a to b, counting both days.
export const daysInclusive = (a, b) => (a && b ? Math.max(0, dayNumber(b) - dayNumber(a) + 1) : 0)

// Daily amount x number of days between start and expire date.
export const suggestExpected = (daily, start, expire) => {
  const d = Number(daily), n = daysInclusive(start, expire)
  return d > 0 && n > 0 ? d * n : 0
}

// Show only the last 4 digits of the account number.
export const maskAccount = n => {
  const s = String(n || '').replace(/\s/g, '')
  if (!s) return '—'
  return s.length <= 4 ? s : `•••• ${s.slice(-4)}`
}

export const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

// "Paid from" select values look like "mode:Cash" or "acc:<accountId>".
export const parsePaidFrom = v =>
  String(v || '').startsWith('acc:')
    ? { mode: 'Bank', accountId: String(v).slice(4) }
    : { mode: String(v || 'mode:Cash').replace('mode:', ''), accountId: null }

// Current balance of every account: { accountId: balance }
export const balancesOf = (accounts, entries) =>
  Object.fromEntries(accounts.map(a => [a.id, summarize(a, entries).balance]))

// Previous month key, e.g. '2026-11' -> '2026-10'
export const prevMonth = ym => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Everything the card needs for one account.
export function summarize(account, entries) {
  const mine = entries.filter(e => e.accountId === account.id)
  const today = localDate()
  // Progress figures ignore reversal pairs and entries linked to sales / expenses / salary.
  const real = e => !e.reversalOf && !e.reversed && !e.source
  const sum = list => list.reduce((s, e) => s + Number(e.amount || 0), 0)

  const balance = sum(mine.filter(e => e.type === 'deposit')) - sum(mine.filter(e => e.type === 'withdraw'))
  const deposited = sum(mine.filter(e => e.type === 'deposit' && real(e)))
  const withdrawn = sum(mine.filter(e => e.type === 'withdraw' && real(e)))
  const received = sum(mine.filter(e => e.type === 'deposit' && e.source))   // sales received into this account
  const paidOut = sum(mine.filter(e => e.type === 'withdraw' && e.source))   // expenses / salary paid from it

  const dailyAmount = Number(account.dailyAmount) || 0
  const totalDays = daysInclusive(account.startDate, account.expireDate)
  const elapsedDays = account.startDate
    ? Math.min(totalDays || Infinity, daysInclusive(account.startDate, today))
    : 0
  const expected = Number(account.expectedAmount) || dailyAmount * totalDays || 0
  const pending = account.startDate && dailyAmount ? Math.max(0, elapsedDays * dailyAmount - deposited) : 0
  const daysLeft = account.expireDate ? Math.max(0, dayNumber(account.expireDate) - dayNumber(today)) : null
  const progress = expected > 0 ? Math.min(100, Math.round((deposited / expected) * 100)) : 0
  const status = account.status === 'Closed' ? 'Closed' : account.expireDate && today > account.expireDate ? 'Matured' : 'Active'
  const depositedToday = mine.some(e => e.type === 'deposit' && e.date === today && real(e))

  return { balance, deposited, withdrawn, received, paidOut, expected, pending, daysLeft, progress, status, depositedToday, today, dailyAmount }
}