'use client'
import HandoverModal from '@/components/HandoverModal'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { leaveApi } from '@/lib/api'
import {
  LogOut, Calendar, Bell, Plus, Car, Wallet,
  BarChart2, Home, ChevronRight, Check, X, Clock,
  TrendingUp, Shield, Package, FileText, ExternalLink, ZoomIn,
  Phone, Mail, MapPin, Users, CreditCard, User, Building2,
  Camera, Fuel, ArrowLeftRight
} from 'lucide-react'
import { useSocket } from '@/lib/socket'
import { listenForSWReplay } from '@/lib/offline'
import { API } from '@/lib/api'
import { differenceInDays, parseISO } from 'date-fns'

// ── Helpers ──────────────────────────────────────────────────────
const TYPE_COLORS = { Annual:'#B8860B', Sick:'#2563EB', Emergency:'#DC2626', Unpaid:'#6B7280', Other:'#6B7280' }
const DED_LABELS  = { traffic_fine:'Traffic Fine', iloe_fee:'ILOE Fee', iloe_fine:'ILOE Fine', cash_variance:'Cash Variance', other:'Other' }

function fmt(n)  { return Number(n || 0).toLocaleString('en-US') }
function fmtA(n) { return `AED ${fmt(n)}` }

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('gcd_token')}` }
}

function findCurrentVehicle(handovers) {
  return handovers.find(h =>
    h.type === 'received' &&
    !handovers.find(h2 =>
      h2.vehicle_id === h.vehicle_id &&
      h2.type === 'returned' &&
      new Date(h2.submitted_at) > new Date(h.submitted_at)
    )
  ) || null
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

function getGrade(s) {
  if (s >= 92) return { label:'Fantastic+', c:'#10B981' }
  if (s >= 85) return { label:'Fantastic',  c:'#2563EB' }
  if (s >= 70) return { label:'Great',      c:'#F59E0B' }
  if (s >= 50) return { label:'Fair',       c:'#F97316' }
  return              { label:'Poor',       c:'#EF4444' }
}

function expiryAlert(ds) {
  if (!ds) return false
  try {
    const d = differenceInDays(parseISO(ds.slice(0,10)), new Date())
    return d < 0 || d <= 30
  } catch { return false }
}

const TABS = [
  { id:'home',      label:'Home',        icon:Home      },
  { id:'pay',       label:'Payslips',    icon:Wallet    },
  { id:'leaves',    label:'Leaves',      icon:Calendar  },
  { id:'perf',      label:'Performance', icon:BarChart2 },
  { id:'vehicle',   label:'Vehicle',     icon:Car       },
  { id:'insurance', label:'Insurance',   icon:Shield    },
  { id:'notices',   label:'Notices',     icon:Bell      },
]

// ── Leave Modal ───────────────────────────────────────────────────
function LeaveModal({ empId, onClose, onSave }) {
  const [form,   setForm]   = useState({ type:'Annual', from_date:'', to_date:'', reason:'' })
  const [saving, setSaving] = useState(false)
  const set  = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const days = form.from_date && form.to_date
    ? Math.max(1, Math.round((new Date(form.to_date) - new Date(form.from_date)) / 86400000) + 1)
    : 0

  async function submit() {
    if (!form.from_date || !form.to_date) return
    setSaving(true)
    try   { await leaveApi.create({ ...form, emp_id: empId, days }); onSave() }
    catch (e) { alert(e.message) }
    finally   { setSaving(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:300, display:'flex', alignItems:'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width:'100%', maxWidth:480, margin:'0 auto', background:'#FFF', borderRadius:'20px 20px 0 0', padding:'20px 20px 40px', boxShadow:'0 -4px 30px rgba(0,0,0,0.12)' }}>
        <div style={{ width:36, height:4, background:'#E5E7EB', borderRadius:2, margin:'0 auto 20px' }}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ fontWeight:700, fontSize:17, color:'#111', margin:0 }}>Apply for Leave</h3>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, background:'#F3F4F6', border:'none', cursor:'pointer', fontSize:18, color:'#6B7280' }}>×</button>
        </div>
        <div style={{ display:'flex', gap:7, marginBottom:16, flexWrap:'wrap' }}>
          {['Annual','Sick','Emergency','Unpaid'].map(t => (
            <button key={t} onClick={() => set('type', t)}
              style={{ padding:'7px 14px', borderRadius:20, border:`1.5px solid ${form.type===t ? TYPE_COLORS[t] : '#E5E7EB'}`, background:form.type===t ? `${TYPE_COLORS[t]}12` : '#FFF', color:form.type===t ? TYPE_COLORS[t] : '#6B7280', fontWeight:600, fontSize:12.5, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>{t}</button>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          {[['From','from_date'], ['To','to_date']].map(([l, k]) => (
            <div key={k}>
              <label style={{ fontSize:11, fontWeight:600, color:'#6B7280', display:'block', marginBottom:5 }}>{l}</label>
              <input type="date" value={form[k]} onChange={e => set(k, e.target.value)}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #E5E7EB', fontSize:13, fontFamily:'Poppins,sans-serif', outline:'none', boxSizing:'border-box', background:'#F9FAFB' }}/>
            </div>
          ))}
        </div>
        {days > 0 && (
          <div style={{ textAlign:'center', fontSize:13, fontWeight:600, color:'#B8860B', background:'#FFFBEB', borderRadius:10, padding:'8px', marginBottom:12 }}>
            {days} day{days > 1 ? 's' : ''}
          </div>
        )}
        <input value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="Reason (optional)"
          style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #E5E7EB', fontSize:13, fontFamily:'Poppins,sans-serif', outline:'none', boxSizing:'border-box', background:'#F9FAFB', marginBottom:14 }}/>
        <button onClick={submit} disabled={saving || !form.from_date || !form.to_date}
          style={{ width:'100%', padding:'13px', borderRadius:12, background:'#B8860B', color:'#FFF', fontWeight:700, fontSize:14, border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', opacity: saving || !form.from_date || !form.to_date ? 0.6 : 1 }}>
          {saving ? 'Submitting…' : 'Submit Request'}
        </button>
      </div>
    </div>
  )
}

// ── Status pill ───────────────────────────────────────────────────
function Pill({ label, color }) {
  const c = color || '#6B7280'
  return <span style={{ fontSize:11, fontWeight:600, color:c, background:`${c}15`, borderRadius:20, padding:'2px 9px', display:'inline-block' }}>{label}</span>
}

// ── Section card ──────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{ background:'#FFF', borderRadius:16, border:'1px solid #F0F0EE', padding:'16px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', ...style }}>
      {children}
    </div>
  )
}

// ── Mini info row ─────────────────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'6px 0', borderBottom:'1px solid #F3F4F6', gap:8 }}>
      <span style={{ fontSize:11.5, color:'#9CA3AF', flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:12, fontWeight:600, color: value ? '#111' : '#D1D5DB', textAlign:'right', wordBreak:'break-word' }}>{value || '—'}</span>
    </div>
  )
}

// ── Image helpers (shared with CompleteHandoverSheet) ─────────────
function dataUrlToFile(dataUrl, name) {
  const [header, b64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)[1]
  const raw  = atob(b64)
  const buf  = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i)
  return new File([buf], name, { type: mime })
}

function compressImage(file, maxBytes = 300 * 1024) {
  return new Promise(resolve => {
    const img = new Image()
    const src = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(src)
      let { width: w, height: h } = img
      const MAX_PX = 1024
      if (w >= h && w > MAX_PX) { h = Math.round(h * MAX_PX / w); w = MAX_PX }
      else if (h > MAX_PX)      { w = Math.round(w * MAX_PX / h); h = MAX_PX }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      const name = file.name.replace(/\.[^.]+$/, '.jpg')
      for (let q = 0.85; q >= 0.15; q = Math.round((q - 0.1) * 100) / 100) {
        const dataUrl  = canvas.toDataURL('image/jpeg', q)
        const byteSize = Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4)
        if (byteSize <= maxBytes || q <= 0.15) return resolve(dataUrlToFile(dataUrl, name))
      }
      resolve(dataUrlToFile(canvas.toDataURL('image/jpeg', 0.15), name))
    }
    img.onerror = () => { URL.revokeObjectURL(src); resolve(file) }
    img.src = src
  })
}

const FUEL_LEVELS_DRIVER = [
  { v:'empty', l:'Empty', pct:0 }, { v:'quarter', l:'1/4', pct:25 },
  { v:'half',  l:'1/2',  pct:50 }, { v:'three_quarter', l:'3/4', pct:75 },
  { v:'full',  l:'Full', pct:100 },
]

// ── Photo slot for CompleteHandoverSheet ──────────────────────────
function DriverPhotoSlot({ index, file, onSelect, onRemove }) {
  const ref = useRef(null)
  const url = file ? URL.createObjectURL(file) : null
  return (
    <div style={{ position:'relative', aspectRatio:'1', borderRadius:10, overflow:'hidden', border:`2px dashed ${file?'#B8860B':'#D1D5DB'}`, background:file?'#000':'#F9FAFB', cursor:'pointer' }}
      onClick={()=>!file && ref.current?.click()}>
      <input ref={ref} type="file" accept="image/*" capture="environment" style={{ display:'none' }}
        onChange={e=>{ if(e.target.files[0]) onSelect(index, e.target.files[0]) }}/>
      {file ? (
        <>
          <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          <button onClick={e=>{ e.stopPropagation(); onRemove(index) }}
            style={{ position:'absolute', top:3, right:3, width:20, height:20, borderRadius:'50%', background:'rgba(0,0,0,0.7)', border:'none', color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>×</button>
        </>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:3 }}>
          <Camera size={18} color="#9CA3AF"/>
          <span style={{ fontSize:9, color:'#9CA3AF', fontWeight:600 }}>{['Front','Back','Left','Right'][index]}</span>
        </div>
      )}
    </div>
  )
}

// ── Complete Handover Sheet (Driver B) ────────────────────────────
function CompleteHandoverSheet({ handover, onClose, onDone }) {
  const [photos,   setPhotos]   = useState([null, null, null, null])
  const [fuel,     setFuel]     = useState(handover.fuel_level || 'half')
  const [odometer, setOdometer] = useState(handover.odometer ? String(handover.odometer) : '')
  const [note,     setNote]     = useState('')
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState(null)
  const [done,     setDone]     = useState(false)

  function setPhoto(i, file) { setPhotos(p => { const n=[...p]; n[i]=file; return n }) }
  function rmPhoto(i)        { setPhotos(p => { const n=[...p]; n[i]=null; return n }) }

  async function submit() {
    if (photos.filter(Boolean).length < 4) return setErr('All 4 photos are required')
    if (!odometer || isNaN(Number(odometer)) || Number(odometer) <= 0) return setErr('Odometer reading is required')
    setSaving(true); setErr(null)
    try {
      const compressed = await Promise.all(photos.filter(Boolean).map(f => compressImage(f)))
      const fd = new FormData()
      fd.append('fuel_level', fuel)
      fd.append('odometer', odometer)
      if (note) fd.append('condition_note', note)
      compressed.forEach(f => fd.append('photos', f))

      const res = await fetch(`${API}/api/handovers/${handover.id}/complete`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('gcd_token')}` },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(true)
      setTimeout(onDone, 1500)
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:300, display:'flex', alignItems:'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width:'100%', maxWidth:480, margin:'0 auto', background:'#FFF', borderRadius:'20px 20px 0 0', padding:'16px 16px 40px', boxShadow:'0 -4px 30px rgba(0,0,0,0.12)', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ width:36, height:4, background:'#E5E7EB', borderRadius:2, margin:'0 auto 16px' }}/>

        {done ? (
          <div style={{ textAlign:'center', padding:'30px 0' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'#ECFDF5', border:'2px solid #A7F3D0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
              <Check size={26} color="#2E7D52"/>
            </div>
            <div style={{ fontWeight:800, fontSize:17, color:'#111', marginBottom:6 }}>Handover Complete!</div>
            <div style={{ fontSize:13, color:'#9CA3AF' }}>Vehicle is now assigned to you.</div>
          </div>
        ) : (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:16, color:'#111' }}>Complete Handover</div>
                <div style={{ fontSize:12, color:'#9CA3AF', marginTop:2 }}>
                  Receiving {handover.vehicle_plate || handover.plate} from {handover.emp_name}
                </div>
              </div>
              <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, background:'#F3F4F6', border:'none', cursor:'pointer', fontSize:18, color:'#6B7280' }}>×</button>
            </div>

            {err && <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:9, padding:'9px 13px', fontSize:12.5, color:'#C0392B', marginBottom:14 }}>{err}</div>}

            {/* Photos */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:6 }}>Vehicle Photos * <span style={{ fontSize:10, fontWeight:400, color:'#9CA3AF' }}>— all 4 required</span></div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7 }}>
                {photos.map((f,i) => <DriverPhotoSlot key={i} index={i} file={f} onSelect={setPhoto} onRemove={rmPhoto}/>)}
              </div>
            </div>

            {/* Fuel */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}><Fuel size={11}/> Fuel Level</div>
              <div style={{ display:'flex', gap:5 }}>
                {FUEL_LEVELS_DRIVER.map(f=>(
                  <button key={f.v} onClick={()=>setFuel(f.v)} type="button"
                    style={{ flex:1, padding:'7px 3px', borderRadius:9, border:`2px solid ${fuel===f.v?'#B8860B':'#E5E7EB'}`, background:fuel===f.v?'#FDF6E3':'#F9FAFB', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:fuel===f.v?'#B8860B':'#9CA3AF' }}>{f.l}</div>
                  </button>
                ))}
              </div>
              <div style={{ marginTop:7, height:7, background:'#F3F4F6', borderRadius:10, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${FUEL_LEVELS_DRIVER.find(f=>f.v===fuel)?.pct||0}%`, background:'linear-gradient(90deg,#B8860B,#D4A017)', borderRadius:10, transition:'width 0.4s ease' }}/>
              </div>
            </div>

            {/* Odometer */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:6 }}>Odometer (km) *</div>
              <input type="number" value={odometer} onChange={e=>setOdometer(e.target.value)} placeholder="e.g. 45230"
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #E5E7EB', fontSize:13, fontFamily:'Poppins,sans-serif', outline:'none', boxSizing:'border-box', background:'#F9FAFB' }}/>
            </div>

            {/* Condition note */}
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:6 }}>Condition Notes <span style={{ fontWeight:400, color:'#9CA3AF' }}>(optional)</span></div>
              <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="Any damage, issues, or notes…"
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #E5E7EB', fontSize:13, fontFamily:'Poppins,sans-serif', outline:'none', boxSizing:'border-box', background:'#F9FAFB', resize:'vertical' }}/>
            </div>

            <button onClick={submit} disabled={saving}
              style={{ width:'100%', padding:'13px', borderRadius:12, background:'linear-gradient(135deg,#2E7D52,#22C55E)', color:'#FFF', fontWeight:700, fontSize:14, border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', opacity:saving?0.7:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {saving ? <><span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Saving…</> : 'Complete Handover'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Google Drive URL → embeddable preview URL ─────────────────────
function toEmbedUrl(url) {
  if (!url) return null
  const m  = url.match(/\/file\/d\/([^/]+)/)
  if (m)  return `https://drive.google.com/file/d/${m[1]}/preview`
  const m2 = url.match(/[?&]id=([^&]+)/)
  if (m2) return `https://drive.google.com/file/d/${m2[1]}/preview`
  return url
}

// ── Insurance Tab ─────────────────────────────────────────────────
function InsuranceTab({ profile }) {
  const [zoomed, setZoomed] = useState(false)
  const embedUrl = toEmbedUrl(profile?.insurance_url)

  if (!embedUrl) {
    return (
      <div className="fade" style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <h2 style={{ fontWeight:700, fontSize:17, color:'#111', margin:0 }}>Insurance Card</h2>
        <Card style={{ textAlign:'center', padding:'40px 20px' }}>
          <div style={{ width:56, height:56, borderRadius:16, background:'#EFF6FF', border:'1px solid #BFDBFE', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
            <Shield size={24} color="#2563EB"/>
          </div>
          <div style={{ fontWeight:700, fontSize:15, color:'#111', marginBottom:6 }}>No insurance card on file</div>
          <div style={{ fontSize:13, color:'#9CA3AF', lineHeight:1.6 }}>
            Your insurance card hasn't been uploaded yet.<br/>Please contact your station admin.
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="fade" style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2 style={{ fontWeight:700, fontSize:17, color:'#111', margin:0 }}>Insurance Card</h2>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setZoomed(true)}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:20, background:'#EFF6FF', border:'1px solid #BFDBFE', color:'#2563EB', fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
            <ZoomIn size={13}/> Full Screen
          </button>
          <a href={profile?.insurance_url} target="_blank" rel="noreferrer"
            style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:20, background:'#FFFBEB', border:'1px solid #FDE68A', color:'#B8860B', fontWeight:600, fontSize:12, fontFamily:'Poppins,sans-serif' }}>
            <ExternalLink size={13}/> Open
          </a>
        </div>
      </div>
      <Card style={{ padding:0, overflow:'hidden', borderRadius:16 }}>
        <iframe src={embedUrl} width="100%" allow="autoplay"
          style={{ border:'none', display:'block', height:'min(480px, 60vh)' }}
          title="Insurance Card"/>
      </Card>
      {zoomed && (
        <div onClick={() => setZoomed(false)}
          style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.92)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:16 }}>
          <button onClick={() => setZoomed(false)}
            style={{ position:'absolute', top:16, right:16, width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'white' }}>
            <X size={16}/>
          </button>
          <iframe src={embedUrl}
            style={{ width:'100%', maxWidth:700, height:'85vh', border:'none', borderRadius:12 }}
            allow="autoplay" title="Insurance Card Full"/>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function DriverPortal() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()

  const [tab,           setTab]           = useState('home')
  const [loading,       setLoading]       = useState(true)
  const [profile,       setProfile]       = useState(null)
  const [payroll,       setPayroll]       = useState(null)
  const [leaves,        setLeaves]        = useState([])
  const [notices,       setNotices]       = useState([])
  const [vehicle,       setVehicle]       = useState(null)
  const [handovers,     setHandovers]     = useState([])
  const [perf,          setPerf]          = useState(null)
  const [todayAsgn,     setTodayAsgn]     = useState(null)
  const [asgHistory,    setAsgHistory]    = useState([])
  const [leaveModal,        setLeaveModal]        = useState(false)
  const [hvModal,           setHvModal]           = useState(null)
  const [pendingHandovers,  setPendingHandovers]  = useState([])
  const [completingHandover,setCompletingHandover]= useState(null)
  const [notifications,     setNotifications]     = useState([])
  const [unreadCount,       setUnreadCount]       = useState(0)
  const [toast,             setToast]             = useState(null)

  function signOut() { logout(); router.replace('/login') }

  const refreshLeaves = useCallback(() => {
    fetch(`${API}/api/leaves`, { headers: authHeader() })
      .then(r => r.json()).then(d => setLeaves(d.leaves || [])).catch(() => {})
  }, [])

  const refreshHandovers = useCallback(() => {
    fetch(`${API}/api/handovers`, { headers: authHeader() })
      .then(r => r.json()).then(d => {
        const list = d.handovers || []
        setHandovers(list)
        setVehicle(findCurrentVehicle(list))
      }).catch(() => {})
  }, [])

  const refreshPending = useCallback(() => {
    fetch(`${API}/api/handovers/pending`, { headers: authHeader() })
      .then(r => r.json()).then(d => setPendingHandovers(d.pending || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login'); return }
    if (user.role !== 'driver') { router.replace('/dashboard/analytics'); return }

    const hdr   = authHeader()
    const month = new Date().toISOString().slice(0, 7)
    const today = new Date().toISOString().slice(0, 10)
    const ctrl  = new AbortController()

    Promise.all([
      fetch(`${API}/api/payroll?month=${month}`,   { headers: hdr, signal: ctrl.signal }).then(r => r.json()).catch(() => ({ payroll: [] })),
      fetch(`${API}/api/employees/${user.emp_id}`, { headers: hdr, signal: ctrl.signal }).then(r => r.json()).catch(() => ({ employee: null })),
    ]).then(([pr, emp]) => {
      const slip = (pr.payroll || []).find(p => p.id === user.emp_id || p.emp_id === user.emp_id)
      setPayroll(slip || null)
      setProfile(emp.employee || null)
      setLoading(false)
    })

    const bg = (url, onData) =>
      fetch(`${API}${url}`, { headers: hdr, signal: ctrl.signal })
        .then(r => r.json()).then(onData).catch(() => {})

    bg(`/api/leaves`,                                       d => setLeaves(d.leaves || []))
    bg(`/api/poc/announcements?station_code=${user.station_code}`, d => setNotices(d.announcements || []))
    bg(`/api/notifications`,                                d => {
      const list = d.notifications || []
      setNotifications(list)
      setUnreadCount(list.filter(n => !n.read).length)
    })
    bg(`/api/handovers`,                                    d => {
      const list = d.handovers || []
      setHandovers(list); setVehicle(findCurrentVehicle(list))
    })
    bg(`/api/handovers/pending`,                           d => setPendingHandovers(d.pending || []))
    bg(`/api/performance/${user.emp_id}`,                   d => setPerf(d.history?.[0] || null))
    bg(`/api/vehicles/assignments/history?emp_id=${user.emp_id}&limit=60`, d => {
      const list = d.history || []
      setAsgHistory(list)
      setTodayAsgn(list.find(a => a.date?.slice(0, 10) === today) || null)
    })

    return () => ctrl.abort()
  }, [user, authLoading, router])

  useSocket({
    'notification:new': (notif) => {
      setNotifications(p => [{ ...notif, read: false }, ...p])
      setUnreadCount(c => c + 1)
      setToast(notif)
      setTimeout(() => setToast(null), 4500)
    }
  })

  useEffect(() => {
    if (!user || user.role !== 'driver') return
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return
    async function registerPush() {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready
        listenForSWReplay()
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return
        let sub = await reg.pushManager.getSubscription()
        if (!sub) {
          const keyRes = await fetch(`${API}/api/notifications/vapid-public-key`)
          const { key } = await keyRes.json()
          if (!key) return
          sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) })
        }
        await fetch(`${API}/api/notifications/subscribe`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify(sub.toJSON()),
        })
      } catch (e) {}
    }
    registerPush()
  }, [user])

  function openNotices() {
    setTab('notices')
    if (unreadCount > 0) {
      setUnreadCount(0)
      setNotifications(p => p.map(n => ({ ...n, read: true })))
      fetch(`${API}/api/notifications/read-all`, { method:'PATCH', headers: authHeader() }).catch(() => {})
    }
  }

  function handleLeaveSave()    { setLeaveModal(false); refreshLeaves()    }
  function handleHandoverSave() { setHvModal(null);     refreshHandovers(); refreshPending() }
  function handleCompleteDone() { setCompletingHandover(null); refreshHandovers(); refreshPending() }

  if (!user || loading) return (
    <div style={{ minHeight:'100vh', background:'#FFF', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #E5E7EB', borderTopColor:'#B8860B', animation:'spin 0.7s linear infinite', margin:'0 auto 12px' }}/>
        <div style={{ fontSize:13, color:'#9CA3AF' }}>Loading your portal…</div>
      </div>
    </div>
  )

  const net          = payroll ? Number(payroll.base_salary||0) + Number(payroll.bonus_total||0) - Number(payroll.deduction_total||0) : 0
  const grade        = perf ? getGrade(perf.total_score) : null
  const p            = profile
  const serviceDays  = p?.joined ? differenceInDays(new Date(), parseISO(p.joined.slice(0,10))) : 0
  const today2       = new Date().toISOString().slice(0,10)
  const onLeaveNow   = leaves.filter(l => l.status==='approved' && l.from_date<=today2 && l.to_date>=today2).length
  const alertCount   = [p?.visa_expiry, p?.license_expiry, p?.iloe_expiry].filter(expiryAlert).length
  const annualUsed   = leaves.filter(l=>l.type==='Annual'&&l.status==='approved').reduce((s,l)=>s+(l.days||0),0)
  const sickUsed     = leaves.filter(l=>l.type==='Sick'&&l.status==='approved').reduce((s,l)=>s+(l.days||0),0)
  const visaType     = p?.visa_type==='own' ? 'Own Visa' : 'Co. Visa'
  const visaColor    = p?.visa_type==='own' ? '#0369A1' : '#065F46'
  const visaBg       = p?.visa_type==='own' ? '#EFF6FF' : '#ECFDF5'

  return (
    <div style={{ minHeight:'100vh', background:'#F4F4F3', fontFamily:'Poppins,sans-serif', paddingBottom:'calc(68px + env(safe-area-inset-bottom, 0px))' }}>

      {/* ── TOAST ── */}
      {toast && (
        <div onClick={openNotices}
          style={{ position:'fixed', top:16, left:'50%', transform:'translateX(-50%)', zIndex:200, maxWidth:340, width:'calc(100% - 32px)', background:'#1C1208', borderRadius:14, padding:'12px 14px', boxShadow:'0 8px 30px rgba(0,0,0,0.25)', cursor:'pointer', animation:'slideUp 0.3s ease', display:'flex', gap:10, alignItems:'flex-start' }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#B8860B,#D4A017)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Bell size={15} color="#FFF"/>
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:12.5, color:'#FFF', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{toast.title}</div>
            <div style={{ fontSize:11.5, color:'rgba(255,255,255,0.6)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{toast.body}</div>
          </div>
          <button onClick={e => { e.stopPropagation(); setToast(null) }}
            style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', padding:2, flexShrink:0 }}><X size={14}/></button>
        </div>
      )}

      {/* ── CONTENT ── */}
      <div style={{ maxWidth:520, margin:'0 auto', padding:'0 0 8px' }}>

        {/* HOME */}
        {tab === 'home' && (
          <div style={{ display:'flex', flexDirection:'column', gap:0 }} className="fade">

            {/* ── Profile Header ── */}
            <div style={{ background:'linear-gradient(160deg,#1C1208 0%,#2C1F0A 100%)', padding:'20px 16px 0', position:'sticky', top:0, zIndex:50 }}>

              {/* Top bar: avatar + name + sign out */}
              <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:14 }}>
                {/* Avatar */}
                <div style={{ width:52, height:52, borderRadius:26, background:'linear-gradient(135deg,#D4A017,#B8860B)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, color:'#FFF', flexShrink:0, boxShadow:'0 4px 14px rgba(184,134,11,0.4)' }}>
                  {user.name?.slice(0,2).toUpperCase()}
                </div>

                {/* Name + meta */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap', marginBottom:3 }}>
                    <span style={{ fontWeight:900, fontSize:16, color:'#FFF', letterSpacing:'-0.02em' }}>{user.name}</span>
                    <span style={{ fontSize:10, fontWeight:700, color:'#34D399', background:'rgba(52,211,153,0.15)', border:'1px solid rgba(52,211,153,0.3)', borderRadius:20, padding:'2px 8px' }}>Active</span>
                  </div>
                  <div style={{ fontSize:11.5, color:'rgba(255,255,255,0.5)', marginBottom:7 }}>Delivery Associate</div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    <span style={{ fontSize:10.5, fontWeight:700, color:'#D4A017', background:'rgba(212,160,23,0.15)', border:'1px solid rgba(212,160,23,0.3)', borderRadius:20, padding:'2px 8px' }}>{user.station_code||'DDB1'}</span>
                    {p?.project_type && <span style={{ fontSize:10.5, fontWeight:700, color:'#A78BFA', background:'rgba(167,139,250,0.15)', border:'1px solid rgba(167,139,250,0.3)', borderRadius:20, padding:'2px 8px' }}>{p.project_type.toUpperCase()}</span>}
                    {p?.visa_type && <span style={{ fontSize:10.5, fontWeight:600, color:visaColor, background:visaBg, border:`1px solid ${p.visa_type==='own'?'#BAE6FD':'#A7F3D0'}`, borderRadius:20, padding:'2px 8px' }}>{visaType}</span>}
                    {grade && <span style={{ fontSize:10.5, fontWeight:600, color:grade.c, background:`${grade.c}15`, borderRadius:20, padding:'2px 8px' }}>{grade.label}</span>}
                  </div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:5 }}>DA ID: {user.emp_id}</div>
                </div>

                <button onClick={signOut}
                  style={{ display:'flex', alignItems:'center', gap:4, padding:'7px 10px', borderRadius:20, background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#F87171', fontWeight:600, fontSize:11, cursor:'pointer', fontFamily:'Poppins,sans-serif', flexShrink:0 }}>
                  <LogOut size={12}/> Out
                </button>
              </div>

              {/* Stats row */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, background:'rgba(255,255,255,0.06)', borderRadius:'10px 10px 0 0', overflow:'hidden' }}>
                {[
                  { l:'Status',    v:'Active',              sub:`Since ${p?.joined?.slice(0,10)||'—'}`,  c:'#34D399',  bg:'rgba(52,211,153,0.08)'   },
                  { l:'Service',   v:`${serviceDays}d`,      sub:'Total days',                            c:'#60A5FA',  bg:'rgba(96,165,250,0.08)'   },
                  { l:'On Leave',  v:onLeaveNow,             sub:onLeaveNow>0?'Active leave':'None',      c:onLeaveNow>0?'#FBBF24':'rgba(255,255,255,0.3)', bg:'rgba(0,0,0,0.15)' },
                  { l:'Alerts',    v:alertCount,             sub:alertCount>0?'Docs expiring':'Clear',    c:alertCount>0?'#F87171':'rgba(255,255,255,0.3)', bg:'rgba(0,0,0,0.15)' },
                ].map(stat=>(
                  <div key={stat.l} style={{ padding:'9px 8px', background:stat.bg, textAlign:'center' }}>
                    <div style={{ fontWeight:900, fontSize:14, color:stat.c, letterSpacing:'-0.02em' }}>{stat.v}</div>
                    <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.4)', marginTop:1, textTransform:'uppercase', letterSpacing:'0.04em' }}>{stat.l}</div>
                    <div style={{ fontSize:9, color:stat.c, opacity:0.7, marginTop:1 }}>{stat.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Body content */}
            <div style={{ display:'flex', flexDirection:'column', gap:10, padding:'10px 12px' }}>

              {/* Salary card */}
              <Card style={{ background:'linear-gradient(135deg,#1C1208,#2C1F0A)', border:'none' }}>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 }}>
                  This Month · {new Date().toLocaleString('en-US', { month:'long', year:'numeric' })}
                </div>
                <div className="dp-salary" style={{ fontWeight:900, color:'#D4A017', letterSpacing:'-0.04em', marginBottom:4, lineHeight:1.1 }}>{fmtA(net)}</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontSize:11.5, color:'rgba(255,255,255,0.5)' }}>Base {fmtA(payroll?.base_salary||0)}</span>
                  {Number(payroll?.bonus_total)>0     && <span style={{ fontSize:11.5, color:'#34D399' }}>+{fmtA(payroll.bonus_total)}</span>}
                  {Number(payroll?.deduction_total)>0 && <span style={{ fontSize:11.5, color:'#F87171' }}>-{fmtA(payroll.deduction_total)}</span>}
                </div>
                <div style={{ marginTop:8 }}>
                  <span style={{ fontSize:11, fontWeight:600, color: payroll?.payroll_status==='paid'?'#34D399':'#FB923C', background: payroll?.payroll_status==='paid'?'rgba(52,211,153,0.15)':'rgba(251,146,60,0.15)', padding:'3px 10px', borderRadius:20 }}>
                    {payroll?.payroll_status==='paid'?'✓ Paid':'Pending'}
                  </span>
                </div>
              </Card>

              {/* Vehicle card */}
              {vehicle ? (
                <Card>
                  <div style={{ fontSize:10.5, fontWeight:700, color:'#10B981', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Current Vehicle</div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <div>
                      <div style={{ fontWeight:800, fontSize:18, color:'#111', letterSpacing:'-0.02em' }}>{vehicle.plate}</div>
                      <div style={{ fontSize:12, color:'#9CA3AF', marginTop:2 }}>
                        {[vehicle.make, vehicle.model].filter(Boolean).join(' ')} · Since {new Date(vehicle.submitted_at).toLocaleDateString('en-AE',{day:'numeric',month:'short'})}
                      </div>
                    </div>
                    <div style={{ width:44, height:44, borderRadius:12, background:'#F0FDF4', display:'flex', alignItems:'center', justifyContent:'center' }}><Car size={20} color="#10B981"/></div>
                  </div>
                  <button onClick={() => setHvModal('returned')}
                    style={{ width:'100%', padding:'10px', borderRadius:10, background:'#FEF2F2', border:'1.5px solid #FECACA', color:'#EF4444', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
                    Return Vehicle
                  </button>
                </Card>
              ) : todayAsgn ? (
                <Card style={{ background:'linear-gradient(135deg,#F0FDF4,#DCFCE7)', border:'1px solid #A7F3D0' }}>
                  <div style={{ fontSize:10.5, fontWeight:700, color:'#10B981', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Assigned Vehicle Today</div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <div>
                      <div style={{ fontWeight:800, fontSize:18, color:'#111', letterSpacing:'-0.02em' }}>{todayAsgn.plate}</div>
                      <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>{[todayAsgn.make,todayAsgn.model].filter(Boolean).join(' ')||'Vehicle'}</div>
                    </div>
                    <div style={{ width:44, height:44, borderRadius:12, background:'#DCFCE7', display:'flex', alignItems:'center', justifyContent:'center' }}><Car size={20} color="#10B981"/></div>
                  </div>
                  <button onClick={() => setHvModal('received')}
                    style={{ width:'100%', padding:'10px', borderRadius:10, background:'#B8860B', color:'#FFF', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'Poppins,sans-serif', border:'none' }}>
                    Confirm Receipt
                  </button>
                </Card>
              ) : (
                <Card style={{ textAlign:'center', padding:'20px' }}>
                  <Car size={24} color="#D1D5DB" style={{ margin:'0 auto 8px', display:'block' }}/>
                  <div style={{ fontSize:13, color:'#9CA3AF', marginBottom:10 }}>No vehicle assigned</div>
                  <button onClick={() => setHvModal('received')}
                    style={{ padding:'8px 20px', borderRadius:10, background:'#B8860B', color:'#FFF', fontWeight:600, fontSize:12, border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
                    Receive Vehicle
                  </button>
                </Card>
              )}

              {/* Pending incoming handovers (Driver B view) */}
              {pendingHandovers.map(ph => {
                const isPendingAccept = ph.status === 'pending_acceptance'
                return (
                  <Card key={ph.id} style={{ background: isPendingAccept ? '#FFF7ED' : '#F0FDF4', border: `1px solid ${isPendingAccept ? '#FED7AA' : '#A7F3D0'}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background: isPendingAccept ? '#FEF3C7' : '#DCFCE7', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <ArrowLeftRight size={16} color={isPendingAccept ? '#D97706' : '#16A34A'}/>
                      </div>
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color: isPendingAccept ? '#D97706' : '#16A34A', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                          {isPendingAccept ? 'Incoming Handover Request' : 'Handover Accepted — Upload Photos'}
                        </div>
                        <div style={{ fontSize:12, color:'#374151', fontWeight:600, marginTop:1 }}>
                          {ph.vehicle_plate || ph.plate} · from {ph.emp_name}
                        </div>
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:10 }}>
                      {[
                        { l:'Vehicle', v: `${ph.make||''} ${ph.model||''}`.trim() || '—' },
                        { l:'Fuel',    v: { empty:'Empty', quarter:'1/4', half:'1/2', three_quarter:'3/4', full:'Full' }[ph.fuel_level] || ph.fuel_level || '—' },
                        { l:'ODO',     v: ph.odometer ? `${Number(ph.odometer).toLocaleString()} km` : '—' },
                        { l:'Date',    v: new Date(ph.submitted_at).toLocaleDateString('en-AE',{day:'numeric',month:'short'}) },
                      ].map(c=>(
                        <div key={c.l} style={{ background:'rgba(255,255,255,0.6)', borderRadius:7, padding:'5px 8px' }}>
                          <div style={{ fontSize:9, color:'#9CA3AF', fontWeight:700 }}>{c.l}</div>
                          <div style={{ fontSize:11.5, color:'#111', fontWeight:600 }}>{c.v}</div>
                        </div>
                      ))}
                    </div>
                    {isPendingAccept ? (
                      <button
                        onClick={async () => {
                          try {
                            const r = await fetch(`${API}/api/handovers/${ph.id}/accept`, {
                              method:'PATCH', headers: authHeader()
                            })
                            if (!r.ok) { const d=await r.json(); alert(d.error||'Failed to accept'); return }
                            refreshPending()
                          } catch(e) { alert(e.message) }
                        }}
                        style={{ width:'100%', padding:'10px', borderRadius:10, background:'#D97706', color:'#FFF', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
                        Accept Handover
                      </button>
                    ) : (
                      <button onClick={() => setCompletingHandover(ph)}
                        style={{ width:'100%', padding:'10px', borderRadius:10, background:'linear-gradient(135deg,#2E7D52,#22C55E)', color:'#FFF', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
                        Upload Photos &amp; Complete
                      </button>
                    )}
                  </Card>
                )
              })}

              {/* Quick actions */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  { l:'Apply Leave',     icon:Calendar, c:'#F59E0B', bg:'#FFFBEB', action:()=>setLeaveModal(true)   },
                  { l:'Receive Vehicle', icon:Car,       c:'#2563EB', bg:'#EFF6FF', action:()=>setHvModal('received')},
                  { l:'My Payslips',     icon:Wallet,    c:'#10B981', bg:'#F0FDF4', action:()=>setTab('pay')         },
                  { l:'Performance',     icon:BarChart2, c:'#7C3AED', bg:'#F5F3FF', action:()=>setTab('perf')        },
                ].map(a => {
                  const Icon = a.icon
                  return (
                    <button key={a.l} onClick={a.action}
                      style={{ display:'flex', alignItems:'center', gap:8, padding:'12px', borderRadius:14, background:a.bg, border:`1px solid ${a.c}20`, cursor:'pointer', fontFamily:'Poppins,sans-serif', textAlign:'left', width:'100%' }}>
                      <div style={{ width:32, height:32, borderRadius:9, background:`${a.c}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Icon size={15} color={a.c}/>
                      </div>
                      <span className="dp-action-label" style={{ fontWeight:600, color:a.c, lineHeight:1.3 }}>{a.l}</span>
                    </button>
                  )
                })}
              </div>

              {/* 2-col summary: Leave Balance + SIM */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>

                {/* Leave Balance */}
                <Card style={{ padding:'13px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <span style={{ fontSize:11, fontWeight:800, color:'#111' }}>Leave Balance</span>
                    <button onClick={()=>setTab('leaves')} style={{ fontSize:10, fontWeight:600, color:'#B8860B', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'Poppins,sans-serif' }}>View</button>
                  </div>
                  {[
                    { l:'Annual', used:annualUsed, total:Number(p?.annual_leave_balance||30), c:'#F59E0B' },
                    { l:'Sick',   used:sickUsed,   total:15,                                   c:'#3B82F6' },
                  ].map(lt=>(
                    <div key={lt.l} style={{ marginBottom:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={{ fontSize:10, color:'#9CA3AF' }}>{lt.l}</span>
                        <span style={{ fontSize:10, fontWeight:700, color:lt.c }}>{lt.used}/{lt.total}d</span>
                      </div>
                      <div style={{ height:4, borderRadius:4, background:'#F3F4F6', overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:4, background:lt.c, width:`${Math.min(100,lt.used/lt.total*100)}%`, transition:'width 0.5s' }}/>
                      </div>
                    </div>
                  ))}
                </Card>

                {/* Work Phone / SIM */}
                <Card style={{ padding:'13px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <span style={{ fontSize:11, fontWeight:800, color:'#111' }}>Work Phone</span>
                    <button onClick={()=>setTab('vehicle')} style={{ fontSize:10, fontWeight:600, color:'#B8860B', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'Poppins,sans-serif' }}>View</button>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <InfoRow label="SIM No" value={p?.work_number}/>
                    <InfoRow label="Provider" value={p?.sim_provider}/>
                  </div>
                </Card>
              </div>

              {/* Profile info cards */}
              {p && (
                <>
                  {/* Personal info */}
                  <div style={{ background:'#1C1917', borderRadius:16, padding:'14px 16px' }}>
                    <div style={{ fontSize:9.5, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em', color:'#78716C', marginBottom:11 }}>Contact Information</div>
                    {[
                      { Icon:Phone,  label:'Phone',       value:p.phone    },
                      { Icon:Mail,   label:'Email',       value:p.email_id },
                      { Icon:MapPin, label:'Location',    value:p.residential_location },
                    ].filter(r=>r.value).map(row=>(
                      <div key={row.label} style={{ display:'flex', gap:9, marginBottom:9 }}>
                        <div style={{ width:24, height:24, borderRadius:7, background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <row.Icon size={10} color="#A8A29E"/>
                        </div>
                        <div>
                          <div style={{ fontSize:9, color:'#78716C', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>{row.label}</div>
                          <div style={{ fontSize:11.5, color:'#F5F5F4', fontWeight:500, marginTop:1 }}>{row.value}</div>
                        </div>
                      </div>
                    ))}
                    {!p.phone && !p.email_id && !p.residential_location && (
                      <div style={{ fontSize:11.5, color:'#78716C', textAlign:'center', padding:'8px 0' }}>No contact details on file</div>
                    )}
                  </div>

                  {/* Document expiry strip */}
                  {(p.visa_expiry || p.license_expiry || p.iloe_expiry) && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                      {[['Visa',p.visa_expiry],['License',p.license_expiry],['ILOE',p.iloe_expiry]].map(([l,d])=>{
                        const days = d ? differenceInDays(parseISO(d.slice(0,10)), new Date()) : null
                        const isAlert = days !== null && days <= 30
                        const c = days===null?'#9CA3AF':days<0?'#EF4444':days<=30?'#EF4444':days<=90?'#F59E0B':'#10B981'
                        const bg = days===null?'#F9FAFB':days<0?'#FEF2F2':days<=30?'#FEF2F2':days<=90?'#FFFBEB':'#F0FDF4'
                        return (
                          <div key={l} style={{ textAlign:'center', padding:'10px 8px', borderRadius:12, background:bg, border:`1px solid ${c}30` }}>
                            <div style={{ fontSize:9, fontWeight:800, color:c, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>{l}</div>
                            <div style={{ fontSize:12, color:c, fontWeight:700 }}>
                              {d ? (days < 0 ? 'Expired' : days <= 90 ? `${days}d` : 'Valid') : 'N/A'}
                            </div>
                            {d && <div style={{ fontSize:9, color:c, opacity:0.6, marginTop:2 }}>{d.slice(0,10)}</div>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Latest notice */}
              {notices.length > 0 && (
                <Card>
                  <div style={{ fontSize:10.5, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Latest Notice</div>
                  <div style={{ fontWeight:600, fontSize:13.5, color:'#111', marginBottom:4 }}>{notices[0].title}</div>
                  <div style={{ fontSize:12.5, color:'#6B7280', lineHeight:1.6 }}>
                    {notices[0].message?.slice(0,120)}{notices[0].message?.length>120?'…':''}
                  </div>
                  {notices.length > 1 && (
                    <button onClick={()=>setTab('notices')}
                      style={{ marginTop:8, fontSize:12, color:'#B8860B', fontWeight:600, background:'none', border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', padding:0, display:'flex', alignItems:'center', gap:3 }}>
                      View all {notices.length} <ChevronRight size={12}/>
                    </button>
                  )}
                </Card>
              )}
            </div>
          </div>
        )}

        {/* PAYSLIPS */}
        {tab === 'pay' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'12px' }} className="fade">
            <h2 style={{ fontWeight:700, fontSize:17, color:'#111', margin:0 }}>My Payslip</h2>
            {!payroll ? (
              <Card style={{ textAlign:'center', padding:'30px' }}>
                <Wallet size={28} color="#D1D5DB" style={{ margin:'0 auto 8px', display:'block' }}/>
                <div style={{ fontSize:13, color:'#9CA3AF' }}>No payroll data this month</div>
              </Card>
            ) : (
              <>
                <Card style={{ background:'#111', border:'none' }}>
                  <div style={{ fontSize:10.5, color:'rgba(255,255,255,0.45)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Net Salary</div>
                  <div style={{ fontWeight:900, fontSize:28, color:'#D4A017', letterSpacing:'-0.04em' }}>{fmtA(net)}</div>
                  <div style={{ fontSize:12, color: payroll.payroll_status==='paid'?'#34D399':'#FB923C', marginTop:8, fontWeight:600 }}>
                    {payroll.payroll_status==='paid'?'✓ Paid this month':'⏳ Pending payment'}
                  </div>
                </Card>
                <Card>
                  <div style={{ fontSize:11, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Breakdown</div>
                  {[
                    { l:'Base Salary', v:fmtA(payroll.base_salary),                c:'#111'    },
                    { l:'Bonuses',     v:`+${fmtA(payroll.bonus_total||0)}`,        c:'#10B981' },
                    { l:'Deductions',  v:`-${fmtA(payroll.deduction_total||0)}`,    c:'#EF4444' },
                  ].map((r,i)=>(
                    <div key={r.l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:i<2?'1px solid #F3F4F6':'none' }}>
                      <span style={{ fontSize:13, color:'#6B7280' }}>{r.l}</span>
                      <span style={{ fontWeight:700, fontSize:13, color:r.c }}>{r.v}</span>
                    </div>
                  ))}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', background:'#FFFBEB', borderRadius:10, marginTop:8, border:'1px solid #FDE68A' }}>
                    <span style={{ fontWeight:700, fontSize:13, color:'#92400E' }}>Net Total</span>
                    <span style={{ fontWeight:900, fontSize:16, color:'#B8860B' }}>{fmtA(net)}</span>
                  </div>
                </Card>
                {(payroll.bonuses||[]).length>0&&(
                  <Card>
                    <div style={{ fontSize:11, fontWeight:700, color:'#10B981', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Additions</div>
                    {payroll.bonuses.map(b=>(
                      <div key={b.id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 10px', background:'#F0FDF4', borderRadius:9, marginBottom:6 }}>
                        <span style={{ fontSize:12.5, color:'#065F46' }}>{b.type}{b.description?` — ${b.description}`:''}</span>
                        <span style={{ fontWeight:700, fontSize:12.5, color:'#10B981' }}>+{fmtA(b.amount)}</span>
                      </div>
                    ))}
                  </Card>
                )}
                {(payroll.deductions||[]).length>0&&(
                  <Card>
                    <div style={{ fontSize:11, fontWeight:700, color:'#EF4444', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Deductions</div>
                    {payroll.deductions.map(d=>(
                      <div key={d.id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 10px', background:'#FEF2F2', borderRadius:9, marginBottom:6 }}>
                        <span style={{ fontSize:12.5, color:'#991B1B' }}>{DED_LABELS[d.type]||d.type}{d.description?` — ${d.description}`:''}</span>
                        <span style={{ fontWeight:700, fontSize:12.5, color:'#EF4444' }}>-{fmtA(d.amount)}</span>
                      </div>
                    ))}
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* LEAVES */}
        {tab === 'leaves' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'12px' }} className="fade">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={{ fontWeight:700, fontSize:17, color:'#111', margin:0 }}>My Leaves</h2>
              <button onClick={()=>setLeaveModal(true)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:20, background:'#B8860B', color:'#FFF', fontWeight:600, fontSize:12, border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
                <Plus size={13}/> Apply
              </button>
            </div>
            {leaves.length===0 ? (
              <Card style={{ textAlign:'center', padding:'30px' }}>
                <Calendar size={28} color="#D1D5DB" style={{ margin:'0 auto 8px', display:'block' }}/>
                <div style={{ fontSize:13, color:'#9CA3AF' }}>No leave requests yet</div>
              </Card>
            ) : leaves.map((l,i)=>{
              const tc=TYPE_COLORS[l.type]||'#6B7280'
              const sc=l.status==='approved'?'#10B981':l.status==='rejected'?'#EF4444':'#F59E0B'
              return (
                <Card key={l.id} style={{ animationDelay:`${i*0.04}s` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:tc, background:`${tc}12`, borderRadius:20, padding:'2px 10px' }}>{l.type}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:sc, background:`${sc}10`, borderRadius:20, padding:'2px 9px' }}>{l.status}</span>
                  </div>
                  <div style={{ fontWeight:600, fontSize:13.5, color:'#111', marginBottom:3 }}>{l.from_date} → {l.to_date}</div>
                  <div style={{ fontSize:12, color:'#9CA3AF', marginBottom:8 }}>{l.days} day{l.days>1?'s':''}{l.reason?` · ${l.reason}`:''}</div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    {[{l:'POC',s:l.poc_status},{l:'HR',s:l.hr_status||l.gm_status},{l:'Manager',s:l.mgr_status}].map(st=>{
                      const c=st.s==='approved'?'#10B981':st.s==='rejected'?'#EF4444':'#D1D5DB'
                      return <span key={st.l} style={{ fontSize:10.5, fontWeight:600, color:c, background:`${c}18`, borderRadius:20, padding:'2px 8px' }}>{st.l}: {st.s||'pending'}</span>
                    })}
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* PERFORMANCE */}
        {tab === 'perf' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'12px' }} className="fade">
            <h2 style={{ fontWeight:700, fontSize:17, color:'#111', margin:0 }}>Performance</h2>
            <Card style={{ textAlign:'center', padding:'50px 24px' }}>
              <div style={{ width:64, height:64, borderRadius:20, background:'linear-gradient(135deg,#FDF6E3,#FEF3D0)', border:'1px solid #F0D78C', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <BarChart2 size={28} color="#B8860B"/>
              </div>
              <div style={{ fontWeight:800, fontSize:18, color:'#111', marginBottom:8 }}>Coming Soon</div>
              <div style={{ fontSize:13, color:'#9CA3AF', lineHeight:1.6 }}>Performance tracking is being set up.<br/>Check back soon.</div>
            </Card>
          </div>
        )}

        {/* VEHICLE */}
        {tab === 'vehicle' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'12px' }} className="fade">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={{ fontWeight:700, fontSize:17, color:'#111', margin:0 }}>Vehicle</h2>
              <button onClick={()=>setHvModal(vehicle?'returned':'received')}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:20, background:'#B8860B', color:'#FFF', fontWeight:600, fontSize:12, border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
                <Plus size={13}/> {vehicle?'Return':'Receive'}
              </button>
            </div>
            {todayAsgn ? (
              <Card style={{ background:'linear-gradient(135deg,#F0FDF4,#DCFCE7)', border:'1px solid #A7F3D0' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#10B981', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Today's Assigned Vehicle</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:20, color:'#111', letterSpacing:'-0.02em' }}>{todayAsgn.plate}</div>
                    <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>{[todayAsgn.make,todayAsgn.model,todayAsgn.year].filter(Boolean).join(' ')||'Vehicle'}</div>
                  </div>
                  <div style={{ width:44, height:44, borderRadius:12, background:'#DCFCE7', display:'flex', alignItems:'center', justifyContent:'center' }}><Car size={20} color="#10B981"/></div>
                </div>
                <div style={{ marginTop:8, fontSize:11, color:'#6B7280' }}>Assigned by station · {todayAsgn.date?.slice(0,10)}</div>
              </Card>
            ) : (
              <Card style={{ textAlign:'center', padding:'14px', background:'#FAFAF9', border:'1px dashed #D1D5DB' }}>
                <Car size={18} color="#D1D5DB" style={{ margin:'0 auto 5px', display:'block' }}/>
                <div style={{ fontSize:12, color:'#9CA3AF' }}>No vehicle assigned by station today</div>
              </Card>
            )}
            {asgHistory.length>0&&(
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Assignment History</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {asgHistory.map(a=>(
                    <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, background:'#FFF', border:'1px solid #F0F0EE' }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:'#FDF6E3', border:'1px solid #F0D78C', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Car size={16} color="#B8860B"/></div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:13, color:'#111' }}>{a.plate}</div>
                        <div style={{ fontSize:11, color:'#9CA3AF', marginTop:1 }}>{[a.make,a.model].filter(Boolean).join(' ')}</div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'#374151' }}>{a.date?.slice(0,10)}</div>
                        <div style={{ fontSize:10, color:'#B8860B', marginTop:1 }}>{a.station_code}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Handover Log</div>
              {handovers.length===0 ? (
                <Card style={{ textAlign:'center', padding:'20px' }}>
                  <Car size={24} color="#D1D5DB" style={{ margin:'0 auto 8px', display:'block' }}/>
                  <div style={{ fontSize:12, color:'#9CA3AF' }}>No handovers yet</div>
                </Card>
              ) : handovers.map(h=>(
                <Card key={h.id} style={{ marginBottom:6 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <span style={{ fontWeight:700, fontSize:15, color:'#111' }}>{h.vehicle_plate||h.plate||'—'}</span>
                    <Pill label={h.type} color={h.type==='received'?'#10B981':'#EF4444'}/>
                  </div>
                  <div style={{ fontSize:12, color:'#9CA3AF' }}>{new Date(h.submitted_at).toLocaleString('en-AE',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                  {h.fuel_level&&<div style={{ fontSize:12, color:'#6B7280', marginTop:4 }}>Fuel: {h.fuel_level}</div>}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* INSURANCE */}
        {tab==='insurance' && (
          <div style={{ padding:'12px' }}>
            <InsuranceTab profile={profile}/>
          </div>
        )}

        {/* NOTICES */}
        {tab==='notices' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'12px' }} className="fade">
            <h2 style={{ fontWeight:700, fontSize:17, color:'#111', margin:0 }}>Notices</h2>
            {notices.length===0 ? (
              <Card style={{ textAlign:'center', padding:'30px' }}>
                <Bell size={28} color="#D1D5DB" style={{ margin:'0 auto 8px', display:'block' }}/>
                <div style={{ fontSize:13, color:'#9CA3AF' }}>No notices from your station</div>
              </Card>
            ) : notices.map(n=>(
              <Card key={n.id}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                  <span style={{ fontWeight:700, fontSize:13.5, color:'#111' }}>{n.title}</span>
                  <span style={{ fontSize:10.5, color:'#9CA3AF', flexShrink:0, marginLeft:8 }}>{n.created_at?.slice(0,10)}</span>
                </div>
                <div style={{ fontSize:12.5, color:'#6B7280', lineHeight:1.6 }}>{n.message}</div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <nav style={{ position:'fixed', bottom:0, left:0, right:0, background:'#FFF', borderTop:'1px solid #F0F0EE', display:'flex', zIndex:100, boxShadow:'0 -2px 12px rgba(0,0,0,0.06)', paddingBottom:'env(safe-area-inset-bottom,0px)' }}>
        {TABS.map(t => {
          const Icon   = t.icon
          const active = tab === t.id
          const isNotices = t.id === 'notices'
          return (
            <button key={t.id} onClick={isNotices ? openNotices : () => setTab(t.id)}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'8px 1px 10px', border:'none', background:active?'#FFFBEB':'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', transition:'all 0.15s', minWidth:0 }}>
              <span className="dp-nav-icon" style={{ position:'relative' }}>
                <Icon size={18} color={active?'#B8860B':'#9CA3AF'} strokeWidth={active?2.5:1.8}/>
                {isNotices && unreadCount>0 && (
                  <span style={{ position:'absolute', top:-4, right:-5, minWidth:14, height:14, borderRadius:7, background:'#EF4444', color:'#FFF', fontSize:8, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px', lineHeight:1 }}>
                    {unreadCount>9?'9+':unreadCount}
                  </span>
                )}
              </span>
              <span className="dp-nav-label" style={{ fontWeight:active?700:500, color:active?'#B8860B':'#9CA3AF', marginTop:2, lineHeight:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%', padding:'0 1px' }}>
                {t.label}
              </span>
            </button>
          )
        })}
      </nav>

      {leaveModal && <LeaveModal empId={user.emp_id} onClose={()=>setLeaveModal(false)} onSave={handleLeaveSave}/>}
      {hvModal && (
        <HandoverModal
          modal={{ type:hvModal, vehicle:hvModal==='returned'?vehicle:null }}
          user={user} onClose={()=>setHvModal(null)} onSave={handleHandoverSave}/>
      )}
      {completingHandover && (
        <CompleteHandoverSheet
          handover={completingHandover}
          onClose={()=>setCompletingHandover(null)}
          onDone={handleCompleteDone}/>
      )}
    </div>
  )
}
