import {useState} from 'react'
import {Plus,ChevronRight,Phone,CalendarDays} from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import StaffForm from '@/components/staff/StaffForm'
import {money} from '@/lib/format'
import {fmtDay,initials} from '@/lib/staff'

// Staff list: only staff details. Click a staff member to open their profile and manage payments.
export default function StaffPage({staff,onAdd,onOpen}) {
  const [adding,setAdding]=useState(false)
  const totalSalary=staff.reduce((t,s)=>t+Number(s.salary||0),0)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold">Staff</h2>
          <p className="mt-1 text-sm text-slate-500">{staff.length} staff member{staff.length===1?'':'s'} · monthly salary total {money(totalSalary)}. Open a profile to pay salary or advance.</p>
        </div>
        <Button onClick={()=>setAdding(true)}><Plus size={15}/> Add staff</Button>
      </div>

      {staff.length===0
        ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">No staff added yet. Click “Add staff” to add your first employee.</div>
        : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {staff.map(s=>(
              <button key={s.id} type="button" onClick={()=>onOpen(s.id)} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-orange-300 hover:shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-50 text-sm font-extrabold text-orange-600">{initials(s.name)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.role}</div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-orange-500"/>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span className="text-slate-500">Monthly salary</span><b>{money(s.salary)}</b></div>
                  <div className="flex items-center gap-2 text-xs text-slate-500"><Phone size={13}/>{s.mobile||'Mobile not added'}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500"><CalendarDays size={13}/>Joined {fmtDay(s.joinedOn)}</div>
                </div>
                <div className="mt-4 text-xs font-bold text-orange-600">Open profile & manage →</div>
              </button>
            ))}
          </div>}

      {adding&&(
        <Modal title="Add staff" subtitle="Employee details" onClose={()=>setAdding(false)}>
          <StaffForm onSubmit={d=>{onAdd(d);setAdding(false)}} onCancel={()=>setAdding(false)}/>
        </Modal>
      )}
    </div>
  )
}