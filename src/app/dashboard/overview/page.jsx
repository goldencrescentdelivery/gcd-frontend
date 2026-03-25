'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { analyticsApi } from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import {
  Users, Package, Activity, Wallet, AlertTriangle, Calendar,
  ChevronRight, ArrowUp, ArrowDown, TrendingUp, Smartphone,
  Receipt, CheckCircle, UserMinus, Clock, Zap, Building2
} from 'lucide-react'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL
const SC  = { DDB1:'#F59E0B', DXE6:'#38BDF8' }
function hdr() { return { Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }
function fmt(n) { return Number(n||0).toLocaleString() }
function fmtAED(n) { return `AED ${fmt(n)}` }

/* ── Tooltip ─────────────────────────────────────────────────── */
function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'white', border:'1px solid #F0F0EE', borderRadius:10, padding:'8px 12px', boxShadow:'0 4px 20px rgba(0,0,0,0.1)', fontSize:12 }}>
      <div style={{ fontWeight:700, color:'#6B7280', marginBottom:4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color:p.color, fontWeight:600, display:'flex', gap:10, justifyContent:'space-between' }}>
          <span>{p.name}</span><strong>{typeof p.value==='number'&&p.value>999?fmt(p.value):p.value}</strong>
        </div>
      ))}
    </div>
  )
}

/* ── Section Header ──────────────────────────────────────────── */
function SH({ title, sub, right, href }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:14, gap:8 }}>
      <div>
        <h2 style={{ fontWeight:800, fontSize:15, color:'var(--text)', margin:0, letterSpacing:'-0.02em' }}>{title}</h2>
        {sub && <p style={{ fontSize:11.5, color:'var(--text-muted)', margin:'2px 0 0' }}>{sub}</p>}
      </div>
      {(right || href) && (
        href ? (
          <Link href={href} style={{ fontSize:12, fontWeight:600, color:'var(--gold)', display:'flex', alignItems:'center', gap:3, whiteSpace:'nowrap' }}>
            View all <ChevronRight size={12}/>
          </Link>
        ) : right
      )}
    </div>
  )
}

