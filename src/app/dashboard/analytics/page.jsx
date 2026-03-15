'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { analyticsApi } from '@/lib/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { TrendingUp, Users, Package, DollarSign, Plus, X, ChevronRight, Clock, ShieldCheck, Wallet, AlertTriangle, CheckCircle, Calendar } from 'lucide-react'

const GOLD = '#B8860B'
const API  = process.env.NEXT_PUBLIC_API_URL
const STATION_COLORS = { DDB7:'#B8860B', DDB6:'#1D6FA4', DSH6:'#2E7D52', DXD3:'#7C3AED' }

function hdr() { return { Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }

const Tip = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null
  return (
    <div style={{ background:'#fff', border:'1px solid #EAE6DE', borderRadius:10, padding:'10px 14px', boxShadow:'0 4px 16px rgba(0,0,0,0.1)' }}>
      <div style={{ fontSize:11, color:'#A89880', marginBottom:6, fontWeight:600 }}>{label}</div>
      {payload.map(p=><div key={p.dataKey} style={{ fontSize:12, color:p.color, marginBottom:2, fontWeight:500 }}>{p.name}: <strong>{Number(p.value||0).toLocaleString()}</strong></div>)}
    </div>
  )
}

// ── Swipeable KPI card row ────────────────────────────────────
function KpiSlider({ kpis, loading }) {
  const ref = useRef(null)
  const [idx, setIdx] = useState(0)

  function onScroll() {
    if (!ref.current) return
    const el = ref.current
    const w  = el.firstChild?.offsetWidth || 160
    setIdx(Math.round(el.scrollLeft / (w + 12)))
  }
  function goTo(i) {
    if (!ref.current) return
    const w = ref.current.firstChild?.offsetWidth || 160
    ref.current.scrollTo({ left: i * (w + 12), behavior:'smooth' })
  }

  return (
    <div>
      <div ref={ref} onScroll={onScroll}
        style={{ display:'flex', gap:12, overflowX:'auto', scrollSnapType:'x mandatory', WebkitOverflowScrolling:'touch', scrollbarWidth:'none', paddingRight:20 }}>
        <style>{`div::-webkit-scrollbar{display:none}`}</style>
        {kpis.map((card, i) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="stat-card"
              style={{ minWidth:'calc(50% - 6px)', maxWidth:'calc(50% - 6px)', scrollSnapAlign:'start', flexShrink:0, animationDelay:`${i*0.08}s`, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', right:-12, bottom:-12, width:80, height:80, borderRadius:'50%', background:`${card.color}10` }}/>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div style={{ width:40, height:40, borderRadius:11, background:`${card.color}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={18} color={card.color}/>
                </div>
                {card.live && (
                  <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#2E7D52', background:'#ECFDF5', padding:'2px 7px', borderRadius:6, border:'1px solid #A7F3D0' }}>
                    <span className="dot-live"/> LIVE
                  </div>
                )}
              </div>
              <div style={{ fontWeight:800, fontSize:26, color:'#1A1612', marginBottom:3, letterSpacing:'-0.04em', lineHeight:1.1 }}>
                {loading ? <div className="skeleton" style={{ width:60, height:26, borderRadius:6 }}/> : card.value}
              </div>
              <div style={{ fontSize:12, color:'#6B5D4A', fontWeight:600, marginTop:6 }}>{card.label}</div>
              <div style={{ fontSize:10.5, color:'#A89880', marginTop:2 }}>{card.sub}</div>
            </div>
          )
        })}
      </div>
      <div style={{ display:'flex', gap:5, justifyContent:'center', marginTop:10, alignItems:'center' }}>
        {kpis.map((_,i) => (
          <button key={i} onClick={()=>goTo(i)} style={{ width:i===idx?20:6, height:6, borderRadius:3, background:i===idx?GOLD:'#EAE6DE', border:'none', cursor:'pointer', padding:0, transition:'width 0.3s ease, background 0.3s ease' }}/>
        ))}
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:3, marginTop:5 }}>
        <span style={{ fontSize:10, color:'#C4B49A' }}>Swipe to see more</span>
        <ChevronRight size={10} color="#C4B49A"/>
      </div>
    </div>
  )
}

