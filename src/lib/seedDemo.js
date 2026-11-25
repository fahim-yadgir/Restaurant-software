// Demo data for RestroDesk: 40 dishes + about 3 months of sales, expenses, staff salaries and pigmy (investment) accounts.
// Also adds sample subscription payments for the admin Revenue page.
//
// Use from the browser console (dev server, or any page opened with ?demo=1):
//   restroDemo.load()    -> fills the owner data (asks before replacing, keeps a backup)
//   restroDemo.revenue() -> fills the admin Revenue page payments
//   restroDemo.clear()   -> restores whatever was there before
//
// Dates are relative to today, so Dashboard / Reports "This month" and "Last month" always have data.
import { localDate, summarize } from '@/lib/pigmy'
import { writeLocal } from '@/lib/localStore'

export const KEYS = {
  foods: 'rd_foods',
  expenses: 'rd_expenses',
  staff: 'rd_staff',
  bills: 'rd_bills',
  pigmy: 'rd_pigmy',
  pigmyEntries: 'rd_pigmy_entries',
}
export const BACKUP_KEY = 'rd_demo_backup'
export const PAYMENTS_KEY = 'rd_payments'

// ---------- small helpers ----------
// Same random numbers on every run, so the demo always looks the same.
function makeRng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pad = (n) => String(n).padStart(2, '0')
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

// ---------- 40 dishes ----------
// [name, category, [[portion, price], ...], gst %]
const DISHES = [
  ['Paneer Tikka', 'Starters', [['Half', 140], ['Full', 240]], 5],
  ['Hara Bhara Kabab', 'Starters', [['Half', 120], ['Full', 210]], 5],
  ['Crispy Corn', 'Starters', [['Plate', 150]], 5],
  ['Chicken Tikka', 'Tandoor', [['Half', 180], ['Full', 320]], 5],
  ['Tandoori Chicken', 'Tandoor', [['Half', 220], ['Full', 400]], 5],
  ['Paneer Malai Tikka', 'Tandoor', [['Half', 160], ['Full', 280]], 5],
  ['Tomato Soup', 'Soups', [['Bowl', 90]], 5],
  ['Veg Manchow Soup', 'Soups', [['Bowl', 100]], 5],
  ['Sweet Corn Soup', 'Soups', [['Bowl', 95]], 5],
  ['Dal Makhani', 'Main Course', [['Half', 120], ['Full', 210]], 5],
  ['Paneer Butter Masala', 'Main Course', [['Half', 150], ['Full', 260]], 5],
  ['Kadai Paneer', 'Main Course', [['Half', 150], ['Full', 260]], 5],
  ['Mix Veg', 'Main Course', [['Half', 110], ['Full', 190]], 5],
  ['Butter Chicken', 'Main Course', [['Half', 200], ['Full', 360]], 5],
  ['Chicken Curry', 'Main Course', [['Half', 180], ['Full', 320]], 5],
  ['Dal Tadka', 'Main Course', [['Half', 100], ['Full', 170]], 5],
  ['Veg Biryani', 'Rice & Biryani', [['Half', 130], ['Full', 220]], 5],
  ['Chicken Biryani', 'Rice & Biryani', [['Half', 170], ['Full', 300]], 5],
  ['Jeera Rice', 'Rice & Biryani', [['Plate', 110]], 5],
  ['Veg Pulao', 'Rice & Biryani', [['Plate', 130]], 5],
  ['Butter Naan', 'Indian Breads', [['Piece', 45]], 5],
  ['Tandoori Roti', 'Indian Breads', [['Piece', 20]], 5],
  ['Garlic Naan', 'Indian Breads', [['Piece', 60]], 5],
  ['Laccha Paratha', 'Indian Breads', [['Piece', 50]], 5],
  ['Veg Hakka Noodles', 'Chinese', [['Half', 100], ['Full', 170]], 5],
  ['Veg Fried Rice', 'Chinese', [['Half', 100], ['Full', 170]], 5],
  ['Chilli Paneer', 'Chinese', [['Half', 150], ['Full', 250]], 5],
  ['Masala Dosa', 'South Indian', [['Plate', 110]], 5],
  ['Idli Sambar', 'South Indian', [['2 pcs', 60], ['4 pcs', 110]], 5],
  ['Vada Pav', 'Snacks', [['Piece', 25]], 5],
  ['Veg Burger', 'Fast Food', [['Regular', 90], ['Large', 130]], 5],
  ['French Fries', 'Fast Food', [['Regular', 80], ['Large', 120]], 5],
  ['Green Salad', 'Sides & Salads', [['Plate', 60]], 5],
  ['Masala Papad', 'Sides & Salads', [['Piece', 40]], 5],
  ['Masala Chai', 'Beverages', [['Cup', 40]], 5],
  ['Cold Coffee', 'Beverages', [['Regular', 80], ['Large', 110]], 5],
  ['Fresh Lime Soda', 'Beverages', [['Glass', 60]], 5],
  ['Gulab Jamun', 'Desserts', [['2 pcs', 70]], 5],
  ['Vanilla Ice Cream', 'Desserts', [['Scoop', 60], ['Cup', 100]], 18],
  ['Veg Thali', 'Combos & Thali', [['Regular', 180], ['Special', 260]], 5],
]

