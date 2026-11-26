// Plan rules (same as the React app's src/lib/registry.js), kept in one place.

export const DAY_MS = 24 * 60 * 60 * 1000

export const planLabel = (planType, durationDays) =>
  planType === 'lifetime' ? 'Lifetime' : `${durationDays} days`

// 'pending' (owner has not logged in yet) | 'active' | 'expiring' (7 days or less) | 'expired'
// restaurant = the object from toRestaurant()
export function restaurantStatus(restaurant, now = Date.now()) {
  if (!restaurant.activatedAt) return 'pending'
  if (restaurant.planType === 'lifetime') return 'active'
  if (!restaurant.expiresAt || restaurant.expiresAt <= now) return 'expired'
  if (restaurant.expiresAt - now <= 7 * DAY_MS) return 'expiring'

  return 'active'
}

// Renewing adds `days` to the plan.
//  - not started yet: only the total duration grows (the plan starts at first login)
//  - already started: the new period begins when the old one ends (or now, if it already ended)
export function renewPlan(row, days, now = Date.now()) {
  const durationDays = Number(row.duration_days || 0) + days

  if (!row.activated_at) {
    return { durationDays, expiresAt: null, startsAt: null, endsAt: null }
  }

  const startsAt = Math.max(now, Number(row.expires_at || 0))
  const endsAt = startsAt + days * DAY_MS

  return { durationDays, expiresAt: endsAt, startsAt, endsAt }
}