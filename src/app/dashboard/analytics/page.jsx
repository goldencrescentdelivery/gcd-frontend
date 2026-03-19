'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { analyticsApi } from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts'
import {
  TrendingUp, Users, Package, DollarSign, Plus, X, Clock,
  ShieldCheck, Wallet, AlertTriangle, CheckCircle, Calendar,
  ChevronRight, ArrowUp, ArrowDown, Activity, Truck, FileText, UserMinus, Smartphone
} from 'lucide-react'

const API  = process.env.NEXT_PUBLIC_API_URL
const GOLD = '#B8860B'
const STATION_COLORS = { DDB1:'#B8860B', DXE6:'#1D6FA4', DDB1:'#2E7D52', DXE6:'#7C3AED' }
const CHART_COLORS   = ['#B8860B','#1D6FA4','#2E7D52','#7C3AED','#C0392B','#B45309']

function hdr() { return { Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }

// ── Custom tooltip ────────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#fff', border:'1px solid #EAE6DE', borderRadius:10, padding:'10px 14px', boxShadow:'0 4px 20px rgba(0,0,0,0.1)', fontFamily:'Poppins,sans-serif' }}>
      <div style={{ fontSize:11, color:'#A89880', marginBottom:6, fontWeight:600 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ fontSize:12, color:p.color, fontWeight:600, marginBottom:2 }}>
          {p.name}: <strong>{Number(p.value||0).toLocaleString()}</strong>
        </div>
      ))}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────
