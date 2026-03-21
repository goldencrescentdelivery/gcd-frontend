'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Users, DollarSign, ShieldCheck, Radio } from 'lucide-react'

const BOTTOM_NAV = [
  { href:'/dashboard/analytics',  icon:BarChart3,   label:'Analytics', roles:['admin','manager','finance'] },
  { href:'/dashboard/hr',         icon:Users,       label:'HR',        roles:['admin','manager'] },
  { href:'/dashboard/finance',    icon:DollarSign,  label:'Finance',   roles:['admin','manager','finance'] },
  { href:'/dashboard/compliance', icon:ShieldCheck, label:'Compliance',roles:['admin','manager','finance'] },
  { href:'/dashboard/poc',        icon:Radio,       label:'Station',   roles:['admin','manager','poc'] },
]

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()
  const [collapsed,  setCollapsed]  = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) router.replace('/login')
    else if (user.role === 'driver') router.replace('/driver')
  }, [user, loading, router])

  // Prevent crash while auth resolves
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#F5EDD8,#EDE4D0,#E8DFC8)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#B8860B,#D4A017)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, margin:'0 auto 10px' }}>🌙</div>
        <div style={{ fontSize:13, color:'#A89880' }}>Loading…</div>
      </div>
    </div>
  )

  if (!user || user.role === 'driver') return null

  return (
    <div className="dashboard-shell">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="main-area">
        <Topbar onMenuClick={() => setMobileOpen(o => !o)} />
        <main className="page-content">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mobile-bottomnav">
        {BOTTOM_NAV.filter(item => !item.roles || item.roles.includes(user?.role)).map(item => {
          const Icon   = item.icon
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'4px 12px', textDecoration:'none', color: active ? '#B8860B' : '#A89880', transition:'color 0.2s' }}>
              <Icon size={20} />
              <span style={{ fontSize:10, fontWeight: active ? 600 : 500 }}>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}