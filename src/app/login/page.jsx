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
        @keyframes fadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes shimmer {
          0%{background-position:200% center}
          100%{background-position:-200% center}
        }
        .login-input {
          width:100%;
          padding:12px 14px;
          border:1.5px solid #E5E0D8;
          border-radius:11px;
          font-size:14px;
          color:#1A1612;
          background:#FAFAF8;
          outline:none;
          transition:border-color 0.2s, box-shadow 0.2s;
          box-sizing:border-box;
          font-family:'Poppins',sans-serif;
        }
        .login-input:focus {
          border-color:#B8860B;
          box-shadow:0 0 0 3px rgba(184,134,11,0.12);
          background:#fff;
        }
        .login-input::placeholder { color:#C4B89A; }
        .sign-btn {
          width:100%;
          padding:13px;
          border:none;
          border-radius:12px;
          font-size:14px;
          font-weight:700;
          font-family:'Poppins',sans-serif;
          letter-spacing:0.01em;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          transition:all 0.2s;
          background:linear-gradient(135deg,#B8860B 0%,#D4A017 50%,#C8980E 100%);
          color:#fff;
          box-shadow:0 4px 20px rgba(184,134,11,0.35);
        }
        .sign-btn:hover:not(:disabled) {
          transform:translateY(-1px);
          box-shadow:0 8px 28px rgba(184,134,11,0.45);
        }
        .sign-btn:active:not(:disabled) { transform:translateY(0); }
        .sign-btn:disabled { opacity:0.65; cursor:not-allowed; }
        @media(max-width:768px){
          .left-panel { display:none !important; }
          .right-panel { border-radius:0 !important; min-height:100vh !important; }
          .login-wrap { padding:0 !important; }
        }
      `}</style>

      <div className="login-wrap" style={{
        minHeight:'100vh',
        display:'flex',
        alignItems:'stretch',
        background:'linear-gradient(135deg,#FDF6E3 0%,#F5EDCC 100%)',
        padding:'24px',
        gap:24,
        boxSizing:'border-box',
      }}>

        {/* ── LEFT PANEL ───────────────────────── */}
        <div className="left-panel" style={{
          flex:'1 1 0',
          borderRadius:24,
          background:'linear-gradient(160deg,#FFFBF0 0%,#FEF3C7 45%,#FDE68A 100%)',
          display:'flex',
          flexDirection:'column',
          alignItems:'center',
          justifyContent:'space-between',
          padding:'52px 44px',
          overflow:'hidden',
          position:'relative',
          animation:'fadeIn 0.6s ease',
          border:'1px solid #F5DFA0',
        }}>

          {/* decorative glow circles */}
          <div style={{ position:'absolute', top:-60, right:-60, width:240, height:240, borderRadius:'50%', background:'radial-gradient(circle,rgba(184,134,11,0.15) 0%,transparent 70%)', pointerEvents:'none' }}/>
          <div style={{ position:'absolute', bottom:-40, left:-40, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle,rgba(212,160,23,0.12) 0%,transparent 70%)', pointerEvents:'none' }}/>

          {/* brand */}
          <div style={{ textAlign:'center', animation:'fadeUp 0.7s ease' }}>
            <div style={{
              width:90, height:90,
              borderRadius:24,
              background:'#fff',
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 20px',
              boxShadow:'0 8px 32px rgba(184,134,11,0.25)',
              overflow:'hidden',
              border:'2px solid rgba(184,134,11,0.15)',
            }}>
              <img src="/logo.webp" alt="GCD" style={{ width:90, height:90, objectFit:'contain' }}/>
            </div>
            <div style={{ fontFamily:"'Poppins',sans-serif", fontWeight:800, fontSize:26, color:'#1A1612', letterSpacing:'-0.03em', marginBottom:6 }}>
              Golden Crescent
            </div>
            <div style={{ fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', color:'#9A6E00', fontWeight:600 }}>
              Operations Dashboard
            </div>
          </div>

          {/* award card */}
          <div style={{
            width:'100%',
            background:'#fff',
            border:'1px solid rgba(184,134,11,0.25)',
            borderRadius:18,
            overflow:'hidden',
            animation:'fadeUp 0.9s ease',
            boxShadow:'0 4px 24px rgba(184,134,11,0.15)',
          }}>
            <img
              src="/award.jpeg"
              alt="Amazon Best Performance Award"
              style={{ width:'100%', display:'block', maxHeight:220, objectFit:'cover' }}
              onError={e => { e.currentTarget.style.display='none' }}
            />
            <div style={{ padding:'14px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={{ fontSize:18 }}>🏆</span>
                <span style={{ fontFamily:"'Poppins',sans-serif", fontWeight:700, fontSize:13, color:'#B8860B' }}>
                  Amazon Best Performance Award
                </span>
              </div>
              <p style={{ fontSize:12, color:'#7A6A50', margin:0, lineHeight:1.6 }}>
                Proud recipients of Amazon's Best Performance recognition — a testament to our team's dedication and excellence.
              </p>
            </div>
          </div>

          {/* footer quote */}
          <div style={{ textAlign:'center', animation:'fadeUp 1.1s ease' }}>
            <p style={{ fontSize:12, color:'#A08040', margin:0, fontStyle:'italic', lineHeight:1.6 }}>
              "Excellence is not a destination,<br/>it's a continuous journey."
            </p>
          </div>
        </div>

        {/* ── RIGHT PANEL ──────────────────────── */}
        <div className="right-panel" style={{
          width:'100%',
          maxWidth:440,
          background:'#fff',
          borderRadius:24,
          display:'flex',
          flexDirection:'column',
          alignItems:'center',
          justifyContent:'center',
          padding:'52px 44px',
          boxShadow:'0 8px 48px rgba(0,0,0,0.08)',
          animation:'fadeUp 0.5s ease',
          boxSizing:'border-box',
          flexShrink:0,
        }}>

          {/* mobile-only logo */}
          <div style={{ display:'none', textAlign:'center', marginBottom:32 }} className="mobile-logo">
            <div style={{ width:68, height:68, borderRadius:20, overflow:'hidden', margin:'0 auto 14px', boxShadow:'0 6px 24px rgba(184,134,11,0.3)' }}>
              <img src="/logo.webp" alt="GCD" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
            </div>
            <div style={{ fontFamily:"'Poppins',sans-serif", fontWeight:800, fontSize:20, color:'#1A1612', letterSpacing:'-0.03em' }}>Golden Crescent</div>
            <div style={{ fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'#B8860B', fontWeight:600 }}>Operations Dashboard</div>
          </div>

          <div style={{ width:'100%', maxWidth:360 }}>
            <div style={{ marginBottom:36 }}>
              <h1 style={{ fontFamily:"'Poppins',sans-serif", fontWeight:800, fontSize:26, color:'#1A1612', margin:'0 0 6px', letterSpacing:'-0.03em' }}>
                Welcome back 👋
              </h1>
              <p style={{ fontSize:13.5, color:'#A89880', margin:0, lineHeight:1.5 }}>
                Sign in to your GCD Operations Dashboard to continue.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:18 }}>

              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#6B5E4E', marginBottom:7, letterSpacing:'0.03em', textTransform:'uppercase' }}>
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
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#6B5E4E', marginBottom:7, letterSpacing:'0.03em', textTransform:'uppercase' }}>
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
                    style={{ paddingRight:44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#A89880', display:'flex', padding:4 }}
                  >
                    {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:10, padding:'11px 14px', fontSize:13, color:'#C0392B', display:'flex', alignItems:'center', gap:8 }}>
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

            <div style={{ marginTop:36, paddingTop:24, borderTop:'1px solid #F0EBE1', textAlign:'center' }}>
              <p style={{ fontSize:12, color:'#C4B89A', margin:0, lineHeight:1.6 }}>
                Authorized personnel only.<br/>
                Contact your administrator for access.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </>
  )
}