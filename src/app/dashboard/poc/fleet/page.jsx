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
  const [date,       setDate]      = useState(TODAY())
  const [vehs,       setVehs]      = useState([])
  const [asgns,      setAsgns]     = useState([])
  const [emps,       setEmps]      = useState([])
  const [loading,    setLoading]   = useState(true)
  const [modal,      setModal]     = useState(null)
  const [confirmDlg, setConfirmDlg]= useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const h = { headers: { Authorization: `Bearer ${localStorage.getItem('gcd_token')}` } }
    try {
      const [v, a, e] = await Promise.all([
        fetch(`${API}/api/vehicles`, h).then(r => r.json()),
        fetch(`${API}/api/vehicles/assignments?date=${date}&station_code=${station}`, h).then(r => r.json()),
        fetch(`${API}/api/employees`, h).then(r => r.json()),
      ])
      setVehs(v.vehicles||[])
      setAsgns(a.assignments||[])
      setEmps(e.employees||[])
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

  const active   = vehs.filter(v => v.status==='active').length
  const grounded = vehs.filter(v => v.status!=='active').length

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, animation:'slideUp 0.3s ease' }}>
      <POCHeader
        title="Fleet" icon={Truck} color="#3B82F6"
        station={station} onStationChange={setStation} canSwitch={canSwitch}
        date={date} onDateChange={setDate}
        subtitle="Vehicle status, assignments & history"
      />

      {/* Stats + Add */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ display:'flex', gap:8, flex:1 }}>
          {[
            { l:'Active',   v:active,         c:'#10B981', bg:'#ECFDF5', bc:'#A7F3D0' },
            { l:'Down',     v:grounded,        c:'#EF4444', bg:'#FEF2F2', bc:'#FCA5A5' },
            { l:'Total',    v:vehs.length,     c:'#3B82F6', bg:'#EFF6FF', bc:'#BFDBFE' },
          ].map(s => (
            <div key={s.l} style={{ background:s.bg, border:`1px solid ${s.bc}`, borderRadius:12, padding:'10px 16px', textAlign:'center', flex:1 }}>
              <div style={{ fontWeight:900, fontSize:20, color:s.c }}>{s.v}</div>
              <div style={{ fontSize:10, color:s.c, fontWeight:600, marginTop:2, textTransform:'uppercase' }}>{s.l}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setModal('vehicle-add')} style={{ borderRadius:20, flexShrink:0 }}>
          <Plus size={14}/> Add Vehicle
        </button>
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:180, borderRadius:18 }}/>)}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {vehs.map(v => {
            const asgn  = asgns.find(a => a.vehicle_id===v.id)
            const isDown= v.status!=='active'
            const sc    = VSTATUS_COLORS[v.status]||'#A89880'
            const sb    = VSTATUS_BG[v.status]||'#F5F4F1'
            return (
              <VehicleCard key={v.id} v={v} asgn={asgn} isDown={isDown} sc={sc} sb={sb}
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
            )
          })}
          {vehs.length===0 && <div style={{ textAlign:'center', padding:50, color:'var(--text-muted)' }}>No vehicles yet — add one above</div>}
        </div>
      )}

      {modal==='vehicle-add' && <VehicleModal station={station} onClose={() => setModal(null)} onSave={() => { setModal(null); load() }}/>}
      {modal?.type==='vehicle-edit' && <VehicleModal vehicle={modal.vehicle} station={station} onClose={() => setModal(null)} onSave={() => { setModal(null); load() }}/>}
      <ConfirmDialog open={!!confirmDlg} title={confirmDlg?.title} message={confirmDlg?.message} confirmLabel={confirmDlg?.confirmLabel} danger={confirmDlg?.danger??true} onConfirm={confirmDlg?.onConfirm} onCancel={() => setConfirmDlg(null)}/>
    </div>
  )
}
