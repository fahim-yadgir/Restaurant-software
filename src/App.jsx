import {useEffect,useState} from 'react'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import BillingPage from './pages/BillingPage'
import MenuPage from './pages/MenuPage'
import ExpensesPage from './pages/ExpensesPage'
import StaffPage from './pages/StaffPage'
import ReportsPage from './pages/ReportsPage'
import DaybookPage from './pages/DaybookPage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'
import SubscriptionPage from './pages/SubscriptionPage'
import {initialFoods,initialExpenses,initialStaff} from './data/demo'

function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
export default function App(){
 const [role,setRole]=useState(()=>localStorage.getItem('rd_role')||'')
 const [page,setPage]=useState('dashboard')
 const [foods,setFoods]=useState(()=>read('rd_foods',initialFoods))
 const [expenses,setExpenses]=useState(()=>read('rd_expenses',initialExpenses))
 const [staff,setStaff]=useState(()=>read('rd_staff',initialStaff))
 const [bills,setBills]=useState(()=>read('rd_bills',[]))
 const [expired,setExpired]=useState(()=>localStorage.getItem('rd_expired')==='true')
 useEffect(()=>localStorage.setItem('rd_foods',JSON.stringify(foods)),[foods])
 useEffect(()=>localStorage.setItem('rd_expenses',JSON.stringify(expenses)),[expenses])
 useEffect(()=>localStorage.setItem('rd_staff',JSON.stringify(staff)),[staff])
 useEffect(()=>localStorage.setItem('rd_bills',JSON.stringify(bills)),[bills])
 const login=r=>{setRole(r);localStorage.setItem('rd_role',r);setPage(r==='admin'?'admin':'dashboard')}
 const logout=()=>{setRole('');localStorage.removeItem('rd_role')}
 if(!role)return <LoginPage onLogin={login}/>
 if(role==='owner'&&expired)return <SubscriptionPage onRenew={()=>{setExpired(false);localStorage.setItem('rd_expired','false')}}/>
 let content
 if(role==='admin') content=<AdminPage/>
 else switch(page){
  case 'billing':content=<BillingPage foods={foods} onSaveBill={b=>setBills([b,...bills])}/>;break
  case 'menu':content=<MenuPage foods={foods} setFoods={setFoods}/>;break
  case 'expenses':content=<ExpensesPage expenses={expenses} setExpenses={setExpenses}/>;break
  case 'staff':content=<StaffPage staff={staff} setStaff={setStaff}/>;break
  case 'reports':content=<ReportsPage bills={bills} expenses={expenses}/>;break
  case 'daybook':content=<DaybookPage bills={bills} expenses={expenses}/>;break
  case 'settings':content=<SettingsPage/>;break
  default:content=<DashboardPage bills={bills} expenses={expenses}/>
 }
 return <AppLayout page={role==='admin'?'admin':page} setPage={setPage} role={role} onLogout={logout}>{content}</AppLayout>
}