function buildFoods() {
  return DISHES.map(([name, category, variants, gst], i) => ({
    id: i + 1,
    name,
    category,
    image: '',
    variants: variants.map(([n, price]) => ({ name: n, price })),
    gst,
    active: true,
  }))
}

// ---------- staff ----------
const STAFF = [
  ['Imran Shaikh', 'Manager', '9822011101', 26000],
  ['Vikas Kale', 'Chef', '9822011102', 22000],
  ['Sanjay More', 'Chef', '9822011103', 18000],
  ['Pooja Deshmukh', 'Cashier', '9822011104', 14000],
  ['Rohit Gaikwad', 'Waiter', '9822011105', 12000],
  ['Kiran Jadhav', 'Helper', '9822011106', 9000],
]

// ---------- pigmy (investment) accounts ----------
function buildAccounts(start, today) {
  const make = (id, bankName, accountName, accountNumber, dailyAmount, note, startD, days) => {
    const expireD = addDays(startD, days - 1)
    return {
      id,
      bankName,
      accountName,
      accountNumber,
      dailyAmount,
      note,
      startDate: localDate(startD),
      expireDate: localDate(expireD),
      expectedAmount: dailyAmount * days,
      status: 'Active',
    }
  }
  return [
    make('pg-demo-1', 'State Bank of India', 'Restaurant Current A/c', '39201847562', 500, 'Main bank. UPI / card sales are credited here', start, 365),
    make('pg-demo-2', 'Bank of Maharashtra', 'Pigmy Savings', '60384729105', 300, 'Collected by agent Suresh', addDays(start, 9), 365),
    make('pg-demo-3', 'Cosmos Co-operative Bank', 'Pigmy Savings', '0128847391', 200, 'Collected every evening', addDays(start, 30), 180),
  ]
}

