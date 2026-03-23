'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { expenseApi, empApi } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import {
  Plus, X, Receipt, Search, AlertCircle, Check, Trash2,
  Pencil, ChevronDown, TrendingUp, Users, ArrowUpDown
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

const API = process.env.NEXT_PUBLIC_API_URL

const CATEGORIES = [
  { v:'Parking',            c:'#F59E0B', e:'🅿️' },
  { v:'Advances',               c:'#10B981', e:'💵' },
  { v:'Air Tickets',            c:'#3B82F6', e:'✈️' },
  { v:'ENOC',                   c:'#EF4444', e:'⛽' },
  { v:'Health Insurance',       c:'#8B5CF6', e:'🏥' },
  { v:'Idfy',                   c:'#EC4899', e:'🔍' },
  { v:'Mobile Expenses',        c:'#06B6D4', e:'📱' },
  { v:'Office Expenses',        c:'#84CC16', e:'🏢' },
  { v:'Petty Cash',             c:'#F97316', e:'💰' },
  { v:'RTA Top-up',             c:'#0EA5E9', e:'🚌' },
  { v:'Vehicle Expenses',       c:'#6366F1', e:'🚗' },
  { v:'Vehicle Rent',           c:'#7C3AED', e:'🔑' },
  { v:'Visa Expenses',          c:'#D97706', e:'📋' },
  { v:'Miscellaneous Expenses', c:'#94A3B8', e:'📦' },
]
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.v, c]))
const MONTHS  = Array.from({length:6}, (_,i) => {
  const d = new Date(); d.setMonth(d.getMonth()-i); return d.toISOString().slice(0,7)
})

function hdr(json=true) {
  const h = { Authorization:`Bearer ${localStorage.getItem('gcd_token')}` }
  if (json) h['Content-Type'] = 'application/json'
  return h
}
function fmt(n) { return Number(n||0).toLocaleString('en-AE',{minimumFractionDigits:0,maximumFractionDigits:0}) }
function getUserRole() {
  try { const t=localStorage.getItem('gcd_token'); return t?JSON.parse(atob(t.split('.')[1])).role:null } catch(e){return null}
}

