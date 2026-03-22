'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { expenseApi, empApi } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import {
  Plus, X, Receipt, Download, Search, Filter,
  TrendingUp, AlertCircle, Check, Trash2
} from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const CATEGORIES = [
  { v:'ABN Parking',           c:'#F59E0B', e:'🅿️' },
  { v:'Advances',              c:'#10B981', e:'💵' },
  { v:'Air Tickets',           c:'#3B82F6', e:'✈️' },
  { v:'ENOC',                  c:'#EF4444', e:'⛽' },
  { v:'Health Insurance',      c:'#8B5CF6', e:'🏥' },
  { v:'Idfy',                  c:'#EC4899', e:'🔍' },
  { v:'Mobile Expenses',       c:'#06B6D4', e:'📱' },
  { v:'Office Expenses',       c:'#84CC16', e:'🏢' },
  { v:'RTA Top-up',            c:'#F97316', e:'🚌' },
  { v:'Vehicle Expenses',      c:'#6366F1', e:'🚗' },
  { v:'Vehicle Rent',          c:'#0EA5E9', e:'🔑' },
  { v:'Visa Expenses',         c:'#D97706', e:'📋' },
  { v:'Miscellaneous Expenses',c:'#94A3B8', e:'📦' },
]
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c=>[c.v, c]))

const MONTHS = Array.from({length:6},(_,i)=>{
  const d=new Date(); d.setMonth(d.getMonth()-i)
  return d.toISOString().slice(0,7)
})

