'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  X, Plus, Pencil, Trash2, Truck, Users, Package, Bell, Calendar,
  CheckCircle, XCircle, Search, ChevronDown, ChevronLeft, ChevronRight, AlertTriangle,
  MapPin, Clock, Smartphone, ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine,
  CheckSquare, History, Contact, Upload, Download, FileText, Phone, CreditCard, Briefcase,
} from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'
import { API } from '@/lib/api'

// ── Constants ─────────────────────────────────────────────────
export const CYCLES       = ['A','B','C','Beset','MR','FM','Rescue']
export const CYCLE_H      = { A:5, B:4, C:5, Beset:5, MR:4, FM:5 }
export const MAX_HRS      = 10
export const VSTATUS_COLORS = { active:'#2E7D52', grounded:'#C0392B', maintenance:'#B45309', sold:'#A89880' }
export const VSTATUS_BG     = { active:'#ECFDF5', grounded:'#FEF2F2', maintenance:'#FFFBEB', sold:'#F5F4F1' }

export const STATIONS = ['DDB1','DXE6']

export function hdr() {
  return { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gcd_token')}` }
}

// ── useStation hook ───────────────────────────────────────────
export function useStation(user) {
  const [station, setStationState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gcd_poc_station')
      if (saved) return saved
    }
    return user?.station_code || 'DDB1'
  })
  function setStation(s) {
    setStationState(s)
    if (typeof window !== 'undefined') localStorage.setItem('gcd_poc_station', s)
  }
  const canSwitch = user?.role === 'admin' || user?.role === 'general_manager'
  return { station, setStation, canSwitch }
}

