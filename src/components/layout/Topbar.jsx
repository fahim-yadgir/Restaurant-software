import { WifiOff, Bell, CalendarClock } from 'lucide-react'
export default function Topbar({ title, licenseStatus }) {
  const active = licenseStatus && !licenseStatus.expired
  return <header className="app-topbar"><div className="topbar-title"><h1>{title}</h1><p>Restaurant management workspace</p></div>
    <div className="topbar-actions">{active && <span className="plan-countdown" title="Time remaining on this demo license"><CalendarClock size={14}/><span>{licenseStatus.days}d {String(licenseStatus.hours).padStart(2,'0')}:{String(licenseStatus.minutes).padStart(2,'0')}:{String(licenseStatus.seconds).padStart(2,'0')}</span></span>}<span className="offline-pill"><WifiOff size={14}/> Offline mode</span><button className="icon-button" aria-label="Notifications"><Bell size={18}/></button><div className="avatar">RD</div></div>
  </header>
}