function hdr() { return { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }
function fmt(n) { return Number(n||0).toLocaleString('en-AE',{minimumFractionDigits:0,maximumFractionDigits:0}) }

const GlassTip = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null
  return (
    <div style={{ background:'rgba(255,255,255,0.92)', backdropFilter:'blur(16px)', border:'1px solid rgba(255,255,255,0.8)', borderRadius:12, padding:'10px 14px', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', fontFamily:'Poppins,sans-serif', fontSize:12 }}>
      <div style={{ fontWeight:700, color:'#6B5D4A', marginBottom:5 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey||p.name} style={{ color:p.color||p.fill, fontWeight:600, display:'flex', gap:10, justifyContent:'space-between' }}>
          <span>{p.name}</span><strong>AED {fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

function AddExpenseModal({ employees, onSave, onClose }) {
  const [form, setForm] = useState({
    emp_id:'', category:CATEGORIES[0].v,
    amount:'', date:new Date().toISOString().slice(0,10),
    description:'', month:MONTHS[0]
  })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  const cat = CAT_MAP[form.category]

  async function handleSave() {
    if (!form.emp_id||!form.amount) return setErr('Employee and amount required')
    setSaving(true); setErr(null)
    try { await expenseApi.create(form); onSave() }
    catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:480, padding:0, overflow:'hidden' }}>
        <div style={{ padding:'22px 24px 16px', background:`linear-gradient(135deg,${cat.c}15,transparent)` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div>
              <h3 style={{ fontWeight:900, fontSize:17, color:'#1A1612' }}>Add Expense</h3>
              <p style={{ fontSize:12, color:'#A89880', marginTop:2 }}>Log a company expense</p>
            </div>
            <button onClick={onClose} style={{ width:30,height:30,borderRadius:9,background:'rgba(0,0,0,0.06)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><X size={14}/></button>
          </div>
          {/* Category pills */}
          <div style={{ display:'flex', gap:6, overflowX:'auto', scrollbarWidth:'none', paddingBottom:2 }}>
            {CATEGORIES.map(cat => (
              <button key={cat.v} onClick={()=>set('category',cat.v)} type="button"
                style={{ padding:'6px 12px', borderRadius:20, border:`2px solid ${form.category===cat.v?cat.c:'rgba(0,0,0,0.1)'}`, background:form.category===cat.v?`${cat.c}15`:'rgba(255,255,255,0.6)', color:form.category===cat.v?cat.c:'#A89880', fontWeight:form.category===cat.v?700:500, fontSize:11.5, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0, transition:'all 0.18s', fontFamily:'Poppins,sans-serif' }}>
                {cat.e} {cat.v}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding:'16px 24px 20px', display:'flex', flexDirection:'column', gap:13 }}>
          {err && <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:9, padding:'9px 12px', fontSize:12.5, color:'#C0392B', display:'flex', gap:7, alignItems:'center' }}><AlertCircle size={13}/>{err}</div>}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label className="input-label">Employee *</label>
              <select className="input" value={form.emp_id} onChange={e=>set('emp_id',e.target.value)}>
                <option value="">Select…</option>
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
              <input className="input" type="number" step="0.01" value={form.amount} onChange={e=>set('amount',e.target.value)} style={{ paddingLeft:48, fontSize:16, fontWeight:700 }}/>
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
              {saving?'Saving…':'Add Expense'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ExpensesPage() {
  const [expenses,  setExpenses]  = useState([])
  const [employees, setEmployees] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [search,    setSearch]    = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [month,     setMonth]     = useState(MONTHS[0])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [exp, emps] = await Promise.all([
        expenseApi.list({ month }),
        empApi.list()
      ])
      setExpenses(exp.expenses||[])
      setEmployees(emps.employees||[])
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [month])

  useEffect(() => { load() }, [load])
  useSocket({ 'expense:created': load, 'expense:updated': load })

  // Computed stats
  const total      = expenses.reduce((s,e)=>s+Number(e.amount||0), 0)
  const approved   = expenses.filter(e=>e.status==='approved').reduce((s,e)=>s+Number(e.amount||0), 0)
  const pending    = expenses.filter(e=>e.status==='pending').length

  // By category for pie chart
  const byCat = CATEGORIES.map(cat => ({
    name: cat.v,
    value: expenses.filter(e=>e.category===cat.v).reduce((s,e)=>s+Number(e.amount||0),0),
    color: cat.c,
    emoji: cat.e,
  })).filter(c=>c.value>0).sort((a,b)=>b.value-a.value)

  // By month for bar chart (last 6 months across all categories)
  const monthlyData = MONTHS.slice(0,6).reverse().map(m => {
    const row = { month: m.slice(5) }
    CATEGORIES.slice(0,5).forEach(cat => {
      row[cat.v] = expenses.filter(e=>e.category===cat.v&&e.month===m).reduce((s,e)=>s+Number(e.amount||0),0)
    })
    return row
  })

  const filtered = expenses.filter(e => {
    const matchSearch = !search || e.emp_name?.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase())
    const matchCat    = catFilter==='all' || e.category===catFilter
    return matchSearch && matchCat
  })

  async function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/expenses/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } })
      load()
    } catch(e) { alert(e.message) }
  }

  async function approveExpense(id) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/expenses/${id}`, { method:'PUT', headers:hdr(), body:JSON.stringify({ status:'approved' }) })
      load()
    } catch(e) { alert(e.message) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, animation:'slideUp 0.35s ease' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontWeight:900, fontSize:22, color:'#1A1612', letterSpacing:'-0.03em', margin:0 }}>Expenses</h1>
          <p style={{ fontSize:12, color:'#A89880', marginTop:4 }}>{expenses.length} records · AED {fmt(total)} this month</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <select value={month} onChange={e=>setMonth(e.target.value)}
            style={{ padding:'8px 14px', borderRadius:20, border:'1.5px solid rgba(255,255,255,0.6)', background:'rgba(255,255,255,0.6)', backdropFilter:'blur(12px)', fontSize:13, fontWeight:600, color:'#1A1612', cursor:'pointer', outline:'none', fontFamily:'Poppins,sans-serif' }}>
            {MONTHS.map(m=><option key={m}>{m}</option>)}
          </select>
          <button onClick={()=>setModal(true)} className="btn btn-primary" style={{ borderRadius:24 }}>
            <Plus size={15}/> Add Expense
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10 }}>
        {[
          { l:'Total',    v:`AED ${fmt(total)}`,    c:'#1A1612', bg:'rgba(255,255,255,0.6)',    bc:'rgba(255,255,255,0.7)' },
          { l:'Approved', v:`AED ${fmt(approved)}`, c:'#10B981', bg:'rgba(16,185,129,0.08)',    bc:'rgba(16,185,129,0.2)' },
          { l:'Pending',  v:pending,                c:'#F59E0B', bg:'rgba(245,158,11,0.08)',    bc:'rgba(245,158,11,0.2)' },
          { l:'Categories',v:byCat.length,          c:'#6366F1', bg:'rgba(99,102,241,0.08)',    bc:'rgba(99,102,241,0.2)' },
        ].map(s => (
          <div key={s.l} style={{ textAlign:'center', padding:'14px 10px', borderRadius:14, background:s.bg, border:`1px solid ${s.bc}`, backdropFilter:'blur(12px)' }}>
            <div style={{ fontWeight:900, fontSize:20, color:s.c, letterSpacing:'-0.02em' }}>{s.v}</div>
            <div style={{ fontSize:10.5, color:s.c, fontWeight:600, marginTop:3, opacity:0.85 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      {byCat.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }} className="two-col-glass">

          {/* Pie chart by category */}
          <div className="card" style={{ padding:'18px' }}>
            <div style={{ fontWeight:800, fontSize:14, color:'#1A1612', marginBottom:3 }}>By Category</div>
            <div style={{ fontSize:11.5, color:'#A89880', marginBottom:14 }}>Spending breakdown</div>
            <div style={{ display:'flex', gap:16, alignItems:'center' }}>
              <PieChart width={140} height={140}>
                <Pie data={byCat} cx={65} cy={65} innerRadius={38} outerRadius={62} paddingAngle={3} dataKey="value">
                  {byCat.map((c,i) => <Cell key={c.name} fill={c.color}/>)}
                </Pie>
                <Tooltip content={<GlassTip/>}/>
              </PieChart>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6, maxHeight:140, overflowY:'auto', scrollbarWidth:'none' }}>
                {byCat.slice(0,6).map(c => (
                  <div key={c.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5, minWidth:0 }}>
                      <div style={{ width:8, height:8, borderRadius:2, background:c.color, flexShrink:0 }}/>
                      <span style={{ fontSize:11, color:'#6B5D4A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:c.color, flexShrink:0 }}>AED {fmt(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top categories bar */}
          <div className="card" style={{ padding:'18px' }}>
            <div style={{ fontWeight:800, fontSize:14, color:'#1A1612', marginBottom:3 }}>Top Spending</div>
            <div style={{ fontSize:11.5, color:'#A89880', marginBottom:14 }}>Highest expense categories</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {byCat.slice(0,5).map((c,i) => {
                const pct = byCat[0].value > 0 ? Math.round((c.value/byCat[0].value)*100) : 0
                return (
                  <div key={c.name}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:11.5, color:'#6B5D4A', fontWeight:500 }}>{c.emoji} {c.name}</span>
                      <span style={{ fontSize:11.5, fontWeight:700, color:c.color }}>AED {fmt(c.value)}</span>
                    </div>
                    <div style={{ height:6, background:'rgba(0,0,0,0.06)', borderRadius:10, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:c.color, borderRadius:10, transition:'width 1s ease' }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filter + search */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ flex:'1 1 200px', position:'relative' }}>
          <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#C4B49A', pointerEvents:'none' }}/>
          <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search employee, description…" style={{ paddingLeft:34, borderRadius:20 }}/>
        </div>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
          style={{ padding:'9px 14px', borderRadius:20, border:'1.5px solid rgba(255,255,255,0.6)', background:'rgba(255,255,255,0.6)', backdropFilter:'blur(12px)', fontSize:12.5, fontWeight:600, color:'#1A1612', cursor:'pointer', outline:'none', fontFamily:'Poppins,sans-serif' }}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c=><option key={c.v} value={c.v}>{c.e} {c.v}</option>)}
        </select>
      </div>

      {/* Expense list */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[1,2,3].map(i=><div key={i} className="sk" style={{ height:80, borderRadius:14 }}/>)}
        </div>
      ) : filtered.length===0 ? (
        <div style={{ textAlign:'center', padding:'50px 20px', color:'#A89880' }}>
          <Receipt size={40} style={{ margin:'0 auto 12px', display:'block', opacity:0.2 }}/>
          <div style={{ fontWeight:600, color:'#6B5D4A' }}>No expenses found</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map((exp, i) => {
            const cat = CAT_MAP[exp.category] || { c:'#94A3B8', e:'📦' }
            const isPending = exp.status === 'pending'
            return (
              <div key={exp.id} style={{ background:'rgba(255,255,255,0.6)', backdropFilter:'blur(16px)', border:'1px solid rgba(255,255,255,0.7)', borderRadius:14, padding:'13px 16px', animation:`slideUp 0.3s ${i*0.03}s ease both`, boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:13, background:`${cat.c}15`, border:`1.5px solid ${cat.c}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                    {cat.e}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:13.5, color:'#1A1612' }}>{exp.emp_name||exp.emp_id}</div>
                        <div style={{ fontSize:11, color:cat.c, fontWeight:600, marginTop:1 }}>{cat.e} {exp.category}</div>
                        {exp.description && <div style={{ fontSize:11.5, color:'#6B5D4A', marginTop:2 }}>{exp.description}</div>}
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontWeight:900, fontSize:16, color:'#1A1612', letterSpacing:'-0.02em' }}>AED {fmt(exp.amount)}</div>
                        <span style={{ fontSize:10.5, fontWeight:700, color:isPending?'#F59E0B':'#10B981', background:isPending?'rgba(245,158,11,0.1)':'rgba(16,185,129,0.1)', borderRadius:20, padding:'2px 8px', display:'inline-block', marginTop:3 }}>
                          {isPending?'Pending':'Approved'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8, paddingTop:7, borderTop:'1px solid rgba(0,0,0,0.05)' }}>
                      <span style={{ fontSize:11, color:'#A89880' }}>{exp.date?.slice(0,10)} · {exp.month}</span>
                      <div style={{ display:'flex', gap:6 }}>
                        {isPending && (
                          <button onClick={()=>approveExpense(exp.id)} style={{ padding:'4px 10px', borderRadius:7, background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.3)', color:'#10B981', fontWeight:700, fontSize:11, cursor:'pointer', fontFamily:'Poppins,sans-serif', display:'flex', alignItems:'center', gap:3 }}>
                            <Check size={11}/> Approve
                          </button>
                        )}
                        <button onClick={()=>deleteExpense(exp.id)} style={{ padding:'4px 8px', borderRadius:7, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#EF4444', cursor:'pointer', fontFamily:'Poppins,sans-serif', display:'flex', alignItems:'center' }}>
                          <Trash2 size={11}/>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && <AddExpenseModal employees={employees} onClose={()=>setModal(false)} onSave={()=>{setModal(false);load()}}/>}
    </div>
  )
}