'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { API } from '@/lib/api'
import {
  useStation, hdr, POCHeader, AttModal, WorkNumModal, EmpDetailModal,
} from '../_components/poc-shared'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Clock, Plus, Search, CheckSquare, Pencil, Trash2 } from 'lucide-react'

const TODAY = () => new Date().toISOString().slice(0, 10)

export default function AttendancePage() {
  const { user } = useAuth()
  const { station, setStation, canSwitch } = useStation(user)
  const [date,        setDate]        = useState(TODAY())
  const [att,         setAtt]         = useState([])
  const [emps,        setEmps]        = useState([])
  const [sims,        setSims]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [modal,       setModal]       = useState(null)
  const [empDetail,   setEmpDetail]   = useState(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [confirmDlg,  setConfirmDlg]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const h = { headers: { Authorization: `Bearer ${localStorage.getItem('gcd_token')}` } }
    try {
      const [a, e, s] = await Promise.all([
        fetch(`${API}/api/attendance?date=${date}`, h).then(r => r.json()),
        fetch(`${API}/api/employees`, h).then(r => r.json()),
        fetch(`${API}/api/sims`, h).then(r => r.json()),
      ])
      setAtt(a.attendance||[])
      setEmps(e.employees||[])
      setSims(s.sims||[])
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [date])

  useEffect(() => { load() }, [load])
  useEffect(() => { setSearch('') }, [date])

  const stationEmps = emps.filter(e => e.station_code === station)
  const filtEmp     = stationEmps.filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase()))
  const present     = att.filter(a => a.status==='present').length
  const absent      = att.filter(a => a.status==='absent').length
  const earnings    = att.reduce((s,a) => s+parseFloat(a.earnings||0), 0)
  const loggedCount = filtEmp.filter(e => att.find(a => a.emp_id===e.id)).length

  function deleteAtt(id) {
    setConfirmDlg({
      title:'Remove attendance record?',
      message:'This will delete the attendance entry for this DA on the selected date.',
      confirmLabel:'Remove', danger:true,
      onConfirm: async () => {
        setConfirmDlg(null)
        await fetch(`${API}/api/attendance/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } })
        load()
      },
    })
  }

  function handleBulkPresent() {
    const unlogged = filtEmp.filter(e => !att.find(a => a.emp_id===e.id))
    if (unlogged.length===0) {
      setConfirmDlg({ title:'All DAs already logged', message:'Every DA already has a record for this date.', confirmLabel:'OK', cancelLabel:null, danger:false, onConfirm:()=>setConfirmDlg(null) })
      return
    }
    setConfirmDlg({
      title:`Mark ${unlogged.length} DA${unlogged.length!==1?'s':''} as Present?`,
      message:`Cycle A · 5 hours. Creates records for ${unlogged.length} unlogged DA${unlogged.length!==1?'s':''}.`,
      confirmLabel:'Mark Present', danger:false,
      onConfirm: async () => {
        setConfirmDlg(null); setBulkLoading(true)
        try {
          await fetch(`${API}/api/attendance/bulk`, {
            method:'POST', headers:hdr(),
            body:JSON.stringify({ records: unlogged.map(e => ({ emp_id:e.id, date, status:'present', cycle:'A', cycle_hours:'5' })) })
          })
          load()
        } catch { } finally { setBulkLoading(false) }
      },
    })
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, animation:'slideUp 0.3s ease' }}>
      <POCHeader
        title="Attendance" icon={Clock} color="#10B981"
        station={station} onStationChange={setStation} canSwitch={canSwitch}
        date={date} onDateChange={setDate}
        subtitle="Log daily attendance and duty cycles"
      />

      {/* Stats row */}
      {!loading && (
        <div className="four-kpi-grid" style={{ gap:8 }}>
          {[
            { l:'Present',    v:present,                c:'#10B981', bg:'#ECFDF5', bc:'#A7F3D0' },
            { l:'Absent',     v:absent,                 c:'#EF4444', bg:'#FEF2F2', bc:'#FCA5A5' },
            { l:'Total DAs',  v:stationEmps.length,     c:'#8B5CF6', bg:'#F5F3FF', bc:'#DDD6FE' },
            { l:'Earnings',   v:`AED ${earnings.toFixed(0)}`, c:'#B8860B', bg:'#FDF6E3', bc:'#F0D78C' },
          ].map(s => (
            <div key={s.l} style={{ background:s.bg, border:`1px solid ${s.bc}`, borderRadius:12, padding:'10px 8px', textAlign:'center' }}>
              <div style={{ fontWeight:900, fontSize:s.l==='Earnings'?13:20, color:s.c, letterSpacing:'-0.02em', lineHeight:1.2 }}>{s.v}</div>
              <div style={{ fontSize:9.5, color:s.c, opacity:0.7, fontWeight:600, marginTop:2, textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {/* Completion badge */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderRadius:12, background:'var(--card)', border:'1px solid var(--border)', flex:1, minWidth:180 }}>
          <div style={{ flex:1 }}>
            <span style={{ fontWeight:900, fontSize:16, color:loggedCount===filtEmp.length&&filtEmp.length>0?'#10B981':'#F59E0B' }}>{loggedCount}</span>
            <span style={{ color:'var(--text-muted)', fontSize:13 }}> / {filtEmp.length} logged today</span>
          </div>
          <div style={{ width:60, height:6, background:'var(--border)', borderRadius:20, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${filtEmp.length>0?Math.round(loggedCount/filtEmp.length*100):0}%`, background:'#10B981', borderRadius:20, transition:'width 0.5s ease' }}/>
          </div>
        </div>
        <div style={{ flex:'1 1 160px', position:'relative' }}>
          <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
          <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search driver…" style={{ paddingLeft:34, borderRadius:20 }}/>
        </div>
        <button className="btn btn-secondary" onClick={handleBulkPresent} disabled={bulkLoading} style={{ borderRadius:20, padding:'9px 14px', fontSize:12 }}>
          <CheckSquare size={13}/> {bulkLoading?'Marking…':'Mark All Present'}
        </button>
        <button className="btn btn-primary" onClick={() => setModal('att')} style={{ borderRadius:20, padding:'9px 16px' }}>
          <Plus size={14}/> Log
        </button>
      </div>

      {/* Employee list */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:72, borderRadius:14 }}/>)}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtEmp.map(emp => {
            const a = att.find(x => x.emp_id===emp.id)
            const hrs = a?.total_hours||a?.cycle_hours||0
            const statusColor = {present:'#10B981',absent:'#EF4444',leave:'#B45309'}[a?.status]||'var(--text-muted)'
            const statusBg    = {present:'#ECFDF5',absent:'#FEF2F2',leave:'#FFFBEB'}[a?.status]||'var(--bg-alt)'
            return (
              <div key={emp.id} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', transition:'box-shadow 0.2s' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px' }}>
                  <div onClick={() => setEmpDetail(emp)} style={{ display:'flex', alignItems:'center', gap:12, flex:1, minWidth:0, cursor:'pointer' }}>
                    <div style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(135deg,#FDF6E3,#FEF3D0)', border:'1px solid #F0D78C', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{emp.avatar||'👤'}</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>{emp.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{emp.id}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5, flexShrink:0 }}>
                    {a ? (
                      <>
                        <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', background:statusBg, borderRadius:20 }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', background:statusColor }}/>
                          <span style={{ fontSize:11, fontWeight:700, color:statusColor, textTransform:'capitalize' }}>{a.status}</span>
                        </div>
                        {hrs>0 && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{hrs}h · AED {parseFloat(a.earnings||0).toFixed(0)}</div>}
                      </>
                    ) : (
                      <span style={{ fontSize:11, color:'var(--text-muted)', background:'var(--bg-alt)', padding:'4px 10px', borderRadius:20, fontWeight:500 }}>Not logged</span>
                    )}
                    <button onClick={e => { e.stopPropagation(); setModal({type:'work-num',emp}) }}
                      style={{ fontSize:10, fontWeight:600, color:'#7C3AED', background:'var(--purple-bg)', border:'1px solid var(--purple-border)', borderRadius:20, padding:'2px 8px', cursor:'pointer', fontFamily:'inherit' }}>
                      📱 {emp.work_number||'Assign SIM'}
                    </button>
                  </div>
                </div>
                {(a?.cycle || a?.is_rescue) && (
                  <div style={{ padding:'8px 16px', background:'var(--bg-alt)', borderTop:'1px solid var(--border)', display:'flex', gap:5, flexWrap:'wrap' }}>
                    {a.cycle?.split(',').filter(Boolean).map(c => (
                      <span key={c} style={{ fontSize:11, fontWeight:700, color:'#B8860B', background:'#FDF6E3', border:'1px solid #F0D78C', borderRadius:6, padding:'2px 8px' }}>{c}</span>
                    ))}
                    {a.is_rescue && <span style={{ fontSize:11, fontWeight:700, color:'#1D6FA4', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:6, padding:'2px 8px' }}>🆘 {a.rescue_hours}h Rescue</span>}
                  </div>
                )}
                {a && (
                  <div style={{ padding:'8px 12px', background:'var(--bg-alt)', borderTop:'1px solid var(--border)', display:'flex', gap:6, justifyContent:'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setModal({type:'att-edit',record:{...a,name:emp.name,avatar:emp.avatar}})}><Pencil size={12}/> Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteAtt(a.id)}><Trash2 size={12}/> Remove</button>
                  </div>
                )}
              </div>
            )
          })}
          {filtEmp.length===0 && <div style={{ textAlign:'center', padding:50, color:'var(--text-muted)' }}>No DAs found for {station}</div>}
        </div>
      )}

      {/* Modals */}
      {modal==='att' && <AttModal employees={emps} station={station} date={date} onClose={() => setModal(null)} onSave={() => { setModal(null); load() }}/>}
      {modal?.type==='att-edit' && <AttModal employees={emps} station={station} date={date} editRecord={modal.record} onClose={() => setModal(null)} onSave={() => { setModal(null); load() }}/>}
      {modal?.type==='work-num' && <WorkNumModal emp={modal.emp} station={station} sims={sims} onClose={() => setModal(null)} onSave={() => { setModal(null); load() }}/>}
      {empDetail && <EmpDetailModal emp={empDetail} sims={sims} onClose={() => setEmpDetail(null)}/>}
      <ConfirmDialog open={!!confirmDlg} title={confirmDlg?.title} message={confirmDlg?.message} confirmLabel={confirmDlg?.confirmLabel} cancelLabel={confirmDlg?.cancelLabel??'Cancel'} danger={confirmDlg?.danger??true} onConfirm={confirmDlg?.onConfirm} onCancel={() => setConfirmDlg(null)}/>
    </div>
  )
}
