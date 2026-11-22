// Older versions of the app saved sample (demo) expenses, staff and a pigmy account in the browser.
// These helpers remove ONLY those exact sample records when the data is loaded, so reports show real data only.
// Anything the owner added or edited is kept.
import { readLocal } from '@/lib/localStore'

const SEED_EXPENSES = [[1, 'Commercial gas cylinder'], [2, 'Vegetables purchase'], [3, 'Milk and dairy']]
const SEED_STAFF = [[1, 'Rahul Sharma'], [2, 'Amit Patil'], [3, 'Neha Singh']]
const SEED_ENTRY_IDS = ['pe-1', 'pe-2', 'pe-3']
const isSeed = (seeds, x, key) => seeds.some(([id, name]) => x.id === id && x[key] === name)

export const cleanExpenses = (list) =>
  Array.isArray(list) ? list.filter((x) => !isSeed(SEED_EXPENSES, x, 'title')) : list

export const cleanStaff = (list) => {
  if (!Array.isArray(list)) return list
  const expenses = readLocal('rd_expenses', [])
  const hasPayments = (id) => Array.isArray(expenses) && expenses.some((e) => e.staffId === id)
  return list.filter((s) => !(isSeed(SEED_STAFF, s, 'name') && !hasPayments(s.id)))
}

export const cleanPigmyEntries = (list) =>
  Array.isArray(list) ? list.filter((e) => !SEED_ENTRY_IDS.includes(e.id)) : list

export const cleanPigmy = (list) => {
  if (!Array.isArray(list)) return list
  const entries = readLocal('rd_pigmy_entries', [])
  const hasRealEntries = Array.isArray(entries) && entries.some((e) => e.accountId === 'pg-1' && !SEED_ENTRY_IDS.includes(e.id))
  return list.filter((a) => !(a.id === 'pg-1' && a.bankName === 'State Bank of India' && a.accountNumber === '30012345678' && !hasRealEntries))
}