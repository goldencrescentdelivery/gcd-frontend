'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { Plus, X, Pencil, Trash2, Truck, Users, Package, Bell, Calendar, CheckCircle, XCircle, Search, ChevronDown, ChevronRight, AlertTriangle, MapPin, Clock } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL
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
      <div onClick={()=>setOpen(p=>!p)} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', background:'#FFF', border:`1.5px solid ${open?'#B8860B':'#EAE6DE'}`, borderRadius:12, cursor:'pointer', transition:'all 0.2s', boxShadow:open?'0 0 0 3px rgba(184,134,11,0.1)':'' }}>
        {selected ? (
          <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#FDF6E3,#FEF3D0)', border:'1px solid #F0D78C', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{selected.avatar||'👤'}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#1A1612' }}>{selected.name}</div>
              <div style={{ fontSize:10.5, color:'#A89880', fontFamily:'monospace' }}>{selected.id}</div>
            </div>
          </div>
        ) : (
          <span style={{ flex:1, fontSize:13, color:'#C4B49A' }}>{placeholder}</span>
        )}
        <ChevronDown size={15} color="#A89880" style={{ flexShrink:0, transition:'transform 0.2s', transform:open?'rotate(180deg)':'none' }}/>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, background:'#FFF', border:'1px solid #EAE6DE', borderRadius:14, boxShadow:'0 12px 40px rgba(0,0,0,0.14)', zIndex:999, maxHeight:300, overflow:'hidden', animation:'scaleIn 0.15s ease' }}>
          <div style={{ padding:'10px 12px', borderBottom:'1px solid #F5F4F1' }}>
            <div style={{ position:'relative' }}>
              <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#C4B49A' }}/>
              <input autoFocus className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or ID…" style={{ paddingLeft:32, fontSize:12, borderRadius:8 }}/>
            </div>
          </div>
          <div style={{ overflowY:'auto', maxHeight:230 }}>
            <div onClick={()=>{onChange('');setOpen(false);setSearch('')}} style={{ padding:'10px 14px', fontSize:13, color:'#A89880', cursor:'pointer', borderBottom:'1px solid #F5F4F1', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:'#F5F4F1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>—</div>
              None
            </div>
            {filtered.map(e => (
              <div key={e.id} onClick={()=>{onChange(e.id);setOpen(false);setSearch('')}}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer', background:value===e.id?'#FDF6E3':'transparent', transition:'background 0.15s' }}>
                <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#FDF6E3,#FEF3D0)', border:`1px solid ${value===e.id?'#D4A017':'#F0D78C'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{e.avatar||'👤'}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1A1612' }}>{e.name}</div>
                  <div style={{ fontSize:10.5, color:'#A89880', fontFamily:'monospace' }}>{e.id}</div>
                </div>
                {value===e.id && <CheckCircle size={15} color="#B8860B"/>}
              </div>
            ))}
            {filtered.length===0 && <div style={{ padding:24, textAlign:'center', color:'#A89880', fontSize:13 }}>No drivers found</div>}
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
      <label className="input-label">Duty Cycles <span style={{ color:'#A89880', textTransform:'none', letterSpacing:0, fontSize:10, fontWeight:400 }}>— select multiple</span></label>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:10 }}>
        {CYCLES.map(c => {
          const on = selected.includes(c)
          return (
            <button key={c} type="button" onClick={()=>toggle(c)}
              style={{
                padding:'11px 6px', borderRadius:12,
                border:`2px solid ${on?'#B8860B':'#EAE6DE'}`,
                background: on ? 'linear-gradient(135deg,#FDF6E3,#FEF9F0)' : '#FAFAF8',
                color: on ? '#B8860B' : '#6B5D4A',
                fontSize:12, fontWeight:700, cursor:'pointer', textAlign:'center',
                transition:'all 0.18s ease',
                transform: on ? 'scale(1.05)' : 'scale(1)',
                boxShadow: on ? '0 4px 12px rgba(184,134,11,0.2)' : 'none',
              }}>
              {c}
              <div style={{ fontSize:9.5, fontWeight:500, color:on?'#B8860B':'#C4B49A', marginTop:2 }}>
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
        <div style={{ padding:'11px 14px', borderRadius:10, background:overMax?'#FEF2F2':'#ECFDF5', border:`1px solid ${overMax?'#FCA5A5':'#A7F3D0'}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:700, color:overMax?'#C0392B':'#2E7D52' }}>
            {overMax ? `⚠️ ${total}h exceeds ${MAX_HRS}h limit` : `✓ ${total}h total`}
          </span>
          {selected.length > 0 && <span style={{ fontSize:11, color:overMax?'#C0392B':'#2E7D52', fontWeight:500 }}>{selected.filter(c=>c!=='Rescue').join(' + ')}{hasRescue?' + Rescue':''}</span>}
        </div>
      )}
    </div>
  )
}

// ── Attendance Modal ──────────────────────────────────────────
function AttModal({ employees, station, editRecord, onSave, onClose }) {
  const isEdit = !!editRecord
  const [empId,  setEmpId]  = useState(editRecord?.emp_id||'')
  const [status, setStatus] = useState(editRecord?.status||'present')
  const [cycles, setCycles] = useState(editRecord?.cycles||[])
  const [rescue, setRescue] = useState(editRecord?.rescue_hours||'')
  const [wType,  setWType]  = useState(editRecord?.worker_type||'driver')
  const [note,   setNote]   = useState(editRecord?.note||'')
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)

  const isDDB6 = station === 'DDB6'
  const selEmp = employees.find(e=>e.id===empId)
  const rate   = parseFloat(selEmp?.hourly_rate||3.85)
  const regHrs = cycles.filter(c=>c!=='Rescue').reduce((s,c)=>s+(CYCLE_H[c]||0),0)
  const resHrs = cycles.includes('Rescue') ? (parseFloat(rescue)||0) : 0
  const total  = regHrs + resHrs
  const est    = isDDB6 ? (wType==='helper'?90:115) : total>0 ? (total*rate).toFixed(2) : null

  async function handleSave() {
    if (!empId) return setErr('Select a driver')
    if (!isDDB6 && status==='present' && cycles.length===0) return setErr('Select at least one cycle')
    setErr(null); setSaving(true)
    try {
      const body = { emp_id:empId, status, note, ...(isDDB6?{pay_type:'daily',worker_type:wType}:{cycles,rescue_hours:rescue||null}) }
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
            <h3 style={{ fontWeight:800, fontSize:16, color:'#1A1612' }}>{isEdit?'Edit':'Log'} Attendance</h3>
            <div style={{ fontSize:11, color:'#B8860B', fontWeight:600, marginTop:1 }}>📍 {station} Station</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17}/></button>
        </div>
        {err && <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#C0392B', marginBottom:14 }}>{err}</div>}

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {!isEdit ? (
            <div>
              <label className="input-label">Driver *</label>
              <DriverSearch employees={employees} value={empId} onChange={setEmpId}/>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#FDF6E3', borderRadius:12, border:'1px solid #F0D78C' }}>
              <span style={{ fontSize:16 }}>{editRecord.avatar||'👤'}</span>
              <span style={{ fontWeight:700, fontSize:14, color:'#B8860B' }}>{editRecord.name}</span>
            </div>
          )}

          <div>
            <label className="input-label">Status</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {[{v:'present',e:'✅',l:'Present'},{v:'absent',e:'❌',l:'Absent'},{v:'leave',e:'🏖',l:'Leave'}].map(s=>(
                <button key={s.v} type="button" onClick={()=>setStatus(s.v)}
                  style={{ padding:'11px 8px', borderRadius:11, border:`2px solid ${status===s.v?'#B8860B':'#EAE6DE'}`, background:status===s.v?'linear-gradient(135deg,#FDF6E3,#FEF9F0)':'#FAFAF8', color:status===s.v?'#B8860B':'#6B5D4A', fontWeight:600, fontSize:12, cursor:'pointer', transition:'all 0.18s', textAlign:'center' }}>
                  <div style={{ fontSize:18, marginBottom:3 }}>{s.e}</div>
                  {s.l}
                </button>
              ))}
            </div>
          </div>

          {status==='present' && isDDB6 && (
            <div>
              <label className="input-label">Worker Type</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[{v:'driver',l:'🚗 Driver',r:'AED 115'},{v:'helper',l:'🔧 Helper',r:'AED 90'}].map(t=>(
                  <button key={t.v} type="button" onClick={()=>setWType(t.v)}
                    style={{ padding:'12px', borderRadius:11, border:`2px solid ${wType===t.v?'#B8860B':'#EAE6DE'}`, background:wType===t.v?'linear-gradient(135deg,#FDF6E3,#FEF9F0)':'#FAFAF8', color:wType===t.v?'#B8860B':'#6B5D4A', fontWeight:600, cursor:'pointer', transition:'all 0.18s', textAlign:'center' }}>
                    <div style={{ fontSize:13 }}>{t.l}</div>
                    <div style={{ fontSize:11, fontWeight:700, color:wType===t.v?'#2E7D52':'#A89880', marginTop:2 }}>{t.r}/day</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {status==='present' && !isDDB6 && (
            <CycleSelector selected={cycles} onChange={setCycles} rescueHours={rescue} onRescueHours={setRescue}/>
          )}

          {est && status==='present' && (
            <div style={{ background:'linear-gradient(135deg,#ECFDF5,#F0FDF4)', border:'1px solid #A7F3D0', borderRadius:12, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:11, color:'#2E7D52', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>Estimated Earnings</div>
                <div style={{ fontSize:11, color:'#A89880', marginTop:1 }}>{isDDB6?'Daily rate':`${total}h × AED ${rate}/hr`}</div>
              </div>
              <div style={{ fontSize:22, fontWeight:900, color:'#2E7D52', letterSpacing:'-0.03em' }}>AED {est}</div>
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
          <h3 style={{fontWeight:800,fontSize:16,color:'#1A1612'}}>{ann?'Edit':'New'} Announcement</h3>
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
          <h3 style={{fontWeight:800,fontSize:16,color:'#1A1612'}}>{vehicle?'Edit':'Add'} Vehicle</h3>
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
      const res=await fetch(`${API}/api/deliveries`,{method:'POST',headers:hdr(),body:JSON.stringify({...form,station_code:station,date,total:parseInt(form.total),attempted:parseInt(form.attempted)||0,successful:parseInt(form.successful)||0,returned:parseInt(form.returned)||0})})
      if (!res.ok) throw new Error((await res.json()).error)
      onSave()
    } catch(e){alert(e.message)} finally{setSaving(false)}
  }
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:400}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <div>
            <h3 style={{fontWeight:800,fontSize:16,color:'#1A1612'}}>{existing?'Edit':'Log'} Deliveries</h3>
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

// ── Main ──────────────────────────────────────────────────────
export default function POCPage() {
  const { user }  = useAuth()
  const station   = user?.station_code || 'DDB7'
  const [tab,     setTab]     = useState('attendance')
  const [date,    setDate]    = useState(new Date().toISOString().slice(0,10))
  const [att,     setAtt]     = useState([])
  const [emps,    setEmps]    = useState([])
  const [vehs,    setVehs]    = useState([])
  const [asgns,   setAsgns]   = useState([])
  const [anns,    setAnns]    = useState([])
  const [leaves,  setLeaves]  = useState([])
  const [delivs,  setDelivs]  = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)
  const [search,  setSearch]  = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const h = { headers:{ Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }
      const [a,e,an,lv,v,asgn,d] = await Promise.all([
        fetch(`${API}/api/attendance?date=${date}`,h).then(r=>r.json()),
        fetch(`${API}/api/employees?station_code=${station}`,h).then(r=>r.json()),
        fetch(`${API}/api/poc/announcements`,h).then(r=>r.json()),
        fetch(`${API}/api/leaves`,h).then(r=>r.json()),
        fetch(`${API}/api/vehicles?station_code=${station}`,h).then(r=>r.json()),
        fetch(`${API}/api/vehicles/assignments?date=${date}&station_code=${station}`,h).then(r=>r.json()),
        fetch(`${API}/api/deliveries?station=${station}`,h).then(r=>r.json()),
      ])
      setAtt(a.attendance||[]);setEmps(e.employees||[]);setAnns(an.announcements||[])
      setLeaves(lv.leaves||[]);setVehs(v.vehicles||[]);setAsgns(asgn.assignments||[])
      setDelivs(d.deliveries||[])
    } catch(e){console.error(e)} finally{setLoading(false)}
  },[date,station])

  useEffect(()=>{load()},[load])

  async function handleLeave(id,status) {
    await fetch(`${API}/api/leaves/${id}/poc`,{method:'PATCH',headers:hdr(),body:JSON.stringify({status})})
    load()
  }
  async function deleteAtt(id) {
    if (!confirm('Remove this attendance record?')) return
    await fetch(`${API}/api/attendance/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${localStorage.getItem('gcd_token')}`}})
    load()
  }
  async function deleteAnn(id) {
    if (!confirm('Delete announcement?')) return
    await fetch(`${API}/api/poc/announcements/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${localStorage.getItem('gcd_token')}`}})
    load()
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
  const pending  = leaves.length

  const filtEmp  = emps.filter(e=>!search||e.name.toLowerCase().includes(search.toLowerCase())||e.id.toLowerCase().includes(search.toLowerCase()))

  const TABS = [
    {id:'attendance',label:'Attendance',icon:Users,    count:present},
    {id:'fleet',     label:'Fleet',     icon:Truck,    count:active},
    {id:'deliveries',label:'Deliveries',icon:Package,  count:null},
    {id:'leaves',    label:'Leaves',    icon:Calendar, count:pending||null},
    {id:'notices',   label:'Notices',   icon:Bell,     count:anns.length||null},
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
          </div>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)}
            style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:10,padding:'7px 10px',color:'white',fontSize:12,outline:'none',cursor:'pointer'}}/>
        </div>
        {/* Stats row */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,position:'relative'}}>
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
          <div style={{display:'flex',gap:10}}>
            <div className="search-wrap" style={{flex:1}}>
              <Search className="search-icon" size={13}/>
              <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search driver…" style={{borderRadius:20}}/>
            </div>
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
                    <div style={{fontWeight:700,fontSize:14,color:'#1A1612'}}>{emp.name}</div>
                    <div style={{fontSize:11,color:'#A89880',fontFamily:'monospace',marginTop:1}}>{emp.id}</div>
                  </div>
                  {/* Status */}
                  {a ? (
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',background:statusBg,borderRadius:20,marginBottom:4}}>
                        <div style={{width:6,height:6,borderRadius:'50%',background:statusColor}}/>
                        <span style={{fontSize:11,fontWeight:700,color:statusColor,textTransform:'capitalize'}}>{a.status}</span>
                      </div>
                      {hrs>0 && <div style={{fontSize:11,color:'#A89880',marginTop:2}}>{hrs}h · AED {parseFloat(a.earnings||0).toFixed(0)}</div>}
                    </div>
                  ) : (
                    <span style={{fontSize:11,color:'#C4B49A',background:'#F5F4F1',padding:'4px 10px',borderRadius:20,fontWeight:500}}>Not logged</span>
                  )}
                </div>
                {/* Cycles row */}
                {a?.cycles?.length>0 && (
                  <div style={{padding:'8px 16px',background:'#FAFAF8',borderTop:'1px solid #F5F4F1',display:'flex',gap:5,flexWrap:'wrap'}}>
                    {a.cycles.map(c=>(
                      <span key={c} style={{fontSize:11,fontWeight:700,color:'#B8860B',background:'#FDF6E3',border:'1px solid #F0D78C',borderRadius:6,padding:'2px 8px'}}>{c}</span>
                    ))}
                    {a.is_rescue && <span style={{fontSize:11,fontWeight:700,color:'#1D6FA4',background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:6,padding:'2px 8px'}}>🆘 Rescue</span>}
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
              <div key={v.id} style={{background:'#FFF',border:`1px solid ${isDown?'#FCA5A5':'#EAE6DE'}`,borderRadius:16,overflow:'hidden'}}>
                <div style={{padding:'14px 16px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:42,height:42,borderRadius:12,background:sb,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <Truck size={20} color={sc}/>
                      </div>
                      <div>
                        <div style={{fontWeight:800,fontSize:15,color:'#1A1612',letterSpacing:'0.04em'}}>{v.plate}</div>
                        <div style={{fontSize:12,color:'#A89880',marginTop:1}}>{[v.make,v.model,v.year].filter(Boolean).join(' ')||'Vehicle'}</div>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <span style={{fontSize:11,fontWeight:700,color:sc,background:sb,padding:'3px 10px',borderRadius:20}}>{v.status}</span>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setModal({type:'vehicle-edit',vehicle:v})}><Pencil size={13}/></button>
                    </div>
                  </div>
                  {isDown&&v.grounded_reason&&(
                    <div style={{background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:10,padding:'8px 12px',fontSize:12,color:'#C0392B',marginBottom:10,display:'flex',gap:6,alignItems:'flex-start'}}>
                      <AlertTriangle size={13} style={{flexShrink:0,marginTop:1}}/> {v.grounded_reason}{v.grounded_since?` · since ${v.grounded_since.slice(0,10)}`:''}
                    </div>
                  )}
                  <div>
                    <label className="input-label" style={{marginBottom:6}}>Assigned Driver — {date}</label>
                    <DriverSearch employees={emps} value={asgn?.emp_id||''} onChange={eId=>assignVehicle(v.id,eId)} placeholder="— Unassigned —"/>
                  </div>
                </div>
              </div>
            )
          })}
          {vehs.length===0&&<div style={{textAlign:'center',padding:50,color:'#A89880'}}>No vehicles yet — add one above</div>}
        </div>
      )}

      {/* ── DELIVERIES ── */}
      {!loading && tab==='deliveries' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',justifyContent:'flex-end'}}>
            <button className="btn btn-primary" onClick={()=>setModal('delivery')} style={{borderRadius:20}}><Plus size={14}/> Log Deliveries</button>
          </div>
          {delivs.length===0 ? (
            <div style={{textAlign:'center',padding:50,color:'#A89880'}}>
              <Package size={40} style={{margin:'0 auto 12px',opacity:0.3}}/>
              <div>No deliveries logged yet</div>
            </div>
          ) : delivs.map((d,i)=>(
            <div key={d.id} style={{background:'#FFF',border:'1px solid #EAE6DE',borderRadius:16,padding:'14px 16px',animation:`slideUp 0.3s ${i*0.05}s ease both`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                <div style={{fontWeight:700,fontSize:14,color:'#1A1612'}}>{d.date?.slice(0,10)}</div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setModal({type:'delivery-edit',delivery:d})}><Pencil size={13}/></button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                {[{l:'Total',v:d.total,c:'#1A1612'},{l:'Attempted',v:d.attempted,c:'#1D6FA4'},{l:'Successful',v:d.successful,c:'#2E7D52'},{l:'Returned',v:d.returned,c:'#C0392B'}].map(s=>(
                  <div key={s.l} style={{textAlign:'center',padding:'8px',background:'#FAFAF8',borderRadius:10}}>
                    <div style={{fontWeight:800,fontSize:18,color:s.c}}>{s.v||0}</div>
                    <div style={{fontSize:10,color:'#A89880',fontWeight:500,marginTop:1}}>{s.l}</div>
                  </div>
                ))}
              </div>
              {d.notes&&<div style={{fontSize:12,color:'#A89880',marginTop:8,padding:'8px 10px',background:'#FAFAF8',borderRadius:8}}>{d.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── LEAVES ── */}
      {!loading && tab==='leaves' && (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {leaves.length===0&&<div style={{textAlign:'center',padding:50,color:'#A89880'}}>No pending leave requests</div>}
          {leaves.map((l,i)=>(
            <div key={l.id} style={{background:'#FFF',border:'1px solid #EAE6DE',borderRadius:16,overflow:'hidden',animation:`slideUp 0.3s ${i*0.05}s ease both`}}>
              <div style={{padding:'14px 16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:20}}>{l.avatar||'👤'}</span>
                    <div>
                      <div style={{fontWeight:700,fontSize:14,color:'#1A1612'}}>{l.name}</div>
                      <div style={{fontSize:11,color:'#B8860B',fontWeight:600}}>{l.type} Leave</div>
                    </div>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,color:'#B45309',background:'#FFFBEB',border:'1px solid #FCD34D',padding:'3px 10px',borderRadius:20}}>Pending Review</span>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center',fontSize:12,color:'#6B5D4A',marginBottom:l.reason?8:0}}>
                  <Calendar size={12}/> {l.from_date} → {l.to_date} · <strong>{l.days} days</strong>
                </div>
                {l.reason&&<div style={{fontSize:12,color:'#A89880',padding:'7px 10px',background:'#FAFAF8',borderRadius:8}}>{l.reason}</div>}
              </div>
              <div style={{padding:'10px 14px',background:'#FAFAF8',borderTop:'1px solid #F5F4F1',display:'flex',gap:8}}>
                <button className="btn btn-success" style={{flex:1,justifyContent:'center',borderRadius:12}} onClick={()=>handleLeave(l.id,'approved')}><CheckCircle size={14}/> Approve</button>
                <button className="btn btn-danger"  style={{flex:1,justifyContent:'center',borderRadius:12}} onClick={()=>handleLeave(l.id,'rejected')}><XCircle size={14}/> Reject</button>
              </div>
            </div>
          ))}
        </div>
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
                  <div style={{fontWeight:700,fontSize:14,color:'#1A1612',flex:1,marginRight:8}}>{ann.title}</div>
                  <div style={{display:'flex',gap:4,flexShrink:0}}>
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
      {modal==='att'&&<AttModal employees={emps} station={station} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal?.type==='att-edit'&&<AttModal employees={emps} station={station} editRecord={modal.record} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal==='ann-add'&&<AnnModal onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal?.type==='ann-edit'&&<AnnModal ann={modal.ann} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal==='vehicle-add'&&<VehicleModal station={station} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal?.type==='vehicle-edit'&&<VehicleModal vehicle={modal.vehicle} station={station} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal==='delivery'&&<DeliveryModal date={date} station={station} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal?.type==='delivery-edit'&&<DeliveryModal date={date} station={station} existing={modal.delivery} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
    </div>
  )
}
