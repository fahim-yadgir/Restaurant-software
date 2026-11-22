import {useState} from 'react'
import {LogOut,KeyRound,ShieldCheck,TriangleAlert} from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ChangePasswordForm from '@/components/account/ChangePasswordForm'
import {ADMIN_EMAIL,changeAdminPassword,usingDefaultPassword} from '@/lib/adminAuth'

const card='rounded-2xl border border-slate-200 bg-white p-5'

// Super admin account page: profile, change password and sign out.
export default function AccountPage({onLogout}) {
  const [open,setOpen]=useState(false)
  const [,refresh]=useState(0)
  const isDefault=usingDefaultPassword()

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="font-display text-xl font-extrabold">Account & security</h2>
        <p className="mt-1 text-sm text-slate-500">Manage the platform admin password and sign out.</p>
      </div>

      <div className={card}>
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-50 text-orange-600"><ShieldCheck size={26}/></div>
          <div>
            <div className="font-bold">Super admin</div>
            <div className="text-sm text-slate-500">{ADMIN_EMAIL}</div>
          </div>
        </div>
      </div>

      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-bold"><KeyRound size={17}/> Password</div>
            <p className="mt-1 text-sm text-slate-500">Choose a strong password that only you know.</p>
          </div>
          <Button onClick={()=>setOpen(true)}>Change password</Button>
        </div>
        {isDefault&&(
          <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <TriangleAlert className="mt-0.5 shrink-0" size={17}/>
            <span>You are still using the default demo password. Please change it now.</span>
          </div>
        )}
      </div>

      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-bold"><LogOut size={17}/> Sign out</div>
            <p className="mt-1 text-sm text-slate-500">End this admin session on this browser.</p>
          </div>
          <Button variant="secondary" onClick={onLogout}>Sign out</Button>
        </div>
      </div>

      <p className="text-xs leading-5 text-slate-500">Demo note: the admin password is saved (as a salted hash) in this browser only. For a real product, move admin sign-in to a secure server.</p>

      {open&&(
        <Modal title="Change password" subtitle="Super admin" size="sm" onClose={()=>setOpen(false)}>
          <ChangePasswordForm onSubmit={changeAdminPassword} onDone={()=>{setOpen(false);refresh(n=>n+1)}}/>
        </Modal>
      )}
    </div>
  )
}