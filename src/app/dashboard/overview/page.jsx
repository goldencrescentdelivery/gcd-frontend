'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import {
  Users, Wallet, AlertTriangle,
  ChevronRight, TrendingUp, Smartphone,
  Receipt, Zap, ScrollText
} from 'lucide-react'
import Link from 'next/link'

import { API } from '@/lib/api'
const SC  = { DDB1:'#F59E0B', DXE6:'#38BDF8' }
function hdr() { return { Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }
// Explicit locale prevents Node.js server locale (often C/POSIX) from
// formatting numbers differently than the browser, causing SSR text mismatches.
function fmt(n) { return Number(n||0).toLocaleString('en-US') }
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
      onMouseLeave={e=>{e.currentTarget.style.boxShadow='var(--shadow)';e.currentTarget.style.transform='none'}}>
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
    <div className="slider-track" style={{ display:'flex', gap, overflowX:'auto', scrollSnapType:'x mandatory', WebkitOverflowScrolling:'touch', scrollbarWidth:'none', paddingBottom:4, marginRight:-20, paddingRight:20 }}>
      {React.Children.map(children, child =>
        <div style={{ flexShrink:0, width:cardWidth, scrollSnapAlign:'start' }}>{child}</div>
      )}
    </div>
  )
}

export default function OverviewPage() {
  const { user } = useAuth()
  const router   = useRouter()

  useEffect(() => {
    if (user && user.role === 'poc') router.replace('/dashboard/poc')
  }, [user, router])

  const [summary,        setSummary]        = useState(null)
  const [chart,          setChart]          = useState([])
  const [expenses,       setExpenses]       = useState([])
  const [simStats,       setSimStats]       = useState(null)
  const [simByStation,   setSimByStation]   = useState([])
  const [pendingLetters, setPendingLetters] = useState([])
  const [loading,        setLoading]        = useState(true)
  const [isMobile,       setIsMobile]       = useState(false)
  const [mounted,        setMounted]        = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const month = new Date().toISOString().slice(0,7)
    try {
      // Promise.allSettled lets individual endpoint failures be handled
      // gracefully — a single slow or down API won't blank the whole page.
      const [sumRes, chartRes, expRes, simRes, letRes] = await Promise.allSettled([
        fetch(`${API}/api/analytics/summary`,                     {headers:hdr()}).then(r=>r.json()),
        fetch(`${API}/api/analytics/deliveries-chart?months=6`,   {headers:hdr()}).then(r=>r.json()),
        fetch(`${API}/api/expenses?month=${month}`,               {headers:hdr()}).then(r=>r.json()),
        fetch(`${API}/api/sims/stats`,                            {headers:hdr()}).then(r=>r.json()),
        fetch(`${API}/api/letters`,                               {headers:hdr()}).then(r=>r.json()),
      ])
      const sumData   = sumRes.status   === 'fulfilled' ? sumRes.value   : {}
      const chartData = chartRes.status === 'fulfilled' ? chartRes.value : {}
      const expData   = expRes.status   === 'fulfilled' ? expRes.value   : {}
      const simData   = simRes.status   === 'fulfilled' ? simRes.value   : {}
      const letData   = letRes.status   === 'fulfilled' ? letRes.value   : {}
      setSummary(sumData)
      setChart(chartData.chart || [])
      setExpenses(expData.expenses || [])
      setSimStats(simData.stats || null)
      setSimByStation(simData.by_station || [])
      setPendingLetters((letData.letters || []).filter(l => l.status === 'pending'))
    } catch(e) { console.error(e) } finally { setLoading(false) }
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

      {/* ── PENDING LETTERS ALERT ────────────────────────────── */}
      {pendingLetters.length > 0 && (
        <Link href="/dashboard/office/letters" style={{ textDecoration:'none' }}>
          <div style={{ background:'linear-gradient(135deg,#FFFBEB,#FEF3C7)', border:'2px solid #FDE68A', borderRadius:14, padding:'14px 18px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', transition:'box-shadow 0.2s' }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 20px rgba(180,130,0,0.18)'}
            onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
            <div style={{ width:44, height:44, borderRadius:12, background:'#FDE68A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <ScrollText size={20} color="#92400E"/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:14, color:'#92400E', display:'flex', alignItems:'center', gap:8 }}>
                {pendingLetters.length} Letter{pendingLetters.length > 1 ? 's' : ''} Awaiting Your Approval
                <span style={{ fontSize:10.5, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#F59E0B', color:'white' }}>ACTION REQUIRED</span>
              </div>
              <div style={{ fontSize:12, color:'#B45309', marginTop:3 }}>
                {pendingLetters.map(l => l.ref_no).join(' · ')}
                {' — submitted by '}
                {[...new Set(pendingLetters.map(l => l.created_by_name).filter(Boolean))].join(', ')}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:700, color:'#92400E', flexShrink:0 }}>
              Review <ChevronRight size={14}/>
            </div>
          </div>
        </Link>
      )}

      {/* ── LAST 6 MONTHS — PROJECT-WISE DELIVERIES ──────────── */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'20px' }}>
        <SH title="Last 6 Months — Project Deliveries" sub="DDB1 (Pulser) vs DXE6 (CRET)"/>
        {!mounted || chart.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px', textAlign:'center' }}>
            <div style={{ width:52, height:52, borderRadius:16, background:'var(--amber-bg)', border:'1px solid var(--gold-border)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
              <Package size={22} color="var(--gold)"/>
            </div>
            <div style={{ fontWeight:800, fontSize:16, color:'var(--text)', marginBottom:6 }}>No data yet</div>
            <div style={{ fontSize:12.5, color:'var(--text-muted)', lineHeight:1.6 }}>Delivery records will appear here once logged.</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chart} barSize={18} barGap={4}>
              <XAxis dataKey="month" tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} width={36}/>
              <Tooltip
                contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, fontSize:12 }}
                labelStyle={{ fontWeight:700, color:'var(--text)' }}
                formatter={(v, name) => [Number(v).toLocaleString('en-US'), name]}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12 }}/>
              <Bar dataKey="DDB1" name="DDB1 (Pulser)" fill="#F59E0B" radius={[4,4,0,0]}/>
              <Bar dataKey="DXE6" name="DXE6 (CRET)"   fill="#38BDF8" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── TOP KPIs ─────────────────────────────────────────── */}
      <KPI icon={Users} label="Active DAs" color="#F59E0B" loading={loading} value={summary?.employees?.active||'—'} sub={`${summary?.employees?.c||0} total staff`}/>

      {/* ── EXPENSES + SIM SIDE BY SIDE ──────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:16 }}>

        {/* Expenses This Month */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'20px' }}>
          <SH title="Expenses This Month" sub={`${fmtAED(totalExp)} total · ${pendingExp} pending`} href="/dashboard/finance/expenses"/>
          {/* Stat row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
            {[
              { l:'Total',    v:fmtAED(totalExp),    bg:'var(--bg-alt)',   c:'var(--text)' },
              { l:'Approved', v:fmtAED(approvedExp), bg:'var(--green-bg)', c:'var(--green)' },
              { l:'Pending',  v:pendingExp,           bg:'var(--amber-bg)', c:'var(--amber)' },
            ].map(s=>(
              <div key={s.l} style={{ textAlign:'center', padding:'10px 6px', borderRadius:10, background:s.bg, border:'1px solid var(--border)' }}>
                <div style={{ fontWeight:800, fontSize:14, color:s.c, letterSpacing:'-0.02em' }}>{s.v}</div>
                <div style={{ fontSize:10.5, color:'var(--text-muted)', fontWeight:600, marginTop:2 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {!mounted || byCat.length === 0 ? (
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
              { l:'Total SIMs',   v:simStats?.total||'—',              c:'var(--purple)', bg:'var(--purple-bg)' },
              { l:'Assigned',     v:simStats?.assigned||'—',           c:'var(--amber)',  bg:'var(--amber-bg)'  },
              { l:'Available',    v:simStats?.available||'—',          c:'var(--green)',  bg:'var(--green-bg)'  },
              { l:'Monthly Cost', v:fmtAED(simStats?.monthly_cost||0), c:'var(--blue)',   bg:'var(--blue-bg)'   },
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
