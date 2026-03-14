'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export default function LoginPage() {
  const { login, loading, error } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const result = await login(email, password)
    if (result.ok) {
      if (result.role === 'driver') router.replace('/driver')
      else if (result.role === 'poc') router.replace('/dashboard/poc')
      else router.replace('/dashboard/analytics')
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#FDF6E3 0%,#F8F7F4 50%,#FEF9EC 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:400, animation:'slideUp 0.4s ease' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ width:64, height:64, borderRadius:18, background:'linear-gradient(135deg,#B8860B,#D4A017)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 16px', boxShadow:'0 8px 32px rgba(184,134,11,0.3)' }}>🌙</div>
          <div style={{ fontFamily:"'Poppins',sans-serif", fontWeight:800, fontSize:22, color:'#1A1612', marginBottom:4, letterSpacing:'-0.03em' }}>Golden Crescent</div>
          <div style={{ fontSize:11, letterSpacing:'0.18em', textTransform:'uppercase', color:'#B8860B', fontWeight:600 }}>Operations Dashboard</div>
        </div>

        <div style={{ background:'#FFFFFF', border:'1px solid #EAE6DE', borderRadius:20, padding:32, boxShadow:'0 4px 40px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontWeight:700, fontSize:18, color:'#1A1612', marginBottom:4, letterSpacing:'-0.02em' }}>Welcome back</h2>
          <p style={{ fontSize:13, color:'#A89880', marginBottom:28 }}>Sign in to your dashboard</p>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label className="input-label">Email address</label>
              <input className="input" type="email" placeholder="you@goldencrescent.ae" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="input-label">Password</label>
              <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && (
              <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:9, padding:'10px 14px', fontSize:13, color:'#C0392B' }}>{error}</div>
            )}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width:'100%', justifyContent:'center', padding:'13px', fontSize:14, marginTop:4 }}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
