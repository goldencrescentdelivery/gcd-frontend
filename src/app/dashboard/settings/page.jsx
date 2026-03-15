'use client'
import React, { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL

export default function SettingsPage() {
  const { user } = useAuth()
  const [current, setCurrent] = useState('')
  const [newPw,   setNewPw]   = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCur, setShowCur] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [done,    setDone]    = useState(false)
  const [err,     setErr]     = useState(null)

  async function handleSave() {
    if (!current || !newPw) return setErr('All fields required')
    if (newPw !== confirm)  return setErr('New passwords do not match')
    if (newPw.length < 6)   return setErr('Password must be at least 6 characters')
    setSaving(true); setErr(null)
    try {
      const res = await fetch(`${API}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gcd_token')}` },
        body: JSON.stringify({ currentPassword: current, newPassword: newPw })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(true)
      setCurrent(''); setNewPw(''); setConfirm('')
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth:480, margin:'0 auto' }}>
      <div className="card">
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:'linear-gradient(135deg,#FDF6E3,#FEF3D0)', border:'1px solid #F0D78C', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Lock size={22} color="#B8860B"/>
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:17, color:'#1A1612' }}>Change Password</div>
            <div style={{ fontSize:12, color:'#A89880', marginTop:2 }}>{user?.name} · {user?.role}</div>
          </div>
        </div>

        {done && (
          <div style={{ background:'#ECFDF5', border:'1px solid #A7F3D0', borderRadius:10, padding:'12px 16px', marginBottom:18, display:'flex', gap:10, alignItems:'center' }}>
            <CheckCircle size={16} color="#2E7D52"/>
            <span style={{ fontSize:13, color:'#2E7D52', fontWeight:600 }}>Password updated successfully!</span>
          </div>
        )}

        {err && (
          <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:10, padding:'12px 16px', marginBottom:18, fontSize:13, color:'#C0392B' }}>{err}</div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label className="input-label">Current Password</label>
            <div style={{ position:'relative' }}>
              <input className="input" type={showCur?'text':'password'} value={current} onChange={e=>setCurrent(e.target.value)} style={{ paddingRight:42 }} autoComplete="current-password"/>
              <button type="button" onClick={()=>setShowCur(p=>!p)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#A89880', padding:0 }}>
                {showCur?<EyeOff size={15}/>:<Eye size={15}/>}
              </button>
            </div>
          </div>

          <div>
            <label className="input-label">New Password</label>
            <div style={{ position:'relative' }}>
              <input className="input" type={showNew?'text':'password'} value={newPw} onChange={e=>setNewPw(e.target.value)} style={{ paddingRight:42 }} autoComplete="new-password"/>
              <button type="button" onClick={()=>setShowNew(p=>!p)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#A89880', padding:0 }}>
                {showNew?<EyeOff size={15}/>:<Eye size={15}/>}
              </button>
            </div>
            {/* Strength indicator */}
            {newPw && (
              <div style={{ marginTop:6 }}>
                <div style={{ display:'flex', gap:4, marginBottom:4 }}>
                  {[1,2,3,4].map(i => {
                    const strength = newPw.length >= 8 && /[A-Z]/.test(newPw) && /[0-9]/.test(newPw) && /[^A-Za-z0-9]/.test(newPw) ? 4
                      : newPw.length >= 8 && (/[A-Z]/.test(newPw) || /[0-9]/.test(newPw)) ? 3
                      : newPw.length >= 6 ? 2 : 1
                    const colors = ['#C0392B','#B45309','#1D6FA4','#2E7D52']
                    return <div key={i} style={{ flex:1, height:4, borderRadius:2, background: i<=strength ? colors[strength-1] : '#EAE6DE', transition:'background 0.3s' }}/>
                  })}
                </div>
                <div style={{ fontSize:10.5, color:'#A89880' }}>
                  {newPw.length < 6 ? 'Too short' : newPw.length < 8 ? 'Weak' : /[A-Z]/.test(newPw) && /[0-9]/.test(newPw) ? /[^A-Za-z0-9]/.test(newPw) ? '💪 Strong' : 'Good' : 'Add uppercase & numbers'}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="input-label">Confirm New Password</label>
            <input className="input" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password"/>
            {confirm && newPw && (
              <div style={{ fontSize:11, marginTop:4, color: confirm===newPw ? '#2E7D52' : '#C0392B', fontWeight:500 }}>
                {confirm===newPw ? '✓ Passwords match' : '✗ Passwords do not match'}
              </div>
            )}
          </div>

          <button className="btn btn-primary" onClick={handleSave} disabled={saving||!current||!newPw||!confirm} style={{ marginTop:8 }}>
            {saving ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  )
}
