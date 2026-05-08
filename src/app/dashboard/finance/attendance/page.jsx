'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { API } from '@/lib/api'
import { Plus, X, Search, Clock } from 'lucide-react'

const STATUS_OPTIONS = [
  { v:'present', label:'Present', badge:'badge-success' },
  { v:'absent',  label:'Absent',  badge:'badge-danger'  },
  { v:'leave',   label:'Leave',   badge:'badge-warning' },
]

function LogModal({ employees, date, onSave, onClose }) {
  const [empId,  setEmpId]  = useState('')
  const [status, setStatus] = useState('present')
  const [note,   setNote]   = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!empId) return
    setSaving(true)
    try {
      const h = { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gcd_token')}` }
      const res = await fetch(`${API}/api/attendance`, {
        method: 'POST', headers: h,
        body: JSON.stringify({ emp_id: empId, status, note: note||null, date }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error||'Failed') }
      onSave()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:400 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ fontWeight:700, fontSize:16 }}>Log Attendance</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17}/></button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label className="input-label">Employee *</label>
            <select className="input" value={empId} onChange={e => setEmpId(e.target.value)}>
              <option value="">Select employee…</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name}{e.role ? ` (${e.role})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Status *</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {STATUS_OPTIONS.map(s => (
                <button key={s.v} type="button" onClick={() => setStatus(s.v)}
                  style={{ padding:'10px 6px', borderRadius:10, border:`2px solid ${status===s.v?'#B8860B':'#EAE6DE'}`, background:status===s.v?'#FDF6E3':'#FFF', color:status===s.v?'#B8860B':'#6B5D4A', fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="input-label">Note (optional)</label>
            <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Doctor's appointment"/>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:18 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !empId}>
            {saving ? 'Saving…' : 'Log'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StaffAttendancePage() {
  const [attendance,  setAttendance]  = useState([])
  const [employees,   setEmployees]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [date,        setDate]        = useState(new Date().toISOString().slice(0,10))
  const [modal,       setModal]       = useState(false)
  const [search,      setSearch]      = useState('')

  const h = { Authorization: `Bearer ${localStorage.getItem('gcd_token')}` }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [attRes, empRes] = await Promise.all([
        fetch(`${API}/api/attendance?date=${date}`, { headers: h }).then(r => r.json()),
        fetch(`${API}/api/employees`, { headers: h }).then(r => r.json()),
      ])
      // Only office/admin staff — exclude drivers and operations field workers
      const staff = (empRes.employees || []).filter(e =>
        e.status !== 'inactive' &&
        !['driver'].includes((e.role||'').toLowerCase()) &&
        !['operations','delivery'].includes((e.dept||'').toLowerCase())
      )
      setEmployees(staff)
      // Only show attendance for staff employees
      const staffIds = new Set(staff.map(e => e.id))
      setAttendance((attRes.attendance || []).filter(a => staffIds.has(a.emp_id)))
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [date])

  useEffect(() => { load() }, [load])

  const loggedIds = new Set(attendance.map(a => a.emp_id))
  const unlogged  = employees.filter(e => !loggedIds.has(e.id))
  const present   = attendance.filter(a => a.status === 'present').length
  const absent    = attendance.filter(a => a.status === 'absent').length
  const onLeave   = attendance.filter(a => a.status === 'leave').length

  const filtered = search.trim()
    ? attendance.filter(a => a.name?.toLowerCase().includes(search.toLowerCase()))
    : attendance

  async function deleteRecord(id) {
    if (!confirm('Remove this attendance record?')) return
    await fetch(`${API}/api/attendance/${id}`, { method:'DELETE', headers: h })
    load()
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, animation:'slideUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'16px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <Clock size={18} color="#B8860B"/>
          <h2 style={{ fontWeight:800, fontSize:17, margin:0 }}>Staff Attendance</h2>
        </div>
        <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>Office & admin staff only — no field drivers</p>
      </div>

      {/* Controls */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width:180 }}/>
        <div style={{ position:'relative', flex:'0 0 200px' }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
          <input className="input" placeholder="Search name…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft:30 }}/>
        </div>
        <div style={{ flex:1 }}/>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <Plus size={14}/> Log Attendance
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { l:'Present',  v:present,                     c:'#2E7D52', bg:'#ECFDF5', bc:'#A7F3D0' },
          { l:'Absent',   v:absent,                      c:'#C0392B', bg:'#FEF2F2', bc:'#FCA5A5' },
          { l:'On Leave', v:onLeave,                     c:'#B45309', bg:'#FFFBEB', bc:'#FCD34D' },
          { l:'Not Logged',v:unlogged.length,            c:'#6B7280', bg:'#F9FAFB', bc:'#E5E7EB' },
        ].map(s => (
          <div key={s.l} className="stat-card" style={{ textAlign:'center', background:s.bg, border:`1px solid ${s.bc}` }}>
            <div style={{ fontWeight:800, fontSize:24, color:s.c, letterSpacing:'-0.04em' }}>{s.v}</div>
            <div style={{ fontSize:11, color:s.c, fontWeight:600, marginTop:3 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Logged records */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:13 }}>
          Logged ({filtered.length})
        </div>
        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
            No records for {date}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th><th>Role</th><th>Status</th><th>Note</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(att => {
                  const st = STATUS_OPTIONS.find(s => s.v === att.status)
                  return (
                    <tr key={att.id}>
                      <td>
                        <div style={{ fontWeight:600, fontSize:13 }}>{att.name}</div>
                        <div style={{ fontSize:10, color:'var(--text-muted)' }}>{att.emp_id}</div>
                      </td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>{att.role || '—'}</td>
                      <td>
                        <span className={`badge ${st?.badge || 'badge-muted'}`}>{st?.label || att.status}</span>
                      </td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>{att.note || '—'}</td>
                      <td>
                        <button onClick={() => deleteRecord(att.id)}
                          style={{ padding:'4px 8px', borderRadius:6, border:'1px solid #FCA5A5', background:'#FEF2F2', color:'#EF4444', cursor:'pointer', fontSize:11 }}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Not yet logged */}
      {unlogged.length > 0 && (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:13, color:'var(--text-muted)' }}>
            Not Logged Yet ({unlogged.length})
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Employee</th><th>Role</th><th>Dept</th></tr></thead>
              <tbody>
                {unlogged.map(e => (
                  <tr key={e.id}>
                    <td>
                      <div style={{ fontWeight:600, fontSize:13 }}>{e.name}</div>
                      <div style={{ fontSize:10, color:'var(--text-muted)' }}>{e.id}</div>
                    </td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>{e.role || '—'}</td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>{e.dept || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && <LogModal employees={employees} date={date} onClose={() => setModal(false)} onSave={() => { setModal(false); load() }}/>}
    </div>
  )
}
