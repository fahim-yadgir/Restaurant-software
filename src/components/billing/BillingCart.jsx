import {Trash2,Minus,Plus} from 'lucide-react'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import {money} from '@/lib/format'

const METHODS=['Cash','UPI','Card','Credit','Split']

export default function BillingCart({items,setItems,payment,setPayment,discount,setDiscount,onGenerate,accounts=[],accountId='',setAccountId}) {
  const subtotal=items.reduce((s,x)=>s+x.price*x.qty,0)
  const disc=Math.min(subtotal,Math.max(0,Number(discount)||0))
  const change=(i,d)=>setItems(items.map((x,n)=>n===i?{...x,qty:Math.max(1,x.qty+d)}:x))
  const canLink=(payment==='UPI'||payment==='Card')&&accounts.length>0
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      {/* 1. Items */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Current bill</h3>
        <span className="text-xs text-slate-500">{items.length} lines</span>
      </div>
      <div className="mt-4 min-h-32 space-y-3">
        {items.length===0
          ? <div className="grid h-28 place-items-center text-sm text-slate-400">Choose food items to start a bill</div>
          : items.map((x,i)=>(
            <div key={i} className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{x.name}</div>
                <div className="text-xs text-slate-500">{x.variant} · {money(x.price)}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={()=>change(i,-1)} className="rounded-md bg-slate-100 p-1"><Minus size={12}/></button>
                <span className="w-5 text-center text-sm">{x.qty}</span>
                <button onClick={()=>change(i,1)} className="rounded-md bg-slate-100 p-1"><Plus size={12}/></button>
                <button onClick={()=>setItems(items.filter((_,n)=>n!==i))} className="ml-1 text-rose-500"><Trash2 size={15}/></button>
              </div>
              <b className="text-sm">{money(x.price*x.qty)}</b>
            </div>
          ))}
      </div>

      {/* 2. Payment method (middle) */}
      <div className="mt-4 border-t border-dashed border-slate-200 pt-4">
        <div className="mb-2 text-xs font-semibold text-slate-600">Payment method</div>
        <div className="grid grid-cols-3 gap-2">
          {METHODS.map(x=>(
            <button key={x} type="button" onClick={()=>setPayment(x)} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${payment===x?'border-orange-400 bg-orange-50 text-orange-700':'border-slate-200 text-slate-600'}`}>{x}</button>
          ))}
        </div>

        {/* UPI / Card money goes to the bank: optionally credit it to a bank / pigmy account */}
        {canLink&&(
          <label className="mt-3 block space-y-1.5 text-xs font-semibold text-slate-600">Credit to account (optional)
            <select value={accountId} onChange={e=>setAccountId(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
              <option value="">Not linked to any account</option>
              {accounts.map(a=><option key={a.id} value={a.id}>{a.bankName}{a.accountName?` · ${a.accountName}`:''}</option>)}
            </select>
          </label>
        )}
      </div>

      {/* 3. Discount (middle, after payment) */}
      <div className="mt-4">
        <Field label="Discount amount (₹)" type="number" min="0" value={discount} onChange={setDiscount}/>
      </div>

      {/* Totals */}
      <div className="mt-4 space-y-2 border-t border-dashed border-slate-200 pt-4 text-sm">
        <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{money(subtotal)}</span></div>
        <div className="flex justify-between text-slate-500"><span>Discount</span><span>−{money(disc)}</span></div>
        <div className="flex justify-between text-slate-500"><span>GST estimate</span><span>Calculated on invoice</span></div>
        <div className="flex justify-between text-lg font-extrabold"><span>Total (before GST)</span><span>{money(subtotal-disc)}</span></div>
      </div>

      {/* 4. Generate bill (last) */}
      <Button className="mt-5 w-full" disabled={!items.length} onClick={onGenerate}>Generate bill</Button>
    </div>
  )
}