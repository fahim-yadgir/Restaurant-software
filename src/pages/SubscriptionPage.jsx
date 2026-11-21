import { LockKeyhole, Wifi, Phone, CalendarClock } from 'lucide-react'
import Button from '../components/ui/Button'
export default function SubscriptionPage({ license, onRenew }) {
  const date = license?.expiresAt ? new Date(license.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Unknown'
  return <div className="expiry-screen"><div className="expiry-card">
    <div className="expiry-icon"><LockKeyhole size={28}/></div><span className="eyebrow">PLAN EXPIRED</span>
    <h2>Your RestroDesk plan has ended</h2>
    <p className="muted">This one-year plan expired on <b>{date}</b>. Please contact the software owner to renew your subscription.</p>
    <div className="expiry-detail"><CalendarClock size={18}/><div><b>Restaurant data is still saved</b><span>Your local records have not been deleted. Billing and management screens are locked until renewal.</span></div></div>
    <div className="expiry-detail"><Phone size={18}/><div><b>Contact the software owner</b><span>Ask the owner for a renewal or new activation code.</span></div></div>
    <div className="expiry-detail"><Wifi size={18}/><div><b>Internet required for renewal</b><span>Connect this PC after the owner confirms the renewal.</span></div></div>
    <Button className="w-full mt-5" onClick={onRenew}>Renew demo plan (test only)</Button>
    <p className="fine-print">The renewal button is for local demonstration only. A production app must validate a signed renewal with the licensing server.</p>
  </div></div>
}
