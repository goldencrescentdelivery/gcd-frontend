'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { API } from '@/lib/api'
import { useStation, hdr, POCHeader, VehicleCard, VehicleModal, VSTATUS_COLORS, VSTATUS_BG } from '../_components/poc-shared'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Truck, Plus, ArrowLeftRight, Check, X } from 'lucide-react'

const TODAY = () => new Date().toISOString().slice(0, 10)

export default function FleetPage() {
  const { user } = useAuth()
  const { station, setStation, canSwitch } = useStation(user)
  const [date,           setDate]          = useState(TODAY())
  const [vehs,           setVehs]          = useState([])
  const [asgns,          setAsgns]         = useState([])
  const [emps,           setEmps]          = useState([])
  const [currentHVs,     setCurrentHVs]    = useState([])
  const [loading,        setLoading]       = useState(true)
  const [modal,          setModal]         = useState(null)
  const [confirmDlg,     setConfirmDlg]    = useState(null)
  const [filterStatus,       setFilterStatus]      = useState('all')
  const [pendingVerifications, setPendingVerifications] = useState([])
  const [verifying,          setVerifying]         = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const h = { headers: { Authorization: `Bearer ${localStorage.getItem('gcd_token')}` } }
    try {
      const [v, a, e, hv, pv] = await Promise.all([
        fetch(`${API}/api/vehicles`, h).then(r => r.json()),
        fetch(`${API}/api/vehicles/assignments?date=${date}`, h).then(r => r.json()),
        fetch(`${API}/api/employees`, h).then(r => r.json()),
        fetch(`${API}/api/handovers/current`, h).then(r => r.ok ? r.json() : { current:[] }),
        fetch(`${API}/api/handovers?status=poc_pending`, h).then(r => r.ok ? r.json() : { handovers:[] }),
      ])
      setVehs(v.vehicles||[])
      setAsgns(a.assignments||[])
      setEmps(e.employees||[])
      setCurrentHVs(hv.current||[])
      setPendingVerifications((pv.handovers||[]).filter(h => h.status === 'poc_pending' && h.type === 'returned'))
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [date, station])

  useEffect(() => { load() }, [load])

  async function assignVehicle(vId, eId) {
    try {
      const res = await fetch(`${API}/api/vehicles/assignments`, {
        method:'POST', headers:hdr(),
        body:JSON.stringify({ vehicle_id:vId, emp_id:eId||null, date, station_code:station })
      })
      if (!res.ok) { alert((await res.json()).error||'Failed'); return }
      load()
    } catch { alert('Failed to assign vehicle') }
  }

  async function pocVerify(id, action) {
    setVerifying(id)
    try {
      const res = await fetch(`${API}/api/handovers/${id}/poc-verify`, {
        method: 'PATCH', headers: { ...hdr(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      if (!res.ok) { alert((await res.json()).error || 'Failed'); return }
      load()
    } catch { alert('Failed to verify handover') } finally { setVerifying(null) }
  }

  const active   = vehs.filter(v => v.status==='active').length
  const grounded = vehs.filter(v => v.status!=='active').length
  const inUse    = currentHVs.length

  const displayVehs = vehs.filter(v => {
    if (filterStatus === 'active')   return v.status === 'active'
    if (filterStatus === 'down')     return v.status !== 'active'
    if (filterStatus === 'inuse')    return currentHVs.some(h => String(h.vehicle_id)===String(v.id))
    return true
  })

  const FILTERS = [
    { id:'all',    label:'All',      count:vehs.length },
    { id:'active', label:'Active',   count:active   },
    { id:'down',   label:'Down',     count:grounded },
    { id:'inuse',  label:'In Use',   count:inUse    },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, animation:'slideUp 0.3s ease' }}>
      <style>{`
        .fleet-stats { display:flex; align-items:center; gap:10; flex-wrap:wrap; }
        .fleet-stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; flex:1; min-width:0; }
        .fleet-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:14px; }
        .fleet-filters { display:flex; gap:4px; overflow-x:auto; }
        @media(max-width:640px){
          .fleet-stat-grid { grid-template-columns:repeat(2,1fr); }
          .fleet-grid { grid-template-columns:1fr !important; }
          .fleet-filters button { font-size:11px !important; padding:6px 6px !important; }
        }
        @media(max-width:900px) and (min-width:641px){
          .fleet-grid { grid-template-columns:repeat(2,1fr) !important; }
        }
      `}</style>
      <POCHeader
        title="Fleet" icon={Truck} color="#3B82F6"
        station={station} onStationChange={setStation} canSwitch={canSwitch}
        date={date} onDateChange={setDate}
        subtitle="Vehicle status, assignments & handover history"
      />

      {/* Stats + Add */}
      <div className="fleet-stats">
        <div className="fleet-stat-grid">
          {[
            { l:'Active',  v:active,            c:'#10B981', bg:'#ECFDF5', bc:'#A7F3D0' },
            { l:'Down',    v:grounded,           c:'#EF4444', bg:'#FEF2F2', bc:'#FCA5A5' },
            { l:'In Use',  v:inUse,              c:'#3B82F6', bg:'#EFF6FF', bc:'#BFDBFE' },
            { l:'Total',   v:vehs.length, c:'#6366F1', bg:'#EEF2FF', bc:'#C7D2FE' },
          ].map(s => (
            <div key={s.l} style={{ background:s.bg, border:`1px solid ${s.bc}`, borderRadius:12, padding:'10px', textAlign:'center' }}>
              <div style={{ fontWeight:900, fontSize:20, color:s.c, lineHeight:1 }}>{s.v}</div>
              <div style={{ fontSize:9.5, color:s.c, fontWeight:600, marginTop:3, textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.l}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setModal('vehicle-add')} style={{ borderRadius:20, flexShrink:0, whiteSpace:'nowrap' }}>
          <Plus size={14}/> Add Vehicle
        </button>
      </div>

      {/* Filter tabs */}
      <div className="fleet-filters" style={{ background:'var(--bg-alt)', borderRadius:14, padding:3 }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilterStatus(f.id)}
            style={{ flex:'1 0 auto', padding:'8px 10px', borderRadius:11, border:'none', cursor:'pointer', fontWeight:filterStatus===f.id?700:500, fontSize:12, transition:'all 0.2s', background:filterStatus===f.id?'var(--card)':'transparent', color:filterStatus===f.id?'var(--text)':'var(--text-muted)', boxShadow:filterStatus===f.id?'0 1px 4px rgba(0,0,0,0.1)':'none', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:5, whiteSpace:'nowrap' }}>
            {f.label}
            <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:20, background:filterStatus===f.id?'#3B82F620':'var(--border)', color:filterStatus===f.id?'#3B82F6':'var(--text-muted)' }}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Pending Handover Verifications */}
      {pendingVerifications.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <ArrowLeftRight size={14} color="#7C3AED"/>
            <span style={{ fontSize:12, fontWeight:700, color:'#5B21B6', textTransform:'uppercase', letterSpacing:'0.05em' }}>
              Awaiting Your Verification ({pendingVerifications.length})
            </span>
          </div>
          {pendingVerifications.map(pv => (
            <div key={pv.id} style={{ background:'#F5F3FF', border:'1.5px solid #DDD6FE', borderRadius:16, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{ width:38, height:38, borderRadius:11, background:'#EDE9FE', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <ArrowLeftRight size={17} color="#7C3AED"/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:14, color:'#1A1612' }}>{pv.vehicle_plate || '—'}</div>
                  <div style={{ fontSize:11.5, color:'#6B7280', marginTop:1 }}>
                    From <strong style={{ color:'#374151' }}>{pv.emp_name}</strong>
                    {pv.receiver_name && <> → <strong style={{ color:'#374151' }}>{pv.receiver_name}</strong></>}
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#7C3AED', background:'#EDE9FE', borderRadius:20, padding:'2px 8px' }}>POC Pending</div>
                  <div style={{ fontSize:10.5, color:'#9CA3AF', marginTop:3 }}>
                    {new Date(pv.submitted_at).toLocaleDateString('en-AE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                  </div>
                </div>
              </div>

              {/* Photos row */}
              {[pv.photo_1, pv.photo_2, pv.photo_3, pv.photo_4].some(Boolean) && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:10 }}>
                  {[pv.photo_1, pv.photo_2, pv.photo_3, pv.photo_4].map((url, i) => (
                    url
                      ? <a key={i} href={url} target="_blank" rel="noreferrer" style={{ aspectRatio:'1', borderRadius:9, overflow:'hidden', display:'block', border:'1px solid #DDD6FE' }}>
                          <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                        </a>
                      : <div key={i} style={{ aspectRatio:'1', borderRadius:9, background:'#EDE9FE', border:'1px dashed #C4B5FD', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <span style={{ fontSize:9, color:'#A78BFA' }}>{['F','B','L','R'][i]}</span>
                        </div>
                  ))}
                </div>
              )}

              {/* Condition + fuel mini-row */}
              <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
                {pv.fuel_level && (
                  <span style={{ fontSize:11, fontWeight:600, color:'#5B21B6', background:'#EDE9FE', borderRadius:20, padding:'2px 9px' }}>
                    Fuel: {{ empty:'Empty', quarter:'1/4', half:'1/2', three_quarter:'3/4', full:'Full' }[pv.fuel_level] || pv.fuel_level}
                  </span>
                )}
                {pv.odometer && (
                  <span style={{ fontSize:11, fontWeight:600, color:'#5B21B6', background:'#EDE9FE', borderRadius:20, padding:'2px 9px' }}>
                    ODO: {Number(pv.odometer).toLocaleString()} km
                  </span>
                )}
                {pv.condition_note && (
                  <span style={{ fontSize:11, color:'#6B7280', fontStyle:'italic' }}>"{pv.condition_note}"</span>
                )}
              </div>

              <div style={{ display:'flex', gap:8 }}>
                <button
                  onClick={() => pocVerify(pv.id, 'reject')}
                  disabled={verifying === pv.id}
                  style={{ flex:1, padding:'10px', borderRadius:10, background:'#FEF2F2', border:'1.5px solid #FECACA', color:'#DC2626', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6, opacity:verifying===pv.id?0.6:1 }}>
                  <X size={14}/> Reject
                </button>
                <button
                  onClick={() => pocVerify(pv.id, 'approve')}
                  disabled={verifying === pv.id}
                  style={{ flex:2, padding:'10px', borderRadius:10, background:'linear-gradient(135deg,#2E7D52,#22C55E)', border:'none', color:'#FFF', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6, opacity:verifying===pv.id?0.6:1 }}>
                  {verifying === pv.id
                    ? <><span style={{ width:13, height:13, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Saving…</>
                    : <><Check size={14}/> Approve</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="fleet-grid">
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:280, borderRadius:20 }}/>)}
        </div>
      ) : displayVehs.length === 0 ? (
        <div style={{ textAlign:'center', padding:'50px 20px', color:'var(--text-muted)' }}>
          <Truck size={40} style={{ margin:'0 auto 12px', display:'block', opacity:0.15 }}/>
          <div style={{ fontSize:13, fontWeight:600 }}>{filterStatus==='all'?'No vehicles yet — add one above':'No vehicles match this filter'}</div>
        </div>
      ) : (
        <div className="fleet-grid">
          {displayVehs.map((v, i) => {
            const asgn    = asgns.find(a => String(a.vehicle_id)===String(v.id))
            const curHV   = currentHVs.find(h => String(h.vehicle_id)===String(v.id))
            const isDown  = v.status !== 'active'
            const sc      = VSTATUS_COLORS[v.status]||'#A89880'
            const sb      = VSTATUS_BG[v.status]||'#F5F4F1'
            return (
              <div key={v.id} style={{ animation:`slideUp 0.3s ${Math.min(i,10)*0.05}s ease both` }}>
                <VehicleCard
                  v={v} asgn={asgn} currentHandover={curHV}
                  isDown={isDown} sc={sc} sb={sb}
                  date={date} station={station} emps={emps} allAsgns={asgns}
                  onEdit={() => setModal({type:'vehicle-edit',vehicle:v})}
                  onDelete={() => setConfirmDlg({
                    title:'Delete vehicle?',
                    message:`Remove ${v.plate}${v.make?' ('+v.make+(v.model?' '+v.model:'')+')'  :''} permanently?`,
                    confirmLabel:'Delete', danger:true,
                    onConfirm: async () => {
                      setConfirmDlg(null)
                      await fetch(`${API}/api/vehicles/${v.id}`, { method:'DELETE', headers:hdr() })
                      load()
                    }
                  })}
                  onAssign={eId => assignVehicle(v.id, eId)}
                />
              </div>
            )
          })}
        </div>
      )}

      {modal==='vehicle-add' && <VehicleModal station={station} onClose={() => setModal(null)} onSave={() => { setModal(null); load() }}/>}
      {modal?.type==='vehicle-edit' && <VehicleModal vehicle={modal.vehicle} station={station} onClose={() => setModal(null)} onSave={() => { setModal(null); load() }}/>}
      <ConfirmDialog open={!!confirmDlg} title={confirmDlg?.title} message={confirmDlg?.message} confirmLabel={confirmDlg?.confirmLabel} danger={confirmDlg?.danger??true} onConfirm={confirmDlg?.onConfirm} onCancel={() => setConfirmDlg(null)}/>
    </div>
  )
}