// ── POC Page Header ───────────────────────────────────────────
export function POCHeader({ title, icon: Icon, color, station, onStationChange, canSwitch, date, onDateChange, showDate=true, subtitle }) {
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, overflow:'hidden' }}>
      <div style={{ height:4, background:`linear-gradient(90deg,${color},#D4A017,${color})` }}/>
      <div style={{ padding:'16px 20px' }}>
        <Link href="/dashboard/poc" style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11.5, color:'var(--text-muted)', marginBottom:12, textDecoration:'none', fontWeight:600, transition:'color 0.15s' }}>
          <ChevronLeft size={13}/> POC Station
        </Link>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:46, height:46, borderRadius:14, background:`${color}18`, border:`1.5px solid ${color}35`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon size={22} color={color}/>
            </div>
            <div>
              <h1 style={{ fontWeight:900, fontSize:20, color:'var(--text)', letterSpacing:'-0.02em', lineHeight:1.1, margin:0 }}>{title}</h1>
              {subtitle && <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:3, marginBottom:0 }}>{subtitle}</p>}
            </div>
          </div>
          {showDate && onDateChange && (
            <input type="date" value={date} onChange={e => onDateChange(e.target.value)}
              style={{ background:'var(--bg-alt)', border:'1px solid var(--border)', borderRadius:10, padding:'7px 10px', color:'var(--text)', fontSize:12, outline:'none', cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}/>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12 }}>
          <MapPin size={12} color={color}/>
          <span style={{ fontSize:11.5, color:'var(--text-muted)', fontWeight:600 }}>Station:</span>
          {canSwitch ? STATIONS.map(s => (
            <button key={s} onClick={() => onStationChange(s)}
              style={{ padding:'4px 14px', borderRadius:20, border:`1.5px solid ${station===s?color:'var(--border)'}`, background:station===s?`${color}18`:'var(--bg-alt)', color:station===s?color:'var(--text-muted)', fontWeight:station===s?700:500, fontSize:12, cursor:'pointer', transition:'all 0.15s', fontFamily:'inherit' }}>
              {s}
            </button>
          )) : (
            <span style={{ fontSize:13, fontWeight:700, color, background:`${color}18`, padding:'3px 12px', borderRadius:20 }}>{station}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Driver Search ─────────────────────────────────────────────
export function DriverSearch({ employees, value, onChange, placeholder='Search driver…' }) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)
  const selected = employees.find(e => e.id === value)
  const filtered = employees.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase())
  )
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div onClick={() => setOpen(p => !p)} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', background:'var(--card)', border:`1.5px solid ${open?'var(--gold)':'var(--border-med)'}`, borderRadius:12, cursor:'pointer', transition:'all 0.2s', boxShadow:open?'0 0 0 3px rgba(184,134,11,0.1)':'' }}>
        {selected ? (
          <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:'var(--amber-bg)', border:'1px solid var(--gold-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{selected.avatar||'👤'}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{selected.name}</div>
              <div style={{ fontSize:10.5, color:'var(--text-muted)' }}>{selected.id}</div>
            </div>
          </div>
        ) : (
          <span style={{ flex:1, fontSize:13, color:'var(--text-muted)' }}>{placeholder}</span>
        )}
        <ChevronDown size={15} color="var(--text-muted)" style={{ flexShrink:0, transition:'transform 0.2s', transform:open?'rotate(180deg)':'none' }}/>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, boxShadow:'var(--shadow-lg)', zIndex:999, maxHeight:300, overflow:'hidden', animation:'scaleIn 0.15s ease' }}>
          <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ position:'relative' }}>
              <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
              <input autoFocus className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or ID…" style={{ paddingLeft:32, fontSize:12, borderRadius:8 }}/>
            </div>
          </div>
          <div style={{ overflowY:'auto', maxHeight:230 }}>
            <div onClick={() => { onChange(''); setOpen(false); setSearch('') }} style={{ padding:'10px 14px', fontSize:13, color:'var(--text-muted)', cursor:'pointer', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:'var(--bg-alt)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>—</div>None
            </div>
            {filtered.map(e => (
              <div key={e.id} onClick={() => { onChange(e.id); setOpen(false); setSearch('') }}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer', background:value===e.id?'var(--amber-bg)':'transparent', transition:'background 0.15s' }}>
                <div style={{ width:32, height:32, borderRadius:9, background:'var(--amber-bg)', border:`1px solid ${value===e.id?'var(--gold)':'var(--gold-border)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{e.avatar||'👤'}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{e.name}</div>
                  <div style={{ fontSize:10.5, color:'var(--text-muted)' }}>{e.id}</div>
                </div>
                {value===e.id && <CheckCircle size={15} color="var(--gold)"/>}
              </div>
            ))}
            {filtered.length===0 && <div style={{ padding:24, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>No drivers found</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Cycle Selector ────────────────────────────────────────────
export function CycleSelector({ selected, onChange, rescueHours, onRescueHours }) {
  const hasRescue = selected.includes('Rescue')
  const regHrs    = selected.filter(c => c!=='Rescue').reduce((s,c) => s+(CYCLE_H[c]||0), 0)
  const resHrs    = hasRescue ? (parseFloat(rescueHours)||0) : 0
  const total     = regHrs + resHrs
  const overMax   = !hasRescue && total > MAX_HRS
  function toggle(c) { onChange(selected.includes(c) ? selected.filter(x => x!==c) : [...selected, c]) }
  return (
    <div>
      <label className="input-label">Duty Cycles <span style={{ color:'var(--text-muted)', textTransform:'none', letterSpacing:0, fontSize:10, fontWeight:400 }}>— select multiple</span></label>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:10 }}>
        {CYCLES.map(c => {
          const on = selected.includes(c)
          return (
            <button key={c} type="button" onClick={() => toggle(c)}
              style={{ padding:'11px 6px', borderRadius:12, border:`2px solid ${on?'var(--gold)':'var(--border-med)'}`, background:on?'var(--amber-bg)':'var(--bg-alt)', color:on?'var(--gold)':'var(--text-sub)', fontSize:12, fontWeight:700, cursor:'pointer', textAlign:'center', transition:'all 0.18s ease', transform:on?'scale(1.05)':'scale(1)', boxShadow:on?'0 4px 12px rgba(184,134,11,0.2)':'none' }}>
              {c}
              <div style={{ fontSize:9.5, fontWeight:500, color:on?'var(--gold)':'var(--text-muted)', marginTop:2 }}>{c==='Rescue'?'custom':`${CYCLE_H[c]}h`}</div>
            </button>
          )
        })}
      </div>
      {hasRescue && (
        <div style={{ marginBottom:10 }}>
          <label className="input-label">Rescue Hours</label>
          <input className="input" type="number" step="0.25" min="0.25" value={rescueHours} onChange={e => onRescueHours(e.target.value)} placeholder="e.g. 3.5"/>
        </div>
      )}
      {total > 0 && (
        <div style={{ padding:'11px 14px', borderRadius:10, background:overMax?'var(--red-bg)':'var(--green-bg)', border:`1px solid ${overMax?'var(--red-border)':'var(--green-border)'}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:700, color:overMax?'var(--red)':'var(--green)' }}>
            {overMax ? `⚠️ ${total}h exceeds ${MAX_HRS}h limit` : `✓ ${total}h total`}
          </span>
          {selected.length > 0 && <span style={{ fontSize:11, color:overMax?'var(--red)':'var(--green)', fontWeight:500 }}>{selected.filter(c=>c!=='Rescue').join(' + ')}{hasRescue?' + Rescue':''}</span>}
        </div>
      )}
    </div>
  )
}

// ── Attendance Modal ──────────────────────────────────────────
export function AttModal({ employees, station, date, editRecord, onSave, onClose }) {
  const isEdit = !!editRecord
  const [empId,  setEmpId]  = useState(editRecord?.emp_id||'')
  const [status, setStatus] = useState(editRecord?.status||'present')
  const [cycles, setCycles] = useState(editRecord?.cycles||[])
  const [rescue, setRescue] = useState(editRecord?.rescue_hours||'')
  const [wType,  setWType]  = useState(editRecord?.worker_type||'driver')
  const [note,   setNote]   = useState(editRecord?.note||'')
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)
  const isDXE6 = station === 'DXE6'
  const selEmp = employees.find(e => e.id===empId)
  const rate   = parseFloat(selEmp?.hourly_rate||3.85)
  const regHrs = cycles.filter(c => c!=='Rescue').reduce((s,c) => s+(CYCLE_H[c]||0), 0)
  const resHrs = cycles.includes('Rescue') ? (parseFloat(rescue)||0) : 0
  const total  = regHrs + resHrs
  const est    = isDXE6 ? (wType==='helper'?90:115) : total>0 ? (total*rate).toFixed(2) : null
  async function handleSave() {
    if (!empId) return setErr('Select a driver')
    if (!isDXE6 && status==='present' && cycles.length===0) return setErr('Select at least one cycle')
    setErr(null); setSaving(true)
    try {
      const regCycles  = cycles.filter(c => c!=='Rescue')
      const hasRescue  = cycles.includes('Rescue')
      const totalHours = regCycles.reduce((s,c) => s+(CYCLE_H[c]||0), 0) + (hasRescue ? (parseFloat(rescue)||0) : 0)
      const body = isDXE6
        ? { emp_id:empId, date: date||editRecord?.date, status, note, pay_type:'daily', worker_type:wType }
        : { emp_id:empId, date: date||editRecord?.date, status, note, cycle: regCycles.join(',')||null, cycle_hours: status==='present'&&totalHours>0 ? totalHours : null, is_rescue: hasRescue, rescue_hours: hasRescue ? (rescue||null) : null }
      const url    = isEdit ? `${API}/api/attendance/${editRecord.id}` : `${API}/api/attendance`
      const method = isEdit ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers:hdr(), body:JSON.stringify(body) })
      const data   = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSave()
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:460 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div>
            <h3 style={{ fontWeight:800, fontSize:16, color:'var(--text)' }}>{isEdit?'Edit':'Log'} Attendance</h3>
            <div style={{ fontSize:11, color:'var(--gold)', fontWeight:600, marginTop:1 }}>📍 {station} Station</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17}/></button>
        </div>
        {err && <div style={{ background:'var(--red-bg)', border:'1px solid var(--red-border)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'var(--red)', marginBottom:14 }}>{err}</div>}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {!isEdit ? (
            <div><label className="input-label">Driver *</label><DriverSearch employees={employees} value={empId} onChange={setEmpId}/></div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--amber-bg)', borderRadius:12, border:'1px solid var(--gold-border)' }}>
              <span style={{ fontSize:16 }}>{editRecord.avatar||'👤'}</span>
              <span style={{ fontWeight:700, fontSize:14, color:'var(--gold)' }}>{editRecord.name}</span>
            </div>
          )}
          <div>
            <label className="input-label">Status</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {[{v:'present',e:'✅',l:'Present'},{v:'absent',e:'❌',l:'Absent'},{v:'leave',e:'🏖',l:'Leave'}].map(s => (
                <button key={s.v} type="button" onClick={() => setStatus(s.v)}
                  style={{ padding:'11px 8px', borderRadius:11, border:`2px solid ${status===s.v?'var(--gold)':'var(--border-med)'}`, background:status===s.v?'var(--amber-bg)':'var(--bg-alt)', color:status===s.v?'var(--gold)':'var(--text-sub)', fontWeight:600, fontSize:12, cursor:'pointer', transition:'all 0.18s', textAlign:'center' }}>
                  <div style={{ fontSize:18, marginBottom:3 }}>{s.e}</div>{s.l}
                </button>
              ))}
            </div>
          </div>
          {status==='present' && isDXE6 && (
            <div>
              <label className="input-label">Worker Type</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[{v:'driver',l:'🚗 Driver',r:'AED 115'},{v:'helper',l:'🔧 Helper',r:'AED 90'}].map(t => (
                  <button key={t.v} type="button" onClick={() => setWType(t.v)}
                    style={{ padding:'12px', borderRadius:11, border:`2px solid ${wType===t.v?'var(--gold)':'var(--border-med)'}`, background:wType===t.v?'var(--amber-bg)':'var(--bg-alt)', color:wType===t.v?'var(--gold)':'var(--text-sub)', fontWeight:600, cursor:'pointer', transition:'all 0.18s', textAlign:'center' }}>
                    <div style={{ fontSize:13 }}>{t.l}</div>
                    <div style={{ fontSize:11, fontWeight:700, color:wType===t.v?'var(--green)':'var(--text-muted)', marginTop:2 }}>{t.r}/day</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {status==='present' && !isDXE6 && (
            <CycleSelector selected={cycles} onChange={setCycles} rescueHours={rescue} onRescueHours={setRescue}/>
          )}
          {est && status==='present' && (
            <div style={{ background:'var(--green-bg)', border:'1px solid var(--green-border)', borderRadius:12, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:11, color:'var(--green)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>Estimated Earnings</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{isDXE6?'Daily rate':`${total}h × AED ${rate}/hr`}</div>
              </div>
              <div style={{ fontSize:22, fontWeight:900, color:'var(--green)', letterSpacing:'-0.03em' }}>AED {est}</div>
            </div>
          )}
          <div><label className="input-label">Note (optional)</label><input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Any notes…"/></div>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:22 }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex:1, justifyContent:'center' }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving||!empId} style={{ flex:2, justifyContent:'center' }}>{saving?'Saving…':isEdit?'Save Changes':'Log Attendance'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Announcement Modal ────────────────────────────────────────
export function AnnModal({ ann, onSave, onClose }) {
  const [title, setTitle] = useState(ann?.title||'')
  const [body,  setBody]  = useState(ann?.body||'')
  const [saving,setSaving]= useState(false)
  async function handleSave() {
    if (!title||!body) return
    setSaving(true)
    try {
      const url = ann ? `${API}/api/poc/announcements/${ann.id}` : `${API}/api/poc/announcements`
      const res = await fetch(url, { method:ann?'PUT':'POST', headers:hdr(), body:JSON.stringify({title,body}) })
      if (!res.ok) throw new Error((await res.json()).error)
      onSave()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:440 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ fontWeight:800, fontSize:16, color:'var(--text)' }}>{ann?'Edit':'New'} Announcement</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17}/></button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div><label className="input-label">Title *</label><input className="input" value={title} onChange={e => setTitle(e.target.value)} autoComplete="off"/></div>
          <div><label className="input-label">Message *</label><textarea className="input" rows={4} value={body} onChange={e => setBody(e.target.value)} style={{ resize:'vertical' }}/></div>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:18 }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex:1, justifyContent:'center' }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving||!title||!body} style={{ flex:2, justifyContent:'center' }}>{saving?'Saving…':ann?'Update':'Post'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Vehicle Modal ─────────────────────────────────────────────
export function VehicleModal({ vehicle, station, onSave, onClose }) {
  const [form, setForm] = useState({ plate:'', make:'', model:'', year:'', status:'active', grounded_reason:'', grounded_since:'', grounded_until:'', notes:'', ...vehicle })
  const [saving,setSaving] = useState(false)
  const set = (k,v) => setForm(p => ({...p,[k]:v}))
  async function handleSave() {
    if (!form.plate) return alert('Plate number required')
    setSaving(true)
    try {
      const url = vehicle ? `${API}/api/vehicles/${vehicle.id}` : `${API}/api/vehicles`
      const res = await fetch(url, { method:vehicle?'PUT':'POST', headers:hdr(), body:JSON.stringify({...form, station_code:station}) })
      if (!res.ok) throw new Error((await res.json()).error)
      onSave()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:460 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ fontWeight:800, fontSize:16, color:'var(--text)' }}>{vehicle?'Edit':'Add'} Vehicle</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17}/></button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div><label className="input-label">Plate No. *</label><input className="input" value={form.plate} onChange={e => set('plate',e.target.value.toUpperCase())} placeholder="DXB A 12345" autoComplete="off"/></div>
          <div><label className="input-label">Status</label>
            <select className="input" value={form.status} onChange={e => set('status',e.target.value)}>
              <option value="active">Active</option><option value="grounded">Grounded</option>
              <option value="maintenance">Maintenance</option><option value="sold">Sold</option>
            </select></div>
          <div><label className="input-label">Make</label><input className="input" value={form.make} onChange={e => set('make',e.target.value)} placeholder="Toyota"/></div>
          <div><label className="input-label">Model</label><input className="input" value={form.model} onChange={e => set('model',e.target.value)} placeholder="Hiace"/></div>
          <div><label className="input-label">Year</label><input className="input" type="number" value={form.year} onChange={e => set('year',e.target.value)}/></div>
        </div>
        {(form.status==='grounded'||form.status==='maintenance') && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12 }}>
            <div style={{ gridColumn:'span 2' }}><label className="input-label">Reason</label><input className="input" value={form.grounded_reason} onChange={e => set('grounded_reason',e.target.value)} placeholder="Why grounded?"/></div>
            <div><label className="input-label">Since</label><input className="input" type="date" value={form.grounded_since?.slice(0,10)||''} onChange={e => set('grounded_since',e.target.value)}/></div>
            <div><label className="input-label">Until</label><input className="input" type="date" value={form.grounded_until?.slice(0,10)||''} onChange={e => set('grounded_until',e.target.value)}/></div>
          </div>
        )}
        <div style={{ marginTop:12 }}><label className="input-label">Notes</label><input className="input" value={form.notes} onChange={e => set('notes',e.target.value)}/></div>
        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex:1, justifyContent:'center' }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex:2, justifyContent:'center' }}>{saving?'Saving…':vehicle?'Save Changes':'Add Vehicle'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Delivery Modal ────────────────────────────────────────────
export function DeliveryModal({ date, station, existing, onSave, onClose }) {
  const [form,setForm] = useState({ total:existing?.total||'', attempted:existing?.attempted||'', successful:existing?.successful||'', returned:existing?.returned||'', notes:existing?.notes||'' })
  const [saving,setSaving] = useState(false)
  const set = (k,v) => setForm(p => ({...p,[k]:v}))
  async function handleSave() {
    if (!form.total) return alert('Total required')
    setSaving(true)
    try {
      const isIdEdit = existing?.id && existing?.date !== date
      const url    = isIdEdit ? `${API}/api/deliveries/${existing.id}` : `${API}/api/deliveries`
      const method = isIdEdit ? 'PUT' : 'POST'
      const body   = isIdEdit
        ? { ...form, total:parseInt(form.total), attempted:parseInt(form.attempted)||0, successful:parseInt(form.successful)||0, returned:parseInt(form.returned)||0 }
        : { ...form, station_code:station, date, total:parseInt(form.total), attempted:parseInt(form.attempted)||0, successful:parseInt(form.successful)||0, returned:parseInt(form.returned)||0 }
      const res = await fetch(url, { method, headers:hdr(), body:JSON.stringify(body) })
      if (!res.ok) throw new Error((await res.json()).error)
      onSave()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:400 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div>
            <h3 style={{ fontWeight:800, fontSize:16, color:'var(--text)' }}>{existing?'Edit':'Log'} Deliveries</h3>
            <div style={{ fontSize:11, color:'#B8860B', fontWeight:600, marginTop:1 }}>📅 {date}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17}/></button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div><label className="input-label">Total Deliveries *</label><input className="input" type="number" value={form.total} onChange={e => set('total',e.target.value)} placeholder="e.g. 120"/></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div><label className="input-label">Attempted</label><input className="input" type="number" value={form.attempted} onChange={e => set('attempted',e.target.value)}/></div>
            <div><label className="input-label">Successful</label><input className="input" type="number" value={form.successful} onChange={e => set('successful',e.target.value)}/></div>
          </div>
          <div><label className="input-label">Returned</label><input className="input" type="number" value={form.returned} onChange={e => set('returned',e.target.value)}/></div>
          <div><label className="input-label">Notes</label><input className="input" value={form.notes} onChange={e => set('notes',e.target.value)} placeholder="Any issues?"/></div>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:18 }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex:1, justifyContent:'center' }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex:2, justifyContent:'center' }}>{saving?'Saving…':'Submit'}</button>
        </div>
      </div>
    </div>
  )
}

