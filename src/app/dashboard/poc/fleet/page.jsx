'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { API } from '@/lib/api'
import { useStation, hdr, POCHeader, VehicleCard, VehicleModal, VSTATUS_COLORS, VSTATUS_BG } from '../_components/poc-shared'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Truck, Plus } from 'lucide-react'

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
  const [filterStatus,   setFilterStatus]  = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const h = { headers: { Authorization: `Bearer ${localStorage.getItem('gcd_token')}` } }
    try {
      const [v, a, e, hv] = await Promise.all([
        fetch(`${API}/api/vehicles?station_code=${station}`, h).then(r => r.json()),
        fetch(`${API}/api/vehicles/assignments?date=${date}&station_code=${station}`, h).then(r => r.json()),
        fetch(`${API}/api/employees`, h).then(r => r.json()),
        fetch(`${API}/api/handovers/current?station_code=${station}`, h).then(r => r.ok ? r.json() : { current:[] }),
      ])
      setVehs(v.vehicles||[])
      setAsgns(a.assignments||[])
      setEmps(e.employees||[])
      setCurrentHVs(hv.current||[])
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

  // Server already filters by station; keep a loose client filter as fallback
  const stationVehs = vehs.filter(v => !v.station_code || v.station_code === station)
  const active      = stationVehs.filter(v => v.status==='active').length
  const grounded    = stationVehs.filter(v => v.status!=='active').length
  const inUse       = currentHVs.length

  const displayVehs = stationVehs.filter(v => {
    if (filterStatus === 'active')   return v.status === 'active'
    if (filterStatus === 'down')     return v.status !== 'active'
    if (filterStatus === 'inuse')    return currentHVs.some(h => String(h.vehicle_id)===String(v.id))
    return true
  })

  const FILTERS = [
    { id:'all',    label:'All',      count:stationVehs.length },
    { id:'active', label:'Active',   count:active   },
    { id:'down',   label:'Down',     count:grounded },
    { id:'inuse',  label:'In Use',   count:inUse    },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, animation:'slideUp 0.3s ease' }}>
      <POCHeader
        title="Fleet" icon={Truck} color="#3B82F6"
        station={station} onStationChange={setStation} canSwitch={canSwitch}
        date={date} onDateChange={setDate}
        subtitle="Vehicle status, assignments & handover history"
      />

      {/* Stats + Add */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ display:'flex', gap:8, flex:1 }}>
          {[
            { l:'Active',  v:active,            c:'#10B981', bg:'#ECFDF5', bc:'#A7F3D0' },
            { l:'Down',    v:grounded,           c:'#EF4444', bg:'#FEF2F2', bc:'#FCA5A5' },
            { l:'In Use',  v:inUse,              c:'#3B82F6', bg:'#EFF6FF', bc:'#BFDBFE' },
            { l:'Total',   v:stationVehs.length, c:'#6366F1', bg:'#EEF2FF', bc:'#C7D2FE' },
          ].map(s => (
            <div key={s.l} style={{ background:s.bg, border:`1px solid ${s.bc}`, borderRadius:12, padding:'10px 10px', textAlign:'center', flex:1 }}>
              <div style={{ fontWeight:900, fontSize:20, color:s.c, lineHeight:1 }}>{s.v}</div>
              <div style={{ fontSize:9.5, color:s.c, fontWeight:600, marginTop:3, textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.l}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setModal('vehicle-add')} style={{ borderRadius:20, flexShrink:0 }}>
          <Plus size={14}/> Add Vehicle
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:4, background:'var(--bg-alt)', borderRadius:14, padding:3 }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilterStatus(f.id)}
            style={{ flex:1, padding:'8px 10px', borderRadius:11, border:'none', cursor:'pointer', fontWeight:filterStatus===f.id?700:500, fontSize:12, transition:'all 0.2s', background:filterStatus===f.id?'var(--card)':'transparent', color:filterStatus===f.id?'var(--text)':'var(--text-muted)', boxShadow:filterStatus===f.id?'0 1px 4px rgba(0,0,0,0.1)':'none', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            {f.label}
            <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:20, background:filterStatus===f.id?'#3B82F620':'var(--border)', color:filterStatus===f.id?'#3B82F6':'var(--text-muted)' }}>{f.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(380px,1fr))', gap:14 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:280, borderRadius:20 }}/>)}
        </div>
      ) : displayVehs.length === 0 ? (
        <div style={{ textAlign:'center', padding:'50px 20px', color:'var(--text-muted)' }}>
          <Truck size={40} style={{ margin:'0 auto 12px', display:'block', opacity:0.15 }}/>
          <div style={{ fontSize:13, fontWeight:600 }}>{filterStatus==='all'?'No vehicles yet — add one above':'No vehicles match this filter'}</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(380px,1fr))', gap:14 }}>
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
                  date={date} station={station} emps={emps}
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
