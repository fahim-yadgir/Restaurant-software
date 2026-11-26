// Database rows use snake_case (owner_name). The React app uses camelCase (ownerName).
// These two functions convert, so the frontend gets the same objects it already uses.

export const toRestaurant = (r) => ({
  id: r.id,
  name: r.name,
  ownerName: r.owner_name,
  mobile: r.mobile,
  email: r.email,
  planType: r.plan_type,
  durationDays: r.duration_days,
  createdAt: r.created_at,
  activatedAt: r.activated_at,
  expiresAt: r.expires_at,
  deviceId: r.device_id,
  deviceBoundAt: r.device_bound_at,
  lastSeenAt: r.last_seen_at,
  // password_hash is NEVER sent to the browser from here
})

export const toPayment = (p) => ({
  id: p.id,
  restaurantId: p.restaurant_id,
  restaurantName: p.restaurant_name,
  type: p.type,
  plan: p.plan,
  amount: p.amount,
  method: p.method,
  note: p.note,
  paidOn: p.paid_on,
})
// One row of a restaurant's plan history. amount / method come from the linked payment (if any).
export const toSubscription = (s) => ({
  id: s.id,
  restaurantId: s.restaurant_id,
  planType: s.plan_type,
  durationDays: s.duration_days,
  startsAt: s.starts_at,
  endsAt: s.ends_at,
  paymentId: s.payment_id,
  createdAt: s.created_at,
  amount: s.amount ?? null,
  method: s.method ?? null,
})