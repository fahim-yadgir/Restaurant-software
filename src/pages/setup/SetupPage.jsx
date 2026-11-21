import { useState } from 'react'
import { Wifi, WifiOff, Utensils, ShieldCheck, CalendarClock, CheckCircle2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import useOnlineStatus from '@/hooks/useOnlineStatus'
import { DAY_MS, formatDate } from '@/lib/registry'

export default function SetupPage({ onLookup, onActivate }) {
  const [code, setCode] = useState('')
  const [restaurant, setRestaurant] = useState(null) // set after the code is verified
  const [error, setError] = useState('')
  const online = useOnlineStatus()

  const verify = (event) => {
    event.preventDefault()
    if (!online) { setError('Connect this computer to the internet to complete the first-time activation.'); return }
    const result = onLookup(code)
    if (result.error) { setError(result.error); return }
    setError(''); setRestaurant(result.restaurant)
  }
  const confirm = () => {
    if (!online) { setError('Connect this computer to the internet to complete the first-time activation.'); return }
    if (!onActivate(restaurant.id)) { setError('Activation failed. This code may already be used.'); setRestaurant(null) }
  }
  const backToCode = () => { setRestaurant(null); setError('') }

  return <main className="setup-shell">
    <section className="setup-brand">
      <div className="brand-mark"><Utensils size={22}/></div><span>RestroDesk POS</span>
      <div className="setup-pitch"><span className="eyebrow">ONE-TIME ACTIVATION</span><h1>Your counter.<br/><em>Your data.</em><br/>Your control.</h1><p>Activate while connected. After activation, day-to-day restaurant work is stored locally on this computer and works offline.</p></div>
      <div className="setup-note"><ShieldCheck size={17}/> Local-first restaurant workspace</div>
    </section>
    <section className="setup-form-wrap">
      {!restaurant ? <form className="setup-form" onSubmit={verify}>
        <div className="online-state">{online ? <><Wifi size={16}/> Internet connected for activation</> : <><WifiOff size={16}/> Internet connection required</>}</div>
        <span className="eyebrow">STEP 1 OF 2</span><h2>Activate your restaurant</h2><p className="muted">Enter the activation code supplied by the software owner. We will find your registered restaurant.</p>
        <Field label="Activation code" value={code} onChange={setCode} placeholder="RD-XXXX-XXXX" autoFocus />
        {error && <p className="form-error">{error}</p>}
        <Button type="submit" className="w-full py-3">Verify code</Button>
        <p className="fine-print">Demo build: the registry is stored in this browser, so register the restaurant in the Platform Admin (<b>/admin/login</b>) in the same browser first.</p>
      </form> : <div className="setup-form">
        <div className="online-state">{online ? <><Wifi size={16}/> Internet connected for activation</> : <><WifiOff size={16}/> Internet connection required</>}</div>
        <span className="eyebrow">STEP 2 OF 2</span><h2>Confirm your details</h2><p className="muted">Code verified <CheckCircle2 size={14} className="inline text-emerald-600"/> Please check that these are your restaurant details.</p>
        <dl className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm">
          {[['Restaurant', restaurant.name], ['Owner', restaurant.ownerName], ['Mobile', restaurant.mobile], ['Email', restaurant.email]].map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-slate-500">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>)}
        </dl>
        <div className="license-info"><CalendarClock size={18}/><div><b>{restaurant.durationDays}-day subscription</b><span>The countdown starts when you confirm. It will end on {formatDate(Date.now() + restaurant.durationDays * DAY_MS)}.</span></div></div>
        {error && <p className="form-error">{error}</p>}
        <Button className="w-full py-3" onClick={confirm}>Confirm & start subscription</Button>
        <Button variant="ghost" className="w-full" onClick={backToCode}>Use a different code</Button>
      </div>}
    </section>
  </main>
}
