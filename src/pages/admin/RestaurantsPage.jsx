import { useState } from 'react'
import {
  Plus,
  Pencil,
  RefreshCw,
  KeyRound,
  MonitorSmartphone,
  Trash2,
} from 'lucide-react'

import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import CopyButton from '@/components/ui/CopyButton'
import RestaurantRow from '@/components/admin/RestaurantRow'

import {
  DURATION_OPTIONS,
  PLAN_OPTIONS,
  PLAN_PRICES,
  defaultPrice,
} from '@/lib/appConfig'

import { PAYMENT_METHODS } from '@/lib/revenue'

import {
  generatePassword,
  validateRegistration,
  normalizeEmail,
  normalizeMobile,
  formatDate,
  getRestaurantStatus,
  isLifetime,
  planLabel,
  remainingText,
} from '@/lib/registry'

import {
  notifySuccess,
  notifyError,
  notifyConfirm,
} from '@/lib/toast'

const emptyForm = () => ({
  name: '',
  ownerName: '',
  mobile: '',
  email: '',
  days: '90',
  password: generatePassword(),
  amount: String(PLAN_PRICES[90]),
  method: 'UPI',
})

const selectClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm'

function shareText(record, password) {
  return [
    'RestroDesk - Restaurant details',
    `Restaurant: ${record.name}`,
    `Owner: ${record.ownerName}`,
    `Mobile: ${record.mobile}`,
    `Email: ${record.email}`,
    `Plan: ${planLabel(record)}`,
    `Password: ${password}`,
    'Sign in with your email or mobile number. The first sign-in needs internet and links the app to that computer (one device per account).',
  ].join('\n')
}

