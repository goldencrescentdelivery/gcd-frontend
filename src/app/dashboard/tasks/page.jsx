'use client'
import React, { useState, useEffect, useCallback } from 'react'
import {
  Plus, X, AlertCircle, RefreshCw, Trash2, Pencil,
  CheckCircle, Clock, AlertTriangle, ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { API } from '@/lib/api'

function hdr() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('gcd_token')}` } }

const PRIORITY = [
  { v:'low',    l:'Low',    color:'#6B7280', bg:'#F9FAFB', bc:'#E5E7EB' },
  { v:'normal', l:'Normal', color:'#2563EB', bg:'#EFF6FF', bc:'#BFDBFE' },
  { v:'high',   l:'High',   color:'#D97706', bg:'#FFFBEB', bc:'#FDE68A' },
  { v:'urgent', l:'Urgent', color:'#DC2626', bg:'#FEF2F2', bc:'#FECACA' },
]
const prioMap = Object.fromEntries(PRIORITY.map(p=>[p.v,p]))

const STATUS = [
  { v:'pending',     l:'Pending',     color:'#D97706', bg:'#FFFBEB', icon:'⏳' },
  { v:'in_progress', l:'In Progress', color:'#2563EB', bg:'#EFF6FF', icon:'🔄' },
  { v:'completed',   l:'Completed',   color:'#059669', bg:'#F0FDF4', icon:'✅' },
]
const statusMap = Object.fromEntries(STATUS.map(s=>[s.v,s]))

const ROLE_LABELS = { general_manager:'Manager', hr:'HR', accountant:'Accountant', poc:'POC', admin:'Admin' }

function daysUntil(d) {
  if (!d) return null
  const diff = Math.ceil((new Date(d) - new Date()) / 86400000)
  return diff
}

function DeadlineBadge({ deadline }) {
  const days = daysUntil(deadline)
  if (days===null) return null
  if (days < 0)  return <span style={{ fontSize:10, fontWeight:700, color:'#DC2626', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:6, padding:'1px 7px' }}>Overdue {Math.abs(days)}d</span>
  if (days===0)  return <span style={{ fontSize:10, fontWeight:700, color:'#DC2626', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:6, padding:'1px 7px' }}>Due Today</span>
  if (days<=3)   return <span style={{ fontSize:10, fontWeight:700, color:'#D97706', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:6, padding:'1px 7px' }}>{days}d left</span>
  return <span style={{ fontSize:10, color:'var(--text-muted)', background:'var(--bg-alt)', border:'1px solid var(--border)', borderRadius:6, padding:'1px 7px' }}>Due {deadline}</span>
}

function Lbl({ children }) {
  return <label style={{ display:'block', fontSize:10.5, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:5 }}>{children}</label>
}

/* ══ TASK MODAL (admin only) ════════════════════════════════════ */
function TaskModal({ task, users, onSave, onClose }) {
  const [form, setForm] = useState(task ? {
    title:       task.title||'',
    description: task.description||'',
    assigned_to: task.assigned_to||'',
    deadline:    task.deadline?.slice(0,10)||'',
    priority:    task.priority||'normal',
  } : { title:'', description:'', assigned_to:'', deadline:'', priority:'normal' })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)
  function set(k,v) { setForm(p=>({...p,[k]:v})) }

  async function handleSave() {
    if (!form.title.trim())  return setErr('Title is required')
    if (!form.assigned_to)   return setErr('Please select an assignee')
    if (!form.deadline)      return setErr('Deadline is required')
    setSaving(true); setErr(null)
    try {
      const url    = task ? `${API}/api/tasks/${task.id}` : `${API}/api/tasks`
      const method = task ? 'PUT' : 'POST'
      const r = await fetch(url, { method, headers: hdr(), body: JSON.stringify(form) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error||'Failed')
      onSave()
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay">
      <div style={{ background:'var(--card)', borderRadius:20, width:'100%', maxWidth:500, maxHeight:'92vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'var(--shadow-lg)', border:'1px solid var(--border)' }}>
        <div style={{ padding:'22px 24px 18px', borderBottom:'1px solid var(--border)', flexShrink:0, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h3 style={{ fontWeight:800, fontSize:15, color:'var(--text)', margin:0 }}>{task?'Edit Task':'Assign Task'}</h3>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Assign a task with deadline to a team member</p>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, background:'var(--bg-alt)', border:'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14}/></button>
        </div>

        <div style={{ padding:'20px 24px', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:14 }}>
          {err && <div style={{ display:'flex', gap:8, alignItems:'center', background:'var(--red-bg)', border:'1px solid var(--red-border)', borderRadius:10, padding:'10px 14px', fontSize:12.5, color:'var(--red)' }}><AlertCircle size={14}/>{err}</div>}

          <div><Lbl>Task Title *</Lbl><input className="input" value={form.title} onChange={e=>set('title',e.target.value)} placeholder="e.g. Prepare monthly payroll report"/></div>

          <div>
            <Lbl>Assign To *</Lbl>
            <div style={{ position:'relative' }}>
              <select className="input" style={{ appearance:'none', paddingRight:30 }} value={form.assigned_to} onChange={e=>set('assigned_to',e.target.value)}>
                <option value="">Select team member…</option>
                {users.map(u=>(
                  <option key={u.id} value={u.id}>{u.name} — {ROLE_LABELS[u.role]||u.role}</option>
                ))}
              </select>
              <ChevronDown size={13} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
            <div><Lbl>Deadline *</Lbl><input className="input" type="date" value={form.deadline} onChange={e=>set('deadline',e.target.value)}/></div>
            <div>
              <Lbl>Priority</Lbl>
              <div style={{ position:'relative' }}>
                <select className="input" style={{ appearance:'none', paddingRight:30 }} value={form.priority} onChange={e=>set('priority',e.target.value)}>
                  {PRIORITY.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
                </select>
                <ChevronDown size={13} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
              </div>
            </div>
          </div>

          <div><Lbl>Description</Lbl><textarea className="input" rows={3} value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Additional details, instructions, or context…" style={{ resize:'vertical' }}/></div>
        </div>

        <div style={{ padding:'14px 24px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0 }}>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ minWidth:130, justifyContent:'center' }}>
            {saving ? 'Saving…' : task ? 'Save Changes' : 'Assign Task'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══ TASK CARD ══════════════════════════════════════════════════ */
function TaskCard({ task, isAdmin, onEdit, onDelete, onStatusChange }) {
  const prio   = prioMap[task.priority]||prioMap.normal
  const status = statusMap[task.status]||statusMap.pending
  const days   = daysUntil(task.deadline?.slice(0,10))
  const isOverdue = task.status !== 'completed' && days !== null && days < 0

  return (
    <div style={{
      background:'var(--card)', border:`1px solid ${isOverdue?'#FECACA':'var(--border)'}`,
      borderLeft:`4px solid ${status.color}`, borderRadius:14, padding:'14px 16px',
      display:'flex', gap:14, alignItems:'flex-start', opacity:task.status==='completed'?0.7:1,
      transition:'box-shadow 0.15s',
    }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow='var(--shadow-md)'}
      onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}
    >
      <div style={{ flex:1, minWidth:0 }}>
        {/* Status + Priority + Deadline row */}
        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:6 }}>
          <span style={{ fontSize:9.5, fontWeight:700, color:status.color, background:status.bg, borderRadius:6, padding:'2px 8px' }}>
            {status.icon} {status.l}
          </span>
          <span style={{ fontSize:9.5, fontWeight:700, color:prio.color, background:prio.bg, border:`1px solid ${prio.bc}`, borderRadius:6, padding:'2px 8px' }}>
            {prio.l}
          </span>
          <DeadlineBadge deadline={task.deadline?.slice(0,10)}/>
        </div>

        {/* Title */}
        <div style={{ fontWeight:800, fontSize:14, color:'var(--text)', marginBottom:4, textDecoration:task.status==='completed'?'line-through':'none' }}>
          {task.title}
        </div>

        {task.description && (
          <div style={{ fontSize:11.5, color:'var(--text-muted)', marginBottom:6, lineHeight:1.5 }}>{task.description}</div>
        )}

        {/* Meta */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
          {task.assigned_to_name && (
            <span style={{ fontSize:10.5, color:'var(--text-sub)', background:'var(--bg-alt)', border:'1px solid var(--border)', borderRadius:6, padding:'1px 8px' }}>
              👤 {task.assigned_to_name} ({ROLE_LABELS[task.assigned_to_role]||task.assigned_to_role})
            </span>
          )}
          {task.assigned_by_name && (
            <span style={{ fontSize:10.5, color:'var(--text-muted)', background:'var(--bg-alt)', border:'1px solid var(--border)', borderRadius:6, padding:'1px 8px' }}>
              By {task.assigned_by_name}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0, alignItems:'flex-end' }}>
        {/* Status change buttons for assignee/admin */}
        {task.status !== 'completed' && (
          <div style={{ display:'flex', gap:4 }}>
            {task.status === 'pending' && (
              <button onClick={()=>onStatusChange(task.id,'in_progress')}
                style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8, background:'#EFF6FF', border:'1px solid #BFDBFE', color:'#1D4ED8', fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                <Clock size={11}/> Start
              </button>
            )}
            {task.status === 'in_progress' && (
              <button onClick={()=>onStatusChange(task.id,'completed')}
                style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8, background:'#F0FDF4', border:'1px solid #A7F3D0', color:'#059669', fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                <CheckCircle size={11}/> Complete
              </button>
            )}
          </div>
        )}
        {task.status === 'completed' && (
          <button onClick={()=>onStatusChange(task.id,'pending')}
            style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8, background:'var(--bg-alt)', border:'1px solid var(--border)', color:'var(--text-muted)', fontSize:11, fontWeight:700, cursor:'pointer' }}>
            Reopen
          </button>
        )}

        {/* Admin edit/delete */}
        {isAdmin && (
          <div style={{ display:'flex', gap:4 }}>
            <button onClick={()=>onEdit(task)} style={{ width:28, height:28, borderRadius:8, background:'var(--bg-alt)', border:'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Pencil size={11} color="var(--text-sub)"/>
            </button>
            <button onClick={()=>onDelete(task.id)} style={{ width:28, height:28, borderRadius:8, background:'var(--red-bg)', border:'1px solid var(--red-border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Trash2 size={11} color="var(--red)"/>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ══ MAIN PAGE ══════════════════════════════════════════════════ */
export default function TasksPage() {
  const { user } = useAuth()
  const isAdmin  = user?.role === 'admin'

  const [tasks,    setTasks]    = useState([])
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)
  const [filter,   setFilter]   = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/tasks`, { headers: hdr() })
      const d = await r.json()
      setTasks(d.tasks||[])
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [])

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return
    try {
      const r = await fetch(`${API}/api/tasks/users`, { headers: hdr() })
      const d = await r.json()
      setUsers(d.users||[])
    } catch(e) { console.error(e) }
  }, [isAdmin])

  useEffect(() => { load(); loadUsers() }, [load, loadUsers])

  async function handleStatusChange(id, status) {
    try {
      const r = await fetch(`${API}/api/tasks/${id}/status`, { method:'PATCH', headers:hdr(), body:JSON.stringify({status}) })
      if (!r.ok) { const d=await r.json(); throw new Error(d.error) }
      setTasks(p=>p.map(t=>t.id===id?{...t,status}:t))
    } catch(e) { alert(e.message) }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this task?')) return
    await fetch(`${API}/api/tasks/${id}`, { method:'DELETE', headers:hdr() })
    setTasks(p=>p.filter(t=>t.id!==id))
  }

  const filtered = tasks.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false
    if (roleFilter !== 'all' && t.assigned_to_role !== roleFilter) return false
    return true
  })

  const pending     = tasks.filter(t=>t.status==='pending').length
  const inProgress  = tasks.filter(t=>t.status==='in_progress').length
  const completed   = tasks.filter(t=>t.status==='completed').length
  const overdue     = tasks.filter(t=>t.status!=='completed' && daysUntil(t.deadline?.slice(0,10)) < 0).length

  const roles = [...new Set(tasks.map(t=>t.assigned_to_role).filter(Boolean))]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* ── Header ── */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, overflow:'hidden', boxShadow:'var(--shadow)' }}>
        <div style={{ height:4, background:'linear-gradient(90deg,#B8934A,#E8C97A,#B8934A)' }}/>
        <div className="page-header" style={{ padding:'18px 22px', margin:0 }}>
          <div>
            <h1 style={{ fontWeight:900, fontSize:22, color:'var(--text)', margin:0, letterSpacing:'-0.03em' }}>Tasks</h1>
            <p style={{ fontSize:12.5, color:'var(--text-muted)', marginTop:2 }}>
              {isAdmin ? 'Assign and track tasks across the team' : 'Tasks assigned to you'}
            </p>
          </div>
          <div className="page-header-actions">
            <button onClick={load} title="Refresh" style={{ width:36, height:36, borderRadius:10, background:'var(--bg-alt)', border:'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <RefreshCw size={14} color="var(--text-muted)"/>
            </button>
            {isAdmin && (
              <button className="btn btn-primary" onClick={()=>setModal({mode:'add'})} style={{ borderRadius:24 }}>
                <Plus size={14}/> Assign Task
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="r-grid-4">
        {[
          { l:'Total Tasks',  v:tasks.length,  c:'#1D4ED8', bg:'#EFF6FF', bc:'#BFDBFE' },
          { l:'Pending',      v:pending,        c:'#D97706', bg:'#FFFBEB', bc:'#FDE68A' },
          { l:'In Progress',  v:inProgress,     c:'#2563EB', bg:'#EFF6FF', bc:'#BFDBFE' },
          { l:overdue>0?`${overdue} Overdue`:'Completed', v:overdue>0?overdue:completed, c:overdue>0?'#DC2626':'#059669', bg:overdue>0?'#FEF2F2':'#F0FDF4', bc:overdue>0?'#FECACA':'#A7F3D0' },
        ].map(s=>(
          <div key={s.l} style={{ background:s.bg, border:`1px solid ${s.bc}`, borderRadius:16, padding:'18px 16px', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontWeight:900, fontSize:30, color:s.c, letterSpacing:'-0.04em', lineHeight:1 }}>{s.v}</div>
            <div style={{ fontSize:11, color:s.c, fontWeight:600, marginTop:7, opacity:0.8 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── Overdue banner ── */}
      {overdue>0 && (
        <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:12, padding:'11px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <AlertTriangle size={15} color="#DC2626"/>
          <span style={{ fontSize:13, fontWeight:700, color:'#DC2626' }}>{overdue} task{overdue>1?'s':''} overdue — action required</span>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', gap:2, borderBottom:'1px solid var(--border)' }}>
          {[{v:'all',l:'All'},{v:'pending',l:'Pending'},{v:'in_progress',l:'In Progress'},{v:'completed',l:'Completed'}].map(f=>(
            <button key={f.v} onClick={()=>setFilter(f.v)}
              style={{ padding:'7px 16px', fontSize:12, fontWeight:filter===f.v?700:500, color:filter===f.v?'var(--gold)':'var(--text-muted)', background:'none', border:'none', borderBottom:`2.5px solid ${filter===f.v?'var(--gold)':'transparent'}`, cursor:'pointer', fontFamily:'Poppins,sans-serif', marginBottom:-1, transition:'all 0.15s', whiteSpace:'nowrap' }}>
              {f.l}
              {f.v!=='all' && <span style={{ marginLeft:6, fontSize:10, fontWeight:700, background:'var(--bg-alt)', borderRadius:10, padding:'1px 6px' }}>
                {tasks.filter(t=>t.status===f.v).length}
              </span>}
            </button>
          ))}
        </div>

        {isAdmin && roles.length>0 && (
          <div style={{ position:'relative', marginLeft:'auto' }}>
            <select className="input" style={{ appearance:'none', paddingRight:26, fontSize:12, height:34, minWidth:120 }}
              value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              {roles.map(r=><option key={r} value={r}>{ROLE_LABELS[r]||r}</option>)}
            </select>
            <ChevronDown size={12} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
          </div>
        )}
      </div>

      {/* ── Task List ── */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[1,2,3].map(i=><div key={i} className="sk" style={{ height:100, borderRadius:14 }}/>)}
        </div>
      ) : filtered.length===0 ? (
        <div style={{ textAlign:'center', padding:'80px 20px' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
          <div style={{ fontWeight:700, fontSize:16, color:'var(--text-sub)' }}>
            {tasks.length===0 ? 'No tasks yet' : 'No tasks match this filter'}
          </div>
          <div style={{ fontSize:12.5, color:'var(--text-muted)', marginTop:4 }}>
            {isAdmin && tasks.length===0 ? 'Use "Assign Task" to create the first task' : ''}
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map(task=>(
            <TaskCard
              key={task.id}
              task={task}
              isAdmin={isAdmin}
              onEdit={t=>setModal({mode:'edit',task:t})}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {modal && (
        <TaskModal
          task={modal.mode==='edit'?modal.task:null}
          users={users}
          onSave={()=>{ setModal(null); load() }}
          onClose={()=>setModal(null)}
        />
      )}
    </div>
  )
}
