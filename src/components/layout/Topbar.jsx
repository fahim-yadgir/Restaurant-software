import { WifiOff, Bell, CalendarClock } from 'lucide-react'

const initials = (text) => (text || 'RD').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'RD'

export default function Topbar({ title, subtitle, initialsFrom, licenseStatus }) {
  const active = licenseStatus && !licenseStatus.expired
  const pad = (n) => String(n).padStart(2, '0')
  return <header className="app-topbar"><div className="topbar-title"><h1>{title}</h1><p>{subtitle}</p></div>
    <div className="topbar-actions">{active && <span className="plan-countdown" title="Time remaining on this subscription"><CalendarClock size={14}/><span>{licenseStatus.days}d {pad(licenseStatus.hours)}:{pad(licenseStatus.minutes)}:{pad(licenseStatus.seconds)}</span></span>}<span className="offline-pill"><WifiOff size={14}/> Offline mode</span><button className="icon-button" aria-label="Notifications"><Bell size={18}/></button><div className="avatar">{initials(initialsFrom)}</div></div>
  </header>
}
