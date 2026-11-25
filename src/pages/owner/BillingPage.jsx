import {useState} from 'react'
import {Search} from 'lucide-react'
import FoodCard from '@/components/billing/FoodCard'
import BillingCart from '@/components/billing/BillingCart'
import InvoiceModal from '@/components/billing/InvoiceModal'
import {getCategories} from '@/lib/menuOptions'
import {localDate} from '@/lib/pigmy'

export default function BillingPage({foods,onSaveBill,restaurantName,accounts=[],profile={},phone=''}) {
  const [query,setQuery]=useState('')
  const [cart,setCart]=useState([])
  const [orderType,setOrderType]=useState('Dine-In')
  const [payment,setPayment]=useState('UPI')
  const [discount,setDiscount]=useState('0')
  const [invoice,setInvoice]=useState(null)
  const [cat,setCat]=useState('All')
  const [accountId,setAccountId]=useState('')   // bank / pigmy account that receives UPI / card money

  // categories that have at least one active dish (includes custom categories)
  const usedCategories=getCategories(foods).filter(c=>foods.some(f=>f.active&&f.category===c))
  const activeCat=usedCategories.includes(cat)?cat:'All'
  const filtered=foods.filter(f=>f.active&&(activeCat==='All'||f.category===activeCat)&&f.name.toLowerCase().includes(query.toLowerCase()))

  // qty = quantity chosen on the food card
  const add=(food,v,qty=1)=>setCart(old=>{
    const i=old.findIndex(x=>x.id===food.id&&x.variant===v.name)
    return i<0
      ? [...old,{id:food.id,name:food.name,variant:v.name,price:v.price,qty,gst:food.gst}]
      : old.map((x,n)=>n===i?{...x,qty:x.qty+qty}:x)
  })

  const generate=()=>{
    const subtotal=cart.reduce((s,x)=>s+x.price*x.qty,0)
    const disc=Math.min(subtotal,Math.max(0,Number(discount)||0))
    const taxable=Math.max(0,subtotal-disc)
    const tax=cart.reduce((s,x)=>s+x.price*x.qty*(x.gst||0)/100,0)*(taxable/(subtotal||1))
    const linked=(payment==='UPI'||payment==='Card')&&accounts.some(a=>a.id===accountId)?accountId:''
    const bill={id:`INV-${Date.now().toString().slice(-6)}`,items:cart,subtotal,discount:disc,tax,total:Math.round(taxable+tax),payment,orderType,date:localDate(),time:new Date().toTimeString().slice(0,5),...(linked?{accountId:linked}:{})}
    onSaveBill(bill)
    setInvoice(bill)
    setCart([])
    setDiscount('0')
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[1.6fr_1fr]">
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-extrabold">Create customer bill</h2>
            <p className="mt-1 text-xs text-slate-500">Select quantity, then tap a portion size to add it to the bill.</p>
          </div>
          <select value={orderType} onChange={e=>setOrderType(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
            <option>Dine-In</option><option>Takeaway</option><option>Delivery</option>
          </select>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-3 text-slate-400" size={17}/>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search food items..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-orange-400"/>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {['All',...usedCategories].map(c=>(
            <button key={c} type="button" onClick={()=>setCat(c)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${activeCat===c?'border-orange-400 bg-orange-50 text-orange-700':'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{c}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {filtered.map(f=><FoodCard key={f.id} food={f} onAdd={add}/>)}
        </div>
      </div>

      <div className="xl:sticky xl:top-24">
        <BillingCart
          items={cart}
          setItems={setCart}
          payment={payment}
          setPayment={setPayment}
          discount={discount}
          setDiscount={setDiscount}
          onGenerate={generate}
          accounts={accounts}
          accountId={accountId}
          setAccountId={setAccountId}
        />
      </div>

      <InvoiceModal restaurant={{name:restaurantName,address:profile?.address,gstin:profile?.gstin,phone}} bill={invoice} onClose={()=>setInvoice(null)}/>
    </div>
  )
}