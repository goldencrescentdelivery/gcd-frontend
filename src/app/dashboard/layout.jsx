'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { AlertsProvider } from '@/lib/AlertsContext'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import Link from 'next/link'
import { LayoutDashboard, Users, DollarSign, Radio, X, Trophy } from 'lucide-react'

const BOTTOM_NAV = [
  { href:'/dashboard/overview',  icon:LayoutDashboard, label:'Overview',  roles:['admin','general_manager','hr','accountant','poc'] },
  { href:'/dashboard/hr',        icon:Users,        label:'HR',        roles:['admin','general_manager','hr'] },
  { href:'/dashboard/finance',   icon:DollarSign,   label:'Finance',   roles:['admin','accountant'] },
  { href:'/dashboard/poc',       icon:Radio,        label:'Station',   roles:['admin','general_manager','poc'] },
]

const AWARD_KEY = 'gcd_award_dismissed_v1'

function AwardBanner({ onDismiss }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{
      margin: '0 0 18px',
      borderRadius: 18,
      overflow: 'hidden',
      border: '1px solid rgba(184,134,11,0.35)',
      boxShadow: '0 4px 24px rgba(184,134,11,0.18)',
      background: 'linear-gradient(135deg,#1A1612 0%,#2C1F0A 60%,#1A1612 100%)',
      position: 'relative',
      animation: 'slideUp 0.4s ease',
    }}>
      {/* Decorative circles */}
      <div style={{ position:'absolute', right:-40, top:-40, width:160, height:160, borderRadius:'50%', background:'rgba(184,134,11,0.1)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', left:-20, bottom:-30, width:100, height:100, borderRadius:'50%', background:'rgba(184,134,11,0.07)', pointerEvents:'none' }}/>

      {/* Dismiss button */}
      <button onClick={onDismiss}
        style={{ position:'absolute', top:12, right:12, zIndex:2, width:28, height:28, borderRadius:8, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)', transition:'all 0.15s' }}
        onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.15)';e.currentTarget.style.color='white'}}
        onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.08)';e.currentTarget.style.color='rgba(255,255,255,0.5)'}}>
        <X size={13}/>
      </button>

      <div style={{ display:'flex', alignItems:'stretch', gap:0, position:'relative', zIndex:1 }}>
        {/* Award image */}
        <div
          onClick={() => setExpanded(p => !p)}
          style={{ flexShrink:0, width: expanded ? 0 : 130, overflow:'hidden', cursor:'pointer', transition:'width 0.4s ease' }}>
          <img
            src="/award.jpeg"
            alt="Amazon Best Performance Award"
            style={{ width:130, height:'100%', objectFit:'cover', display:'block' }}
          />
        </div>

        {/* Text content */}
        <div style={{ flex:1, padding:'18px 44px 18px 20px', display:'flex', flexDirection:'column', justifyContent:'center', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#B8860B,#D4A017)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 2px 10px rgba(184,134,11,0.4)' }}>
              <Trophy size={17} color="white"/>
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#D4A017', marginBottom:2 }}>
                🏆 Achievement Unlocked
              </div>
              <div style={{ fontWeight:800, fontSize:16, color:'white', letterSpacing:'-0.02em', lineHeight:1.2 }}>
                Amazon Best Performance Award
              </div>
            </div>
          </div>

          <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.65)', lineHeight:1.6, maxWidth:520 }}>
            We are incredibly proud of every one of you. This award is a testament to the hard work, dedication, and teamwork that our entire Golden Crescent team brings every single day. 🌟
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <button
              onClick={() => setExpanded(p => !p)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:20, border:'1px solid rgba(184,134,11,0.5)', background:'rgba(184,134,11,0.15)', color:'#D4A017', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'Poppins,sans-serif', transition:'all 0.2s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(184,134,11,0.25)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(184,134,11,0.15)'}>
              {expanded ? '← Show Award' : '🖼 View Award'}
            </button>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>
              {new Date().toLocaleDateString('en-AE',{month:'long',year:'numeric'})}
            </span>
          </div>
        </div>

        {/* Expanded full image overlay */}
        {expanded && (
          <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, animation:'fadeIn 0.2s ease' }}
            onClick={() => setExpanded(false)}>
            <div style={{ position:'relative', maxWidth:700, width:'100%' }} onClick={e=>e.stopPropagation()}>
              <img src="/award.jpeg" alt="Amazon Best Performance Award" style={{ width:'100%', borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,0.5)', display:'block' }}/>
              <div style={{ marginTop:16, textAlign:'center' }}>
                <div style={{ fontWeight:800, fontSize:18, color:'white', letterSpacing:'-0.02em' }}>Amazon Best Performance Award 🏆</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', marginTop:6 }}>Golden Crescent Deliveries — {new Date().toLocaleDateString('en-AE',{month:'long',year:'numeric'})}</div>
              </div>
              <button onClick={()=>setExpanded(false)}
                style={{ position:'absolute', top:-12, right:-12, width:32, height:32, borderRadius:'50%', background:'white', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.3)' }}>
                <X size={15} color="#374151"/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed,  setCollapsed]  = useState(false)
  const [showAward,  setShowAward]  = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) router.replace('/login')
    else if (user.role === 'driver') router.replace('/driver')
  }, [user, loading, router])

  useEffect(() => {
    const dismissed = localStorage.getItem(AWARD_KEY)
    if (!dismissed) setShowAward(true)
  }, [])

  function dismissAward() {
    localStorage.setItem(AWARD_KEY, '1')
    setShowAward(false)
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg,#F9FAFB)' }}>
      <div style={{ textAlign:'center' }}>
        <img src="/logo.webp" alt="GCD" style={{ width:80, height:80, objectFit:'contain', margin:'0 auto 14px', display:'block', borderRadius:16, animation:'logoPulse 1.5s ease-in-out infinite' }}/>
        <div style={{ fontSize:13,color:'#9CA3AF' }}>Loading…</div>
      </div>
    </div>
  )

  if (!user || user.role==='driver') return null

  return (
    <AlertsProvider>
    <div className="dashboard-shell">
      {/* Sidebar overlay for mobile */}
      {mobileOpen && <div className="sidebar-overlay" onClick={()=>setMobileOpen(false)}/>}

      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}/>

      <div className="main-area">
        <Topbar onMenuClick={()=>setMobileOpen(o=>!o)}/>
        <main className="page-content">
          {showAward && <AwardBanner onDismiss={dismissAward}/>}
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mobile-bottomnav">
        {BOTTOM_NAV.filter(item=>!item.roles||item.roles.includes(user?.role)).map(item=>{
          const Icon   = item.icon
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} className={active?'active':''}>
              <Icon size={19} strokeWidth={active?2.5:1.8}/>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
    </AlertsProvider>
  )
}
