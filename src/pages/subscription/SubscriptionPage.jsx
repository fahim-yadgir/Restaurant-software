import { useState } from 'react'
import { LockKeyhole, Wifi, Phone, Mail, MessageCircle, CalendarClock } from 'lucide-react'
import Button from '@/components/ui/Button'
import { SUPPORT } from '@/lib/appConfig'
import { formatDate } from '@/lib/registry'

export default function SubscriptionPage({ license, onCheckRenewal }) {
  const [message, setMessage] = useState('')
  const check = () => setMessage(onCheckRenewal() ? '' : 'No renewal found yet. Contact the software owner, then try again.')
  return <div className="expiry-screen"><div className="expiry-card">
    <div className="expiry-icon"><LockKeyhole size={28}/></div><span className="eyebrow">SUBSCRIPTION EXPIRED</span>
    <h2>{license.restaurantName}: plan ended</h2>
    <p className="muted">Your subscription ended on <b>{formatDate(license.expiresAt)}</b>. Billing and management screens are locked until it is renewed.</p>
    <div className="expiry-detail"><CalendarClock size={18}/><div><b>Your data is safe</b><span>All bills, menu, expenses and staff records are still saved on this computer. Nothing has been deleted and everything returns after renewal.</span></div></div>
    <div className="expiry-detail"><Phone size={18}/><div><b>Contact {SUPPORT.name} to renew</b><span><a className="font-semibold underline" href={`tel:${SUPPORT.phone.replace(/\s/g, '')}`}>{SUPPORT.phone}</a> · {SUPPORT.hours}</span></div></div>
    <div className="expiry-detail"><MessageCircle size={18}/><div><b>WhatsApp / email</b><span><a className="font-semibold underline" href={`https://wa.me/${SUPPORT.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a> · <a className="font-semibold underline" href={`mailto:${SUPPORT.email}?subject=Renewal%20-%20${encodeURIComponent(license.restaurantName)}`}><Mail size={11} className="inline"/> {SUPPORT.email}</a></span></div></div>
    <div className="expiry-detail"><Wifi size={18}/><div><b>After the owner confirms renewal</b><span>Mention your restaurant name and activation code <b>{license.code}</b>. Then connect to the internet and tap the button below.</span></div></div>
    <Button className="w-full mt-5" onClick={check}>Check for renewal</Button>
    {message && <p className="form-error mt-3">{message}</p>}
  </div></div>
}
