'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Camera, Upload, Check, Car, Fuel, FileText, User } from 'lucide-react'

const _raw = process.env.NEXT_PUBLIC_API_URL
const API = _raw && !_raw.startsWith("http") ? `https://${_raw}` : (_raw || "http://localhost:4000")

const FUEL_LEVELS = [
  { v:'empty',          l:'Empty',    pct:0   },
  { v:'quarter',        l:'1/4',      pct:25  },
  { v:'half',           l:'1/2',      pct:50  },
  { v:'three_quarter',  l:'3/4',      pct:75  },
  { v:'full',           l:'Full',     pct:100 },
]

function PhotoSlot({ index, file, onSelect, onRemove }) {
  const ref = useRef(null)
  const url = file ? URL.createObjectURL(file) : null

  return (
    <div style={{ position:'relative', aspectRatio:'1', borderRadius:12, overflow:'hidden', border:`2px dashed ${file?'#B8860B':'#EAE6DE'}`, background:file?'#000':'#FAFAF8', cursor:'pointer' }}
      onClick={()=>!file && ref.current?.click()}>
      <input ref={ref} type="file" accept="image/*" capture="environment" style={{ display:'none' }}
        onChange={e=>{ if(e.target.files[0]) onSelect(index, e.target.files[0]) }}/>
      {file ? (
        <>
          <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          <button onClick={e=>{ e.stopPropagation(); onRemove(index) }}
            style={{ position:'absolute', top:4, right:4, width:22, height:22, borderRadius:'50%', background:'rgba(0,0,0,0.7)', border:'none', color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>×</button>
        </>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:4 }}>
          <Camera size={22} color="#C4B49A"/>
          <span style={{ fontSize:10, color:'#C4B49A', fontWeight:600 }}>Photo {index+1}</span>
        </div>
      )}
    </div>
  )
}

