import { useEffect, useState } from 'react'
import { Wifi, WifiOff, Utensils, ShieldCheck, CalendarClock } from 'lucide-react'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'

export default function SetupPage({ onComplete }) {
  const [restaurantName, setRestaurantName] = useState('Spice Garden Family Restaurant')
  const [ownerName, setOwnerName] = useState('')
  const [activationCode, setActivationCode] = useState('')
  const [error, setError] = useState('')
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => { const onOnline = () => setOnline(true); const onOffline = () => setOnline(false); window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline); return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) } }, [])
  const submit = (event) => {
    event.preventDefault()
    if (!online) { setError('Connect this computer to the internet to complete the first-time setup.'); return }
    if (!restaurantName.trim() || !ownerName.trim() || !activationCode.trim()) { setError('Please complete all fields.'); return }
    // Demo activation code. Replace with a server-verified activation API before production.
    if (activationCode.trim().toUpperCase() !== 'RD-DEMO-365') { setError('Invalid demo activation code.'); return }
    onComplete({ restaurantName: restaurantName.trim(), ownerName: ownerName.trim() })
  }
  return <main className="setup-shell">
    <section className="setup-brand">
      <div className="brand-mark"><Utensils size={22}/></div><span>RestroDesk POS</span>
      <div className="setup-pitch"><span className="eyebrow">ONE-TIME ACTIVATION</span><h1>Your counter.<br/><em>Your data.</em><br/>Your control.</h1><p>Complete setup while connected. After activation, day-to-day restaurant work is stored locally on this computer.</p></div>
      <div className="setup-note"><ShieldCheck size={17}/> Local-first restaurant workspace</div>
    </section>
    <section className="setup-form-wrap"><form className="setup-form" onSubmit={submit}>
      <div className="online-state">{online ? <><Wifi size={16}/> Internet connected for setup</> : <><WifiOff size={16}/> Internet connection required</>}</div>
      <span className="eyebrow">WELCOME TO RESTRODESK</span><h2>Set up your restaurant</h2><p className="muted">Enter the restaurant details and activation code supplied by the software owner.</p>
      <Field label="Restaurant name" value={restaurantName} onChange={setRestaurantName}/>
      <Field label="Owner name" value={ownerName} onChange={setOwnerName} placeholder="Enter owner name"/>
      <Field label="Activation code" value={activationCode} onChange={setActivationCode} placeholder="Enter activation code"/>
      {error && <p className="form-error">{error}</p>}
      <div className="license-info"><CalendarClock size={18}/><div><b>365-day plan</b><span>The one-year countdown starts after activation.</span></div></div>
      <Button type="submit" className="w-full py-3">Activate and continue</Button>
      <p className="fine-print">Demo build: use <b>RD-DEMO-365</b>. This local demo code is not secure licensing. Connect a server activation API before commercial release.</p>
    </form></section>
  </main>
}
