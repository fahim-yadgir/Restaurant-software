import {useState} from 'react'
import {Plus,Save} from 'lucide-react'
import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import {localDate} from '@/lib/pigmy'

const ROLES=['Waiter','Chef','Cashier','Manager','Helper','Other']

// Add staff / edit staff details. Shown inside a popup.
export default function StaffForm({initial,onSubmit,onCancel}) {
  const editing=!!initial
  const [name,setName]=useState(initial?.name||'')
  const [role,setRole]=useState(initial?.role||'Waiter')
  const [mobile,setMobile]=useState(initial?.mobile||'')
  const [salary,setSalary]=useState(initial?.salary!=null?String(initial.salary):'')
  const [joinedOn,setJoinedOn]=useState(initial?.joinedOn||localDate())
  const [error,setError]=useState('')
  const roles=ROLES.includes(role)?ROLES:[role,...ROLES]

  const submit=e=>{
    e.preventDefault()
    if(!name.trim()) return setError('Enter the employee name.')
    const digits=mobile.replace(/\D/g,'').slice(-10)
    if(mobile.trim()&&!/^[6-9]\d{9}$/.test(digits)) return setError('Enter a valid 10-digit mobile number or leave it empty.')
    if(!(Number(salary)>0)) return setError('Enter the monthly salary (above 0).')
    onSubmit({name:name.trim(),role,mobile:mobile.trim()?digits:'',salary:Number(salary),joinedOn})
  }

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
      <Field label="Employee name *" value={name} onChange={setName} placeholder="Full name" autoFocus/>
      <label className="space-y-1.5 text-xs font-semibold text-slate-600">Role
        <select value={role} onChange={e=>setRole(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          {roles.map(r=><option key={r}>{r}</option>)}
        </select>
      </label>
      <Field label="Mobile number" value={mobile} onChange={setMobile} placeholder="10-digit mobile" inputMode="numeric"/>
      <Field label="Monthly salary (₹) *" type="number" min="0" value={salary} onChange={setSalary} placeholder="10000"/>
      <Field label="Joining date" type="date" value={joinedOn} onChange={setJoinedOn}/>
      {error&&<p className="form-error md:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 md:col-span-2">
        {onCancel&&<Button variant="secondary" onClick={onCancel}>Cancel</Button>}
        <Button type="submit">{editing?<><Save size={15}/> Save changes</>:<><Plus size={15}/> Add staff</>}</Button>
      </div>
    </form>
  )
}