// ── SIM Modal ─────────────────────────────────────────────────
export function SimModal({ sim, emps, station, onSave, onClose }) {
  const isEdit = !!sim
  const [form, setForm] = useState({ sim_number:sim?.sim_number||'', phone_number:sim?.phone_number||'', carrier:sim?.carrier||'Du', status:sim?.status||'available', emp_id:sim?.emp_id||'', notes:sim?.notes||'', monthly_cost:sim?.monthly_cost||'' })
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState(null)
  const [confirm, setConfirm] = useState(null)
  const set = (k,v) => setForm(p => ({...p,[k]:v}))
  function handleEmpChange(v) { set('emp_id',v); set('status', v?'assigned':'available') }
  async function doSave() {
    setSaving(true); setErr(null); setConfirm(null)
    try {
      const body = { ...form, station_code:station, monthly_cost:parseFloat(form.monthly_cost)||0 }
      const url    = isEdit ? `${API}/api/sims/${sim.id}` : `${API}/api/sims`
      const method = isEdit ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers:hdr(), body:JSON.stringify(body) })
      const data   = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSave()
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }
  function handleSave() {
    if (!form.sim_number) return setErr('SIM number required')
    if (form.emp_id) {
      const selectedEmp    = (emps||[]).find(e => e.id === form.emp_id)
      const existingNumber = selectedEmp?.work_number
      const currentPhone   = form.phone_number || sim?.phone_number
      if (existingNumber && existingNumber !== currentPhone) { setConfirm({ empName: selectedEmp.name, existingNumber }); return }
    }
    doSave()
  }
  const STATUSES = [{ v:'available',l:'Available',c:'#2E7D52' },{ v:'assigned',l:'Assigned',c:'#B8860B' },{ v:'inactive',l:'Inactive',c:'#A89880' },{ v:'damaged',l:'Damaged',c:'#C0392B' }]
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:440 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div>
            <h3 style={{ fontWeight:900, fontSize:16, color:'var(--text)' }}>{isEdit?'Edit':'Add'} SIM Card</h3>
            <p style={{ fontSize:11.5, color:'#A89880', marginTop:2 }}>{station} Station</p>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:9, background:'var(--bg-alt)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14}/></button>
        </div>
        {err && <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:9, padding:'9px 12px', fontSize:12.5, color:'#C0392B', marginBottom:12 }}>{err}</div>}
        <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label className="input-label">SIM Number *</label><input className="input" value={form.sim_number} onChange={e => set('sim_number',e.target.value)} placeholder="SIM ID" autoComplete="off"/></div>
            <div><label className="input-label">Phone Number</label><input className="input" value={form.phone_number} onChange={e => set('phone_number',e.target.value)} placeholder="+971 5X XXX XXXX"/></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label className="input-label">Carrier</label>
              <select className="input" value={form.carrier} onChange={e => set('carrier',e.target.value)}>
                {['Du','Etisalat (e&)','Virgin Mobile','Other'].map(ca => <option key={ca}>{ca}</option>)}
              </select></div>
            <div><label className="input-label">Monthly Cost (AED)</label><input className="input" type="number" value={form.monthly_cost} onChange={e => set('monthly_cost',e.target.value)} placeholder="0"/></div>
          </div>
          <div><label className="input-label">Status</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7 }}>
              {STATUSES.map(s => (
                <button key={s.v} onClick={() => set('status',s.v)} type="button"
                  style={{ padding:'9px 4px', borderRadius:10, border:`2px solid ${form.status===s.v?s.c:'var(--border-med)'}`, background:form.status===s.v?`${s.c}12`:'var(--bg-alt)', cursor:'pointer', textAlign:'center', transition:'all 0.18s', fontFamily:'inherit' }}>
                  <div style={{ fontSize:10.5, fontWeight:700, color:form.status===s.v?s.c:'var(--text-muted)' }}>{s.l}</div>
                </button>
              ))}
            </div></div>
          <div><label className="input-label">Assign to DA (optional)</label><DriverSearch employees={emps} value={form.emp_id} onChange={handleEmpChange} placeholder="— Unassigned —"/></div>
          <div><label className="input-label">Notes</label><input className="input" value={form.notes} onChange={e => set('notes',e.target.value)} placeholder="Any notes…"/></div>
        </div>
        {confirm ? (
          <div style={{ marginTop:18, background:'#FFFBEB', border:'1.5px solid #FDE68A', borderRadius:12, padding:'14px 15px' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:12 }}>
              <AlertTriangle size={18} color="#B45309" style={{ flexShrink:0, marginTop:1 }}/>
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:'#92400E', marginBottom:3 }}>Replace existing number?</div>
                <div style={{ fontSize:12.5, color:'#92400E' }}><strong>{confirm.empName}</strong> already has <strong>{confirm.existingNumber}</strong>. Saving will replace it.</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setConfirm(null)} className="btn btn-secondary" style={{ flex:1, justifyContent:'center', fontSize:12 }}>Cancel</button>
              <button onClick={doSave} disabled={saving} className="btn btn-primary" style={{ flex:2, justifyContent:'center', fontSize:12, background:'#B45309', borderColor:'#B45309' }}>{saving?'Saving…':'Yes, replace it'}</button>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', gap:10, marginTop:18 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex:2, justifyContent:'center' }}>{saving?'Saving…':isEdit?'Save':'Add SIM'}</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── SIM Bulk Modal ─────────────────────────────────────────────
