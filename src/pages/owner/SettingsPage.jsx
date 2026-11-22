import {useState} from 'react'
import {LogOut,KeyRound} from 'lucide-react'
import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import ChangePasswordForm from '@/components/account/ChangePasswordForm'
import { formatDate } from '@/lib/registry'

export default function SettingsPage({ license, licenseStatus, onLogout, onChangePassword }) {
  const [name,setName]=useState(license.restaurantName),[phone,setPhone]=useState(license.ownerMobile),[gst,setGst]=useState('')
  const [pwOpen,setPwOpen]=useState(false)
  const backup=()=>{const data={restaurant:{name,phone,gst},exportedAt:new Date().toISOString(),note:'Frontend demo backup. Production backup must export SQLite database.'};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='restrodesk-settings-backup.json';a.click()}
  const rows=[['Restaurant',license.restaurantName],['Owner',license.ownerName],['Mobile',license.ownerMobile],['Email',license.ownerEmail],['Activated on',formatDate(license.activatedAt)],['Expires on',formatDate(license.expiresAt)],['Time remaining',`${licenseStatus.days} days ${licenseStatus.hours}h ${licenseStatus.minutes}m`]]
  return <div className="max-w-2xl space-y-5">
    <div><h2 className="font-display text-xl font-extrabold">Restaurant profile & backup</h2><p className="mt-1 text-sm text-slate-500">Restaurant header details used on printed invoices.</p></div>
    <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-4 flex items-center justify-between"><b>Subscription</b><Badge tone="green">Active · {license.durationDays}-day plan</Badge></div><dl className="grid gap-2.5 text-sm">{rows.map(([k,v])=><div key={k} className="flex justify-between gap-4"><dt className="text-slate-500">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>)}</dl></div>
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><Field label="Restaurant name" value={name} onChange={setName}/><Field label="Phone number" value={phone} onChange={setPhone}/><Field label="GSTIN" value={gst} onChange={setGst} placeholder="Enter GSTIN"/><Button onClick={backup}>Export demo backup</Button></div>

    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <b>Account & security</b>
      <p className="mt-1 text-sm text-slate-500">Signed in as {license.ownerName} ({license.ownerEmail}).</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={()=>setPwOpen(true)}><KeyRound size={15}/> Change password</Button>
        <Button variant="secondary" onClick={onLogout}><LogOut size={15}/> Sign out</Button>
      </div>
    </div>

    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-900"><b>Local data ownership:</b> Application data and transaction records are stored on the restaurant's counter PC. Physical PC security and periodic drive backups are managed by the client. This frontend prototype uses browser storage only; SQLite backup will be added with the desktop/backend layer.</div>

    {pwOpen&&(
      <Modal title="Change password" subtitle={license.restaurantName} size="sm" onClose={()=>setPwOpen(false)}>
        <ChangePasswordForm onSubmit={onChangePassword} onDone={()=>setPwOpen(false)}/>
      </Modal>
    )}
  </div>
}