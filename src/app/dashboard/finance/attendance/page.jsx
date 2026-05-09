'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { API } from '@/lib/api'
import { Plus, X, Search, Clock, UserCheck, UserX, CalendarOff, AlertCircle, Trash2 } from 'lucide-react'

const STATUS = [
  { v:'present', label:'Present',  color:'#059669', bg:'#ECFDF5', border:'#6EE7B7', dot:'#10B981' },
  { v:'absent',  label:'Absent',   color:'#DC2626', bg:'#FEF2F2', border:'#FCA5A5', dot:'#EF4444' },
  { v:'leave',   label:'On Leave', color:'#D97706', bg:'#FFFBEB', border:'#FCD34D', dot:'#F59E0B' },
]
const DOT_COLOR = { present:'#10B981', absent:'#EF4444', leave:'#F59E0B' }

function getLast7() {
  return Array.from({ length:7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })
}

function Avatar({ name, size = 38 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??'
  const colors   = ['#B8860B','#0F766E','#7C3AED','#DC2626','#0369A1','#059669']
  const color    = colors[(name?.charCodeAt(0) || 0) % colors.length]
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size * 0.34, fontWeight:800, color:'#fff', flexShrink:0, letterSpacing:'-0.01em' }}>
      {initials}
    </div>
  )
}

function WeekDots({ empId, weekMap, weekDates, selectedDate, onDayClick }) {
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div style={{ display:'flex', gap:3 }}>
      {weekDates.map(date => {
        const rec   = (weekMap[date] || []).find(a => a.emp_id === empId)
        const color = rec ? (DOT_COLOR[rec.status] || '#6B7280') : 'var(--border)'
        const isSel = date === selectedDate
        const isToday = date === today
        const day = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday:'short' }).charAt(0)
        return (
          <button key={date} onClick={() => onDayClick(date)} type="button" title={`${date}: ${rec?.status || 'not logged'}`}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:'none', border:'none', cursor:'pointer', padding:'2px 1px' }}>
            <span style={{ fontSize:8, fontWeight:700, color: isSel ? '#B8860B' : 'var(--text-muted)', fontFamily:'inherit' }}>{day}</span>
            <div style={{ width:14, height:14, borderRadius:4, background:color, outline: isSel ? '2px solid #B8860B' : isToday ? '2px solid rgba(184,134,11,0.35)' : 'none', outlineOffset:'1px', transition:'all 0.12s' }}/>
          </button>
        )
      })}
    </div>
  )
}