const GlassTip = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null
  return (
    <div style={{ background:'rgba(255,255,255,0.95)', backdropFilter:'blur(16px)', border:'1px solid rgba(255,255,255,0.8)', borderRadius:10, padding:'8px 12px', boxShadow:'0 4px 16px rgba(0,0,0,0.1)', fontFamily:'Poppins,sans-serif', fontSize:11.5 }}>
      <div style={{ fontWeight:700, color:'#6B5D4A', marginBottom:4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color:p.color||p.fill, fontWeight:600, display:'flex', gap:8, justifyContent:'space-between' }}>
          <span>{p.name}</span><strong>AED {fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

/* ── Add / Edit Modal ── */
function ExpenseModal({ expense, employees, onSave, onClose }) {
  const isEdit = !!expense
  const [form, setForm] = useState({
    emp_id:      expense?.emp_id      || '',
    category:    expense?.category    || CATEGORIES[0].v,
    amount:      expense?.amount      || '',
    date:        expense?.date?.slice(0,10) || new Date().toISOString().slice(0,10),
    description: expense?.description || '',
    month:       expense?.month       || MONTHS[0],
  })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)
  const set  = (k,v) => setForm(p=>({...p,[k]:v}))
  const cat  = CAT_MAP[form.category] || CATEGORIES[0]

  async function handleSave() {
    if (!form.emp_id||!form.amount) return setErr('Employee and amount required')
    setSaving(true); setErr(null)
    try {
      if (isEdit) {
        await fetch(`${API}/api/expenses/${expense.id}`, { method:'PUT', headers:hdr(), body:JSON.stringify(form) })
      } else {
        await expenseApi.create(form)
      }
      onSave()
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:480, padding:0, overflow:'hidden' }}>
        {/* Header with category gradient */}
        <div style={{ padding:'20px 22px 14px', background:`linear-gradient(135deg,${cat.c}18,transparent)`, borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div>
              <h3 style={{ fontWeight:900, fontSize:17, color:'#1A1612', margin:0 }}>{isEdit?'Edit Expense':'Add Expense'}</h3>
              <p style={{ fontSize:12, color:'#A89880', marginTop:3 }}>{isEdit?'Update this expense record':'Log a company expense'}</p>
            </div>
            <button onClick={onClose} style={{ width:30,height:30,borderRadius:9,background:'rgba(0,0,0,0.06)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><X size={14}/></button>
          </div>
          {/* Scrollable category pills */}
          <div style={{ overflowX:'auto', paddingBottom:4, marginBottom:-4 }}>
            <div style={{ display:'flex', gap:7, width:'max-content' }}>
              {CATEGORIES.map(c => (
                <button key={c.v} onClick={()=>set('category',c.v)} type="button"
                  style={{ padding:'6px 12px', borderRadius:20, border:`2px solid ${form.category===c.v?c.c:'rgba(0,0,0,0.1)'}`, background:form.category===c.v?`${c.c}15`:'rgba(255,255,255,0.7)', color:form.category===c.v?c.c:'#8B7355', fontWeight:form.category===c.v?700:500, fontSize:11.5, cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.15s', fontFamily:'Poppins,sans-serif' }}>
                  {c.e} {c.v}
                </button>
              ))}
            </div>
          </div>
          {/* Scroll hint */}
          <div style={{ fontSize:10, color:'rgba(0,0,0,0.3)', marginTop:6, textAlign:'center' }}>← scroll to see all categories →</div>
        </div>

        <div style={{ padding:'16px 22px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          {err && <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:9, padding:'9px 12px', fontSize:12.5, color:'#C0392B', display:'flex', gap:7, alignItems:'center' }}><AlertCircle size={13}/>{err}</div>}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label className="input-label">Employee *</label>
              <select className="input" value={form.emp_id} onChange={e=>set('emp_id',e.target.value)}>
                <option value="">Select employee…</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Month</label>
              <select className="input" value={form.month} onChange={e=>set('month',e.target.value)}>
                {MONTHS.map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="input-label">Amount (AED) *</label>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'#A89880', fontWeight:600 }}>AED</span>
              <input className="input" type="number" step="0.01" value={form.amount} onChange={e=>set('amount',e.target.value)} style={{ paddingLeft:50, fontSize:16, fontWeight:700 }}/>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label className="input-label">Date</label>
              <input className="input" type="date" value={form.date} onChange={e=>set('date',e.target.value)}/>
            </div>
            <div>
              <label className="input-label">Description</label>
              <input className="input" value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Brief note…"/>
            </div>
          </div>

          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex:2, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'11px', borderRadius:10, background:`linear-gradient(135deg,${cat.c},${cat.c}cc)`, color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', opacity:saving?0.7:1 }}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function ExpensesPage() {
  const [expenses,   setExpenses]   = useState([])
  const [employees,  setEmployees]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(null) // null | 'add' | {expense}
  const [search,     setSearch]     = useState('')
  const [catFilter,  setCatFilter]  = useState('all')
  const [empFilter,  setEmpFilter]  = useState('all')
  const [sortBy,     setSortBy]     = useState('date') // date | amount | emp | cat
  const [month,      setMonth]      = useState(MONTHS[0])
  const [userRole,   setUserRole]   = useState(null)

  useEffect(() => { setUserRole(getUserRole()) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [exp, emps] = await Promise.all([
        expenseApi.list({ month }),
        empApi.list(),
      ])
      setExpenses(exp.expenses||[])
      setEmployees(emps.employees||[])
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [month])

  useEffect(() => { load() }, [load])
  useSocket({ 'expense:created':load, 'expense:updated':load })

  async function approve(id) {
    await fetch(`${API}/api/expenses/${id}`, { method:'PUT', headers:hdr(), body:JSON.stringify({ status:'approved' }) })
    load()
  }
  async function reject(id) {
    if (!confirm('Reject this expense?')) return
    await fetch(`${API}/api/expenses/${id}`, { method:'PUT', headers:hdr(), body:JSON.stringify({ status:'rejected' }) })
    load()
  }
  async function del(id) {
    if (!confirm('Delete this expense?')) return
    await fetch(`${API}/api/expenses/${id}`, { method:'DELETE', headers:hdr() })
    load()
  }

  /* ── Computed ── */
  const total    = expenses.reduce((s,e)=>s+Number(e.amount||0), 0)
  const approved = expenses.filter(e=>e.status==='approved').reduce((s,e)=>s+Number(e.amount||0), 0)
  const pending  = expenses.filter(e=>e.status==='pending').length

  /* By category */
  const byCat = CATEGORIES.map(cat => ({
    name:cat.v, short:cat.e+' '+cat.v.split(' ')[0], value:expenses.filter(e=>e.category===cat.v).reduce((s,e)=>s+Number(e.amount||0),0), color:cat.c,
  })).filter(c=>c.value>0).sort((a,b)=>b.value-a.value)

  /* By employee */
  const byEmp = employees.map(emp => ({
    name:emp.name, id:emp.id,
    value: expenses.filter(e=>e.emp_id===emp.id).reduce((s,e)=>s+Number(e.amount||0),0),
    count: expenses.filter(e=>e.emp_id===emp.id).length,
  })).filter(e=>e.value>0).sort((a,b)=>b.value-a.value)

  /* Filter + sort */
  let filtered = expenses.filter(e => {
    const matchSearch = !search || (e.emp_name||e.emp_id)?.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase())
    const matchCat    = catFilter==='all' || e.category===catFilter
    const matchEmp    = empFilter==='all' || e.emp_id===empFilter
    return matchSearch && matchCat && matchEmp
  })
  filtered = [...filtered].sort((a,b) => {
    if (sortBy==='amount') return Number(b.amount)-Number(a.amount)
    if (sortBy==='emp')    return (a.emp_name||a.emp_id).localeCompare(b.emp_name||b.emp_id)
    if (sortBy==='cat')    return a.category.localeCompare(b.category)
    return new Date(b.date||b.created_at) - new Date(a.date||a.created_at)
  })

  const canApprove  = ['admin','manager'].includes(userRole)
  const canEdit     = ['accountant','admin','manager'].includes(userRole)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18, animation:'slideUp 0.35s ease' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontWeight:900, fontSize:22, color:'#1A1612', letterSpacing:'-0.03em', margin:0 }}>Expenses</h1>
          <p style={{ fontSize:12, color:'#A89880', marginTop:4 }}>{expenses.length} records · AED {fmt(total)} this month</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <select value={month} onChange={e=>setMonth(e.target.value)}
            style={{ padding:'8px 14px', borderRadius:20, border:'1.5px solid rgba(255,255,255,0.7)', background:'rgba(255,255,255,0.65)', backdropFilter:'blur(12px)', fontSize:13, fontWeight:600, color:'#1A1612', cursor:'pointer', outline:'none', fontFamily:'Poppins,sans-serif' }}>
            {MONTHS.map(m=><option key={m}>{m}</option>)}
          </select>
          {canEdit && (
            <button onClick={()=>setModal('add')} className="btn btn-primary" style={{ borderRadius:24 }}>
              <Plus size={15}/> Add Expense
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10 }}>
        {[
          { l:'Total',     v:`AED ${fmt(total)}`,    c:'#1A1612', bg:'rgba(255,255,255,0.65)' },
          { l:'Approved',  v:`AED ${fmt(approved)}`, c:'#10B981', bg:'rgba(16,185,129,0.1)' },
          { l:'Pending',   v:pending,                c:'#F59E0B', bg:'rgba(245,158,11,0.1)' },
          { l:'Employees', v:byEmp.length,           c:'#6366F1', bg:'rgba(99,102,241,0.1)' },
        ].map(s => (
          <div key={s.l} style={{ textAlign:'center', padding:'14px 10px', borderRadius:14, background:s.bg, border:'1px solid rgba(255,255,255,0.65)', backdropFilter:'blur(12px)' }}>
            <div style={{ fontWeight:900, fontSize:20, color:s.c, letterSpacing:'-0.02em' }}>{s.v}</div>
            <div style={{ fontSize:10.5, color:s.c, fontWeight:600, marginTop:3, opacity:0.8 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {(byCat.length>0 || byEmp.length>0) && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }} className="three-col-glass">

          {/* Pie by category */}
          {byCat.length>0 && (
            <div className="card" style={{ padding:'16px' }}>
              <div style={{ fontWeight:800, fontSize:13, color:'#1A1612', marginBottom:2 }}>By Category</div>
              <div style={{ fontSize:11, color:'#A89880', marginBottom:12 }}>Spending breakdown</div>
              <div style={{ display:'flex', justifyContent:'center' }}>
                <PieChart width={140} height={130}>
                  <Pie data={byCat} cx={65} cy={60} innerRadius={35} outerRadius={58} paddingAngle={3} dataKey="value">
                    {byCat.map((c,i)=><Cell key={c.name} fill={c.color}/>)}
                  </Pie>
                  <Tooltip content={<GlassTip/>}/>
                </PieChart>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:8 }}>
                {byCat.slice(0,4).map(c=>(
                  <div key={c.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <div style={{ width:7,height:7,borderRadius:2,background:c.color,flexShrink:0 }}/>
                      <span style={{ fontSize:10.5,color:'#6B5D4A',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:90 }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize:10.5,fontWeight:700,color:c.color }}>AED {fmt(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top categories bar */}
          {byCat.length>0 && (
            <div className="card" style={{ padding:'16px' }}>
              <div style={{ fontWeight:800, fontSize:13, color:'#1A1612', marginBottom:2 }}>Top Categories</div>
              <div style={{ fontSize:11, color:'#A89880', marginBottom:12 }}>Highest spending</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {byCat.slice(0,5).map(c=>{
                  const pct = byCat[0]?.value>0?Math.round(c.value/byCat[0].value*100):0
                  return (
                    <div key={c.name}>
                      <div style={{ display:'flex',justifyContent:'space-between',marginBottom:3 }}>
                        <span style={{ fontSize:11,color:'#6B5D4A',fontWeight:500 }}>{c.short}</span>
                        <span style={{ fontSize:11,fontWeight:700,color:c.color }}>AED {fmt(c.value)}</span>
                      </div>
                      <div style={{ height:5,background:'rgba(0,0,0,0.06)',borderRadius:10,overflow:'hidden' }}>
                        <div style={{ height:'100%',width:`${pct}%`,background:c.color,borderRadius:10,transition:'width 1s ease' }}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Top employees */}
          {byEmp.length>0 && (
            <div className="card" style={{ padding:'16px' }}>
              <div style={{ fontWeight:800, fontSize:13, color:'#1A1612', marginBottom:2, display:'flex', alignItems:'center', gap:6 }}>
                <Users size={14} color="#B8860B"/> Employee Expenses
              </div>
              <div style={{ fontSize:11, color:'#A89880', marginBottom:12 }}>Who spends most</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {byEmp.slice(0,5).map((e,i)=>{
                  const pct = byEmp[0]?.value>0?Math.round(e.value/byEmp[0].value*100):0
                  const colors=['#F59E0B','#6366F1','#10B981','#EF4444','#06B6D4']
                  const c = colors[i]||'#94A3B8'
                  return (
                    <div key={e.id}>
                      <div style={{ display:'flex',justifyContent:'space-between',marginBottom:3 }}>
                        <span style={{ fontSize:11,color:'#6B5D4A',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:100 }}>{e.name}</span>
                        <span style={{ fontSize:11,fontWeight:700,color:c }}>AED {fmt(e.value)}</span>
                      </div>
                      <div style={{ height:5,background:'rgba(0,0,0,0.06)',borderRadius:10,overflow:'hidden' }}>
                        <div style={{ height:'100%',width:`${pct}%`,background:c,borderRadius:10,transition:'width 1s ease' }}/>
                      </div>
                      <div style={{ fontSize:9.5,color:'#A89880',marginTop:1 }}>{e.count} records</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters + Sort */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        {/* Search */}
        <div style={{ flex:'1 1 180px', position:'relative', minWidth:160 }}>
          <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#C4B49A', pointerEvents:'none' }}/>
          <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, description…" style={{ paddingLeft:34, borderRadius:20 }}/>
        </div>
        {/* Employee filter */}
        <select value={empFilter} onChange={e=>setEmpFilter(e.target.value)}
          style={{ padding:'9px 12px', borderRadius:20, border:'1.5px solid rgba(255,255,255,0.7)', background:'rgba(255,255,255,0.65)', backdropFilter:'blur(12px)', fontSize:12, fontWeight:600, color:'#1A1612', cursor:'pointer', outline:'none', fontFamily:'Poppins,sans-serif' }}>
          <option value="all">All Employees</option>
          {byEmp.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        {/* Category filter */}
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
          style={{ padding:'9px 12px', borderRadius:20, border:'1.5px solid rgba(255,255,255,0.7)', background:'rgba(255,255,255,0.65)', backdropFilter:'blur(12px)', fontSize:12, fontWeight:600, color:'#1A1612', cursor:'pointer', outline:'none', fontFamily:'Poppins,sans-serif' }}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c=><option key={c.v} value={c.v}>{c.e} {c.v}</option>)}
        </select>
        {/* Sort */}
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
          style={{ padding:'9px 12px', borderRadius:20, border:'1.5px solid rgba(255,255,255,0.7)', background:'rgba(255,255,255,0.65)', backdropFilter:'blur(12px)', fontSize:12, fontWeight:600, color:'#1A1612', cursor:'pointer', outline:'none', fontFamily:'Poppins,sans-serif' }}>
          <option value="date">Sort: Date</option>
          <option value="amount">Sort: Amount</option>
          <option value="emp">Sort: Employee</option>
          <option value="cat">Sort: Category</option>
        </select>
      </div>

      {/* Expense list */}
      {loading ? (
        Array(3).fill(0).map((_,i)=><div key={i} className="sk" style={{ height:90,borderRadius:14 }}/>)
      ) : filtered.length===0 ? (
        <div style={{ textAlign:'center', padding:'50px 20px', color:'#A89880' }}>
          <Receipt size={40} style={{ margin:'0 auto 12px',display:'block',opacity:0.2 }}/>
          <div style={{ fontWeight:600, color:'#6B5D4A' }}>No expenses found</div>
        </div>
      ) : filtered.map((exp,i) => {
        const cat = CAT_MAP[exp.category]||{ c:'#94A3B8', e:'📦' }
        const isPending  = exp.status === 'pending'
        const isRejected = exp.status === 'rejected'
        const statusC    = isPending?'#F59E0B':isRejected?'#EF4444':'#10B981'
        const statusBg   = isPending?'rgba(245,158,11,0.1)':isRejected?'rgba(239,68,68,0.1)':'rgba(16,185,129,0.1)'

        return (
          <div key={exp.id} style={{ background:'rgba(255,255,255,0.62)', backdropFilter:'blur(16px)', border:'1px solid rgba(255,255,255,0.72)', borderRadius:14, overflow:'hidden', animation:`slideUp 0.3s ${i*0.03}s ease both`, boxShadow:'0 2px 12px rgba(0,0,0,0.05)', transition:'box-shadow 0.2s' }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow='0 6px 24px rgba(0,0,0,0.09)'}
            onMouseLeave={e=>e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.05)'}>
            {/* Category top bar */}
            <div style={{ height:3, background:`linear-gradient(90deg,${cat.c},${cat.c}66)` }}/>
            <div style={{ padding:'13px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:46, height:46, borderRadius:13, background:`${cat.c}12`, border:`1.5px solid ${cat.c}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                  {cat.e}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                    <div style={{ minWidth:0 }}>
                      {/* Show employee NAME, not ID */}
                      <div style={{ fontWeight:700, fontSize:14, color:'#1A1612' }}>{exp.emp_name || employees.find(e=>e.id===exp.emp_id)?.name || exp.emp_id}</div>
                      <div style={{ fontSize:11, color:cat.c, fontWeight:600, marginTop:1 }}>{cat.e} {exp.category}</div>
                      {exp.description && <div style={{ fontSize:11.5, color:'#6B5D4A', marginTop:2 }}>{exp.description}</div>}
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontWeight:900, fontSize:18, color:'#1A1612', letterSpacing:'-0.03em' }}>AED {fmt(exp.amount)}</div>
                      <span style={{ fontSize:10.5, fontWeight:700, color:statusC, background:statusBg, borderRadius:20, padding:'2px 8px', display:'inline-block', marginTop:3 }}>
                        {isPending?'Pending':isRejected?'Rejected':'Approved'}
                      </span>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10, paddingTop:8, borderTop:'1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize:11, color:'#A89880' }}>
                      {exp.date?.slice(0,10)} · {exp.month}
                      {exp.emp_id && <span style={{ marginLeft:6, fontFamily:'monospace', fontSize:10 }}>{exp.emp_id}</span>}
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      {/* Edit — accountant/admin/manager */}
                      {canEdit && (
                        <button onClick={()=>setModal(exp)}
                          style={{ padding:'4px 10px', borderRadius:7, background:'rgba(255,255,255,0.7)', border:'1px solid rgba(0,0,0,0.1)', color:'#6B5D4A', fontWeight:600, fontSize:11, cursor:'pointer', fontFamily:'Poppins,sans-serif', display:'flex', alignItems:'center', gap:3 }}>
                          <Pencil size={10}/> Edit
                        </button>
                      )}
                      {/* Approve/Reject — admin/manager only */}
                      {canApprove && isPending && (<>
                        <button onClick={()=>approve(exp.id)}
                          style={{ padding:'4px 10px', borderRadius:7, background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.3)', color:'#059669', fontWeight:700, fontSize:11, cursor:'pointer', fontFamily:'Poppins,sans-serif', display:'flex', alignItems:'center', gap:3 }}>
                          <Check size={10}/> Approve
                        </button>
                        <button onClick={()=>reject(exp.id)}
                          style={{ padding:'4px 10px', borderRadius:7, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#EF4444', fontWeight:700, fontSize:11, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
                          ✕
                        </button>
                      </>)}
                      {/* Delete */}
                      {(canApprove||canEdit) && (
                        <button onClick={()=>del(exp.id)}
                          style={{ padding:'4px 8px', borderRadius:7, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.15)', color:'#EF4444', cursor:'pointer', fontFamily:'Poppins,sans-serif', display:'flex', alignItems:'center' }}>
                          <Trash2 size={11}/>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Add/Edit modal */}
      {(modal==='add'||typeof modal==='object'&&modal?.id) && (
        <ExpenseModal
          expense={typeof modal==='object'?modal:null}
          employees={employees}
          onClose={()=>setModal(null)}
          onSave={()=>{ setModal(null); load() }}
        />
      )}
    </div>
  )
}