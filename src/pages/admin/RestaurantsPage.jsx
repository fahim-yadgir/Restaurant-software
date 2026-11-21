import { useState } from 'react'
import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import CopyButton from '@/components/ui/CopyButton'
import RestaurantRow from '@/components/admin/RestaurantRow'
import { DURATION_OPTIONS } from '@/lib/appConfig'
import { generatePassword, validateRegistration } from '@/lib/registry'

const emptyForm = () => ({ name: '', ownerName: '', mobile: '', email: '', days: '90', password: generatePassword() })
const selectClass = 'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm'

function shareText(record, password) {
  return [
    'RestroDesk – restaurant registered',
    `Restaurant: ${record.name}`,
    `Owner: ${record.ownerName}`,
    `Mobile: ${record.mobile}`,
    `Email: ${record.email}`,
    `Subscription: ${record.durationDays} days (countdown starts when the code is activated)`,
    '',
    `Activation code: ${record.code}`,
    `Owner login: ${record.email} or ${record.mobile}`,
    `Password: ${password}`,
  ].join('\n')
}

export default function RestaurantsPage({ registry, now, onCreate, onRenew, onResetPassword, onDelete }) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(null)
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    const problem = validateRegistration(form, registry)
    if (problem) { setError(problem); return }
    setBusy(true); setError('')
    try {
      const record = await onCreate({ ...form, durationDays: Number(form.days) })
      setCreated({ record, password: form.password, title: 'Restaurant registered' })
      setForm(emptyForm())
    } catch { setError('Could not save the restaurant. Please try again.') }
    finally { setBusy(false) }
  }

  return <div className="space-y-5">
    <div><h2 className="font-display text-xl font-extrabold">Restaurants & subscriptions</h2><p className="mt-1 text-sm text-slate-500">Register a restaurant, generate its activation code and manage its subscription. Records are saved and survive refresh.</p></div>

    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2">
      <Field label="Restaurant name" value={form.name} onChange={set('name')} placeholder="Restaurant name" />
      <Field label="Owner name" value={form.ownerName} onChange={set('ownerName')} placeholder="Owner full name" />
      <Field label="Owner mobile number" value={form.mobile} onChange={set('mobile')} placeholder="10-digit mobile" inputMode="numeric" />
      <Field label="Owner email" value={form.email} onChange={set('email')} placeholder="owner@example.com" type="email" />
      <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Subscription duration</span><select value={form.days} onChange={(e) => set('days')(e.target.value)} className={`${selectClass} w-full`}>{DURATION_OPTIONS.map((o) => <option key={o.days} value={o.days}>{o.label}</option>)}</select></label>
      <Field label="Owner login password" value={form.password} onChange={set('password')} placeholder="Min 6 characters" />
      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 md:col-span-2">{error}</p>}
      <Button type="submit" disabled={busy} className="md:col-span-2">{busy ? 'Saving…' : 'Register restaurant & generate activation code'}</Button>
    </form>

    {created && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><b className="text-emerald-900">{created.title}: {created.record.name}</b><div className="flex gap-2"><CopyButton text={shareText(created.record, created.password)} label="Copy details to send" /><Button variant="ghost" onClick={() => setCreated(null)} className="!px-3 !py-2 text-xs">Dismiss</Button></div></div>
      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <div><div className="text-xs text-emerald-700">Activation code</div><code className="text-lg font-extrabold tracking-wider">{created.record.code}</code></div>
        <div><div className="text-xs text-emerald-700">Owner login</div><div className="font-semibold">{created.record.email}</div><div className="text-xs text-slate-600">or {created.record.mobile}</div></div>
        <div><div className="text-xs text-emerald-700">Password</div><code className="text-lg font-extrabold">{created.password}</code></div>
      </div>
      <p className="mt-3 text-xs text-emerald-800">Share these with the owner now. The password is stored only as a hash, so it cannot be shown again (use “Reset password” to issue a new one).</p>
    </div>}

    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Restaurant', 'Owner', 'Activation code', 'Plan', 'Status', 'Expires', 'Actions'].map((x) => <th className="px-5 py-4" key={x}>{x}</th>)}</tr></thead>
        <tbody>
          {registry.map((r) => <RestaurantRow key={r.id} r={r} now={now} onRenew={onRenew} onResetPassword={onResetPassword} onDelete={onDelete} onShowCredentials={(rec, pw) => setCreated({ record: rec, password: pw, title: 'New password issued' })} />)}
          {registry.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">No restaurants registered yet. Use the form above.</td></tr>}
        </tbody>
      </table>
    </div>

    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900"><b>Demo limitation:</b> this registry lives in this browser, so a restaurant can only activate in the same browser profile. For restaurants on their own computers, connect these actions to a server API. The subscription countdown starts only when the restaurant activates its code.</div>
  </div>
}
