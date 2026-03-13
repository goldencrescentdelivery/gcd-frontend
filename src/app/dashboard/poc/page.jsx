'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { Plus, X, Pencil, Trash2, Truck, Users, Package, Bell, Calendar, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL
const CYCLES  = ['A','B','C','Beset','MR','FM','Rescue']
const CYCLE_H = { A:5, B:4, C:5, Beset:5, MR:4, FM:5 }
const VSTATUS = { active:'badge-success', grounded:'badge-danger', maintenance:'badge-warning', sold:'badge-muted' }

function hdr() { return { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }

// ── Announcement Modal ────────────────────────────────────────
function AnnouncementModal({ ann, onSave, onClose }) {
  const [title, setTitle] = useState(ann?.title||'')
  const [body,  setBody]  = useState(ann?.body||'')
  const [saving,setSaving]= useState(false)
  async function handleSave() {
    if (!title||!body) return
    setSaving(true)
    try {
      const url    = ann ? `${API}/api/poc/announcements/${ann.id}` : `${API}/api/poc/announcements`
      const method = ann ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers: hdr(), body: JSON.stringify({ title, body }) })
      if (!res.ok) throw new Error((await res.json()).error)
      onSave()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:440 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
          <h3 style={{ fontWeight:700,fontSize:16,color:'#1A1612' }}>{ann?'Edit Announcement':'New Announcement'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17}/></button>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          <div><label className="input-label">Title *</label>
            <input className="input" value={title} onChange={e=>setTitle(e.target.value)} autoComplete="off"/></div>
          <div><label className="input-label">Message *</label>
            <textarea className="input" rows={4} value={body} onChange={e=>setBody(e.target.value)} style={{ resize:'vertical' }}/></div>
        </div>
        <div style={{ display:'flex',gap:10,justifyContent:'flex-end',marginTop:16 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving||!title||!body}>{saving?'Saving…':ann?'Update':'Post'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Attendance Log Modal ──────────────────────────────────────
function AttModal({ employees, station, onSave, onClose }) {
  const [empId,   setEmpId]   = useState('')
  const [status,  setStatus]  = useState('present')
  const [cycle,   setCycle]   = useState('A')
  const [hours,   setHours]   = useState('5')
  const [isRescue,setIsRescue]= useState(false)
  const [wType,   setWType]   = useState('driver')
  const [note,    setNote]    = useState('')
  const [saving,  setSaving]  = useState(false)

  function onCycleChange(c) {
    setCycle(c); setIsRescue(c==='Rescue')
    if (c!=='Rescue') setHours(String(CYCLE_H[c]||''))
  }

  const isDDB6  = station === 'DDB6'
  const selEmp  = employees.find(e=>e.id===empId)
  const rate    = parseFloat(selEmp?.hourly_rate||3.85)
  const est     = isDDB6 ? (wType==='helper'?90:115) : (parseFloat(hours)||0)*rate

  async function handleSave() {
    if (!empId) return alert('Select a driver')
    setSaving(true)
    try {
      const body = { emp_id:empId, status, note,
        ...(isDDB6 ? { pay_type:'daily', worker_type:wType }
                   : { cycle, cycle_hours: isRescue?null:parseFloat(hours), is_rescue:isRescue }) }
      const res = await fetch(`${API}/api/attendance`, { method:'POST', headers:hdr(), body:JSON.stringify(body) })
      if (!res.ok) throw new Error((await res.json()).error)
      onSave()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:420 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18 }}>
          <h3 style={{ fontWeight:700,fontSize:16,color:'#1A1612' }}>Log Attendance — {station}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17}/></button>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          <div><label className="input-label">Driver *</label>
            <select className="input" value={empId} onChange={e=>setEmpId(e.target.value)}>
              <option value="">Select driver…</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
            </select></div>
          <div><label className="input-label">Status</label>
            <select className="input" value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="present">✅ Present</option>
              <option value="absent">❌ Absent</option>
              <option value="leave">🏖 On Leave</option>
            </select></div>

          {status==='present' && isDDB6 && (
            <div><label className="input-label">Worker Type</label>
              <div style={{ display:'flex',gap:8 }}>
                {['driver','helper'].map(t=>(
                  <button key={t} type="button" onClick={()=>setWType(t)}
                    style={{ flex:1,padding:'10px',borderRadius:9,border:`2px solid ${wType===t?'#B8860B':'#EAE6DE'}`,background:wType===t?'#FDF6E3':'#FFF',color:wType===t?'#B8860B':'#6B5D4A',fontWeight:600,cursor:'pointer' }}>
                    {t==='driver'?'🚗 Driver (AED 115)':'🔧 Helper (AED 90)'}
                  </button>
                ))}
              </div></div>
          )}

          {status==='present' && !isDDB6 && (
            <>
              <div><label className="input-label">Cycle</label>
                <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:5 }}>
                  {CYCLES.map(c=>(
                    <button key={c} type="button" onClick={()=>onCycleChange(c)}
                      style={{ padding:'7px 3px',borderRadius:8,border:`2px solid ${cycle===c?'#B8860B':'#EAE6DE'}`,background:cycle===c?'#FDF6E3':'#FFF',color:cycle===c?'#B8860B':'#6B5D4A',fontSize:11,fontWeight:600,cursor:'pointer',textAlign:'center' }}>
                      {c}<br/><span style={{ fontSize:9,fontWeight:400,color:'#A89880' }}>{c==='Rescue'?'—':`${CYCLE_H[c]}h`}</span>
                    </button>
                  ))}
                </div></div>
              {isRescue
                ? <div><label className="input-label">Rescue Hours</label>
                    <input className="input" type="number" step="0.25" value={hours} onChange={e=>setHours(e.target.value)}/></div>
                : <div><label className="input-label">Hours</label>
                    <input className="input" type="number" step="0.25" value={hours} onChange={e=>setHours(e.target.value)}/></div>
              }
            </>
          )}

          {status==='present' && (
            <div style={{ background:'#ECFDF5',border:'1px solid #A7F3D0',borderRadius:9,padding:'10px 14px',fontSize:13,color:'#2E7D52',fontWeight:600 }}>
              Est. earnings: AED {est.toFixed(2)}{isDDB6?' (daily rate)':` (${hours}h × ${rate}/hr)`}
            </div>
          )}
          <div><label className="input-label">Note</label>
            <input className="input" value={note} onChange={e=>setNote(e.target.value)}/></div>
        </div>
        <div style={{ display:'flex',gap:10,justifyContent:'flex-end',marginTop:18 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving||!empId}>{saving?'Saving…':'Log Attendance'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Vehicle Modal ─────────────────────────────────────────────
function VehicleModal({ vehicle, station, onSave, onClose }) {
  const [form, setForm] = useState({ plate:'', make:'', model:'', year:'', status:'active', grounded_reason:'', grounded_since:'', grounded_until:'', notes:'', ...vehicle })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  async function handleSave() {
    if (!form.plate) return alert('Plate number required')
    setSaving(true)
    try {
      const url    = vehicle ? `${API}/api/vehicles/${vehicle.id}` : `${API}/api/vehicles`
      const method = vehicle ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers:hdr(), body:JSON.stringify({...form,station_code:station}) })
      if (!res.ok) throw new Error((await res.json()).error)
      onSave()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:480 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18 }}>
          <h3 style={{ fontWeight:700,fontSize:16,color:'#1A1612' }}>{vehicle?'Edit Vehicle':'Add Vehicle'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17}/></button>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
          <div><label className="input-label">Plate No. *</label>
            <input className="input" value={form.plate} onChange={e=>set('plate',e.target.value.toUpperCase())} placeholder="e.g. DXB A 12345" autoComplete="off"/></div>
          <div><label className="input-label">Status</label>
            <select className="input" value={form.status} onChange={e=>set('status',e.target.value)}>
              <option value="active">Active</option>
              <option value="grounded">Grounded</option>
              <option value="maintenance">Maintenance</option>
              <option value="sold">Sold / Removed</option>
            </select></div>
          <div><label className="input-label">Make</label>
            <input className="input" value={form.make} onChange={e=>set('make',e.target.value)} placeholder="e.g. Toyota"/></div>
          <div><label className="input-label">Model</label>
            <input className="input" value={form.model} onChange={e=>set('model',e.target.value)} placeholder="e.g. Hiace"/></div>
          <div><label className="input-label">Year</label>
            <input className="input" type="number" value={form.year} onChange={e=>set('year',e.target.value)}/></div>
        </div>
        {(form.status==='grounded'||form.status==='maintenance') && (
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:12 }}>
            <div style={{ gridColumn:'span 2' }}><label className="input-label">Reason</label>
              <input className="input" value={form.grounded_reason} onChange={e=>set('grounded_reason',e.target.value)} placeholder="Why is it grounded?"/></div>
            <div><label className="input-label">Since</label>
              <input className="input" type="date" value={form.grounded_since?.slice(0,10)||''} onChange={e=>set('grounded_since',e.target.value)}/></div>
            <div><label className="input-label">Expected Until</label>
              <input className="input" type="date" value={form.grounded_until?.slice(0,10)||''} onChange={e=>set('grounded_until',e.target.value)}/></div>
          </div>
        )}
        <div style={{ marginTop:12 }}><label className="input-label">Notes</label>
          <input className="input" value={form.notes} onChange={e=>set('notes',e.target.value)}/></div>
        <div style={{ display:'flex',gap:10,justifyContent:'flex-end',marginTop:20 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':vehicle?'Save Changes':'Add Vehicle'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Main POC Page ─────────────────────────────────────────────
export default function POCPage() {
  const { user } = useAuth()
  const station  = user?.station_code || 'DDB7'

  const [tab,           setTab]           = useState('attendance')
  const [attendance,    setAttendance]    = useState([])
  const [employees,     setEmployees]     = useState([])
  const [vehicles,      setVehicles]      = useState([])
  const [assignments,   setAssignments]   = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [leaves,        setLeaves]        = useState([])
  const [loading,       setLoading]       = useState(true)
  const [date,          setDate]          = useState(new Date().toISOString().slice(0,10))
  const [modal,         setModal]         = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [att, emps, ann, lv, veh, asgn] = await Promise.all([
        fetch(`${API}/api/attendance?date=${date}`, { headers:hdr() }).then(r=>r.json()),
        fetch(`${API}/api/employees?station_code=${station}`, { headers:hdr() }).then(r=>r.json()),
        fetch(`${API}/api/poc/announcements`, { headers:hdr() }).then(r=>r.json()),
        fetch(`${API}/api/leaves?status=pending`, { headers:hdr() }).then(r=>r.json()),
        fetch(`${API}/api/vehicles?station_code=${station}`, { headers:hdr() }).then(r=>r.json()),
        fetch(`${API}/api/vehicles/assignments?date=${date}&station_code=${station}`, { headers:hdr() }).then(r=>r.json()),
      ])
      setAttendance(att.attendance||[])
      setEmployees(emps.employees||[])
      setAnnouncements(ann.announcements||[])
      setLeaves(lv.leaves||[])
      setVehicles(veh.vehicles||[])
      setAssignments(asgn.assignments||[])
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [date, station])

  useEffect(() => { load() }, [load])

  async function handleLeave(id, status) {
    await fetch(`${API}/api/leaves/${id}/status`, { method:'PATCH', headers:hdr(), body:JSON.stringify({ status }) })
    load()
  }
  async function deleteAnn(id) {
    if (!confirm('Delete this announcement?')) return
    await fetch(`${API}/api/poc/announcements/${id}`, { method:'DELETE', headers:hdr() })
    load()
  }
  async function assignVehicle(vehicleId, empId) {
    await fetch(`${API}/api/vehicles/assignments`, { method:'POST', headers:hdr(), body:JSON.stringify({ vehicle_id:vehicleId, emp_id:empId||null, date, station_code:station }) })
    load()
  }
  async function logDeliveries(total) {
    await fetch(`${API}/api/deliveries`, { method:'POST', headers:hdr(), body:JSON.stringify({ total:parseInt(total), date, station_code:station }) })
    load()
  }

  const present  = attendance.filter(a=>a.status==='present').length
  const absent   = attendance.filter(a=>a.status==='absent').length
  const active   = vehicles.filter(v=>v.status==='active').length
  const grounded = vehicles.filter(v=>v.status==='grounded'||v.status==='maintenance').length

  const TABS = [
    { id:'attendance', label:'Attendance', icon:Users  },
    { id:'fleet',      label:'Fleet',      icon:Truck  },
    { id:'deliveries', label:'Deliveries', icon:Package},
    { id:'leaves',     label:`Leaves ${leaves.length>0?`(${leaves.length})`:''}`, icon:Calendar },
    { id:'notices',    label:'Notices',    icon:Bell   },
  ]

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:14,animation:'slideUp 0.3s ease' }}>
      {/* Station header */}
      <div style={{ background:'linear-gradient(135deg,#FDF6E3,#FEF3D0)',border:'1px solid #F0D78C',borderRadius:14,padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10 }}>
        <div>
          <div style={{ fontWeight:800,fontSize:18,color:'#1A1612',letterSpacing:'-0.02em' }}>📍 {station} Station</div>
          <div style={{ fontSize:12,color:'#B8860B',marginTop:2 }}>{date} · {employees.length} DAs assigned</div>
        </div>
        <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
          <div style={{ background:'#ECFDF5',border:'1px solid #A7F3D0',borderRadius:9,padding:'6px 14px',textAlign:'center' }}>
            <div style={{ fontWeight:800,fontSize:18,color:'#2E7D52' }}>{present}</div>
            <div style={{ fontSize:10,color:'#2E7D52',fontWeight:600 }}>Present</div>
          </div>
          <div style={{ background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:9,padding:'6px 14px',textAlign:'center' }}>
            <div style={{ fontWeight:800,fontSize:18,color:'#C0392B' }}>{absent}</div>
            <div style={{ fontSize:10,color:'#C0392B',fontWeight:600 }}>Absent</div>
          </div>
          <div style={{ background:'#FDF6E3',border:'1px solid #F0D78C',borderRadius:9,padding:'6px 14px',textAlign:'center' }}>
            <div style={{ fontWeight:800,fontSize:18,color:'#B8860B' }}>{active}</div>
            <div style={{ fontSize:10,color:'#B8860B',fontWeight:600 }}>Vehicles</div>
          </div>
        </div>
      </div>

      {/* Date + tabs */}
      <div style={{ display:'flex',alignItems:'center',gap:10,flexWrap:'wrap' }}>
        <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ width:160 }}/>
        <div style={{ display:'flex',gap:6,flex:1,flexWrap:'wrap' }}>
          {TABS.map(t=>{
            const Icon = t.icon
            return (
              <button key={t.id} onClick={()=>setTab(t.id)}
                className={`btn btn-sm ${tab===t.id?'btn-primary':'btn-secondary'}`}
                style={{ display:'flex',alignItems:'center',gap:5 }}>
                <Icon size={13}/>{t.label}
              </button>
            )
          })}
        </div>
      </div>

      {loading && <div style={{ padding:40,textAlign:'center',color:'#A89880' }}>Loading…</div>}

      {/* ── ATTENDANCE TAB ── */}
      {!loading && tab==='attendance' && (
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          <div style={{ display:'flex',justifyContent:'flex-end' }}>
            <button className="btn btn-primary" onClick={()=>setModal('att')}><Plus size={14}/> Log Attendance</button>
          </div>
          <div className="card" style={{ padding:0,overflow:'hidden' }}>
            <table className="data-table">
              <thead><tr><th>Driver</th><th>Status</th><th>Cycle</th><th>Hours</th><th>Earnings</th></tr></thead>
              <tbody>
                {employees.map(emp => {
                  const att = attendance.find(a=>a.emp_id===emp.id)
                  return (
                    <tr key={emp.id}>
                      <td>
                        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                          <span style={{ fontSize:16 }}>{emp.avatar}</span>
                          <div>
                            <div style={{ fontWeight:600,color:'#1A1612',fontSize:13 }}>{emp.name}</div>
                            <div style={{ fontSize:10,color:'#C4B49A',fontFamily:'monospace' }}>{emp.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>{att
                        ? <span className={`badge ${att.status==='present'?'badge-success':att.status==='absent'?'badge-danger':'badge-warning'}`}>{att.status}</span>
                        : <span className="badge badge-muted">Not logged</span>}
                      </td>
                      <td style={{ fontWeight:600,color:'#6B5D4A',fontSize:12 }}>
                        {att?.cycle||( att?.pay_type==='daily'?'Daily':'')||'—'}
                        {att?.is_rescue?' 🆘':''}
                      </td>
                      <td style={{ fontFamily:'monospace',fontSize:12 }}>
                        {att?.pay_type==='daily'?`${att?.worker_type||'driver'}`:att?.cycle_hours?`${att.cycle_hours}h`:'—'}
                      </td>
                      <td style={{ fontFamily:'monospace',fontWeight:700,color:'#2E7D52',fontSize:12 }}>
                        {att?.earnings?`AED ${parseFloat(att.earnings).toFixed(2)}`:'—'}
                      </td>
                    </tr>
                  )
                })}
                {employees.length===0 && <tr><td colSpan={5} style={{ textAlign:'center',padding:30,color:'#A89880' }}>No DAs assigned to {station}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── FLEET TAB ── */}
      {!loading && tab==='fleet' && (
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <div style={{ fontSize:13,color:'#6B5D4A' }}>
              <span style={{ fontWeight:700,color:'#2E7D52' }}>{active} active</span>
              {grounded>0 && <span style={{ fontWeight:700,color:'#C0392B',marginLeft:12 }}>{grounded} grounded/maintenance</span>}
            </div>
            <button className="btn btn-primary" onClick={()=>setModal('vehicle-add')}><Plus size={14}/> Add Vehicle</button>
          </div>

          {/* Fleet grid */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12 }}>
            {vehicles.map(v => {
              const asgn   = assignments.find(a=>a.vehicle_id===v.id)
              const isDown = v.status!=='active'
              return (
                <div key={v.id} style={{ background:'#FFF',border:`1px solid ${isDown?'#FCA5A5':'#EAE6DE'}`,borderRadius:14,padding:16,opacity:isDown?0.85:1 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10 }}>
                    <div>
                      <div style={{ fontWeight:800,fontSize:16,color:'#1A1612',letterSpacing:'0.05em' }}>{v.plate}</div>
                      <div style={{ fontSize:12,color:'#A89880',marginTop:1 }}>{v.make} {v.model} {v.year?`(${v.year})`:''}</div>
                    </div>
                    <div style={{ display:'flex',gap:5,alignItems:'center' }}>
                      <span className={`badge ${VSTATUS[v.status]||'badge-muted'}`}>{v.status}</span>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setModal({type:'vehicle-edit',vehicle:v})}><Pencil size={12}/></button>
                    </div>
                  </div>
                  {isDown && v.grounded_reason && (
                    <div style={{ background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:8,padding:'7px 10px',fontSize:12,color:'#C0392B',marginBottom:10 }}>
                      ⚠️ {v.grounded_reason}{v.grounded_since?` (since ${v.grounded_since.slice(0,10)})`:''}{v.grounded_until?` — est. fix: ${v.grounded_until.slice(0,10)}`:''}
                    </div>
                  )}
                  {/* Driver assignment */}
                  <div style={{ borderTop:'1px solid #F5F4F1',paddingTop:10 }}>
                    <label className="input-label" style={{ marginBottom:5 }}>Assigned Driver — {date}</label>
                    <select className="input" value={asgn?.emp_id||''} onChange={e=>assignVehicle(v.id, e.target.value)}
                      disabled={isDown}>
                      <option value="">— Unassigned —</option>
                      {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    {asgn?.driver_name && !isDown && (
                      <div style={{ fontSize:11,color:'#2E7D52',marginTop:5,fontWeight:600 }}>✓ {asgn.driver_name}</div>
                    )}
                  </div>
                </div>
              )
            })}
            {vehicles.length===0 && (
              <div style={{ gridColumn:'span 3',textAlign:'center',padding:50,color:'#A89880' }}>
                No vehicles for {station} yet — click "Add Vehicle" to get started
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DELIVERIES TAB ── */}
      {!loading && tab==='deliveries' && (
        <div className="card" style={{ maxWidth:420 }}>
          <div style={{ fontWeight:700,fontSize:15,color:'#1A1612',marginBottom:16 }}>Log Deliveries — {date}</div>
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            <div><label className="input-label">Total Deliveries *</label>
              <input className="input" type="number" id="del-total" placeholder="e.g. 120"/></div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
              <div><label className="input-label">Attempted</label>
                <input className="input" type="number" id="del-att" placeholder="0"/></div>
              <div><label className="input-label">Successful</label>
                <input className="input" type="number" id="del-suc" placeholder="0"/></div>
            </div>
            <div><label className="input-label">Returned</label>
              <input className="input" type="number" id="del-ret" placeholder="0"/></div>
            <button className="btn btn-primary" onClick={()=>{
              const total = document.getElementById('del-total').value
              if (!total) return alert('Enter total deliveries')
              logDeliveries(total).then(()=>alert('Deliveries logged!')).catch(e=>alert(e.message))
            }}>Submit Deliveries</button>
          </div>
        </div>
      )}

      {/* ── LEAVES TAB ── */}
      {!loading && tab==='leaves' && (
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {leaves.length===0 && <div style={{ textAlign:'center',padding:40,color:'#A89880' }}>No pending leave requests</div>}
          {leaves.map((l,i) => (
            <div key={l.id} style={{ background:'#FFF',border:'1px solid #EAE6DE',borderRadius:12,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',animation:`slideUp 0.3s ${i*0.05}s ease both` }}>
              <div>
                <div style={{ fontWeight:700,fontSize:14,color:'#1A1612',display:'flex',alignItems:'center',gap:8 }}>
                  {l.avatar} {l.name}
                  <span className="badge badge-warning">{l.type}</span>
                </div>
                <div style={{ fontSize:12,color:'#A89880',marginTop:3 }}>{l.from_date} → {l.to_date} · {l.days} days</div>
                {l.reason && <div style={{ fontSize:12,color:'#6B5D4A',marginTop:3 }}>{l.reason}</div>}
              </div>
              <div style={{ display:'flex',gap:8,flexShrink:0 }}>
                <button className="btn btn-success btn-sm" onClick={()=>handleLeave(l.id,'approved')}><CheckCircle size={13}/> Approve</button>
                <button className="btn btn-danger btn-sm"  onClick={()=>handleLeave(l.id,'rejected')}><XCircle size={13}/> Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── NOTICES TAB ── */}
      {!loading && tab==='notices' && (
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          <div style={{ display:'flex',justifyContent:'flex-end' }}>
            <button className="btn btn-primary" onClick={()=>setModal('ann-add')}><Plus size={14}/> New Announcement</button>
          </div>
          {announcements.length===0 && <div style={{ textAlign:'center',padding:40,color:'#A89880' }}>No announcements yet</div>}
          {announcements.map((ann,i) => (
            <div key={ann.id} style={{ background:'#FFF',border:'1px solid #EAE6DE',borderRadius:12,padding:'14px 18px',animation:`slideUp 0.3s ${i*0.06}s ease both` }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
                <div style={{ fontWeight:700,fontSize:14,color:'#1A1612',flex:1,marginRight:10 }}>{ann.title}</div>
                <div style={{ display:'flex',gap:5,flexShrink:0 }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setModal({type:'ann-edit',ann})}><Pencil size={13}/></button>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color:'#C0392B' }} onClick={()=>deleteAnn(ann.id)}><Trash2 size={13}/></button>
                </div>
              </div>
              <div style={{ fontSize:13,color:'#6B5D4A',lineHeight:1.6,marginTop:6 }}>{ann.body}</div>
              <div style={{ fontSize:11,color:'#C4B49A',marginTop:8 }}>{new Date(ann.created_at).toLocaleString('en-AE',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {modal==='att'        && <AttModal employees={employees} station={station} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal==='ann-add'    && <AnnouncementModal onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal?.type==='ann-edit'    && <AnnouncementModal ann={modal.ann} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal==='vehicle-add'       && <VehicleModal station={station} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal?.type==='vehicle-edit' && <VehicleModal vehicle={modal.vehicle} station={station} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
    </div>
  )
}
