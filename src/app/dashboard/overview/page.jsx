'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { analyticsApi } from '@/lib/api'
import { PieChart, Pie, Cell } from 'recharts'
import {
  Users, Package, Wallet, AlertTriangle,
  ChevronRight, TrendingUp, Smartphone,
  Receipt, Zap
} from 'lucide-react'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL
const SC  = { DDB1:'#F59E0B', DXE6:'#38BDF8' }
function hdr() { return { Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }
function fmt(n) { return Number(n||0).toLocaleString() }
function fmtAED(n) { return `AED ${fmt(n)}` }

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
  const [,             setChart]        = useState([])
  const [expenses,     setExpenses]     = useState([])
  const [simStats,     setSimStats]     = useState(null)
  const [simByStation, setSimByStation] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [isMobile,     setIsMobile]     = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const load = useCallback(async () => {
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

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

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

      {/* ── EXPENSES + SIM SIDE BY SIDE ──────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:16 }}>

        {/* Expenses This Month */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'20px' }}>
          <SH title="Expenses This Month" sub={`${fmtAED(totalExp)} total · ${pendingExp} pending`} href="/dashboard/finance/expenses"/>
          {/* Stat row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
            {[
              { l:'Total',    v:fmtAED(totalExp),    bg:'#F9FAFB', c:'var(--text)' },
              { l:'Approved', v:fmtAED(approvedExp), bg:'#F0FDF4', c:'#10B981' },
              { l:'Pending',  v:pendingExp,           bg:'#FFFBEB', c:'#F59E0B' },
            ].map(s=>(
              <div key={s.l} style={{ textAlign:'center', padding:'10px 6px', borderRadius:10, background:s.bg, border:'1px solid var(--border)' }}>
                <div style={{ fontWeight:800, fontSize:14, color:s.c, letterSpacing:'-0.02em' }}>{s.v}</div>
                <div style={{ fontSize:10.5, color:'var(--text-muted)', fontWeight:600, marginTop:2 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {byCat.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px', color:'var(--text-muted)', fontSize:12 }}>No expenses this month yet.</div>
          ) : (
            <div style={{ display:'flex', gap:16, alignItems:'center' }}>
              {/* Donut */}
              <div style={{ flexShrink:0 }}>
                <PieChart width={90} height={90}>
                  <Pie data={byCat} cx={40} cy={40} innerRadius={26} outerRadius={42} dataKey="value" strokeWidth={1.5} stroke="var(--card)">
                    {byCat.map((c,i)=><Cell key={i} fill={c.color}/>)}
                  </Pie>
                </PieChart>
              </div>
              {/* Legend */}
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:5, overflow:'hidden' }}>
                {byCat.slice(0,5).map(c=>(
                  <div key={c.name} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:c.color, flexShrink:0 }}/>
                    <span style={{ fontSize:11, color:'var(--text-muted)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:'var(--text)', flexShrink:0 }}>AED {fmt(c.value)}</span>
                  </div>
                ))}
                {byCat.length > 5 && (
                  <div style={{ fontSize:10.5, color:'var(--text-muted)' }}>+{byCat.length - 5} more categories</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SIM Card Inventory */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'20px' }}>
          <SH title="SIM Card Inventory" sub="Fleet communication management" href="/dashboard/poc"/>
          {/* Stat row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:16 }}>
            {[
              { l:'Total SIMs',   v:simStats?.total||'—',              c:'#7C3AED', bg:'#F5F3FF' },
              { l:'Assigned',     v:simStats?.assigned||'—',           c:'#F59E0B', bg:'#FFFBEB' },
              { l:'Available',    v:simStats?.available||'—',          c:'#10B981', bg:'#F0FDF4' },
              { l:'Monthly Cost', v:fmtAED(simStats?.monthly_cost||0), c:'#2563EB', bg:'#EFF6FF' },
            ].map(s=>(
              <div key={s.l} style={{ textAlign:'center', padding:'10px 6px', borderRadius:10, background:s.bg, border:'1px solid var(--border)' }}>
                <div style={{ fontWeight:900, fontSize:16, color:s.c, letterSpacing:'-0.03em' }}>{s.v}</div>
                <div style={{ fontSize:10.5, color:'var(--text-muted)', fontWeight:600, marginTop:2 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Station breakdown */}
          {simByStation.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {simByStation.map(s=>{
                const col = SC[s.station_code]||'#F59E0B'
                const pct = s.total>0?Math.round(s.assigned/s.total*100):0
                return (
                  <div key={s.station_code} style={{ padding:'12px', borderRadius:12, background:'var(--bg-alt)', border:'1px solid var(--border)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:13, color:col }}>{s.station_code}</div>
                        <div style={{ fontSize:10.5, color:'var(--text-muted)' }}>{s.assigned} assigned / {s.total} total</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontWeight:900, fontSize:18, color:col }}>{pct}%</div>
                        <div style={{ fontSize:10, color:'var(--text-muted)' }}>utilised</div>
                      </div>
                    </div>
                    <div style={{ height:6, background:'var(--border)', borderRadius:20, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${col},${col}cc)`, borderRadius:20, transition:'width 1.2s ease' }}/>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:8 }}>
                      {[
                        { l:'Available',   v:s.available||0,            c:'#10B981' },
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
