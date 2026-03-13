'use client'
import { useState, useEffect, useCallback } from 'react'
import { leaveApi, empApi } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import { Check, X, Clock, Plus } from 'lucide-react'

const S = { approved:{l:'Approved',c:'badge-success'}, pending:{l:'Pending',c:'badge-warning'}, rejected:{l:'Rejected',c:'badge-danger'} }
const TC = { Annual:'#B8860B', Sick:'#1D6FA4', Emergency:'#C0392B', Unpaid:'#6B5D4A', Other:'#A89880' }

function NewLeaveModal({ employees, onSave, onClose }) {
  const [form, setForm] = useState({ emp_id:'', type:'Annual', from_date:'', to_date:'', reason:'' })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  const days = form.from_date && form.to_date ? Math.max(1,Math.round((new Date(form.to_date)-new Date(form.from_date))/(86400000))+1) : 0
  async function handleSave() {
    if (!form.emp_id||!form.from_date||!form.to_date) return
    setSaving(true)
    try { await leaveApi.create({...form,days}); onSave() }
    catch(e) { alert(e.message) } finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:420}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <h3 style={{fontWeight:700,fontSize:16,color:'#1A1612'}}>New Leave Request</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17}/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div><label className="input-label">Employee *</label>
            <select className="input" value={form.emp_id} onChange={e=>set('emp_id',e.target.value)}>
              <option value="">Select…</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div><label className="input-label">Leave Type</label>
            <select className="input" value={form.type} onChange={e=>set('type',e.target.value)}>
              {['Annual','Sick','Emergency','Unpaid','Other'].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div><label className="input-label">From *</label><input className="input" type="date" value={form.from_date} onChange={e=>set('from_date',e.target.value)}/></div>
            <div><label className="input-label">To *</label><input className="input" type="date" value={form.to_date} onChange={e=>set('to_date',e.target.value)}/></div>
          </div>
          {days>0 && <div style={{background:'#FDF6E3',border:'1px solid #F0D78C',borderRadius:9,padding:'8px 12px',fontSize:13,color:'#B8860B',fontWeight:600}}>{days} day{days>1?'s':''}</div>}
          <div><label className="input-label">Reason</label><input className="input" value={form.reason} onChange={e=>set('reason',e.target.value)} placeholder="Reason for leave"/></div>
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:18}}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving||!form.emp_id||!form.from_date||!form.to_date}>{saving?'Saving…':'Submit Request'}</button>
        </div>
      </div>
    </div>
  )
}

export default function LeavesPage() {
  const [leaves,    setLeaves]    = useState([])
  const [employees, setEmployees] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('All')
  const [modal,     setModal]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [lv, emps] = await Promise.all([leaveApi.list(), empApi.list()])
      setLeaves(lv.leaves); setEmployees(emps.employees)
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useSocket({
    'leave:created': l => setLeaves(p=>[l,...p]),
    'leave:updated': l => setLeaves(p=>p.map(x=>x.id===l.id?{...x,...l}:x)),
  })

  async function setStatus(id, status) {
    try { const d = await leaveApi.setStatus(id,status); setLeaves(p=>p.map(x=>x.id===d.leave.id?{...x,...d.leave}:x)) }
    catch(e) { alert(e.message) }
  }

  const pending  = leaves.filter(l=>l.status==='pending').length
  const filtered = filter==='All' ? leaves : leaves.filter(l=>l.status===filter.toLowerCase())

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,animation:'slideUp 0.35s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div className="tabs">
          {['All','Pending','Approved','Rejected'].map(f=>(
            <button key={f} className={`tab${filter===f?' active':''}`} onClick={()=>setFilter(f)}>
              {f}{f==='Pending'&&pending>0?` (${pending})`:''}</button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>setModal(true)}><Plus size={13}/> New Request</button>
      </div>

      {loading ? <div style={{padding:40,textAlign:'center',color:'#A89880'}}>Loading…</div> : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {filtered.map((leave,i)=>{
            const emp = employees.find(e=>e.id===leave.emp_id)
            const tc  = TC[leave.type]||'#A89880'
            return (
              <div key={leave.id} className="card" style={{padding:'14px 18px',animation:`slideUp 0.3s ${i*0.04}s ease both`}}>
                <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
                  <div style={{width:40,height:40,borderRadius:10,background:'#FDF6E3',border:'1px solid #F0D78C',display:'flex',alignItems:'center',justifyContent:'center',fontSize:19,flexShrink:0}}>{emp?.avatar||leave.avatar||'👤'}</div>
                  <div style={{flex:1,minWidth:150}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                      <span style={{fontWeight:700,color:'#1A1612',fontSize:14}}>{emp?.name||leave.name}</span>
                      <span style={{fontSize:11,padding:'2px 8px',borderRadius:6,background:`${tc}18`,color:tc,fontWeight:600,border:`1px solid ${tc}40`}}>{leave.type}</span>
                      <span className={`badge ${S[leave.status]?.c}`}>{S[leave.status]?.l}</span>
                    </div>
                    <div style={{fontSize:12,color:'#A89880'}}>
                      <span style={{fontFamily:'monospace'}}>{leave.from_date}</span> → <span style={{fontFamily:'monospace'}}>{leave.to_date}</span>
                      &nbsp;·&nbsp;<strong style={{color:'#6B5D4A'}}>{leave.days}d</strong>
                      {leave.reason && <>&nbsp;·&nbsp;{leave.reason}</>}
                    </div>
                  </div>
                  {leave.status==='pending' && (
                    <div style={{display:'flex',gap:8,flexShrink:0}}>
                      <button className="btn btn-success btn-sm" onClick={()=>setStatus(leave.id,'approved')}><Check size={12}/> Approve</button>
                      <button className="btn btn-danger  btn-sm" onClick={()=>setStatus(leave.id,'rejected')}><X size={12}/> Reject</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {filtered.length===0&&<div className="empty-state"><Clock size={28}/><p>No {filter.toLowerCase()!=='all'?filter.toLowerCase():''} requests</p></div>}
        </div>
      )}
      {modal && <NewLeaveModal employees={employees} onClose={()=>setModal(false)} onSave={()=>{setModal(false);load()}}/>}
    </div>
  )
}