/* ── KPI Card ────────────────────────────────────────────────── */
function KPI({ icon:Icon, label, value, color, loading, sub }) {
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px', position:'relative', overflow:'hidden', transition:'all 0.2s' }}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow='var(--shadow-md)';e.currentTarget.style.transform='translateY(-2px)'}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='none'}}>
      <div style={{ position:'absolute', right:-10, bottom:-10, width:60, height:60, borderRadius:'50%', background:`${color}12`, filter:'blur(8px)' }}/>
      <div style={{ width:36, height:36, borderRadius:10, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
        <Icon size={16} color={color}/>
      </div>
      {loading
        ? <div className="sk" style={{ height:24, width:'60%', marginBottom:5 }}/>
        : <div style={{ fontWeight:800, fontSize:20, color:'var(--text)', letterSpacing:'-0.04em', lineHeight:1, marginBottom:4 }}>{value}</div>
      }
      <div style={{ fontSize:11.5, fontWeight:600, color:'var(--text-muted)' }}>{label}</div>
      {sub && <div style={{ fontSize:10.5, color:color, fontWeight:600, marginTop:3 }}>{sub}</div>}
    </div>
  )
}

/* ── Mini bar ────────────────────────────────────────────────── */
function MiniBar({ value, total, color }) {
  const pct = total > 0 ? Math.min(100, Math.round(value/total*100)) : 0
  return (
    <div style={{ height:5, background:'var(--bg-alt)', borderRadius:10, overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:10, transition:'width 1.2s ease' }}/>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function OverviewPage() {
  const [summary,      setSummary]      = useState(null)
  const [chart,        setChart]        = useState([])
  const [expenses,     setExpenses]     = useState([])
  const [simStats,     setSimStats]     = useState(null)
  const [simByStation, setSimByStation] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [userRole,     setUserRole]     = useState(null)

  const load = useCallback(async () => {
    let role = null
    try {
      const token = localStorage.getItem('gcd_token')
      if (token) { role = JSON.parse(atob(token.split('.')[1])).role; setUserRole(role) }
    } catch(e) {}

    setLoading(true)
    try { const sum = await analyticsApi.summary(); setSummary(sum); setLoading(false) }
    catch(e) { setLoading(false) }

    const month = new Date().toISOString().slice(0,7)
    fetch(`${API}/api/analytics/deliveries-chart?months=6`,{headers:hdr()}).then(r=>r.json()).then(d=>setChart(d.chart||[])).catch(()=>{})
    fetch(`${API}/api/expenses?month=${month}`,{headers:hdr()}).then(r=>r.json()).then(d=>setExpenses(d.expenses||[])).catch(()=>{})
    fetch(`${API}/api/sims/stats`,{headers:hdr()}).then(r=>r.json()).then(d=>{setSimStats(d.stats||null);setSimByStation(d.by_station||[])}).catch(()=>{})
  }, [])

  useEffect(() => { load() }, [load])

  const totalExp   = expenses.reduce((s,e)=>s+Number(e.amount||0),0)
  const pendingExp = expenses.filter(e=>e.status==='pending').length
  const approvedExp= expenses.filter(e=>e.status==='approved').reduce((s,e)=>s+Number(e.amount||0),0)
  const delivData  = chart.length ? chart : []
  const totalDeliv = delivData.reduce((a,m)=>a+(m.DDB1||0)+(m.DXE6||0),0)

  const ECATS = [
    {v:'Parking',c:'#F59E0B'},{v:'Advances',c:'#10B981'},{v:'Air Tickets',c:'#3B82F6'},
    {v:'ENOC',c:'#EF4444'},{v:'Health Insurance',c:'#8B5CF6'},{v:'Idfy',c:'#EC4899'},
    {v:'Mobile Expenses',c:'#06B6D4'},{v:'Office Expenses',c:'#84CC16'},{v:'Petty Cash',c:'#F97316'},
    {v:'RTA Top-up',c:'#0EA5E9'},{v:'Vehicle Expenses',c:'#6366F1'},{v:'Vehicle Rent',c:'#7C3AED'},
    {v:'Visa Expenses',c:'#D97706'},{v:'Miscellaneous Expenses',c:'#94A3B8'},
  ]
  const byCat = ECATS.map(cat=>({
    name:cat.v, short:cat.v.split(' ')[0],
    value:expenses.filter(e=>e.category===cat.v).reduce((s,e)=>s+Number(e.amount||0),0),
    color:cat.c,
  })).filter(c=>c.value>0).sort((a,b)=>b.value-a.value)

  // Project-wise delivery data — DDB1 = Pulser, DXE6 = CRET
  const projectData = delivData.map(m => ({
    month: m.month,
    Pulser: m.DDB1 || 0,
    CRET:   m.DXE6 || 0,
    Total:  (m.DDB1||0) + (m.DXE6||0),
  }))


  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <Link href="/dashboard/analytics" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:20, background:'var(--bg-alt)', border:'1px solid var(--border)', color:'var(--text-sub)', fontSize:12, fontWeight:600, textDecoration:'none' }}>
          <TrendingUp size={13}/> Detailed Analytics
        </Link>
      </div>

      {/* ── LAST 6 MONTHS — PROJECT-WISE ─────────────────────── */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'20px' }}>
        <SH title="Last 6 Months — Project Deliveries" sub="DDB1 (Pulser) vs DXE6 (CRET)" href="/dashboard/analytics"/>
        {delivData.length === 0 ? (
          <div className="sk" style={{ height:200, borderRadius:10 }}/>
        ) : (
          <>
            {/* Summary chips */}
            <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
              {[
                { label:'DDB1 Pulser', value:fmt(delivData.reduce((a,m)=>a+(m.DDB1||0),0)), color:'#F59E0B' },
                { label:'DXE6 CRET',  value:fmt(delivData.reduce((a,m)=>a+(m.DXE6||0),0)), color:'#38BDF8' },
                { label:'Combined',   value:fmt(totalDeliv), color:'#10B981' },
              ].map(s => (
                <div key={s.label} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 14px', borderRadius:20, background:'var(--bg-alt)', border:'1px solid var(--border)' }}>
                  <div style={{ width:9, height:9, borderRadius:3, background:s.color }}/>
                  <span style={{ fontSize:11.5, color:'var(--text-muted)', fontWeight:500 }}>{s.label}</span>
                  <span style={{ fontSize:13, fontWeight:800, color:s.color }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Grouped bar chart */}
            <ResponsiveContainer width="99%" height={200}>
              <BarChart data={projectData} barSize={10} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false}/>
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false}/>
                <Tooltip content={<Tip/>} cursor={{ fill:'rgba(0,0,0,0.03)' }}/>
                <Bar dataKey="Pulser" fill="#F59E0B" radius={[4,4,0,0]}/>
                <Bar dataKey="CRET"   fill="#38BDF8" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>

            {/* Monthly trend line overlay */}
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:11.5, color:'var(--text-muted)', fontWeight:600, marginBottom:8 }}>Monthly Total Trend</div>
              <ResponsiveContainer width="99%" height={60}>
                <AreaChart data={projectData}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B8860B" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#B8860B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="Total" stroke="#B8860B" strokeWidth={2} fill="url(#trendGrad)" dot={false}/>
                  <XAxis dataKey="month" hide/>
                  <Tooltip content={<Tip/>}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* ── TOP KPIs ─────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }} className="four-kpi-grid">
        <KPI icon={Users}         label="Active DAs"        color="#F59E0B" loading={loading} value={summary?.employees?.active||'—'} sub={`${summary?.employees?.c||0} total staff`}/>
        <KPI icon={Package}       label="Total Deliveries"  color="#38BDF8" loading={loading} value={fmt(totalDeliv)} sub="Last 6 months"/>
        <KPI icon={Receipt}       label="Expenses This Month" color="#10B981" loading={loading} value={fmtAED(totalExp)} sub={`${pendingExp} pending`}/>
        <KPI icon={Smartphone}    label="SIM Cards"         color="#A78BFA" loading={loading} value={simStats?.total||'—'} sub={`${simStats?.assigned||0} assigned`}/>
      </div>

      {/* ── EXPENSES + EMPLOYEES ─────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16 }} className="exp-emp-grid">

        {/* EXPENSES */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'20px' }}>
          <SH title="Expenses This Month" sub={`${fmtAED(totalExp)} total · ${pendingExp} pending`} href="/dashboard/finance/expenses"/>

          {/* Big stat row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
            {[
              { l:'Total',    v:fmtAED(totalExp),    c:'#111827', bg:'#F9FAFB' },
              { l:'Approved', v:fmtAED(approvedExp), c:'#10B981', bg:'#F0FDF4' },
              { l:'Pending',  v:pendingExp,           c:'#F59E0B', bg:'#FFFBEB' },
            ].map(s=>(
              <div key={s.l} style={{ textAlign:'center', padding:'10px 6px', borderRadius:12, background:s.bg, border:'1px solid var(--border)' }}>
                <div style={{ fontWeight:800, fontSize:15, color:s.c, letterSpacing:'-0.02em' }}>{s.v}</div>
                <div style={{ fontSize:10.5, color:'var(--text-muted)', fontWeight:600, marginTop:2 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {byCat.length === 0 ? (
            <div className="sk" style={{ height:140, borderRadius:10 }}/>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:16, alignItems:'center' }}>
              {/* Donut */}
              <div style={{ position:'relative' }}>
                <PieChart width={120} height={120}>
                  <Pie data={byCat} cx={55} cy={55} innerRadius={34} outerRadius={54} paddingAngle={3} dataKey="value">
                    {byCat.map((c,i)=><Cell key={c.name} fill={c.color}/>)}
                  </Pie>
                  <Tooltip content={<Tip/>}/>
                </PieChart>
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', pointerEvents:'none' }}>
                  <div style={{ fontWeight:900, fontSize:12, color:'var(--text)', letterSpacing:'-0.02em' }}>{byCat.length}</div>
                  <div style={{ fontSize:9, color:'var(--text-muted)', fontWeight:600 }}>CATS</div>
                </div>
              </div>
              {/* Category list */}
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {byCat.slice(0,5).map(c=>(
                  <div key={c.name}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5, minWidth:0 }}>
                        <div style={{ width:7, height:7, borderRadius:2, background:c.color, flexShrink:0 }}/>
                        <span style={{ fontSize:11, color:'var(--text-sub)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</span>
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, color:c.color, flexShrink:0, marginLeft:4 }}>AED {fmt(c.value)}</span>
                    </div>
                    <MiniBar value={c.value} total={byCat[0]?.value||1} color={c.color}/>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* EMPLOYEES */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'20px' }}>
          <SH title="Employees" sub="Current workforce status" href="/dashboard/hr/employees"/>

          {/* Staff ring */}
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:16 }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <PieChart width={100} height={100}>
                <Pie
                  data={[
                    { name:'Active',   value:summary?.employees?.active||0,   fill:'#10B981' },
                    { name:'Inactive', value:(summary?.employees?.c||0)-(summary?.employees?.active||0), fill:'#E5E7EB' },
                  ]}
                  cx={45} cy={45} innerRadius={28} outerRadius={44} dataKey="value" paddingAngle={3}>
                  <Cell fill="#10B981"/>
                  <Cell fill="#E5E7EB"/>
                </Pie>
              </PieChart>
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', pointerEvents:'none' }}>
                <div style={{ fontWeight:900, fontSize:16, color:'var(--text)', letterSpacing:'-0.03em' }}>{summary?.employees?.c||'—'}</div>
                <div style={{ fontSize:8.5, color:'var(--text-muted)', fontWeight:600 }}>TOTAL</div>
              </div>
            </div>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { l:'Active',      v:summary?.employees?.active||0,                                                          c:'#10B981' },
                { l:'Inactive',    v:(summary?.employees?.c||0)-(summary?.employees?.active||0),                             c:'#9CA3AF' },
                { l:'On Leave',    v:summary?.pending_leaves||0,                                                             c:'#F59E0B' },
              ].map(s=>(
                <div key={s.l} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:7, height:7, borderRadius:2, background:s.c }}/>
                    <span style={{ fontSize:11.5, color:'var(--text-sub)', fontWeight:500 }}>{s.l}</span>
                  </div>
                  <span style={{ fontSize:13, fontWeight:800, color:s.c }}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Attendance today */}
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>Today's Attendance</div>
            {[
              { l:'Present',  v:summary?.attendance?.present||0,  c:'#10B981', icon:CheckCircle },
              { l:'Absent',   v:summary?.attendance?.absent||0,   c:'#EF4444', icon:UserMinus },
              { l:'Leaves',   v:summary?.pending_leaves||0,       c:'#F59E0B', icon:Calendar },
            ].map(s=>{
              const Icon=s.icon
              const total=(summary?.attendance?.present||0)+(summary?.attendance?.absent||0)
              return (
                <div key={s.l} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:9 }}>
                  <Icon size={13} color={s.c}/>
                  <span style={{ fontSize:12, color:'var(--text-sub)', flex:1 }}>{s.l}</span>
                  <span style={{ fontSize:13, fontWeight:800, color:s.c }}>{s.v}</span>
                  <div style={{ width:60 }}>
                    <MiniBar value={s.v} total={total||1} color={s.c}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── SIM DATA ─────────────────────────────────────────── */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'20px' }}>
        <SH title="SIM Card Inventory" sub="Fleet communication management" href="/dashboard/poc"/>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }} className="sim-kpi-grid">
          {[
            { l:'Total SIMs',    v:simStats?.total||'—',          c:'#7C3AED', bg:'#F5F3FF' },
            { l:'Assigned',      v:simStats?.assigned||'—',       c:'#F59E0B', bg:'#FFFBEB' },
            { l:'Available',     v:simStats?.available||'—',      c:'#10B981', bg:'#F0FDF4' },
            { l:'Monthly Cost',  v:fmtAED(simStats?.monthly_cost||0), c:'#2563EB', bg:'#EFF6FF' },
          ].map(s=>(
            <div key={s.l} style={{ textAlign:'center', padding:'14px 10px', borderRadius:12, background:s.bg, border:'1px solid var(--border)' }}>
              <div style={{ fontWeight:900, fontSize:18, color:s.c, letterSpacing:'-0.03em' }}>{s.v}</div>
              <div style={{ fontSize:10.5, color:'var(--text-muted)', fontWeight:600, marginTop:3 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Station breakdown */}
        {simByStation.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${simByStation.length},1fr)`, gap:12 }}>
            {simByStation.map(s=>{
              const col = SC[s.station_code]||'#F59E0B'
              const pct = s.total>0?Math.round(s.assigned/s.total*100):0
              return (
                <div key={s.station_code} style={{ padding:'16px', borderRadius:12, background:'var(--bg-alt)', border:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <div>
                      <div style={{ fontWeight:800, fontSize:14, color:col }}>{s.station_code}</div>
                      <div style={{ fontSize:10.5, color:'var(--text-muted)' }}>{s.assigned} assigned / {s.total} total</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:900, fontSize:20, color:col }}>{pct}%</div>
                      <div style={{ fontSize:10, color:'var(--text-muted)' }}>utilised</div>
                    </div>
                  </div>
                  {/* Radial-ish progress */}
                  <div style={{ height:8, background:'var(--border)', borderRadius:20, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${col},${col}cc)`, borderRadius:20, transition:'width 1.2s ease' }}/>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:10 }}>
                    {[
                      { l:'Available',   v:s.available||0,         c:'#10B981' },
                      { l:'Cost/mo',     v:fmtAED(s.monthly_cost||0), c:'#7C3AED' },
                    ].map(x=>(
                      <div key={x.l} style={{ fontSize:11, color:'var(--text-muted)' }}>
                        <span style={{ fontWeight:700, color:x.c }}>{x.v}</span> {x.l}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── QUICK ACTIONS ────────────────────────────────────── */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'20px' }}>
        <SH title="Quick Actions"/>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10 }} className="quick-actions-grid">
          {[
            { l:'Employees',   href:'/dashboard/hr/employees',    c:'#F59E0B', icon:Users },
            { l:'Payroll',     href:'/dashboard/finance/payroll', c:'#38BDF8', icon:Wallet },
            { l:'Expenses',    href:'/dashboard/finance/expenses',c:'#10B981', icon:Receipt },
            { l:'Performance', href:'/dashboard/performance',     c:'#A78BFA', icon:TrendingUp },
            { l:'Damage',      href:'/dashboard/damage',          c:'#EF4444', icon:AlertTriangle },
            { l:'Advances',    href:'/dashboard/advances',        c:'#F97316', icon:Zap },
          ].map(item=>{
            const Icon=item.icon
            return (
              <Link key={item.l} href={item.href} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'14px 8px', borderRadius:14, background:`${item.c}10`, border:`1px solid ${item.c}22`, textDecoration:'none', transition:'all 0.18s' }}
                onMouseEnter={e=>{e.currentTarget.style.background=`${item.c}20`;e.currentTarget.style.transform='translateY(-2px)'}}
                onMouseLeave={e=>{e.currentTarget.style.background=`${item.c}10`;e.currentTarget.style.transform='none'}}>
                <div style={{ width:40, height:40, borderRadius:12, background:`${item.c}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={18} color={item.c}/>
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:item.c, textAlign:'center' }}>{item.l}</span>
              </Link>
            )
          })}
        </div>
      </div>

    </div>
  )
}