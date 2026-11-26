// Small input helpers shared by the controllers.

import { badRequest } from './errors.js'

export const PAYMENT_METHODS = ['UPI', 'Cash', 'Bank transfer', 'Other']

export const normalizeMobile = (value) => String(value || '').replace(/\D/g, '').slice(-10)
export const normalizeEmail = (value) => String(value || '').trim().toLowerCase()

export const isMobile = (mobile) => /^[6-9]\d{9}$/.test(mobile)
export const isEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)

// Ids look like the ones the React app made:  rest_lq3x9ab,  pay_lq3x9abcd
export const newId = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

// Reads the JSON body. Sends a clear 400 when the body is missing or not JSON.
export async function readJson(c) {
  const body = await c.req.json().catch(() => null)

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw badRequest('Send the details as JSON.')
  }

  return body
}

// { planType: 'lifetime' }                       -> lifetime
// { planType: 'period', durationDays: 30 }       -> 30 day plan
export function parsePlan(planType, durationDays) {
  if (planType === 'lifetime') return { planType: 'lifetime', durationDays: null }

  const days = Number(durationDays)

  if (!Number.isInteger(days) || days <= 0 || days > 3650) {
    throw badRequest('Choose a valid subscription duration (1 to 3650 days).')
  }

  return { planType: 'period', durationDays: days }
}

// Amount received. Empty / missing means 0 (no payment saved).
export function parseAmount(value) {
  if (value === undefined || value === null || value === '') return 0

  const amount = Number(value)

  if (!(amount >= 0)) throw badRequest('Enter a valid amount received.')

  return amount
}

export const parseMethod = (value) => (PAYMENT_METHODS.includes(value) ? value : 'UPI')