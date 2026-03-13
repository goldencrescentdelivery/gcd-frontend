'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Plus, X, Pencil, Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL
const ROLES = ['driver','poc','finance','manager','admin']
const STATIONS = ['DDB7','DDB6','DSH6','DXD3']
const ROLE_COLORS = { admin:'#7C3AED', manager:'#1D6FA4', finance:'#2E7D52', poc:'#B8860B', driver:'#6B5D4A' }

function hdr() {
  return { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gcd_token')}` }
}

function UserModal({ user, onSave, onClose }) {
  const isEdit = !!user
  const [name,     setName]     = useState(user?.name||'')
  const [email,    setEmail]    = useState(user?.email||'')
  const [password, setPassword] = useState('')
  const [role,     setRole]     = useState(user?.role||'driver')
  const [empId,    setEmpId]    = useState(user?.emp_id||'')
  const [station,  setStation]  = useState(user?.station_code||'DDB7')
  const [status,   setStatus]   = useState(user?.status||'active')
  const [showPw,   setShowPw]   = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState(null)

  async function handleSave() {
    if (!name||!email) return setErr('Name and email required')
    if (!isEdit && !password) return setErr('Password required for new account')
    setSaving(true); setErr(null)
    try {
      const body = { name, email, role, emp_id: empId||null, station_code: role==='poc'?station:null, status }
      if (password) body.password = password
      const res = await fetch(`${API}/api/auth/users${isEdit?`/${user.id}`:''}`, {
        method: isEdit ? 'PUT' : 'POST', headers: hdr(), body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSave()
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:460 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18 }}>
          <h3 style={{ fontWeight:700,fontSize:16,color:'#1A1612' }}>{isEdit?'Edit User Account':'New User Account'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17}/></button>
        </div>
        {err && <div style={{ background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:9,padding:'10px 14px',fontSize:13,color:'#C0392B',marginBottom:12 }}>{err}</div>}
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
            <div><label className="input-label">Full Name *</label>
              <input className="input" value={name} onChange={e=>setName(e.target.value)} autoComplete="off"/></div>
            <div><label className="input-label">Employee ID</label>
              <input className="input" value={empId} onChange={e=>setEmpId(e.target.value)} placeholder="e.g. DA001"/></div>
          </div>
          <div><label className="input-label">Email *</label>
            <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="off"/></div>
          <div>
            <label className="input-label">{isEdit?'New Password (leave blank to keep)':'Password *'}</label>
            <div style={{ position:'relative' }}>
              <input className="input" type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} style={{ paddingRight:40 }} autoComplete="new-password"/>
              <button type="button" onClick={()=>setShowPw(p=>!p)} style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#A89880',padding:0 }}>
                {showPw?<EyeOff size={15}/>:<Eye size={15}/>}
              </button>
            </div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
            <div><label className="input-label">Role *</label>
              <select className="input" value={role} onChange={e=>setRole(e.target.value)}>
                {ROLES.map(r=><option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
              </select></div>
            <div><label className="input-label">Status</label>
              <select className="input" value={status} onChange={e=>setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive (blocked)</option>
              </select></div>
          </div>
          {role==='poc' && (
            <div><label className="input-label">POC Station</label>
              <select className="input" value={station} onChange={e=>setStation(e.target.value)}>
                {STATIONS.map(s=><option key={s}>{s}</option>)}
              </select></div>
          )}
        </div>
        <div style={{ display:'flex',gap:10,justifyContent:'flex-end',marginTop:20 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':isEdit?'Save Changes':'Create Account'}</button>
        </div>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)
  const [showPw,  setShowPw]  = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/api/auth/users`, { headers: hdr() })
      const data = await res.json()
      setUsers(data.users||[])
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(u) {
    if (!confirm(`Delete account for ${u.name}?`)) return
    await fetch(`${API}/api/auth/users/${u.id}`, { method:'DELETE', headers: hdr() })
    load()
  }

  async function toggleStatus(u) {
    const newStatus = u.status === 'active' ? 'inactive' : 'active'
    await fetch(`${API}/api/auth/users/${u.id}`, {
      method:'PUT', headers: hdr(),
      body: JSON.stringify({ status: newStatus })
    })
    load()
  }

  const grouped = ROLES.reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r)
    return acc
  }, {})

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:16,animation:'slideUp 0.35s ease' }}>
      <div style={{ display:'flex',justifyContent:'flex-end' }}>
        <button className="btn btn-primary" onClick={()=>setModal({mode:'add',user:null})}>
          <Plus size={14}/> New Account
        </button>
      </div>

      {loading ? <div style={{ padding:40,textAlign:'center',color:'#A89880' }}>Loading…</div> : (
        Object.entries(grouped).filter(([,us])=>us.length>0).map(([role, us]) => (
          <div key={role} className="card" style={{ padding:0,overflow:'hidden' }}>
            <div style={{ padding:'12px 18px',background:'#FAFAF8',borderBottom:'1px solid #EAE6DE',display:'flex',alignItems:'center',gap:8 }}>
              <span style={{ fontSize:12,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:ROLE_COLORS[role]||'#6B5D4A' }}>{role}</span>
              <span style={{ fontSize:11,color:'#A89880' }}>({us.length})</span>
            </div>
            <table className="data-table">
              <thead><tr>
                <th>Name</th><th>Email</th><th>Password</th>
                <th>Employee ID</th><th>Station</th><th>Status</th><th></th>
              </tr></thead>
              <tbody>
                {us.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight:600,color:'#1A1612' }}>{u.name}</td>
                    <td style={{ fontFamily:'monospace',fontSize:12,color:'#6B5D4A' }}>{u.email}</td>
                    <td>
                      <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                        <span style={{ fontFamily:'monospace',fontSize:12,color:'#1A1612',letterSpacing: showPw[u.id]?'normal':'0.15em' }}>
                          {showPw[u.id] ? (u.plain_password||'—') : '••••••••'}
                        </span>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setShowPw(p=>({...p,[u.id]:!p[u.id]}))}>
                          {showPw[u.id]?<EyeOff size={12}/>:<Eye size={12}/>}
                        </button>
                      </div>
                    </td>
                    <td style={{ fontFamily:'monospace',fontSize:12,color:'#A89880' }}>{u.emp_id||'—'}</td>
                    <td>
                      {u.station_code
                        ? <span style={{ fontSize:11,fontWeight:700,color:'#B8860B',background:'#FDF6E3',border:'1px solid #F0D78C',borderRadius:5,padding:'2px 7px' }}>{u.station_code}</span>
                        : <span style={{ color:'#C4B49A',fontSize:12 }}>—</span>}
                    </td>
                    <td>
                      <button onClick={()=>toggleStatus(u)} style={{ cursor:'pointer',background:'none',border:'none',padding:0 }}>
                        <span className={`badge ${u.status==='active'?'badge-success':'badge-danger'}`} style={{ cursor:'pointer' }}>
                          {u.status==='active'?'Active':'Blocked'}
                        </span>
                      </button>
                    </td>
                    <td>
                      <div style={{ display:'flex',gap:5 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setModal({mode:'edit',user:u})}><Pencil size={13}/></button>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color:'#C0392B' }} onClick={()=>handleDelete(u)}><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {modal && <UserModal user={modal.user} onSave={()=>{setModal(null);load()}} onClose={()=>setModal(null)}/>}
    </div>
  )
}