// ── Delivery modal ────────────────────────────────────────────
function DeliveryModal({ onSave, onClose }) {
  const [form, setForm] = useState({ date:new Date().toISOString().slice(0,10), total:'', attempted:'', successful:'', returned:'', notes:'' })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  async function handleSave() {
    if (!form.total) return alert('Total required')
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/deliveries`, { method:'POST', headers:{ 'Content-Type':'application/json', ...hdr() }, body: JSON.stringify({ ...form, total:parseInt(form.total), attempted:parseInt(form.attempted)||0, successful:parseInt(form.successful)||0, returned:parseInt(form.returned)||0 }) })
      if (!res.ok) throw new Error((await res.json()).error)
      onSave()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:420 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ fontWeight:700, fontSize:16, color:'#1A1612' }}>Log Daily Deliveries</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17}/></button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div><label className="input-label">Date</label><input className="input" type="date" value={form.date} onChange={e=>set('date',e.target.value)}/></div>
          <div><label className="input-label">Total Deliveries *</label><input className="input" type="number" value={form.total} onChange={e=>set('total',e.target.value)} placeholder="e.g. 120"/></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div><label className="input-label">Attempted</label><input className="input" type="number" value={form.attempted} onChange={e=>set('attempted',e.target.value)}/></div>
            <div><label className="input-label">Successful</label><input className="input" type="number" value={form.successful} onChange={e=>set('successful',e.target.value)}/></div>
          </div>
          <div><label className="input-label">Notes</label><input className="input" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Any issues?"/></div>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:18 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Submit'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Role dashboards ───────────────────────────────────────────
function AdminManagerDashboard({ summary, chart, loading, setModal, userRole }) {
  const kpis = [
    { icon:Users,      label:'Active DAs',         value:summary?String(summary.employees?.active||0):'—',                                             sub:'employees',    color:'#B8860B', live:true },
    { icon:Package,    label:"Today's Deliveries",  value:summary?String(summary.today_deliveries||0):'—',                                              sub:'all stations', color:'#1D6FA4', live:true },
    { icon:TrendingUp, label:'Present Today',        value:summary?String(summary.attendance?.present||0):'—',                                           sub:'checked in',   color:'#2E7D52', live:true },
    { icon:DollarSign, label:'Pending Fines',        value:summary?`AED ${Number(summary.compliance?.pending_amount||0).toLocaleString()}`:'—',           sub:'unresolved',   color:'#C0392B', live:false },
  ]
  const chartData = chart.length > 0 ? chart : [{ month:'No data', DDB7:0, DDB6:0, DSH6:0, DXD3:0 }]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      {(userRole==='poc'||userRole==='admin'||userRole==='manager') && (
        <div style={{ display:'flex', justifyContent:'flex-end' }}>
          <button className="btn btn-primary" onClick={()=>setModal(true)}><Plus size={14}/> Log Deliveries</button>
        </div>
      )}
      <div className="show-mobile-only"><KpiSlider kpis={kpis} loading={loading}/></div>
      <div className="hide-on-mobile" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {kpis.map((card,i)=>{ const Icon=card.icon; return (
          <div key={card.label} className="stat-card" style={{ animationDelay:`${i*0.08}s`, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', right:-10, bottom:-10, width:70, height:70, borderRadius:'50%', background:`${card.color}08` }}/>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div style={{ width:42, height:42, borderRadius:12, background:`${card.color}15`, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon size={19} color={card.color}/></div>
              {card.live && <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#2E7D52', background:'#ECFDF5', padding:'2px 7px', borderRadius:6, border:'1px solid #A7F3D0' }}><span className="dot-live"/> LIVE</div>}
            </div>
            <div style={{ fontWeight:800, fontSize:26, color:'#1A1612', marginBottom:4, letterSpacing:'-0.04em' }}>{loading?<div className="skeleton" style={{ width:60, height:28, borderRadius:6 }}/>:card.value}</div>
            <div style={{ fontSize:12, color:'#6B5D4A', fontWeight:600 }}>{card.label}</div>
            <div style={{ fontSize:10.5, color:'#A89880', marginTop:2 }}>{card.sub}</div>
          </div>
        )})}
      </div>

      {/* Chart */}
      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:'#1A1612' }}>Monthly Deliveries by Station</div>
            <div style={{ fontSize:12, color:'#A89880', marginTop:2 }}>Last 6 months</div>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {Object.entries(STATION_COLORS).map(([s,c])=>(
              <span key={s} style={{ fontSize:11, fontWeight:600, color:c, background:`${c}12`, border:`1px solid ${c}25`, borderRadius:6, padding:'2px 8px' }}>{s}</span>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barSize={10}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6"/>
            <XAxis dataKey="month" stroke="#C4B49A" fontSize={10}/>
            <YAxis stroke="#C4B49A" fontSize={10}/>
            <Tooltip content={<Tip/>}/>
            {Object.entries(STATION_COLORS).map(([s,c])=>(
              <Bar key={s} dataKey={s} name={s} stackId="a" fill={c} radius={s==='DXD3'?[4,4,0,0]:[0,0,0,0]}/>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }} className="two-col">
        <div className="card">
          <div style={{ fontWeight:700, fontSize:14, color:'#1A1612', marginBottom:12 }}>Today's Attendance</div>
          {[
            { l:'Present', v:summary?.attendance?.present||0, c:'#2E7D52', bg:'#ECFDF5', bc:'#A7F3D0' },
            { l:'Absent',  v:summary?.attendance?.absent||0,  c:'#C0392B', bg:'#FEF2F2', bc:'#FCA5A5' },
            { l:'Pending Leaves', v:summary?.pending_leaves||0, c:'#B45309', bg:'#FFFBEB', bc:'#FCD34D' },
          ].map(s=>(
            <div key={s.l} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:s.bg, borderRadius:10, border:`1px solid ${s.bc}`, marginBottom:8 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:s.c, flexShrink:0 }}/>
              <span style={{ flex:1, fontSize:13, color:'#1A1612', fontWeight:500 }}>{s.l}</span>
              <span style={{ fontWeight:800, fontSize:20, color:s.c }}>{s.v}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{ fontWeight:700, fontSize:14, color:'#1A1612', marginBottom:12 }}>Payroll This Month</div>
          {[
            { l:'Base Salaries', v:`AED ${Number(summary?.payroll?.base_total||0).toLocaleString()}`,  c:'#1A1612' },
            { l:'+ Bonuses',     v:`AED ${Number(summary?.payroll?.bonus_total||0).toLocaleString()}`, c:'#2E7D52' },
            { l:'- Deductions',  v:`AED ${Number(summary?.payroll?.ded_total||0).toLocaleString()}`,   c:'#C0392B' },
          ].map(s=>(
            <div key={s.l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 12px', background:'#FAFAF8', borderRadius:10, border:'1px solid #EAE6DE', marginBottom:8 }}>
              <span style={{ fontSize:12.5, color:'#6B5D4A', fontWeight:500 }}>{s.l}</span>
              <span style={{ fontWeight:700, fontSize:13, color:s.c }}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FinanceDashboard({ summary, loading }) {
  const kpis = [
    { icon:Wallet,     label:'Base Payroll',   value:summary?`AED ${Number(summary.payroll?.base_total||0).toLocaleString()}`:'—',  sub:'this month',   color:'#B8860B' },
    { icon:TrendingUp, label:'Total Bonuses',   value:summary?`AED ${Number(summary.payroll?.bonus_total||0).toLocaleString()}`:'—', sub:'additions',    color:'#2E7D52' },
    { icon:AlertTriangle,label:'Deductions',   value:summary?`AED ${Number(summary.payroll?.ded_total||0).toLocaleString()}`:'—',   sub:'total deducted',color:'#C0392B' },
    { icon:DollarSign, label:'Pending Fines',   value:summary?`AED ${Number(summary.compliance?.pending_amount||0).toLocaleString()}`:'—', sub:'unresolved', color:'#B45309' },
  ]
  const netPay = (Number(summary?.payroll?.base_total||0) + Number(summary?.payroll?.bonus_total||0) - Number(summary?.payroll?.ded_total||0))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div className="show-mobile-only"><KpiSlider kpis={kpis} loading={loading}/></div>
      <div className="hide-on-mobile" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {kpis.map((card,i)=>{ const Icon=card.icon; return (
          <div key={card.label} className="stat-card" style={{ animationDelay:`${i*0.08}s`, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', right:-10, bottom:-10, width:70, height:70, borderRadius:'50%', background:`${card.color}08` }}/>
            <div style={{ width:42, height:42, borderRadius:12, background:`${card.color}15`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}><Icon size={19} color={card.color}/></div>
            <div style={{ fontWeight:800, fontSize:22, color:'#1A1612', marginBottom:4, letterSpacing:'-0.03em' }}>{loading?<div className="skeleton" style={{ width:80, height:26, borderRadius:6 }}/>:card.value}</div>
            <div style={{ fontSize:12, color:'#6B5D4A', fontWeight:600 }}>{card.label}</div>
            <div style={{ fontSize:10.5, color:'#A89880', marginTop:2 }}>{card.sub}</div>
          </div>
        )})}
      </div>

      {/* Net pay summary */}
      <div style={{ background:'linear-gradient(135deg,#1A1612,#2C2318)', borderRadius:16, padding:'24px 20px', color:'white', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-20, top:-20, width:120, height:120, borderRadius:'50%', background:'rgba(184,134,11,0.15)' }}/>
        <div style={{ position:'absolute', right:40, bottom:-30, width:80, height:80, borderRadius:'50%', background:'rgba(184,134,11,0.08)' }}/>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Total Net Payroll This Month</div>
        <div style={{ fontWeight:900, fontSize:36, letterSpacing:'-0.04em', color:'#D4A017', marginBottom:4 }}>
          AED {loading?'—':netPay.toLocaleString()}
        </div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>Base + Bonuses − Deductions</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }} className="two-col">
        <div className="card">
          <div style={{ fontWeight:700, fontSize:14, color:'#1A1612', marginBottom:12 }}>Quick Links</div>
          {[
            { l:'View Payroll', href:'/dashboard/finance/payroll', c:'#B8860B' },
            { l:'View Expenses', href:'/dashboard/finance/expenses', c:'#1D6FA4' },
            { l:'Compliance Fines', href:'/dashboard/hr/compliance', c:'#C0392B' },
          ].map(l=>(
            <a key={l.l} href={l.href} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:'#FAFAF8', borderRadius:10, border:'1px solid #EAE6DE', marginBottom:8, color:l.c, fontWeight:600, fontSize:13, textDecoration:'none' }}>
              {l.l} <ChevronRight size={14}/>
            </a>
          ))}
        </div>
        <div className="card">
          <div style={{ fontWeight:700, fontSize:14, color:'#1A1612', marginBottom:12 }}>Payroll Breakdown</div>
          {[
            { l:'Base', v:Number(summary?.payroll?.base_total||0), c:'#B8860B' },
            { l:'Bonus', v:Number(summary?.payroll?.bonus_total||0), c:'#2E7D52' },
            { l:'Deductions', v:Number(summary?.payroll?.ded_total||0), c:'#C0392B' },
          ].map(s=>{
            const total = Number(summary?.payroll?.base_total||0)+Number(summary?.payroll?.bonus_total||0)
            const pct   = total > 0 ? Math.round(s.v/total*100) : 0
            return (
              <div key={s.l} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, color:'#6B5D4A', fontWeight:500 }}>{s.l}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:s.c }}>AED {s.v.toLocaleString()}</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width:`${pct}%`, background:s.c }}/></div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function HRDashboard({ summary, loading }) {
  const kpis = [
    { icon:Users,    label:'Total Employees', value:summary?String(summary.employees?.c||0):'—',        sub:'all staff',    color:'#B8860B' },
    { icon:CheckCircle, label:'Active',        value:summary?String(summary.employees?.active||0):'—',  sub:'working',      color:'#2E7D52' },
    { icon:Clock,    label:'Present Today',    value:summary?String(summary.attendance?.present||0):'—', sub:'checked in',  color:'#1D6FA4' },
    { icon:Calendar, label:'Pending Leaves',   value:summary?String(summary.pending_leaves||0):'—',     sub:'need approval',color:'#B45309' },
  ]
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div className="show-mobile-only"><KpiSlider kpis={kpis} loading={loading}/></div>
      <div className="hide-on-mobile" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {kpis.map((card,i)=>{ const Icon=card.icon; return (
          <div key={card.label} className="stat-card" style={{ animationDelay:`${i*0.08}s`, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', right:-10, bottom:-10, width:70, height:70, borderRadius:'50%', background:`${card.color}08` }}/>
            <div style={{ width:42, height:42, borderRadius:12, background:`${card.color}15`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}><Icon size={19} color={card.color}/></div>
            <div style={{ fontWeight:800, fontSize:26, color:'#1A1612', marginBottom:4 }}>{loading?<div className="skeleton" style={{ width:50, height:26, borderRadius:6 }}/>:card.value}</div>
            <div style={{ fontSize:12, color:'#6B5D4A', fontWeight:600 }}>{card.label}</div>
            <div style={{ fontSize:10.5, color:'#A89880', marginTop:2 }}>{card.sub}</div>
          </div>
        )})}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }} className="two-col">
        <div className="card">
          <div style={{ fontWeight:700, fontSize:14, color:'#1A1612', marginBottom:12 }}>Attendance Today</div>
          {[
            { l:'✅ Present', v:summary?.attendance?.present||0, c:'#2E7D52', bg:'#ECFDF5' },
            { l:'❌ Absent',  v:summary?.attendance?.absent||0,  c:'#C0392B', bg:'#FEF2F2' },
            { l:'🏖 On Leave', v:summary?.pending_leaves||0,    c:'#B45309', bg:'#FFFBEB' },
          ].map(s=>(
            <div key={s.l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 12px', background:s.bg, borderRadius:10, marginBottom:8 }}>
              <span style={{ fontSize:13, color:'#1A1612', fontWeight:500 }}>{s.l}</span>
              <span style={{ fontWeight:800, fontSize:20, color:s.c }}>{s.v}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{ fontWeight:700, fontSize:14, color:'#1A1612', marginBottom:12 }}>Quick Links</div>
          {[
            { l:'Manage Employees', href:'/dashboard/hr/employees', icon:Users },
            { l:'Log Attendance',   href:'/dashboard/hr/attendance', icon:Clock },
            { l:'Leave Requests',   href:'/dashboard/hr/leaves',     icon:Calendar },
            { l:'Compliance',       href:'/dashboard/hr/compliance', icon:ShieldCheck },
          ].map(l=>{
            const Icon = l.icon
            return (
              <a key={l.l} href={l.href} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', background:'#FAFAF8', borderRadius:10, border:'1px solid #EAE6DE', marginBottom:8, color:'#1A1612', fontWeight:600, fontSize:13, textDecoration:'none' }}>
                <Icon size={14} color="#B8860B"/> {l.l}
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function POCDashboard({ summary, loading }) {
  const kpis = [
    { icon:Package,    label:"Today's Deliveries", value:summary?String(summary.today_deliveries||0):'—', sub:'my station',  color:'#B8860B', live:true },
    { icon:Users,      label:'Present Today',       value:summary?String(summary.attendance?.present||0):'—', sub:'DAs in',   color:'#2E7D52', live:true },
    { icon:Clock,      label:'Absent',              value:summary?String(summary.attendance?.absent||0):'—',  sub:'not in',   color:'#C0392B', live:true },
    { icon:Calendar,   label:'Pending Leaves',      value:summary?String(summary.pending_leaves||0):'—',      sub:'to review',color:'#B45309', live:false },
  ]
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div className="show-mobile-only"><KpiSlider kpis={kpis} loading={loading}/></div>
      <div className="hide-on-mobile" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {kpis.map((card,i)=>{ const Icon=card.icon; return (
          <div key={card.label} className="stat-card" style={{ animationDelay:`${i*0.08}s`, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', right:-10, bottom:-10, width:70, height:70, borderRadius:'50%', background:`${card.color}08` }}/>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div style={{ width:42, height:42, borderRadius:12, background:`${card.color}15`, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon size={19} color={card.color}/></div>
              {card.live && <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#2E7D52', background:'#ECFDF5', padding:'2px 7px', borderRadius:6, border:'1px solid #A7F3D0' }}><span className="dot-live"/> LIVE</div>}
            </div>
            <div style={{ fontWeight:800, fontSize:26, color:'#1A1612', marginBottom:4 }}>{loading?<div className="skeleton" style={{ width:50, height:26, borderRadius:6 }}/>:card.value}</div>
            <div style={{ fontSize:12, color:'#6B5D4A', fontWeight:600 }}>{card.label}</div>
            <div style={{ fontSize:10.5, color:'#A89880', marginTop:2 }}>{card.sub}</div>
          </div>
        )})}
      </div>
      <div className="card">
        <div style={{ fontWeight:700, fontSize:14, color:'#1A1612', marginBottom:12 }}>Quick Actions</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { l:'📋 Log Attendance', href:'/dashboard/poc', c:'#B8860B', bg:'#FDF6E3' },
            { l:'📦 Log Deliveries', href:'/dashboard/poc', c:'#1D6FA4', bg:'#EFF6FF' },
            { l:'🚗 Manage Fleet',   href:'/dashboard/poc', c:'#2E7D52', bg:'#ECFDF5' },
            { l:'📢 Announcements',  href:'/dashboard/poc', c:'#7C3AED', bg:'#F5F3FF' },
          ].map(l=>(
            <a key={l.l} href={l.href} style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'14px 10px', background:l.bg, borderRadius:12, color:l.c, fontWeight:600, fontSize:13, textDecoration:'none', textAlign:'center' }}>
              {l.l}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [summary,  setSummary]  = useState(null)
  const [chart,    setChart]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [userRole, setUserRole] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const user = JSON.parse(localStorage.getItem('gcd_user')||'{}')
      setUserRole(user.role)
      const [sum, ch] = await Promise.all([
        analyticsApi.summary(),
        fetch(`${API}/api/analytics/deliveries-chart?months=6`, { headers:hdr() }).then(r=>r.json()).catch(()=>({ chart:[] }))
      ])
      setSummary(sum)
      setChart(ch.chart || [])
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const roleMap = {
    admin:   <AdminManagerDashboard summary={summary} chart={chart} loading={loading} setModal={setModal} userRole={userRole}/>,
    manager: <AdminManagerDashboard summary={summary} chart={chart} loading={loading} setModal={setModal} userRole={userRole}/>,
    finance: <FinanceDashboard      summary={summary} loading={loading}/>,
    hr:      <HRDashboard           summary={summary} loading={loading}/>,
    poc:     <POCDashboard          summary={summary} loading={loading}/>,
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      {roleMap[userRole] || <AdminManagerDashboard summary={summary} chart={chart} loading={loading} setModal={setModal} userRole={userRole}/>}
      {modal && <DeliveryModal onClose={()=>setModal(false)} onSave={()=>{setModal(false);load()}}/>}
    </div>
  )
}