// ---------- the main generator ----------
export function generateOwnerData(now = new Date()) {
  const rng = makeRng(20261125)
  const rand = (a, b) => a + rng() * (b - a)
  const randInt = (a, b) => Math.floor(rand(a, b + 1))
  const pick = (arr) => arr[Math.floor(rng() * arr.length)]
  const pickWeighted = (list, weightOf) => {
    const total = list.reduce((s, x) => s + weightOf(x), 0)
    let r = rng() * total
    for (const x of list) {
      r -= weightOf(x)
      if (r <= 0) return x
    }
    return list[list.length - 1]
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(today.getFullYear(), today.getMonth() - 2, 1)
  const todayStr = localDate(today)
  const dayCount = Math.round((today - start) / 86400000) + 1

  const foods = buildFoods()
  const accounts = buildAccounts(start, today)
  const sbi = accounts[0]

  const bills = []
  const expenses = []
  const entries = []
  let eid = 0
  let billNo = 100000
  const nextEid = () => `demo-e${++eid}`

  const balance = (accountId) =>
    entries.reduce(
      (s, e) => (e.accountId === accountId ? s + (e.type === 'deposit' ? e.amount : -e.amount) : s),
      0
    )

  const addExpense = ({ date, title, amount, category, mode = 'Cash', accountId, extra = {} }) => {
    amount = Math.round(amount)
    const useBank = accountId && balance(accountId) >= amount
    const id = nextEid()
    expenses.push({
      id,
      date,
      title,
      amount,
      category,
      mode: useBank ? 'Bank' : mode === 'Bank' ? 'Cash' : mode,
      ...(useBank ? { accountId } : {}),
      ...extra,
    })
    if (useBank) {
      entries.push({
        id: nextEid(),
        accountId,
        date,
        type: 'withdraw',
        amount,
        note: extra.staffId ? `${extra.payType} paid to ${extra.staffName}` : `Paid: ${title}`,
        source: 'expense',
        sourceId: id,
      })
    }
  }

  const staff = STAFF.map(([name, role, mobile, salary], i) => ({
    id: 1760000000001 + i,
    name,
    role,
    mobile,
    salary,
    joinedOn: localDate(addDays(start, -randInt(60, 400))),
  }))

  const popularity = foods.map((f, i) => ({
    f,
    w: 1 / Math.pow(i + 3, 0.55) + (f.category === 'Beverages' ? 0.12 : 0),
  }))

  for (let d = 0; d < dayCount; d++) {
    const day = addDays(start, d)
    const date = localDate(day)
    const dow = day.getDay()
    const growth = 0.88 + (d / dayCount) * 0.26
    const weekend = dow === 0 || dow === 6 || dow === 5
    let bills_today = Math.round((weekend ? rand(34, 46) : rand(21, 31)) * growth)
    if (dow === 1) bills_today = Math.round(bills_today * 0.85)

    for (let b = 0; b < bills_today; b++) {
      const nItems = pickWeighted([1, 2, 3, 4, 5], (n) => [0.12, 0.3, 0.3, 0.2, 0.08][n - 1])
      const lines = []
      const used = new Set()
      for (let k = 0; k < nItems; k++) {
        const { f } = pickWeighted(popularity, (x) => x.w)
        const v = f.variants.length > 1 && rng() < 0.55 ? f.variants[f.variants.length - 1] : f.variants[0]
        const key = `${f.id}-${v.name}`
        if (used.has(key)) continue
        used.add(key)
        const breadLike = f.category === 'Indian Breads' || f.category === 'Beverages'
        lines.push({
          id: f.id,
          name: f.name,
          variant: v.name,
          price: v.price,
          qty: breadLike ? randInt(2, 4) : rng() < 0.2 ? 2 : 1,
          gst: f.gst,
        })
      }
      const subtotal = lines.reduce((s, x) => s + x.price * x.qty, 0)
      const discount = rng() < 0.07 ? Math.min(subtotal, pick([10, 20, 30, 50, 100])) : 0
      const taxable = Math.max(0, subtotal - discount)
      const tax = (lines.reduce((s, x) => s + (x.price * x.qty * x.gst) / 100, 0) * taxable) / (subtotal || 1)
      const payment = pickWeighted(['Cash', 'UPI', 'Card', 'Credit', 'Split'], (p) => ({ Cash: 40, UPI: 38, Card: 10, Credit: 4, Split: 8 })[p])
      const slot = rng() < 0.45 ? rand(12.5, 15) : rng() < 0.85 ? rand(19, 22.5) : rand(11, 23)
      const hh = Math.floor(slot)
      const time = `${pad(hh)}:${pad(Math.floor((slot - hh) * 60))}`
      const linked = (payment === 'UPI' || payment === 'Card') && rng() < 0.75
      const bill = {
        id: `INV-${++billNo}`,
        items: lines,
        subtotal,
        discount,
        tax: Math.round(tax * 100) / 100,
        total: Math.round(taxable + tax),
        payment,
        orderType: pickWeighted(['Dine-In', 'Takeaway', 'Delivery'], (t) => ({ 'Dine-In': 60, Takeaway: 25, Delivery: 15 })[t]),
        date,
        time,
        ...(linked ? { accountId: sbi.id } : {}),
      }
      bills.push(bill)
      if (linked) {
        entries.push({
          id: nextEid(),
          accountId: sbi.id,
          date,
          type: 'deposit',
          amount: bill.total,
          note: `Sales receipt ${bill.id}`,
          source: 'bill',
          sourceId: bill.id,
        })
      }
    }

    accounts.forEach((a) => {
      if (date < a.startDate || date > todayStr) return
      if (rng() < 0.93) {
        entries.push({
          id: nextEid(),
          accountId: a.id,
          date,
          type: 'deposit',
          amount: a.dailyAmount,
          note: a.id === 'pg-demo-2' ? 'Agent collection' : 'Daily pigmy',
        })
      }
    })

    const dom = day.getDate()
    const mon = day.getMonth()
    if (dom === 1) addExpense({ date, title: 'Shop rent', amount: 25000, category: 'Rent', mode: 'Bank', accountId: sbi.id })
    if (dom === 5) addExpense({ date, title: 'Electricity bill', amount: rand(8200, 11800), category: 'Utilities', mode: 'UPI', accountId: sbi.id })
    if (dom === 7) addExpense({ date, title: 'Internet & CCTV', amount: 1180, category: 'Utilities', mode: 'UPI' })
    if (dom === 3 || dom === 17) addExpense({ date, title: 'Commercial gas cylinder', amount: 1950, category: 'Utilities', mode: 'Cash' })
    if (dom === 12) addExpense({ date, title: pick(['Mixer grinder repair', 'Tandoor repair', 'Freezer servicing', 'Exhaust cleaning']), amount: rand(1500, 3800), category: 'Maintenance', mode: 'Cash' })
    if (dom === 20) addExpense({ date, title: 'Packaging material', amount: rand(900, 1800), category: 'Other', mode: 'Cash' })
    if (d % 2 === 0) addExpense({ date, title: 'Vegetables purchase', amount: rand(2600, 4400) * (weekend ? 1.15 : 1), category: 'Purchase', mode: 'Cash' })
    if (d % 3 === 1) addExpense({ date, title: 'Milk and dairy', amount: rand(1200, 2100), category: 'Purchase', mode: 'Cash' })
    if (dow === 2 || dow === 5) addExpense({ date, title: 'Chicken & meat purchase', amount: rand(3200, 5200), category: 'Purchase', mode: 'Cash' })
    if (dow === 3) addExpense({ date, title: 'Grocery & masala (wholesale)', amount: rand(6800, 9400), category: 'Purchase', mode: 'UPI', accountId: sbi.id })
    if (dow === 6 && rng() < 0.5) addExpense({ date, title: 'Cleaning & water cans', amount: rand(350, 700), category: 'Maintenance', mode: 'Cash' })

    const lastDom = new Date(day.getFullYear(), mon + 1, 0).getDate()
    if (dom === Math.min(28, lastDom)) {
      staff.forEach((s) => {
        addExpense({
          date,
          title: `Salary – ${s.name}`,
          amount: s.salary,
          category: 'Salary',
          mode: 'Bank',
          accountId: sbi.id,
          extra: { staffId: s.id, payType: 'Salary', note: '', staffName: s.name },
        })
      })
    }
    if (dom === 15 && date !== localDate(start)) {
      const s = staff[randInt(3, staff.length - 1)]
      addExpense({
        date,
        title: `Advance – ${s.name}`,
        amount: pick([1000, 2000, 3000]),
        category: 'Salary',
        mode: 'Cash',
        extra: { staffId: s.id, payType: 'Advance', note: 'Advance', staffName: s.name },
      })
    }
  }

  const mid = localDate(addDays(start, Math.floor(dayCount * 0.55)))
  if (balance(sbi.id) > 30000) {
    entries.push({ id: nextEid(), accountId: sbi.id, date: mid, type: 'withdraw', amount: 15000, note: 'Cash needed for supplier' })
  }

  expenses.forEach((e) => { delete e.staffName })
  expenses.sort((a, b) => String(b.date).localeCompare(String(a.date)))
  bills.sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))
  entries.sort((a, b) => String(a.date).localeCompare(String(b.date)))

  return { foods, expenses, staff, bills, pigmy: accounts, pigmyEntries: entries }
}

