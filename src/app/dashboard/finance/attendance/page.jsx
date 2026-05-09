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
      <div className="modal att-modal">
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
    <>
      <style>{`
        .att-page { display:flex; flex-direction:column; gap:20px; animation:slideUp 0.35s ease; }

        /* Hero */
        .att-hero { background:linear-gradient(135deg,#1a1200 0%,#3d2a00 50%,#B8860B 100%); border-radius:20px; padding:24px 28px; position:relative; overflow:hidden; }
        .att-hero-inner { position:relative; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px; }
        .att-hero-title { font-weight:800; font-size:22px; color:#fff; margin:0; letter-spacing:-0.03em; }
        .att-hero-sub { font-size:12.5px; color:rgba(255,255,255,0.6); margin-left:48px; }
        .att-hero-actions { display:flex; align-items:center; gap:10px; }
        .att-date-input { padding:9px 13px; border-radius:10px; border:1px solid rgba(255,255,255,0.25); background:rgba(255,255,255,0.12); color:#fff; font-size:13px; font-family:inherit; cursor:pointer; outline:none; }
        .att-log-btn { display:flex; align-items:center; gap:7px; padding:9px 18px; border-radius:10px; border:none; background:#B8860B; color:#fff; font-weight:700; font-size:13px; cursor:pointer; font-family:inherit; white-space:nowrap; }

        /* Stats */
        .att-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        .att-stat-card { border-radius:16px; padding:18px 20px; display:flex; align-items:center; gap:14px; }
        .att-stat-val { font-weight:800; font-size:28px; letter-spacing:-0.05em; line-height:1; }
        .att-stat-lbl { font-size:11.5px; opacity:0.75; font-weight:600; margin-top:3px; }

        /* Row */
        .att-row { display:flex; align-items:center; gap:14px; padding:14px 20px; transition:background 0.15s; }
        .att-row-right { display:flex; align-items:center; gap:10px; flex-shrink:0; }
        .att-note-badge { font-size:11px; color:var(--text-muted); background:var(--bg-alt); border:1px solid var(--border); padding:3px 9px; border-radius:20px; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

        /* Search */
        .att-search-wrap { position:relative; width:320px; }

        /* Modal */
        .att-modal { max-width:420px; border-radius:20px; }

        /* Mobile */
        @media (max-width: 640px) {
          .att-hero { padding:18px 16px; border-radius:16px; }
          .att-hero-inner { flex-direction:column; align-items:stretch; }
          .att-hero-title { font-size:18px; }
          .att-hero-sub { margin-left:40px; font-size:11px; }
          .att-hero-actions { flex-direction:column; align-items:stretch; }
          .att-date-input { width:100%; box-sizing:border-box; }
          .att-log-btn { justify-content:center; width:100%; box-sizing:border-box; }

          .att-stats { grid-template-columns:repeat(2,1fr); gap:10px; }
          .att-stat-card { padding:14px 14px; gap:10px; }
          .att-stat-val { font-size:24px; }
          .att-stat-lbl { font-size:10.5px; }

          .att-search-wrap { width:100%; }

          .att-row { padding:12px 14px; gap:10px; }
          .att-note-badge { display:none; }
          .att-row-right { gap:7px; }

          .att-modal { max-width:100%; border-radius:16px; }
        }
      `}</style>

      <div className="att-page">

        {/* ── Hero Header ── */}
        <div className="att-hero">
          <div style={{ position:'absolute', top:-30, right:-30, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }}/>
          <div style={{ position:'absolute', bottom:-20, right:60, width:90, height:90, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }}/>
          <div className="att-hero-inner">
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <div style={{ width:36, height:36, borderRadius:12, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Clock size={18} color="#FFD700"/>
                </div>
                <h1 className="att-hero-title">Staff Attendance</h1>
              </div>
              <div className="att-hero-sub">{displayDate} · Office & admin staff only</div>
            </div>
            <div className="att-hero-actions">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="att-date-input"/>
              <button onClick={() => setModal(true)} className="att-log-btn">
                <Plus size={15}/> Log Attendance
              </button>
            </div>
          </div>

          {total > 0 && (
            <div style={{ marginTop:18, position:'relative' }}>
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
        <div className="att-stats">
          {[
            { label:'Present',    value:present,        icon:UserCheck,   color:'#059669', bg:'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border:'#A7F3D0' },
            { label:'Absent',     value:absent,         icon:UserX,       color:'#DC2626', bg:'linear-gradient(135deg,#FEF2F2,#FEE2E2)', border:'#FCA5A5' },
            { label:'On Leave',   value:onLeave,        icon:CalendarOff, color:'#D97706', bg:'linear-gradient(135deg,#FFFBEB,#FEF3C7)', border:'#FCD34D' },
            { label:'Not Logged', value:unlogged.length,icon:AlertCircle, color:'#6B7280', bg:'linear-gradient(135deg,#F9FAFB,#F3F4F6)', border:'#E5E7EB' },
          ].map(({ label, value, icon:Icon, color, bg, border }) => (
            <div key={label} className="att-stat-card" style={{ background:bg, border:`1px solid ${border}` }}>
              <div style={{ width:44, height:44, borderRadius:12, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={20} color={color}/>
              </div>
              <div>
                <div className="att-stat-val" style={{ color }}>{value}</div>
                <div className="att-stat-lbl" style={{ color }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Search ── */}
        <div className="att-search-wrap">
          <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
          <input className="input" placeholder="Search employee…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft:36, width:'100%', boxSizing:'border-box' }}/>
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
                  <div key={att.id} className="att-row" style={{ borderBottom: i < filtered.length-1 ? '1px solid var(--border)' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--bg-alt)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <Avatar name={att.name}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13.5, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{att.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{att.role || '—'} {att.dept ? `· ${att.dept}` : ''}</div>
                    </div>
                    <div className="att-row-right">
                      {att.note && (
                        <span className="att-note-badge">{att.note}</span>
                      )}
                      <span style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:20, background:st?.bg, border:`1px solid ${st?.border}`, color:st?.color, fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>
                        <span style={{ width:6, height:6, borderRadius:3, background:st?.dot }}/>
                        {st?.label}
                      </span>
                      <button onClick={() => deleteRecord(att.id)}
                        style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.15s', flexShrink:0 }}
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
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:1, background:'var(--border)' }}>
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
    </>
  )
}
