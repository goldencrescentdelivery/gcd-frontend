'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { API } from '@/lib/api'
import { useStation, hdr, AttModal, WorkNumModal, EmpDetailModal } from '../_components/poc-shared'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Clock, Plus, Search, CheckSquare, Pencil, Trash2, UserCheck, UserX, Users, Wallet } from 'lucide-react'

const DOT_COLOR = { present:'#10B981', absent:'#EF4444', leave:'#F59E0B' }

const TODAY = () => new Date().toISOString().slice(0, 10)
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
    <div style={{ width:size, height:size, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.34, fontWeight:800, color:'#fff', flexShrink:0 }}>
      {initials}
    </div>
  )
}

function WeekDots({ empId, weekMap, weekDates, selectedDate, onDayClick }) {
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div style={{ display:'flex', gap:3 }}>
      {weekDates.map(date => {
        const rec    = (weekMap[date] || []).find(a => a.emp_id === empId)
        const color  = rec ? (DOT_COLOR[rec.status] || '#6B7280') : 'var(--border)'
        const isSel  = date === selectedDate
        const isToday = date === today
        const day    = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday:'short' }).charAt(0)
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

export default function AttendancePage() {
  const { user }                        = useAuth()
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
  const [weekMap,     setWeekMap]     = useState({})
  const [weekLoading, setWeekLoading] = useState(true)

  const weekDates = useMemo(() => getLast7(), [])
  const STATIONS  = ['DDB1', 'DXE6']

  const loadWeek = useCallback(async () => {
    setWeekLoading(true)
    try {
      const results = await Promise.all(
        weekDates.map(d =>
          fetch(`${API}/api/attendance?date=${d}`, { headers:{ Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } })
            .then(r => r.json()).catch(() => ({ attendance:[] }))
        )
      )
      const map = {}
      weekDates.forEach((d, i) => { map[d] = results[i].attendance || [] })
      setWeekMap(map)
    } catch(e) { console.error(e) } finally { setWeekLoading(false) }
  }, [weekDates])

  const load = useCallback(async () => {
    setLoading(true)
    const h = { headers: { Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }
    try {
      const [a, e, s] = await Promise.all([
        fetch(`${API}/api/attendance?date=${date}`, h).then(r => r.json()),
        fetch(`${API}/api/employees`, h).then(r => r.json()),
        fetch(`${API}/api/sims`, h).then(r => r.json()),
      ])
      setAtt(a.attendance || [])
      setEmps(e.employees || [])
      setSims(s.sims || [])
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [date])

  useEffect(() => { load() },     [load])
  useEffect(() => { loadWeek() }, [loadWeek])
  useEffect(() => { setSearch('') }, [date])

  const stationEmps = emps.filter(e => e.station_code === station)
  const filtEmp     = stationEmps.filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase()))
  const present     = att.filter(a => a.status === 'present').length
  const absent      = att.filter(a => a.status === 'absent').length
  const earnings    = att.reduce((s, a) => s + parseFloat(a.earnings || 0), 0)
  const loggedCount = stationEmps.filter(e => att.find(a => a.emp_id === e.id)).length

  function deleteAtt(id) {
    setConfirmDlg({
      title:'Remove attendance record?',
      message:'This will delete the attendance entry for this DA on the selected date.',
      confirmLabel:'Remove', danger:true,
      onConfirm: async () => {
        setConfirmDlg(null)
        await fetch(`${API}/api/attendance/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } })
        load(); loadWeek()
      },
    })
  }

  function handleBulkPresent() {
    const unlogged = filtEmp.filter(e => !att.find(a => a.emp_id === e.id))
    if (unlogged.length === 0) {
      setConfirmDlg({ title:'All DAs already logged', message:'Every DA already has a record for this date.', confirmLabel:'OK', cancelLabel:null, danger:false, onConfirm:() => setConfirmDlg(null) })
      return
    }
    setConfirmDlg({
      title:`Mark ${unlogged.length} DA${unlogged.length !== 1 ? 's' : ''} as Present?`,
      message:`Creates attendance records for ${unlogged.length} unlogged DA${unlogged.length !== 1 ? 's' : ''}. Hours/shipments not set — edit each record to add them.`,
      confirmLabel:'Mark Present', danger:false,
      onConfirm: async () => {
        setConfirmDlg(null); setBulkLoading(true)
        try {
          await fetch(`${API}/api/attendance/bulk`, {
            method:'POST', headers:hdr(),
            body:JSON.stringify({ records: unlogged.map(e => ({ emp_id:e.id, date, status:'present' })) })
          })
          load(); loadWeek()
        } catch { } finally { setBulkLoading(false) }
      },
    })
  }

  function onSaved() { setModal(null); load(); loadWeek() }

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-AE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

  return (
    <>
      <style>{`
        .patt-page { display:flex; flex-direction:column; gap:16px; animation:slideUp 0.3s ease; }

        /* Hero */
        .patt-hero { background:linear-gradient(135deg,#0a1a0a 0%,#0d2d15 55%,#10B981 100%); border-radius:20px; padding:24px 28px; position:relative; overflow:hidden; }
        .patt-hero-top { position:relative; display:flex; align-items:flex-start; justify-content:space-between; gap:14px; flex-wrap:wrap; }
        .patt-hero-title { font-weight:900; font-size:22px; color:#fff; margin:0; letter-spacing:-0.03em; }
        .patt-hero-sub { font-size:12px; color:rgba(255,255,255,0.55); margin-top:3px; margin-left:44px; }
        .patt-station-row { display:flex; align-items:center; gap:8px; margin-top:12px; margin-left:44px; flex-wrap:wrap; }
        .patt-station-btn { padding:5px 14px; border-radius:20px; border:none; cursor:pointer; font-family:inherit; font-size:12px; font-weight:700; transition:all 0.15s; }
        .patt-hero-right { display:flex; align-items:center; gap:8px; flex-shrink:0; flex-wrap:wrap; }
        .patt-date-inp { padding:8px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.25); background:rgba(255,255,255,0.12); color:#fff; font-size:13px; font-family:inherit; cursor:pointer; outline:none; }
        .patt-log-btn { display:flex; align-items:center; gap:6px; padding:9px 16px; border-radius:10px; border:none; background:#10B981; color:#fff; font-weight:700; font-size:13px; cursor:pointer; font-family:inherit; white-space:nowrap; box-shadow:0 2px 8px rgba(0,0,0,0.25); }
        .patt-log-btn:hover { background:#059669; }
        .patt-bulk-btn { display:flex; align-items:center; gap:6px; padding:9px 16px; border-radius:10px; border:1px solid rgba(255,255,255,0.3); background:rgba(255,255,255,0.1); color:#fff; font-weight:700; font-size:13px; cursor:pointer; font-family:inherit; white-space:nowrap; }
        .patt-bulk-btn:hover { background:rgba(255,255,255,0.18); }

        /* Stats */
        .patt-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        .patt-stat { border-radius:16px; padding:16px 18px; display:flex; align-items:center; gap:12px; border:1px solid; transition:transform 0.15s; }
        .patt-stat:hover { transform:translateY(-1px); }
        .patt-stat-val { font-weight:900; font-size:26px; letter-spacing:-0.05em; line-height:1; }
        .patt-stat-lbl { font-size:11px; font-weight:600; margin-top:3px; opacity:0.75; }

        /* Week nav */
        .patt-week { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:14px 16px; }
        .patt-week-title { font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:10px; }

        /* List */
        .patt-list { background:var(--card); border:1px solid var(--border); border-radius:16px; overflow:hidden; }
        .patt-list-hd { padding:12px 18px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:8px; }
        .patt-row { border-bottom:1px solid var(--border); overflow:hidden; transition:box-shadow 0.15s; }
        .patt-row:last-child { border-bottom:none; }
        .patt-row-main { display:flex; align-items:center; gap:12px; padding:13px 16px; }
        .patt-row-actions { padding:8px 12px; background:var(--bg-alt); border-top:1px solid var(--border); display:flex; gap:6px; justify-content:flex-end; }

        /* Responsive */
        @media (max-width:768px) {
          .patt-stats { grid-template-columns:repeat(2,1fr); gap:8px; }
          .patt-hero { padding:18px 16px; border-radius:16px; }
          .patt-hero-top { flex-direction:column; }
          .patt-hero-right { width:100%; }
          .patt-date-inp { flex:1; box-sizing:border-box; }
          .patt-log-btn, .patt-bulk-btn { flex:1; justify-content:center; }
          .patt-station-row { margin-left:0; }
          .patt-hero-sub { margin-left:0; }
        }
        @media (max-width:480px) {
          .patt-stat { padding:12px 14px; gap:10px; }
          .patt-stat-val { font-size:20px; }
          .patt-row-main { padding:11px 14px; gap:10px; }
        }
      `}</style>

      <div className="patt-page">

        {/* ── Hero ── */}
        <div className="patt-hero">
          <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }}/>
          <div style={{ position:'absolute', bottom:-25, right:80, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.03)', pointerEvents:'none' }}/>
          <div className="patt-hero-top">
            <div style={{ position:'relative' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                <div style={{ width:36, height:36, borderRadius:11, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Clock size={18} color="#6EE7B7"/>
                </div>
                <h1 className="patt-hero-title">POC Attendance</h1>
              </div>
              <div className="patt-hero-sub">{displayDate} · DDB1: hours-based · DXE6: shipment-based</div>
              <div className="patt-station-row">
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)', fontWeight:600, letterSpacing:'0.05em' }}>STATION</span>
                {canSwitch ? STATIONS.map(s => (
                  <button key={s} className="patt-station-btn" onClick={() => setStation(s)}
                    style={{ background: station===s ? '#10B981' : 'rgba(255,255,255,0.12)', color: station===s ? '#fff' : 'rgba(255,255,255,0.7)', border: station===s ? 'none' : '1px solid rgba(255,255,255,0.25)' }}>
                    {s}
                  </button>
                )) : (
                  <span style={{ fontSize:13, fontWeight:700, color:'#6EE7B7', background:'rgba(16,185,129,0.2)', padding:'3px 12px', borderRadius:20 }}>{station}</span>
                )}
              </div>
            </div>
            <div className="patt-hero-right">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="patt-date-inp"/>
              <button onClick={handleBulkPresent} disabled={bulkLoading} className="patt-bulk-btn">
                <CheckSquare size={14}/> {bulkLoading ? 'Marking…' : 'Mark All Present'}
              </button>
              <button onClick={() => setModal('att')} className="patt-log-btn">
                <Plus size={14}/> Log
              </button>
            </div>
          </div>

          {stationEmps.length > 0 && (
            <div style={{ marginTop:18, position:'relative' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:10, color:'rgba(255,255,255,0.45)', fontWeight:700, letterSpacing:'0.08em' }}>LOGGED TODAY</span>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.7)', fontWeight:700 }}>{loggedCount}/{stationEmps.length}</span>
              </div>
              <div style={{ height:5, borderRadius:3, background:'rgba(255,255,255,0.1)', overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:3, background:'linear-gradient(90deg,#10B981,#34D399)', width:`${stationEmps.length > 0 ? (loggedCount / stationEmps.length) * 100 : 0}%`, transition:'width 0.5s ease' }}/>
              </div>
            </div>
          )}
        </div>

        {/* ── Stat Cards ── */}
        {!loading && (
          <div className="patt-stats">
            {[
              { label:'Present',  value:present,                    icon:UserCheck, color:'#059669', bg:'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border:'#A7F3D0' },
              { label:'Absent',   value:absent,                     icon:UserX,     color:'#DC2626', bg:'linear-gradient(135deg,#FEF2F2,#FEE2E2)', border:'#FCA5A5' },
              { label:'Total DAs',value:stationEmps.length,         icon:Users,     color:'#7C3AED', bg:'linear-gradient(135deg,#F5F3FF,#EDE9FE)', border:'#DDD6FE' },
              { label:'Earnings', value:`AED ${earnings.toFixed(0)}`,icon:Wallet,   color:'#B8860B', bg:'linear-gradient(135deg,#FFFBEB,#FEF3C7)', border:'#FCD34D' },
            ].map(({ label, value, icon:Icon, color, bg, border }) => (
              <div key={label} className="patt-stat" style={{ background:bg, borderColor:border }}>
                <div style={{ width:42, height:42, borderRadius:12, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={19} color={color}/>
                </div>
                <div>
                  <div className="patt-stat-val" style={{ color, fontSize: label==='Earnings' ? 16 : undefined }}>{value}</div>
                  <div className="patt-stat-lbl" style={{ color }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Week Navigator ── */}
        <div className="patt-week">
          <div className="patt-week-title">Last 7 Days — click to navigate</div>
          <WeekNav weekDates={weekDates} weekMap={weekMap} employees={stationEmps} selectedDate={date} onDayClick={d => setDate(d)}/>
        </div>

        {/* ── Toolbar ── */}
        <div style={{ position:'relative' }}>
          <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
          <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search DA by name or ID…" style={{ paddingLeft:36 }}/>
        </div>

        {/* ── DA List ── */}
        <div className="patt-list">
          <div className="patt-list-hd">
            <div style={{ width:8, height:8, borderRadius:4, background:'#10B981' }}/>
            <span style={{ fontWeight:700, fontSize:13.5 }}>{station} — All DAs</span>
            <span style={{ color:'var(--text-muted)', fontSize:13 }}>({filtEmp.length})</span>
            <span style={{ marginLeft:'auto', fontSize:11.5, color:'var(--text-muted)', fontWeight:600 }}>7-day history</span>
          </div>

          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10, padding:16 }}>
              {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:72, borderRadius:14 }}/>)}
            </div>
          ) : filtEmp.length === 0 ? (
            <div style={{ textAlign:'center', padding:50, color:'var(--text-muted)' }}>No DAs found for {station}</div>
          ) : filtEmp.map(emp => {
            const a           = att.find(x => x.emp_id === emp.id)
            const units       = parseFloat(a?.cycle_hours || 0)
            const payType     = a?.pay_type || 'hourly'
            const statusColor = { present:'#059669', absent:'#DC2626', leave:'#D97706' }[a?.status] || 'var(--text-muted)'
            const statusBg    = { present:'#ECFDF5', absent:'#FEF2F2', leave:'#FFFBEB' }[a?.status] || 'var(--bg-alt)'
            const statusBorder = { present:'#A7F3D0', absent:'#FCA5A5', leave:'#FCD34D' }[a?.status] || 'var(--border)'
            return (
              <div key={emp.id} className="patt-row">
                <div className="patt-row-main">
                  {/* Avatar + Info */}
                  <div onClick={() => setEmpDetail(emp)} style={{ display:'flex', alignItems:'center', gap:12, flex:1, minWidth:0, cursor:'pointer' }}>
                    <Avatar name={emp.name}/>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13.5, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{emp.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{emp.id}</div>
                    </div>
                  </div>

                  {/* 7-day dots */}
                  <WeekDots empId={emp.id} weekMap={weekMap} weekDates={weekDates} selectedDate={date} onDayClick={d => setDate(d)}/>

                  {/* Status + SIM */}
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5, flexShrink:0 }}>
                    {a ? (
                      <>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', background:statusBg, border:`1px solid ${statusBorder}`, borderRadius:20, fontSize:12, fontWeight:700, color:statusColor, whiteSpace:'nowrap' }}>
                          <span style={{ width:6, height:6, borderRadius:3, background:statusColor }}/>
                          {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                        </span>
                        {units > 0 && a.status === 'present' && (
                          <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                            {payType === 'shipment' ? `${units} shipments` : `${units}h`} · AED {parseFloat(a.earnings||0).toFixed(0)}
                          </div>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize:11.5, color:'var(--text-muted)', background:'var(--bg-alt)', border:'1px solid var(--border)', padding:'5px 12px', borderRadius:20, fontWeight:500 }}>Not logged</span>
                    )}
                    <button onClick={e => { e.stopPropagation(); setModal({ type:'work-num', emp }) }}
                      style={{ fontSize:10, fontWeight:600, color:'#7C3AED', background:'var(--purple-bg)', border:'1px solid var(--purple-border)', borderRadius:20, padding:'2px 8px', cursor:'pointer', fontFamily:'inherit' }}>
                      📱 {emp.work_number || 'Assign SIM'}
                    </button>
                  </div>
                </div>

                {/* Edit / Remove */}
                {a && (
                  <div className="patt-row-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setModal({ type:'att-edit', record:{ ...a, name:emp.name, avatar:emp.avatar } })}>
                      <Pencil size={12}/> Edit
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => deleteAtt(a.id)} style={{ color:'#EF4444', borderColor:'#FCA5A5' }}>
                      <Trash2 size={12}/> Remove
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Modals */}
        {modal === 'att' && <AttModal employees={emps} station={station} date={date} onClose={() => setModal(null)} onSave={onSaved}/>}
        {modal?.type === 'att-edit' && <AttModal employees={emps} station={station} date={date} editRecord={modal.record} onClose={() => setModal(null)} onSave={onSaved}/>}
        {modal?.type === 'work-num' && <WorkNumModal emp={modal.emp} station={station} sims={sims} onClose={() => setModal(null)} onSave={onSaved}/>}
        {empDetail && <EmpDetailModal emp={empDetail} sims={sims} onClose={() => setEmpDetail(null)}/>}
        <ConfirmDialog open={!!confirmDlg} title={confirmDlg?.title} message={confirmDlg?.message} confirmLabel={confirmDlg?.confirmLabel} cancelLabel={confirmDlg?.cancelLabel ?? 'Cancel'} danger={confirmDlg?.danger ?? true} onConfirm={confirmDlg?.onConfirm} onCancel={() => setConfirmDlg(null)}/>
      </div>
    </>
  )
}
