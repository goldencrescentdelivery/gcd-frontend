'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { useSearchParams } from 'next/navigation'
import { Plus, X, Pencil, Trash2, Truck, Users, Package, Bell, Calendar, CheckCircle, XCircle, Search, ChevronDown, ChevronRight, AlertTriangle, MapPin, Clock, Smartphone, ArrowLeftRight, CheckSquare, History, Contact, Upload, Download, FileText } from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'

import { API } from '@/lib/api'
const CYCLES  = ['A','B','C','Beset','MR','FM','Rescue']
const CYCLE_H = { A:5, B:4, C:5, Beset:5, MR:4, FM:5 }
const MAX_HRS = 10
const VSTATUS_COLORS = { active:'#2E7D52', grounded:'#C0392B', maintenance:'#B45309', sold:'#A89880' }
const VSTATUS_BG     = { active:'#ECFDF5', grounded:'#FEF2F2', maintenance:'#FFFBEB', sold:'#F5F4F1' }

function hdr() { return { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }

// ── Driver Search Dropdown ────────────────────────────────────
function DriverSearch({ employees, value, onChange, placeholder='Search driver…' }) {
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
      <div onClick={()=>setOpen(p=>!p)} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', background:'var(--card)', border:`1.5px solid ${open?'var(--gold)':'var(--border-med)'}`, borderRadius:12, cursor:'pointer', transition:'all 0.2s', boxShadow:open?'0 0 0 3px rgba(184,134,11,0.1)':'' }}>
        {selected ? (
          <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:'var(--amber-bg)', border:'1px solid var(--gold-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{selected.avatar||'👤'}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{selected.name}</div>
              <div style={{ fontSize:10.5, color:'var(--text-muted)', fontFamily:'inherit' }}>{selected.id}</div>
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
              <input autoFocus className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or ID…" style={{ paddingLeft:32, fontSize:12, borderRadius:8 }}/>
            </div>
          </div>
          <div style={{ overflowY:'auto', maxHeight:230 }}>
            <div onClick={()=>{onChange('');setOpen(false);setSearch('')}} style={{ padding:'10px 14px', fontSize:13, color:'var(--text-muted)', cursor:'pointer', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:'var(--bg-alt)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>—</div>
              None
            </div>
            {filtered.map(e => (
              <div key={e.id} onClick={()=>{onChange(e.id);setOpen(false);setSearch('')}}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer', background:value===e.id?'var(--amber-bg)':'transparent', transition:'background 0.15s' }}>
                <div style={{ width:32, height:32, borderRadius:9, background:'var(--amber-bg)', border:`1px solid ${value===e.id?'var(--gold)':'var(--gold-border)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{e.avatar||'👤'}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{e.name}</div>
                  <div style={{ fontSize:10.5, color:'var(--text-muted)', fontFamily:'inherit' }}>{e.id}</div>
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
function CycleSelector({ selected, onChange, rescueHours, onRescueHours }) {
  const hasRescue = selected.includes('Rescue')
  const regHrs    = selected.filter(c=>c!=='Rescue').reduce((s,c)=>s+(CYCLE_H[c]||0),0)
  const resHrs    = hasRescue ? (parseFloat(rescueHours)||0) : 0
  const total     = regHrs + resHrs
  const overMax   = !hasRescue && total > MAX_HRS

  function toggle(c) {
    onChange(selected.includes(c) ? selected.filter(x=>x!==c) : [...selected, c])
  }

  return (
    <div>
      <label className="input-label">Duty Cycles <span style={{ color:'var(--text-muted)', textTransform:'none', letterSpacing:0, fontSize:10, fontWeight:400 }}>— select multiple</span></label>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:10 }}>
        {CYCLES.map(c => {
          const on = selected.includes(c)
          return (
            <button key={c} type="button" onClick={()=>toggle(c)}
              style={{
                padding:'11px 6px', borderRadius:12,
                border:`2px solid ${on?'var(--gold)':'var(--border-med)'}`,
                background: on ? 'var(--amber-bg)' : 'var(--bg-alt)',
                color: on ? 'var(--gold)' : 'var(--text-sub)',
                fontSize:12, fontWeight:700, cursor:'pointer', textAlign:'center',
                transition:'all 0.18s ease',
                transform: on ? 'scale(1.05)' : 'scale(1)',
                boxShadow: on ? '0 4px 12px rgba(184,134,11,0.2)' : 'none',
              }}>
              {c}
              <div style={{ fontSize:9.5, fontWeight:500, color:on?'var(--gold)':'var(--text-muted)', marginTop:2 }}>
                {c==='Rescue'?'custom':`${CYCLE_H[c]}h`}
              </div>
            </button>
          )
        })}
      </div>
      {hasRescue && (
        <div style={{ marginBottom:10 }}>
          <label className="input-label">Rescue Hours</label>
          <input className="input" type="number" step="0.25" min="0.25" value={rescueHours} onChange={e=>onRescueHours(e.target.value)} placeholder="e.g. 3.5"/>
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
function AttModal({ employees, station, date, editRecord, onSave, onClose }) {
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
  const selEmp = employees.find(e=>e.id===empId)
  const rate   = parseFloat(selEmp?.hourly_rate||3.85)
  const regHrs = cycles.filter(c=>c!=='Rescue').reduce((s,c)=>s+(CYCLE_H[c]||0),0)
  const resHrs = cycles.includes('Rescue') ? (parseFloat(rescue)||0) : 0
  const total  = regHrs + resHrs
  const est    = isDXE6 ? (wType==='helper'?90:115) : total>0 ? (total*rate).toFixed(2) : null

  async function handleSave() {
    if (!empId) return setErr('Select a driver')
    if (!isDXE6 && status==='present' && cycles.length===0) return setErr('Select at least one cycle')
    setErr(null); setSaving(true)
    try {
      const regCycles = cycles.filter(c=>c!=='Rescue')
      const hasRescue = cycles.includes('Rescue')
      const totalHours = regCycles.reduce((s,c)=>s+(CYCLE_H[c]||0),0) + (hasRescue ? (parseFloat(rescue)||0) : 0)
      const body = isDXE6
        ? { emp_id:empId, date: date||editRecord?.date, status, note, pay_type:'daily', worker_type:wType }
        : { emp_id:empId, date: date||editRecord?.date, status, note,
            cycle: regCycles.join(',') || null,
            cycle_hours: status==='present' && totalHours>0 ? totalHours : null,
            is_rescue: hasRescue,
            rescue_hours: hasRescue ? (rescue||null) : null }
      const url    = isEdit ? `${API}/api/attendance/${editRecord.id}` : `${API}/api/attendance`
      const method = isEdit ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers:hdr(), body:JSON.stringify(body) })
      const data   = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSave()
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
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
            <div>
              <label className="input-label">Driver *</label>
              <DriverSearch employees={employees} value={empId} onChange={setEmpId}/>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--amber-bg)', borderRadius:12, border:'1px solid var(--gold-border)' }}>
              <span style={{ fontSize:16 }}>{editRecord.avatar||'👤'}</span>
              <span style={{ fontWeight:700, fontSize:14, color:'var(--gold)' }}>{editRecord.name}</span>
            </div>
          )}

          <div>
            <label className="input-label">Status</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {[{v:'present',e:'✅',l:'Present'},{v:'absent',e:'❌',l:'Absent'},{v:'leave',e:'🏖',l:'Leave'}].map(s=>(
                <button key={s.v} type="button" onClick={()=>setStatus(s.v)}
                  style={{ padding:'11px 8px', borderRadius:11, border:`2px solid ${status===s.v?'var(--gold)':'var(--border-med)'}`, background:status===s.v?'var(--amber-bg)':'var(--bg-alt)', color:status===s.v?'var(--gold)':'var(--text-sub)', fontWeight:600, fontSize:12, cursor:'pointer', transition:'all 0.18s', textAlign:'center' }}>
                  <div style={{ fontSize:18, marginBottom:3 }}>{s.e}</div>
                  {s.l}
                </button>
              ))}
            </div>
          </div>

          {status==='present' && isDXE6 && (
            <div>
              <label className="input-label">Worker Type</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[{v:'driver',l:'🚗 Driver',r:'AED 115'},{v:'helper',l:'🔧 Helper',r:'AED 90'}].map(t=>(
                  <button key={t.v} type="button" onClick={()=>setWType(t.v)}
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

          <div>
            <label className="input-label">Note (optional)</label>
            <input className="input" value={note} onChange={e=>setNote(e.target.value)} placeholder="Any notes…"/>
          </div>
        </div>

        <div style={{ display:'flex', gap:10, marginTop:22 }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex:1, justifyContent:'center' }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving||!empId} style={{ flex:2, justifyContent:'center' }}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Log Attendance'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Announcement Modal ────────────────────────────────────────
function AnnModal({ ann, onSave, onClose }) {
  const [title, setTitle] = useState(ann?.title||'')
  const [body,  setBody]  = useState(ann?.body||'')
  const [saving,setSaving]= useState(false)
  async function handleSave() {
    if (!title||!body) return
    setSaving(true)
    try {
      const url=ann?`${API}/api/poc/announcements/${ann.id}`:`${API}/api/poc/announcements`
      const res=await fetch(url,{method:ann?'PUT':'POST',headers:hdr(),body:JSON.stringify({title,body})})
      if (!res.ok) throw new Error((await res.json()).error)
      onSave()
    } catch(e){alert(e.message)} finally{setSaving(false)}
  }
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:440}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <h3 style={{fontWeight:800,fontSize:16,color:'var(--text)'}}>{ann?'Edit':'New'} Announcement</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17}/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div><label className="input-label">Title *</label><input className="input" value={title} onChange={e=>setTitle(e.target.value)} autoComplete="off"/></div>
          <div><label className="input-label">Message *</label><textarea className="input" rows={4} value={body} onChange={e=>setBody(e.target.value)} style={{resize:'vertical'}}/></div>
        </div>
        <div style={{display:'flex',gap:10,marginTop:18}}>
          <button className="btn btn-secondary" onClick={onClose} style={{flex:1,justifyContent:'center'}}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving||!title||!body} style={{flex:2,justifyContent:'center'}}>{saving?'Saving…':ann?'Update':'Post'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Vehicle Modal ─────────────────────────────────────────────
function VehicleModal({ vehicle, station, onSave, onClose }) {
  const [form, setForm] = useState({plate:'',make:'',model:'',year:'',status:'active',grounded_reason:'',grounded_since:'',grounded_until:'',notes:'',...vehicle})
  const [saving,setSaving]=useState(false)
  const set=(k,v)=>setForm(p=>({...p,[k]:v}))
  async function handleSave() {
    if (!form.plate) return alert('Plate number required')
    setSaving(true)
    try {
      const url=vehicle?`${API}/api/vehicles/${vehicle.id}`:`${API}/api/vehicles`
      const res=await fetch(url,{method:vehicle?'PUT':'POST',headers:hdr(),body:JSON.stringify({...form,station_code:station})})
      if (!res.ok) throw new Error((await res.json()).error)
      onSave()
    } catch(e){alert(e.message)} finally{setSaving(false)}
  }
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:460}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <h3 style={{fontWeight:800,fontSize:16,color:'var(--text)'}}>{vehicle?'Edit':'Add'} Vehicle</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17}/></button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div><label className="input-label">Plate No. *</label><input className="input" value={form.plate} onChange={e=>set('plate',e.target.value.toUpperCase())} placeholder="DXB A 12345" autoComplete="off"/></div>
          <div><label className="input-label">Status</label>
            <select className="input" value={form.status} onChange={e=>set('status',e.target.value)}>
              <option value="active">Active</option><option value="grounded">Grounded</option>
              <option value="maintenance">Maintenance</option><option value="sold">Sold</option>
            </select></div>
          <div><label className="input-label">Make</label><input className="input" value={form.make} onChange={e=>set('make',e.target.value)} placeholder="Toyota"/></div>
          <div><label className="input-label">Model</label><input className="input" value={form.model} onChange={e=>set('model',e.target.value)} placeholder="Hiace"/></div>
          <div><label className="input-label">Year</label><input className="input" type="number" value={form.year} onChange={e=>set('year',e.target.value)}/></div>
        </div>
        {(form.status==='grounded'||form.status==='maintenance') && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:12}}>
            <div style={{gridColumn:'span 2'}}><label className="input-label">Reason</label><input className="input" value={form.grounded_reason} onChange={e=>set('grounded_reason',e.target.value)} placeholder="Why grounded?"/></div>
            <div><label className="input-label">Since</label><input className="input" type="date" value={form.grounded_since?.slice(0,10)||''} onChange={e=>set('grounded_since',e.target.value)}/></div>
            <div><label className="input-label">Until</label><input className="input" type="date" value={form.grounded_until?.slice(0,10)||''} onChange={e=>set('grounded_until',e.target.value)}/></div>
          </div>
        )}
        <div style={{marginTop:12}}><label className="input-label">Notes</label><input className="input" value={form.notes} onChange={e=>set('notes',e.target.value)}/></div>
        <div style={{display:'flex',gap:10,marginTop:20}}>
          <button className="btn btn-secondary" onClick={onClose} style={{flex:1,justifyContent:'center'}}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{flex:2,justifyContent:'center'}}>{saving?'Saving…':vehicle?'Save Changes':'Add Vehicle'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Delivery Modal ────────────────────────────────────────────
function DeliveryModal({ date, station, existing, onSave, onClose }) {
  const [form,setForm]=useState({total:existing?.total||'',attempted:existing?.attempted||'',successful:existing?.successful||'',returned:existing?.returned||'',notes:existing?.notes||''})
  const [saving,setSaving]=useState(false)
  const set=(k,v)=>setForm(p=>({...p,[k]:v}))
  async function handleSave() {
    if (!form.total) return alert('Total required')
    setSaving(true)
    try {
      // If editing an existing record by ID use PUT, otherwise POST (upsert by station+date)
      const isIdEdit = existing?.id && existing?.date !== date
      const url    = isIdEdit ? `${API}/api/deliveries/${existing.id}` : `${API}/api/deliveries`
      const method = isIdEdit ? 'PUT' : 'POST'
      const body   = isIdEdit
        ? {...form,total:parseInt(form.total),attempted:parseInt(form.attempted)||0,successful:parseInt(form.successful)||0,returned:parseInt(form.returned)||0}
        : {...form,station_code:station,date,total:parseInt(form.total),attempted:parseInt(form.attempted)||0,successful:parseInt(form.successful)||0,returned:parseInt(form.returned)||0}
      const res=await fetch(url,{method,headers:hdr(),body:JSON.stringify(body)})
      if (!res.ok) throw new Error((await res.json()).error)
      onSave()
    } catch(e){alert(e.message)} finally{setSaving(false)}
  }
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:400}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <div>
            <h3 style={{fontWeight:800,fontSize:16,color:'var(--text)'}}>{existing?'Edit':'Log'} Deliveries</h3>
            <div style={{fontSize:11,color:'#B8860B',fontWeight:600,marginTop:1}}>📅 {date}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17}/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div><label className="input-label">Total Deliveries *</label><input className="input" type="number" value={form.total} onChange={e=>set('total',e.target.value)} placeholder="e.g. 120"/></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div><label className="input-label">Attempted</label><input className="input" type="number" value={form.attempted} onChange={e=>set('attempted',e.target.value)}/></div>
            <div><label className="input-label">Successful</label><input className="input" type="number" value={form.successful} onChange={e=>set('successful',e.target.value)}/></div>
          </div>
          <div><label className="input-label">Returned</label><input className="input" type="number" value={form.returned} onChange={e=>set('returned',e.target.value)}/></div>
          <div><label className="input-label">Notes</label><input className="input" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Any issues?"/></div>
        </div>
        <div style={{display:'flex',gap:10,marginTop:18}}>
          <button className="btn btn-secondary" onClick={onClose} style={{flex:1,justifyContent:'center'}}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{flex:2,justifyContent:'center'}}>{saving?'Saving…':'Submit'}</button>
        </div>
      </div>
    </div>
  )
}


// ── SIM Modal ─────────────────────────────────────────────────
function SimModal({ sim, emps, station, onSave, onClose }) {
  const isEdit = !!sim
  const [form, setForm] = useState({
    sim_number: sim?.sim_number||'',
    phone_number: sim?.phone_number||'',
    carrier: sim?.carrier||'Du',
    status: sim?.status||'available',
    emp_id: sim?.emp_id||'',
    notes: sim?.notes||'',
    monthly_cost: sim?.monthly_cost||'',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  function handleEmpChange(v) {
    set('emp_id', v)
    set('status', v ? 'assigned' : 'available')
  }

  async function handleSave() {
    if (!form.sim_number) return setErr('SIM number required')
    setSaving(true); setErr(null)
    try {
      const body = { ...form, station_code: station, monthly_cost: parseFloat(form.monthly_cost)||0 }
      const url    = isEdit ? `${API}/api/sims/${sim.id}` : `${API}/api/sims`
      const method = isEdit ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers:hdr(), body:JSON.stringify(body) })
      const data   = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSave()
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  const STATUSES = [
    {v:'available',l:'Available',c:'#2E7D52'},{v:'assigned',l:'Assigned',c:'#B8860B'},
    {v:'inactive', l:'Inactive', c:'#A89880'},{v:'damaged', l:'Damaged', c:'#C0392B'},
  ]

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:440}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <div>
            <h3 style={{fontWeight:900,fontSize:16,color:'var(--text)'}}>{isEdit?'Edit':'Add'} SIM Card</h3>
            <p style={{fontSize:11.5,color:'#A89880',marginTop:2}}>{station} Station</p>
          </div>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:9,background:'#F5F4F1',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={14}/></button>
        </div>
        {err && <div style={{background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:9,padding:'9px 12px',fontSize:12.5,color:'#C0392B',marginBottom:12}}>{err}</div>}
        <div style={{display:'flex',flexDirection:'column',gap:13}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><label className="input-label">SIM Number *</label>
              <input className="input" value={form.sim_number} onChange={e=>set('sim_number',e.target.value)} placeholder="SIM ID" autoComplete="off"/></div>
            <div><label className="input-label">Phone Number</label>
              <input className="input" value={form.phone_number} onChange={e=>set('phone_number',e.target.value)} placeholder="+971 5X XXX XXXX"/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><label className="input-label">Carrier</label>
              <select className="input" value={form.carrier} onChange={e=>set('carrier',e.target.value)}>
                {['Du','Etisalat (e&)','Virgin Mobile','Other'].map(ca=><option key={ca}>{ca}</option>)}
              </select></div>
            <div><label className="input-label">Monthly Cost (AED)</label>
              <input className="input" type="number" value={form.monthly_cost} onChange={e=>set('monthly_cost',e.target.value)} placeholder="0"/></div>
          </div>
          <div><label className="input-label">Status</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7}}>
              {STATUSES.map(s=>(
                <button key={s.v} onClick={()=>set('status',s.v)} type="button"
                  style={{padding:'9px 4px',borderRadius:10,border:`2px solid ${form.status===s.v?s.c:'#EAE6DE'}`,background:form.status===s.v?`${s.c}12`:'#FAFAF8',cursor:'pointer',textAlign:'center',transition:'all 0.18s',fontFamily:'Poppins,sans-serif'}}>
                  <div style={{fontSize:10.5,fontWeight:700,color:form.status===s.v?s.c:'#A89880'}}>{s.l}</div>
                </button>
              ))}
            </div></div>
          <div><label className="input-label">Assign to DA (optional)</label>
            <DriverSearch employees={emps} value={form.emp_id} onChange={handleEmpChange} placeholder="— Unassigned —"/></div>
          <div><label className="input-label">Notes</label>
            <input className="input" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Any notes…"/></div>
        </div>
        <div style={{display:'flex',gap:10,marginTop:18}}>
          <button onClick={onClose} className="btn btn-secondary" style={{flex:1,justifyContent:'center'}}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{flex:2,justifyContent:'center'}}>{saving?'Saving…':isEdit?'Save':'Add SIM'}</button>
        </div>
      </div>
    </div>
  )
}

// ── DAs Tab ───────────────────────────────────────────────────
function DAAvatar({ emp }) {
  const [broken, setBroken] = useState(false)
  const initials = emp.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  if (emp.avatar && !broken) {
    return <img src={emp.avatar} alt="" onError={()=>setBroken(true)}
      style={{width:48,height:48,borderRadius:14,objectFit:'cover',flexShrink:0,border:'2px solid var(--border-med)'}}/>
  }
  const COLORS = ['#B8860B','#1D6FA4','#2E7D52','#7C3AED','#C0392B','#0F766E']
  const color  = COLORS[emp.name.charCodeAt(0) % COLORS.length]
  return (
    <div style={{width:48,height:48,borderRadius:14,background:`${color}18`,border:`2px solid ${color}33`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontWeight:800,fontSize:16,color}}>
      {initials}
    </div>
  )
}

function DAsTab({ stationEmps, sims }) {
  const [q, setQ] = useState('')
  const filtered = stationEmps.filter(e =>
    !q || e.name.toLowerCase().includes(q.toLowerCase()) || e.id.toLowerCase().includes(q.toLowerCase())
  )
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {/* Search + count */}
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{position:'relative',flex:1}}>
          <Search size={13} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',pointerEvents:'none'}}/>
          <input className="input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name or ID…" style={{paddingLeft:34,borderRadius:20}}/>
        </div>
        <span style={{fontSize:12,fontWeight:700,color:'var(--text-muted)',whiteSpace:'nowrap',flexShrink:0}}>{filtered.length} DA{filtered.length!==1?'s':''}</span>
      </div>

      {filtered.length===0 && (
        <div style={{textAlign:'center',padding:50,color:'var(--text-muted)',fontSize:13}}>No drivers found</div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:10}}>
        {filtered.map((emp,i)=>{
          const workSim = sims.find(s=>s.emp_id===emp.id)
          return (
            <div key={emp.id} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:16,padding:'14px',animation:`slideUp 0.25s ${Math.min(i,10)*0.03}s ease both`,display:'flex',gap:12,alignItems:'flex-start',transition:'box-shadow 0.2s'}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'}
              onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
              <DAAvatar emp={emp}/>
              <div style={{flex:1,minWidth:0}}>
                {/* Name + station */}
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5,flexWrap:'wrap'}}>
                  <span style={{fontWeight:700,fontSize:13.5,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:160}}>{emp.name}</span>
                  {emp.station_code&&<span style={{fontSize:9.5,fontWeight:700,color:'#B8860B',background:'#FDF6E3',border:'1px solid #F0D78C',borderRadius:6,padding:'1px 7px',flexShrink:0}}>{emp.station_code}</span>}
                </div>
                {/* ID + nationality */}
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:5}}>
                  <span style={{fontSize:11,color:'var(--text-muted)',background:'var(--bg-alt)',padding:'2px 8px',borderRadius:6,border:'1px solid var(--border)'}}>{emp.id}</span>
                  {emp.nationality&&<span style={{fontSize:11,color:'var(--text-muted)',background:'var(--bg-alt)',padding:'2px 8px',borderRadius:6,border:'1px solid var(--border)'}}>{emp.nationality}</span>}
                </div>
                {/* Phone + SIM */}
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {emp.phone&&(
                    <span style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'var(--text-muted)'}}>
                      <span style={{fontSize:9,color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase'}}>Personal</span>
                      <span style={{fontWeight:600,color:'var(--text)',fontSize:11}}>{emp.phone}</span>
                    </span>
                  )}
                  {workSim?.phone_number&&(
                    <span style={{display:'flex',alignItems:'center',gap:4,fontSize:11}}>
                      <span style={{fontSize:9,color:'#7C3AED',fontWeight:600,textTransform:'uppercase'}}>SIM</span>
                      <span style={{fontWeight:600,color:'#7C3AED',fontSize:11}}>{workSim.phone_number}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── SIM Bulk Upload Modal ─────────────────────────────────────
function SimBulkModal({ station, emps, onClose, onSave }) {
  const [rows,    setRows]    = useState([])
  const [stage,   setStage]   = useState('upload') // upload | preview | result
  const [result,  setResult]  = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState(null)
  const fileRef = useRef(null)

  const TEMPLATE_HEADERS = 'sim_number,phone_number,carrier,status,station_code,monthly_cost,notes,emp_id'
  const TEMPLATE_EXAMPLE = '8964050XXXXXXXX,+971501234567,Du,available,DDB1,50,Work SIM,E001'

  function downloadTemplate() {
    const csv  = `${TEMPLATE_HEADERS}\n${TEMPLATE_EXAMPLE}\n`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'sim_upload_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    return lines.slice(1).map((line, i) => {
      const vals = line.split(',').map(v => v.trim())
      const obj  = {}
      headers.forEach((h, j) => { obj[h] = vals[j] || '' })
      obj._row = i + 2
      obj._ok  = !!obj.sim_number
      return obj
    })
  }

  function handleFile(e) {
    setErr(null)
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) { setErr('Please upload a .csv file'); return }
    const reader = new FileReader()
    reader.onload = ev => {
      const parsed = parseCSV(ev.target.result)
      if (!parsed.length) { setErr('No data rows found. Check your CSV format.'); return }
      setRows(parsed)
      setStage('preview')
    }
    reader.readAsText(file)
  }

  async function handleUpload() {
    const valid = rows.filter(r => r._ok)
    if (!valid.length) { setErr('No valid rows to upload'); return }
    setSaving(true); setErr(null)
    try {
      const payload = valid.map(r => ({
        sim_number:   r.sim_number,
        phone_number: r.phone_number || null,
        carrier:      r.carrier || 'Du',
        status:       r.status || 'available',
        station_code: r.station_code || station || null,
        monthly_cost: parseFloat(r.monthly_cost) || 0,
        notes:        r.notes || null,
      }))
      const res  = await fetch(`${API}/api/sims/bulk`, {
        method: 'POST', headers: hdr(), body: JSON.stringify({ sims: payload })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      setStage('result')
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  const invalidRows = rows.filter(r => !r._ok)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div>
            <h3 style={{ fontWeight:900, fontSize:16, color:'var(--text)' }}>Bulk Upload SIM Cards</h3>
            <p style={{ fontSize:11.5, color:'#A89880', marginTop:2 }}>{station} Station</p>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:9, background:'#F5F4F1', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14}/></button>
        </div>

        {err && <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:9, padding:'9px 12px', fontSize:12.5, color:'#C0392B', marginBottom:12 }}>{err}</div>}

        {/* Stage: upload */}
        {stage === 'upload' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'#FAFAF8', border:'1.5px dashed #D4C9B8', borderRadius:12, padding:'28px 24px', textAlign:'center' }}>
              <Upload size={32} style={{ margin:'0 auto 10px', display:'block', color:'#C4B49A' }}/>
              <div style={{ fontWeight:700, fontSize:14, color:'var(--text)', marginBottom:4 }}>Upload CSV file</div>
              <div style={{ fontSize:12, color:'#A89880', marginBottom:16 }}>
                Columns: sim_number, phone_number, carrier, status, station_code, monthly_cost, notes, <strong>emp_id</strong>
              </div>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display:'none' }}/>
              <button className="btn btn-primary" onClick={() => fileRef.current?.click()} style={{ justifyContent:'center', marginBottom:10 }}>
                <FileText size={14}/> Choose CSV File
              </button>
              <div style={{ fontSize:11.5, color:'#A89880' }}>Max 500 rows per upload</div>
            </div>
            <button onClick={downloadTemplate} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px', borderRadius:10, background:'#F5F4F1', border:'1px solid #EAE6DE', cursor:'pointer', fontSize:12.5, fontWeight:600, color:'#6B5D4A', fontFamily:'Poppins,sans-serif' }}>
              <Download size={13}/> Download Template CSV
            </button>
          </div>
        )}

        {/* Stage: preview */}
        {stage === 'preview' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'flex', gap:8 }}>
              {[
                { l:'Total rows',  v:rows.length,       c:'#1A1612', bg:'#FAFAF8', bc:'#EAE6DE' },
                { l:'Valid',       v:rows.filter(r=>r._ok).length, c:'#2E7D52', bg:'#ECFDF5', bc:'#A7F3D0' },
                { l:'Invalid',     v:invalidRows.length, c: invalidRows.length ? '#C0392B':'#A89880', bg: invalidRows.length ? '#FEF2F2':'#F5F4F1', bc: invalidRows.length ? '#FCA5A5':'#EAE6DE' },
              ].map(s => (
                <div key={s.l} style={{ flex:1, textAlign:'center', padding:'10px 6px', borderRadius:10, background:s.bg, border:`1px solid ${s.bc}` }}>
                  <div style={{ fontWeight:900, fontSize:20, color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:10.5, color:s.c, fontWeight:600, marginTop:2 }}>{s.l}</div>
                </div>
              ))}
            </div>
            {invalidRows.length > 0 && (
              <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:9, padding:'9px 12px', fontSize:12, color:'#C0392B' }}>
                <strong>Invalid rows (missing SIM number):</strong> rows {invalidRows.map(r=>r._row).join(', ')}. These will be skipped.
              </div>
            )}
            <div style={{ maxHeight:240, overflowY:'auto', borderRadius:10, border:'1px solid #EAE6DE' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11.5 }}>
                <thead>
                  <tr style={{ background:'#F5F4F1', position:'sticky', top:0 }}>
                    {['#','SIM Number','Phone','Carrier','Status','Station','Assign To'].map(h => (
                      <th key={h} style={{ padding:'7px 10px', textAlign:'left', fontWeight:700, color:'#6B5D4A', borderBottom:'1px solid #EAE6DE', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const empId = (r.emp_id||'').trim()
                    const matchedEmp = empId ? (emps||[]).find(e => e.id?.toLowerCase()===empId.toLowerCase() || e.name?.toLowerCase()===empId.toLowerCase()) : null
                    const empDisplay = empId ? (matchedEmp ? matchedEmp.name : <span style={{color:'#C0392B'}}>Not found: {empId}</span>) : '—'
                    return (
                      <tr key={i} style={{ background: r._ok ? 'transparent' : '#FEF2F2', borderBottom:'1px solid #F5F4F1' }}>
                        <td style={{ padding:'6px 10px', color:'#A89880' }}>{r._row}</td>
                        <td style={{ padding:'6px 10px', fontWeight:700, color: r._ok ? 'var(--text)' : '#C0392B' }}>{r.sim_number || '—'}</td>
                        <td style={{ padding:'6px 10px', color:'#6B5D4A' }}>{r.phone_number || '—'}</td>
                        <td style={{ padding:'6px 10px', color:'#6B5D4A' }}>{r.carrier || 'Du'}</td>
                        <td style={{ padding:'6px 10px', color:'#6B5D4A' }}>{r.status || 'available'}</td>
                        <td style={{ padding:'6px 10px', color:'#6B5D4A' }}>{r.station_code || station || '—'}</td>
                        <td style={{ padding:'6px 10px', color: matchedEmp ? '#2E7D52' : empId ? '#C0392B' : '#A89880', fontWeight: matchedEmp ? 700 : 400 }}>{empDisplay}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:4 }}>
              <button onClick={() => { setStage('upload'); setRows([]); if(fileRef.current) fileRef.current.value='' }} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>Back</button>
              <button onClick={handleUpload} disabled={saving || !rows.filter(r=>r._ok).length} className="btn btn-primary" style={{ flex:2, justifyContent:'center' }}>
                {saving ? 'Uploading…' : `Upload ${rows.filter(r=>r._ok).length} SIMs`}
              </button>
            </div>
          </div>
        )}

        {/* Stage: result */}
        {stage === 'result' && result && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <CheckCircle size={40} style={{ margin:'0 auto 12px', display:'block', color:'#2E7D52' }}/>
              <div style={{ fontWeight:800, fontSize:17, color:'var(--text)', marginBottom:6 }}>Upload Complete</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {[
                { l:'Inserted', v:result.inserted, c:'#2E7D52', bg:'#ECFDF5', bc:'#A7F3D0' },
                { l:'Skipped (dup)', v:result.skipped, c:'#B8860B', bg:'#FDF6E3', bc:'#F0D78C' },
                { l:'Errors', v:result.errors?.length||0, c: result.errors?.length ? '#C0392B':'#A89880', bg: result.errors?.length ? '#FEF2F2':'#F5F4F1', bc: result.errors?.length ? '#FCA5A5':'#EAE6DE' },
              ].map(s => (
                <div key={s.l} style={{ flex:1, textAlign:'center', padding:'10px 6px', borderRadius:10, background:s.bg, border:`1px solid ${s.bc}` }}>
                  <div style={{ fontWeight:900, fontSize:20, color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:10.5, color:s.c, fontWeight:600, marginTop:2 }}>{s.l}</div>
                </div>
              ))}
            </div>
            {result.errors?.length > 0 && (
              <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:9, padding:'9px 12px', fontSize:11.5, color:'#C0392B', maxHeight:100, overflowY:'auto' }}>
                {result.errors.map((e,i) => <div key={i}>Row {e.row}: {e.sim_number} — {e.error}</div>)}
              </div>
            )}
            <button onClick={() => { onSave(); onClose() }} className="btn btn-primary" style={{ justifyContent:'center' }}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── SIM Section ───────────────────────────────────────────────
function SimSection({ sims, emps, station, onRefresh }) {
  const [modal,       setModal]       = useState(null)
  const [search,      setSearch]      = useState('')
  const [confirmDlg,  setConfirmDlg]  = useState(null)

  const SC = {
    available:{c:'#2E7D52',bg:'#ECFDF5',bc:'#A7F3D0',l:'Available'},
    assigned: {c:'#B8860B',bg:'#FDF6E3',bc:'#F0D78C',l:'Assigned'},
    inactive: {c:'#A89880',bg:'#F5F4F1',bc:'#EAE6DE',l:'Inactive'},
    damaged:  {c:'#C0392B',bg:'#FEF2F2',bc:'#FCA5A5',l:'Damaged'},
  }

  const filtered = sims.filter(s =>
    !search || s.sim_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.emp_name?.toLowerCase().includes(search.toLowerCase())
  )

  function handleDelete(id, simNumber) {
    setConfirmDlg({
      title: 'Delete SIM card?',
      message: `SIM ${simNumber} will be permanently removed. Any assigned DA will lose their work number.`,
      confirmLabel: 'Delete', danger: true,
      onConfirm: async () => {
        setConfirmDlg(null)
        await fetch(`${API}/api/sims/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } })
        onRefresh()
      },
    })
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
        {[
          {l:'Total', v:sims.length,                               c:'#1A1612',bg:'#FAFAF8',bc:'#EAE6DE'},
          {l:'In Use', v:sims.filter(s=>s.status==='assigned').length, c:'#B8860B',bg:'#FDF6E3',bc:'#F0D78C'},
          {l:'Free',   v:sims.filter(s=>s.status==='available').length,c:'#2E7D52',bg:'#ECFDF5',bc:'#A7F3D0'},
        ].map(s=>(
          <div key={s.l} style={{textAlign:'center',padding:'12px 8px',borderRadius:12,background:s.bg,border:`1px solid ${s.bc}`}}>
            <div style={{fontWeight:900,fontSize:22,color:s.c,letterSpacing:'-0.03em'}}>{s.v}</div>
            <div style={{fontSize:10.5,color:s.c,fontWeight:600,marginTop:3}}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:8}}>
        <div style={{flex:1,position:'relative'}}>
          <Search size={13} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#C4B49A',pointerEvents:'none'}}/>
          <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search SIM, phone, DA…" style={{paddingLeft:34,borderRadius:20}}/>
        </div>
        <button className="btn btn-secondary" onClick={()=>setModal({type:'bulk'})} style={{borderRadius:20,padding:'9px 14px',gap:5}}>
          <Upload size={14}/> Bulk
        </button>
        <button className="btn btn-primary" onClick={()=>setModal({type:'add'})} style={{borderRadius:20,padding:'9px 16px'}}>
          <Plus size={14}/> Add SIM
        </button>
      </div>

      {filtered.length===0 ? (
        <div style={{textAlign:'center',padding:'40px',color:'#A89880'}}>
          <Smartphone size={36} style={{margin:'0 auto 10px',display:'block',opacity:0.2}}/>
          <div style={{fontWeight:600,color:'#6B5D4A'}}>{search?`No results for "${search}"`:'No SIM cards yet — add one above'}</div>
        </div>
      ) : filtered.map((sim,i)=>{
        const sc = SC[sim.status]||SC.available
        return (
          <div key={sim.id} style={{background:'#FFF',border:`1.5px solid ${sc.bc}`,borderRadius:14,padding:'13px 15px',animation:`slideUp 0.3s ${i*0.04}s ease both`}}>
            <div style={{display:'flex',alignItems:'center',gap:11}}>
              <div style={{width:42,height:42,borderRadius:12,background:sc.bg,border:`1px solid ${sc.bc}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Smartphone size={18} color={sc.c}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,color:'var(--text)',fontFamily:'inherit'}}>{sim.phone_number||sim.sim_number}</div>
                <div style={{fontSize:11,color:'#A89880',marginTop:2,display:'flex',gap:5,flexWrap:'wrap'}}>
                  <span>{sim.carrier}</span>
                  {sim.phone_number&&<><span>·</span><span style={{fontFamily:'inherit',fontSize:10}}>{sim.sim_number}</span></>}
                  {sim.monthly_cost>0&&<><span>·</span><span style={{color:'#7C3AED',fontWeight:600}}>AED {sim.monthly_cost}/mo</span></>}
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6,flexShrink:0}}>
                <span style={{fontSize:11,fontWeight:700,color:sc.c,background:sc.bg,border:`1px solid ${sc.bc}`,borderRadius:20,padding:'2px 10px'}}>{sc.l}</span>
                <div style={{display:'flex',gap:5}}>
                  <button onClick={()=>setModal({type:'edit',sim})} style={{padding:'4px 10px',borderRadius:7,background:'#F5F4F1',border:'none',cursor:'pointer',fontSize:11,color:'#6B5D4A',fontWeight:600,fontFamily:'Poppins,sans-serif',display:'flex',alignItems:'center',gap:4}}><Pencil size={11}/> Edit</button>
                  <button onClick={()=>handleDelete(sim.id, sim.sim_number||sim.phone_number||'—')} style={{padding:'4px 8px',borderRadius:7,background:'#FEF2F2',border:'none',cursor:'pointer',color:'#C0392B',display:'flex',alignItems:'center',fontFamily:'Poppins,sans-serif'}}><Trash2 size={11}/></button>
                </div>
              </div>
            </div>
            {sim.emp_id && (
              <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid #F5F4F1',display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#FDF6E3,#FEF3D0)',border:'1px solid #F0D78C',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:'#B8860B',flexShrink:0}}>
                  {sim.emp_name?.slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'var(--text)'}}>{sim.emp_name}</div>
                  <div style={{fontSize:10.5,color:'#A89880'}}>Assigned {sim.assigned_at?.slice(0,10)||'—'}</div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {modal?.type==='add'  && <SimModal emps={emps} station={station} onClose={()=>setModal(null)} onSave={()=>{setModal(null);onRefresh()}}/>}
      {modal?.type==='edit' && <SimModal sim={modal.sim} emps={emps} station={station} onClose={()=>setModal(null)} onSave={()=>{setModal(null);onRefresh()}}/>}
      {modal?.type==='bulk' && <SimBulkModal station={station} emps={emps} onClose={()=>setModal(null)} onSave={()=>{setModal(null);onRefresh()}}/>}
      <ConfirmDialog
        open={!!confirmDlg}
        title={confirmDlg?.title}
        message={confirmDlg?.message}
        confirmLabel={confirmDlg?.confirmLabel}
        danger={confirmDlg?.danger ?? true}
        onConfirm={confirmDlg?.onConfirm}
        onCancel={() => setConfirmDlg(null)}
      />
    </div>
  )
}


// ── Work Number Modal (POC) ───────────────────────────────────
function WorkNumModal({ emp, station, sims, onSave, onClose }) {
  const available = (sims||[]).filter(s => s.phone_number && (s.status==='available' || s.emp_id===emp.id))
  const [saving,   setSaving]  = useState(false)
  const [conflict, setConflict]= useState(null)  // { conflictEmpId, conflictEmpName }
  const [step,     setStep]    = useState(0)      // 0 | 1 | 2
  const [pending,  setPending] = useState('')
  const hdr = { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gcd_token')}` }

  async function tryAssign(phoneNumber, force=false) {
    setSaving(true)
    try {
      const r = await fetch(`${API}/api/employees/${emp.id}/assign-work-number`, {
        method:'POST', headers:hdr,
        body: JSON.stringify({ phone_number: phoneNumber, force })
      })
      const d = await r.json()
      if (d.conflict) {
        setPending(phoneNumber)
        setConflict({ conflictEmpId: d.conflictEmpId, conflictEmpName: d.conflictEmpName })
        setStep(1)
      } else if (d.ok) { onSave() }
      else if (d.error) { alert(d.error) }
    } catch(e) { alert('Failed to assign') } finally { setSaving(false) }
  }

  async function handleRemove() {
    setSaving(true)
    try {
      await fetch(`${API}/api/employees/${emp.id}/work-number`, { method:'DELETE', headers:hdr })
      onSave()
    } catch(e) { alert('Failed to remove') } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:360 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <h3 style={{ fontWeight:800, fontSize:16, color:'var(--text)' }}>Assign Work Number</h3>
            <p style={{ fontSize:12, color:'#A89880', marginTop:2 }}>{emp.name}{emp.work_number && <span style={{ marginLeft:8, fontFamily:'inherit', color:'#B8860B' }}>({emp.work_number})</span>}</p>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:8, background:'#F5F4F1', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={13}/></button>
        </div>

        {/* Conflict step 1 */}
        {step===1 && conflict && (
          <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
            <p style={{ fontSize:13, fontWeight:600, color:'#92400E', marginBottom:10 }}>
              ⚠️ <strong>{pending}</strong> is already assigned to <strong>{conflict.conflictEmpName}</strong>. Proceed?
            </p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setStep(2)} style={{ flex:1, padding:'8px', borderRadius:8, background:'#B8860B', color:'white', border:'none', cursor:'pointer', fontWeight:700, fontSize:12 }}>Yes, proceed</button>
              <button onClick={()=>{ setStep(0); setPending(''); setConflict(null) }} style={{ flex:1, padding:'8px', borderRadius:8, background:'#F5F4F1', color:'#6B5D4A', border:'none', cursor:'pointer', fontSize:12 }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Conflict step 2 */}
        {step===2 && conflict && (
          <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
            <p style={{ fontSize:13, fontWeight:600, color:'#7F1D1D', marginBottom:10 }}>
              Assign a new number to <strong>{conflict.conflictEmpName}</strong>?
            </p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>tryAssign(pending,true)} disabled={saving}
                style={{ flex:1, padding:'8px', borderRadius:8, background:'#EF4444', color:'white', border:'none', cursor:'pointer', fontWeight:700, fontSize:12 }}>
                {saving?'…':'No, just remove it'}
              </button>
              <button onClick={()=>{ tryAssign(pending,true) }} disabled={saving}
                style={{ flex:1, padding:'8px', borderRadius:8, background:'#10B981', color:'white', border:'none', cursor:'pointer', fontWeight:700, fontSize:12 }}>
                {saving?'…':'Yes, will reassign'}
              </button>
            </div>
          </div>
        )}

        {/* SIM picker */}
        {step===0 && (
          <>
            <p style={{ fontSize:11, fontWeight:700, color:'#A89880', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Select from SIM cards ({station})</p>
            {available.length===0 ? (
              <div style={{ textAlign:'center', padding:'20px 0', fontSize:13, color:'#A89880' }}>No available SIM numbers for this station</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:220, overflowY:'auto', marginBottom:14 }}>
                {available.map(s=>(
                  <button key={s.id} onClick={()=>tryAssign(s.phone_number)} disabled={saving}
                    style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', borderRadius:10,
                      background: s.emp_id===emp.id ? '#F0FDF4' : '#FAFAF8',
                      border: `1.5px solid ${s.emp_id===emp.id ? '#A7F3D0' : '#EAE6DE'}`,
                      cursor:'pointer', textAlign:'left' }}>
                    <span style={{ fontSize:13, fontWeight:700, fontFamily:'inherit', color:'var(--text)' }}>{s.phone_number}</span>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      {s.emp_id===emp.id && <span style={{ fontSize:10, fontWeight:700, color:'#10B981' }}>Current</span>}
                      <span style={{ fontSize:10, color:'#A89880' }}>{s.carrier}</span>
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

// ── Vehicle Card ──────────────────────────────────────────────
function VehicleCard({ v, asgn, isDown, sc, sb, date, station, emps, onEdit, onDelete, onAssign }) {
  const [showHistory, setShowHistory] = useState(false)
  const [history,     setHistory]     = useState([])
  const [histLoading, setHistLoading] = useState(false)

  async function loadHistory() {
    if (history.length > 0) { setShowHistory(p=>!p); return }
    setShowHistory(true); setHistLoading(true)
    try {
      const r = await fetch(`${API}/api/vehicles/assignments/history?vehicle_id=${v.id}&limit=30`, { headers: hdr() })
      setHistory((await r.json()).history || [])
    } catch { setHistory([]) } finally { setHistLoading(false) }
  }

  const assignedEmp = asgn?.emp_id ? emps.find(e => e.id === asgn.emp_id) : null
  const assignedInitials = assignedEmp ? assignedEmp.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : null

  return (
    <div style={{background:'var(--card)',borderRadius:18,overflow:'hidden',border:`1px solid ${isDown?`${sc}40`:'var(--border)'}`,boxShadow:isDown?`0 0 0 1px ${sc}20`:'none',transition:'box-shadow 0.2s'}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 6px 20px rgba(0,0,0,0.08)`}
      onMouseLeave={e=>e.currentTarget.style.boxShadow=isDown?`0 0 0 1px ${sc}20`:'none'}>

      {/* Status strip */}
      <div style={{height:4,background:sc}}/>

      <div style={{padding:'14px 16px'}}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:44,height:44,borderRadius:14,background:sb,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Truck size={20} color={sc}/>
            </div>
            <div>
              <div style={{fontWeight:900,fontSize:16,color:'var(--text)',letterSpacing:'0.03em',lineHeight:1.1}}>{v.plate}</div>
              <div style={{fontSize:11.5,color:'var(--text-muted)',marginTop:2}}>{[v.make,v.model,v.year].filter(Boolean).join(' ')||'Vehicle'}</div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:10.5,fontWeight:700,color:sc,background:sb,padding:'3px 10px',borderRadius:20,border:`1px solid ${sc}30`,textTransform:'capitalize'}}>{v.status}</span>
            {v.station_code&&<span style={{fontSize:9.5,fontWeight:700,color:'#B8860B',background:'#FDF6E3',border:'1px solid #F0D78C',borderRadius:6,padding:'2px 7px'}}>{v.station_code}</span>}
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onEdit} title="Edit"><Pencil size={13}/></button>
            <button className="btn btn-ghost btn-icon btn-sm" style={{color:'#EF4444'}} onClick={onDelete} title="Delete"><Trash2 size={13}/></button>
          </div>
        </div>

        {/* Grounded banner */}
        {isDown&&v.grounded_reason&&(
          <div style={{background:`${sc}10`,border:`1px solid ${sc}40`,borderRadius:10,padding:'8px 12px',fontSize:12,color:sc,marginBottom:12,display:'flex',gap:6,alignItems:'flex-start'}}>
            <AlertTriangle size={13} style={{flexShrink:0,marginTop:1}}/> {v.grounded_reason}{v.grounded_since?` · since ${v.grounded_since.slice(0,10)}`:''}
          </div>
        )}

        {/* Currently assigned DA chip */}
        {assignedEmp ? (
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'rgba(46,125,82,0.07)',border:'1px solid rgba(46,125,82,0.2)',borderRadius:10,marginBottom:12}}>
            <div style={{width:28,height:28,borderRadius:8,background:'rgba(46,125,82,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:11,color:'#2E7D52',flexShrink:0}}>{assignedInitials}</div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:12,fontWeight:700,color:'#2E7D52',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{assignedEmp.name}</div>
              <div style={{fontSize:10,color:'rgba(46,125,82,0.7)'}}>Assigned today</div>
            </div>
          </div>
        ) : (
          <div style={{display:'flex',alignItems:'center',gap:6,padding:'7px 10px',background:'var(--bg-alt)',border:'1px dashed var(--border-med)',borderRadius:10,marginBottom:12}}>
            <div style={{width:24,height:24,borderRadius:6,background:'var(--border)',display:'flex',alignItems:'center',justifyContent:'center'}}><Users size={11} color="var(--text-muted)"/></div>
            <span style={{fontSize:11.5,color:'var(--text-muted)',fontStyle:'italic'}}>Unassigned today</span>
          </div>
        )}

        {/* Assign dropdown */}
        <div style={{marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>Assign DA — {date}</div>
          <DriverSearch employees={emps.filter(e=>e.station_code===station)} value={asgn?.emp_id||''} onChange={onAssign} placeholder="— Unassigned —"/>
        </div>

        {/* History toggle */}
        <button onClick={loadHistory}
          style={{display:'flex',alignItems:'center',gap:6,width:'100%',padding:'8px 12px',borderRadius:10,background:showHistory?'var(--bg-alt)':'transparent',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:12,fontWeight:600,color:'var(--text-muted)',transition:'all 0.15s'}}>
          <History size={12}/> Assignment History
          <ChevronDown size={12} style={{marginLeft:'auto',transition:'transform 0.2s',transform:showHistory?'rotate(180deg)':'none'}}/>
        </button>
      </div>

      {/* History panel */}
      {showHistory && (
        <div style={{borderTop:'1px solid var(--border)',padding:'12px 16px',background:'var(--bg-alt)',borderRadius:'0 0 18px 18px'}}>
          {histLoading ? (
            <div style={{textAlign:'center',padding:'12px 0',color:'var(--text-muted)',fontSize:12}}>Loading…</div>
          ) : history.length === 0 ? (
            <div style={{textAlign:'center',padding:'12px 0',color:'var(--text-muted)',fontSize:12}}>No assignment history yet</div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {history.map(h=>(
                <div key={h.id} style={{display:'flex',alignItems:'center',gap:9,padding:'7px 10px',borderRadius:9,background:'var(--card)',border:'1px solid var(--border)'}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:h.emp_id?'#10B981':'#D1D5DB',flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.driver_name||'— Unassigned —'}</div>
                    <div style={{fontSize:10,color:'var(--text-muted)',marginTop:1}}>{h.date?.slice(0,10)}</div>
                  </div>
                  <span style={{fontSize:9.5,color:'#B8860B',background:'#FDF6E3',border:'1px solid #F0D78C',borderRadius:5,padding:'2px 6px',flexShrink:0,fontWeight:700}}>{h.station_code}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function POCPage() {
  const { user }  = useAuth()
  const [station, setStation] = useState(user?.station_code || 'DDB1')
  const canSwitchStation = user?.role === 'admin' || user?.role === 'general_manager'
  const searchParams = useSearchParams()
  const [tab,     setTab]     = useState(searchParams.get('tab') || 'attendance')

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t) setTab(t)
  }, [searchParams])
  const [date,    setDate]    = useState(new Date().toISOString().slice(0,10))
  const [att,     setAtt]     = useState([])
  const [emps,    setEmps]    = useState([])
  const [vehs,    setVehs]    = useState([])
  const [asgns,   setAsgns]   = useState([])
  const [anns,    setAnns]    = useState([])
  const [leaves,  setLeaves]  = useState([])
  const [delivs,  setDelivs]  = useState([])
  const [sims,    setSims]    = useState([])
  const [currentHandovers, setCurrentHandovers] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [modal,        setModal]        = useState(null)
  const [search,       setSearch]       = useState('')
  const [bulkLoading,  setBulkLoading]  = useState(false)
  const [showLeaveHistory, setShowLeaveHistory] = useState(false)
  // Replaces window.confirm() throughout this page
  const [confirmDlg,   setConfirmDlg]  = useState(null) // { title, message, confirmLabel, danger, onConfirm }
  // Staged leave action — requires explicit confirm before firing
  const [pendingLeave, setPendingLeave] = useState(null) // { id, action, name }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const h = { headers:{ Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }
      const [a,e,an,lv,v,asgn,d,s,hv] = await Promise.all([
        fetch(`${API}/api/attendance?date=${date}`,h).then(r=>r.json()),
        fetch(`${API}/api/employees`,h).then(r=>r.json()),  // backend filters by station for POC role
        fetch(`${API}/api/poc/announcements`,h).then(r=>r.json()),
        fetch(`${API}/api/leaves?stage=all`,h).then(r=>r.json()),
        fetch(`${API}/api/vehicles`,h).then(r=>r.json()),
        fetch(`${API}/api/vehicles/assignments?date=${date}&station_code=${station}`,h).then(r=>r.json()),
        fetch(`${API}/api/deliveries?station=${station}`,h).then(r=>r.json()),
        fetch(`${API}/api/sims?station_code=${station}`,h).then(r=>r.json()),
        fetch(`${API}/api/handovers/current?station_code=${station}`,h).then(r=>r.json()),
      ])
      // Backend enforces station for POC role — use all returned employees
      setEmps(e.employees||[])
      setAnns(an.announcements||[])
      setAtt(a.attendance||[])
      setLeaves(lv.leaves||[]);setVehs(v.vehicles||[]);setAsgns(asgn.assignments||[])
      setDelivs(d.deliveries||[]);setSims(s.sims||[]);setCurrentHandovers((hv.current)||[])
    } catch(e){console.error(e)} finally{setLoading(false)}
  },[date,station])

  useEffect(()=>{load()},[load])
  useEffect(()=>{ setSearch('') },[date])

  async function handleLeave(id,status) {
    await fetch(`${API}/api/leaves/${id}/status`,{method:'PATCH',headers:hdr(),body:JSON.stringify({status})})
    load()
  }
  function deleteAtt(id) {
    setConfirmDlg({
      title: 'Remove attendance record?',
      message: 'This will delete the attendance entry for this DA on the selected date.',
      confirmLabel: 'Remove', danger: true,
      onConfirm: async () => {
        setConfirmDlg(null)
        await fetch(`${API}/api/attendance/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${localStorage.getItem('gcd_token')}`}})
        load()
      },
    })
  }
  function deleteDelivery(id) {
    setConfirmDlg({
      title: 'Delete delivery log?',
      message: 'This delivery record will be permanently removed.',
      confirmLabel: 'Delete', danger: true,
      onConfirm: async () => {
        setConfirmDlg(null)
        await fetch(`${API}/api/deliveries/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${localStorage.getItem('gcd_token')}`}})
        load()
      },
    })
  }
  function deleteAnn(id) {
    setConfirmDlg({
      title: 'Delete announcement?',
      message: 'This notice will be removed for all stations immediately.',
      confirmLabel: 'Delete', danger: true,
      onConfirm: async () => {
        setConfirmDlg(null)
        await fetch(`${API}/api/poc/announcements/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${localStorage.getItem('gcd_token')}`}})
        load()
      },
    })
  }
  function handleBulkPresent() {
    const unlogged = filtEmp.filter(e => !att.find(a => a.emp_id === e.id))
    if (unlogged.length === 0) {
      setConfirmDlg({
        title: 'All DAs already logged',
        message: 'Every DA on this station already has an attendance record for this date.',
        confirmLabel: 'OK', cancelLabel: null, danger: false,
        onConfirm: () => setConfirmDlg(null),
      })
      return
    }
    setConfirmDlg({
      title: `Mark ${unlogged.length} DA${unlogged.length !== 1 ? 's' : ''} as Present?`,
      message: `Cycle A · 5 hours. This will create attendance records for ${unlogged.length} DA${unlogged.length !== 1 ? 's' : ''} who haven't been logged yet today.`,
      confirmLabel: 'Mark Present', danger: false,
      onConfirm: async () => {
        setConfirmDlg(null)
        setBulkLoading(true)
        try {
          await fetch(`${API}/api/attendance/bulk`, {
            method:'POST', headers:hdr(),
            body:JSON.stringify({ records: unlogged.map(e => ({ emp_id:e.id, date, status:'present', cycle:'A', cycle_hours:'5' })) })
          })
          load()
        } catch { /* silent — load() will reflect actual state */ } finally { setBulkLoading(false) }
      },
    })
  }

  async function assignVehicle(vId,eId) {
    try {
      const res = await fetch(`${API}/api/vehicles/assignments`,{
        method:'POST', headers:hdr(),
        body:JSON.stringify({vehicle_id:vId, emp_id:eId||null, date, station_code:station})
      })
      if (!res.ok) {
        const d = await res.json()
        alert(d.error || 'Failed to assign vehicle')
        return
      }
      load()
    } catch(e) { alert('Failed to assign vehicle') }
  }

  const present  = att.filter(a=>a.status==='present').length
  const absent   = att.filter(a=>a.status==='absent').length
  const earnings = att.reduce((s,a)=>s+parseFloat(a.earnings||0),0)
  const active   = vehs.filter(v=>v.status==='active').length
  const pendingLeaves  = leaves.filter(l => l.mgr_status === 'pending')
  const historyLeaves  = leaves.filter(l => l.mgr_status !== 'pending')

  const stationEmps = emps.filter(e => e.station_code === station)
  const filtEmp  = stationEmps.filter(e=>!search||e.name.toLowerCase().includes(search.toLowerCase())||e.id.toLowerCase().includes(search.toLowerCase()))
  const loggedCount = filtEmp.filter(e => att.find(a => a.emp_id === e.id)).length

  const TABS = [
    {id:'attendance',label:'Attendance', icon:Users,          count:present},
    {id:'das',       label:'DAs',        icon:Contact,        count:stationEmps.length||null},
    {id:'fleet',     label:'Fleet',      icon:Truck,          count:active},
    {id:'deliveries',label:'Deliveries', icon:Package,        count:null},
    {id:'handovers', label:'Handovers',  icon:ArrowLeftRight, count:currentHandovers.length||null},
    {id:'sims',      label:'SIM Cards',  icon:Smartphone,     count:null},
    {id:'leaves',    label:'Leaves',     icon:Calendar,       count:pendingLeaves.length||null},
    {id:'notices',   label:'Notices',    icon:Bell,           count:anns.length||null},
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,animation:'slideUp 0.3s ease'}}>

      {/* ── Station Hero Card ── */}
      <div style={{background:'linear-gradient(135deg,#1A1612 0%,#2C1F0A 100%)',borderRadius:20,padding:'20px 18px',color:'white',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',right:-20,top:-20,width:140,height:140,borderRadius:'50%',background:'rgba(184,134,11,0.12)'}}/>
        <div style={{position:'absolute',right:30,bottom:-40,width:100,height:100,borderRadius:'50%',background:'rgba(184,134,11,0.07)'}}/>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16,position:'relative'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'#2E7D52',boxShadow:'0 0 0 3px rgba(46,125,82,0.3)',animation:'pulse-dot 2s infinite'}}/>
              <span style={{fontSize:11,color:'rgba(255,255,255,0.6)',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase'}}>Live Station</span>
            </div>
            <div style={{fontWeight:900,fontSize:24,letterSpacing:'-0.03em',lineHeight:1.1}}>📍 {station}</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.5)',marginTop:4}}>{date} · {emps.length} DAs assigned</div>
            {canSwitchStation && (
              <div style={{display:'flex',gap:6,marginTop:10}}>
                {['DDB1','DXE6'].map(s=>(
                  <button key={s} onClick={()=>setStation(s)}
                    style={{padding:'5px 16px',borderRadius:20,border:`1.5px solid ${station===s?'#B8860B':'rgba(255,255,255,0.2)'}`,background:station===s?'rgba(184,134,11,0.3)':'rgba(255,255,255,0.07)',color:station===s?'#D4A017':'rgba(255,255,255,0.55)',fontWeight:station===s?700:500,fontSize:12,cursor:'pointer',fontFamily:'Poppins,sans-serif',transition:'all 0.15s'}}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)}
            style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:10,padding:'7px 10px',color:'white',fontSize:12,outline:'none',cursor:'pointer'}}/>
        </div>
        {/* Stats row */}
        <div className="r-grid-4" style={{gap:8,position:'relative'}}>
          {[
            {l:'Present', v:present,   c:'#4ADE80', bg:'rgba(74,222,128,0.15)'},
            {l:'Absent',  v:absent,    c:'#F87171', bg:'rgba(248,113,113,0.15)'},
            {l:'Vehicles',v:active,    c:'#FCD34D', bg:'rgba(252,211,77,0.15)'},
            {l:'Earnings',v:`AED ${earnings.toFixed(0)}`,c:'#93C5FD',bg:'rgba(147,197,253,0.15)'},
          ].map(s=>(
            <div key={s.l} style={{background:s.bg,borderRadius:12,padding:'10px 8px',textAlign:'center',backdropFilter:'blur(10px)'}}>
              <div style={{fontWeight:800,fontSize:s.l==='Earnings'?13:20,color:s.c,letterSpacing:'-0.02em',lineHeight:1.2}}>{s.v}</div>
              <div style={{fontSize:9.5,color:'rgba(255,255,255,0.5)',fontWeight:600,marginTop:2,textTransform:'uppercase',letterSpacing:'0.05em'}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{display:'flex',gap:6,overflowX:'auto',scrollbarWidth:'none',paddingBottom:2}}>
        <style>{`.poc-tabs::-webkit-scrollbar{display:none}`}</style>
        {TABS.map(t=>{
          const Icon=t.icon
          const active=tab===t.id
          return (
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:20,border:`1.5px solid ${active?'#B8860B':'#EAE6DE'}`,background:active?'linear-gradient(135deg,#FDF6E3,#FEF9F0)':'#FFF',color:active?'#B8860B':'#A89880',fontWeight:active?700:500,fontSize:12.5,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,transition:'all 0.2s',boxShadow:active?'0 4px 12px rgba(184,134,11,0.2)':'none',transform:active?'scale(1.02)':'scale(1)'}}>
              <Icon size={13}/>
              {t.label}
              {t.count!=null&&t.count>0&&<span style={{background:active?'#B8860B':'#EAE6DE',color:active?'white':'#A89880',borderRadius:10,padding:'1px 7px',fontSize:10,fontWeight:700}}>{t.count}</span>}
            </button>
          )
        })}
      </div>

      {loading && (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {[1,2,3].map(i=><div key={i} className="skeleton" style={{height:72,borderRadius:14}}/>)}
        </div>
      )}

      {/* ── ATTENDANCE ── */}
      {!loading && tab==='attendance' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* Completion badge */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:12,background:'var(--card)',border:'1px solid var(--border)'}}>
            <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>
              <span style={{fontWeight:900,fontSize:18,color:loggedCount===filtEmp.length&&filtEmp.length>0?'#10B981':'#F59E0B'}}>{loggedCount}</span>
              <span style={{color:'var(--text-muted)'}}> / {filtEmp.length} logged today</span>
            </div>
            <div style={{width:`${filtEmp.length>0?Math.round(loggedCount/filtEmp.length*100):0}%`,height:6,background:'#10B981',borderRadius:20,minWidth:4,maxWidth:120,transition:'width 0.5s ease'}}/>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <div style={{flex:'1 1 160px',position:'relative'}}>
              <Search size={13} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',pointerEvents:'none'}}/>
              <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search driver…" style={{paddingLeft:34,borderRadius:20}}/>
            </div>
            <button className="btn btn-secondary" onClick={handleBulkPresent} disabled={bulkLoading} style={{borderRadius:20,padding:'9px 14px',fontSize:12}}>
              <CheckSquare size={13}/> {bulkLoading?'Marking…':'Mark All Present'}
            </button>
            <button className="btn btn-primary" onClick={()=>setModal('att')} style={{borderRadius:20,padding:'9px 16px'}}>
              <Plus size={14}/> Log
            </button>
          </div>

          {filtEmp.map(emp=>{
            const a=att.find(x=>x.emp_id===emp.id)
            const hrs=a?.total_hours||a?.cycle_hours||0
            const statusColor={present:'#2E7D52',absent:'#C0392B',leave:'#B45309'}[a?.status]||'#A89880'
            const statusBg={present:'#ECFDF5',absent:'#FEF2F2',leave:'#FFFBEB'}[a?.status]||'#F5F4F1'
            return (
              <div key={emp.id} style={{background:'#FFF',border:'1px solid #EAE6DE',borderRadius:16,overflow:'hidden',transition:'box-shadow 0.2s'}}>
                <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px'}}>
                  {/* Avatar */}
                  <div style={{width:44,height:44,borderRadius:13,background:'linear-gradient(135deg,#FDF6E3,#FEF3D0)',border:'1px solid #F0D78C',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{emp.avatar||'👤'}</div>
                  {/* Info */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14,color:'var(--text)'}}>{emp.name}</div>
                    <div style={{fontSize:11,color:'#A89880',fontFamily:'inherit',marginTop:1}}>{emp.id}</div>
                  </div>
                  {/* Status */}
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5,flexShrink:0}}>
                    {a ? (
                      <>
                        <div style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',background:statusBg,borderRadius:20}}>
                          <div style={{width:6,height:6,borderRadius:'50%',background:statusColor}}/>
                          <span style={{fontSize:11,fontWeight:700,color:statusColor,textTransform:'capitalize'}}>{a.status}</span>
                        </div>
                        {hrs>0 && <div style={{fontSize:11,color:'var(--text-muted)'}}>{hrs}h · AED {parseFloat(a.earnings||0).toFixed(0)}</div>}
                      </>
                    ) : (
                      <span style={{fontSize:11,color:'#C4B49A',background:'#F5F4F1',padding:'4px 10px',borderRadius:20,fontWeight:500}}>Not logged</span>
                    )}
                    <button onClick={e=>{e.stopPropagation();setModal({type:'work-num',emp})}}
                      style={{fontSize:10,fontWeight:600,color:'#7C3AED',background:'var(--purple-bg)',border:'1px solid var(--purple-border)',borderRadius:20,padding:'2px 8px',cursor:'pointer',fontFamily:'Poppins,sans-serif'}}>
                      📱 {emp.work_number||'Assign SIM'}
                    </button>
                  </div>
                </div>
                {/* Cycles row */}
                {(a?.cycle || a?.is_rescue) && (
                  <div style={{padding:'8px 16px',background:'var(--bg-alt)',borderTop:'1px solid var(--border)',display:'flex',gap:5,flexWrap:'wrap'}}>
                    {a.cycle?.split(',').filter(Boolean).map(c=>(
                      <span key={c} style={{fontSize:11,fontWeight:700,color:'#B8860B',background:'#FDF6E3',border:'1px solid #F0D78C',borderRadius:6,padding:'2px 8px'}}>{c}</span>
                    ))}
                    {a.is_rescue && <span style={{fontSize:11,fontWeight:700,color:'#1D6FA4',background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:6,padding:'2px 8px'}}>🆘 {a.rescue_hours}h Rescue</span>}
                  </div>
                )}
                {/* Actions */}
                {a && (
                  <div style={{padding:'8px 12px',background:'#FAFAF8',borderTop:'1px solid #F5F4F1',display:'flex',gap:6,justifyContent:'flex-end'}}>
                    <button className="btn btn-secondary btn-sm" onClick={()=>setModal({type:'att-edit',record:{...a,name:emp.name,avatar:emp.avatar}})}><Pencil size={12}/> Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={()=>deleteAtt(a.id)}><Trash2 size={12}/> Remove</button>
                  </div>
                )}
              </div>
            )
          })}
          {filtEmp.length===0 && <div style={{textAlign:'center',padding:50,color:'#A89880'}}>No DAs found for {station}</div>}
        </div>
      )}

      {/* ── FLEET ── */}
      {!loading && tab==='fleet' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',justifyContent:'flex-end'}}>
            <button className="btn btn-primary" onClick={()=>setModal('vehicle-add')} style={{borderRadius:20}}><Plus size={14}/> Add Vehicle</button>
          </div>
          {vehs.map(v=>{
            const asgn=asgns.find(a=>a.vehicle_id===v.id)
            const isDown=v.status!=='active'
            const sc=VSTATUS_COLORS[v.status]||'#A89880'
            const sb=VSTATUS_BG[v.status]||'#F5F4F1'
            return (
              <VehicleCard key={v.id} v={v} asgn={asgn} isDown={isDown} sc={sc} sb={sb}
                date={date} station={station} emps={emps}
                onEdit={()=>setModal({type:'vehicle-edit',vehicle:v})}
                onDelete={()=>setConfirmDlg({
                  title:'Delete vehicle?',
                  message:`Remove ${v.plate}${v.make?' ('+v.make+(v.model?' '+v.model:'')+')'  :''} permanently? This cannot be undone.`,
                  confirmLabel:'Delete',
                  danger:true,
                  onConfirm:async()=>{
                    setConfirmDlg(null)
                    await fetch(`${API}/api/vehicles/${v.id}`,{method:'DELETE',headers:hdr()})
                    load()
                  }
                })}
                onAssign={eId=>assignVehicle(v.id,eId)}/>
            )
          })}
          {vehs.length===0&&<div style={{textAlign:'center',padding:50,color:'#A89880'}}>No vehicles yet — add one above</div>}
        </div>
      )}

      {/* ── DELIVERIES ── */}
      {!loading && tab==='deliveries' && (() => {
        const todayRecord = delivs.find(d => d.date === date)
        const successRate = todayRecord?.total > 0 ? Math.round(todayRecord.successful / todayRecord.total * 100) : null
        return (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'flex',justifyContent:'flex-end'}}>
              <button className="btn btn-primary" onClick={()=>setModal(todayRecord?{type:'delivery-edit',delivery:todayRecord}:'delivery')} style={{borderRadius:20}}>
                <Package size={14}/> {todayRecord ? 'Edit Today\'s Log' : 'Log Today\'s Deliveries'}
              </button>
            </div>

            {/* Today's delivery card */}
            {todayRecord ? (
              <div style={{background:'linear-gradient(135deg,var(--card),var(--bg-alt))',border:'1px solid var(--border)',borderRadius:16,padding:'18px'}}>
                <div style={{fontWeight:700,fontSize:13,color:'var(--text-muted)',marginBottom:12,textTransform:'uppercase',letterSpacing:'0.06em'}}>📅 Today — {date}</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
                  {[
                    {l:'Total',     v:todayRecord.total,      c:'#B8860B',bg:'#FDF6E3'},
                    {l:'Attempted', v:todayRecord.attempted,  c:'#1D6FA4',bg:'#EFF6FF'},
                    {l:'Successful',v:todayRecord.successful, c:'#2E7D52',bg:'#ECFDF5'},
                    {l:'Returned',  v:todayRecord.returned,   c:'#C0392B',bg:'#FEF2F2'},
                  ].map(s=>(
                    <div key={s.l} style={{textAlign:'center',padding:'12px 8px',borderRadius:12,background:s.bg,border:'1px solid var(--border)'}}>
                      <div style={{fontWeight:900,fontSize:22,color:s.c,letterSpacing:'-0.03em'}}>{s.v}</div>
                      <div style={{fontSize:10,color:s.c,fontWeight:600,marginTop:2,opacity:0.8}}>{s.l}</div>
                    </div>
                  ))}
                </div>
                {successRate !== null && (
                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                      <span style={{fontSize:12,fontWeight:600,color:'var(--text-sub)'}}>Success Rate</span>
                      <span style={{fontSize:13,fontWeight:800,color:successRate>=90?'#2E7D52':successRate>=70?'#B45309':'#C0392B'}}>{successRate}%</span>
                    </div>
                    <div style={{height:8,background:'var(--border)',borderRadius:20,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${successRate}%`,background:successRate>=90?'#10B981':successRate>=70?'#F59E0B':'#EF4444',borderRadius:20,transition:'width 1s ease'}}/>
                    </div>
                  </div>
                )}
                {todayRecord.notes && <div style={{marginTop:12,fontSize:12,color:'var(--text-sub)',padding:'8px 12px',background:'var(--bg)',borderRadius:9,border:'1px solid var(--border)'}}>{todayRecord.notes}</div>}
              </div>
            ) : (
              <div style={{textAlign:'center',padding:'30px 24px',background:'var(--card)',border:'1px dashed var(--border-med)',borderRadius:16}}>
                <Package size={32} style={{margin:'0 auto 10px',display:'block',opacity:0.2}}/>
                <div style={{fontSize:13,color:'var(--text-muted)'}}>No delivery log for {date} — tap above to log.</div>
              </div>
            )}

            {/* Recent history */}
            {delivs.filter(d=>d.date!==date).slice(0,14).map((d,i)=>{
              const sr = d.total > 0 ? Math.round(d.successful / d.total * 100) : null
              return (
                <div key={d.id||i} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:'11px 14px',display:'flex',alignItems:'center',gap:12}}>
                  <div style={{fontWeight:700,fontSize:12.5,color:'var(--text)',minWidth:86}}>{d.date}</div>
                  <div style={{flex:1,display:'flex',gap:10,flexWrap:'wrap'}}>
                    <span style={{fontSize:12,color:'var(--text-sub)'}}><strong style={{color:'var(--text)'}}>{d.total}</strong> total</span>
                    <span style={{fontSize:12,color:'#2E7D52'}}><strong>{d.successful}</strong> ✓</span>
                    <span style={{fontSize:12,color:'#C0392B'}}><strong>{d.returned}</strong> returned</span>
                  </div>
                  {sr !== null && (
                    <span style={{fontSize:12,fontWeight:800,color:sr>=90?'#2E7D52':sr>=70?'#B45309':'#C0392B',background:sr>=90?'#ECFDF5':sr>=70?'#FFFBEB':'#FEF2F2',padding:'3px 8px',borderRadius:20,border:`1px solid ${sr>=90?'#A7F3D0':sr>=70?'#FCD34D':'#FCA5A5'}`}}>{sr}%</span>
                  )}
                  <div style={{display:'flex',gap:5,flexShrink:0}}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setModal({type:'delivery-edit',delivery:{...d,date:d.date}})} title="Edit"><Pencil size={12}/></button>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{color:'#C0392B'}} onClick={()=>deleteDelivery(d.id)} title="Delete"><Trash2 size={12}/></button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* ── HANDOVERS ── */}
      {!loading && tab==='handovers' && (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {currentHandovers.length===0 ? (
            <div style={{textAlign:'center',padding:50,color:'var(--text-muted)'}}>
              <ArrowLeftRight size={36} style={{margin:'0 auto 12px',display:'block',opacity:0.2}}/>
              <div style={{fontWeight:600,fontSize:14,color:'var(--text-sub)'}}>No active handovers</div>
              <div style={{fontSize:12,marginTop:4}}>Vehicle handover forms will appear here.</div>
            </div>
          ) : currentHandovers.map((h,i)=>{
            const isPickup = h.type==='pickup'
            return (
              <div key={h.id||i} style={{background:'var(--card)',border:`1.5px solid ${isPickup?'#A7F3D0':'#BFDBFE'}`,borderRadius:16,overflow:'hidden',animation:`slideUp 0.3s ${i*0.05}s ease both`}}>
                <div style={{height:3,background:isPickup?'#10B981':'#2563EB'}}/>
                <div style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:42,height:42,borderRadius:12,background:isPickup?'#ECFDF5':'#EFF6FF',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <ArrowLeftRight size={18} color={isPickup?'#10B981':'#2563EB'}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                      <span style={{fontWeight:800,fontSize:14,color:'var(--text)'}}>{h.plate||'—'}</span>
                      <span style={{fontSize:10.5,fontWeight:700,color:isPickup?'#10B981':'#2563EB',background:isPickup?'#ECFDF5':'#EFF6FF',padding:'1px 8px',borderRadius:20}}>{isPickup?'Pickup':'Return'}</span>
                    </div>
                    <div style={{fontSize:12,color:'var(--text-sub)'}}>{h.emp_name||h.emp_id}</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:11,color:'var(--text-muted)'}}>{h.handover_date?.slice(0,10)||h.created_at?.slice(0,10)||'—'}</div>
                    {h.odometer_before && <div style={{fontSize:11,color:'var(--text-sub)',marginTop:2}}>ODO: {h.odometer_before} km</div>}
                  </div>
                </div>
                {h.notes && <div style={{padding:'8px 16px',background:'var(--bg-alt)',borderTop:'1px solid var(--border)',fontSize:12,color:'var(--text-sub)'}}>{h.notes}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* ── LEAVES ── */}
      {!loading && tab==='leaves' && (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {/* Toggle: Pending / History */}
          <div style={{display:'flex',gap:8,background:'var(--bg-alt)',borderRadius:12,padding:4}}>
            <button onClick={()=>setShowLeaveHistory(false)}
              style={{flex:1,padding:'8px 12px',borderRadius:9,border:'none',cursor:'pointer',fontWeight:600,fontSize:12,transition:'all 0.2s',
                background:!showLeaveHistory?'var(--card)':'transparent',
                color:!showLeaveHistory?'#B8860B':'var(--text-muted)',
                boxShadow:!showLeaveHistory?'0 1px 4px rgba(0,0,0,0.1)':'none'}}>
              Awaiting Manager ({pendingLeaves.length})
            </button>
            <button onClick={()=>setShowLeaveHistory(true)}
              style={{flex:1,padding:'8px 12px',borderRadius:9,border:'none',cursor:'pointer',fontWeight:600,fontSize:12,transition:'all 0.2s',display:'flex',alignItems:'center',justifyContent:'center',gap:5,
                background:showLeaveHistory?'var(--card)':'transparent',
                color:showLeaveHistory?'#B8860B':'var(--text-muted)',
                boxShadow:showLeaveHistory?'0 1px 4px rgba(0,0,0,0.1)':'none'}}>
              <History size={12}/> History ({historyLeaves.length})
            </button>
          </div>

          {(showLeaveHistory ? historyLeaves : pendingLeaves).length===0&&(
            <div style={{textAlign:'center',padding:50,color:'#A89880'}}>
              {showLeaveHistory ? 'No leave history yet' : 'No pending leave requests'}
            </div>
          )}
          {(showLeaveHistory ? historyLeaves : pendingLeaves).map((l,i)=>{
            const isApproved = l.status==='approved'
            const isRejected = l.status==='rejected'
            return (
              <div key={l.id} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:16,overflow:'hidden',animation:`slideUp 0.3s ${i*0.05}s ease both`}}>
                <div style={{padding:'14px 16px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:20}}>{l.avatar||'👤'}</span>
                      <div>
                        <div style={{fontWeight:700,fontSize:14,color:'var(--text)'}}>{l.name}</div>
                        <div style={{fontSize:11,color:'#B8860B',fontWeight:600}}>{l.type} Leave</div>
                      </div>
                    </div>
                    {showLeaveHistory ? (
                      <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,
                        color:isApproved?'#2E7D52':isRejected?'#C0392B':'#B45309',
                        background:isApproved?'#ECFDF5':isRejected?'#FEF2F2':'#FFFBEB',
                        border:`1px solid ${isApproved?'#A7F3D0':isRejected?'#FECACA':'#FCD34D'}`}}>
                        {isApproved?'Approved':isRejected?'Rejected':'Pending'}
                      </span>
                    ) : (
                      <span style={{fontSize:11,fontWeight:700,color:'#B45309',background:'#FFFBEB',border:'1px solid #FCD34D',padding:'3px 10px',borderRadius:20}}>Awaiting Manager</span>
                    )}
                  </div>
                  <div style={{display:'flex',gap:6,alignItems:'center',fontSize:12,color:'var(--text-sub)',marginBottom:l.reason?8:0}}>
                    <Calendar size={12}/> {l.from_date?.slice(0,10)} → {l.to_date?.slice(0,10)} · <strong>{l.days} day{l.days!==1?'s':''}</strong>
                  </div>
                  {l.reason&&<div style={{fontSize:12,color:'var(--text-muted)',padding:'7px 10px',background:'var(--bg-alt)',borderRadius:8}}>{l.reason}</div>}
                  {showLeaveHistory && l.updated_at && (
                    <div style={{fontSize:11,color:'var(--text-muted)',marginTop:6}}>
                      Actioned: {new Date(l.updated_at).toLocaleString('en-AE',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                    </div>
                  )}
                </div>
                {!showLeaveHistory && (
                  <div style={{padding:'8px 14px',background:'var(--bg-alt)',borderTop:'1px solid var(--border)',fontSize:11.5,color:'var(--text-muted)',fontStyle:'italic'}}>
                    Pending manager approval — no action required from you
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}


      {/* ── DAs ── */}
      {!loading && tab==='das' && (
        <DAsTab stationEmps={stationEmps} sims={sims}/>
      )}

      {/* ── SIM CARDS ── */}
      {!loading && tab==='sims' && (
        <SimSection sims={sims} emps={emps} station={station} onRefresh={load}/>
      )}

      {/* ── NOTICES ── */}
      {!loading && tab==='notices' && (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{display:'flex',justifyContent:'flex-end'}}>
            <button className="btn btn-primary" onClick={()=>setModal('ann-add')} style={{borderRadius:20}}><Plus size={14}/> New Notice</button>
          </div>
          {anns.length===0&&<div style={{textAlign:'center',padding:50,color:'#A89880'}}>No announcements yet</div>}
          {anns.map((ann,i)=>(
            <div key={ann.id} style={{background:'#FFF',border:'1px solid #EAE6DE',borderRadius:16,padding:'16px',animation:`slideUp 0.3s ${i*0.06}s ease both`,position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,left:0,width:4,height:'100%',background:'linear-gradient(180deg,#B8860B,#D4A017)'}}/>
              <div style={{paddingLeft:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                  <div style={{fontWeight:700,fontSize:14,color:'var(--text)',flex:1,marginRight:8}}>{ann.title}</div>
                  <div style={{display:'flex',gap:4,flexShrink:0,alignItems:'center'}}>
                    <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:ann.station_code?'#EEF2FF':'#F5F4F1',color:ann.station_code?'#4F46E5':'#A89880',border:`1px solid ${ann.station_code?'#C7D2FE':'#E8E4DC'}`}}>
                      <MapPin size={9} style={{verticalAlign:'middle',marginRight:2}}/>{ann.station_code||'All Stations'}
                    </span>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setModal({type:'ann-edit',ann})}><Pencil size={12}/></button>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{color:'#C0392B'}} onClick={()=>deleteAnn(ann.id)}><Trash2 size={12}/></button>
                  </div>
                </div>
                <div style={{fontSize:13,color:'#6B5D4A',lineHeight:1.6,marginBottom:8}}>{ann.body}</div>
                <div style={{fontSize:11,color:'#C4B49A'}}>{new Date(ann.created_at).toLocaleString('en-AE',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {modal?.type==='work-num'&&<WorkNumModal emp={modal.emp} station={station} sims={sims} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/> }
      {modal==='att'&&<AttModal employees={emps} station={station} date={date} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal?.type==='att-edit'&&<AttModal employees={emps} station={station} date={date} editRecord={modal.record} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal==='ann-add'&&<AnnModal onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal?.type==='ann-edit'&&<AnnModal ann={modal.ann} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal==='vehicle-add'&&<VehicleModal station={station} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal?.type==='vehicle-edit'&&<VehicleModal vehicle={modal.vehicle} station={station} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal==='delivery'&&<DeliveryModal date={date} station={station} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal?.type==='delivery-edit'&&<DeliveryModal date={date} station={station} existing={modal.delivery} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}

      {/* Generic confirm dialog — replaces all window.confirm() calls */}
      <ConfirmDialog
        open={!!confirmDlg}
        title={confirmDlg?.title}
        message={confirmDlg?.message}
        confirmLabel={confirmDlg?.confirmLabel}
        cancelLabel={confirmDlg?.cancelLabel ?? 'Cancel'}
        danger={confirmDlg?.danger ?? true}
        onConfirm={confirmDlg?.onConfirm}
        onCancel={() => setConfirmDlg(null)}
      />

    </div>
  )
}
