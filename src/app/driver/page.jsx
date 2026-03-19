'use client'
import HandoverModal from '@/components/HandoverModal'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { payrollApi, pocApi, attApi, leaveApi } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import {
  LogOut, DollarSign, Calendar, Bell, AlertTriangle, Plus, X,
  Car, Truck, ChevronRight, ChevronLeft, TrendingUp, Clock,
  FileText, Shield, Phone, CheckCircle, XCircle, AlertCircle,
  Wallet, Package, Smartphone
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL

const DED_LABELS  = { traffic_fine:'Traffic Fine', iloe_fee:'ILOE Fee', iloe_fine:'ILOE Fine', cash_variance:'Cash Variance', other:'Other' }
const DED_COLORS  = { traffic_fine:'#C0392B', iloe_fee:'#1D6FA4', iloe_fine:'#C0392B', cash_variance:'#B45309', other:'#6B5D4A' }
const BON_COLORS  = { performance:'#2E7D52', kpi:'#1D6FA4', other:'#B8860B' }
const TYPE_COLORS = { Annual:'#B8860B', Sick:'#1D6FA4', Emergency:'#C0392B', Unpaid:'#6B5D4A', Other:'#A89880' }

function fmt(n) { return Number(n||0).toLocaleString() }

// ── Horizontal swipe slider ───────────────────────────────────
function Slider({ items, renderItem, itemWidth='85%', gap=12 }) {
  const ref = useRef(null)
  const [idx, setIdx] = useState(0)
  function onScroll() {
    if (!ref.current) return
    const w = ref.current.firstChild?.offsetWidth || 300
    setIdx(Math.round(ref.current.scrollLeft / (w + gap)))
  }
  function goTo(i) {
    if (!ref.current) return
    const w = ref.current.firstChild?.offsetWidth || 300
    ref.current.scrollTo({ left: i*(w+gap), behavior:'smooth' })
  }
  if (!items?.length) return null
  return (
    <div>
      <div ref={ref} onScroll={onScroll}
        style={{ display:'flex', gap, overflowX:'auto', scrollSnapType:'x mandatory', WebkitOverflowScrolling:'touch', scrollbarWidth:'none', paddingBottom:4 }}>
        {items.map((item, i) => (
          <div key={i} style={{ minWidth:itemWidth, maxWidth:itemWidth, scrollSnapAlign:'start', flexShrink:0 }}>
            {renderItem(item, i)}
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <div style={{ display:'flex', justifyContent:'center', gap:5, marginTop:10 }}>
          {items.map((_,i) => (
            <button key={i} onClick={()=>goTo(i)} style={{ width:i===idx?18:6, height:6, borderRadius:3, background:i===idx?'#B8860B':'#EAE6DE', border:'none', cursor:'pointer', padding:0, transition:'width 0.3s, background 0.3s' }}/>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Leave Modal ───────────────────────────────────────────────
function LeaveModal({ onClose, onSave }) {
  const [form,   setForm]   = useState({ type:'Annual', from_date:'', to_date:'', reason:'' })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  const days = form.from_date && form.to_date
    ? Math.max(1, Math.round((new Date(form.to_date)-new Date(form.from_date))/86400000)+1) : 0

  async function handleSave() {
    if (!form.from_date||!form.to_date) return setErr('Please fill in dates')
    setSaving(true); setErr(null)
    try { await leaveApi.create({...form, days}); onSave() }
    catch(e) { setErr(e.message||'Failed to submit') } finally { setSaving(false) }
  }

  const TYPE_C = { Annual:'#B8860B', Sick:'#1D6FA4', Emergency:'#C0392B', Unpaid:'#6B5D4A', Other:'#A89880' }
  const tc = TYPE_C[form.type]||'#B8860B'

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:420, padding:0, overflow:'hidden' }}>
        <div style={{ padding:'22px 22px 16px', background:`linear-gradient(135deg,${tc}15,#FFF)` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div>
              <h3 style={{ fontWeight:900, fontSize:17, color:'#1A1612' }}>Apply for Leave</h3>
              <p style={{ fontSize:12, color:'#A89880', marginTop:2 }}>Request will go to your POC for approval</p>
            </div>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:9, background:'rgba(0,0,0,0.06)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14}/></button>
          </div>
          {/* Type pills */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {['Annual','Sick','Emergency','Unpaid','Other'].map(t => {
              const c = TYPE_C[t]
              return (
                <button key={t} onClick={()=>set('type',t)} type="button"
                  style={{ padding:'6px 14px', borderRadius:20, border:`2px solid ${form.type===t?c:'#EAE6DE'}`, background:form.type===t?`${c}15`:'#FFF', color:form.type===t?c:'#A89880', fontWeight:form.type===t?700:500, fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif', transition:'all 0.18s' }}>
                  {t}
                </button>
              )
            })}
          </div>
        </div>
        <div style={{ padding:'16px 22px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          {err && <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:9, padding:'9px 12px', fontSize:12.5, color:'#C0392B', display:'flex', gap:7, alignItems:'center' }}><AlertCircle size={13}/>{err}</div>}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div><label className="input-label">From *</label><input className="input" type="date" value={form.from_date} onChange={e=>set('from_date',e.target.value)}/></div>
            <div><label className="input-label">To *</label><input className="input" type="date" value={form.to_date} onChange={e=>set('to_date',e.target.value)}/></div>
          </div>
          {days>0 && (
            <div style={{ background:`${tc}12`, border:`1px solid ${tc}30`, borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, fontWeight:600, color:tc }}>{form.type} Leave</span>
              <span style={{ fontWeight:900, fontSize:18, color:tc }}>{days} day{days>1?'s':''}</span>
            </div>
          )}
          <div><label className="input-label">Reason (optional)</label>
            <input className="input" value={form.reason} onChange={e=>set('reason',e.target.value)} placeholder="Brief reason…"/></div>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving||!form.from_date||!form.to_date}
              style={{ flex:2, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'11px', borderRadius:10, background:`linear-gradient(135deg,${tc},${tc}cc)`, color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', opacity:saving?0.7:1 }}>
              {saving?'Submitting…':'Submit Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main DA Portal ────────────────────────────────────────────
export default function DriverPortal() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [profile,       setProfile]       = useState(null)
  const [payroll,       setPayroll]       = useState([])
  const [myLeaves,      setMyLeaves]      = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [todayAtt,      setTodayAtt]      = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [tab,           setTab]           = useState('home')
  const [leaveModal,    setLeaveModal]    = useState(false)
  const [handoverModal, setHandoverModal] = useState(false)
  const [myHandovers,   setMyHandovers]   = useState([])
  const [myVehicle,     setMyVehicle]     = useState(null)

  async function loadHandovers(token) {
    try {
      const hv = await fetch(`${API}/api/handovers`, { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json())
      const list = hv.handovers||[]
      setMyHandovers(list)
      const current = list.find(h=>h.type==='received' && !list.find(h2=>h2.vehicle_id===h.vehicle_id && h2.type==='returned' && new Date(h2.submitted_at)>new Date(h.submitted_at)))
      setMyVehicle(current||null)
    } catch(e) {}
  }

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (user.role !== 'driver') { router.replace('/dashboard/analytics'); return }
    async function load() {
      setLoading(true)
      try {
        const today = new Date().toISOString().slice(0,10)
        const token = localStorage.getItem('gcd_token')
        const hdr   = { Authorization:`Bearer ${token}` }
        const [pr, ann, att, lv, emp] = await Promise.all([
          payrollApi.list({ emp_id: user.emp_id }),
          pocApi.announcements(),
          attApi.list({ date: today }),
          fetch(`${API}/api/leaves?emp_id=${user.emp_id}`, { headers:hdr }).then(r=>r.json()),
          fetch(`${API}/api/employees/${user.emp_id}`, { headers:hdr }).then(r=>r.ok?r.json():{employee:null}),
        ])
        setPayroll(pr.payroll||[])
        setAnnouncements(ann.announcements||[])
        setTodayAtt(att.attendance?.[0]||null)
        setMyLeaves(lv.leaves||[])
        setProfile(emp.employee||null)
        await loadHandovers(token)
      } catch(e) { console.error(e) } finally { setLoading(false) }
    }
    load()
  }, [user, router])

  useSocket({
    'payroll:deduction_added': ({emp_id}) => { if(emp_id===user?.emp_id) payrollApi.list({emp_id:user.emp_id}).then(d=>setPayroll(d.payroll||[])).catch(()=>{}) },
    'payroll:paid':            (row)      => { if(row.emp_id===user?.emp_id) payrollApi.list({emp_id:user.emp_id}).then(d=>setPayroll(d.payroll||[])).catch(()=>{}) },
    'attendance:updated':      row        => { if(row.emp_id===user?.emp_id) setTodayAtt(row) },
    'leave:created':           l          => { if(l.emp_id===user?.emp_id) setMyLeaves(p=>[l,...p]) },
    'leave:updated':           l          => { if(l.emp_id===user?.emp_id) setMyLeaves(p=>p.map(x=>x.id===l.id?{...x,...l}:x)) },
  })

  if (!user||user.role!=='driver') return null

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#F8F7F4', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <img src="/logo.webp" alt="GCD" style={{ width:52, height:52, borderRadius:14, objectFit:'contain', background:'#fff', padding:3, margin:'0 auto 14px', display:'block', boxShadow:'0 4px 16px rgba(184,134,11,0.2)' }}/>
        <div style={{ fontSize:13, color:'#A89880', fontWeight:500 }}>Loading your portal…</div>
      </div>
    </div>
  )

  const ytd         = payroll.filter(p=>p.payroll_status==='paid').reduce((s,p)=>s+Number(p.net_pay||0),0)
  const pendingLeav = myLeaves.filter(l=>l.status==='pending').length
  const latestSlip  = payroll[0]
  const latestNet   = latestSlip ? Number(latestSlip.net_pay||(Number(latestSlip.base_salary)+Number(latestSlip.bonus_total||0)-Number(latestSlip.deduction_total||0))) : 0

  const TABS = [
    { id:'home',    label:'Home',     icon:Package   },
    { id:'payroll', label:'Payslips', icon:Wallet    },
    { id:'leaves',  label:'Leaves',   icon:Calendar  },
    { id:'vehicle', label:'Vehicle',  icon:Car       },
    { id:'notices', label:'Notices',  icon:Bell      },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#F8F7F4', paddingBottom:80 }}>

      {/* ── Dark hero header ── */}
      <div style={{ background:'linear-gradient(135deg,#1A1612 0%,#2C1F0A 100%)', padding:'0 0 24px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-30, top:-30, width:200, height:200, borderRadius:'50%', background:'rgba(184,134,11,0.1)' }}/>
        <div style={{ position:'absolute', left:-20, bottom:-40, width:140, height:140, borderRadius:'50%', background:'rgba(184,134,11,0.06)' }}/>

        {/* Top bar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <img src="/logo.webp" alt="GCD" style={{ width:34, height:34, borderRadius:9, objectFit:'contain', background:'#fff', padding:2 }}/>
            <div>
              <div style={{ fontWeight:800, fontSize:13, color:'white' }}>Golden Crescent</div>
              <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.45)', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase' }}>DA Portal</div>
            </div>
          </div>
          <button onClick={()=>{logout();router.replace('/login')}}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:20, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.7)', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
            <LogOut size={13}/> Sign Out
          </button>
        </div>

        {/* Profile */}
        <div style={{ padding:'0 20px', position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
            <div style={{ width:56, height:56, borderRadius:18, background:'linear-gradient(135deg,#B8860B,#D4A017)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:900, color:'white', flexShrink:0, boxShadow:'0 4px 16px rgba(184,134,11,0.4)' }}>
              {user.name?.slice(0,1).toUpperCase()}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:18, color:'white', letterSpacing:'-0.02em' }}>{user.name}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginTop:2 }}>
                {profile?.role||'Driver'} · {profile?.station_code||'—'}
              </div>
            </div>
            {todayAtt ? (
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:10, color:todayAtt.status==='present'?'#4ADE80':'#FCA5A5', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  {todayAtt.status==='present'?'● Present':'● Absent'}
                </div>
                {todayAtt.cycle && <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:1 }}>Cycle {todayAtt.cycle}</div>}
              </div>
            ) : <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>Not logged</div>}
          </div>

          {/* KPI strip */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {[
              { l:'This Month',  v:`AED ${fmt(latestNet)}`,  c:'#D4A017'  },
              { l:'YTD Earned',  v:`AED ${fmt(ytd)}`,        c:'#4ADE80'  },
              { l:'Leave Days',  v:`${myLeaves.filter(l=>l.status==='approved').reduce((s,l)=>s+Number(l.days||0),0)}d`, c:'#93C5FD' },
            ].map(s=>(
              <div key={s.l} style={{ background:'rgba(255,255,255,0.08)', borderRadius:12, padding:'11px 10px', textAlign:'center', backdropFilter:'blur(10px)' }}>
                <div style={{ fontWeight:800, fontSize:15, color:s.c, letterSpacing:'-0.02em' }}>{s.v}</div>
                <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.4)', marginTop:3, fontWeight:600 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth:540, margin:'0 auto', padding:'16px 14px' }}>

        {/* ── HOME TAB ── */}
        {tab==='home' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Today card */}
            {todayAtt && (
              <div style={{ background:'linear-gradient(135deg,#FDF6E3,#FEF9F0)', border:'1px solid #F0D78C', borderRadius:16, padding:'16px' }}>
                <div style={{ fontSize:10, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', color:'#B8860B', marginBottom:10 }}>Today's Shift</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                  {[
                    { l:'Cycle',    v:todayAtt.cycles?.join('+') || todayAtt.cycle || '—' },
                    { l:'Hours',    v:`${todayAtt.total_hours||todayAtt.cycle_hours||0}h` },
                    { l:'Earned',   v:`AED ${parseFloat(todayAtt.earnings||0).toFixed(0)}` },
                  ].map(s=>(
                    <div key={s.l} style={{ textAlign:'center' }}>
                      <div style={{ fontWeight:800, fontSize:18, color:'#B8860B', letterSpacing:'-0.02em' }}>{s.v}</div>
                      <div style={{ fontSize:10, color:'#A89880', fontWeight:600, marginTop:3 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current vehicle */}
            {myVehicle && (
              <div style={{ background:'linear-gradient(135deg,#ECFDF5,#F0FFF8)', border:'1px solid #A7F3D0', borderRadius:16, padding:'16px' }}>
                <div style={{ fontSize:10, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', color:'#2E7D52', marginBottom:8 }}>Current Vehicle</div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontWeight:900, fontSize:20, color:'#1A1612', letterSpacing:'-0.03em' }}>{myVehicle.vehicle_plate}</div>
                    <div style={{ fontSize:12, color:'#6B5D4A', marginTop:2 }}>{[myVehicle.make,myVehicle.model].filter(Boolean).join(' ')}</div>
                    <div style={{ fontSize:11, color:'#A89880', marginTop:3 }}>Since {new Date(myVehicle.submitted_at).toLocaleString('en-AE',{dateStyle:'short',timeStyle:'short'})}</div>
                  </div>
                  <div style={{ width:48, height:48, borderRadius:14, background:'rgba(46,125,82,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Truck size={22} color="#2E7D52"/>
                  </div>
                </div>
                <button onClick={()=>setHandoverModal({type:'returned',vehicle:myVehicle})}
                  style={{ marginTop:12, width:'100%', padding:'9px', borderRadius:10, background:'rgba(192,57,43,0.1)', border:'1.5px solid #FCA5A5', color:'#C0392B', fontWeight:700, fontSize:12.5, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
                  Return Vehicle
                </button>
              </div>
            )}

            {/* Quick actions */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { l:'Apply Leave', icon:Calendar, c:'#B8860B', bg:'#FDF6E3', bc:'#F0D78C', fn:()=>setLeaveModal(true) },
                { l:'Log Handover',icon:Car,      c:'#1D6FA4', bg:'#EFF6FF', bc:'#BFDBFE', fn:()=>setHandoverModal({type:'received',vehicle:null}) },
                { l:'My Payslips', icon:Wallet,   c:'#2E7D52', bg:'#ECFDF5', bc:'#A7F3D0', fn:()=>setTab('payroll') },
                { l:'Notices',     icon:Bell,     c:'#7C3AED', bg:'#F5F3FF', bc:'#DDD6FE', fn:()=>setTab('notices'), badge:announcements.length },
              ].map(item => {
                const Icon = item.icon
                return (
                  <button key={item.l} onClick={item.fn}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'14px', borderRadius:14, background:item.bg, border:`1.5px solid ${item.bc}`, cursor:'pointer', fontFamily:'Poppins,sans-serif', textAlign:'left', position:'relative', transition:'transform 0.15s' }}
                    onMouseEnter={e=>e.currentTarget.style.transform='scale(1.02)'}
                    onMouseLeave={e=>e.currentTarget.style.transform='none'}>
                    <div style={{ width:40, height:40, borderRadius:12, background:`${item.c}20`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon size={18} color={item.c}/>
                    </div>
                    <span style={{ fontWeight:700, fontSize:13, color:item.c }}>{item.l}</span>
                    {item.badge>0 && <div style={{ position:'absolute', top:10, right:10, width:18, height:18, borderRadius:'50%', background:item.c, color:'white', fontSize:10, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>{item.badge}</div>}
                  </button>
                )
              })}
            </div>

            {/* Doc expiry alerts */}
            {profile && [['Visa',profile.visa_expiry],['License',profile.license_expiry],['ILOE',profile.iloe_expiry]].some(([,d])=>{
              if (!d) return false
              return Math.round((new Date(d.slice(0,10))-new Date())/86400000) <= 90
            }) && (
              <div className="card" style={{ padding:'14px 16px' }}>
                <div style={{ fontSize:11, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color:'#B45309', marginBottom:10 }}>Document Alerts</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                  {[['Visa',profile.visa_expiry],['License',profile.license_expiry],['ILOE',profile.iloe_expiry]].map(([l,d])=>{
                    if (!d) return null
                    const days = Math.round((new Date(d.slice(0,10))-new Date())/86400000)
                    const c = days<0?'#C0392B':days<=60?'#C0392B':days<=90?'#B45309':'#2E7D52'
                    const bg= days<=60?'#FEF2F2':days<=90?'#FFFBEB':'#ECFDF5'
                    return (
                      <div key={l} style={{ textAlign:'center', padding:'10px 6px', borderRadius:11, background:bg }}>
                        <div style={{ fontSize:10, color:c, fontWeight:700, marginBottom:3 }}>{l}</div>
                        <div style={{ fontSize:11, color:c, fontWeight:800 }}>{days<0?'Expired':days<=90?`${days}d`:'Valid'}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Latest payslip preview */}
            {latestSlip && (
              <div className="card" style={{ padding:0, overflow:'hidden' }}>
                <div style={{ background:'linear-gradient(135deg,#1A1612,#2C1F0A)', padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>Latest Payslip</div>
                    <div style={{ fontWeight:700, fontSize:13, color:'white', marginTop:2 }}>{latestSlip.month}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontWeight:900, fontSize:20, color:'#D4A017', letterSpacing:'-0.03em' }}>AED {fmt(latestNet)}</div>
                    <span style={{ fontSize:10, fontWeight:700, color:latestSlip.payroll_status==='paid'?'#4ADE80':'#FCD34D' }}>
                      {latestSlip.payroll_status==='paid'?'✓ Paid':'Pending'}
                    </span>
                  </div>
                </div>
                <div style={{ padding:'12px 16px' }}>
                  {[
                    { l:'Base Salary', v:`AED ${fmt(latestSlip.base_salary)}`, c:'#1A1612' },
                    Number(latestSlip.bonus_total)>0 && { l:'Bonuses', v:`+AED ${fmt(latestSlip.bonus_total)}`, c:'#2E7D52' },
                    Number(latestSlip.deduction_total)>0 && { l:'Deductions', v:`-AED ${fmt(latestSlip.deduction_total)}`, c:'#C0392B' },
                  ].filter(Boolean).map(s=>(
                    <div key={s.l} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #F5F4F1' }}>
                      <span style={{ fontSize:12.5, color:'#A89880' }}>{s.l}</span>
                      <span style={{ fontSize:12.5, fontWeight:700, color:s.c }}>{s.v}</span>
                    </div>
                  ))}
                  <button onClick={()=>setTab('payroll')} style={{ width:'100%', marginTop:12, padding:'9px', borderRadius:10, background:'#FAFAF8', border:'1px solid #EAE6DE', color:'#B8860B', fontWeight:700, fontSize:12.5, cursor:'pointer', fontFamily:'Poppins,sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                    View All Payslips <ChevronRight size={13}/>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PAYSLIPS TAB ── */}
        {tab==='payroll' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {/* YTD summary */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ background:'linear-gradient(135deg,#FDF6E3,#FEF9F0)', border:'1px solid #F0D78C', borderRadius:14, padding:'14px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'#B8860B', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>YTD Earned</div>
                <div style={{ fontSize:20, fontWeight:900, color:'#B8860B', letterSpacing:'-0.03em' }}>AED {fmt(ytd)}</div>
              </div>
              <div style={{ background:'linear-gradient(135deg,#ECFDF5,#F0FFF8)', border:'1px solid #A7F3D0', borderRadius:14, padding:'14px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'#2E7D52', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Monthly Base</div>
                <div style={{ fontSize:20, fontWeight:900, color:'#2E7D52', letterSpacing:'-0.03em' }}>AED {fmt(profile?.salary||0)}</div>
              </div>
            </div>

            {payroll.length===0 ? (
              <div style={{ textAlign:'center', padding:'50px 20px', color:'#A89880' }}>
                <Wallet size={40} style={{ margin:'0 auto 12px', display:'block', opacity:0.2 }}/>
                <div style={{ fontWeight:600, color:'#6B5D4A' }}>No payslips yet</div>
              </div>
            ) : (
              <Slider items={payroll} itemWidth="calc(100% - 0px)" gap={0} renderItem={(slip,i)=>{
                const net    = Number(slip.net_pay||(Number(slip.base_salary)+Number(slip.bonus_total||0)-Number(slip.deduction_total||0)))
                const isPaid = slip.payroll_status==='paid'
                return (
                  <div style={{ background:'#FFF', border:`1.5px solid ${isPaid?'#A7F3D0':'#EAE6DE'}`, borderRadius:16, overflow:'hidden', margin:'0 2px' }}>
                    {/* Header */}
                    <div style={{ background:isPaid?'linear-gradient(135deg,#ECFDF5,#F0FFF8)':'linear-gradient(135deg,#FAFAF8,#F5F4F1)', padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:16, color:'#1A1612' }}>{slip.month}</div>
                        <div style={{ fontSize:11, color:isPaid?'#2E7D52':'#B45309', fontWeight:700, marginTop:2 }}>{isPaid?'✓ Paid':'⏳ Pending'}</div>
                      </div>
                      <div style={{ fontWeight:900, fontSize:24, color:isPaid?'#2E7D52':'#B8860B', letterSpacing:'-0.04em' }}>AED {fmt(net)}</div>
                    </div>
                    {/* Breakdown */}
                    <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:6 }}>
                      {[
                        { l:'Base Salary', v:`AED ${fmt(slip.base_salary)}`, c:'#1A1612' },
                        Number(slip.bonus_total)>0 && { l:'Bonuses', v:`+AED ${fmt(slip.bonus_total)}`, c:'#2E7D52' },
                        Number(slip.deduction_total)>0 && { l:'Deductions', v:`-AED ${fmt(slip.deduction_total)}`, c:'#C0392B' },
                      ].filter(Boolean).map(s=>(
                        <div key={s.l} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #F5F4F1' }}>
                          <span style={{ fontSize:13, color:'#A89880' }}>{s.l}</span>
                          <span style={{ fontSize:13, fontWeight:700, color:s.c }}>{s.v}</span>
                        </div>
                      ))}
                      {/* Deduction detail */}
                      {slip.deductions?.length>0 && (
                        <div style={{ marginTop:8, background:'#FEF7F6', borderRadius:10, border:'1px solid #FCA5A530', padding:'10px 12px' }}>
                          <div style={{ fontSize:10, fontWeight:800, color:'#C0392B', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Deduction Details</div>
                          {slip.deductions.map(d=>(
                            <div key={d.id} style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                              <div>
                                <div style={{ fontSize:12, fontWeight:600, color:DED_COLORS[d.type]||'#C0392B' }}>{DED_LABELS[d.type]||d.type}</div>
                                {d.description && <div style={{ fontSize:10.5, color:'#A89880' }}>{d.description}</div>}
                              </div>
                              <span style={{ fontSize:12, fontWeight:700, color:'#C0392B' }}>-AED {fmt(d.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Bonus detail */}
                      {slip.bonuses?.length>0 && (
                        <div style={{ marginTop:8, background:'#F0FDF4', borderRadius:10, border:'1px solid #A7F3D030', padding:'10px 12px' }}>
                          <div style={{ fontSize:10, fontWeight:800, color:'#2E7D52', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Bonus Details</div>
                          {slip.bonuses.map(b=>(
                            <div key={b.id} style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                              <div>
                                <div style={{ fontSize:12, fontWeight:600, color:BON_COLORS[b.type]||'#2E7D52' }}>{b.type}</div>
                                {b.description && <div style={{ fontSize:10.5, color:'#A89880' }}>{b.description}</div>}
                              </div>
                              <span style={{ fontSize:12, fontWeight:700, color:'#2E7D52' }}>+AED {fmt(b.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              }}/>
            )}
          </div>
        )}

        {/* ── LEAVES TAB ── */}
        {tab==='leaves' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:'#1A1612' }}>Leave Requests</div>
                <div style={{ fontSize:12, color:'#A89880', marginTop:2 }}>{pendingLeav>0?`${pendingLeav} pending approval`:''}</div>
              </div>
              <button className="btn btn-primary" style={{ borderRadius:20, fontSize:12 }} onClick={()=>setLeaveModal(true)}>
                <Plus size={13}/> Apply
              </button>
            </div>

            {/* Status legend */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {[
                { l:'Approved', c:'#2E7D52', bg:'#ECFDF5' },
                { l:'Pending',  c:'#B45309', bg:'#FFFBEB' },
                { l:'Rejected', c:'#C0392B', bg:'#FEF2F2' },
              ].map(s=>(
                <div key={s.l} style={{ fontSize:11, fontWeight:600, color:s.c, background:s.bg, borderRadius:20, padding:'3px 10px' }}>
                  {myLeaves.filter(l=>l.status===s.l.toLowerCase()).length} {s.l}
                </div>
              ))}
            </div>

            {myLeaves.length===0 ? (
              <div style={{ textAlign:'center', padding:'50px 20px', color:'#A89880' }}>
                <Calendar size={40} style={{ margin:'0 auto 12px', display:'block', opacity:0.2 }}/>
                <div style={{ fontWeight:600, color:'#6B5D4A' }}>No leave requests yet</div>
              </div>
            ) : myLeaves.map((l,i)=>{
              const tc = TYPE_COLORS[l.type]||'#A89880'
              const sc = {approved:'#2E7D52',rejected:'#C0392B',pending:'#B45309'}[l.status]
              const sbg= {approved:'#ECFDF5',rejected:'#FEF2F2',pending:'#FFFBEB'}[l.status]
              return (
                <div key={l.id} style={{ background:'#FFF', border:`1px solid ${sc}30`, borderRadius:14, overflow:'hidden', animation:`slideUp 0.3s ${i*0.04}s ease both` }}>
                  <div style={{ height:4, background:`linear-gradient(90deg,${tc},${tc}88)` }}/>
                  <div style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <span style={{ fontWeight:700, fontSize:14, color:tc }}>{l.type}</span>
                        <span style={{ fontSize:12, color:'#A89880', marginLeft:8 }}>{l.days} day{l.days!==1?'s':''}</span>
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, color:sc, background:sbg, borderRadius:20, padding:'3px 10px' }}>{l.status}</span>
                    </div>
                    <div style={{ fontSize:12, color:'#6B5D4A', marginTop:5, display:'flex', alignItems:'center', gap:5 }}>
                      <Calendar size={11}/> {l.from_date} → {l.to_date}
                    </div>
                    {l.reason && <div style={{ fontSize:12, color:'#A89880', marginTop:4 }}>{l.reason}</div>}
                    {/* Approval stages */}
                    {l.poc_status && (
                      <div style={{ display:'flex', gap:5, marginTop:8, flexWrap:'wrap' }}>
                        {[
                          { l:'POC', s:l.poc_status },
                          { l:'HR/GM', s:l.hr_status||'waiting' },
                          { l:'Manager', s:l.mgr_status||'waiting' },
                        ].map(stage=>(
                          <div key={stage.l} style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:6,
                            color:stage.s==='approved'?'#2E7D52':stage.s==='rejected'?'#C0392B':stage.s==='pending'?'#1D6FA4':'#A89880',
                            background:stage.s==='approved'?'#ECFDF5':stage.s==='rejected'?'#FEF2F2':stage.s==='pending'?'#EFF6FF':'#F5F4F1',
                          }}>{stage.l}: {stage.s}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── VEHICLE TAB ── */}
        {tab==='vehicle' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {myVehicle ? (
              <div style={{ background:'linear-gradient(135deg,#1A1612,#2C1F0A)', borderRadius:18, padding:'20px', color:'white', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', right:-20, top:-20, width:120, height:120, borderRadius:'50%', background:'rgba(46,125,82,0.15)' }}/>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Currently With You</div>
                <div style={{ fontWeight:900, fontSize:28, color:'white', letterSpacing:'-0.03em', marginBottom:4 }}>{myVehicle.vehicle_plate}</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginBottom:4 }}>{[myVehicle.make,myVehicle.model].filter(Boolean).join(' ')}</div>
                <div style={{ fontSize:11, color:'#4ADE80', fontWeight:600 }}>● Active since {new Date(myVehicle.submitted_at).toLocaleString('en-AE',{dateStyle:'medium',timeStyle:'short'})}</div>
                <button onClick={()=>setHandoverModal({type:'returned',vehicle:myVehicle})}
                  style={{ marginTop:16, width:'100%', padding:'12px', borderRadius:12, background:'rgba(192,57,43,0.2)', border:'1.5px solid rgba(239,68,68,0.5)', color:'#FCA5A5', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
                  Return This Vehicle
                </button>
              </div>
            ) : (
              <div style={{ background:'#FAFAF8', border:'1.5px dashed #EAE6DE', borderRadius:16, padding:'24px', textAlign:'center' }}>
                <Truck size={36} style={{ margin:'0 auto 10px', display:'block', opacity:0.2 }}/>
                <div style={{ fontWeight:600, color:'#6B5D4A', marginBottom:4 }}>No vehicle assigned</div>
                <div style={{ fontSize:12, color:'#A89880' }}>Submit a handover when you receive a vehicle</div>
              </div>
            )}

            <button onClick={()=>setHandoverModal({type:'received',vehicle:null})} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', borderRadius:14, padding:'13px', fontSize:14 }}>
              <Car size={15}/> New Handover Record
            </button>

            {myHandovers.length>0 && (
              <>
                <div style={{ fontWeight:700, fontSize:14, color:'#1A1612', marginTop:4 }}>Handover History</div>
                <Slider items={myHandovers} itemWidth="calc(100% - 4px)" gap={0} renderItem={(h,i)=>(
                  <div style={{ background:'#FFF', border:'1px solid #EAE6DE', borderRadius:14, overflow:'hidden', margin:'0 2px' }}>
                    <div style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                        <div>
                          <div style={{ fontWeight:800, fontSize:15, color:'#1A1612' }}>{h.vehicle_plate}</div>
                          <div style={{ fontSize:11, color:'#A89880', marginTop:1 }}>{[h.make,h.model].filter(Boolean).join(' ')}</div>
                        </div>
                        <span style={{ fontSize:11, fontWeight:700, color:h.type==='received'?'#2E7D52':'#B8860B', background:h.type==='received'?'#ECFDF5':'#FDF6E3', borderRadius:20, padding:'3px 10px' }}>
                          {h.type==='received'?'Received':'Returned'}
                        </span>
                      </div>
                      <div style={{ fontSize:11.5, color:'#6B5D4A', marginBottom:4 }}>{new Date(h.submitted_at).toLocaleString('en-AE',{dateStyle:'medium',timeStyle:'short'})}</div>
                      {h.fuel_level && <div style={{ fontSize:11, color:'#A89880' }}>Fuel: {h.fuel_level.replace('_',' ')}</div>}
                      {h.condition_note && <div style={{ fontSize:11.5, color:'#6B5D4A', marginTop:4, padding:'6px 10px', background:'#FAFAF8', borderRadius:8 }}>{h.condition_note}</div>}
                      {[h.photo_1,h.photo_2,h.photo_3,h.photo_4].filter(Boolean).length>0 && (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginTop:10 }}>
                          {[h.photo_1,h.photo_2,h.photo_3,h.photo_4].filter(Boolean).map((url,pi)=>(
                            <a key={pi} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt="" style={{ width:'100%', aspectRatio:'1', objectFit:'cover', borderRadius:9, border:'1px solid #EAE6DE' }}/>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}/>
              </>
            )}
          </div>
        )}

        {/* ── NOTICES TAB ── */}
        {tab==='notices' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {announcements.length===0 ? (
              <div style={{ textAlign:'center', padding:'50px 20px', color:'#A89880' }}>
                <Bell size={40} style={{ margin:'0 auto 12px', display:'block', opacity:0.2 }}/>
                <div style={{ fontWeight:600, color:'#6B5D4A' }}>No announcements yet</div>
              </div>
            ) : announcements.map((ann,i)=>(
              <div key={ann.id} style={{ background:'#FFF', border:'1px solid #EAE6DE', borderRadius:14, overflow:'hidden', animation:`slideUp 0.3s ${i*0.05}s ease both`, position:'relative' }}>
                <div style={{ position:'absolute', top:0, left:0, width:4, height:'100%', background:'linear-gradient(180deg,#B8860B,#D4A017)' }}/>
                <div style={{ padding:'14px 14px 14px 18px' }}>
                  <div style={{ fontWeight:700, fontSize:14, color:'#1A1612', marginBottom:6 }}>{ann.title}</div>
                  <div style={{ fontSize:13, color:'#6B5D4A', lineHeight:1.6 }}>{ann.body}</div>
                  <div style={{ fontSize:10.5, color:'#C4B49A', marginTop:8 }}>{new Date(ann.created_at).toLocaleString('en-AE',{dateStyle:'medium',timeStyle:'short'})}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom nav ── */}
      <nav style={{ position:'fixed', bottom:0, left:0, right:0, background:'#FFF', borderTop:'1px solid #EAE6DE', display:'flex', padding:'8px 0 10px', boxShadow:'0 -4px 20px rgba(0,0,0,0.06)', zIndex:100 }}>
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, background:'none', border:'none', cursor:'pointer', color:active?'#B8860B':'#A89880', fontFamily:'Poppins,sans-serif', position:'relative', padding:'4px 0', transition:'color 0.2s' }}>
              {active && <div style={{ position:'absolute', top:-8, left:'50%', transform:'translateX(-50%)', width:24, height:3, background:'linear-gradient(90deg,#B8860B,#D4A017)', borderRadius:'0 0 3px 3px' }}/>}
              <Icon size={20} strokeWidth={active?2.5:1.8}/>
              <span style={{ fontSize:9.5, fontWeight:active?700:500 }}>{t.label}</span>
              {t.id==='notices' && announcements.length>0 && !active && (
                <div style={{ position:'absolute', top:2, right:'calc(50% - 16px)', width:7, height:7, borderRadius:'50%', background:'#C0392B' }}/>
              )}
              {t.id==='leaves' && pendingLeav>0 && !active && (
                <div style={{ position:'absolute', top:2, right:'calc(50% - 16px)', width:7, height:7, borderRadius:'50%', background:'#B45309' }}/>
              )}
            </button>
          )
        })}
      </nav>

      {handoverModal && <HandoverModal modal={handoverModal} user={user} onClose={()=>setHandoverModal(false)} onSave={()=>{setHandoverModal(false);loadHandovers(localStorage.getItem('gcd_token'))}}/>}
      {leaveModal && <LeaveModal onClose={()=>setLeaveModal(false)} onSave={()=>{setLeaveModal(false);leaveApi.list({emp_id:user.emp_id}).then(d=>setMyLeaves(d.leaves||[])).catch(()=>{})}}/>}
    </div>
  )
}