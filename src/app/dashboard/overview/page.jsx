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
/* ── Horizontal slider wrapper (mobile) ─────────────────────── */
function Slider({ children, cardWidth = 160, gap = 12 }) {
  return (
    <div style={{ display:'flex', gap, overflowX:'auto', scrollSnapType:'x mandatory', WebkitOverflowScrolling:'touch', scrollbarWidth:'none', paddingBottom:4, marginRight:-20, paddingRight:20 }}>
      <style>{`.slider-hide::-webkit-scrollbar{display:none}`}</style>
      {React.Children.map(children, child =>
        <div style={{ flexShrink:0, width:cardWidth, scrollSnapAlign:'start' }}>{child}</div>
      )}
    </div>
  )
}

export default function OverviewPage() {
  const [summary,      setSummary]      = useState(null)
  const [chart,        setChart]        = useState([])
  const [expenses,     setExpenses]     = useState([])
  const [simStats,     setSimStats]     = useState(null)
  const [simByStation, setSimByStation] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [userRole,     setUserRole]     = useState(null)
  const [isMobile,     setIsMobile]     = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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

  // Costwise expense summary (pivot: rows=categories, cols=stations)
  const stations = [...new Set(expenses.map(e=>e.emp_station).filter(Boolean))].sort()
  const costRows = ECATS.map(cat => {
    const stationVals = {}
    stations.forEach(st => {
      stationVals[st] = expenses.filter(e=>e.category===cat.v && e.emp_station===st).reduce((s,e)=>s+Number(e.amount||0),0)
    })
    const rowTotal = Object.values(stationVals).reduce((s,v)=>s+v,0)
    return { name:cat.v, color:cat.c, stationVals, rowTotal }
  }).filter(r=>r.rowTotal>0)
  const colTotals = {}
  stations.forEach(st => { colTotals[st] = costRows.reduce((s,r)=>s+(r.stationVals[st]||0),0) })
  const grandTotal = costRows.reduce((s,r)=>s+r.rowTotal,0)

  // Project-wise delivery data — DDB1 = Pulser, DXE6 = CRET
  const projectData = delivData.map(m => ({
    month: m.month,
    Pulser: m.DDB1 || 0,
    CRET:   m.DXE6 || 0,
    Total:  (m.DDB1||0) + (m.DXE6||0),
  }))


  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* ── COSTWISE EXPENSE SUMMARY ─────────────────────────── */}
      {costRows.length > 0 && (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'20px' }}>
          <SH title="Costwise Expense Summary" sub="Expenses by category and station" href="/dashboard/finance/expenses"/>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'var(--bg-alt)' }}>
                  <th style={{ textAlign:'left', padding:'8px 12px', fontWeight:700, color:'var(--text)', borderBottom:'1px solid var(--border)', position:'sticky', left:0, background:'var(--bg-alt)', whiteSpace:'nowrap', minWidth:160 }}>Category</th>
                  {stations.map(st=>(
                    <th key={st} style={{ textAlign:'right', padding:'8px 12px', fontWeight:700, color:'var(--text-sub)', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>{st}</th>
                  ))}
                  <th style={{ textAlign:'right', padding:'8px 12px', fontWeight:700, color:'var(--text)', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {costRows.map((row,i)=>(
                  <tr key={row.name} style={{ background: i%2===0?'transparent':'var(--bg-alt)' }}>
                    <td style={{ padding:'7px 12px', color:'var(--text)', fontWeight:600, borderBottom:'1px solid var(--border)', position:'sticky', left:0, background: i%2===0?'var(--card)':'var(--bg-alt)', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:row.color, flexShrink:0 }}/>
                        {row.name}
                      </div>
                    </td>
                    {stations.map(st=>(
                      <td key={st} style={{ padding:'7px 12px', textAlign:'right', color: row.stationVals[st]>0?'var(--text)':'var(--text-muted)', borderBottom:'1px solid var(--border)', fontWeight: row.stationVals[st]>0?600:400 }}>
                        {row.stationVals[st]>0 ? `AED ${fmt(row.stationVals[st])}` : '—'}
                      </td>
                    ))}
                    <td style={{ padding:'7px 12px', textAlign:'right', fontWeight:700, color:'#10B981', borderBottom:'1px solid var(--border)' }}>AED {fmt(row.rowTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background:'var(--bg-alt)', borderTop:'2px solid var(--border)' }}>
                  <td style={{ padding:'8px 12px', fontWeight:800, color:'var(--text)', position:'sticky', left:0, background:'var(--bg-alt)' }}>Total</td>
                  {stations.map(st=>(
                    <td key={st} style={{ padding:'8px 12px', textAlign:'right', fontWeight:700, color:'var(--text)' }}>AED {fmt(colTotals[st]||0)}</td>
                  ))}
                  <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:800, color:'#10B981' }}>AED {fmt(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── LAST 6 MONTHS — PROJECT-WISE — Coming Soon ────────── */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'20px' }}>
        <SH title="Last 6 Months — Project Deliveries" sub="DDB1 (Pulser) vs DXE6 (CRET)"/>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px', textAlign:'center' }}>
          <div style={{ width:52, height:52, borderRadius:16, background:'linear-gradient(135deg,#FDF6E3,#FEF3D0)', border:'1px solid #F0D78C', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
            <Package size={22} color="#B8860B"/>
          </div>
          <div style={{ fontWeight:800, fontSize:16, color:'var(--text)', marginBottom:6 }}>Coming Soon</div>
          <div style={{ fontSize:12.5, color:'var(--text-muted)', lineHeight:1.6 }}>Delivery tracking is being set up.<br/>Check back soon.</div>
        </div>
      </div>

      {/* ── TOP KPIs ─────────────────────────────────────────── */}
      {isMobile ? (
        <Slider cardWidth={155}>
          <KPI icon={Users}      label="Active DAs"          color="#F59E0B" loading={loading} value={summary?.employees?.active||'—'} sub={`${summary?.employees?.c||0} total staff`}/>
          <KPI icon={Package}    label="Total Deliveries"    color="#38BDF8" loading={false}   value="—" sub="Coming soon"/>
          <KPI icon={Receipt}    label="Expenses This Month" color="#10B981" loading={loading} value={fmtAED(totalExp)} sub={`${pendingExp} pending`}/>
          <KPI icon={Smartphone} label="SIM Cards"           color="#A78BFA" loading={loading} value={simStats?.total||'—'} sub={`${simStats?.assigned||0} assigned`}/>
        </Slider>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          <KPI icon={Users}      label="Active DAs"          color="#F59E0B" loading={loading} value={summary?.employees?.active||'—'} sub={`${summary?.employees?.c||0} total staff`}/>
          <KPI icon={Package}    label="Total Deliveries"    color="#38BDF8" loading={false}   value="—" sub="Coming soon"/>
          <KPI icon={Receipt}    label="Expenses This Month" color="#10B981" loading={loading} value={fmtAED(totalExp)} sub={`${pendingExp} pending`}/>
          <KPI icon={Smartphone} label="SIM Cards"           color="#A78BFA" loading={loading} value={simStats?.total||'—'} sub={`${simStats?.assigned||0} assigned`}/>
        </div>
      )}

      {/* ── SIM DATA ─────────────────────────────────────────── */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'20px' }}>
        <SH title="SIM Card Inventory" sub="Fleet communication management" href="/dashboard/poc"/>
        {isMobile ? (
          <Slider cardWidth={130} gap={10}>
            {[
              { l:'Total SIMs',   v:simStats?.total||'—',               c:'#7C3AED', bg:'#F5F3FF' },
              { l:'Assigned',     v:simStats?.assigned||'—',            c:'#F59E0B', bg:'#FFFBEB' },
              { l:'Available',    v:simStats?.available||'—',           c:'#10B981', bg:'#F0FDF4' },
              { l:'Monthly Cost', v:fmtAED(simStats?.monthly_cost||0),  c:'#2563EB', bg:'#EFF6FF' },
            ].map(s=>(
              <div key={s.l} style={{ textAlign:'center', padding:'14px 10px', borderRadius:12, background:s.bg, border:'1px solid var(--border)', height:'100%' }}>
                <div style={{ fontWeight:900, fontSize:18, color:s.c, letterSpacing:'-0.03em' }}>{s.v}</div>
                <div style={{ fontSize:10.5, color:'var(--text-muted)', fontWeight:600, marginTop:3 }}>{s.l}</div>
              </div>
            ))}
          </Slider>
        ) : null}
        <div style={{ display:isMobile?'none':'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
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
        {(() => {
          const actions = [
            { l:'Employees',   href:'/dashboard/hr/employees',    c:'#F59E0B', icon:Users },
            { l:'Payroll',     href:'/dashboard/finance/payroll', c:'#38BDF8', icon:Wallet },
            { l:'Expenses',    href:'/dashboard/finance/expenses',c:'#10B981', icon:Receipt },
            { l:'Performance', href:'/dashboard/performance',     c:'#A78BFA', icon:TrendingUp },
            { l:'Damage',      href:'/dashboard/damage',          c:'#EF4444', icon:AlertTriangle },
            { l:'Advances',    href:'/dashboard/advances',        c:'#F97316', icon:Zap },
          ]
          const card = item => {
            const Icon = item.icon
            return (
              <Link key={item.l} href={item.href} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'14px 8px', borderRadius:14, background:`${item.c}10`, border:`1px solid ${item.c}22`, textDecoration:'none', transition:'all 0.18s', height:'100%' }}
                onMouseEnter={e=>{e.currentTarget.style.background=`${item.c}20`;e.currentTarget.style.transform='translateY(-2px)'}}
                onMouseLeave={e=>{e.currentTarget.style.background=`${item.c}10`;e.currentTarget.style.transform='none'}}>
                <div style={{ width:40, height:40, borderRadius:12, background:`${item.c}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={18} color={item.c}/>
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:item.c, textAlign:'center' }}>{item.l}</span>
              </Link>
            )
          }
          return isMobile ? (
            <Slider cardWidth={100} gap={10}>{actions.map(card)}</Slider>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10 }}>
              {actions.map(card)}
            </div>
          )
        })()}
      </div>

    </div>
  )
}