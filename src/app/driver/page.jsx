'use client'
import HandoverModal from '@/components/HandoverModal'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { payrollApi, pocApi, attApi, leaveApi } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import {
  LogOut, Calendar, Bell, Plus, X, Car, ChevronRight,
  TrendingUp, FileText, Shield, CheckCircle, XCircle,
  Wallet, Package, AlertTriangle, Clock, Home, BarChart2
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL
const APP_VERSION = '2.4.0'

const DED_LABELS = { traffic_fine:'Traffic Fine', iloe_fee:'ILOE Fee', iloe_fine:'ILOE Fine', cash_variance:'Cash Variance', other:'Other' }
const BON_COLORS = { performance:'#10B981', kpi:'#3B82F6', other:'#B8860B' }
const TYPE_COLORS = { Annual:'#B8860B', Sick:'#3B82F6', Emergency:'#EF4444', Unpaid:'#6B5D4A', Other:'#8B7355' }

const PERF_GRADES = {
  'Fantastic Plus': { c:'#10B981', bg:'rgba(16,185,129,0.15)', bar:100 },
  'Fantastic':      { c:'#3B82F6', bg:'rgba(59,130,246,0.15)', bar:88  },
  'Great':          { c:'#F59E0B', bg:'rgba(245,158,11,0.15)', bar:77  },
  'Fair':           { c:'#FB923C', bg:'rgba(251,146,60,0.15)', bar:60  },
  'Poor':           { c:'#EF4444', bg:'rgba(239,68,68,0.15)',  bar:25  },
}

const METRIC_DEFS = [
  { key:'dcr',   label:'Delivery Completion Rate', target:'96.7%', unit:'%',   good:v=>v>=96.7,  fair:v=>v>=94 },
  { key:'dnr',   label:'DNR DPMO',                 target:'<900',  unit:'',    good:v=>v<=900,   fair:v=>v<=1500 },
  { key:'pod',   label:'Photo on Delivery',        target:'92%',   unit:'%',   good:v=>v>=92,    fair:v=>v>=75 },
  { key:'rsa',   label:'Route Sequence Adherence', target:'60%',   unit:'%',   good:v=>v>=60,    fair:v=>v>=50 },
  { key:'phr',   label:'Preference Honor Rate',    target:'90%',   unit:'%',   good:v=>v>=90,    fair:v=>v>=70 },
  { key:'cdf',   label:'Customer Feedback Defects',target:'<0.3%', unit:'%',   good:v=>v<=0.3,   fair:v=>v<=0.5 },
  { key:'fico',  label:'FICO Score',               target:'>700',  unit:'',    good:v=>v>=700,   fair:v=>v>=400 },
  { key:'vsa',   label:'VSA Compliance',           target:'98%',   unit:'%',   good:v=>v>=98,    fair:v=>v>=90 },
  { key:'mentor',label:'Mentor Adoption',          target:'70%',   unit:'%',   good:v=>v>=70,    fair:v=>v>=30 },
]

function fmt(n) { return Number(n||0).toLocaleString() }
function fmtAmt(n) { return `AED ${Number(n||0).toLocaleString()}` }

function getGrade(score) {
  if (score >= 92) return 'Fantastic Plus'
  if (score >= 85) return 'Fantastic'
  if (score >= 70) return 'Great'
  if (score >= 50) return 'Fair'
  return 'Poor'
}

function MetricBadge({ value, good, fair, unit }) {
  const c = good(value) ? '#10B981' : fair(value) ? '#F59E0B' : '#EF4444'
  const bg = good(value) ? 'rgba(16,185,129,0.1)' : fair(value) ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'
  return (
    <span style={{ fontSize:11, fontWeight:700, color:c, background:bg, borderRadius:20, padding:'2px 8px' }}>
      {value}{unit}
    </span>
  )
}

/* ── Apply Leave Modal ── */
function LeaveModal({ empId, onSave, onClose }) {
  const [form, setForm] = useState({ type:'Annual', from_date:'', to_date:'', reason:'' })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  const days = form.from_date && form.to_date
    ? Math.max(1, Math.round((new Date(form.to_date)-new Date(form.from_date))/86400000)+1) : 0

  async function handleSave() {
    if (!form.from_date||!form.to_date) return alert('Select dates')
    setSaving(true)
    try {
      await leaveApi.create({ ...form, emp_id:empId, days })
      onSave()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(6px)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'rgba(255,255,255,0.95)', backdropFilter:'blur(20px)', borderRadius:'24px 24px 0 0', width:'100%', maxWidth:500, padding:'20px 20px 36px', boxShadow:'0 -8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ width:40, height:4, borderRadius:2, background:'rgba(0,0,0,0.15)', margin:'0 auto 18px' }}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ fontWeight:800, fontSize:16, color:'#1A1612', margin:0 }}>Apply Leave</h3>
          <button onClick={onClose} style={{ width:30,height:30,borderRadius:9,background:'rgba(0,0,0,0.07)',border:'none',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center' }}>×</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={{ fontSize:10.5,fontWeight:700,color:'#A89880',textTransform:'uppercase',letterSpacing:'0.08em',display:'block',marginBottom:5 }}>Leave Type</label>
            <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
              {['Annual','Sick','Emergency','Unpaid'].map(t=>(
                <button key={t} onClick={()=>set('type',t)} style={{ padding:'7px 14px',borderRadius:20,border:`2px solid ${form.type===t?TYPE_COLORS[t]:'rgba(0,0,0,0.1)'}`,background:form.type===t?`${TYPE_COLORS[t]}15`:'rgba(255,255,255,0.8)',color:form.type===t?TYPE_COLORS[t]:'#8B7355',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'Poppins,sans-serif' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:10.5,fontWeight:700,color:'#A89880',textTransform:'uppercase',letterSpacing:'0.08em',display:'block',marginBottom:5 }}>From</label>
              <input type="date" value={form.from_date} onChange={e=>set('from_date',e.target.value)} style={{ width:'100%',padding:'10px 12px',borderRadius:12,border:'1.5px solid rgba(0,0,0,0.1)',background:'rgba(255,255,255,0.8)',fontSize:13,fontFamily:'Poppins,sans-serif',outline:'none',boxSizing:'border-box' }}/>
            </div>
            <div>
              <label style={{ fontSize:10.5,fontWeight:700,color:'#A89880',textTransform:'uppercase',letterSpacing:'0.08em',display:'block',marginBottom:5 }}>To</label>
              <input type="date" value={form.to_date} onChange={e=>set('to_date',e.target.value)} style={{ width:'100%',padding:'10px 12px',borderRadius:12,border:'1.5px solid rgba(0,0,0,0.1)',background:'rgba(255,255,255,0.8)',fontSize:13,fontFamily:'Poppins,sans-serif',outline:'none',boxSizing:'border-box' }}/>
            </div>
          </div>
          {days>0 && <div style={{ fontSize:12,fontWeight:600,color:'#B8860B',background:'rgba(184,134,11,0.08)',borderRadius:10,padding:'8px 12px',textAlign:'center' }}>{days} day{days>1?'s':''} leave</div>}
          <div>
            <label style={{ fontSize:10.5,fontWeight:700,color:'#A89880',textTransform:'uppercase',letterSpacing:'0.08em',display:'block',marginBottom:5 }}>Reason</label>
            <input value={form.reason} onChange={e=>set('reason',e.target.value)} placeholder="Brief reason…" style={{ width:'100%',padding:'10px 12px',borderRadius:12,border:'1.5px solid rgba(0,0,0,0.1)',background:'rgba(255,255,255,0.8)',fontSize:13,fontFamily:'Poppins,sans-serif',outline:'none',boxSizing:'border-box' }}/>
          </div>
          <button onClick={handleSave} disabled={saving} style={{ padding:'13px',borderRadius:14,background:'linear-gradient(135deg,#B8860B,#D4A017)',color:'white',fontWeight:800,fontSize:14,border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',marginTop:4,opacity:saving?0.7:1 }}>
            {saving ? 'Submitting…' : 'Submit Leave Request'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Portal ── */
export default function DriverPortal() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const [profile,       setProfile]       = useState(null)
  const [payroll,       setPayroll]       = useState([])
  const [myLeaves,      setMyLeaves]      = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [tab,           setTab]           = useState('home')
  const [leaveModal,    setLeaveModal]    = useState(false)
  const [handoverModal, setHandoverModal] = useState(false)
  const [myVehicle,     setMyVehicle]     = useState(null)
  const [myHandovers,   setMyHandovers]   = useState([])
  const [performance,   setPerformance]   = useState(null)

  function handleSignOut() {
    try { logout() } catch(e) {}
    localStorage.removeItem('gcd_token')
    localStorage.removeItem('gcd_user')
    router.replace('/login')
  }

  useEffect(() => {
    if (user === null) { router.replace('/login'); return }
    if (user && user.role !== 'driver') { router.replace('/dashboard/analytics'); return }
    if (!user) return

    async function load() {
      setLoading(true)
      try {
        const token = localStorage.getItem('gcd_token')
        const hdr   = { Authorization:`Bearer ${token}` }
        const today = new Date().toISOString().slice(0,7)

        const [pr, ann, lv, emp, hv, perf] = await Promise.all([
          fetch(`${API}/api/payroll?month=${today}`, {headers:hdr}).then(r=>r.json()).catch(()=>({payroll:[]})),
          fetch(`${API}/api/poc/announcements?station_code=${user.station_code}`, {headers:hdr}).then(r=>r.json()).catch(()=>({announcements:[]})),
          fetch(`${API}/api/leaves`, {headers:hdr}).then(r=>r.json()).catch(()=>({leaves:[]})),
          fetch(`${API}/api/employees/${user.emp_id}`, {headers:hdr}).then(r=>r.json()).catch(()=>({employee:null})),
          fetch(`${API}/api/handovers`, {headers:hdr}).then(r=>r.json()).catch(()=>({handovers:[]})),
          fetch(`${API}/api/performance/${user.emp_id}`, {headers:hdr}).then(r=>r.json()).catch(()=>({history:[]})),
        ])

        const mySlip = (pr.payroll||[]).find(p=>p.id===user.emp_id || p.emp_id===user.emp_id)
        setPayroll(pr.payroll||[])
        setProfile(mySlip || emp.employee || null)
        setAnnouncements(ann.announcements||[])
        setMyLeaves(lv.leaves||[])

        const handoverList = hv.handovers||[]
        setMyHandovers(handoverList)
        const current = handoverList.find(h=>h.type==='received' && !handoverList.find(h2=>h2.vehicle_id===h.vehicle_id && h2.type==='returned' && new Date(h2.submitted_at)>new Date(h.submitted_at)))
        setMyVehicle(current||null)
        setPerformance(perf.history?.[0]||null)
      } catch(e) { console.error(e) } finally { setLoading(false) }
    }
    load()
  }, [user, router])

  useSocket({ 'payroll:paid':()=>{}, 'leave:updated':()=>{} })

  if (!user || loading) {
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0F0C07,#1E1608)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:40,height:40,borderRadius:12,border:'3px solid #B8860B',borderTopColor:'transparent',animation:'spin 0.8s linear infinite' }}/>
      </div>
    )
  }

  const mySlip = payroll.find(p=>p.id===user.emp_id||p.emp_id===user.emp_id) || profile
  const net    = mySlip ? Number(mySlip.net_pay||(Number(mySlip.base_salary)+Number(mySlip.bonus_total||0)-Number(mySlip.deduction_total||0))) : 0
  const ytd    = payroll.reduce((s,p)=>s+(p.id===user.emp_id||p.emp_id===user.emp_id?Number(p.net_pay||(Number(p.base_salary)+Number(p.bonus_total||0)-Number(p.deduction_total||0))):0), 0)
  const leaveDays = myLeaves.filter(l=>l.status==='approved').reduce((s,l)=>s+Number(l.days||0), 0)

  const grade     = performance ? getGrade(performance.total_score) : null
  const gradeConf = grade ? PERF_GRADES[grade] : null

  const TABS = [
    { id:'home',        icon:Home,      label:'Home' },
    { id:'payroll',     icon:Wallet,    label:'Payslips' },
    { id:'leaves',      icon:Calendar,  label:'Leaves' },
    { id:'performance', icon:BarChart2, label:'Performance' },
    { id:'vehicle',     icon:Car,       label:'Vehicle' },
    { id:'notices',     icon:Bell,      label:'Notices' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#F5EDD8 0%,#EDE4D0 50%,#E8DFC8 100%)', fontFamily:'Poppins,sans-serif', paddingBottom:80 }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { display:none; }
      `}</style>

      {/* ── HERO HEADER ── */}
      <div style={{ background:'linear-gradient(160deg,#0F0C07 0%,#1A1208 50%,#2C1F0A 100%)', padding:'16px 16px 20px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-30, top:-30, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle,rgba(212,160,23,0.18) 0%,transparent 70%)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', left:-20, bottom:-20, width:120, height:120, borderRadius:'50%', background:'radial-gradient(circle,rgba(56,189,248,0.1) 0%,transparent 70%)', pointerEvents:'none' }}/>

        {/* Top bar */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#B8860B,#D4A017)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:'white' }}>GCD</div>
            <div>
              <div style={{ fontWeight:800, fontSize:13, color:'white', letterSpacing:'-0.01em' }}>Golden Crescent</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:1 }}>DA PORTAL · v{APP_VERSION}</div>
            </div>
          </div>
          <button onClick={handleSignOut}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:20, background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#F87171', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
            <LogOut size={13}/> Sign Out
          </button>
        </div>

        {/* Profile */}
        <div style={{ display:'flex', alignItems:'center', gap:14, position:'relative', marginBottom:18 }}>
          <div style={{ width:56,height:56,borderRadius:16,background:'linear-gradient(135deg,#B8860B,#D4A017)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:900,color:'white',flexShrink:0,boxShadow:'0 4px 16px rgba(184,134,11,0.4)' }}>
            {user.name?.slice(0,1).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight:900, fontSize:20, color:'white', letterSpacing:'-0.02em' }}>{user.name}</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginTop:2 }}>
              Driver · {user.station_code||'—'}
              {grade && <span style={{ marginLeft:8, color:gradeConf.c, fontWeight:700 }}>· {grade}</span>}
            </div>
          </div>
        </div>

        {/* Stats chips */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, position:'relative' }}>
          {[
            { l:'This Month',  v:fmtAmt(net),      c:'#D4A017' },
            { l:'YTD Earned',  v:fmtAmt(ytd),      c:'#34D399' },
            { l:'Leave Days',  v:`${leaveDays}d`,   c:'#38BDF8' },
          ].map(s=>(
            <div key={s.l} style={{ background:'rgba(255,255,255,0.08)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:13, padding:'10px 8px', textAlign:'center' }}>
              <div style={{ fontWeight:900, fontSize:16, color:s.c, letterSpacing:'-0.02em' }}>{s.v}</div>
              <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.4)', marginTop:2, fontWeight:600 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ padding:'16px 14px', maxWidth:600, margin:'0 auto' }}>

        {/* ── HOME ── */}
        {tab==='home' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }} className="fade-up">

            {/* Today status */}
            <div style={{ background:'rgba(255,255,255,0.65)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.7)', borderRadius:18, padding:'14px 16px' }}>
              <div style={{ fontSize:10,fontWeight:700,color:'#A89880',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8 }}>Today</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontWeight:700, fontSize:14, color:'#1A1612' }}>{new Date().toLocaleDateString('en-AE',{weekday:'long',day:'numeric',month:'long'})}</div>
                {mySlip && <div style={{ fontSize:13, fontWeight:700, color:'#B8860B' }}>Base AED {fmt(mySlip.base_salary)}</div>}
              </div>
            </div>

            {/* Vehicle card */}
            {myVehicle ? (
              <div style={{ background:'linear-gradient(135deg,rgba(16,185,129,0.12),rgba(16,185,129,0.06))', backdropFilter:'blur(20px)', border:'1.5px solid rgba(16,185,129,0.3)', borderRadius:18, padding:'16px' }}>
                <div style={{ fontSize:10,fontWeight:700,color:'#10B981',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8 }}>Current Vehicle</div>
                <div style={{ fontWeight:900, fontSize:20, color:'#1A1612', letterSpacing:'-0.02em', marginBottom:2 }}>{myVehicle.plate}</div>
                <div style={{ fontSize:12, color:'#6B5D4A', marginBottom:12 }}>{[myVehicle.make,myVehicle.model].filter(Boolean).join(' ')} · Since {new Date(myVehicle.submitted_at).toLocaleDateString('en-AE')}</div>
                <button onClick={()=>setHandoverModal(true)} style={{ width:'100%',padding:'10px',borderRadius:12,background:'rgba(239,68,68,0.1)',border:'1.5px solid rgba(239,68,68,0.3)',color:'#EF4444',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'Poppins,sans-serif' }}>
                  Return Vehicle
                </button>
              </div>
            ) : (
              <div style={{ background:'rgba(255,255,255,0.55)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.7)', borderRadius:18, padding:'16px', textAlign:'center' }}>
                <Car size={28} color="#C4B49A" style={{ margin:'0 auto 8px', display:'block' }}/>
                <div style={{ fontSize:13, color:'#A89880', marginBottom:10 }}>No vehicle assigned</div>
                <button onClick={()=>setHandoverModal(true)} style={{ padding:'8px 20px',borderRadius:12,background:'linear-gradient(135deg,#B8860B,#D4A017)',color:'white',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif' }}>
                  Log Handover
                </button>
              </div>
            )}

            {/* Quick actions */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { l:'Apply Leave',   icon:Calendar,  c:'#F59E0B', action:()=>setLeaveModal(true) },
                { l:'Log Handover',  icon:Car,       c:'#38BDF8', action:()=>setHandoverModal(true) },
                { l:'My Payslips',   icon:Wallet,    c:'#10B981', action:()=>setTab('payroll') },
                { l:'Performance',   icon:BarChart2, c:'#A78BFA', action:()=>setTab('performance') },
              ].map(a=>{
                const Icon=a.icon
                return (
                  <button key={a.l} onClick={a.action}
                    style={{ display:'flex',alignItems:'center',gap:10,padding:'14px 14px',borderRadius:16,background:`${a.c}10`,border:`1.5px solid ${a.c}25`,cursor:'pointer',fontFamily:'Poppins,sans-serif',textAlign:'left',transition:'transform 0.15s' }}
                    onMouseEnter={e=>e.currentTarget.style.transform='scale(1.02)'}
                    onMouseLeave={e=>e.currentTarget.style.transform='none'}>
                    <div style={{ width:38,height:38,borderRadius:11,background:`${a.c}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                      <Icon size={18} color={a.c}/>
                    </div>
                    <span style={{ fontWeight:700, fontSize:13, color:a.c }}>{a.l}</span>
                  </button>
                )
              })}
            </div>

            {/* Latest notice */}
            {announcements.length>0 && (
              <div style={{ background:'rgba(255,255,255,0.65)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.7)', borderRadius:18, padding:'14px 16px' }}>
                <div style={{ fontSize:10,fontWeight:700,color:'#A89880',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8 }}>Latest Notice</div>
                <div style={{ fontWeight:700, fontSize:13, color:'#1A1612', marginBottom:4 }}>{announcements[0].title}</div>
                <div style={{ fontSize:12, color:'#6B5D4A', lineHeight:1.6 }}>{announcements[0].message?.slice(0,120)}{announcements[0].message?.length>120?'…':''}</div>
              </div>
            )}
          </div>
        )}

        {/* ── PAYSLIPS ── */}
        {tab==='payroll' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }} className="fade-up">
            <h2 style={{ fontWeight:800, fontSize:17, color:'#1A1612', margin:0 }}>My Payslips</h2>
            {!mySlip ? (
              <div style={{ textAlign:'center', padding:'40px 20px', color:'#A89880' }}>
                <Wallet size={32} style={{ margin:'0 auto 10px',display:'block',opacity:0.3 }}/>
                <div>No payroll data yet</div>
              </div>
            ) : (
              <>
                <div style={{ background:'linear-gradient(135deg,#0F0C07,#2C1F0A)', borderRadius:18, padding:'18px' }}>
                  <div style={{ fontSize:10,color:'rgba(255,255,255,0.4)',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:4 }}>Net Salary This Month</div>
                  <div style={{ fontWeight:900, fontSize:28, color:'#D4A017', letterSpacing:'-0.04em' }}>AED {fmt(net)}</div>
                  <div style={{ fontSize:12, color:mySlip.payroll_status==='paid'?'#34D399':'#FB923C', marginTop:6, fontWeight:600 }}>
                    {mySlip.payroll_status==='paid'?'✓ Paid':'Pending Payment'}
                  </div>
                </div>
                {/* Breakdown */}
                <div style={{ background:'rgba(255,255,255,0.65)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.7)', borderRadius:18, padding:'16px' }}>
                  {[
                    { l:'Base Salary',  v:`AED ${fmt(mySlip.base_salary)}`,        c:'#1A1612' },
                    { l:'Bonuses',      v:`+AED ${fmt(mySlip.bonus_total||0)}`,     c:'#10B981' },
                    { l:'Deductions',   v:`-AED ${fmt(mySlip.deduction_total||0)}`, c:'#EF4444' },
                  ].map(r=>(
                    <div key={r.l} style={{ display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid rgba(0,0,0,0.05)' }}>
                      <span style={{ fontSize:13,color:'#6B5D4A' }}>{r.l}</span>
                      <span style={{ fontWeight:700,fontSize:13,color:r.c }}>{r.v}</span>
                    </div>
                  ))}
                  {/* Bonuses detail */}
                  {(mySlip.bonuses||[]).map(b=>(
                    <div key={b.id} style={{ display:'flex',justifyContent:'space-between',padding:'6px 12px',background:'rgba(16,185,129,0.06)',borderRadius:9,marginTop:6 }}>
                      <span style={{ fontSize:11.5,color:'#10B981' }}>{b.type} {b.description?`— ${b.description}`:''}</span>
                      <span style={{ fontWeight:700,fontSize:11.5,color:'#10B981' }}>+AED {fmt(b.amount)}</span>
                    </div>
                  ))}
                  {/* Deductions detail */}
                  {(mySlip.deductions||[]).map(d=>(
                    <div key={d.id} style={{ display:'flex',justifyContent:'space-between',padding:'6px 12px',background:'rgba(239,68,68,0.05)',borderRadius:9,marginTop:6 }}>
                      <span style={{ fontSize:11.5,color:'#EF4444' }}>{DED_LABELS[d.type]||d.type} {d.description?`— ${d.description}`:''}</span>
                      <span style={{ fontWeight:700,fontSize:11.5,color:'#EF4444' }}>-AED {fmt(d.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── LEAVES ── */}
        {tab==='leaves' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }} className="fade-up">
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <h2 style={{ fontWeight:800, fontSize:17, color:'#1A1612', margin:0 }}>My Leaves</h2>
              <button onClick={()=>setLeaveModal(true)} style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:20,background:'linear-gradient(135deg,#B8860B,#D4A017)',color:'white',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif' }}>
                <Plus size={13}/> Apply
              </button>
            </div>
            {myLeaves.length===0 ? (
              <div style={{ textAlign:'center',padding:'40px 20px',color:'#A89880' }}><Calendar size={32} style={{ margin:'0 auto 10px',display:'block',opacity:0.3 }}/><div>No leave requests</div></div>
            ) : myLeaves.map((l,i)=>{
              const tc = TYPE_COLORS[l.type]||'#8B7355'
              const sc = l.status==='approved'?'#10B981':l.status==='rejected'?'#EF4444':'#F59E0B'
              return (
                <div key={l.id} style={{ background:'rgba(255,255,255,0.65)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.7)',borderRadius:16,padding:'14px 16px',animation:`fadeUp 0.3s ${i*0.05}s ease both` }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8 }}>
                    <span style={{ fontSize:11,fontWeight:700,color:tc,background:`${tc}12`,borderRadius:20,padding:'3px 10px' }}>{l.type}</span>
                    <span style={{ fontSize:11,fontWeight:700,color:sc,background:`${sc}10`,borderRadius:20,padding:'3px 10px' }}>{l.status}</span>
                  </div>
                  <div style={{ fontSize:13,fontWeight:600,color:'#1A1612',marginBottom:3 }}>{l.from_date} → {l.to_date}</div>
                  <div style={{ fontSize:11.5,color:'#A89880' }}>{l.days} day{l.days>1?'s':''} · {l.reason}</div>
                  {/* Approval stages */}
                  <div style={{ display:'flex',gap:6,marginTop:8,flexWrap:'wrap' }}>
                    {[{l:'POC',s:l.poc_status},{l:'HR',s:l.hr_status||l.gm_status},{l:'Manager',s:l.mgr_status}].map(st=>(
                      <span key={st.l} style={{ fontSize:10,fontWeight:700,color:st.s==='approved'?'#10B981':st.s==='rejected'?'#EF4444':'#A89880',background:st.s==='approved'?'rgba(16,185,129,0.1)':st.s==='rejected'?'rgba(239,68,68,0.1)':'rgba(0,0,0,0.05)',borderRadius:20,padding:'2px 8px' }}>
                        {st.l}: {st.s||'pending'}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── PERFORMANCE ── */}
        {tab==='performance' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }} className="fade-up">
            <h2 style={{ fontWeight:800, fontSize:17, color:'#1A1612', margin:0 }}>DSP Performance</h2>

            {/* Overall score */}
            {performance ? (
              <>
                <div style={{ background:'linear-gradient(135deg,#0F0C07,#2C1F0A)', borderRadius:20, padding:'20px', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute',right:-20,top:-20,width:120,height:120,borderRadius:'50%',background:`radial-gradient(circle,${gradeConf.c}30 0%,transparent 70%)`,pointerEvents:'none' }}/>
                  <div style={{ fontSize:10,color:'rgba(255,255,255,0.4)',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:4 }}>Weekly Scorecard</div>
                  <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                    <div style={{ position:'relative', width:80, height:80, flexShrink:0 }}>
                      <svg width={80} height={80} style={{ transform:'rotate(-90deg)' }}>
                        <circle cx={40} cy={40} r={32} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={8}/>
                        <circle cx={40} cy={40} r={32} fill="none" stroke={gradeConf.c} strokeWidth={8}
                          strokeDasharray={`${(performance.total_score/100)*201} 201`} strokeLinecap="round"/>
                      </svg>
                      <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column' }}>
                        <div style={{ fontWeight:900,fontSize:16,color:'white',letterSpacing:'-0.03em' }}>{Number(performance.total_score).toFixed(0)}</div>
                        <div style={{ fontSize:8,color:'rgba(255,255,255,0.4)',fontWeight:600 }}>/ 100</div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight:900, fontSize:22, color:gradeConf.c, letterSpacing:'-0.02em' }}>{grade}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginTop:3 }}>{performance.month}</div>
                    </div>
                  </div>
                </div>

                {/* Score breakdown */}
                <div style={{ background:'rgba(255,255,255,0.65)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.7)',borderRadius:18,padding:'16px' }}>
                  <div style={{ fontSize:11,fontWeight:700,color:'#A89880',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12 }}>Score Breakdown</div>
                  {[
                    {l:'Attendance',  v:performance.attendance_score,  max:20, c:'#10B981'},
                    {l:'Deliveries',  v:performance.delivery_score,    max:20, c:'#3B82F6'},
                    {l:'Compliance',  v:performance.compliance_score,  max:20, c:'#A78BFA'},
                    {l:'Leave Usage', v:performance.leave_score,       max:20, c:'#F59E0B'},
                    {l:'Conduct',     v:performance.deduction_score,   max:20, c:'#B8860B'},
                  ].map(s=>(
                    <div key={s.l} style={{ marginBottom:10 }}>
                      <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                        <span style={{ fontSize:12,color:'#6B5D4A',fontWeight:500 }}>{s.l}</span>
                        <span style={{ fontSize:12,fontWeight:700,color:s.c }}>{Number(s.v).toFixed(0)}/{s.max}</span>
                      </div>
                      <div style={{ height:6,background:'rgba(0,0,0,0.07)',borderRadius:10,overflow:'hidden' }}>
                        <div style={{ height:'100%',width:`${(s.v/s.max)*100}%`,background:s.c,borderRadius:10,transition:'width 1s ease' }}/>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Amazon DSP Scorecard standards */}
                <div style={{ background:'rgba(255,255,255,0.65)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.7)',borderRadius:18,padding:'16px' }}>
                  <div style={{ fontSize:11,fontWeight:700,color:'#A89880',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12 }}>Amazon DSP Standards</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {[
                      {l:'Fantastic Plus', range:'92–100', c:'#10B981'},
                      {l:'Fantastic',      range:'85–91',  c:'#3B82F6'},
                      {l:'Great',          range:'70–84',  c:'#F59E0B'},
                      {l:'Fair',           range:'50–69',  c:'#FB923C'},
                      {l:'Poor',           range:'0–49',   c:'#EF4444'},
                    ].map(g=>(
                      <div key={g.l} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',borderRadius:10,background:grade===g.l?`${g.c}15`:'transparent',border:grade===g.l?`1px solid ${g.c}30`:'1px solid transparent' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:7 }}>
                          <div style={{ width:8,height:8,borderRadius:'50%',background:g.c }}/>
                          <span style={{ fontSize:12.5,fontWeight:grade===g.l?700:500,color:grade===g.l?g.c:'#6B5D4A' }}>{g.l}</span>
                          {grade===g.l && <span style={{ fontSize:10,fontWeight:700,color:g.c }}>← You are here</span>}
                        </div>
                        <span style={{ fontSize:11,color:'#A89880',fontWeight:600 }}>{g.range}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ background:'rgba(255,255,255,0.65)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.7)',borderRadius:18,padding:'30px',textAlign:'center' }}>
                <BarChart2 size={36} color="#C4B49A" style={{ margin:'0 auto 10px',display:'block' }}/>
                <div style={{ fontSize:13,color:'#A89880' }}>Performance data not yet available</div>
                <div style={{ fontSize:11.5,color:'#C4B49A',marginTop:4 }}>Ask your manager to compute scores</div>
              </div>
            )}

            {/* SLS Targets reference */}
            <div style={{ background:'rgba(255,255,255,0.65)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.7)',borderRadius:18,padding:'16px' }}>
              <div style={{ fontSize:11,fontWeight:700,color:'#A89880',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12 }}>SLS Targets (Amazon)</div>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {[
                  {l:'Delivery Completion Rate', target:'96.7%', min:'94%'},
                  {l:'Photo on Delivery',        target:'92%',   min:'75%'},
                  {l:'Route Sequence Adherence', target:'60%',   min:'50%'},
                  {l:'Preference Honor Rate',    target:'90%',   min:'70%'},
                  {l:'FICO Score',               target:'>700',  min:'>400'},
                  {l:'VSA Compliance',           target:'98%',   min:'90%'},
                  {l:'Mentor Adoption',          target:'70%',   min:'30%'},
                ].map(m=>(
                  <div key={m.l} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:11.5,padding:'5px 0',borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
                    <span style={{ color:'#6B5D4A',fontWeight:500 }}>{m.l}</span>
                    <div style={{ display:'flex',gap:8 }}>
                      <span style={{ color:'#10B981',fontWeight:700 }}>{m.target}</span>
                      <span style={{ color:'#A89880' }}>min {m.min}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Incentives */}
              <div style={{ marginTop:12,padding:'10px 12px',background:'rgba(184,134,11,0.08)',borderRadius:12,border:'1px solid rgba(184,134,11,0.2)' }}>
                <div style={{ fontSize:11,fontWeight:700,color:'#B8860B',marginBottom:6 }}>Incentives Per Package</div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,textAlign:'center' }}>
                  {[{l:'Fantastic+',v:'0.125 AED'},{l:'Fantastic',v:'0.0625 AED'},{l:'Great/Fair',v:'0 AED'}].map(r=>(
                    <div key={r.l} style={{ padding:'6px 4px',borderRadius:8,background:'rgba(255,255,255,0.6)' }}>
                      <div style={{ fontSize:9.5,fontWeight:700,color:'#B8860B' }}>{r.l}</div>
                      <div style={{ fontSize:11,fontWeight:800,color:'#1A1612',marginTop:2 }}>{r.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── VEHICLE ── */}
        {tab==='vehicle' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }} className="fade-up">
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <h2 style={{ fontWeight:800, fontSize:17, color:'#1A1612', margin:0 }}>Vehicle</h2>
              <button onClick={()=>setHandoverModal(true)} style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:20,background:'linear-gradient(135deg,#B8860B,#D4A017)',color:'white',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif' }}>
                <Plus size={13}/> Handover
              </button>
            </div>
            {myHandovers.length===0 ? (
              <div style={{ textAlign:'center',padding:'40px 20px',color:'#A89880' }}><Car size={32} style={{ margin:'0 auto 10px',display:'block',opacity:0.3 }}/><div>No handovers yet</div></div>
            ) : myHandovers.map((h,i)=>(
              <div key={h.id} style={{ background:'rgba(255,255,255,0.65)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.7)',borderRadius:16,padding:'14px 16px',animation:`fadeUp 0.3s ${i*0.05}s ease both` }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6 }}>
                  <span style={{ fontWeight:800,fontSize:15,color:'#1A1612' }}>{h.plate||'Unknown'}</span>
                  <span style={{ fontSize:11,fontWeight:700,color:h.type==='received'?'#10B981':'#EF4444',background:h.type==='received'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',borderRadius:20,padding:'2px 9px' }}>{h.type}</span>
                </div>
                <div style={{ fontSize:11.5,color:'#6B5D4A' }}>{new Date(h.submitted_at).toLocaleDateString('en-AE',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                {h.fuel_level && <div style={{ fontSize:11,color:'#A89880',marginTop:3 }}>Fuel: {h.fuel_level}%</div>}
              </div>
            ))}
          </div>
        )}

        {/* ── NOTICES ── */}
        {tab==='notices' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }} className="fade-up">
            <h2 style={{ fontWeight:800, fontSize:17, color:'#1A1612', margin:0 }}>Station Notices</h2>
            {announcements.length===0 ? (
              <div style={{ textAlign:'center',padding:'40px 20px',color:'#A89880' }}><Bell size={32} style={{ margin:'0 auto 10px',display:'block',opacity:0.3 }}/><div>No notices yet</div></div>
            ) : announcements.map((a,i)=>(
              <div key={a.id} style={{ background:'rgba(255,255,255,0.65)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.7)',borderRadius:16,padding:'14px 16px',animation:`fadeUp 0.3s ${i*0.05}s ease both` }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6 }}>
                  <span style={{ fontWeight:700,fontSize:13.5,color:'#1A1612' }}>{a.title}</span>
                  <span style={{ fontSize:10,color:'#A89880',flexShrink:0,marginLeft:8 }}>{a.created_at?.slice(0,10)}</span>
                </div>
                <div style={{ fontSize:12.5,color:'#6B5D4A',lineHeight:1.6 }}>{a.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <nav style={{ position:'fixed', bottom:0, left:0, right:0, background:'rgba(255,252,245,0.92)', backdropFilter:'blur(24px)', borderTop:'1px solid rgba(255,255,255,0.7)', display:'flex', zIndex:100, boxShadow:'0 -4px 20px rgba(0,0,0,0.08)' }}>
        {TABS.map(t=>{
          const Icon  = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'10px 4px 12px', border:'none', background:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', transition:'all 0.15s' }}>
              <div style={{ width:32, height:32, borderRadius:10, background:active?'rgba(184,134,11,0.15)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:2, transition:'background 0.2s' }}>
                <Icon size={18} color={active?'#B8860B':'#A89880'} strokeWidth={active?2.5:1.8}/>
              </div>
              <span style={{ fontSize:9.5, fontWeight:active?700:500, color:active?'#B8860B':'#A89880' }}>{t.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Modals */}
      {leaveModal && (
        <LeaveModal empId={user.emp_id} onClose={()=>setLeaveModal(false)} onSave={()=>{ setLeaveModal(false) }}/>
      )}
      {handoverModal && (
        <HandoverModal stationCode={user.station_code} onClose={()=>setHandoverModal(false)} onSave={()=>{ setHandoverModal(false) }}/>
      )}
    </div>
  )
}