// ---------- sample subscription payments for the admin Revenue page ----------
export function generateRevenuePayments(now = new Date()) {
  const rng = makeRng(777)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(today.getFullYear(), today.getMonth() - 2, 1)
  const restaurants = [
    'Spice Garden', 'Hotel Sai Palace', 'Tadka Family Restaurant', 'Chai Point Cafe', 'Royal Dhaba',
    'Biryani House', 'Annapurna Bhojanalay', 'Coastal Kitchen', 'Urban Bites', 'Dosa Corner',
    'Punjabi Zaika', 'Green Leaf Veg', 'The Grill Hub', 'Mama\'s Kitchen',
  ]
  const plans = [
    ['30-day plan', 1500, 30], ['90-day plan', 3999, 90], ['180-day plan', 6999, 180], ['365-day plan', 11999, 365], ['Lifetime plan', 24999, 0],
  ]
  const methods = ['UPI', 'UPI', 'UPI', 'Cash', 'Bank transfer']
  const days = Math.round((today - start) / 86400000) + 1
  const out = []
  const ownerNames = new Map()
  let n = 0
  for (let d = 0; d < days; d++) {
    if (rng() > 0.22) continue
    const day = addDays(start, d)
    const rest = restaurants[n % restaurants.length]
    const [plan, amount] = plans[Math.floor(rng() * rng() * plans.length)]
    const seen = ownerNames.get(rest)
    const type = seen ? (rng() < 0.7 ? 'renewal' : 'upgrade') : 'new'
    ownerNames.set(rest, true)
    out.push({
      id: `pay_demo${n}`,
      restaurantId: `demo-r${(n % restaurants.length) + 1}`,
      restaurantName: rest,
      type,
      plan,
      amount,
      method: methods[Math.floor(rng() * methods.length)],
      note: '',
      paidOn: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 11 + Math.floor(rng() * 7), Math.floor(rng() * 60)).getTime(),
    })
    n++
  }
  return out.sort((a, b) => b.paidOn - a.paidOn)
}

