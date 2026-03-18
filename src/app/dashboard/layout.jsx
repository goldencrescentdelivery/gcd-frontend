'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import Link from 'next/link'
import { BarChart3, Users, DollarSign, ShieldCheck, Radio, LogOut } from 'lucide-react'

const BOTTOM_NAV = [
  { href:'/dashboard/analytics', icon:BarChart3,   label:'Analytics', roles:['admin','manager','general_manager','hr','accountant','poc'] },
  { href:'/dashboard/hr',        icon:Users,        label:'HR',        roles:['admin','manager','general_manager','hr'] },
  { href:'/dashboard/finance',   icon:DollarSign,   label:'Finance',   roles:['admin','manager','accountant'] },
  { href:'/dashboard/hr/compliance', icon:ShieldCheck, label:'Compliance', roles:['admin','manager','hr'] },
  { href:'/dashboard/poc',       icon:Radio,        label:'Station',   roles:['admin','manager','general_manager','poc'] },
]

export default function DashboardLayout({ children }) {
  const { user, loading, logout } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()
  const [collapsed,  setCollapsed]  = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) router.replace('/login')
    else if (user.role === 'driver') router.replace('/driver')
  }, [user, loading, router])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F8F7F4' }}>
      <div style={{ textAlign:'center' }}>
        <img src="/logo.webp" alt="GCD" style={{ width:48, height:48, borderRadius:14, objectFit:'contain', background:'#fff', padding:3, margin:'0 auto 12px', display:'block', boxShadow:'0 4px 16px rgba(184,134,11,0.2)' }}/>
        <div style={{ fontSize:13, color:'#A89880', fontWeight:500 }}>Loading…</div>
      </div>
    </div>
  )

  if (!user || user.role === 'driver') return null

  const visibleNav = BOTTOM_NAV.filter(item => !item.roles || item.roles.includes(user?.role))

  return (
    <div className="dashboard-shell">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}/>
      <div className="main-area">
        <Topbar onMenuClick={() => setMobileOpen(o => !o)}/>
        <main className="page-content">{children}</main>
      </div>
      <nav className="mobile-bottomnav">
        {visibleNav.map(item => {
          const Icon   = item.icon
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'5px 4px', textDecoration:'none', color: active ? '#B8860B' : '#A89880', transition:'color 0.2s', position:'relative' }}>
              {active && <div style={{ position:'absolute', top:-8, left:'50%', transform:'translateX(-50%)', width:28, height:3, background:'linear-gradient(90deg,#B8860B,#D4A017)', borderRadius:'0 0 3px 3px' }}/>}
              <Icon size={20}/>
              <span style={{ fontSize:10, fontWeight: active ? 700 : 500 }}>{item.label}</span>
            </Link>
          )
        })}
        <button onClick={() => { logout(); router.replace('/login') }}
          style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'5px 4px', background:'none', border:'none', color:'#C0392B', cursor:'pointer' }}>
          <LogOut size={20}/>
          <span style={{ fontSize:10, fontWeight:500 }}>Sign Out</span>
        </button>
      </nav>
    </div>
  )
}
