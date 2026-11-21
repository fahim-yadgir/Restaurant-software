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

// Show a warning banner to the owner when this many days (or fewer) remain.
export const EXPIRY_WARNING_DAYS = 7