export default function HandoverModal({ modal, user, onClose, onSave }) {
  const { type, vehicle } = modal
  const isReturn = type === 'returned'

  const [vehicles,   setVehicles]   = useState([])
  const [vehicleId,  setVehicleId]  = useState(vehicle?.vehicle_id || '')
  const [photos,     setPhotos]     = useState([null, null, null, null])
  const [fuel,       setFuel]       = useState('half')
  const [odometer,   setOdometer]   = useState('')
  const [note,       setNote]       = useState('')
  const [handoverTo, setHandoverTo] = useState('')
  const [saving,     setSaving]     = useState(false)
  const [err,        setErr]        = useState(null)
  const [done,       setDone]       = useState(false)

  // Load only available (unassigned) vehicles at DA's station for "received" type
  useEffect(() => {
    if (!isReturn) {
      const sc  = user?.station_code
      const hdr = { Authorization:`Bearer ${localStorage.getItem('gcd_token')}` }
      Promise.all([
        fetch(`${API}/api/vehicles${sc?`?station_code=${sc}`:''}`, { headers:hdr }).then(r=>r.json()),
        fetch(`${API}/api/handovers/current${sc?`?station_code=${sc}`:''}`, { headers:hdr }).then(r=>r.json()),
      ]).then(([vData, hData]) => {
        const assigned = new Set((hData.handovers||[]).map(h=>h.vehicle_id))
        setVehicles((vData.vehicles||[]).filter(v => v.status==='active' && !assigned.has(v.id)))
      }).catch(()=>{})
    }
  }, [isReturn, user])

  function setPhoto(i, file) { setPhotos(p => { const n=[...p]; n[i]=file; return n }) }
  function removePhoto(i)    { setPhotos(p => { const n=[...p]; n[i]=null; return n }) }

  async function handleSubmit() {
    if (!isReturn && !vehicleId) return setErr('Select a vehicle')
    setSaving(true); setErr(null)

    try {
      const fd = new FormData()
      fd.append('vehicle_id', isReturn ? vehicle.vehicle_id : vehicleId)
      fd.append('type', type)
      fd.append('fuel_level', fuel)
      fd.append('condition_note', note)
      if (odometer) fd.append('odometer', odometer)
      if (handoverTo) fd.append(isReturn ? 'handover_to' : 'handover_from', handoverTo)
      photos.filter(Boolean).forEach(f => fd.append('photos', f))

      const res = await fetch(`${API}/api/handovers`, {
        method: 'POST',
        headers: { Authorization:`Bearer ${localStorage.getItem('gcd_token')}` },
        body: fd
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(true)
      setTimeout(() => { onSave() }, 1500)
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  if (done) return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth:340, textAlign:'center', padding:'40px 30px' }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:'#ECFDF5', border:'2px solid #A7F3D0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <Check size={30} color="#2E7D52"/>
        </div>
        <div style={{ fontWeight:800, fontSize:18, color:'#1A1612', marginBottom:8 }}>
          {isReturn ? 'Vehicle Returned!' : 'Handover Recorded!'}
        </div>
        <div style={{ fontSize:13, color:'#A89880' }}>Record saved and accepted automatically</div>
      </div>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:480, padding:0, overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'20px 22px 16px', background:isReturn?'linear-gradient(135deg,#FEF2F2,#FFF9F9)':'linear-gradient(135deg,#ECFDF5,#F0FFF8)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <h3 style={{ fontWeight:900, fontSize:17, color:'#1A1612' }}>
                {isReturn ? '🔑 Return Vehicle' : '🚗 Receive Vehicle'}
              </h3>
              <p style={{ fontSize:12, color:'#A89880', marginTop:3 }}>
                {isReturn ? `Returning ${vehicle?.vehicle_plate}` : 'Document the vehicle you received'}
              </p>
            </div>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:9, background:'rgba(0,0,0,0.06)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14}/></button>
          </div>
        </div>

        <div style={{ padding:'16px 22px 20px', display:'flex', flexDirection:'column', gap:16, maxHeight:'65vh', overflowY:'auto' }}>
          {err && <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:9, padding:'10px 14px', fontSize:12.5, color:'#C0392B' }}>{err}</div>}

          {/* Vehicle selector (receive only) */}
          {!isReturn && (
            <div>
              <label className="input-label" style={{ display:'flex', alignItems:'center', gap:6 }}><Car size={12}/> Select Vehicle *</label>
              <select className="input" value={vehicleId} onChange={e=>setVehicleId(e.target.value)}>
                <option value="">— Choose vehicle —</option>
                {vehicles.map(v=>(
                  <option key={v.id} value={v.id}>{v.plate} {v.make} {v.model}</option>
                ))}
              </select>
            </div>
          )}

          {/* Photos — 4 slots */}
          <div>
            <label className="input-label" style={{ display:'flex', alignItems:'center', gap:6 }}><Camera size={12}/> Vehicle Photos (up to 4)</label>
            <p style={{ fontSize:11, color:'#A89880', marginBottom:10 }}>Take photos of front, back, sides to document condition</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              {photos.map((f,i) => (
                <PhotoSlot key={i} index={i} file={f} onSelect={setPhoto} onRemove={removePhoto}/>
              ))}
            </div>
          </div>

          {/* Fuel level */}
          <div>
            <label className="input-label" style={{ display:'flex', alignItems:'center', gap:6 }}><Fuel size={12}/> Fuel Level</label>
            <div style={{ display:'flex', gap:6 }}>
              {FUEL_LEVELS.map(f=>(
                <button key={f.v} onClick={()=>setFuel(f.v)} type="button"
                  style={{ flex:1, padding:'8px 4px', borderRadius:10, border:`2px solid ${fuel===f.v?'#B8860B':'#EAE6DE'}`, background:fuel===f.v?'#FDF6E3':'#FAFAF8', cursor:'pointer', textAlign:'center', transition:'all 0.18s', fontFamily:'Poppins,sans-serif' }}>
                  <div style={{ fontSize:10.5, fontWeight:700, color:fuel===f.v?'#B8860B':'#A89880' }}>{f.l}</div>
                </button>
              ))}
            </div>
            {/* Visual fuel bar */}
            <div style={{ marginTop:8, height:8, background:'#F0EDE6', borderRadius:10, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${FUEL_LEVELS.find(f=>f.v===fuel)?.pct||0}%`, background:'linear-gradient(90deg,#B8860B,#D4A017)', borderRadius:10, transition:'width 0.4s ease' }}/>
            </div>
          </div>

          {/* Odometer */}
          <div>
            <label className="input-label">Odometer Reading (km)</label>
            <input className="input" type="number" value={odometer} onChange={e=>setOdometer(e.target.value)} placeholder="e.g. 45230"/>
          </div>

          {/* Handover person */}
          <div>
            <label className="input-label" style={{ display:'flex', alignItems:'center', gap:6 }}>
              <User size={12}/> {isReturn ? 'Handed Over To' : 'Received From'}
            </label>
            <input className="input" value={handoverTo} onChange={e=>setHandoverTo(e.target.value)} placeholder={isReturn ? 'POC name / station' : 'POC name / station'}/>
          </div>

          {/* Condition note */}
          <div>
            <label className="input-label" style={{ display:'flex', alignItems:'center', gap:6 }}><FileText size={12}/> Condition Notes</label>
            <textarea className="input" rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="Any damage, issues, or notes about the vehicle condition…" style={{ resize:'vertical' }}/>
          </div>
        </div>

        <div style={{ padding:'14px 22px 20px', borderTop:'1px solid #EAE6DE', display:'flex', gap:10, background:'#FAFAF8' }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ flex:2, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px', borderRadius:10, background:isReturn?'linear-gradient(135deg,#C0392B,#E74C3C)':'linear-gradient(135deg,#2E7D52,#22C55E)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', opacity:saving?0.7:1 }}>
            {saving ? <><span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Saving…</> : isReturn ? 'Submit Return' : 'Submit Handover'}
          </button>
        </div>
      </div>
    </div>
  )
}