// ---------- load / clear ----------
export function loadOwnerDemo({ confirmFirst = true, reload = true } = {}) {
  if (confirmFirst && !window.confirm('Replace this restaurant\'s menu, bills, expenses, staff and pigmy accounts with 3 months of DEMO data?\n\nYour current data is backed up and can be restored with restroDemo.clear().')) return false
  if (!localStorage.getItem(BACKUP_KEY)) {
    const backup = {}
    Object.values(KEYS).forEach((k) => { backup[k] = localStorage.getItem(k) })
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup))
  }
  const data = generateOwnerData()
  Object.entries(KEYS).forEach(([name, key]) => writeLocal(key, data[name]))
  if (reload) window.location.reload()
  return true
}

export function loadRevenueDemo({ reload = true } = {}) {
  const backupKey = `${BACKUP_KEY}_payments`
  if (!localStorage.getItem(backupKey)) localStorage.setItem(backupKey, JSON.stringify(localStorage.getItem(PAYMENTS_KEY)))
  writeLocal(PAYMENTS_KEY, generateRevenuePayments())
  if (reload) window.location.reload()
}

export function clearDemo({ reload = true } = {}) {
  const raw = localStorage.getItem(BACKUP_KEY)
  if (raw) {
    const backup = JSON.parse(raw)
    Object.entries(backup).forEach(([k, v]) => (v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v)))
    localStorage.removeItem(BACKUP_KEY)
  }
  const payKey = `${BACKUP_KEY}_payments`
  const payRaw = localStorage.getItem(payKey)
  if (payRaw) {
    const v = JSON.parse(payRaw)
    if (v === null) localStorage.removeItem(PAYMENTS_KEY)
    else localStorage.setItem(PAYMENTS_KEY, v)
    localStorage.removeItem(payKey)
  }
  if (reload) window.location.reload()
}

export function demoReport() {
  const d = generateOwnerData()
  const sum = (l, f) => l.reduce((s, x) => s + f(x), 0)
  const byMonth = {}
  d.bills.forEach((b) => { const m = b.date.slice(0, 7); byMonth[m] = byMonth[m] || { bills: 0, sales: 0, expenses: 0 }; byMonth[m].bills++; byMonth[m].sales += b.total })
  d.expenses.forEach((e) => { const m = e.date.slice(0, 7); byMonth[m] = byMonth[m] || { bills: 0, sales: 0, expenses: 0 }; byMonth[m].expenses += e.amount })
  console.table(byMonth)
  console.table(d.pigmy.map((a) => ({ bank: a.bankName, ...summarize(a, d.pigmyEntries) })))
  return { dishes: d.foods.length, bills: d.bills.length, expenses: d.expenses.length, staff: d.staff.length, totalSales: sum(d.bills, (b) => b.total) }
}