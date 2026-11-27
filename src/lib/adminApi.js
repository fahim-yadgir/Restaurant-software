// Admin API client: login, me, logout, restaurants. Every call goes through adminRequest().
// The token lives in sessionStorage, so closing the tab signs the admin out.
import { ApiError } from '@/lib/api'

const TOKEN_KEY = 'rd_admin_token'
export const ADMIN_UNAUTHORIZED_EVENT = 'rd-admin-unauthorized'

export const getAdminToken = () => {
  try { return sessionStorage.getItem(TOKEN_KEY) || '' } catch { return '' }
}
const setAdminToken = (token) => {
  try { sessionStorage.setItem(TOKEN_KEY, token) } catch { /* ignore */ }
}
export const clearAdminToken = () => {
  try { sessionStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
}

// adminRequest('/api/admin/restaurants')
// adminRequest(path, { method: 'POST', body: {...} })
export async function adminRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}

  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) headers.Authorization = `Bearer ${getAdminToken()}`

  let res

  try {
    res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('NETWORK', 'Cannot reach the server. Check your internet and try again.')
  }

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    // Token missing, expired or signed out: send the admin back to the login page.
    if (res.status === 401 && auth) {
      clearAdminToken()
      window.dispatchEvent(new Event(ADMIN_UNAUTHORIZED_EVENT))
    }

    throw new ApiError(
      data?.error?.code || 'SERVER_ERROR',
      data?.error?.message || 'Something went wrong. Please try again.'
    )
  }

  return data
}

// ---------- Auth ----------
export async function adminLogin(email, password) {
  const data = await adminRequest('/api/admin/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  })

  setAdminToken(data.token)

  return data.admin
}

export const adminMe = () => adminRequest('/api/admin/me')

export async function adminLogout() {
  try {
    await adminRequest('/api/admin/logout', { method: 'POST' })
  } catch {
    // Even if the server cannot be reached, sign out on this browser.
  }

  clearAdminToken()
}

// ---------- Restaurants ----------
const BASE = '/api/admin/restaurants'

export const fetchRestaurants = async () => (await adminRequest(BASE)).restaurants

// body: { name, ownerName, mobile, email?, password?, planType, durationDays, amount?, method? }
// returns { restaurant, password? }  (password only when the server made it)
export const apiCreateRestaurant = (body) => adminRequest(BASE, { method: 'POST', body })

// body: only the fields that change
export const apiUpdateRestaurant = async (id, body) =>
  (await adminRequest(`${BASE}/${id}`, { method: 'PATCH', body })).restaurant

// body: { days, amount?, method? }
export const apiRenewRestaurant = async (id, body) =>
  (await adminRequest(`${BASE}/${id}/renew`, { method: 'POST', body })).restaurant

export const apiDeleteRestaurant = (id) => adminRequest(`${BASE}/${id}`, { method: 'DELETE' })

export const apiResetDevice = (id) => adminRequest(`${BASE}/${id}/reset-device`, { method: 'POST' })

export const apiResetPassword = async (id) =>
  (await adminRequest(`${BASE}/${id}/reset-password`, { method: 'POST' })).password

// ---------- Deleted restaurants (soft delete) ----------
export const fetchDeletedRestaurants = async () => (await adminRequest(`${BASE}/deleted`)).restaurants

// body (optional): { days, amount?, method? }  - with days the plan is renewed too
export const apiRestoreRestaurant = async (id, body = {}) =>
  (await adminRequest(`${BASE}/${id}/restore`, { method: 'POST', body })).restaurant

export const apiPermanentDelete = (id) => adminRequest(`${BASE}/${id}/permanent`, { method: 'DELETE' })

// ---------- Revenue ----------
// Grouped rows: [{ ym: '2026-11', type, method, plan, total, count }]. The page builds all charts from them.
export const fetchRevenue = async () =>
  (await adminRequest(`/api/admin/revenue?offset=${-new Date().getTimezoneOffset()}`)).rows

// body: { restaurantId, amount, type?, method?, paidOn?, note? }
export const apiAddPayment = async (body) =>
  (await adminRequest('/api/admin/payments', { method: 'POST', body })).payment

export const fetchRecentPayments = async (limit = 10) =>
  (await adminRequest(`/api/admin/payments/recent?limit=${limit}`)).payments

// body: only the fields that change { amount, type, method, paidOn, note }
export const apiUpdatePayment = async (id, body) =>
  (await adminRequest(`/api/admin/payments/${id}`, { method: 'PATCH', body })).payment

export const apiDeletePayment = (id) => adminRequest(`/api/admin/payments/${id}`, { method: 'DELETE' })

// ---------- Account ----------
// Changes the admin password. The server returns a fresh token (all older tokens stop working),
// so this browser stays signed in.
export async function adminChangePassword(currentPassword, newPassword) {
  const data = await adminRequest('/api/admin/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  })

  setAdminToken(data.token)
}