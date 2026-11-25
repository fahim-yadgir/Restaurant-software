// Edit these values before giving the app to a restaurant.
// They are shown on the "subscription expired" screen so the owner knows who to contact.
export const SUPPORT = {
  name: 'RestroDesk Support',
  phone: '+91 98765 43210',
  whatsapp: '919876543210', // country code + number, no "+" or spaces
  email: 'support@restrodesk.com',
  hours: 'Mon–Sat, 10:00 AM – 7:00 PM IST',
}

export const DURATION_OPTIONS = [
  { label: '7 days (trial)', days: 7 },
  { label: '1 month (30 days)', days: 30 },
  { label: '3 months (90 days)', days: 90 },
  { label: '6 months (180 days)', days: 180 },
  { label: '12 months (365 days)', days: 365 },
]

// Admin plan choices: period-wise plans plus a one-time permanent (lifetime) plan.
// 'lifetime' never expires and never needs renewal.
export const PLAN_OPTIONS = [
  ...DURATION_OPTIONS,
  { label: 'Lifetime (permanent)', days: 'lifetime' },
]

// Software name printed at the bottom of every bill.
export const APP_NAME = 'RestroDesk POS'

// Default price (INR) suggested when registering / renewing a plan. The admin can
// change the amount on every payment. EDIT THESE to your real pricing.
export const PLAN_PRICES = {
  7: 0,
  30: 999,
  90: 2499,
  180: 4499,
  365: 7999,
  lifetime: 19999,
}

export const defaultPrice = (days) => PLAN_PRICES[days] ?? 0

// Show a warning banner to the owner when this many days (or fewer) remain.
export const EXPIRY_WARNING_DAYS = 7