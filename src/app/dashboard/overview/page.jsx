'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  Users, Package, Car, Wallet, AlertTriangle,
  ChevronRight, Smartphone,
  Receipt, ScrollText, Activity
} from 'lucide-react'
import Link from 'next/link'
import { API } from '@/lib/api'

function hdr() { return { Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }
function fmt(n) { return Number(n||0).toLocaleString('en-US') }
function fmtAED(n) { return `AED ${fmt(n)}` }

function Skel({ w = '100%', h = 16, r = 6 }) {
  return <span className="sk" style={{ display:'block', width:w, height:h, borderRadius:r }}/>
}

const ECATS = [
  {v:'Parking',c:'#F59E0B'},{v:'Advances',c:'#10B981'},{v:'Air Tickets',c:'#3B82F6'},
  {v:'ENOC',c:'#EF4444'},{v:'Health Insurance',c:'#8B5CF6'},{v:'Idfy',c:'#EC4899'},
  {v:'Mobile Expenses',c:'#06B6D4'},{v:'Office Expenses',c:'#84CC16'},{v:'Petty Cash',c:'#F97316'},
  {v:'RTA Top-up',c:'#0EA5E9'},{v:'Vehicle Expenses',c:'#6366F1'},{v:'Vehicle Rent',c:'#7C3AED'},
  {v:'Visa Expenses',c:'#D97706'},{v:'Miscellaneous Expenses',c:'#94A3B8'},
]

export default function OverviewPage() {
  const { user } = useAuth()
  const router   = useAuth ? useRouter() : null

  useEffect(() => {
    if (user && user.role === 'poc') router?.replace('/dashboard/poc')
  }, [user, router])

  const [summary,        setSummary]        = useState(null)
  const [chart,          setChart]          = useState([])
  const [expenses,       setExpenses]       = useState([])
  const [simStats,       setSimStats]       = useState(null)
  const [simByStation,   setSimByStation]   = useState([])
  const [fleetStats,     setFleetStats]     = useState(null)
  const [pendingLetters, setPendingLetters] = useState([])
  const [loading,        setLoading]        = useState(true)
  const [mounted,        setMounted]        = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const month = new Date().toISOString().slice(0,7)
    try {
      const [sumRes, chartRes, expRes, simRes, letRes, fleetRes] = await Promise.allSettled([
        fetch(`${API}/api/analytics/summary`,                   {headers:hdr()}).then(r=>r.json()),
        fetch(`${API}/api/analytics/deliveries-chart?months=6`, {headers:hdr()}).then(r=>r.json()),
        fetch(`${API}/api/expenses?month=${month}`,             {headers:hdr()}).then(r=>r.json()),
        fetch(`${API}/api/sims/stats`,                          {headers:hdr()}).then(r=>r.json()),
        fetch(`${API}/api/letters?status=pending&limit=5`,      {headers:hdr()}).then(r=>r.json()),
        fetch(`${API}/api/vehicles/stats`,                      {headers:hdr()}).then(r=>r.json()),
      ])
      const sumData   = sumRes.status   === 'fulfilled' ? sumRes.value   : {}
      const chartData = chartRes.status === 'fulfilled' ? chartRes.value : {}
      const expData   = expRes.status   === 'fulfilled' ? expRes.value   : {}
      const simData   = simRes.status   === 'fulfilled' ? simRes.value   : {}
      const letData   = letRes.status   === 'fulfilled' ? letRes.value   : {}
      const fleetData = fleetRes.status === 'fulfilled' ? fleetRes.value : {}

      setSummary(sumData)
      setChart(chartData.chart || [])
      setExpenses(expData.expenses || [])
      setSimStats(simData.stats || null)
      setSimByStation(simData.by_station || [])
      setPendingLetters(letData.letters || [])

      const vs = fleetData.stats || {}
      setFleetStats({
        total:       parseInt(vs.total       || 0),
        active:      parseInt(vs.active      || 0),
        grounded:    parseInt(vs.grounded    || 0),
        maintenance: parseInt(vs.maintenance || 0),
      })
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const totalExp    = expenses.reduce((s,e) => s + Number(e.amount||0), 0)
  const pendingExp  = expenses.filter(e => e.status === 'pending').length
  const approvedExp = expenses.filter(e => e.status === 'approved').reduce((s,e) => s + Number(e.amount||0), 0)
  const rejectedExp = expenses.filter(e => e.status === 'rejected').length

  const byCat = ECATS.map(cat => ({
    name:  cat.v,
    value: expenses.filter(e => e.category === cat.v).reduce((s,e) => s + Number(e.amount||0), 0),
    color: cat.c,
  })).filter(c => c.value > 0).sort((a,b) => b.value - a.value)

  const totalEmp    = summary?.employees?.c        || 0
  const activeEmp   = summary?.employees?.active   || 0
  const onLeaveEmp  = summary?.employees?.on_leave || 0
  const inactiveEmp = Math.max(0, totalEmp - activeEmp - onLeaveEmp)

  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name?.split(' ')[0] || ''
  const dateStr   = new Date().toLocaleDateString('en-AE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

  return (
    <>
      <style>{`
        /* ── Overview page specific ──────────────────────────── */
        .ov-page  { display:flex; flex-direction:column; gap:20px; animation:slideUp 0.35s ease; }

        /* Hero */
        .ov-hero  { background:linear-gradient(135deg,#1a1200 0%,#3d2a00 55%,#B8860B 100%); border-radius:20px; padding:28px 32px; position:relative; overflow:hidden; }
        .ov-hero-row { display:flex; align-items:flex-start; gap:12px; }
        .ov-hero-title { font-weight:900; font-size:21px; color:#fff; margin:0; letter-spacing:-0.03em; }
        .ov-hero-sub   { font-size:12px; color:rgba(255,255,255,0.5); margin:3px 0 0; }

        /* Hero KPI strip */
        .ov-kpi-strip { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:rgba(255,255,255,0.13); border-radius:14px; overflow:hidden; margin-top:22px; }
        .ov-kpi       { background:rgba(0,0,0,0.18); padding:16px 20px; transition:background 0.15s; }
        .ov-kpi:hover { background:rgba(255,255,255,0.07); }
        .ov-kpi-val   { font-size:26px; font-weight:900; letter-spacing:-0.05em; line-height:1; }
        .ov-kpi-lbl   { font-size:11px; color:rgba(255,255,255,0.55); font-weight:600; margin-top:4px; }
        .ov-kpi-hint  { font-size:10px; color:rgba(255,255,255,0.35); margin-top:2px; }

        /* Section card */
        .ov-card { background:var(--card); border:1px solid var(--border); border-radius:16px; overflow:hidden; }
        .ov-card-hd { padding:18px 20px; display:flex; align-items:flex-end; justify-content:space-between; gap:8px; border-bottom:1px solid var(--border); }
        .ov-card-title { font-weight:800; font-size:14px; color:var(--text); letter-spacing:-0.02em; margin:0; }
        .ov-card-sub   { font-size:11.5px; color:var(--text-muted); margin-top:3px; }
        .ov-viewall    { font-size:12px; font-weight:600; color:var(--gold); display:flex; align-items:center; gap:3px; white-space:nowrap; flex-shrink:0; }

        /* 2-col grid */
        .ov-two { display:grid; grid-template-columns:1fr 1fr; gap:16px; }

        /* Stat 2×2 inside cards */
        .ov-stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:16px 20px; }
        .ov-stat  { border-radius:11px; padding:13px 14px; border:1px solid; }
        .ov-stat-val { font-weight:800; font-size:22px; letter-spacing:-0.05em; line-height:1; }
        .ov-stat-lbl { font-size:10.5px; font-weight:600; margin-top:3px; opacity:0.72; }

        /* Footer progress strip */
        .ov-strip { margin:0 20px 20px; padding:12px 16px; border-radius:12px; background:var(--bg-alt); border:1px solid var(--border); display:flex; align-items:center; gap:12px; }
        .ov-progress { flex:1; }
        .ov-progress-head { display:flex; justify-content:space-between; align-items:baseline; }
        .ov-progress-name { font-size:12px; font-weight:700; color:var(--text); }
        .ov-progress-pct  { font-size:14px; font-weight:900; letter-spacing:-0.03em; }
        .ov-progress-sub  { font-size:11px; color:var(--text-muted); margin-top:1px; }
        .ov-bar  { height:5px; border-radius:3px; background:var(--border); overflow:hidden; margin-top:7px; }
        .ov-fill { height:100%; border-radius:3px; transition:width 1s ease; }

        /* Expense category list */
        .ov-cat { padding:0 20px 20px; display:flex; gap:16px; align-items:flex-start; }
        .ov-cat-rows { flex:1; display:flex; flex-direction:column; gap:8px; }
        .ov-cat-row  { display:flex; align-items:center; gap:8px; }
        .ov-cat-name { font-size:11.5px; color:var(--text-sub); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .ov-cat-amt  { font-size:11.5px; font-weight:700; color:var(--text); flex-shrink:0; }

        /* SIM station blocks */
        .ov-station { margin:0 20px; border-radius:12px; background:var(--bg-alt); border:1px solid var(--border); padding:14px 16px; margin-bottom:10px; }
        .ov-station:last-child { margin-bottom:20px; }

        /* Quick actions */
        .ov-qa-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:10px; padding:16px 20px 20px; }
        .ov-qa-item { display:flex; flex-direction:column; align-items:center; gap:9px; padding:16px 8px; border-radius:14px; text-decoration:none; transition:all 0.18s; }

        /* Alert banner */
        .ov-alert { display:flex; align-items:center; gap:14px; padding:14px 18px; border-radius:14px; border:2px solid #FDE68A; background:linear-gradient(135deg,#FFFBEB,#FEF3C7); text-decoration:none; transition:box-shadow 0.2s; cursor:pointer; }
        .ov-alert:hover { box-shadow:0 4px 20px rgba(180,130,0,0.18); }

        /* Chart wrapper */
        .ov-chart { padding:4px 20px 20px; }

        /* Responsive */
        @media (max-width:1024px) {
          .ov-kpi-strip  { grid-template-columns:repeat(2,1fr); }
          .ov-qa-grid    { grid-template-columns:repeat(4,1fr); }
        }
        @media (max-width:768px) {
          .ov-hero       { padding:20px 18px; border-radius:16px; }
          .ov-two        { grid-template-columns:1fr; }
          .ov-kpi-strip  { grid-template-columns:repeat(2,1fr); margin-top:18px; }
          .ov-kpi-val    { font-size:22px; }
          .ov-kpi        { padding:13px 16px; }
          .ov-qa-grid    { grid-template-columns:repeat(3,1fr); }
        }
        @media (max-width:480px) {
          .ov-hero       { padding:18px 14px; }
          .ov-hero-title { font-size:17px; }
          .ov-kpi-val    { font-size:20px; }
          .ov-kpi        { padding:12px 14px; }
          .ov-stats      { gap:7px; padding:12px 14px; }
          .ov-strip      { margin:0 14px 14px; padding:10px 12px; }
          .ov-cat        { padding:0 14px 14px; }
          .ov-station    { margin:0 14px; }
          .ov-station:last-child { margin-bottom:14px; }
          .ov-card-hd    { padding:14px 14px; }
          .ov-qa-grid    { grid-template-columns:repeat(3,1fr); gap:8px; padding:12px 14px 14px; }
          .ov-qa-item    { padding:12px 6px; }
          .ov-chart      { padding:4px 14px 14px; }
        }
      `}</style>

      <div className="ov-page">

        {/* ══ HERO ══════════════════════════════════════════════════ */}
        <div className="ov-hero">
          {/* Decorative circles */}
          <div style={{ position:'absolute', top:-50, right:-50, width:220, height:220, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }}/>
          <div style={{ position:'absolute', bottom:-30, right:90, width:130, height:130, borderRadius:'50%', background:'rgba(255,255,255,0.03)', pointerEvents:'none' }}/>

          <div style={{ position:'relative' }}>
            <div className="ov-hero-row">
              <div style={{ width:42, height:42, borderRadius:13, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                <Activity size={20} color="#FFD700"/>
              </div>
              <div>
                <h1 className="ov-hero-title">{greeting}{firstName ? `, ${firstName}` : ''}</h1>
                <p className="ov-hero-sub">{dateStr} · Operations Overview</p>
              </div>
            </div>

            {/* KPI strip */}
            <div className="ov-kpi-strip">
              {[
                {
                  val:   loading ? '…' : activeEmp,
                  lbl:   'Active DAs',
                  hint:  `of ${totalEmp} total`,
                  color: '#34D399',
                },
                {
                  val:   loading ? '…' : (fleetStats?.active ?? 0),
                  lbl:   'Vehicles on Road',
                  hint:  `of ${fleetStats?.total ?? 0} fleet`,
                  color: '#38BDF8',
                },
                {
                  val:   loading ? '…' : fmtAED(totalExp),
                  lbl:   'Expenses This Month',
                  hint:  `${pendingExp} pending approval`,
                  color: '#FCD34D',
                  small: true,
                },
                {
                  val:   loading ? '…' : pendingLetters.length,
                  lbl:   'Letters Pending',
                  hint:  'awaiting signature',
                  color: pendingLetters.length > 0 ? '#FCA5A5' : '#6EE7B7',
                },
              ].map(({ val, lbl, hint, color, small }) => (
                <div key={lbl} className="ov-kpi">
                  <div className="ov-kpi-val" style={{ color: loading ? 'rgba(255,255,255,0.25)' : color, fontSize: small ? 18 : undefined }}>{val}</div>
                  <div className="ov-kpi-lbl">{lbl}</div>
                  <div className="ov-kpi-hint">{hint}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ PENDING LETTERS ALERT ══════════════════════════════════ */}
        {pendingLetters.length > 0 && (
          <Link href="/dashboard/office/letters" className="ov-alert">
            <div style={{ width:44, height:44, borderRadius:12, background:'#FDE68A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <ScrollText size={20} color="#92400E"/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:800, fontSize:14, color:'#92400E', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                {pendingLetters.length} Letter{pendingLetters.length > 1 ? 's' : ''} Awaiting Approval
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#F59E0B', color:'#fff', whiteSpace:'nowrap' }}>ACTION REQUIRED</span>
              </div>
              <div style={{ fontSize:12, color:'#B45309', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {pendingLetters.map(l => l.ref_no).join(' · ')}
                {' — '}{[...new Set(pendingLetters.map(l => l.created_by_name).filter(Boolean))].join(', ')}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:3, fontSize:12, fontWeight:700, color:'#92400E', flexShrink:0 }}>
              Review <ChevronRight size={14}/>
            </div>
          </Link>
        )}

        {/* ══ DELIVERY CHART ════════════════════════════════════════ */}
        <div className="ov-card" style={{ overflow:'hidden' }}>
          {/* Header */}
          <div style={{ padding:'20px 24px 0', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
            <div>
              <div className="ov-card-title">Delivery Trend — Last 6 Months</div>
              <div className="ov-card-sub">Project-wise comparison · DDB1 vs DXE6</div>
            </div>
            <div style={{ display:'flex', gap:8, flexShrink:0 }}>
              {[{c:'#F59E0B', label:'DDB1 (Pulser)'}, {c:'#38BDF8', label:'DXE6 (CRET)'}].map(({ c, label }) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 11px', borderRadius:20, background:`${c}12`, border:`1px solid ${c}30` }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:c }}/>
                  <span style={{ fontSize:11, color:c, fontWeight:700 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart area */}
          <div style={{ padding:'16px 12px 8px' }}>
            {!mounted || chart.length === 0 ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'40px 24px', textAlign:'center' }}>
                <div style={{ width:52, height:52, borderRadius:16, background:'var(--amber-bg)', border:'1px solid var(--gold-border)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                  <Package size={22} color="var(--gold)"/>
                </div>
                <div style={{ fontWeight:800, fontSize:15, color:'var(--text)', marginBottom:4 }}>No delivery data yet</div>
                <div style={{ fontSize:12.5, color:'var(--text-muted)' }}>Records will appear once deliveries are logged.</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chart} barSize={22} barCategoryGap="36%" margin={{ top:8, right:8, left:0, bottom:0 }}>
                  <defs>
                    <linearGradient id="gradDDB1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#F59E0B" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.55}/>
                    </linearGradient>
                    <linearGradient id="gradDXE6" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#38BDF8" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.55}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" strokeOpacity={0.7}/>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize:11, fill:'var(--text-muted)', fontWeight:600, fontFamily:'inherit' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => {
                      const [y, m] = v.split('-')
                      return new Date(+y, +m-1).toLocaleDateString('en-US', { month:'short' })
                    }}
                  />
                  <YAxis
                    tick={{ fontSize:11, fill:'var(--text-muted)', fontFamily:'inherit' }}
                    axisLine={false} tickLine={false} width={38}
                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                  />
                  <Tooltip
                    cursor={{ fill:'rgba(184,134,11,0.06)', rx:6 }}
                    contentStyle={{
                      background:'var(--card)',
                      border:'1px solid var(--border)',
                      borderRadius:12,
                      fontSize:12,
                      boxShadow:'0 8px 24px rgba(0,0,0,0.10)',
                      padding:'10px 14px',
                    }}
                    labelStyle={{ fontWeight:700, color:'var(--text)', marginBottom:6, fontSize:12 }}
                    labelFormatter={v => {
                      const [y, m] = v.split('-')
                      return new Date(+y, +m-1).toLocaleDateString('en-US', { month:'long', year:'numeric' })
                    }}
                    formatter={(val, name) => [Number(val).toLocaleString(), name]}
                  />
                  <Bar dataKey="DDB1" name="DDB1 (Pulser)" fill="url(#gradDDB1)" radius={[7,7,0,0]}/>
                  <Bar dataKey="DXE6" name="DXE6 (CRET)"   fill="url(#gradDXE6)" radius={[7,7,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Summary strip */}
          {chart.length > 0 && (() => {
            const totDDB1 = chart.reduce((s, r) => s + (r.DDB1||0), 0)
            const totDXE6 = chart.reduce((s, r) => s + (r.DXE6||0), 0)
            return (
              <div style={{ display:'flex', borderTop:'1px solid var(--border)', background:'var(--bg-alt)' }}>
                {[{ label:'Total DDB1', value:totDDB1.toLocaleString(), c:'#F59E0B' }, { label:'Total DXE6', value:totDXE6.toLocaleString(), c:'#38BDF8' }, { label:'Combined', value:(totDDB1+totDXE6).toLocaleString(), c:'var(--text)' }].map(({ label, value, c }) => (
                  <div key={label} style={{ flex:1, padding:'12px 20px', borderRight:'1px solid var(--border)', textAlign:'center' }}>
                    <div style={{ fontWeight:800, fontSize:16, color:c, letterSpacing:'-0.03em' }}>{value}</div>
                    <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:2, fontWeight:600 }}>{label}</div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>

        {/* ══ AGENTS + FLEET ════════════════════════════════════════ */}
        <div className="ov-two">

          {/* Delivery Agents */}
          <div className="ov-card">
            <div className="ov-card-hd">
              <div>
                <div className="ov-card-title">Delivery Agents</div>
                <div className="ov-card-sub">{loading ? '…' : totalEmp} total staff registered</div>
              </div>
              <Link href="/dashboard/hr/employees" className="ov-viewall">View all <ChevronRight size={12}/></Link>
            </div>
            <div className="ov-stats">
              {[
                { label:'Active',   value:activeEmp,   color:'#059669', bg:'#ECFDF5', border:'#A7F3D0' },
                { label:'On Leave', value:onLeaveEmp,  color:'#D97706', bg:'#FFFBEB', border:'#FCD34D' },
                { label:'Inactive', value:inactiveEmp, color:'#DC2626', bg:'#FEF2F2', border:'#FCA5A5' },
                { label:'Total',    value:totalEmp,    color:'#7C3AED', bg:'#F5F3FF', border:'#DDD6FE' },
              ].map(({ label, value, color, bg, border }) => (
                <div key={label} className="ov-stat" style={{ background:bg, borderColor:border }}>
                  {loading ? <Skel h={24}/> : <div className="ov-stat-val" style={{ color }}>{value}</div>}
                  <div className="ov-stat-lbl" style={{ color }}>{label}</div>
                </div>
              ))}
            </div>
            <div className="ov-strip">
              <div style={{ width:40, height:40, borderRadius:11, background:'#F59E0B18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Users size={18} color="#F59E0B"/>
              </div>
              <div className="ov-progress">
                <div className="ov-progress-head">
                  {loading
                    ? <Skel w={100} h={12}/>
                    : <span className="ov-progress-name">{activeEmp} active DAs across all stations</span>
                  }
                  {!loading && totalEmp > 0 && (
                    <span className="ov-progress-pct" style={{ color:'#F59E0B' }}>{Math.round(activeEmp/totalEmp*100)}%</span>
                  )}
                </div>
                <div className="ov-bar">
                  <div className="ov-fill" style={{ width:`${totalEmp > 0 ? (activeEmp/totalEmp)*100 : 0}%`, background:'linear-gradient(90deg,#F59E0B,#FCD34D)' }}/>
                </div>
              </div>
            </div>
          </div>

          {/* Fleet Vehicles */}
          <div className="ov-card">
            <div className="ov-card-hd">
              <div>
                <div className="ov-card-title">Fleet Vehicles</div>
                <div className="ov-card-sub">Active vehicle inventory status</div>
              </div>
              <Link href="/dashboard/poc/fleet" className="ov-viewall">View all <ChevronRight size={12}/></Link>
            </div>
            <div className="ov-stats">
              {[
                { label:'Active',      value:fleetStats?.active      ?? '—', color:'#059669', bg:'#ECFDF5', border:'#A7F3D0' },
                { label:'Grounded',    value:fleetStats?.grounded    ?? '—', color:'#DC2626', bg:'#FEF2F2', border:'#FCA5A5' },
                { label:'Maintenance', value:fleetStats?.maintenance ?? '—', color:'#D97706', bg:'#FFFBEB', border:'#FCD34D' },
                { label:'Total',       value:fleetStats?.total       ?? '—', color:'#7C3AED', bg:'#F5F3FF', border:'#DDD6FE' },
              ].map(({ label, value, color, bg, border }) => (
                <div key={label} className="ov-stat" style={{ background:bg, borderColor:border }}>
                  {loading ? <Skel h={24}/> : <div className="ov-stat-val" style={{ color }}>{value}</div>}
                  <div className="ov-stat-lbl" style={{ color }}>{label}</div>
                </div>
              ))}
            </div>
            <div className="ov-strip">
              <div style={{ width:40, height:40, borderRadius:11, background:'#38BDF818', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Car size={18} color="#38BDF8"/>
              </div>
              <div className="ov-progress">
                <div className="ov-progress-head">
                  {loading
                    ? <Skel w={100} h={12}/>
                    : <span className="ov-progress-name">{fleetStats?.active ?? 0} vehicles on road</span>
                  }
                  {!loading && fleetStats?.total > 0 && (
                    <span className="ov-progress-pct" style={{ color:'#38BDF8' }}>{Math.round((fleetStats?.active||0)/fleetStats.total*100)}%</span>
                  )}
                </div>
                <div className="ov-bar">
                  <div className="ov-fill" style={{ width:`${fleetStats?.total > 0 ? ((fleetStats?.active||0)/fleetStats.total)*100 : 0}%`, background:'linear-gradient(90deg,#38BDF8,#7DD3FC)' }}/>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ EXPENSES + SIM CARDS ══════════════════════════════════ */}
        <div className="ov-two">

          {/* Expenses */}
          <div className="ov-card">
            <div className="ov-card-hd">
              <div>
                <div className="ov-card-title">Expenses This Month</div>
                <div className="ov-card-sub">{loading ? '…' : `${fmtAED(totalExp)} total · ${pendingExp} pending`}</div>
              </div>
              <Link href="/dashboard/finance/expenses" className="ov-viewall">View all <ChevronRight size={12}/></Link>
            </div>
            <div className="ov-stats">
              {[
                { label:'Total',    value:fmtAED(totalExp),    color:'var(--text)',  bg:'var(--bg-alt)', border:'var(--border)', sm:true },
                { label:'Approved', value:fmtAED(approvedExp), color:'#059669',      bg:'#ECFDF5',       border:'#A7F3D0',       sm:true },
                { label:'Pending',  value:pendingExp,           color:'#D97706',      bg:'#FFFBEB',       border:'#FCD34D' },
                { label:'Rejected', value:rejectedExp,          color:'#DC2626',      bg:'#FEF2F2',       border:'#FCA5A5' },
              ].map(({ label, value, color, bg, border, sm }) => (
                <div key={label} className="ov-stat" style={{ background:bg, borderColor:border }}>
                  {loading ? <Skel h={24}/> : <div className="ov-stat-val" style={{ color, fontSize: sm ? 14 : undefined }}>{value}</div>}
                  <div className="ov-stat-lbl" style={{ color }}>{label}</div>
                </div>
              ))}
            </div>

            {mounted && byCat.length > 0 ? (
              <div className="ov-cat">
                <div style={{ flexShrink:0 }}>
                  <PieChart width={86} height={86}>
                    <Pie data={byCat} cx={40} cy={40} innerRadius={24} outerRadius={41} dataKey="value" strokeWidth={2} stroke="var(--card)">
                      {byCat.map((c,i) => <Cell key={i} fill={c.color}/>)}
                    </Pie>
                  </PieChart>
                </div>
                <div className="ov-cat-rows">
                  {byCat.slice(0,5).map(c => (
                    <div key={c.name} className="ov-cat-row">
                      <div style={{ width:8, height:8, borderRadius:2, background:c.color, flexShrink:0 }}/>
                      <span className="ov-cat-name">{c.name}</span>
                      <span className="ov-cat-amt">AED {fmt(c.value)}</span>
                    </div>
                  ))}
                  {byCat.length > 5 && (
                    <div style={{ fontSize:11, color:'var(--text-muted)', paddingLeft:16 }}>+{byCat.length-5} more categories</div>
                  )}
                </div>
              </div>
            ) : mounted ? (
              <div style={{ padding:'20px', textAlign:'center', color:'var(--text-muted)', fontSize:12 }}>No expenses logged this month.</div>
            ) : null}
          </div>

          {/* SIM Cards */}
          <div className="ov-card">
            <div className="ov-card-hd">
              <div>
                <div className="ov-card-title">SIM Card Inventory</div>
                <div className="ov-card-sub">Fleet communication management</div>
              </div>
              <Link href="/dashboard/poc/sims" className="ov-viewall">View all <ChevronRight size={12}/></Link>
            </div>
            <div className="ov-stats">
              {[
                { label:'Total SIMs',   value:simStats?.total     ?? '—',              color:'#7C3AED', bg:'#F5F3FF', border:'#DDD6FE' },
                { label:'Assigned',     value:simStats?.assigned  ?? '—',              color:'#D97706', bg:'#FFFBEB', border:'#FCD34D' },
                { label:'Available',    value:simStats?.available ?? '—',              color:'#059669', bg:'#ECFDF5', border:'#A7F3D0' },
                { label:'Monthly Cost', value:fmtAED(simStats?.monthly_cost||0),       color:'#2563EB', bg:'#EFF6FF', border:'#BFDBFE', sm:true },
              ].map(({ label, value, color, bg, border, sm }) => (
                <div key={label} className="ov-stat" style={{ background:bg, borderColor:border }}>
                  {loading ? <Skel h={24}/> : <div className="ov-stat-val" style={{ color, fontSize: sm ? 14 : undefined }}>{value}</div>}
                  <div className="ov-stat-lbl" style={{ color }}>{label}</div>
                </div>
              ))}
            </div>

            {simByStation.length > 0 && simByStation.map(s => {
              const col = { DDB1:'#F59E0B', DXE6:'#38BDF8' }[s.station_code] || '#F59E0B'
              const pct = s.total > 0 ? Math.round(s.assigned/s.total*100) : 0
              return (
                <div key={s.station_code} className="ov-station">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div>
                      <div style={{ fontWeight:800, fontSize:14, color:col }}>{s.station_code}</div>
                      <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:1 }}>{s.assigned} assigned / {s.total} total</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:900, fontSize:20, color:col, letterSpacing:'-0.04em' }}>{pct}%</div>
                      <div style={{ fontSize:10, color:'var(--text-muted)' }}>utilised</div>
                    </div>
                  </div>
                  <div className="ov-bar">
                    <div className="ov-fill" style={{ width:`${pct}%`, background:`linear-gradient(90deg,${col},${col}bb)` }}/>
                  </div>
                  <div style={{ display:'flex', gap:16, marginTop:8 }}>
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                      <span style={{ fontWeight:700, color:'#10B981' }}>{s.available||0}</span> available
                    </span>
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                      <span style={{ fontWeight:700, color:'#7C3AED' }}>{fmtAED(s.monthly_cost||0)}</span>/mo
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ══ QUICK ACTIONS ═════════════════════════════════════════ */}
        <div className="ov-card">
          <div className="ov-card-hd">
            <div>
              <div className="ov-card-title">Quick Actions</div>
              <div className="ov-card-sub">Navigate to key sections instantly</div>
            </div>
          </div>
          <div className="ov-qa-grid">
            {[
              { l:'Employees',   href:'/dashboard/hr/employees',    c:'#F59E0B', icon:Users },
              { l:'Payroll',     href:'/dashboard/finance/payroll', c:'#38BDF8', icon:Wallet },
              { l:'Expenses',    href:'/dashboard/finance/expenses',c:'#10B981', icon:Receipt },
              { l:'SIM Cards',   href:'/dashboard/poc/sims',        c:'#A78BFA', icon:Smartphone },
              { l:'Fleet',       href:'/dashboard/poc/fleet',       c:'#06B6D4', icon:Car },
              { l:'Leaves',      href:'/dashboard/hr/leaves',       c:'#F97316', icon:ScrollText },
            ].map(({ l, href, c, icon:Icon }) => (
              <Link key={l} href={href} className="ov-qa-item"
                style={{ background:`${c}10`, border:`1px solid ${c}22` }}
                onMouseEnter={e => { e.currentTarget.style.background=`${c}1E`; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 6px 20px ${c}28` }}
                onMouseLeave={e => { e.currentTarget.style.background=`${c}10`; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}>
                <div style={{ width:46, height:46, borderRadius:14, background:`${c}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={20} color={c}/>
                </div>
                <span style={{ fontSize:11.5, fontWeight:700, color:c, textAlign:'center', lineHeight:1.3 }}>{l}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}