export default function RestaurantsPage({
  registry,
  now,
  onCreate,
  onUpdate,
  onRenew,
  onResetPassword,
  onResetDevice,
  onDelete,
}) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [selected, setSelected] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [renewDays, setRenewDays] = useState('30')
  const [renewAmount, setRenewAmount] = useState(String(PLAN_PRICES[30]))
  const [renewMethod, setRenewMethod] = useState('UPI')

  const [created, setCreated] = useState(null)

  const set = (key) => (value) =>
    setForm((old) => ({ ...old, [key]: value }))

  const openRegister = () => {
    setForm(emptyForm())
    setError('')
    setShowForm(true)
  }

  const openManage = (restaurant) => {
    setSelected(restaurant)
    setEditMode(false)
    setRenewDays('30')
    setRenewAmount(String(PLAN_PRICES[30]))
    setRenewMethod('UPI')
    setError('')
  }

  const closeManage = () => {
    setSelected(null)
    setEditMode(false)
    setError('')
  }

  // Register restaurant
  const submitRegistration = async (event) => {
    event.preventDefault()

    const problem = validateRegistration(form, registry)

    if (problem) {
      setError(problem)
      notifyError(problem)
      return
    }

    setBusy(true)
    setError('')

    try {
      const record = await onCreate({
        ...form,
        planType: form.days === 'lifetime' ? 'lifetime' : 'period',
        durationDays:
          form.days === 'lifetime' ? null : Number(form.days),
        amount: Number(form.amount) || 0,
        method: form.method,
      })

      setCreated({
        record,
        password: form.password,
        title: 'Restaurant registered successfully!',
      })

      setShowForm(false)

      notifySuccess('Restaurant registered successfully!')
    } catch (err) {
      const message =
        err?.message || 'Could not register restaurant.'

      setError(message)
      notifyError(message)
    } finally {
      setBusy(false)
    }
  }

  // Edit restaurant
  const submitEdit = async (event) => {
    event.preventDefault()

    if (!selected) return

    const name = form.name.trim()
    const ownerName = form.ownerName.trim()
    const mobile = normalizeMobile(form.mobile)
    const email = normalizeEmail(form.email)
    const lifetime = form.days === 'lifetime'
    const durationDays = lifetime ? null : Number(form.days)

    if (!name || !ownerName) {
      const message = 'Restaurant and owner names are required.'
      setError(message)
      notifyError(message)
      return
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      const message = 'Enter a valid 10-digit mobile number.'
      setError(message)
      notifyError(message)
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      const message = 'Enter a valid email address.'
      setError(message)
      notifyError(message)
      return
    }

    if (!lifetime && (!Number.isFinite(durationDays) || durationDays <= 0)) {
      const message = 'Select a valid plan.'
      setError(message)
      notifyError(message)
      return
    }

    const duplicate = registry.find(
      (r) =>
        r.id !== selected.id &&
        (r.email === email || r.mobile === mobile)
    )

    if (duplicate) {
      const message =
        'Another restaurant already uses this email or mobile number.'

      setError(message)
      notifyError(message)
      return
    }

    setBusy(true)
    setError('')

    try {
      await onUpdate(selected.id, {
        name,
        ownerName,
        mobile,
        email,
        planType: lifetime ? 'lifetime' : 'period',
        durationDays,
      })

      notifySuccess('Restaurant details updated successfully!')
      closeManage()
    } catch (err) {
      const message =
        err?.message || 'Could not update restaurant.'

      setError(message)
      notifyError(message)
    } finally {
      setBusy(false)
    }
  }

  // Renew subscription
  const handleRenew = async () => {
    if (!selected || busy) return

    const days = Number(renewDays)

    if (!Number.isFinite(days) || days <= 0) {
      notifyError('Select a valid renewal duration.')
      return
    }

    if (!(Number(renewAmount) >= 0)) {
      notifyError('Enter a valid amount received.')
      return
    }

    try {
      setBusy(true)

      await onRenew(selected.id, days, {
        amount: Number(renewAmount) || 0,
        method: renewMethod,
      })

      notifySuccess('Subscription renewed successfully!')
      closeManage()
    } catch (err) {
      notifyError(
        err?.message || 'Subscription renewal failed.'
      )
    } finally {
      setBusy(false)
    }
  }

  // Reset password
  const handleResetPassword = async () => {
    if (!selected || busy) return

    try {
      setBusy(true)

      const password = await onResetPassword(selected.id)

      setCreated({
        record: selected,
        password,
        title: 'Password reset successfully!',
      })

      notifySuccess('Owner password reset successfully!')

      closeManage()
    } catch (err) {
      notifyError(
        err?.message || 'Password reset failed.'
      )
    } finally {
      setBusy(false)
    }
  }

  // Reset device
  const handleResetDevice = async () => {
    if (!selected || busy) return

    const confirmed = await notifyConfirm(
      'The current device will lose access. The next login links a new device. The subscription keeps running.',
      'Reset linked device?'
    )

    if (!confirmed) return

    try {
      setBusy(true)

      await onResetDevice(selected.id)

      notifySuccess('Device reset. The owner can now sign in on a new device.')
    } catch (err) {
      notifyError(err?.message || 'Could not reset the device.')
    } finally {
      setBusy(false)
    }
  }

  // Delete restaurant
  const handleDelete = async () => {
    if (!selected || busy) return

    try {
      setBusy(true)

      await onDelete(selected.id)

      notifySuccess('Restaurant deleted successfully!')

      closeManage()
    } catch (err) {
      notifyError(
        err?.message || 'Could not delete restaurant.'
      )
    } finally {
      setBusy(false)
    }
  }

  // Start editing
  const startEdit = () => {
    setForm({
      name: selected.name || '',
      ownerName: selected.ownerName || '',
      mobile: selected.mobile || '',
      email: selected.email || '',
      days: isLifetime(selected)
        ? 'lifetime'
        : String(selected.durationDays || 90),
      password: '',
    })

    setError('')
    setEditMode(true)
  }

  // Refresh selected record
  const current = selected
    ? registry.find((r) => r.id === selected.id) || selected
    : null

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold">
            Restaurants & subscriptions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Register and manage restaurant accounts.
          </p>
        </div>

        <Button onClick={openRegister}>
          <Plus size={15} />
          Register restaurant
        </Button>
      </div>

      {/* Restaurants table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              {[
                'Restaurant',
                'Owner',
                'Linked device',
                'Plan',
                'Status',
                'Expires',
                'Actions',
              ].map((heading) => (
                <th className="px-5 py-4" key={heading}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {registry.map((restaurant) => (
              <RestaurantRow
                key={restaurant.id}
                r={restaurant}
                now={now}
                onManage={openManage}
              />
            ))}

            {registry.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  No restaurants registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Management modal */}
      {current && (
        <Modal
          title={editMode ? 'Edit restaurant' : 'Restaurant management'}
          subtitle={current.name}
          size="lg"
          onClose={closeManage}
        >
          {!editMode ? (
            <div className="space-y-5">

              {/* Restaurant details */}
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-slate-800">
                  Restaurant details
                </h3>

                <span className="text-xs text-slate-500">
                  {getRestaurantStatus(current, now)}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['Restaurant name', current.name],
                  ['Owner name', current.ownerName],
                  ['Mobile number', current.mobile],
                  ['Email', current.email],
                  ['Restaurant ID', current.id],
                  ['Linked device', current.deviceId || 'Not linked yet'],
                  ['Device linked on', formatDate(current.deviceBoundAt)],
                  ['Plan', planLabel(current)],
                  ['Registered date', formatDate(current.createdAt)],
                  ['First login date', formatDate(current.activatedAt)],
                  ['Expiry date', isLifetime(current) ? 'Never' : formatDate(current.expiresAt)],
                  ['Remaining time', remainingText(current, now)],
                  ['Status', getRestaurantStatus(current, now)],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <div className="text-xs text-slate-500">
                      {label}
                    </div>

                    <div className="mt-1 break-all text-sm font-semibold text-slate-800">
                      {value || '—'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {current.deviceId && (
                  <CopyButton
                    text={current.deviceId}
                    label="Copy device ID"
                  />
                )}

                <Button
                  variant="secondary"
                  onClick={startEdit}
                  disabled={busy}
                >
                  <Pencil size={14} />
                  Edit details
                </Button>
              </div>

              {/* Subscription renewal */}
              {isLifetime(current) ? (
                <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                  Lifetime plan: this account never expires, so no renewal is needed.
                </div>
              ) : (
              <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-3 font-bold text-slate-800">
                  Subscription renewal
                </h3>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={renewDays}
                    onChange={(e) => {
                      setRenewDays(e.target.value)
                      setRenewAmount(String(defaultPrice(e.target.value)))
                    }}
                    disabled={busy}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  >
                    {DURATION_OPTIONS
                      .filter((option) => option.days > 7)
                      .map((option) => (
                        <option
                          key={option.days}
                          value={option.days}
                        >
                          +{option.days} days
                        </option>
                      ))}
                  </select>

                  <div className="w-36">
                    <Field
                      label=""
                      value={renewAmount}
                      onChange={setRenewAmount}
                      placeholder="Amount ₹"
                      inputMode="decimal"
                    />
                  </div>

                  <select
                    value={renewMethod}
                    onChange={(e) => setRenewMethod(e.target.value)}
                    disabled={busy}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>

                  <Button
                    onClick={handleRenew}
                    disabled={busy}
                  >
                    <RefreshCw size={14} />
                    {busy ? 'Please wait...' : 'Renew subscription'}
                  </Button>
                </div>
              </div>
              )}

              {/* Account actions */}
              <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-3 font-bold text-slate-800">
                  Account actions
                </h3>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleResetPassword}
                    disabled={busy}
                  >
                    <KeyRound size={14} />
                    Reset password
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={handleResetDevice}
                    disabled={busy || !current.deviceId}
                  >
                    <MonitorSmartphone size={14} />
                    Reset device
                  </Button>

                  <Button
                    variant="danger"
                    onClick={handleDelete}
                    disabled={busy}
                  >
                    <Trash2 size={14} />
                    Delete restaurant
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Edit form */
            <form
              onSubmit={submitEdit}
              className="grid gap-3 md:grid-cols-2"
            >
              <Field
                label="Restaurant name"
                value={form.name}
                onChange={set('name')}
                placeholder="Restaurant name"
              />

              <Field
                label="Owner name"
                value={form.ownerName}
                onChange={set('ownerName')}
                placeholder="Owner name"
              />

              <Field
                label="Mobile number"
                value={form.mobile}
                onChange={set('mobile')}
                placeholder="10-digit mobile number"
                inputMode="numeric"
              />

              <Field
                label="Email"
                value={form.email}
                onChange={set('email')}
                placeholder="owner@example.com"
                type="email"
              />

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">
                  Plan
                </span>

                <select
                  value={form.days}
                  onChange={(e) => {
                    set('days')(e.target.value)
                    set('amount')(String(defaultPrice(e.target.value)))
                  }}
                  className={selectClass}
                >
                  {PLAN_OPTIONS.map((option) => (
                    <option
                      key={option.days}
                      value={option.days}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                The linked device stays unchanged. Use Reset password or
                Reset device separately.
              </div>

              {error && (
                <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 md:col-span-2">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 md:col-span-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditMode(false)
                    setError('')
                  }}
                  disabled={busy}
                >
                  Back
                </Button>

                <Button type="submit" disabled={busy}>
                  {busy ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Register modal */}
      {showForm && (
        <Modal
          title="Register restaurant"
          subtitle="Create a restaurant account. The owner links a device on first login."
          size="lg"
          onClose={() => setShowForm(false)}
        >
          <form
            onSubmit={submitRegistration}
            className="grid gap-3 md:grid-cols-2"
          >
            <Field
              label="Restaurant name"
              value={form.name}
              onChange={set('name')}
              placeholder="Restaurant name"
            />

            <Field
              label="Owner name"
              value={form.ownerName}
              onChange={set('ownerName')}
              placeholder="Owner name"
            />

            <Field
              label="Mobile number"
              value={form.mobile}
              onChange={set('mobile')}
              placeholder="10-digit mobile"
              inputMode="numeric"
            />

            <Field
              label="Email"
              value={form.email}
              onChange={set('email')}
              placeholder="owner@example.com"
              type="email"
            />

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">
                Plan
              </span>

              <select
                value={form.days}
                onChange={(e) => {
                    set('days')(e.target.value)
                    set('amount')(String(defaultPrice(e.target.value)))
                  }}
                className={selectClass}
              >
                {PLAN_OPTIONS.map((option) => (
                  <option
                    key={option.days}
                    value={option.days}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <Field
              label="Owner login password"
              value={form.password}
              onChange={set('password')}
              placeholder="Minimum 6 characters"
            />

            <Field
              label="Amount received (₹)"
              value={form.amount}
              onChange={set('amount')}
              placeholder="0 for a free trial"
              inputMode="decimal"
            />

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">
                Payment method
              </span>

              <select
                value={form.method}
                onChange={(e) => set('method')(e.target.value)}
                className={selectClass}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </label>

            {error && (
              <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 md:col-span-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 md:col-span-2">
              <Button
                variant="secondary"
                onClick={() => setShowForm(false)}
                disabled={busy}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={busy}>
                {busy ? 'Saving...' : 'Register restaurant'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Credentials modal */}
      {created && (
        <Modal
          title={created.title}
          subtitle={created.record.name}
          onClose={() => setCreated(null)}
        >
          <div className="space-y-4">
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <div className="text-xs text-slate-500">
                  Owner login
                </div>

                <div className="break-all font-semibold">
                  {created.record.email}
                </div>

                <div className="text-xs text-slate-500">
                  or {created.record.mobile}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">
                  Password
                </div>

                <code className="font-bold">
                  {created.password}
                </code>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <CopyButton
                text={shareText(
                  created.record,
                  created.password
                )}
                label="Copy details"
              />

              <Button onClick={() => setCreated(null)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}