export function SimBulkModal({ station, emps, onClose, onSave }) {
  const [rows,   setRows]   = useState([])
  const [stage,  setStage]  = useState('upload')
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)
  const fileRef = useRef(null)
  function downloadTemplate() {
    const csv  = `sim_number,phone_number,carrier,status,station_code,monthly_cost,notes,emp_id\n8964050XXXXXXXX,+971501234567,Du,available,DDB1,50,Work SIM,E001\n`
    const blob = new Blob([csv], { type:'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href=url; a.download='sim_upload_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }
  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    return lines.slice(1).map((line, i) => {
      const vals = line.split(',').map(v => v.trim())
      const obj  = {}
      headers.forEach((h, j) => { obj[h] = vals[j]||'' })
      obj._row = i+2; obj._ok = !!obj.sim_number; return obj
    })
  }
  function handleFile(e) {
    setErr(null); const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) { setErr('Please upload a .csv file'); return }
    const reader = new FileReader()
    reader.onload = ev => {
      const parsed = parseCSV(ev.target.result)
      if (!parsed.length) { setErr('No data rows found.'); return }
      setRows(parsed); setStage('preview')
    }
    reader.readAsText(file)
  }
  async function handleUpload() {
    const valid = rows.filter(r => r._ok)
    if (!valid.length) { setErr('No valid rows to upload'); return }
    setSaving(true); setErr(null)
    try {
      const payload = valid.map(r => ({ sim_number:r.sim_number, phone_number:r.phone_number||null, carrier:r.carrier||'Du', status:r.status||'available', station_code:r.station_code||station||null, monthly_cost:parseFloat(r.monthly_cost)||0, notes:r.notes||null }))
      const res  = await fetch(`${API}/api/sims/bulk`, { method:'POST', headers:hdr(), body:JSON.stringify({ sims:payload }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data); setStage('result')
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }
  const invalidRows = rows.filter(r => !r._ok)
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:560 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div>
            <h3 style={{ fontWeight:900, fontSize:16, color:'var(--text)' }}>Bulk Upload SIM Cards</h3>
            <p style={{ fontSize:11.5, color:'#A89880', marginTop:2 }}>{station} Station</p>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:9, background:'var(--bg-alt)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14}/></button>
        </div>
        {err && <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:9, padding:'9px 12px', fontSize:12.5, color:'#C0392B', marginBottom:12 }}>{err}</div>}
        {stage==='upload' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'var(--bg-alt)', border:'1.5px dashed var(--border-med)', borderRadius:12, padding:'28px 24px', textAlign:'center' }}>
              <Upload size={32} style={{ margin:'0 auto 10px', display:'block', color:'var(--text-muted)' }}/>
              <div style={{ fontWeight:700, fontSize:14, color:'var(--text)', marginBottom:4 }}>Upload CSV file</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:16 }}>Columns: sim_number, phone_number, carrier, status, station_code, monthly_cost, notes, emp_id</div>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display:'none' }}/>
              <button className="btn btn-primary" onClick={() => fileRef.current?.click()} style={{ justifyContent:'center', marginBottom:10 }}><FileText size={14}/> Choose CSV File</button>
            </div>
            <button onClick={downloadTemplate} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px', borderRadius:10, background:'var(--bg-alt)', border:'1px solid var(--border)', cursor:'pointer', fontSize:12.5, fontWeight:600, color:'var(--text-sub)', fontFamily:'inherit' }}>
              <Download size={13}/> Download Template CSV
            </button>
          </div>
        )}
        {stage==='preview' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'flex', gap:8 }}>
              {[{l:'Total',v:rows.length,c:'var(--text)',bg:'var(--bg-alt)',bc:'var(--border)'},{l:'Valid',v:rows.filter(r=>r._ok).length,c:'#2E7D52',bg:'#ECFDF5',bc:'#A7F3D0'},{l:'Invalid',v:invalidRows.length,c:invalidRows.length?'#C0392B':'var(--text-muted)',bg:invalidRows.length?'#FEF2F2':'var(--bg-alt)',bc:invalidRows.length?'#FCA5A5':'var(--border)'}].map(s => (
                <div key={s.l} style={{ flex:1, textAlign:'center', padding:'10px 6px', borderRadius:10, background:s.bg, border:`1px solid ${s.bc}` }}>
                  <div style={{ fontWeight:900, fontSize:20, color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:10.5, color:s.c, fontWeight:600, marginTop:2 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ maxHeight:240, overflowY:'auto', borderRadius:10, border:'1px solid var(--border)' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11.5 }}>
                <thead><tr style={{ background:'var(--bg-alt)', position:'sticky', top:0 }}>
                  {['#','SIM Number','Phone','Carrier','Status','Station'].map(h => (
                    <th key={h} style={{ padding:'7px 10px', textAlign:'left', fontWeight:700, color:'var(--text-muted)', borderBottom:'1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{rows.map((r, i) => (
                  <tr key={i} style={{ background:r._ok?'transparent':'#FEF2F2', borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'6px 10px', color:'var(--text-muted)' }}>{r._row}</td>
                    <td style={{ padding:'6px 10px', fontWeight:700, color:r._ok?'var(--text)':'#C0392B' }}>{r.sim_number||'—'}</td>
                    <td style={{ padding:'6px 10px', color:'var(--text-sub)' }}>{r.phone_number||'—'}</td>
                    <td style={{ padding:'6px 10px', color:'var(--text-sub)' }}>{r.carrier||'Du'}</td>
                    <td style={{ padding:'6px 10px', color:'var(--text-sub)' }}>{r.status||'available'}</td>
                    <td style={{ padding:'6px 10px', color:'var(--text-sub)' }}>{r.station_code||station||'—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:4 }}>
              <button onClick={() => { setStage('upload'); setRows([]); if(fileRef.current) fileRef.current.value='' }} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>Back</button>
              <button onClick={handleUpload} disabled={saving||!rows.filter(r=>r._ok).length} className="btn btn-primary" style={{ flex:2, justifyContent:'center' }}>{saving?'Uploading…':`Upload ${rows.filter(r=>r._ok).length} SIMs`}</button>
            </div>
          </div>
        )}
        {stage==='result' && result && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <CheckCircle size={40} style={{ margin:'0 auto 12px', display:'block', color:'#2E7D52' }}/>
              <div style={{ fontWeight:800, fontSize:17, color:'var(--text)', marginBottom:6 }}>Upload Complete</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {[{l:'Inserted',v:result.inserted,c:'#2E7D52',bg:'#ECFDF5',bc:'#A7F3D0'},{l:'Skipped (dup)',v:result.skipped,c:'#B8860B',bg:'#FDF6E3',bc:'#F0D78C'},{l:'Errors',v:result.errors?.length||0,c:result.errors?.length?'#C0392B':'var(--text-muted)',bg:result.errors?.length?'#FEF2F2':'var(--bg-alt)',bc:result.errors?.length?'#FCA5A5':'var(--border)'}].map(s => (
                <div key={s.l} style={{ flex:1, textAlign:'center', padding:'10px 6px', borderRadius:10, background:s.bg, border:`1px solid ${s.bc}` }}>
                  <div style={{ fontWeight:900, fontSize:20, color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:10.5, color:s.c, fontWeight:600, marginTop:2 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <button onClick={() => { onSave(); onClose() }} className="btn btn-primary" style={{ justifyContent:'center' }}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── SIM Section ───────────────────────────────────────────────
export function SimSection({ sims, emps, station, onRefresh }) {
  const [modal,      setModal]      = useState(null)
  const [search,     setSearch]     = useState('')
  const [confirmDlg, setConfirmDlg] = useState(null)
  const SC = { available:{c:'#2E7D52',bg:'#ECFDF5',bc:'#A7F3D0',l:'Available'}, assigned:{c:'#B8860B',bg:'#FDF6E3',bc:'#F0D78C',l:'Assigned'}, inactive:{c:'#A89880',bg:'var(--bg-alt)',bc:'var(--border)',l:'Inactive'}, damaged:{c:'#C0392B',bg:'#FEF2F2',bc:'#FCA5A5',l:'Damaged'} }
  const filtered = sims.filter(s => !search || s.sim_number?.toLowerCase().includes(search.toLowerCase()) || s.phone_number?.toLowerCase().includes(search.toLowerCase()) || s.emp_name?.toLowerCase().includes(search.toLowerCase()))
  function handleDelete(id, simNumber) {
    setConfirmDlg({ title:'Delete SIM card?', message:`SIM ${simNumber} will be permanently removed.`, confirmLabel:'Delete', danger:true,
      onConfirm: async () => {
        setConfirmDlg(null)
        await fetch(`${API}/api/sims/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } })
        onRefresh()
      }
    })
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
        {[{l:'Total',v:sims.length,c:'var(--text)',bg:'var(--bg-alt)',bc:'var(--border)'},{l:'In Use',v:sims.filter(s=>s.status==='assigned').length,c:'#B8860B',bg:'#FDF6E3',bc:'#F0D78C'},{l:'Free',v:sims.filter(s=>s.status==='available').length,c:'#2E7D52',bg:'#ECFDF5',bc:'#A7F3D0'}].map(s => (
          <div key={s.l} style={{ textAlign:'center', padding:'12px 8px', borderRadius:12, background:s.bg, border:`1px solid ${s.bc}` }}>
            <div style={{ fontWeight:900, fontSize:22, color:s.c, letterSpacing:'-0.03em' }}>{s.v}</div>
            <div style={{ fontSize:10.5, color:s.c, fontWeight:600, marginTop:3 }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <div style={{ flex:1, position:'relative' }}>
          <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
          <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SIM, phone, DA…" style={{ paddingLeft:34, borderRadius:20 }}/>
        </div>
        <button className="btn btn-secondary" onClick={() => setModal({type:'bulk'})} style={{ borderRadius:20, padding:'9px 14px', gap:5 }}><Upload size={14}/> Bulk</button>
        <button className="btn btn-primary" onClick={() => setModal({type:'add'})} style={{ borderRadius:20, padding:'9px 16px' }}><Plus size={14}/> Add SIM</button>
      </div>
      {filtered.length===0 ? (
        <div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>
          <Smartphone size={36} style={{ margin:'0 auto 10px', display:'block', opacity:0.2 }}/>
          <div style={{ fontWeight:600 }}>{search?`No results for "${search}"`:'No SIM cards yet — add one above'}</div>
        </div>
      ) : filtered.map((sim,i) => {
        const sc = SC[sim.status]||SC.available
        return (
          <div key={sim.id} onClick={() => setModal({type:'edit',sim})} style={{ background:'var(--card)', border:`1.5px solid ${sc.bc}`, borderRadius:14, padding:'13px 15px', animation:`slideUp 0.3s ${i*0.04}s ease both`, cursor:'pointer', transition:'box-shadow 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
            <div style={{ display:'flex', alignItems:'center', gap:11 }}>
              <div style={{ width:42, height:42, borderRadius:12, background:sc.bg, border:`1px solid ${sc.bc}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Smartphone size={18} color={sc.c}/></div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>{sim.phone_number||sim.sim_number}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2, display:'flex', gap:5, flexWrap:'wrap' }}>
                  <span>{sim.carrier}</span>
                  {sim.phone_number&&<><span>·</span><span style={{ fontSize:10 }}>{sim.sim_number}</span></>}
                  {sim.monthly_cost>0&&<><span>·</span><span style={{ color:'#7C3AED', fontWeight:600 }}>AED {sim.monthly_cost}/mo</span></>}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
                <span style={{ fontSize:11, fontWeight:700, color:sc.c, background:sc.bg, border:`1px solid ${sc.bc}`, borderRadius:20, padding:'2px 10px' }}>{sc.l}</span>
                <div style={{ display:'flex', gap:5 }}>
                  <button onClick={e => { e.stopPropagation(); setModal({type:'edit',sim}) }} style={{ padding:'4px 10px', borderRadius:7, background:'var(--bg-alt)', border:'none', cursor:'pointer', fontSize:11, color:'var(--text-sub)', fontWeight:600, fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}><Pencil size={11}/> Edit</button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(sim.id, sim.sim_number||sim.phone_number||'—') }} style={{ padding:'4px 8px', borderRadius:7, background:'#FEF2F2', border:'none', cursor:'pointer', color:'#C0392B', display:'flex', alignItems:'center', fontFamily:'inherit' }}><Trash2 size={11}/></button>
                </div>
              </div>
            </div>
            {sim.emp_id && (
              <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,#FDF6E3,#FEF3D0)', border:'1px solid #F0D78C', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'#B8860B', flexShrink:0 }}>{sim.emp_name?.slice(0,2).toUpperCase()}</div>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{sim.emp_name}</div>
                  <div style={{ fontSize:10.5, color:'var(--text-muted)' }}>Assigned {sim.assigned_at?.slice(0,10)||'—'}</div>
                </div>
              </div>
            )}
          </div>
        )
      })}
      {modal?.type==='add'  && <SimModal emps={emps} station={station} onClose={() => setModal(null)} onSave={() => { setModal(null); onRefresh() }}/>}
      {modal?.type==='edit' && <SimModal sim={modal.sim} emps={emps} station={station} onClose={() => setModal(null)} onSave={() => { setModal(null); onRefresh() }}/>}
      {modal?.type==='bulk' && <SimBulkModal station={station} emps={emps} onClose={() => setModal(null)} onSave={() => { setModal(null); onRefresh() }}/>}
      <ConfirmDialog open={!!confirmDlg} title={confirmDlg?.title} message={confirmDlg?.message} confirmLabel={confirmDlg?.confirmLabel} danger={confirmDlg?.danger??true} onConfirm={confirmDlg?.onConfirm} onCancel={() => setConfirmDlg(null)}/>
    </div>
  )
}

// ── Work Number Modal ─────────────────────────────────────────
export function WorkNumModal({ emp, station, sims, onSave, onClose }) {
  const available = (sims||[]).filter(s => s.phone_number && (s.status==='available' || s.emp_id===emp.id))
  const [saving,   setSaving]  = useState(false)
  const [conflict, setConflict]= useState(null)
  const [step,     setStep]    = useState(0)
  const [pending,  setPending] = useState('')
  const h = { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gcd_token')}` }
  async function tryAssign(phoneNumber, force=false) {
    setSaving(true)
    try {
      const r = await fetch(`${API}/api/employees/${emp.id}/assign-work-number`, { method:'POST', headers:h, body:JSON.stringify({ phone_number:phoneNumber, force }) })
      const d = await r.json()
      if (d.conflict) { setPending(phoneNumber); setConflict({ conflictEmpId:d.conflictEmpId, conflictEmpName:d.conflictEmpName }); setStep(1) }
      else if (d.ok) { onSave() }
      else if (d.error) { alert(d.error) }
    } catch { alert('Failed to assign') } finally { setSaving(false) }
  }
  async function handleRemove() {
    setSaving(true)
    try {
      await fetch(`${API}/api/employees/${emp.id}/work-number`, { method:'DELETE', headers:h })
      onSave()
    } catch { alert('Failed to remove') } finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:360 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <h3 style={{ fontWeight:800, fontSize:16, color:'var(--text)' }}>Assign Work Number</h3>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{emp.name}{emp.work_number&&<span style={{ marginLeft:8, color:'#B8860B' }}>({emp.work_number})</span>}</p>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:8, background:'var(--bg-alt)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={13}/></button>
        </div>
        {step===1 && conflict && (
          <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
            <p style={{ fontSize:13, fontWeight:600, color:'#92400E', marginBottom:10 }}>⚠️ <strong>{pending}</strong> is already assigned to <strong>{conflict.conflictEmpName}</strong>. Proceed?</p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setStep(2)} style={{ flex:1, padding:'8px', borderRadius:8, background:'#B8860B', color:'white', border:'none', cursor:'pointer', fontWeight:700, fontSize:12 }}>Yes, proceed</button>
              <button onClick={() => { setStep(0); setPending(''); setConflict(null) }} style={{ flex:1, padding:'8px', borderRadius:8, background:'var(--bg-alt)', color:'var(--text-sub)', border:'none', cursor:'pointer', fontSize:12 }}>Cancel</button>
            </div>
          </div>
        )}
        {step===2 && conflict && (
          <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
            <p style={{ fontSize:13, fontWeight:600, color:'#7F1D1D', marginBottom:10 }}>Assign a new number to <strong>{conflict.conflictEmpName}</strong>?</p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => tryAssign(pending,true)} disabled={saving} style={{ flex:1, padding:'8px', borderRadius:8, background:'#EF4444', color:'white', border:'none', cursor:'pointer', fontWeight:700, fontSize:12 }}>{saving?'…':'No, just remove it'}</button>
              <button onClick={() => tryAssign(pending,true)} disabled={saving} style={{ flex:1, padding:'8px', borderRadius:8, background:'#10B981', color:'white', border:'none', cursor:'pointer', fontWeight:700, fontSize:12 }}>{saving?'…':'Yes, will reassign'}</button>
            </div>
          </div>
        )}
        {step===0 && (
          <>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Select from SIM cards ({station})</p>
            {available.length===0 ? (
              <div style={{ textAlign:'center', padding:'20px 0', fontSize:13, color:'var(--text-muted)' }}>No available SIM numbers for this station</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:220, overflowY:'auto', marginBottom:14 }}>
                {available.map(s => (
                  <button key={s.id} onClick={() => tryAssign(s.phone_number)} disabled={saving}
                    style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', borderRadius:10, background:s.emp_id===emp.id?'#F0FDF4':'var(--bg-alt)', border:`1.5px solid ${s.emp_id===emp.id?'#A7F3D0':'var(--border)'}`, cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{s.phone_number}</span>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      {s.emp_id===emp.id&&<span style={{ fontSize:10, fontWeight:700, color:'#10B981' }}>Current</span>}
                      <span style={{ fontSize:10, color:'var(--text-muted)' }}>{s.carrier}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={onClose} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>Cancel</button>
              {emp.work_number && (
                <button onClick={handleRemove} disabled={saving}
                  style={{ flex:1, padding:'9px', borderRadius:10, background:'#FEF2F2', border:'1px solid #FECACA', color:'#EF4444', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                  {saving?'…':'Remove Number'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Fuel labels (shared) ──────────────────────────────────────
const FUEL_LABEL_MAP = { empty:'Empty', quarter:'1/4', half:'1/2', three_quarter:'3/4', full:'Full' }

// ── Vehicle History Modal ─────────────────────────────────────
function VehicleHistoryModal({ v, onClose }) {
  const [tab,     setTab]     = useState('assignments')
  const [asgns,   setAsgns]   = useState([])
  const [handovs, setHandovs] = useState([])
  const [loading, setLoading] = useState(true)
  const sc = VSTATUS_COLORS[v.status]||'#A89880'
  const sb = VSTATUS_BG[v.status]||'#F5F4F1'

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`${API}/api/vehicles/assignments/history?vehicle_id=${v.id}&limit=60`, { headers:hdr() }).then(r=>r.json()),
      fetch(`${API}/api/handovers?vehicle_id=${v.id}&limit=60`, { headers:hdr() }).then(r=>r.json()),
    ]).then(([aData, hData]) => {
      setAsgns(aData.history||[])
      setHandovs((hData.handovers||[]).filter(h => String(h.vehicle_id)===String(v.id)))
    }).catch(()=>{}).finally(()=>setLoading(false))
  }, [v.id])

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:520 }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:46, height:46, borderRadius:14, background:sb, border:`1.5px solid ${sc}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Truck size={20} color={sc}/>
            </div>
            <div>
              <div style={{ fontWeight:900, fontSize:18, color:'var(--text)', letterSpacing:'0.04em' }}>{v.plate}</div>
              <div style={{ fontSize:11.5, color:'var(--text-muted)' }}>{[v.make,v.model,v.year].filter(Boolean).join(' ')||'Vehicle'}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16}/></button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, background:'var(--bg-alt)', borderRadius:12, padding:3, marginBottom:14 }}>
          {[['assignments','Assignments',Calendar],['handovers','Handovers',ArrowLeftRight]].map(([id,label,Icon])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px 10px', borderRadius:9, border:'none', background:tab===id?'var(--card)':'transparent', color:tab===id?'var(--text)':'var(--text-muted)', fontWeight:tab===id?700:500, fontSize:12.5, cursor:'pointer', boxShadow:tab===id?'0 1px 4px rgba(0,0,0,0.1)':'none', transition:'all 0.15s', fontFamily:'inherit' }}>
              <Icon size={13}/> {label}
              <span style={{ fontSize:10, fontWeight:700, color:tab===id?'var(--gold)':'var(--text-muted)', background:tab===id?'var(--amber-bg)':'var(--border)', borderRadius:20, padding:'0px 6px', marginLeft:2 }}>
                {id==='assignments'?asgns.length:handovs.length}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ maxHeight:400, overflowY:'auto' }}>
          {loading ? (
            <div style={{ padding:'30px 0', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>Loading history…</div>
          ) : tab==='assignments' ? (
            asgns.length===0 ? (
              <div style={{ padding:'30px 0', textAlign:'center', color:'var(--text-muted)' }}>
                <Calendar size={32} style={{ margin:'0 auto 10px', display:'block', opacity:0.2 }}/>
                <div style={{ fontSize:13, fontWeight:600 }}>No assignment history</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {asgns.map((a,i)=>(
                  <div key={a.id||i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:11, background:'var(--bg-alt)', border:'1px solid var(--border)', animation:`slideUp 0.2s ${Math.min(i,15)*0.03}s ease both` }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:a.emp_id?'linear-gradient(135deg,#FDF6E3,#FEF3D0)':'var(--bg-alt)', border:a.emp_id?'1px solid #F0D78C':'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:a.emp_id?'#B8860B':'var(--text-muted)', flexShrink:0 }}>
                      {a.emp_id?(a.driver_name||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase():'—'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.driver_name||'— Unassigned —'}</div>
                      <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:1 }}>{a.date?.slice(0,10)}</div>
                    </div>
                    <span style={{ fontSize:9.5, color:'#B8860B', background:'#FDF6E3', border:'1px solid #F0D78C', borderRadius:5, padding:'2px 7px', fontWeight:700, flexShrink:0 }}>{a.station_code}</span>
                  </div>
                ))}
              </div>
            )
          ) : (
            handovs.length===0 ? (
              <div style={{ padding:'30px 0', textAlign:'center', color:'var(--text-muted)' }}>
                <ArrowLeftRight size={32} style={{ margin:'0 auto 10px', display:'block', opacity:0.2 }}/>
                <div style={{ fontSize:13, fontWeight:600 }}>No handover history</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {handovs.map((h,i)=>{
                  const isRec = h.type==='received'
                  return (
                    <div key={h.id} style={{ borderRadius:12, overflow:'hidden', border:`1px solid ${isRec?'#A7F3D0':'#FECACA'}`, animation:`slideUp 0.2s ${Math.min(i,15)*0.03}s ease both` }}>
                      <div style={{ height:3, background:isRec?'#10B981':'#EF4444' }}/>
                      <div style={{ padding:'10px 12px', display:'flex', gap:10, alignItems:'flex-start' }}>
                        <div style={{ width:34, height:34, borderRadius:10, background:isRec?'#ECFDF5':'#FEF2F2', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {isRec?<ArrowDownToLine size={14} color="#10B981"/>:<ArrowUpFromLine size={14} color="#EF4444"/>}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:6, marginBottom:5 }}>
                            <div>
                              <div style={{ fontSize:10.5, fontWeight:700, color:isRec?'#10B981':'#EF4444', textTransform:'uppercase', letterSpacing:'0.06em' }}>{isRec?'Received':'Returned'}</div>
                              <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginTop:1 }}>{h.emp_name}</div>
                            </div>
                            <div style={{ fontSize:10.5, color:'var(--text-muted)', textAlign:'right', flexShrink:0 }}>
                              {new Date(h.submitted_at).toLocaleDateString('en-AE',{day:'numeric',month:'short'})}
                              <br/>{new Date(h.submitted_at).toLocaleTimeString('en-AE',{hour:'2-digit',minute:'2-digit'})}
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                            {h.fuel_level&&<span style={{ fontSize:10.5, color:'#B45309', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:5, padding:'1px 7px', fontWeight:600 }}>
                              Fuel: {FUEL_LABEL_MAP[h.fuel_level]||h.fuel_level}
                            </span>}
                            {h.odometer&&<span style={{ fontSize:10.5, color:'#1D4ED8', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:5, padding:'1px 7px', fontWeight:600 }}>
                              {Number(h.odometer).toLocaleString()} km
                            </span>}
                            {(h.handover_from||h.handover_to)&&<span style={{ fontSize:10.5, color:'var(--text-muted)' }}>
                              {isRec?'From:':'To:'} {h.handover_from||h.handover_to}
                            </span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

// ── Vehicle Card ──────────────────────────────────────────────
export function VehicleCard({ v, asgn, currentHandover, isDown, sc, sb, date, station, emps, onEdit, onDelete, onAssign }) {
  const [showAssign,    setShowAssign]    = useState(false)
  const [showHistModal, setShowHistModal] = useState(false)
  const assignedEmp = asgn?.emp_id ? emps.find(e => e.id===asgn.emp_id) : null
  const hasHandover = !!currentHandover

  return (
    <>
      <div style={{ background:'var(--card)', borderRadius:20, overflow:'hidden', border:`1px solid ${hasHandover?'#A7F3D0':isDown?`${sc}40`:'var(--border)'}`, boxShadow:hasHandover?'0 0 0 2px rgba(16,185,129,0.15)':'0 2px 8px rgba(0,0,0,0.04)', transition:'box-shadow 0.2s' }}
        onMouseEnter={e=>e.currentTarget.style.boxShadow=hasHandover?'0 0 0 2px rgba(16,185,129,0.2),0 8px 24px rgba(0,0,0,0.08)':'0 8px 24px rgba(0,0,0,0.08)'}
        onMouseLeave={e=>e.currentTarget.style.boxShadow=hasHandover?'0 0 0 2px rgba(16,185,129,0.15)':'0 2px 8px rgba(0,0,0,0.04)'}>

        <div style={{ height:4, background:`linear-gradient(90deg,${sc},${sc}80)` }}/>

        <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:12 }}>

          {/* ── Header row ── */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:50, height:50, borderRadius:15, background:sb, border:`2px solid ${sc}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 4px 12px ${sc}18` }}>
                <Truck size={22} color={sc}/>
              </div>
              <div>
                <div style={{ fontWeight:900, fontSize:19, color:'var(--text)', letterSpacing:'0.04em', lineHeight:1 }}>{v.plate}</div>
                <div style={{ fontSize:11.5, color:'var(--text-muted)', marginTop:3 }}>{[v.make,v.model,v.year].filter(Boolean).join(' ')||'Vehicle'}</div>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
              <div style={{ display:'flex', gap:5 }}>
                <span style={{ fontSize:10.5, fontWeight:700, color:sc, background:sb, padding:'3px 10px', borderRadius:20, border:`1px solid ${sc}30`, textTransform:'capitalize' }}>{v.status}</span>
                {v.station_code&&<span style={{ fontSize:9.5, fontWeight:700, color:'#B8860B', background:'#FDF6E3', border:'1px solid #F0D78C', borderRadius:6, padding:'2px 7px' }}>{v.station_code}</span>}
              </div>
              <div style={{ display:'flex', gap:4 }}>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={onEdit} title="Edit"><Pencil size={12}/></button>
                <button className="btn btn-ghost btn-icon btn-sm" style={{ color:'#EF4444' }} onClick={onDelete} title="Delete"><Trash2 size={12}/></button>
              </div>
            </div>
          </div>

          {/* ── Grounded reason ── */}
          {isDown&&v.grounded_reason&&(
            <div style={{ background:`${sc}10`, border:`1px solid ${sc}30`, borderRadius:10, padding:'8px 12px', fontSize:12, color:sc, display:'flex', gap:6, alignItems:'flex-start' }}>
              <AlertTriangle size={13} style={{ flexShrink:0, marginTop:1 }}/> {v.grounded_reason}{v.grounded_since?` · since ${v.grounded_since.slice(0,10)}`:''}
            </div>
          )}

          {/* ── Active handover banner ── */}
          {hasHandover ? (
            <div style={{ background:'linear-gradient(135deg,#ECFDF5,#F0FFF8)', border:'1.5px solid #6EE7B7', borderRadius:14, padding:'11px 13px', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:38, height:38, borderRadius:11, background:'#D1FAE5', border:'1px solid #A7F3D0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <ArrowLeftRight size={17} color="#2E7D52"/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:9.5, fontWeight:700, color:'#2E7D52', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2 }}>Currently In Use</div>
                <div style={{ fontSize:13.5, fontWeight:800, color:'#064E3B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{currentHandover.emp_name}</div>
                <div style={{ fontSize:10.5, color:'#065F46', marginTop:1 }}>
                  {new Date(currentHandover.submitted_at).toLocaleString('en-AE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                  {currentHandover.fuel_level&&` · ${FUEL_LABEL_MAP[currentHandover.fuel_level]||currentHandover.fuel_level}`}
                </div>
              </div>
              <span style={{ fontSize:9, fontWeight:800, color:'#2E7D52', background:'#A7F3D0', borderRadius:20, padding:'3px 9px', textTransform:'uppercase', letterSpacing:'0.08em', flexShrink:0 }}>Live</span>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', background:'var(--bg-alt)', border:'1px solid var(--border)', borderRadius:12 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#D1D5DB', flexShrink:0 }}/>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>No active handover — vehicle available</span>
            </div>
          )}

          {/* ── Daily assignment ── */}
          <div>
            <div style={{ fontSize:9.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:7, display:'flex', alignItems:'center', gap:5 }}>
              <Clock size={10}/> Assigned — {date}
            </div>
            {assignedEmp ? (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 13px', background:'linear-gradient(135deg,#FDF6E3,#FFFBEB)', border:'1.5px solid #F0D78C', borderRadius:13 }}>
                <div style={{ width:36, height:36, borderRadius:11, background:'linear-gradient(135deg,#B8860B,#D4A017)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, color:'white', flexShrink:0 }}>
                  {assignedEmp.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#92400E', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{assignedEmp.name}</div>
                  <div style={{ fontSize:10.5, color:'#B45309', marginTop:1 }}>Assigned by POC</div>
                </div>
                <button onClick={()=>setShowAssign(p=>!p)} style={{ padding:'5px 10px', borderRadius:8, background:'rgba(184,134,11,0.1)', border:'1px solid rgba(184,134,11,0.3)', color:'#B8860B', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s', flexShrink:0 }}>
                  Change
                </button>
              </div>
            ) : (
              <div onClick={()=>setShowAssign(p=>!p)} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 13px', background:'var(--bg-alt)', border:`1.5px dashed ${showAssign?'var(--gold)':'var(--border-med)'}`, borderRadius:13, cursor:'pointer', transition:'all 0.2s' }}>
                <div style={{ width:32, height:32, borderRadius:9, background:'var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Users size={14} color="var(--text-muted)"/>
                </div>
                <span style={{ fontSize:12.5, color:'var(--text-muted)', fontStyle:'italic', flex:1 }}>Unassigned — tap to assign</span>
                <ChevronDown size={14} color="var(--text-muted)" style={{ transition:'transform 0.2s', transform:showAssign?'rotate(180deg)':'none', flexShrink:0 }}/>
              </div>
            )}
            {showAssign&&(
              <div style={{ marginTop:8, animation:'slideUp 0.2s ease' }}>
                <DriverSearch employees={emps.filter(e=>e.station_code===station)} value={asgn?.emp_id||''} onChange={id=>{ onAssign(id); setShowAssign(false) }} placeholder="— Unassigned —"/>
              </div>
            )}
          </div>

          {/* ── History button ── */}
          <button onClick={()=>setShowHistModal(true)} style={{ display:'flex', alignItems:'center', gap:7, width:'100%', padding:'10px 14px', borderRadius:12, background:'var(--bg-alt)', border:'1px solid var(--border)', cursor:'pointer', fontSize:12.5, fontWeight:600, color:'var(--text-sub)', transition:'all 0.15s', fontFamily:'inherit' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--card)';e.currentTarget.style.borderColor='var(--gold)';e.currentTarget.style.color='var(--gold)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--bg-alt)';e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text-sub)'}}>
            <History size={13}/> View Full History
            <ChevronRight size={13} style={{ marginLeft:'auto' }}/>
          </button>
        </div>
      </div>

      {showHistModal&&<VehicleHistoryModal v={v} onClose={()=>setShowHistModal(false)}/>}
    </>
  )
}

// ── DA Avatar ─────────────────────────────────────────────────
export function DAAvatar({ emp }) {
  const [broken, setBroken] = useState(false)
  const initials = emp.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
  if (emp.avatar && !broken) {
    return <img src={emp.avatar} alt="" onError={() => setBroken(true)}
      style={{ width:48, height:48, borderRadius:14, objectFit:'cover', flexShrink:0, border:'2px solid var(--border-med)' }}/>
  }
  const COLORS = ['#B8860B','#1D6FA4','#2E7D52','#7C3AED','#C0392B','#0F766E']
  const color  = COLORS[emp.name.charCodeAt(0) % COLORS.length]
  return (
    <div style={{ width:48, height:48, borderRadius:14, background:`${color}18`, border:`2px solid ${color}33`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontWeight:800, fontSize:16, color }}>
      {initials}
    </div>
  )
}

export function InfoRow({ label, value, highlight, icon }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ padding:'8px 12px', borderRadius:10, background:'var(--bg-alt)', border:'1px solid var(--border)' }}>
      <div style={{ fontSize:9.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:12.5, fontWeight:700, color:highlight?'#7C3AED':'var(--text)', display:'flex', alignItems:'center', gap:5 }}>{icon}{String(value)}</div>
    </div>
  )
}

export function EmpDetailModal({ emp, sims, onClose }) {
  const sim   = (sims||[]).find(s => s.emp_id === emp.id)
  const today = new Date()
  function daysDiff(dateStr) {
    if (!dateStr) return null
    return Math.ceil((new Date(dateStr) - today) / 86400000)
  }
  function ExpiryBadge({ label, date }) {
    const days = daysDiff(date)
    if (days === null) return null
    const expired = days < 0; const soon = !expired && days <= 30
    const c  = expired?'#C0392B':soon?'#B8860B':'#2E7D52'
    const bg = expired?'#FEF2F2':soon?'#FDF6E3':'#ECFDF5'
    const bc = expired?'#FCA5A5':soon?'#F0D78C':'#A7F3D0'
    return (
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', borderRadius:10, background:bg, border:`1px solid ${bc}`, marginBottom:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {(expired||soon)&&<AlertTriangle size={11} color={c}/>}
          <span style={{ fontSize:12, color:'var(--text-sub)', fontWeight:600 }}>{label}</span>
        </div>
        <div style={{ textAlign:'right' }}>
          <span style={{ fontSize:12, fontWeight:700, color:c }}>{date?.slice(0,10)||'—'}</span>
          <span style={{ fontSize:10, color:c, fontWeight:600, marginLeft:6 }}>{expired?`${Math.abs(days)}d ago`:`${days}d left`}</span>
        </div>
      </div>
    )
  }
  const STATUS_C = { active:{c:'#2E7D52',bg:'#ECFDF5',bc:'#A7F3D0'}, on_leave:{c:'#B8860B',bg:'#FDF6E3',bc:'#F0D78C'}, inactive:{c:'#C0392B',bg:'#FEF2F2',bc:'#FCA5A5'} }
  const sc = STATUS_C[emp.status]||STATUS_C.active
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:480, maxHeight:'90vh', overflowY:'auto', padding:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
          <span style={{ fontWeight:800, fontSize:15, color:'var(--text)' }}>Employee Profile</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17}/></button>
        </div>
        <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', gap:14, alignItems:'center', padding:'16px', background:'var(--bg-alt)', borderRadius:16, border:'1px solid var(--border)' }}>
            <DAAvatar emp={emp}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:800, fontSize:17, color:'var(--text)', marginBottom:6 }}>{emp.name}</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                <span style={{ fontSize:11, fontWeight:700, color:'#B8860B', background:'#FDF6E3', border:'1px solid #F0D78C', borderRadius:6, padding:'2px 8px' }}>{emp.id}</span>
                {emp.station_code&&<span style={{ fontSize:11, fontWeight:700, color:'#1D6FA4', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:6, padding:'2px 8px' }}>{emp.station_code}</span>}
                <span style={{ fontSize:11, fontWeight:700, color:sc.c, background:sc.bg, border:`1px solid ${sc.bc}`, borderRadius:6, padding:'2px 8px', textTransform:'capitalize' }}>{emp.status?.replace('_',' ')}</span>
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8, display:'flex', alignItems:'center', gap:5 }}><Briefcase size={11}/> Work Info</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              <InfoRow label="Role" value={emp.role}/>
              <InfoRow label="Department" value={emp.dept}/>
              <InfoRow label="Nationality" value={emp.nationality}/>
              <InfoRow label="Zone" value={emp.zone}/>
              {emp.project_type&&<InfoRow label="Project" value={emp.project_type}/>}
              {emp.joined&&<InfoRow label="Joined" value={emp.joined?.slice(0,10)}/>}
            </div>
          </div>
          <div>
            <div style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8, display:'flex', alignItems:'center', gap:5 }}><Phone size={11}/> Contact</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              <InfoRow label="Personal"  value={emp.phone}      icon={<Phone size={11}/>}/>
              <InfoRow label="Work SIM"  value={sim?.phone_number||emp.work_number} highlight icon={<Smartphone size={11}/>}/>
            </div>
          </div>
          {(emp.emirates_id||emp.amazon_id||emp.transporter_id)&&(
            <div>
              <div style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8, display:'flex', alignItems:'center', gap:5 }}><CreditCard size={11}/> IDs</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {emp.emirates_id&&<InfoRow label="Emirates ID" value={emp.emirates_id}/>}
                {emp.amazon_id&&<InfoRow label="Amazon ID" value={emp.amazon_id}/>}
                {emp.transporter_id&&<InfoRow label="Transporter ID" value={emp.transporter_id}/>}
              </div>
            </div>
          )}
          {(emp.visa_expiry||emp.license_expiry||emp.iloe_expiry)&&(
            <div>
              <div style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8, display:'flex', alignItems:'center', gap:5 }}><Calendar size={11}/> Expiries</div>
              <ExpiryBadge label="Visa" date={emp.visa_expiry}/>
              <ExpiryBadge label="License" date={emp.license_expiry}/>
              <ExpiryBadge label="ILOE" date={emp.iloe_expiry}/>
            </div>
          )}
          <div>
            <div style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8, display:'flex', alignItems:'center', gap:5 }}><Calendar size={11}/> Leave & Pay</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              <InfoRow label="Leave Balance" value={emp.annual_leave_balance!=null?`${emp.annual_leave_balance} days`:null}/>
              {emp.hourly_rate>0&&<InfoRow label="Hourly Rate" value={`AED ${emp.hourly_rate}/hr`}/>}
              {emp.per_shipment_rate>0&&<InfoRow label="Per Shipment" value={`AED ${emp.per_shipment_rate}`}/>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── DAs Tab ───────────────────────────────────────────────────
export function DAsTab({ stationEmps, sims, onViewEmp }) {
  const [q, setQ] = useState('')
  const filtered = stationEmps.filter(e => !q || e.name.toLowerCase().includes(q.toLowerCase()) || e.id.toLowerCase().includes(q.toLowerCase()))
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ position:'relative', flex:1 }}>
          <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
          <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or ID…" style={{ paddingLeft:34, borderRadius:20 }}/>
        </div>
        <span style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', whiteSpace:'nowrap', flexShrink:0 }}>{filtered.length} DA{filtered.length!==1?'s':''}</span>
      </div>
      {filtered.length===0 && <div style={{ textAlign:'center', padding:50, color:'var(--text-muted)', fontSize:13 }}>No drivers found</div>}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:10 }}>
        {filtered.map((emp,i) => {
          const workSim = sims.find(s => s.emp_id===emp.id)
          return (
            <div key={emp.id} onClick={() => onViewEmp&&onViewEmp(emp)}
              style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'14px', animation:`slideUp 0.25s ${Math.min(i,10)*0.03}s ease both`, display:'flex', gap:12, alignItems:'flex-start', transition:'box-shadow 0.2s,border-color 0.2s', cursor:'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor='#B8860B66' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor='var(--border)' }}>
              <DAAvatar emp={emp}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5, flexWrap:'wrap' }}>
                  <span style={{ fontWeight:700, fontSize:13.5, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:160 }}>{emp.name}</span>
                  {emp.station_code&&<span style={{ fontSize:9.5, fontWeight:700, color:'#B8860B', background:'#FDF6E3', border:'1px solid #F0D78C', borderRadius:6, padding:'1px 7px', flexShrink:0 }}>{emp.station_code}</span>}
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:5 }}>
                  <span style={{ fontSize:11, color:'var(--text-muted)', background:'var(--bg-alt)', padding:'2px 8px', borderRadius:6, border:'1px solid var(--border)' }}>{emp.id}</span>
                  {emp.nationality&&<span style={{ fontSize:11, color:'var(--text-muted)', background:'var(--bg-alt)', padding:'2px 8px', borderRadius:6, border:'1px solid var(--border)' }}>{emp.nationality}</span>}
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {emp.phone&&<span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--text-muted)' }}><span style={{ fontSize:9, fontWeight:600, textTransform:'uppercase' }}>Personal</span><span style={{ fontWeight:600, color:'var(--text)', fontSize:11 }}>{emp.phone}</span></span>}
                  {workSim?.phone_number&&<span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11 }}><span style={{ fontSize:9, color:'#7C3AED', fontWeight:600, textTransform:'uppercase' }}>SIM</span><span style={{ fontWeight:600, color:'#7C3AED', fontSize:11 }}>{workSim.phone_number}</span></span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
