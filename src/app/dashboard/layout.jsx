'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import Link from 'next/link'
import { BarChart3, Users, DollarSign, ShieldCheck, Radio, LogOut } from 'lucide-react'

const BOTTOM_NAV = [
  { href:'/dashboard/analytics', icon:BarChart3,   label:'Analytics', roles:['admin','general_manager','hr','accountant','poc'] },
  { href:'/dashboard/hr',        icon:Users,        label:'HR',        roles:['admin','general_manager','hr'] },
  { href:'/dashboard/finance',   icon:DollarSign,   label:'Finance',   roles:['admin','accountant'] },
  { href:'/dashboard/poc',       icon:Radio,        label:'Station',   roles:['admin','general_manager','poc'] },
]

export default function DashboardLayout({ children }) {
  const { user, loading, logout } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed,  setCollapsed]  = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) router.replace('/login')
    else if (user.role === 'driver') router.replace('/driver')
  }, [user, loading, router])

  function signOut() {
    try { logout() } catch(e) {}
    localStorage.removeItem('gcd_token')
    localStorage.removeItem('gcd_user')
    router.replace('/login')
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg,#F9FAFB)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:36,height:36,borderRadius:'50%',border:'3px solid #E5E7EB',borderTopColor:'#B8860B',animation:'spin 0.7s linear infinite',margin:'0 auto 10px' }}/>
        <div style={{ fontSize:13,color:'#9CA3AF' }}>Loading…</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  if (!user || user.role==='driver') return null

  return (
    <div className="dashboard-shell">
      {/* Sidebar overlay for mobile */}
      {mobileOpen && <div className="sidebar-overlay" onClick={()=>setMobileOpen(false)}/>}

      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}/>

      <div className="main-area">
        <Topbar onMenuClick={()=>setMobileOpen(o=>!o)}/>
        <main className="page-content">{children}</main>
      </div>

      {/* Mobile bottom nav — includes Sign Out */}
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
        {/* Sign Out always in bottom nav on mobile */}
        <button onClick={signOut}
          style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'9px 4px 13px',color:'#EF4444',fontSize:10,fontWeight:600,gap:3,background:'none',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif' }}>
          <LogOut size={19} strokeWidth={1.8}/>
          <span>Sign Out</span>
        </button>
      </nav>
    </div>
  )
}