function KPICard({ icon:Icon, label, value, color, trend, loading, delay=0 }) {
  return (
    <div className="stat-card" style={{ animationDelay:`${delay}s`, position:'relative', overflow:'hidden', minWidth:0 }}>
      <div style={{ position:'absolute', right:-12, bottom:-12, width:70, height:70, borderRadius:'50%', background:`${color}08` }}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div style={{ width:38, height:38, borderRadius:11, background:`${color}12`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon size={18} color={color}/>
        </div>
        {trend != null && (
          <div style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, fontWeight:700, color: trend >= 0 ? '#2E7D52' : '#C0392B' }}>
            {trend >= 0 ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      {loading ? (
        <div className="skeleton" style={{ width:60, height:22, borderRadius:6, marginBottom:5 }}/>
      ) : (
        <div style={{ fontWeight:800, fontSize:16, color:'#1A1612', letterSpacing:'-0.02em', lineHeight:1, marginBottom:5, wordBreak:'break-word' }}>{value}</div>
      )}
      <div style={{ fontSize:11, fontWeight:700, color:'#6B5D4A', lineHeight:1.3 }}>{label}</div>
    </div>
  )
}

// ── Swipeable KPI Slider for mobile ──────────────────────────
function KPISlider({ kpis, loading }) {
  const ref = React.useRef(null)
  const [idx, setIdx] = React.useState(0)
  function onScroll() {
    if (!ref.current) return
    const w = ref.current.firstChild?.offsetWidth || 150
    setIdx(Math.round(ref.current.scrollLeft / (w + 10)))
  }
  function goTo(i) {
    if (!ref.current) return
    const w = ref.current.firstChild?.offsetWidth || 150
    ref.current.scrollTo({ left: i * (w + 10), behavior:'smooth' })
  }
  return (
    <div>
      <div ref={ref} onScroll={onScroll}
        style={{ display:'flex', gap:10, overflowX:'auto', scrollSnapType:'x mandatory', WebkitOverflowScrolling:'touch', scrollbarWidth:'none', paddingBottom:4 }}>
        <style>{`.kpi-slider::-webkit-scrollbar{display:none}`}</style>
        {kpis.map((k, i) => {
          const Icon = k.icon
          return (
            <div key={k.label} style={{ minWidth:'calc(50% - 5px)', maxWidth:'calc(50% - 5px)', scrollSnapAlign:'start', flexShrink:0 }}>
              <KPICard {...k} loading={loading} delay={i*0.06}/>
            </div>
          )
        })}
      </div>
      {/* Dots */}
      <div style={{ display:'flex', justifyContent:'center', gap:5, marginTop:8 }}>
        {kpis.map((_,i) => (
          <button key={i} onClick={()=>goTo(i)} style={{ width:i===idx?18:6, height:6, borderRadius:3, background:i===idx?'#B8860B':'#EAE6DE', border:'none', cursor:'pointer', padding:0, transition:'width 0.3s, background 0.3s' }}/>
        ))}
      </div>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────
function SHead({ title, sub }) {
  return (
    <div style={{ marginBottom:16 }}>
      <h2 style={{ fontWeight:800, fontSize:16, color:'#1A1612', letterSpacing:'-0.02em' }}>{title}</h2>
      {sub && <p style={{ fontSize:12, color:'#A89880', marginTop:3 }}>{sub}</p>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MANAGER DASHBOARD
// ══════════════════════════════════════════════════════════════
function HorizScroller({ children, gap=10 }) {
  const ref = React.useRef(null)
  const [idx, setIdx] = React.useState(0)
  const [total, setTotal] = React.useState(0)

  React.useEffect(() => {
    if (ref.current) setTotal(ref.current.children.length)
  }, [children])

  function onScroll() {
    if (!ref.current) return
    const w = ref.current.firstChild?.offsetWidth || 150
    setIdx(Math.round(ref.current.scrollLeft / (w + gap)))
  }
  function goTo(i) {
    if (!ref.current) return
    const w = ref.current.firstChild?.offsetWidth || 150
    ref.current.scrollTo({ left: i * (w + gap), behavior:'smooth' })
  }
  return (
    <div>
      <div ref={ref} onScroll={onScroll}
        style={{ display:'flex', gap, overflowX:'auto', scrollSnapType:'x mandatory', WebkitOverflowScrolling:'touch', scrollbarWidth:'none', paddingBottom:2 }}>
        <style>{`div::-webkit-scrollbar{display:none!important}`}</style>
        {React.Children.map(children, child =>
          React.cloneElement(child, { style:{ ...child.props.style, scrollSnapAlign:'start', flexShrink:0 } })
        )}
      </div>
      {total > 1 && (
        <div style={{ display:'flex', justifyContent:'center', gap:5, marginTop:8 }}>
          {Array.from({length:total}).map((_,i) => (
            <button key={i} onClick={()=>goTo(i)} style={{ width:i===idx?18:6, height:6, borderRadius:3, background:i===idx?'#B8860B':'#EAE6DE', border:'none', cursor:'pointer', padding:0, transition:'width 0.3s' }}/>
          ))}
        </div>
      )}
    </div>
  )
}

function ManagerDashboard({ summary, chart, loading, leaves, onApproveLeave, simStats, simByStation }) {
  const kpis = [
    { icon:Users,        label:'Active DAs',          value: summary ? String(summary.employees?.active||0) : '—', color:'#B8860B' },
    { icon:Package,      label:'Today\'s Deliveries',  value: summary ? String(summary.today_deliveries||0) : '—', color:'#1D6FA4' },
    { icon:Activity,     label:'Present Today',         value: summary ? String(summary.attendance?.present||0) : '—', color:'#2E7D52' },
    { icon:Wallet,       label:'Net Payroll',           value: summary ? `AED ${Number(summary.payroll?.base_total||0).toLocaleString()}` : '—', color:'#7C3AED' },
    { icon:AlertTriangle,label:'Compliance Alerts',    value: summary ? String(summary.compliance?.expired||0) : '—', color:'#C0392B' },
    { icon:Calendar,     label:'Pending Leaves',        value: summary ? String(summary.pending_leaves||0) : '—', color:'#B45309' },
  ]

  const deliveryData = chart.length > 0 ? chart : [{ month:'No data', DDB1:0, DXE6:0 }]
  const stationData  = Object.entries({ DDB1:'#B8860B', DXE6:'#1D6FA4' }).map(([s,c]) => ({
    name:s, value:deliveryData.reduce((a,m)=>a+(m[s]||0),0), color:c
  })).filter(s => s.value > 0)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

      {/* Welcome banner */}
      <div style={{ background:'linear-gradient(135deg,#1A1612 0%,#2C1F0A 60%,#1A1612 100%)', borderRadius:18, padding:'18px 16px', color:'white', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-20, top:-20, width:160, height:160, borderRadius:'50%', background:'rgba(184,134,11,0.1)' }}/>
        <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:5 }}>Manager Overview</div>
        <div style={{ fontWeight:800, fontSize:16, letterSpacing:'-0.02em', marginBottom:3 }}>Golden Crescent Dashboard</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:12 }}>Real-time operational intelligence</div>
        <div style={{ display:'flex', gap:8, overflowX:'auto', scrollbarWidth:'none' }}>
          {[
            { l:'Total Staff', v:summary?.employees?.c||0 },
            { l:'Stations',    v:4 },
            { l:'This Month',  v:new Date().toLocaleString('en-AE',{month:'short'}) },
          ].map(s => (
            <div key={s.l} style={{ background:'rgba(255,255,255,0.1)', borderRadius:10, padding:'8px 12px', backdropFilter:'blur(10px)', flexShrink:0 }}>
              <div style={{ fontWeight:800, fontSize:14, color:'#D4A017' }}>{s.v}</div>
              <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.45)', marginTop:1 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Slider — always slider on all screen sizes */}
      <div>
        <SHead title="Key Metrics" sub="Live operational data"/>
        <HorizScroller gap={10}>
          {kpis.map((k,i) => (
            <div key={k.label} style={{ minWidth:'calc(50% - 5px)' }}>
              <KPICard {...k} loading={loading} delay={i*0.06}/>
            </div>
          ))}
        </HorizScroller>
      </div>

      {/* Delivery chart — full width on mobile */}
      <div className="card">
        <SHead title="Monthly Deliveries" sub="Last 6 months by station"/>
        <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
          {Object.entries({ DDB1:'#B8860B', DXE6:'#1D6FA4' }).map(([s,c])=>(
            <span key={s} style={{ fontSize:11, fontWeight:700, color:c, background:`${c}12`, border:`1px solid ${c}25`, borderRadius:6, padding:'2px 9px' }}>{s}</span>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={deliveryData} barSize={10}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6"/>
            <XAxis dataKey="month" stroke="#C4B49A" fontSize={10}/>
            <YAxis stroke="#C4B49A" fontSize={10}/>
            <Tooltip content={<ChartTip/>}/>
            <Bar dataKey="DDB1" name="DDB1" fill="#B8860B" radius={[4,4,0,0]}/>
            <Bar dataKey="DXE6" name="DXE6" fill="#1D6FA4" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Attendance + Payroll — slider on mobile */}
      <div className="mobile-only-block">
        <HorizScroller gap={12}>
          <div style={{ minWidth:'calc(100% - 0px)' }} className="card">
            <SHead title="Attendance Today"/>
            {[
              { l:'Present', v:summary?.attendance?.present||0, c:'#2E7D52', bg:'#ECFDF5', icon:CheckCircle },
              { l:'Absent',  v:summary?.attendance?.absent||0,  c:'#C0392B', bg:'#FEF2F2', icon:UserMinus },
              { l:'On Leave',v:summary?.pending_leaves||0,      c:'#B45309', bg:'#FFFBEB', icon:Calendar },
            ].map(s=>{ const Icon=s.icon; return (
              <div key={s.l} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:s.bg, borderRadius:11, marginBottom:8 }}>
                <div style={{ width:32, height:32, borderRadius:9, background:`${s.c}20`, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon size={15} color={s.c}/></div>
                <span style={{ flex:1, fontSize:13, color:'#1A1612', fontWeight:500 }}>{s.l}</span>
                <span style={{ fontWeight:900, fontSize:22, color:s.c }}>{s.v}</span>
              </div>
            )})}
          </div>
          <div style={{ minWidth:'calc(100% - 0px)' }} className="card">
            <SHead title="Payroll This Month"/>
            {[
              { l:'Base Salaries', v:Number(summary?.payroll?.base_total||0),  c:'#1A1612' },
              { l:'Bonuses',       v:Number(summary?.payroll?.bonus_total||0), c:'#2E7D52' },
              { l:'Deductions',    v:Number(summary?.payroll?.ded_total||0),   c:'#C0392B' },
            ].map(s => {
              const total = Number(summary?.payroll?.base_total||0)+Number(summary?.payroll?.bonus_total||0)
              const pct   = total>0 ? Math.min(100,Math.round(s.v/total*100)) : 0
              return (
                <div key={s.l} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:12, color:'#6B5D4A', fontWeight:500 }}>{s.l}</span>
                    <span style={{ fontSize:12, fontWeight:800, color:s.c }}>AED {s.v.toLocaleString()}</span>
                  </div>
                  <div style={{ height:6, background:'#F0EDE6', borderRadius:10, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:s.c, borderRadius:10, transition:'width 1s ease' }}/>
                  </div>
                </div>
              )
            })}
            <div style={{ borderTop:'1px solid #F5F4F1', paddingTop:12, display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:13, fontWeight:700, color:'#1A1612' }}>Net Total</span>
              <span style={{ fontWeight:900, fontSize:16, color:'#B8860B' }}>
                AED {(Number(summary?.payroll?.base_total||0)+Number(summary?.payroll?.bonus_total||0)-Number(summary?.payroll?.ded_total||0)).toLocaleString()}
              </span>
            </div>
          </div>
        </HorizScroller>
      </div>

      {/* Attendance + Payroll — side by side on desktop */}
      <div className="desktop-only-block" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div className="card">
          <SHead title="Today's Attendance" sub="All stations"/>
          {[
            { l:'Present', v:summary?.attendance?.present||0, c:'#2E7D52', bg:'#ECFDF5', icon:CheckCircle },
            { l:'Absent',  v:summary?.attendance?.absent||0,  c:'#C0392B', bg:'#FEF2F2', icon:UserMinus },
            { l:'On Leave',v:summary?.pending_leaves||0,      c:'#B45309', bg:'#FFFBEB', icon:Calendar },
          ].map(s=>{ const Icon=s.icon; return (
            <div key={s.l} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:s.bg, borderRadius:11, marginBottom:8 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:`${s.c}20`, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon size={15} color={s.c}/></div>
              <span style={{ flex:1, fontSize:13, color:'#1A1612', fontWeight:500 }}>{s.l}</span>
              <span style={{ fontWeight:900, fontSize:22, color:s.c }}>{s.v}</span>
            </div>
          )})}
        </div>
        <div className="card">
          <SHead title="Payroll This Month" sub="Breakdown"/>
          {[
            { l:'Base Salaries', v:Number(summary?.payroll?.base_total||0),  c:'#1A1612' },
            { l:'Bonuses Added', v:Number(summary?.payroll?.bonus_total||0), c:'#2E7D52' },
            { l:'Deductions',    v:Number(summary?.payroll?.ded_total||0),   c:'#C0392B' },
          ].map(s => {
            const total = Number(summary?.payroll?.base_total||0)+Number(summary?.payroll?.bonus_total||0)
            const pct   = total>0 ? Math.min(100,Math.round(s.v/total*100)) : 0
            return (
              <div key={s.l} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:12, color:'#6B5D4A', fontWeight:500 }}>{s.l}</span>
                  <span style={{ fontSize:12, fontWeight:800, color:s.c }}>AED {s.v.toLocaleString()}</span>
                </div>
                <div style={{ height:6, background:'#F0EDE6', borderRadius:10, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:s.c, borderRadius:10, transition:'width 1s ease' }}/>
                </div>
              </div>
            )
          })}
          <div style={{ borderTop:'1px solid #F5F4F1', paddingTop:12, marginTop:4, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'#1A1612' }}>Net Total</span>
            <span style={{ fontWeight:900, fontSize:18, color:'#B8860B', letterSpacing:'-0.03em' }}>
              AED {(Number(summary?.payroll?.base_total||0)+Number(summary?.payroll?.bonus_total||0)-Number(summary?.payroll?.ded_total||0)).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Pending approvals */}
      {leaves?.length > 0 && (
        <div className="card">
          <SHead title="Pending Your Approval" sub="HR approved — needs final sign-off"/>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {leaves.slice(0,5).map(l => (
              <div key={l.id} style={{ background:'#FAFAF8', borderRadius:12, border:'1px solid #EAE6DE', overflow:'hidden' }}>
                <div style={{ padding:'12px 14px' }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#1A1612' }}>{l.name}</div>
                  <div style={{ fontSize:11, color:'#A89880', marginTop:2 }}>{l.type} · {l.from_date} → {l.to_date} · {l.days} days</div>
                </div>
                <div style={{ display:'flex', gap:8, padding:'8px 12px', background:'#F5F4F1', borderTop:'1px solid #EAE6DE' }}>
                  <button onClick={() => onApproveLeave(l.id,'approved')} style={{ flex:1, padding:'8px', borderRadius:20, background:'linear-gradient(135deg,#2E7D52,#22C55E)', border:'none', color:'white', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>Approve</button>
                  <button onClick={() => onApproveLeave(l.id,'rejected')} style={{ flex:1, padding:'8px', borderRadius:20, background:'#FEF2F2', border:'1px solid #FCA5A5', color:'#C0392B', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions — horizontal scroll */}
      <div className="card">
        <SHead title="Quick Actions"/>
        <div style={{ display:'flex', gap:10, overflowX:'auto', scrollbarWidth:'none', paddingBottom:4 }}>
          {[
            { l:'Employees',  href:'/dashboard/hr/employees',     icon:Users,       c:'#B8860B' },
            { l:'Payroll',    href:'/dashboard/finance/payroll',   icon:Wallet,      c:'#1D6FA4' },
            { l:'Leaves',     href:'/dashboard/hr/leaves',         icon:Calendar,    c:'#2E7D52' },
            { l:'Attendance', href:'/dashboard/hr/attendance',     icon:Clock,       c:'#7C3AED' },
            { l:'Compliance', href:'/dashboard/hr/compliance',     icon:ShieldCheck, c:'#C0392B' },
            { l:'POC Station',href:'/dashboard/poc',               icon:Truck,       c:'#B45309' },
          ].map(item => {
            const Icon = item.icon
            return (
              <a key={item.l} href={item.href}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:7, padding:'14px 12px', borderRadius:13, background:`${item.c}08`, border:`1px solid ${item.c}20`, textDecoration:'none', flexShrink:0, minWidth:80, transition:'all 0.2s' }}>
                <div style={{ width:38, height:38, borderRadius:11, background:`${item.c}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={17} color={item.c}/>
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:item.c, textAlign:'center', lineHeight:1.3 }}>{item.l}</span>
              </a>
            )
          })}
        </div>
      </div>

      {/* SIM Cards */}
      {simStats && (
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <SHead title="SIM Card Inventory" sub="Fleet communication"/>
            <a href="/dashboard/poc" style={{ fontSize:12, fontWeight:600, color:'#B8860B', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
              Manage <ChevronRight size={13}/>
            </a>
          </div>
          <HorizScroller gap={8}>
            {[
              { l:'Total',       v:simStats.total||0,     c:'#1A1612', bg:'#FAFAF8', bc:'#EAE6DE' },
              { l:'Assigned',    v:simStats.assigned||0,  c:'#B8860B', bg:'#FDF6E3', bc:'#F0D78C' },
              { l:'Available',   v:simStats.available||0, c:'#2E7D52', bg:'#ECFDF5', bc:'#A7F3D0' },
              { l:'Inactive',    v:simStats.inactive||0,  c:'#A89880', bg:'#F5F4F1', bc:'#EAE6DE' },
              { l:'AED/month',   v:Number(simStats.monthly_cost||0).toLocaleString(), c:'#7C3AED', bg:'#F5F3FF', bc:'#DDD6FE' },
            ].map(s => (
              <div key={s.l} style={{ minWidth:80, textAlign:'center', padding:'12px 10px', borderRadius:12, background:s.bg, border:`1px solid ${s.bc}` }}>
                <div style={{ fontWeight:900, fontSize:18, color:s.c, letterSpacing:'-0.03em' }}>{s.v}</div>
                <div style={{ fontSize:9.5, color:s.c, fontWeight:600, marginTop:3 }}>{s.l}</div>
              </div>
            ))}
          </HorizScroller>
          {simByStation.length > 0 && (
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', color:'#A89880', marginBottom:10 }}>By Station</div>
              {simByStation.map(s => {
                const pct = s.total>0 ? Math.round(s.assigned/s.total*100) : 0
                const sc  = { DDB1:'#B8860B', DXE6:'#1D6FA4' }[s.station_code] || '#B8860B'
                return (
                  <div key={s.station_code} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:sc }}>{s.station_code}</span>
                      <span style={{ fontSize:12, color:'#6B5D4A' }}>{s.assigned}/{s.total} assigned</span>
                    </div>
                    <div style={{ height:7, background:'#F0EDE6', borderRadius:10, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:sc, borderRadius:10, transition:'width 1s ease' }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// GENERAL MANAGER DASHBOARD
// ══════════════════════════════════════════════════════════════
function GMDashboard({ summary, chart, loading, leaves, onApproveLeave }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:12 }}>
        {[
          { icon:Users,    label:'Total Staff',     value:summary?String(summary.employees?.c||0):'—',              color:'#B8860B', sub:'employees' },
          { icon:Activity, label:'Present Today',   value:summary?String(summary.attendance?.present||0):'—',        color:'#2E7D52', sub:'checked in' },
          { icon:Calendar, label:'Pending Leaves',  value:summary?String(summary.pending_leaves||0):'—',             color:'#B45309', sub:'to action'  },
          { icon:Package,  label:'Deliveries Today',value:summary?String(summary.today_deliveries||0):'—',           color:'#1D6FA4', sub:'all stations' },
        ].map((k,i) => <KPICard key={k.label} {...k} loading={loading} delay={i*0.07}/>)}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }} className="two-col">
        <div className="card">
          <SHead title="Attendance Today"/>
          {[
            { l:'Present', v:summary?.attendance?.present||0, c:'#2E7D52' },
            { l:'Absent',  v:summary?.attendance?.absent||0,  c:'#C0392B' },
          ].map(s => (
            <div key={s.l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:s.c==='#2E7D52'?'#ECFDF5':'#FEF2F2', borderRadius:10, marginBottom:8 }}>
              <span style={{ fontSize:13, fontWeight:500, color:'#1A1612' }}>{s.l}</span>
              <span style={{ fontWeight:900, fontSize:22, color:s.c }}>{s.v}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <SHead title="Quick Links"/>
          {[
            { l:'Employees',  href:'/dashboard/hr/employees',  icon:Users    },
            { l:'Attendance', href:'/dashboard/hr/attendance', icon:Clock    },
            { l:'Leaves',     href:'/dashboard/hr/leaves',     icon:Calendar },
            { l:'POC Station',href:'/dashboard/poc',           icon:Truck    },
          ].map(item => {
            const Icon = item.icon
            return (
              <a key={item.l} href={item.href} style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', background:'#FAFAF8', borderRadius:10, border:'1px solid #EAE6DE', marginBottom:7, color:'#1A1612', textDecoration:'none', fontWeight:600, fontSize:13, transition:'background 0.15s' }}>
                <Icon size={15} color="#B8860B"/> {item.l} <ChevronRight size={13} style={{ marginLeft:'auto', color:'#C4B49A' }}/>
              </a>
            )
          })}
        </div>
      </div>

      {/* Leave approvals for GM */}
      {leaves?.length > 0 && (
        <div className="card">
          <SHead title="Leave Requests to Action" sub="POC approved — awaiting HR/GM decision"/>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {leaves.map(l => (
              <div key={l.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:'#FAFAF8', borderRadius:12, border:'1px solid #EAE6DE', flexWrap:'wrap' }} className="approval-card">
                <div style={{ flex:1, minWidth:180 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#1A1612' }}>{l.name}</div>
                  <div style={{ fontSize:11, color:'#A89880', marginTop:2 }}>{l.type} · {l.from_date} → {l.to_date} · {l.days} days</div>
                </div>
                <div style={{ display:'flex', gap:7 }}>
                  <button onClick={() => onApproveLeave(l.id,'approved','hr')} style={{ padding:'7px 16px', borderRadius:20, background:'linear-gradient(135deg,#2E7D52,#22C55E)', border:'none', color:'white', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>Approve</button>
                  <button onClick={() => onApproveLeave(l.id,'rejected','hr')} style={{ padding:'7px 16px', borderRadius:20, background:'#FEF2F2', border:'1px solid #FCA5A5', color:'#C0392B', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ACCOUNTANT DASHBOARD
// ══════════════════════════════════════════════════════════════
function AccountantDashboard({ summary, loading }) {
  const net = (Number(summary?.payroll?.base_total||0) + Number(summary?.payroll?.bonus_total||0) - Number(summary?.payroll?.ded_total||0))
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ background:'linear-gradient(135deg,#1A1612,#2C2318)', borderRadius:20, padding:'24px 20px', color:'white', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-20, top:-20, width:130, height:130, borderRadius:'50%', background:'rgba(184,134,11,0.15)' }}/>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>Net Payroll This Month</div>
        <div style={{ fontWeight:900, fontSize:22, color:'#D4A017', letterSpacing:'-0.04em' }}>AED {loading?'—':net.toLocaleString()}</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', marginTop:4 }}>Base + Bonuses − Deductions</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:12 }}>
        {[
          { icon:Wallet,       label:'Base Payroll',  value:`AED ${Number(summary?.payroll?.base_total||0).toLocaleString()}`,  color:'#B8860B' },
          { icon:TrendingUp,   label:'Bonuses',       value:`AED ${Number(summary?.payroll?.bonus_total||0).toLocaleString()}`, color:'#2E7D52' },
          { icon:AlertTriangle,label:'Deductions',    value:`AED ${Number(summary?.payroll?.ded_total||0).toLocaleString()}`,   color:'#C0392B' },
          { icon:FileText,     label:'Pending Fines', value:`AED ${Number(summary?.compliance?.pending_amount||0).toLocaleString()}`, color:'#B45309' },
        ].map((k,i) => <KPICard key={k.label} {...k} loading={loading} delay={i*0.07}/>)}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }} className="two-col">
        <div className="card">
          <SHead title="Quick Links"/>
          {[
            { l:'Payroll',  href:'/dashboard/finance/payroll',  icon:Wallet   },
            { l:'Expenses', href:'/dashboard/finance/expenses', icon:FileText },
          ].map(item => {
            const Icon = item.icon
            return (
              <a key={item.l} href={item.href} style={{ display:'flex', alignItems:'center', gap:9, padding:'10px 12px', background:'#FAFAF8', borderRadius:10, border:'1px solid #EAE6DE', marginBottom:7, color:'#1A1612', textDecoration:'none', fontWeight:600, fontSize:13 }}>
                <Icon size={15} color="#B8860B"/> {item.l} <ChevronRight size={13} style={{ marginLeft:'auto', color:'#C4B49A' }}/>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// HR DASHBOARD
// ══════════════════════════════════════════════════════════════
function HRDashboard({ summary, loading, leaves, onApproveLeave }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:12 }}>
        {[
          { icon:Users,    label:'Total Staff',    value:summary?String(summary.employees?.c||0):'—',             color:'#B8860B' },
          { icon:CheckCircle, label:'Active',       value:summary?String(summary.employees?.active||0):'—',        color:'#2E7D52' },
          { icon:Clock,    label:'Present Today',  value:summary?String(summary.attendance?.present||0):'—',       color:'#1D6FA4' },
          { icon:Calendar, label:'Pending Leaves', value:summary?String(summary.pending_leaves||0):'—',            color:'#B45309' },
        ].map((k,i) => <KPICard key={k.label} {...k} loading={loading} delay={i*0.07}/>)}
      </div>
      {leaves?.length > 0 && (
        <div className="card">
          <SHead title="Leave Requests to Action" sub="POC approved — awaiting HR decision"/>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {leaves.map(l => (
              <div key={l.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:'#FAFAF8', borderRadius:12, border:'1px solid #EAE6DE', flexWrap:'wrap' }} className="approval-card">
                <div style={{ flex:1, minWidth:180 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#1A1612' }}>{l.name}</div>
                  <div style={{ fontSize:11, color:'#A89880', marginTop:2 }}>{l.type} · {l.from_date} → {l.to_date} · {l.days} days</div>
                </div>
                <div style={{ display:'flex', gap:7 }}>
                  <button onClick={() => onApproveLeave(l.id,'approved','hr')} style={{ padding:'7px 16px', borderRadius:20, background:'linear-gradient(135deg,#2E7D52,#22C55E)', border:'none', color:'white', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>Approve</button>
                  <button onClick={() => onApproveLeave(l.id,'rejected','hr')} style={{ padding:'7px 16px', borderRadius:20, background:'#FEF2F2', border:'1px solid #FCA5A5', color:'#C0392B', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="card">
        <SHead title="Quick Links"/>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[
            { l:'Employees',  href:'/dashboard/hr/employees',  icon:Users    },
            { l:'Attendance', href:'/dashboard/hr/attendance', icon:Clock    },
            { l:'Leaves',     href:'/dashboard/hr/leaves',     icon:Calendar },
            { l:'Documents',  href:'/dashboard/hr/documents',  icon:FileText },
          ].map(item => {
            const Icon = item.icon
            return (
              <a key={item.l} href={item.href} style={{ display:'flex', alignItems:'center', gap:9, padding:'10px 12px', background:'#FAFAF8', borderRadius:10, border:'1px solid #EAE6DE', color:'#1A1612', textDecoration:'none', fontWeight:600, fontSize:13, transition:'background 0.15s' }}>
                <Icon size={15} color="#B8860B"/> {item.l}
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// POC DASHBOARD
// ══════════════════════════════════════════════════════════════
function POCDashboard({ summary, loading }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:12 }}>
        {[
          { icon:Package,  label:'Deliveries Today', value:summary?String(summary.today_deliveries||0):'—', color:'#B8860B' },
          { icon:Users,    label:'Present',           value:summary?String(summary.attendance?.present||0):'—', color:'#2E7D52' },
          { icon:UserMinus, label:'Absent',            value:summary?String(summary.attendance?.absent||0):'—',  color:'#C0392B' },
          { icon:Calendar, label:'Pending Leaves',    value:summary?String(summary.pending_leaves||0):'—',      color:'#B45309' },
        ].map((k,i) => <KPICard key={k.label} {...k} loading={loading} delay={i*0.07}/>)}
      </div>
      <div className="card">
        <SHead title="Quick Actions"/>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[
            { l:'Log Attendance', href:'/dashboard/poc', icon:Clock   },
            { l:'Log Deliveries', href:'/dashboard/poc', icon:Package },
            { l:'Manage Fleet',   href:'/dashboard/poc', icon:Truck   },
            { l:'Announcements',  href:'/dashboard/poc', icon:Activity },
          ].map(item => {
            const Icon = item.icon
            return (
              <a key={item.l} href={item.href} style={{ display:'flex', alignItems:'center', gap:9, padding:'12px', background:'#FAFAF8', borderRadius:11, border:'1px solid #EAE6DE', color:'#1A1612', textDecoration:'none', fontWeight:600, fontSize:13 }}>
                <div style={{ width:32, height:32, borderRadius:9, background:'#FDF6E3', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={15} color="#B8860B"/>
                </div>
                {item.l}
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function AnalyticsPage() {
  const [summary,  setSummary]    = useState(null)
  const [chart,    setChart]      = useState([])
  const [leaves,   setLeaves]     = useState([])
  const [loading,  setLoading]    = useState(true)
  const [userRole, setUserRole]   = useState(null)
  const [simStats, setSimStats]   = useState(null)
  const [simByStation, setSimByStation] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const user = JSON.parse(localStorage.getItem('gcd_user')||'{}')
      setUserRole(user.role)
      const [sum, ch, simStats] = await Promise.all([
        analyticsApi.summary(),
        fetch(`${API}/api/analytics/deliveries-chart?months=6`, { headers:hdr() }).then(r=>r.json()).catch(()=>({ chart:[] })),
        fetch(`${API}/api/sims/stats`, { headers:hdr() }).then(r=>r.json()).catch(()=>({ stats:null }))
      ])
      setSummary(sum)
      setChart(ch.chart || [])
      setSimStats(simStats.stats || null)
      setSimByStation(simStats.by_station || [])

      // Load pending leaves for roles that approve
      if (['manager','admin','hr','general_manager'].includes(user.role)) {
        const stage = user.role === 'manager' || user.role === 'admin' ? 'pending' : 'pending'
        const lv = await fetch(`${API}/api/leaves?stage=${stage}`, { headers:hdr() }).then(r=>r.json()).catch(()=>({ leaves:[] }))
        setLeaves(lv.leaves || [])
      }
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleApproveLeave(id, status, stage='manager') {
    const endpoint = stage === 'hr' ? `${API}/api/leaves/${id}/hr` : `${API}/api/leaves/${id}/manager`
    await fetch(endpoint, { method:'PATCH', headers:{ 'Content-Type':'application/json', ...hdr() }, body:JSON.stringify({ status }) })
    load()
  }

  const dashboards = {
    admin:           <ManagerDashboard   summary={summary} chart={chart} loading={loading} leaves={leaves} onApproveLeave={handleApproveLeave} simStats={simStats} simByStation={simByStation}/>,
    manager:         <ManagerDashboard   summary={summary} chart={chart} loading={loading} leaves={leaves} onApproveLeave={handleApproveLeave} simStats={simStats} simByStation={simByStation}/>,
    general_manager: <GMDashboard        summary={summary} chart={chart} loading={loading} leaves={leaves} onApproveLeave={handleApproveLeave}/>,
    hr:              <HRDashboard        summary={summary} loading={loading} leaves={leaves} onApproveLeave={handleApproveLeave}/>,
    accountant:      <AccountantDashboard summary={summary} loading={loading}/>,
    poc:             <POCDashboard        summary={summary} loading={loading}/>,
  }

  return dashboards[userRole] || dashboards.manager
}