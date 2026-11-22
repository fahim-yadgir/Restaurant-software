
import { useState } from 'react'
import { Plus } from 'lucide-react'

import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import CopyButton from '@/components/ui/CopyButton'
import RestaurantRow from '@/components/admin/RestaurantRow'

import { DURATION_OPTIONS } from '@/lib/appConfig'
import { generatePassword, validateRegistration } from '@/lib/registry'
import { notifySuccess, notifyError } from '@/lib/toast'

const emptyForm = () => ({
  name: '',
  ownerName: '',
  mobile: '',
  email: '',
  days: '90',
  password: generatePassword(),
})

const selectClass =
  'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm'

function shareText(record, password) {
  return [
    'RestroDesk – restaurant registered',
    `Restaurant: ${record.name}`,
    `Owner: ${record.ownerName}`,
    `Mobile: ${record.mobile}`,
    `Email: ${record.email}`,
    `Subscription: ${record.durationDays} days`,
    '',
    `Activation code: ${record.code}`,
    `Owner login: ${record.email} or ${record.mobile}`,
    `Password: ${password}`,
  ].join('\n')
}

export default function RestaurantsPage({
  registry,
  now,
  onCreate,
  onRenew,
  onResetPassword,
  onDelete,
}) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(null)

  const set = (key) => (value) => {
    setForm((old) => ({
      ...old,
      [key]: value,
    }))
  }

  const openForm = () => {
    setForm(emptyForm())
    setError('')
    setShowForm(true)
  }

  const submit = async (event) => {
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
        durationDays: Number(form.days),
      })

      setCreated({
        record,
        password: form.password,
        title: 'Restaurant registered',
      })

      setShowForm(false)

      notifySuccess('Restaurant registered successfully!')
    } catch (err) {
      const message =
        err.message || 'Could not save the restaurant. Please try again.'

      setError(message)
      notifyError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold">
            Restaurants & subscriptions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Register a restaurant, generate its activation code and manage its subscription.
          </p>
        </div>

        <Button onClick={openForm}>
          <Plus size={15} />
          Register restaurant
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              {[
                'Restaurant',
                'Owner',
                'Activation code',
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
                onRenew={onRenew}
                onResetPassword={onResetPassword}
                onDelete={onDelete}
                onShowCredentials={(record, password) =>
                  setCreated({
                    record,
                    password,
                    title: 'New password issued',
                  })
                }
              />
            ))}

            {registry.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  No restaurants registered yet. Click Register restaurant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        <b>Demo limitation:</b> This registry lives in this browser. For restaurants on their own computers, connect these actions to a server API.
      </div>

      {showForm && (
        <Modal
          title="Register restaurant"
          subtitle="An activation code and owner login are generated for you"
          size="lg"
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            <Field
              label="Restaurant name"
              value={form.name}
              onChange={set('name')}
              placeholder="Restaurant name"
              autoFocus
            />

            <Field
              label="Owner name"
              value={form.ownerName}
              onChange={set('ownerName')}
              placeholder="Owner full name"
            />

            <Field
              label="Owner mobile number"
              value={form.mobile}
              onChange={set('mobile')}
              placeholder="10-digit mobile"
              inputMode="numeric"
            />

            <Field
              label="Owner email"
              value={form.email}
              onChange={set('email')}
              placeholder="owner@example.com"
              type="email"
            />

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">
                Subscription duration
              </span>

              <select
                value={form.days}
                onChange={(event) => set('days')(event.target.value)}
                className={`${selectClass} w-full`}
              >
                {DURATION_OPTIONS.map((option) => (
                  <option key={option.days} value={option.days}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <Field
              label="Owner login password"
              value={form.password}
              onChange={set('password')}
              placeholder="Min 6 characters"
            />

            {error && (
              <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 md:col-span-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 md:col-span-2">
              <Button
                variant="secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={busy}>
                {busy ? 'Saving...' : 'Register & generate activation code'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {created && (
        <Modal
          title={created.title}
          subtitle={created.record.name}
          onClose={() => setCreated(null)}
        >
          <div className="space-y-4">
            <div className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <div className="text-xs text-slate-500">Activation code</div>
                <code className="text-lg font-extrabold tracking-wider">
                  {created.record.code}
                </code>
              </div>

              <div>
                <div className="text-xs text-slate-500">Owner login</div>
                <div className="break-all font-semibold">
                  {created.record.email}
                </div>
                <div className="text-xs text-slate-600">
                  or {created.record.mobile}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Password</div>
                <code className="text-lg font-extrabold">
                  {created.password}
                </code>
              </div>
            </div>

            <p className="rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
              Share these details with the owner. The password is stored as a hash and cannot be displayed again.
            </p>

            <div className="flex justify-end gap-2">
              <CopyButton
                text={shareText(created.record, created.password)}
                label="Copy details to send"
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
