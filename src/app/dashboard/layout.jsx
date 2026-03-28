'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { AlertsProvider } from '@/lib/AlertsContext'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import Link from 'next/link'
import { LayoutDashboard, Users, DollarSign, Radio } from 'lucide-react'

const BOTTOM_NAV = [
  { href:'/dashboard/overview',  icon:LayoutDashboard, label:'Overview',  roles:['admin','general_manager','hr','accountant','poc'] },
  { href:'/dashboard/hr',        icon:Users,        label:'HR',        roles:['admin','general_manager','hr'] },
  { href:'/dashboard/finance',   icon:DollarSign,   label:'Finance',   roles:['admin','accountant'] },
  { href:'/dashboard/poc',       icon:Radio,        label:'Station',   roles:['admin','general_manager','poc'] },
]

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed,  setCollapsed]  = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) router.replace('/login')
    else if (user.role === 'driver') router.replace('/driver')
  }, [user, loading, router])

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
        <main className="page-content">{children}</main>
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