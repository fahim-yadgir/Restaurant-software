import {useState} from 'react'
import {Minus,Plus} from 'lucide-react'
import {money} from '@/lib/format'

export default function FoodCard({food,onAdd}) {
  const [qty,setQty]=useState(1)
  const setSafeQty=n=>setQty(Math.min(99,Math.max(1,Number(n)||1)))
  const add=v=>{onAdd(food,v,qty);setQty(1)}
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5 transition hover:border-orange-300 hover:shadow-sm">
      <div className="truncate text-[13px] font-bold leading-tight text-slate-900" title={food.name}>{food.name}</div>
      <div className="truncate text-[10px] text-slate-500">{food.category}</div>

      <div className="mt-2 flex items-center justify-between gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Qty</span>
        <div className="flex items-center overflow-hidden rounded-md border border-slate-200">
          <button type="button" onClick={()=>setSafeQty(qty-1)} className="px-1.5 py-1 text-slate-600 hover:bg-slate-100"><Minus size={11}/></button>
          <input type="number" min="1" max="99" value={qty} onChange={e=>setSafeQty(e.target.value)} className="w-8 border-x border-slate-200 py-0.5 text-center text-xs font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"/>
          <button type="button" onClick={()=>setSafeQty(qty+1)} className="px-1.5 py-1 text-slate-600 hover:bg-slate-100"><Plus size={11}/></button>
        </div>
      </div>

      <div className="mt-2 grid gap-1">
        {food.variants.map(v=>(
          <button key={v.name} type="button" onClick={()=>add(v)} className="flex items-center justify-between rounded-md border border-orange-200 px-2 py-1 text-[11px] font-semibold text-orange-700 hover:bg-orange-50">
            <span>{v.name}</span><span>{money(v.price)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}