'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { API } from '@/lib/api'
import { Plus, X, Search, Clock, UserCheck, UserX, CalendarOff, AlertCircle, Trash2, ChevronRight } from 'lucide-react'

const STATUS = [
  { v:'present', label:'Present', color:'#059669', bg:'#ECFDF5', border:'#6EE7B7', dot:'#10B981' },
  { v:'absent',  label:'Absent',  color:'#DC2626', bg:'#FEF2F2', border:'#FCA5A5', dot:'#EF4444' },
  { v:'leave',   label:'On Leave',color:'#D97706', bg:'#FFFBEB', border:'#FCD34D', dot:'#F59E0B' },
]

function Avatar({ name, size = 36 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??'
  const colors   = ['#B8860B','#0F766E','#7C3AED','#DC2626','#0369A1','#059669']
  const color    = colors[(name?.charCodeAt(0) || 0) % colors.length]
  return (
    <div style={{ width:size, height:size, borderRadius:size/2, background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.35, fontWeight:800, color:'#fff', flexShrink:0, letterSpacing:'-0.02em' }}>
      {initials}
    </div>
  )
}

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
        method:'POST', headers:h,
        body:JSON.stringify({ emp_id:empId, status, note:note||null, date }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error||'Failed') }
      onSave()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:420, borderRadius:20 }}>
        {/* Modal header */}
        <div style={{ background:'linear-gradient(135deg,#B8860B,#D4A017)', borderRadius:'16px 16px 0 0', padding:'18px 20px', margin:'-20px -20px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:800, fontSize:16, color:'#fff' }}>Log Attendance</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.75)', marginTop:2 }}>{date}</div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'1px solid rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}>
            <X size={15}/>
          </button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label className="input-label">Employee *</label>
            <select className="input" value={empId} onChange={e => setEmpId(e.target.value)}>
              <option value="">Select employee…</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name}{e.role ? ` — ${e.role}` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">Status *</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {STATUS.map(s => (
                <button key={s.v} type="button" onClick={() => setStatus(s.v)}
                  style={{ padding:'12px 6px', borderRadius:12, border:`2px solid ${status===s.v ? s.border : 'var(--border)'}`, background:status===s.v ? s.bg : 'var(--bg-alt)', color:status===s.v ? s.color : 'var(--text-muted)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <span style={{ width:8, height:8, borderRadius:4, background:status===s.v ? s.dot : 'var(--border)', display:'block', transition:'all 0.15s' }}/>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="input-label">Note (optional)</label>
            <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Doctor's appointment…"/>
          </div>
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !empId} style={{ minWidth:100 }}>
            {saving ? 'Saving…' : 'Log Attendance'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StaffAttendancePage() {
  const [attendance, setAttendance] = useState([])
  const [employees,  setEmployees]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [date,       setDate]       = useState(new Date().toISOString().slice(0,10))
  const [modal,      setModal]      = useState(false)
  const [search,     setSearch]     = useState('')

  const h = { Authorization:`Bearer ${localStorage.getItem('gcd_token')}` }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [attRes, empRes] = await Promise.all([
        fetch(`${API}/api/attendance?date=${date}`, { headers:h }).then(r => r.json()),
        fetch(`${API}/api/employees`, { headers:h }).then(r => r.json()),
      ])
      const staff = (empRes.employees || []).filter(e =>
        e.status !== 'inactive' &&
        !['driver'].includes((e.role||'').toLowerCase()) &&
        !['operations','delivery'].includes((e.dept||'').toLowerCase())
      )
      setEmployees(staff)
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
  const total     = employees.length

  const filtered = search.trim()
    ? attendance.filter(a => a.name?.toLowerCase().includes(search.toLowerCase()))
    : attendance

  async function deleteRecord(id) {
    if (!confirm('Remove this attendance record?')) return
    await fetch(`${API}/api/attendance/${id}`, { method:'DELETE', headers:h })
    load()
  }

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-AE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, animation:'slideUp 0.35s ease' }}>

      {/* ── Hero Header ── */}
      <div style={{ background:'linear-gradient(135deg,#1a1200 0%,#3d2a00 50%,#B8860B 100%)', borderRadius:20, padding:'24px 28px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-30, right:-30, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }}/>
        <div style={{ position:'absolute', bottom:-20, right:60, width:90, height:90, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }}/>
        <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:14 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <div style={{ width:38, height:38, borderRadius:12, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Clock size={20} color="#FFD700"/>
              </div>
              <h1 style={{ fontWeight:800, fontSize:22, color:'#fff', margin:0, letterSpacing:'-0.03em' }}>Staff Attendance</h1>
            </div>
            <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.6)', marginLeft:48 }}>{displayDate} · Office & admin staff only</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ padding:'9px 13px', borderRadius:10, border:'1px solid rgba(255,255,255,0.25)', background:'rgba(255,255,255,0.12)', color:'#fff', fontSize:13, fontFamily:'inherit', cursor:'pointer', outline:'none' }}/>
            <button onClick={() => setModal(true)}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:10, border:'none', background:'#B8860B', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
              <Plus size={15}/> Log Attendance
            </button>
          </div>
        </div>

        {/* Mini progress bar */}
        {total > 0 && (
          <div style={{ marginTop:18, marginLeft:0, position:'relative' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)', fontWeight:600 }}>LOGGED TODAY</span>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.7)', fontWeight:700 }}>{attendance.length}/{total}</span>
            </div>
            <div style={{ height:6, borderRadius:3, background:'rgba(255,255,255,0.1)', overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:3, background:'linear-gradient(90deg,#10B981,#34D399)', width:`${(attendance.length/total)*100}%`, transition:'width 0.5s ease' }}/>
            </div>
          </div>
        )}
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Present',    value:present,        icon:UserCheck,   color:'#059669', bg:'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border:'#A7F3D0' },
          { label:'Absent',     value:absent,         icon:UserX,       color:'#DC2626', bg:'linear-gradient(135deg,#FEF2F2,#FEE2E2)', border:'#FCA5A5' },
          { label:'On Leave',   value:onLeave,        icon:CalendarOff, color:'#D97706', bg:'linear-gradient(135deg,#FFFBEB,#FEF3C7)', border:'#FCD34D' },
          { label:'Not Logged', value:unlogged.length,icon:AlertCircle, color:'#6B7280', bg:'linear-gradient(135deg,#F9FAFB,#F3F4F6)', border:'#E5E7EB' },
        ].map(({ label, value, icon:Icon, color, bg, border }) => (
          <div key={label} style={{ background:bg, border:`1px solid ${border}`, borderRadius:16, padding:'18px 20px', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon size={20} color={color}/>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:28, color, letterSpacing:'-0.05em', lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:11.5, color, opacity:0.75, fontWeight:600, marginTop:3 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div style={{ position:'relative', maxWidth:320 }}>
        <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
        <input className="input" placeholder="Search employee…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft:36 }}/>
      </div>

      {/* ── Logged Records ── */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontWeight:700, fontSize:14, display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:4, background:'#10B981' }}/>
            Logged Today
            <span style={{ fontWeight:500, color:'var(--text-muted)', fontSize:13 }}>({filtered.length})</span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding:60, textAlign:'center' }}>
            <div style={{ width:36, height:36, border:'3px solid var(--border)', borderTopColor:'#B8860B', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }}/>
            <div style={{ fontSize:13, color:'var(--text-muted)' }}>Loading records…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:60, textAlign:'center' }}>
            <Clock size={36} color="var(--border)" style={{ margin:'0 auto 12px' }}/>
            <div style={{ fontWeight:600, fontSize:14, color:'var(--text-muted)' }}>No records for this date</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4, opacity:0.6 }}>Use "Log Attendance" to add entries</div>
          </div>
        ) : (
          <div>
            {filtered.map((att, i) => {
              const st = STATUS.find(s => s.v === att.status)
              return (
                <div key={att.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', borderBottom: i < filtered.length-1 ? '1px solid var(--border)' : 'none', transition:'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--bg-alt)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <Avatar name={att.name}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:13.5, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{att.name}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{att.role || '—'} {att.dept ? `· ${att.dept}` : ''}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    {att.note && (
                      <span style={{ fontSize:11, color:'var(--text-muted)', background:'var(--bg-alt)', border:'1px solid var(--border)', padding:'3px 9px', borderRadius:20, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{att.note}</span>
                    )}
                    <span style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:20, background:st?.bg, border:`1px solid ${st?.border}`, color:st?.color, fontSize:12, fontWeight:700 }}>
                      <span style={{ width:6, height:6, borderRadius:3, background:st?.dot }}/>
                      {st?.label}
                    </span>
                    <button onClick={() => deleteRecord(att.id)}
                      style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background='#FEF2F2'; e.currentTarget.style.borderColor='#FCA5A5'; e.currentTarget.style.color='#EF4444' }}
                      onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-muted)' }}>
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Not Logged Yet ── */}
      {unlogged.length > 0 && (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:4, background:'#F59E0B' }}/>
            <span style={{ fontWeight:700, fontSize:14 }}>Not Logged Yet</span>
            <span style={{ fontWeight:500, color:'var(--text-muted)', fontSize:13 }}>({unlogged.length})</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:1, background:'var(--border)' }}>
            {unlogged.map(e => (
              <div key={e.id} style={{ background:'var(--card)', padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
                <Avatar name={e.name} size={32}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{e.role || '—'}</div>
                </div>
                <ChevronRight size={14} color="var(--text-muted)"/>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal && <LogModal employees={employees} date={date} onClose={() => setModal(false)} onSave={() => { setModal(false); load() }}/>}
    </div>
  )
}
