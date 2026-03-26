'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Search, Shield, X, Mail, Building2, CheckCircle, XCircle } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL

const ROLE_CFG = {
  admin:           { c:'#7C3AED', bg:'#F5F3FF', bc:'#DDD6FE', label:'Admin' },
  general_manager: { c:'#0F766E', bg:'#F0FDFA', bc:'#99F6E4', label:'Manager' },
  hr:              { c:'#B45309', bg:'#FFFBEB', bc:'#FCD34D', label:'HR' },
  accountant:      { c:'#2E7D52', bg:'#ECFDF5', bc:'#A7F3D0', label:'Accountant' },
  poc:             { c:'#B8860B', bg:'#FDF6E3', bc:'#F0D78C', label:'POC' },
}

const ADMIN_ROLES = ['admin','general_manager','hr','accountant','poc']

function hdr() { return { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }

export default function AdminsPage() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res  = await fetch(`${API}/api/auth/users`, { headers: hdr() })
      const data = await res.json()
      setUsers((data.users || []).filter(u => ADMIN_ROLES.includes(u.role)))
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = users.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  )

  const byRole = ADMIN_ROLES.reduce((acc, r) => {
    acc[r] = filtered.filter(u => u.role === r)
    return acc
  }, {})

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontWeight:900, fontSize:19, color:'var(--text)', letterSpacing:'-0.03em', marginBottom:2 }}>Admin Staff</h2>
          <p style={{ fontSize:12.5, color:'var(--text-muted)' }}>{users.length} team members</p>
        </div>
      </div>

      {/* Search */}
      <div style={{ position:'relative', maxWidth:360 }}>
        <Search size={14} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
        <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, role…" style={{ paddingLeft:38, borderRadius:24 }}/>
        {search && <button onClick={()=>setSearch('')} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:0, display:'flex' }}><X size={13}/></button>}
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
          {[1,2,3].map(i=><div key={i} className="sk" style={{ height:72, borderRadius:14 }}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <Shield size={40} style={{ margin:'0 auto 12px', display:'block', opacity:0.15 }}/>
          <div style={{ fontWeight:700, fontSize:15, color:'var(--text-sub)' }}>{search ? `No results for "${search}"` : 'No admin staff found'}</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {ADMIN_ROLES.map(role => {
            const group = byRole[role]
            if (!group?.length) return null
            const rc = ROLE_CFG[role]
            return (
              <div key={role}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:rc.c, background:rc.bg, border:`1px solid ${rc.bc}`, borderRadius:20, padding:'3px 10px' }}>{rc.label}</span>
                  <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:500 }}>{group.length}</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {group.map((u, i) => (
                    <div key={u.id} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'13px 15px', display:'flex', alignItems:'center', gap:13, animation:`slideUp 0.3s ${i*0.04}s ease both` }}>
                      <div style={{ width:42, height:42, borderRadius:13, background:`linear-gradient(135deg,${rc.bg},#FFF)`, border:`2px solid ${rc.bc}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:rc.c, flexShrink:0 }}>
                        {u.name?.slice(0,2).toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:13.5, color:'var(--text)', marginBottom:2 }}>{u.name}</div>
                        <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
                          <Mail size={11} color="var(--text-muted)"/>
                          <span style={{ fontSize:11.5, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email}</span>
                          {u.station_code && (
                            <>
                              <Building2 size={11} color="var(--text-muted)" style={{ marginLeft:4 }}/>
                              <span style={{ fontSize:11.5, color:'var(--text-muted)' }}>{u.station_code}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ flexShrink:0 }}>
                        {u.status === 'active'
                          ? <CheckCircle size={16} color="#10B981"/>
                          : <XCircle size={16} color="#EF4444"/>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