function WeekNav({ weekDates, weekMap, employees, selectedDate, onDayClick }) {
  const today  = new Date().toISOString().slice(0, 10)
  const empIds = new Set(employees.map(e => e.id))
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:6 }}>
      {weekDates.map(date => {
        const recs    = (weekMap[date] || []).filter(a => empIds.has(a.emp_id))
        const present = recs.filter(a => a.status === 'present').length
        const isSel   = date === selectedDate
        const isToday = date === today
        const dayName = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday:'short' })
        const dayNum  = new Date(date + 'T00:00:00').getDate()
        const pct     = employees.length > 0 ? Math.round(recs.length / employees.length * 100) : 0
        return (
          <button key={date} onClick={() => onDayClick(date)} type="button"
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'10px 4px', borderRadius:12, border:'none', cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
              background: isSel ? '#B8860B' : isToday ? 'rgba(184,134,11,0.08)' : 'var(--bg-alt)',
              outline: !isSel && isToday ? '1.5px solid rgba(184,134,11,0.35)' : 'none' }}>
            <span style={{ fontSize:9, fontWeight:700, color: isSel ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', letterSpacing:'0.05em' }}>{dayName.toUpperCase()}</span>
            <span style={{ fontSize:17, fontWeight:900, color: isSel ? '#fff' : 'var(--text)', letterSpacing:'-0.03em' }}>{dayNum}</span>
            {recs.length > 0 ? (
              <span style={{ fontSize:9.5, fontWeight:700, color: isSel ? 'rgba(255,255,255,0.9)' : '#059669', background: isSel ? 'rgba(255,255,255,0.18)' : '#ECFDF5', padding:'1px 6px', borderRadius:10 }}>
                {present}/{employees.length}
              </span>
            ) : (
              <span style={{ fontSize:9, color: isSel ? 'rgba(255,255,255,0.4)' : 'var(--text-muted)' }}>—</span>
            )}
            {recs.length > 0 && (
              <div style={{ width:'80%', height:3, borderRadius:2, background: isSel ? 'rgba(255,255,255,0.25)' : 'var(--border)', overflow:'hidden', marginTop:1 }}>
                <div style={{ height:'100%', width:`${pct}%`, background: isSel ? 'rgba(255,255,255,0.8)' : '#10B981', borderRadius:2 }}/>
              </div>
            )}
          </button>
        )
      })}
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
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      onSave()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:420, borderRadius:20 }}>
        <div style={{ background:'linear-gradient(135deg,#B8860B,#D4A017)', borderRadius:'16px 16px 0 0', padding:'18px 20px', margin:'-24px -24px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:800, fontSize:16, color:'#fff' }}>Log Attendance</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)', marginTop:2 }}>{date}</div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'1px solid rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.15)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <X size={14}/>
          </button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label className="input-label">Employee *</label>
            <select className="input" value={empId} onChange={e => setEmpId(e.target.value)}>
              <option value="">Select employee…</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}{e.role ? ` — ${e.role}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Status *</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {STATUS.map(s => (
                <button key={s.v} type="button" onClick={() => setStatus(s.v)}
                  style={{ padding:'12px 6px', borderRadius:12, border:`2px solid ${status===s.v ? s.border : 'var(--border)'}`, background:status===s.v ? s.bg : 'var(--bg-alt)', color:status===s.v ? s.color : 'var(--text-muted)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <span style={{ width:8, height:8, borderRadius:4, background:status===s.v ? s.dot : 'var(--border)', display:'block' }}/>
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
  const [date,       setDate]       = useState(new Date().toISOString().slice(0, 10))
  const [modal,      setModal]      = useState(false)
  const [search,     setSearch]     = useState('')
  const [weekMap,    setWeekMap]    = useState({})
  const [weekLoading, setWeekLoading] = useState(true)

  const weekDates = useMemo(() => getLast7(), [])
  const auth = useMemo(() => ({ Authorization:`Bearer ${localStorage.getItem('gcd_token')}` }), [])

  const loadWeek = useCallback(async () => {
    setWeekLoading(true)
    try {
      const results = await Promise.all(
        weekDates.map(d => fetch(`${API}/api/attendance?date=${d}`, { headers:auth }).then(r => r.json()).catch(() => ({ attendance:[] })))
      )
      const map = {}
      weekDates.forEach((d, i) => { map[d] = results[i].attendance || [] })
      setWeekMap(map)
    } catch(e) { console.error(e) } finally { setWeekLoading(false) }
  }, [weekDates, auth])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [attRes, empRes] = await Promise.all([
        fetch(`${API}/api/attendance?date=${date}`, { headers:auth }).then(r => r.json()),
        fetch(`${API}/api/employees`, { headers:auth }).then(r => r.json()),
      ])
      const staff = (empRes.employees || []).filter(e =>
        e.status !== 'inactive' &&
        !['driver'].includes((e.role || '').toLowerCase()) &&
        !['operations','delivery'].includes((e.dept || '').toLowerCase())
      )
      setEmployees(staff)
      const staffIds = new Set(staff.map(e => e.id))
      setAttendance((attRes.attendance || []).filter(a => staffIds.has(a.emp_id)))
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [date, auth])

  useEffect(() => { load() },     [load])
  useEffect(() => { loadWeek() }, [loadWeek])

  const loggedIds  = new Set(attendance.map(a => a.emp_id))
  const present    = attendance.filter(a => a.status === 'present').length
  const absent     = attendance.filter(a => a.status === 'absent').length
  const onLeave    = attendance.filter(a => a.status === 'leave').length
  const total      = employees.length
  const notLogged  = total - attendance.length

  const filtered = (search.trim()
    ? employees.filter(e => e.name?.toLowerCase().includes(search.toLowerCase()))
    : employees
  ).sort((a, b) => (loggedIds.has(a.id) ? 0 : 1) - (loggedIds.has(b.id) ? 0 : 1))

  async function deleteRecord(id) {
    if (!confirm('Remove this attendance record?')) return
    await fetch(`${API}/api/attendance/${id}`, { method:'DELETE', headers:auth })
    load(); loadWeek()
  }

  function onSaved() { setModal(false); load(); loadWeek() }

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-AE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

  return (
    <>
      <style>{`
        .satt-page { display:flex; flex-direction:column; gap:16px; animation:slideUp 0.35s ease; }

        /* Hero */
        .satt-hero { background:linear-gradient(135deg,#1a1200 0%,#3d2a00 55%,#B8860B 100%); border-radius:20px; padding:24px 28px; position:relative; overflow:hidden; }
        .satt-hero-top { position:relative; display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; }
        .satt-hero-title { font-weight:900; font-size:22px; color:#fff; margin:0; letter-spacing:-0.03em; }
        .satt-hero-sub { font-size:12px; color:rgba(255,255,255,0.55); margin-left:44px; margin-top:3px; }
        .satt-hero-right { display:flex; align-items:center; gap:8px; }
        .satt-date-inp { padding:8px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.25); background:rgba(255,255,255,0.12); color:#fff; font-size:13px; font-family:inherit; cursor:pointer; outline:none; }
        .satt-log-btn { display:flex; align-items:center; gap:7px; padding:9px 18px; border-radius:10px; border:none; background:#B8860B; color:#fff; font-weight:700; font-size:13px; cursor:pointer; font-family:inherit; white-space:nowrap; box-shadow:0 2px 8px rgba(0,0,0,0.25); }
        .satt-log-btn:hover { background:#A07808; }

        /* Stat cards */
        .satt-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        .satt-stat { border-radius:16px; padding:16px 18px; display:flex; align-items:center; gap:12px; border:1px solid; transition:transform 0.15s; }
        .satt-stat:hover { transform:translateY(-1px); }
        .satt-stat-val { font-weight:900; font-size:28px; letter-spacing:-0.05em; line-height:1; }
        .satt-stat-lbl { font-size:11px; font-weight:600; margin-top:3px; opacity:0.75; }

        /* Week nav */
        .satt-week { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:14px 16px; }
        .satt-week-title { font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:10px; }

        /* Employee rows */
        .satt-list { background:var(--card); border:1px solid var(--border); border-radius:16px; overflow:hidden; }
        .satt-list-hd { padding:13px 18px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:8px; }
        .satt-row { display:flex; align-items:center; gap:12px; padding:13px 18px; transition:background 0.12s; }
        .satt-row:hover { background:var(--bg-alt); }
        .satt-row-mid { flex:1; min-width:0; }
        .satt-row-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }

        /* Responsive */
        @media (max-width:768px) {
          .satt-stats { grid-template-columns:repeat(2,1fr); gap:8px; }
          .satt-hero { padding:18px 16px; border-radius:16px; }
          .satt-hero-top { flex-direction:column; align-items:stretch; }
          .satt-hero-right { flex-direction:column; }
          .satt-date-inp { width:100%; box-sizing:border-box; }
          .satt-log-btn { justify-content:center; }
          .satt-hero-sub { margin-left:0; margin-top:6px; }
        }
        @media (max-width:480px) {
          .satt-stat { padding:12px 14px; gap:10px; }
          .satt-stat-val { font-size:22px; }
          .satt-row { padding:11px 14px; gap:10px; }
        }
      `}</style>

      <div className="satt-page">

        {/* ── Hero ── */}
        <div className="satt-hero">
          <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }}/>
          <div style={{ position:'absolute', bottom:-25, right:80, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.03)', pointerEvents:'none' }}/>
          <div className="satt-hero-top">
            <div style={{ position:'relative' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                <div style={{ width:36, height:36, borderRadius:11, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Clock size={18} color="#FFD700"/>
                </div>
                <h1 className="satt-hero-title">Staff Attendance</h1>
              </div>
              <div className="satt-hero-sub">{displayDate} · Office & admin staff only</div>
            </div>
            <div className="satt-hero-right">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="satt-date-inp"/>
              <button onClick={() => setModal(true)} className="satt-log-btn">
                <Plus size={15}/> Log Attendance
              </button>
            </div>
          </div>
          {total > 0 && (
            <div style={{ marginTop:18, position:'relative' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:10, color:'rgba(255,255,255,0.45)', fontWeight:700, letterSpacing:'0.08em' }}>LOGGED TODAY</span>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.7)', fontWeight:700 }}>{attendance.length}/{total}</span>
              </div>
              <div style={{ height:5, borderRadius:3, background:'rgba(255,255,255,0.1)', overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:3, background:'linear-gradient(90deg,#10B981,#34D399)', width:`${(attendance.length / total) * 100}%`, transition:'width 0.5s ease' }}/>
              </div>
            </div>
          )}
        </div>

        {/* ── Stat Cards ── */}
        <div className="satt-stats">
          {[
            { label:'Present',    value:present,   icon:UserCheck,   color:'#059669', bg:'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border:'#A7F3D0' },
            { label:'Absent',     value:absent,    icon:UserX,       color:'#DC2626', bg:'linear-gradient(135deg,#FEF2F2,#FEE2E2)', border:'#FCA5A5' },
            { label:'On Leave',   value:onLeave,   icon:CalendarOff, color:'#D97706', bg:'linear-gradient(135deg,#FFFBEB,#FEF3C7)', border:'#FCD34D' },
            { label:'Not Logged', value:notLogged, icon:AlertCircle, color:'#6B7280', bg:'linear-gradient(135deg,#F9FAFB,#F3F4F6)', border:'#E5E7EB' },
          ].map(({ label, value, icon:Icon, color, bg, border }) => (
            <div key={label} className="satt-stat" style={{ background:bg, borderColor:border }}>
              <div style={{ width:42, height:42, borderRadius:12, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={19} color={color}/>
              </div>
              <div>
                <div className="satt-stat-val" style={{ color }}>{loading ? '—' : value}</div>
                <div className="satt-stat-lbl" style={{ color }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Week Navigator ── */}
        <div className="satt-week">
          <div className="satt-week-title">Last 7 Days — click to navigate</div>
          <WeekNav weekDates={weekDates} weekMap={weekMap} employees={employees} selectedDate={date} onDayClick={d => setDate(d)}/>
        </div>

        {/* ── Search ── */}
        <div style={{ position:'relative' }}>
          <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
          <input className="input" placeholder="Search employee…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft:36 }}/>
        </div>

        {/* ── Employee List ── */}
        <div className="satt-list">
          <div className="satt-list-hd">
            <div style={{ width:8, height:8, borderRadius:4, background:'#10B981' }}/>
            <span style={{ fontWeight:700, fontSize:13.5 }}>All Staff</span>
            <span style={{ color:'var(--text-muted)', fontSize:13 }}>({filtered.length})</span>
            <span style={{ marginLeft:'auto', fontSize:11.5, color:'var(--text-muted)', fontWeight:600 }}>7-day history</span>
          </div>

          {loading ? (
            <div style={{ padding:56, textAlign:'center' }}>
              <div style={{ width:34, height:34, border:'3px solid var(--border)', borderTopColor:'#B8860B', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 10px' }}/>
              <div style={{ fontSize:13, color:'var(--text-muted)' }}>Loading records…</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding:56, textAlign:'center' }}>
              <Clock size={34} color="var(--border)" style={{ margin:'0 auto 10px' }}/>
              <div style={{ fontWeight:600, fontSize:14, color:'var(--text-muted)' }}>No employees match</div>
            </div>
          ) : filtered.map((emp, i) => {
            const att = attendance.find(a => a.emp_id === emp.id)
            const st  = att ? STATUS.find(s => s.v === att.status) : null
            return (
              <div key={emp.id} className="satt-row" style={{ borderBottom: i < filtered.length-1 ? '1px solid var(--border)' : 'none' }}>
                <Avatar name={emp.name}/>
                <div className="satt-row-mid">
                  <div style={{ fontWeight:700, fontSize:13.5, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{emp.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{emp.role || '—'}{emp.dept ? ` · ${emp.dept}` : ''}</div>
                </div>

                {/* 7-day dot strip */}
                <WeekDots empId={emp.id} weekMap={weekMap} weekDates={weekDates} selectedDate={date} onDayClick={d => setDate(d)}/>

                <div className="satt-row-right">
                  {att ? (
                    <>
                      <span style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:20, background:st?.bg, border:`1px solid ${st?.border}`, color:st?.color, fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>
                        <span style={{ width:6, height:6, borderRadius:3, background:st?.dot }}/>
                        {st?.label}
                      </span>
                      <button onClick={() => deleteRecord(att.id)}
                        style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.15s', flexShrink:0 }}
                        onMouseEnter={e => { e.currentTarget.style.background='#FEF2F2'; e.currentTarget.style.color='#EF4444'; e.currentTarget.style.borderColor='#FCA5A5' }}
                        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.borderColor='var(--border)' }}>
                        <Trash2 size={13}/>
                      </button>
                    </>
                  ) : (
                    <span style={{ fontSize:11.5, color:'var(--text-muted)', background:'var(--bg-alt)', border:'1px solid var(--border)', padding:'5px 12px', borderRadius:20, fontWeight:500, whiteSpace:'nowrap' }}>Not logged</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      </div>

      {modal && <LogModal employees={employees} date={date} onClose={() => setModal(false)} onSave={onSaved}/>}
    </>
  )
}
