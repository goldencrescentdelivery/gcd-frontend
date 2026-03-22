'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { analyticsApi } from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, RadialBarChart, RadialBar
} from 'recharts'
import {
  Users, Package, Activity, Wallet, AlertTriangle, Calendar,
  ChevronRight, ArrowUp, ArrowDown, Truck, ShieldCheck, Clock,
  UserMinus, CheckCircle, Smartphone, TrendingUp, Zap, Receipt
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL
const SC  = { DDB1:'#F59E0B', DXE6:'#38BDF8' }
function hdr() { return { Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }
function fmt(n) { return Number(n||0).toLocaleString() }

/* ─────────────────────────────────────────────
   GLOBAL STYLES  (injected once)
───────────────────────────────────────────── */
const GLASS_CSS = `
  :root {
    --gold: #B8860B;
    --gold-lt: #D4A017;
    --blue: #38BDF8;
    --surface: rgba(255,255,255,0.62);
    --surface-hover: rgba(255,255,255,0.82);
    --border-glass: rgba(255,255,255,0.7);
    --shadow-glass: 0 4px 32px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9);
    --shadow-lg: 0 8px 40px rgba(0,0,0,0.10);
  }

  /* Liquid glass base */
  .glass {
    background: var(--surface);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid var(--border-glass);
    box-shadow: var(--shadow-glass);
  }
  .glass:hover { background: var(--surface-hover); }

  /* Slim scrollbar */
  .no-scroll::-webkit-scrollbar { display:none; }
  .no-scroll { scrollbar-width:none; }

  /* Stagger animations */
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(16px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .fade-up { animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both; }

  /* KPI number counter */
  @keyframes countUp {
    from { opacity:0; transform:scale(0.85); }
    to   { opacity:1; transform:scale(1); }
  }
  .kpi-val { animation: countUp 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }

  /* Shimmer skeleton */
  @keyframes shimmer { to { background-position: -200% 0; } }
  .sk {
    background: linear-gradient(90deg, rgba(0,0,0,0.06) 25%, rgba(0,0,0,0.03) 50%, rgba(0,0,0,0.06) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
    border-radius: 8px;
  }

  /* Mobile/desktop toggle */
  .mob  { display:none !important; }
  .desk { display:grid; }
  @media(max-width:640px){
    .mob  { display:flex !important; }
    .desk { display:none !important; }
    .mob.kpi-wrap { display:block !important; }
    /* CRITICAL: prevent horizontal overflow */
    * { max-width:100%; box-sizing:border-box; }
    .glass { min-width:0 !important; max-width:100% !important; }
    /* Charts */
    .recharts-wrapper, .recharts-surface { max-width:100% !important; }
    /* Grids stack on mobile */
    [style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
  }
`

/* ─────────────────────────────────────────────
   CHART TOOLTIP
───────────────────────────────────────────── */
function GlassTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'rgba(255,255,255,0.92)', backdropFilter:'blur(16px)', border:'1px solid rgba(255,255,255,0.8)', borderRadius:12, padding:'10px 14px', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', fontFamily:'Poppins,sans-serif', fontSize:12 }}>
      <div style={{ fontWeight:700, color:'#6B5D4A', marginBottom:5 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color:p.color, fontWeight:600, display:'flex', gap:8, justifyContent:'space-between' }}>
          <span>{p.name}</span><strong>{fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   KPI CARD — liquid glass
───────────────────────────────────────────── */
function KPI({ icon:Icon, label, value, color, loading, delay=0, trend }) {
  return (
    <div className="glass fade-up" style={{ borderRadius:18, padding:'16px 16px 14px', animationDelay:`${delay}s`, position:'relative', overflow:'hidden', minWidth:0, cursor:'default', transition:'transform 0.2s, box-shadow 0.2s' }}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 12px 40px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)'}}
      onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='var(--shadow-glass)'}}>
      {/* Glow blob */}
      <div style={{ position:'absolute', right:-18, bottom:-18, width:72, height:72, borderRadius:'50%', background:`${color}18`, filter:'blur(12px)', pointerEvents:'none' }}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div style={{ width:38, height:38, borderRadius:12, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={18} color={color} strokeWidth={2}/>
        </div>
        {trend != null && (
          <span style={{ fontSize:10.5, fontWeight:700, color:trend>=0?'#16A34A':'#DC2626', background:trend>=0?'rgba(22,163,74,0.1)':'rgba(220,38,38,0.1)', borderRadius:8, padding:'2px 7px', display:'flex', alignItems:'center', gap:2 }}>
            {trend>=0?<ArrowUp size={10}/>:<ArrowDown size={10}/>}{Math.abs(trend)}%
          </span>
        )}
      </div>
      {loading ? <div className="sk" style={{ height:26, width:'70%', marginBottom:6 }}/> : (
        <div className="kpi-val" style={{ fontWeight:800, fontSize:22, color:'#1A1612', letterSpacing:'-0.04em', lineHeight:1, marginBottom:5, animationDelay:`${delay+0.1}s` }}>{value}</div>
      )}
      <div style={{ fontSize:11.5, fontWeight:600, color:'#8B7355', letterSpacing:'0.01em' }}>{label}</div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MOBILE SWIPE SLIDER
───────────────────────────────────────────── */
function Swiper({ items, render, peek='85vw' }) {
  const ref = useRef(null)
  const [idx, setIdx] = useState(0)
  function onScroll() {
    if (!ref.current) return
    const w = ref.current.firstChild?.offsetWidth || 200
    setIdx(Math.round(ref.current.scrollLeft / (w + 10)))
  }
  function go(i) {
    const w = ref.current?.firstChild?.offsetWidth || 200
    ref.current?.scrollTo({ left: i*(w+10), behavior:'smooth' })
  }
  return (
    <div>
      <div ref={ref} onScroll={onScroll} className="no-scroll"
        style={{ display:'flex', gap:10, overflowX:'auto', scrollSnapType:'x mandatory', WebkitOverflowScrolling:'touch', paddingBottom:4 }}>
        {items.map((item,i) => (
          <div key={i} style={{ minWidth:peek, maxWidth:peek, scrollSnapAlign:'start', flexShrink:0 }}>
            {render(item, i)}
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <div style={{ display:'flex', justifyContent:'center', gap:5, marginTop:10 }}>
          {items.map((_,i) => (
            <button key={i} onClick={()=>go(i)} style={{ width:i===idx?20:6, height:6, borderRadius:3, background:i===idx?'var(--gold)':'rgba(184,134,11,0.2)', border:'none', cursor:'pointer', padding:0, transition:'all 0.3s' }}/>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   SECTION HEADER
───────────────────────────────────────────── */
function SH({ title, sub, right }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:14, flexWrap:'wrap', gap:8 }}>
      <div>
        <h2 style={{ fontWeight:800, fontSize:15, color:'#1A1612', letterSpacing:'-0.02em', margin:0 }}>{title}</h2>
        {sub && <p style={{ fontSize:11.5, color:'#A89880', margin:'3px 0 0', fontWeight:500 }}>{sub}</p>}
      </div>
      {right}
    </div>
  )
}

/* ─────────────────────────────────────────────
   MANAGER DASHBOARD
───────────────────────────────────────────── */
function ManagerDashboard({ summary, chart, loading, leaves, onApproveLeave, simStats, simByStation, expenses }) {
  const kpis = [
    { icon:Users,         label:'Active DAs',       value:summary?String(summary.employees?.active||0):'—', color:'#F59E0B' },
    { icon:Package,       label:'Today Deliveries', value:summary?String(summary.today_deliveries||0):'—',  color:'#38BDF8' },
    { icon:Activity,      label:'Present Today',    value:summary?String(summary.attendance?.present||0):'—', color:'#34D399' },
    { icon:Wallet,        label:'Net Payroll',       value:summary?`AED ${fmt(summary.payroll?.base_total)}`:'—', color:'#A78BFA' },
    { icon:AlertTriangle, label:'Compliance',        value:summary?String(summary.compliance?.expired||0):'—', color:'#F87171' },
    { icon:Calendar,      label:'Pending Leaves',   value:summary?String(summary.pending_leaves||0):'—',    color:'#FB923C' },
  ]

  const delivData = chart.length ? chart : [{ month:'—', DDB1:0, DXE6:0 }]
  const stationData = Object.entries(SC).map(([s,col]) => ({
    name:s, value:delivData.reduce((a,m)=>a+(m[s]||0),0), color:col
  })).filter(s=>s.value>0)
  const totalDeliveries = stationData.reduce((a,s)=>a+s.value,0)

  // Expense analytics
  const ECATS = [
    {v:'ABN Parking',c:'#F59E0B'},{v:'Advances',c:'#10B981'},{v:'Air Tickets',c:'#3B82F6'},
    {v:'ENOC',c:'#EF4444'},{v:'Health Insurance',c:'#8B5CF6'},{v:'Idfy',c:'#EC4899'},
    {v:'Mobile Expenses',c:'#06B6D4'},{v:'Office Expenses',c:'#84CC16'},{v:'Petty Cash',c:'#F97316'},
    {v:'RTA Top-up',c:'#0EA5E9'},{v:'Vehicle Expenses',c:'#6366F1'},{v:'Vehicle Rent',c:'#7C3AED'},
    {v:'Visa Expenses',c:'#D97706'},{v:'Miscellaneous Expenses',c:'#94A3B8'},
  ]
  const totalExp  = (expenses||[]).reduce((s,e)=>s+Number(e.amount||0), 0)
  const pendingExp= (expenses||[]).filter(e=>e.status==='pending').length
  const byCat = ECATS.map(cat=>({
    name:cat.v, short:cat.v.split(' ')[0],
    value:(expenses||[]).filter(e=>e.category===cat.v).reduce((s,e)=>s+Number(e.amount||0),0),
    color:cat.c,
  })).filter(c=>c.value>0).sort((a,b)=>b.value-a.value)

  // Top spenders by employee
  const byEmp = [...new Set((expenses||[]).map(e=>e.emp_id))].map(id=>{
    const name = (expenses||[]).find(e=>e.emp_id===id)?.emp_name || id
    const total= (expenses||[]).filter(e=>e.emp_id===id).reduce((s,e)=>s+Number(e.amount||0),0)
    return { id, name, total }
  }).sort((a,b)=>b.total-a.total).slice(0,5)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

      {/* ── HERO ── */}
      <div style={{ borderRadius:22, overflow:'hidden', position:'relative', background:'linear-gradient(140deg,#0F0C07 0%,#1E1608 40%,#2C1F0A 70%,#1A1209 100%)', padding:'24px 22px 20px' }}>
        <div style={{ position:'absolute', right:-40, top:-40, width:220, height:220, borderRadius:'50%', background:'radial-gradient(circle, rgba(212,160,23,0.18) 0%, transparent 70%)', pointerEvents:'none'}}/>
        <div style={{ position:'absolute', left:-20, bottom:-30, width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)', pointerEvents:'none'}}/>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize:'32px 32px', pointerEvents:'none'}}/>
        <div style={{ position:'relative' }}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:6 }}>Operations Control</div>
          <div style={{ fontWeight:900, fontSize:20, color:'white', letterSpacing:'-0.03em', marginBottom:2 }}>Golden Crescent Dashboard</div>
          <div style={{ fontWeight:400, fontSize:13, color:'rgba(255,255,255,0.45)', marginBottom:18 }}>Real-time intelligence · {new Date().toLocaleDateString('en-AE',{weekday:'long',day:'numeric',month:'long'})}</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[
              { l:'Staff',    v:summary?.employees?.c||0,    c:'#F59E0B' },
              { l:'Stations', v:2,                            c:'#38BDF8' },
              { l:'Expenses', v:`AED ${fmt(totalExp)}`,      c:'#34D399' },
              { l:'Pending',  v:`${pendingExp} exp`,          c:'#FB923C' },
            ].map(s => (
              <div key={s.l} style={{ background:'rgba(255,255,255,0.08)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, padding:'9px 14px', flexShrink:0 }}>
                <div style={{ fontWeight:800, fontSize:16, color:s.c }}>{s.v}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:1 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI GRID ── */}
      <div>
        <SH title="Key Metrics" sub="Live operational data"/>
        <div className="desk" style={{ gridTemplateColumns:'repeat(6,1fr)', gap:10 }}>
          {kpis.map((k,i) => <KPI key={k.label} {...k} loading={loading} delay={i*0.05}/>)}
        </div>
        <div className="mob">
          <Swiper items={kpis} peek="calc(50% - 15px)" render={(k,i) => <KPI {...k} loading={loading} delay={i*0.05}/>}/>
        </div>
      </div>

      {/* ── EXPENSES SECTION ── */}
      <div>
        <SH title="Expenses This Month" sub={`AED ${fmt(totalExp)} total · ${pendingExp} pending approval`}
          right={<a href="/dashboard/finance/expenses" style={{ fontSize:12, fontWeight:600, color:'#B8860B', textDecoration:'none', display:'flex', alignItems:'center', gap:3 }}>Manage <ChevronRight size={12}/></a>}
        />

        {/* Expense KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:10, marginBottom:14 }}>
          {[
            { l:'Total Spent',   v:`AED ${fmt(totalExp)}`,                                           c:'#1A1612', bg:'rgba(255,255,255,0.65)' },
            { l:'Approved',      v:`AED ${fmt((expenses||[]).filter(e=>e.status==='approved').reduce((s,e)=>s+Number(e.amount||0),0))}`, c:'#10B981', bg:'rgba(16,185,129,0.1)' },
            { l:'Pending',       v:pendingExp,                                                       c:'#F59E0B', bg:'rgba(245,158,11,0.1)' },
            { l:'Categories',    v:byCat.length,                                                     c:'#A78BFA', bg:'rgba(167,139,250,0.1)' },
          ].map(s => (
            <div key={s.l} style={{ textAlign:'center', padding:'12px 8px', borderRadius:13, background:s.bg, border:'1px solid rgba(255,255,255,0.65)', backdropFilter:'blur(12px)' }}>
              <div style={{ fontWeight:900, fontSize:18, color:s.c, letterSpacing:'-0.02em' }}>{s.v}</div>
              <div style={{ fontSize:10, color:s.c, fontWeight:600, marginTop:3, opacity:0.8 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {byCat.length > 0 ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }} className="three-col-glass">

            {/* Pie by category */}
            <div className="glass fade-up" style={{ borderRadius:18, padding:'16px', overflow:'hidden' }}>
              <div style={{ fontWeight:700, fontSize:13, color:'#1A1612', marginBottom:12 }}>By Category</div>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
                <PieChart width={140} height={130}>
                  <Pie data={byCat} cx={65} cy={60} innerRadius={34} outerRadius={58} paddingAngle={3} dataKey="value">
                    {byCat.map((cc,i)=><Cell key={cc.name} fill={cc.color}/>)}
                  </Pie>
                  <Tooltip content={<GlassTip/>}/>
                </PieChart>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {byCat.slice(0,4).map(cc=>(
                  <div key={cc.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5, minWidth:0 }}>
                      <div style={{ width:7,height:7,borderRadius:2,background:cc.color,flexShrink:0 }}/>
                      <span style={{ fontSize:10.5,color:'#6B5D4A',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{cc.name}</span>
                    </div>
                    <span style={{ fontSize:10.5,fontWeight:700,color:cc.color,flexShrink:0 }}>AED {fmt(cc.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top categories bar */}
            <div className="glass fade-up" style={{ borderRadius:18, padding:'16px' }}>
              <div style={{ fontWeight:700, fontSize:13, color:'#1A1612', marginBottom:12 }}>Top Categories</div>
              <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                {byCat.slice(0,5).map(cc=>{
                  const pct=byCat[0]?.value>0?Math.round(cc.value/byCat[0].value*100):0
                  return (
                    <div key={cc.name}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:11,color:'#6B5D4A',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'60%' }}>{cc.name}</span>
                        <span style={{ fontSize:11,fontWeight:700,color:cc.color,flexShrink:0 }}>AED {fmt(cc.value)}</span>
                      </div>
                      <div style={{ height:5,background:'rgba(0,0,0,0.06)',borderRadius:10,overflow:'hidden' }}>
                        <div style={{ height:'100%',width:`${pct}%`,background:cc.color,borderRadius:10,transition:'width 1.2s ease' }}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top employee spenders */}
            <div className="glass fade-up" style={{ borderRadius:18, padding:'16px' }}>
              <div style={{ fontWeight:700, fontSize:13, color:'#1A1612', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                <Users size={13} color="#B8860B"/> Top Spenders
              </div>
              {byEmp.length===0 ? (
                <div style={{ fontSize:12, color:'#A89880', textAlign:'center', padding:20 }}>No data</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                  {byEmp.map((e,i)=>{
                    const COLORS=['#F59E0B','#6366F1','#10B981','#EF4444','#06B6D4']
                    const col=COLORS[i]||'#94A3B8'
                    const pct=byEmp[0]?.total>0?Math.round(e.total/byEmp[0].total*100):0
                    return (
                      <div key={e.id}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                          <span style={{ fontSize:11,color:'#6B5D4A',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'60%' }}>{e.name}</span>
                          <span style={{ fontSize:11,fontWeight:700,color:col,flexShrink:0 }}>AED {fmt(e.total)}</span>
                        </div>
                        <div style={{ height:5,background:'rgba(0,0,0,0.06)',borderRadius:10,overflow:'hidden' }}>
                          <div style={{ height:'100%',width:`${pct}%`,background:col,borderRadius:10,transition:'width 1.2s ease' }}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="glass fade-up" style={{ borderRadius:18, padding:'30px', textAlign:'center' }}>
            <div style={{ fontSize:12, color:'#A89880' }}>No expense data for this month</div>
            <a href="/dashboard/finance/expenses" style={{ display:'inline-block', marginTop:10, padding:'7px 18px', borderRadius:20, background:'#FDF6E3', color:'#B8860B', fontWeight:700, fontSize:12, textDecoration:'none' }}>+ Add Expenses</a>
          </div>
        )}
      </div>

      {/* ── DELIVERY CHART ── */}
      <div className="glass fade-up" style={{ borderRadius:20, padding:'20px', overflow:'hidden' }}>
        <SH title="Monthly Deliveries" sub="Last 6 months by station"
          right={
            <div style={{ display:'flex', gap:8 }}>
              {Object.entries(SC).map(([s,col]) => (
                <div key={s} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:col }}>
                  <div style={{ width:10, height:10, borderRadius:3, background:col }}/>{s}
                </div>
              ))}
            </div>
          }
        />
        <ResponsiveContainer width="99%" height={180}>
          <BarChart data={delivData} barSize={8} barGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false}/>
            <XAxis dataKey="month" stroke="#C4B49A" fontSize={10} tickLine={false} axisLine={false}/>
            <YAxis stroke="#C4B49A" fontSize={10} tickLine={false} axisLine={false}/>
            <Tooltip content={<GlassTip/>} cursor={{ fill:'rgba(0,0,0,0.04)' }}/>
            <Bar dataKey="DDB1" name="DDB1" fill="#F59E0B" radius={[4,4,0,0]}/>
            <Bar dataKey="DXE6" name="DXE6" fill="#38BDF8" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── ATTENDANCE + PAYROLL ── */}
      <div style={{ display:'grid', gap:14 }} className="two-col-glass">
        <div className="glass fade-up" style={{ borderRadius:20, padding:'18px' }}>
          <SH title="Attendance Today"/>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { l:'Present',  v:summary?.attendance?.present||0,  c:'#34D399', bg:'rgba(52,211,153,0.1)',  icon:CheckCircle },
              { l:'Absent',   v:summary?.attendance?.absent||0,   c:'#F87171', bg:'rgba(248,113,113,0.1)', icon:UserMinus },
              { l:'On Leave', v:summary?.pending_leaves||0,        c:'#FB923C', bg:'rgba(251,146,60,0.1)',  icon:Calendar },
            ].map(s => {
              const Icon = s.icon
              const total = (summary?.attendance?.present||0)+(summary?.attendance?.absent||0)
              const pct   = total>0?Math.round(s.v/total*100):0
              return (
                <div key={s.l} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:s.bg, borderRadius:13, border:`1px solid ${s.c}22` }}>
                  <div style={{ width:32,height:32,borderRadius:9,background:`${s.c}20`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                    <Icon size={15} color={s.c}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                      <span style={{ fontSize:12,color:'#4B3C2A',fontWeight:600 }}>{s.l}</span>
                      <span style={{ fontWeight:900,fontSize:18,color:s.c,letterSpacing:'-0.03em' }}>{s.v}</span>
                    </div>
                    <div style={{ height:4,background:'rgba(0,0,0,0.06)',borderRadius:10,overflow:'hidden' }}>
                      <div style={{ height:'100%',width:`${pct}%`,background:s.c,borderRadius:10,transition:'width 1.2s ease' }}/>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="glass fade-up" style={{ borderRadius:20, padding:'18px' }}>
          <SH title="Payroll This Month"/>
          {[
            { l:'Base Salaries', v:Number(summary?.payroll?.base_total||0),  c:'#1A1612' },
            { l:'Bonuses',       v:Number(summary?.payroll?.bonus_total||0), c:'#34D399' },
            { l:'Deductions',    v:Number(summary?.payroll?.ded_total||0),   c:'#F87171' },
          ].map(s => {
            const total=Number(summary?.payroll?.base_total||0)+Number(summary?.payroll?.bonus_total||0)
            const pct=total>0?Math.min(100,Math.round(s.v/total*100)):0
            return (
              <div key={s.l} style={{ marginBottom:12 }}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:5 }}>
                  <span style={{ fontSize:11.5,color:'#7B6A57',fontWeight:500 }}>{s.l}</span>
                  <span style={{ fontSize:12,fontWeight:700,color:s.c }}>AED {fmt(s.v)}</span>
                </div>
                <div style={{ height:5,background:'rgba(0,0,0,0.06)',borderRadius:10,overflow:'hidden' }}>
                  <div style={{ height:'100%',width:`${pct}%`,background:s.c,borderRadius:10,transition:'width 1.2s ease' }}/>
                </div>
              </div>
            )
          })}
          <div style={{ background:'rgba(184,134,11,0.08)',borderRadius:12,padding:'12px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',border:'1px solid rgba(184,134,11,0.15)',marginTop:4 }}>
            <span style={{ fontSize:12.5,fontWeight:700,color:'#5C4A1E' }}>Net Total</span>
            <span style={{ fontWeight:900,fontSize:18,color:'#B8860B',letterSpacing:'-0.03em' }}>
              AED {fmt(Number(summary?.payroll?.base_total||0)+Number(summary?.payroll?.bonus_total||0)-Number(summary?.payroll?.ded_total||0))}
            </span>
          </div>
        </div>
      </div>

      {/* ── STATION SPLIT + SIM ── */}
      {(stationData.length>0 || simStats) && (
        <div style={{ display:'grid', gridTemplateColumns:simStats?'1fr 1fr':'1fr', gap:14 }} className="two-col-glass">
          {stationData.length>0 && (
            <div className="glass fade-up" style={{ borderRadius:20, padding:'18px' }}>
              <SH title="Station Split" sub="Total deliveries"/>
              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ position:'relative', flexShrink:0 }}>
                  <PieChart width={120} height={120}>
                    <Pie data={stationData} cx={55} cy={55} innerRadius={36} outerRadius={54} paddingAngle={4} dataKey="value">
                      {stationData.map((s,i)=><Cell key={s.name} fill={s.color}/>)}
                    </Pie>
                  </PieChart>
                  <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column' }}>
                    <div style={{ fontWeight:900,fontSize:16,color:'#1A1612',letterSpacing:'-0.03em' }}>{fmt(totalDeliveries)}</div>
                    <div style={{ fontSize:9,color:'#A89880',fontWeight:600 }}>TOTAL</div>
                  </div>
                </div>
                <div style={{ flex:1 }}>
                  {stationData.map(s=>(
                    <div key={s.name} style={{ marginBottom:10 }}>
                      <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                        <span style={{ fontSize:12,fontWeight:700,color:s.color }}>{s.name}</span>
                        <span style={{ fontSize:12,fontWeight:700,color:'#1A1612' }}>{fmt(s.value)}</span>
                      </div>
                      <div style={{ height:5,background:'rgba(0,0,0,0.06)',borderRadius:10,overflow:'hidden' }}>
                        <div style={{ height:'100%',width:`${totalDeliveries>0?Math.round(s.value/totalDeliveries*100):0}%`,background:s.color,borderRadius:10,transition:'width 1.2s ease' }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {simStats && (
            <div className="glass fade-up" style={{ borderRadius:20, padding:'18px' }}>
              <SH title="SIM Inventory" sub="Fleet communication"
                right={<a href="/dashboard/poc" style={{ fontSize:11.5,fontWeight:600,color:'#B8860B',textDecoration:'none',display:'flex',alignItems:'center',gap:3 }}>Manage <ChevronRight size={12}/></a>}
              />
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:12 }}>
                {[
                  {l:'Total',v:simStats.total||0,c:'#1A1612'},{l:'Assigned',v:simStats.assigned||0,c:'#F59E0B'},
                  {l:'Available',v:simStats.available||0,c:'#34D399'},{l:'Cost/mo',v:`AED ${fmt(simStats.monthly_cost)}`,c:'#A78BFA'},
                ].map(s=>(
                  <div key={s.l} style={{ textAlign:'center',padding:'10px 6px',borderRadius:12,background:'rgba(0,0,0,0.04)',border:'1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ fontWeight:900,fontSize:16,color:s.c,letterSpacing:'-0.03em' }}>{s.v}</div>
                    <div style={{ fontSize:10,color:'#8B7355',fontWeight:600,marginTop:2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              {simByStation.map(s=>{
                const pct=s.total>0?Math.round(s.assigned/s.total*100):0
                const col=SC[s.station_code]||'#F59E0B'
                return (
                  <div key={s.station_code} style={{ marginBottom:8 }}>
                    <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                      <span style={{ fontSize:11.5,fontWeight:700,color:col }}>{s.station_code}</span>
                      <span style={{ fontSize:11,color:'#8B7355' }}>{s.assigned}/{s.total}</span>
                    </div>
                    <div style={{ height:5,background:'rgba(0,0,0,0.06)',borderRadius:10,overflow:'hidden' }}>
                      <div style={{ height:'100%',width:`${pct}%`,background:col,borderRadius:10,transition:'width 1.2s ease' }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PENDING LEAVES ── */}
      {leaves?.length>0 && (
        <div className="glass fade-up" style={{ borderRadius:20, padding:'18px' }}>
          <SH title="Pending Approvals" sub="HR approved — needs final sign-off"/>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {leaves.slice(0,5).map(l=>(
              <div key={l.id} style={{ background:'rgba(0,0,0,0.03)',borderRadius:13,border:'1px solid rgba(0,0,0,0.06)',overflow:'hidden' }}>
                <div style={{ padding:'10px 14px' }}>
                  <div style={{ fontWeight:700,fontSize:13,color:'#1A1612' }}>{l.name}</div>
                  <div style={{ fontSize:11,color:'#A89880',marginTop:2 }}>{l.type} · {l.from_date} → {l.to_date} · {l.days} days</div>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:'rgba(0,0,0,0.05)' }}>
                  <button onClick={()=>onApproveLeave(l.id,'approved')} style={{ padding:'9px',background:'rgba(52,211,153,0.15)',border:'none',color:'#059669',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'Poppins,sans-serif' }}>✓ Approve</button>
                  <button onClick={()=>onApproveLeave(l.id,'rejected')} style={{ padding:'9px',background:'rgba(248,113,113,0.15)',border:'none',color:'#DC2626',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'Poppins,sans-serif' }}>✕ Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── QUICK ACTIONS ── */}
      <div className="glass fade-up" style={{ borderRadius:20, padding:'18px' }}>
        <SH title="Quick Actions"/>
        <div className="desk" style={{ gridTemplateColumns:'repeat(6,1fr)', gap:10 }}>
          {[
            {l:'Employees',   href:'/dashboard/hr/employees',     icon:Users,          c:'#F59E0B'},
            {l:'Payroll',     href:'/dashboard/finance/payroll',   icon:Wallet,         c:'#38BDF8'},
            {l:'Expenses',    href:'/dashboard/finance/expenses',  icon:Receipt,        c:'#34D399'},
            {l:'Performance', href:'/dashboard/performance',       icon:TrendingUp,     c:'#A78BFA'},
            {l:'Damage',      href:'/dashboard/damage',            icon:AlertTriangle,  c:'#F87171'},
            {l:'Advances',    href:'/dashboard/advances',          icon:Zap,            c:'#FB923C'},
          ].map(item=>{
            const Icon=item.icon
            return (
              <a key={item.l} href={item.href}
                style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'14px 8px',borderRadius:14,background:`${item.c}10`,border:`1px solid ${item.c}22`,textDecoration:'none',transition:'all 0.2s' }}
                onMouseEnter={e=>{e.currentTarget.style.background=`${item.c}20`;e.currentTarget.style.transform='translateY(-2px)'}}
                onMouseLeave={e=>{e.currentTarget.style.background=`${item.c}10`;e.currentTarget.style.transform='none'}}>
                <div style={{ width:40,height:40,borderRadius:12,background:`${item.c}18`,display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <Icon size={18} color={item.c}/>
                </div>
                <span style={{ fontSize:11,fontWeight:700,color:item.c,textAlign:'center' }}>{item.l}</span>
              </a>
            )
          })}
        </div>
        <div className="mob" style={{ display:'flex',gap:10,overflowX:'auto',scrollbarWidth:'none',paddingBottom:2 }}>
          {[
            {l:'Employees',   href:'/dashboard/hr/employees',     icon:Users,          c:'#F59E0B'},
            {l:'Payroll',     href:'/dashboard/finance/payroll',   icon:Wallet,         c:'#38BDF8'},
            {l:'Expenses',    href:'/dashboard/finance/expenses',  icon:Receipt,        c:'#34D399'},
            {l:'Performance', href:'/dashboard/performance',       icon:TrendingUp,     c:'#A78BFA'},
            {l:'Damage',      href:'/dashboard/damage',            icon:AlertTriangle,  c:'#F87171'},
            {l:'Advances',    href:'/dashboard/advances',          icon:Zap,            c:'#FB923C'},
          ].map(item=>{
            const Icon=item.icon
            return (
              <a key={item.l} href={item.href}
                style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:7,padding:'12px 14px',borderRadius:13,background:`${item.c}10`,border:`1px solid ${item.c}22`,textDecoration:'none',flexShrink:0 }}>
                <div style={{ width:36,height:36,borderRadius:11,background:`${item.c}18`,display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <Icon size={16} color={item.c}/>
                </div>
                <span style={{ fontSize:10.5,fontWeight:700,color:item.c,textAlign:'center',whiteSpace:'nowrap' }}>{item.l}</span>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}


function SimpleKPIGrid({ kpis, loading }) {
  return (
    <>
      <div className="desk" style={{ gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
        {kpis.map((k,i) => <KPI key={k.label} {...k} loading={loading} delay={i*0.05}/>)}
      </div>
      <div className="mob kpi-wrap">
        <Swiper items={kpis} peek="calc(50% - 15px)" render={(k,i) => <KPI {...k} loading={loading} delay={i*0.05}/>}/>
      </div>
    </>
  )
}

function GMDashboard({ summary, chart, loading }) {
  const kpis = [
    { icon:Users,         label:'Total Staff',     value:summary?String(summary.employees?.c||0):'—',               color:'#F59E0B' },
    { icon:Activity,      label:'Present Today',   value:summary?String(summary.attendance?.present||0):'—',        color:'#34D399' },
    { icon:Calendar,      label:'Pending Leaves',  value:summary?String(summary.pending_leaves||0):'—',             color:'#FB923C' },
    { icon:AlertTriangle, label:'Compliance',       value:summary?String(summary.compliance?.expired||0):'—',       color:'#F87171' },
    { icon:Package,       label:'Today Deliveries',value:summary?String(summary.today_deliveries||0):'—',           color:'#38BDF8' },
  ]
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SimpleKPIGrid kpis={kpis} loading={loading}/>
    </div>
  )
}

function HRDashboard({ summary, loading }) {
  const kpis = [
    { icon:Users,         label:'Total Staff',    value:summary?String(summary.employees?.c||0):'—',         color:'#F59E0B' },
    { icon:Activity,      label:'Active',          value:summary?String(summary.employees?.active||0):'—',   color:'#34D399' },
    { icon:Calendar,      label:'Pending Leaves', value:summary?String(summary.pending_leaves||0):'—',       color:'#FB923C' },
    { icon:AlertTriangle, label:'Doc Alerts',      value:summary?String(summary.compliance?.expired||0):'—', color:'#F87171' },
  ]
  return <SimpleKPIGrid kpis={kpis} loading={loading}/>
}

const EXPENSE_CATS = [
  { v:'ABN Parking',c:'#F59E0B',e:'🅿️' },{ v:'Advances',c:'#10B981',e:'💵' },
  { v:'Air Tickets',c:'#3B82F6',e:'✈️' },{ v:'ENOC',c:'#EF4444',e:'⛽' },
  { v:'Health Insurance',c:'#8B5CF6',e:'🏥' },{ v:'Idfy',c:'#EC4899',e:'🔍' },
  { v:'Mobile Expenses',c:'#06B6D4',e:'📱' },{ v:'Office Expenses',c:'#84CC16',e:'🏢' },
  { v:'RTA Top-up',c:'#F97316',e:'🚌' },{ v:'Vehicle Expenses',c:'#6366F1',e:'🚗' },
  { v:'Vehicle Rent',c:'#0EA5E9',e:'🔑' },{ v:'Visa Expenses',c:'#D97706',e:'📋' },
  { v:'Miscellaneous Expenses',c:'#94A3B8',e:'📦' },
]

function AccountantDashboard({ summary, loading, expenses }) {
  const net = Number(summary?.payroll?.base_total||0)+Number(summary?.payroll?.bonus_total||0)-Number(summary?.payroll?.ded_total||0)
  const totalExp = (expenses||[]).reduce((s,e)=>s+Number(e.amount||0),0)

  const kpis = [
    { icon:Wallet,       label:'Base Salaries', value:`AED ${fmt(summary?.payroll?.base_total)}`, color:'#F59E0B' },
    { icon:TrendingUp,   label:'Bonuses',        value:`AED ${fmt(summary?.payroll?.bonus_total)}`,color:'#34D399' },
    { icon:AlertTriangle,label:'Deductions',     value:`AED ${fmt(summary?.payroll?.ded_total)}`,  color:'#F87171' },
    { icon:Wallet,       label:'Net Payroll',    value:`AED ${fmt(net)}`,                          color:'#A78BFA' },
    { icon:Receipt,      label:'Total Expenses', value:loading?'—':`AED ${fmt(totalExp)}`, color:'#F59E0B' },
  ]

  const byCat = EXPENSE_CATS.map(cat => ({
    name: cat.v, short: cat.e + ' ' + cat.v.split(' ')[0],
    value: (expenses||[]).filter(e=>e.category===cat.v).reduce((s,e)=>s+Number(e.amount||0),0),
    color: cat.c,
  })).filter(c=>c.value>0).sort((a,b)=>b.value-a.value)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <SimpleKPIGrid kpis={kpis} loading={loading}/>

      {byCat.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }} className="two-col-glass">
          {/* Pie */}
          <div className="glass fade-up" style={{ borderRadius:20, padding:'18px', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.7)' }}>
            <div style={{ fontWeight:800, fontSize:14, color:'#1A1612', marginBottom:2 }}>Expense Breakdown</div>
            <div style={{ fontSize:11.5, color:'#A89880', marginBottom:14 }}>By category this month</div>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <PieChart width={130} height={130}>
                <Pie data={byCat} cx={60} cy={60} innerRadius={35} outerRadius={58} paddingAngle={3} dataKey="value">
                  {byCat.map((c,i) => <Cell key={c.name} fill={c.color}/>)}
                </Pie>
                <Tooltip content={<GlassTip/>}/>
              </PieChart>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:5 }}>
                {byCat.slice(0,5).map(c => (
                  <div key={c.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5, minWidth:0 }}>
                      <div style={{ width:8, height:8, borderRadius:2, background:c.color, flexShrink:0 }}/>
                      <span style={{ fontSize:10.5, color:'#6B5D4A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.short}</span>
                    </div>
                    <span style={{ fontSize:10.5, fontWeight:700, color:c.color, flexShrink:0 }}>AED {fmt(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bar */}
          <div className="glass fade-up" style={{ borderRadius:20, padding:'18px', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.7)' }}>
            <div style={{ fontWeight:800, fontSize:14, color:'#1A1612', marginBottom:2 }}>Top Categories</div>
            <div style={{ fontSize:11.5, color:'#A89880', marginBottom:14 }}>Highest spending</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {byCat.slice(0,5).map(c => {
                const pct = byCat[0]?.value > 0 ? Math.round(c.value/byCat[0].value*100) : 0
                return (
                  <div key={c.name}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:11, color:'#6B5D4A', fontWeight:500 }}>{c.short}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:c.color }}>AED {fmt(c.value)}</span>
                    </div>
                    <div style={{ height:5, background:'rgba(0,0,0,0.06)', borderRadius:10, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:c.color, borderRadius:10, transition:'width 1.2s ease' }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="glass fade-up" style={{ borderRadius:20, padding:'16px', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.7)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
        <div style={{ fontWeight:700, fontSize:14, color:'#1A1612' }}>
          View detailed expense records
        </div>
        <a href="/dashboard/finance/expenses" style={{ padding:'8px 18px', borderRadius:20, background:'linear-gradient(135deg,#B8860B,#D4A017)', color:'white', fontWeight:700, fontSize:12, textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
          Open Expenses →
        </a>
      </div>
    </div>
  )
}

function POCDashboard({ summary, chart, loading }) {
  const kpis = [
    { icon:Users,   label:'My DAs',          value:summary?String(summary.employees?.active||0):'—',        color:'#F59E0B' },
    { icon:Package, label:'Today Deliveries',value:summary?String(summary.today_deliveries||0):'—',         color:'#38BDF8' },
    { icon:Activity,label:'Present',          value:summary?String(summary.attendance?.present||0):'—',     color:'#34D399' },
    { icon:Calendar,label:'Leaves',           value:summary?String(summary.pending_leaves||0):'—',          color:'#FB923C' },
  ]
  return <SimpleKPIGrid kpis={kpis} loading={loading}/>
}

/* ─────────────────────────────────────────────
   ROOT PAGE
───────────────────────────────────────────── */
export default function AnalyticsPage() {
  const [summary,      setSummary]      = useState(null)
  const [chart,        setChart]        = useState([])
  const [leaves,       setLeaves]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [userRole,     setUserRole]     = useState(null)
  const [simStats,     setSimStats]     = useState(null)
  const [simByStation, setSimByStation] = useState([])
  const [expenses,     setExpenses]     = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('gcd_token')
      if (token) {
        try { const p=JSON.parse(atob(token.split('.')[1])); setUserRole(p.role) } catch(e){}
      }
      const [sum, ch, simD, expD] = await Promise.all([
        analyticsApi.summary(),
        fetch(`${API}/api/analytics/deliveries-chart?months=6`, { headers:hdr() }).then(r=>r.json()).catch(()=>({ chart:[] })),
        fetch(`${API}/api/sims/stats`, { headers:hdr() }).then(r=>r.json()).catch(()=>({ stats:null })),
        fetch(`${API}/api/expenses?month=${new Date().toISOString().slice(0,7)}`, { headers:hdr() }).then(r=>r.json()).catch(()=>({ expenses:[] })),
      ])
      setSummary(sum)
      setChart(ch.chart || [])
      setSimStats(simD.stats || null)
      setSimByStation(simD.by_station || [])
      setExpenses(expD.expenses || [])

      // Load pending leaves for manager/admin
      const role = userRole || (token ? JSON.parse(atob(token.split('.')[1])).role : null)
      if (['admin','manager'].includes(role)) {
        const lv = await fetch(`${API}/api/leaves?stage=pending`, { headers:hdr() }).then(r=>r.json()).catch(()=>({ leaves:[] }))
        setLeaves(lv.leaves || [])
      }
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleApproveLeave(id, status) {
    await fetch(`${API}/api/leaves/${id}/manager`, { method:'PATCH', headers:{ 'Content-Type':'application/json', ...hdr() }, body:JSON.stringify({ status }) })
    load()
  }

  const role = userRole

  const dashboards = {
    manager:         <ManagerDashboard   summary={summary} chart={chart} loading={loading} leaves={leaves} onApproveLeave={handleApproveLeave} simStats={simStats} simByStation={simByStation} expenses={expenses}/>,
    admin:           <ManagerDashboard   summary={summary} chart={chart} loading={loading} leaves={leaves} onApproveLeave={handleApproveLeave} simStats={simStats} simByStation={simByStation} expenses={expenses}/>,
    general_manager: <GMDashboard        summary={summary} chart={chart} loading={loading}/>,
    hr:              <HRDashboard        summary={summary} loading={loading}/>,
    accountant:      <AccountantDashboard summary={summary} loading={loading} expenses={expenses||[]}/>,
    poc:             <POCDashboard       summary={summary} chart={chart} loading={loading}/>,
  }

  return (
    <>
      <style>{GLASS_CSS}</style>
      <style>{`
        .two-col-glass { grid-template-columns: 1fr 1fr; }
        @media(max-width:640px) { .two-col-glass { grid-template-columns: 1fr; } }
      `}</style>
      <div style={{ display:'flex', flexDirection:'column', gap:0, animation:'fadeUp 0.4s ease both', minWidth:0, maxWidth:'100%', width:'100%' }}>
        {/* Page header */}
        <div style={{ marginBottom:18, display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontWeight:900, fontSize:20, color:'#1A1612', letterSpacing:'-0.03em', margin:0 }}>Analytics</h1>
            <p style={{ fontSize:12, color:'#A89880', margin:'3px 0 0', fontWeight:500 }}>Live overview</p>
          </div>
          <div style={{ fontSize:11.5, color:'#A89880', fontWeight:500 }}>
            {new Date().toLocaleDateString('en-AE',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}
          </div>
        </div>

        {loading && !summary ? (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div className="sk" style={{ height:160, borderRadius:22 }}/>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10 }}>
              {Array(6).fill(0).map((_,i) => <div key={i} className="sk" style={{ height:100, borderRadius:18 }}/>)}
            </div>
            <div className="sk" style={{ height:220, borderRadius:20 }}/>
          </div>
        ) : (
          dashboards[role] || dashboards.admin
        )}
      </div>
    </>
  )
}