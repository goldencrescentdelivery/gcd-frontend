'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Eye, EyeOff, LogIn } from 'lucide-react'

export default function LoginPage() {
  const { login, loading, error } = useAuth()
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const result = await login(email, password)
    if (result.ok) {
      if (result.role === 'driver') router.replace('/driver')
      else if (result.role === 'poc') router.replace('/dashboard/poc')
      else router.replace('/dashboard/overview')
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes spin   { to{transform:rotate(360deg)} }

        .login-input {
          width: 100%;
          padding: 12px 16px;
          border: 1.5px solid #E2E8F0;
          border-radius: 10px;
          font-size: 14px;
          color: #1E293B;
          background: #F8FAFC;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          box-sizing: border-box;
          font-family: 'Poppins', sans-serif;
        }
        .login-input:focus {
          border-color: #B8860B;
          box-shadow: 0 0 0 3px rgba(184,134,11,0.1);
          background: #fff;
        }
        .login-input::placeholder { color: #94A3B8; }

        .sign-btn {
          width: 100%;
          padding: 13px;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          font-family: 'Poppins', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
          background: linear-gradient(135deg, #B8860B 0%, #D4A017 100%);
          color: #fff;
          box-shadow: 0 4px 16px rgba(184,134,11,0.3);
        }
        .sign-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(184,134,11,0.4);
        }
        .sign-btn:active:not(:disabled) { transform: translateY(0); }
        .sign-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        @media (max-width: 768px) {
          .left-panel  { display: none !important; }
          .right-panel { border-radius: 0 !important; }
          .login-wrap  { padding: 0 !important; }
        }
      `}</style>

      {/* ── Page wrapper ── */}
      <div className="login-wrap" style={{
        minHeight: '100vh',
        display: 'flex',
        background: '#F1F5F9',
        padding: 20,
        gap: 20,
        boxSizing: 'border-box',
        alignItems: 'stretch',
      }}>

        {/* ══════════════ LEFT PANEL ══════════════ */}
        <div className="left-panel" style={{
          flex: '1 1 0',
          minWidth: 0,
          borderRadius: 20,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          animation: 'fadeIn 0.5s ease',
        }}>

          {/* Award image — full bleed top half */}
          <div style={{ flex: '1 1 0', overflow: 'hidden', position: 'relative', minHeight: 0 }}>
            <img
              src="/award.jpeg"
              alt="Amazon Best Performance Award"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={e => { e.currentTarget.parentElement.style.background='linear-gradient(135deg,#FEF3C7,#FDE68A)'; e.currentTarget.style.display='none' }}
            />
            {/* subtle overlay at bottom for readability */}
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:80, background:'linear-gradient(to top, rgba(255,255,255,0.9), transparent)', pointerEvents:'none' }}/>
          </div>

          {/* Brand + award info — bottom section */}
          <div style={{ padding: '28px 36px 36px', background: '#fff' }}>
            {/* Logo + name row */}
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
              <div style={{ width:52, height:52, borderRadius:14, overflow:'hidden', border:'1.5px solid #E2E8F0', flexShrink:0, background:'#fff' }}>
                <img src="/logo.webp" alt="GCD" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
              </div>
              <div>
                <div style={{ fontFamily:"'Poppins',sans-serif", fontWeight:800, fontSize:18, color:'#1E293B', letterSpacing:'-0.02em', lineHeight:1.2 }}>
                  Golden Crescent
                </div>
                <div style={{ fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'#B8860B', fontWeight:600, marginTop:2 }}>
                  Operations Dashboard
                </div>
              </div>
            </div>

            {/* Award badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)',
              border: '1px solid #FDE68A',
              borderRadius: 10,
              padding: '10px 16px',
              marginBottom: 14,
            }}>
              <span style={{ fontSize:20 }}>🏆</span>
              <div>
                <div style={{ fontFamily:"'Poppins',sans-serif", fontWeight:700, fontSize:13, color:'#92400E' }}>
                  Amazon Outstanding DSP Award 2025
                </div>
                <div style={{ fontSize:11, color:'#B45309', marginTop:1 }}>
                  DSP Lite · Together, We Deliver
                </div>
              </div>
            </div>

            <p style={{ fontSize:12.5, color:'#64748B', margin:0, lineHeight:1.7 }}>
              Proud recipients of Amazon's Outstanding DSP recognition — a testament to our team's relentless dedication and operational excellence.
            </p>

            <p style={{ fontSize:11.5, color:'#94A3B8', margin:'20px 0 0', fontStyle:'italic' }}>
              "Excellence is not a destination, it's a continuous journey."
            </p>
          </div>
        </div>

        {/* ══════════════ RIGHT PANEL ══════════════ */}
        <div className="right-panel" style={{
          flex: '1 1 0',
          minWidth: 0,
          background: '#fff',
          borderRadius: 20,
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '52px 48px',
          boxSizing: 'border-box',
          animation: 'fadeUp 0.5s ease',
        }}>
          <div style={{ width:'100%', maxWidth:380 }}>

            {/* Heading */}
            <div style={{ marginBottom:36 }}>
              <h1 style={{ fontFamily:"'Poppins',sans-serif", fontWeight:800, fontSize:28, color:'#1E293B', margin:'0 0 8px', letterSpacing:'-0.03em' }}>
                Welcome back 👋
              </h1>
              <p style={{ fontSize:14, color:'#94A3B8', margin:0, lineHeight:1.5 }}>
                Sign in to your GCD Operations Dashboard to continue.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:20 }}>

              <div>
                <label style={{ display:'block', fontSize:11.5, fontWeight:600, color:'#475569', marginBottom:8, letterSpacing:'0.05em', textTransform:'uppercase' }}>
                  Email Address
                </label>
                <input
                  className="login-input"
                  type="email"
                  placeholder="you@goldencrescent.ae"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label style={{ display:'block', fontSize:11.5, fontWeight:600, color:'#475569', marginBottom:8, letterSpacing:'0.05em', textTransform:'uppercase' }}>
                  Password
                </label>
                <div style={{ position:'relative' }}>
                  <input
                    className="login-input"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{ paddingRight:46 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94A3B8', display:'flex', padding:4 }}
                  >
                    {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'11px 14px', fontSize:13, color:'#DC2626', display:'flex', alignItems:'center', gap:8 }}>
                  <span>⚠️</span> {error}
                </div>
              )}

              <button type="submit" className="sign-btn" disabled={loading} style={{ marginTop:4 }}>
                {loading
                  ? <><span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }}/> Signing in…</>
                  : <><LogIn size={16}/> Sign In</>
                }
              </button>
            </form>

            <div style={{ marginTop:40, paddingTop:24, borderTop:'1px solid #F1F5F9', textAlign:'center' }}>
              <p style={{ fontSize:12, color:'#CBD5E1', margin:0, lineHeight:1.7 }}>
                Authorized personnel only.<br/>
                Contact your administrator for access.
              </p>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}