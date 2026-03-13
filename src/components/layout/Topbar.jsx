'use client'
import { usePathname } from 'next/navigation'
import { Bell, Menu } from 'lucide-react'
import { useAuth } from '@/lib/auth'

const PAGE_TITLES = {
  '/dashboard/analytics':        'Analytics',
  '/dashboard/hr/employees':     'Employees',
  '/dashboard/hr/attendance':    'Attendance',
  '/dashboard/hr/leaves':        'Leave Requests',
  '/dashboard/hr/documents':     'Documents & Expiry',
  '/dashboard/finance/payroll':  'Payroll',
  '/dashboard/finance/expenses': 'Expenses',
  '/dashboard/compliance':       'Compliance',
  '/dashboard/poc':              'POC Station',
  '/dashboard/backup':           'Backup & Data',
}

export default function Topbar({ onMenuClick }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const title = PAGE_TITLES[pathname] || 'Dashboard'

  return (
    <header className="topbar">
      <button className="btn btn-ghost btn-icon" onClick={onMenuClick} style={{ display:'none', color:'#6B5D4A' }} id="mobile-menu-btn">
        <Menu size={20} />
      </button>
      <style>{`@media(max-width:1024px){#mobile-menu-btn{display:flex!important}}`}</style>

      <div style={{ flex:1 }}>
        <div style={{ fontWeight:700, fontSize:17, color:'#1A1612', letterSpacing:'-0.02em' }}>{title}</div>
        <div style={{ fontSize:11, color:'#C4B49A', marginTop:1 }}>
          {new Date().toLocaleDateString('en-AE', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'6px 12px', background:'#F5F4F1', border:'1px solid #EAE6DE', borderRadius:10, cursor:'default' }}>
          <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,#FDF3DC,#F0D78C)', border:'1px solid #D4A017', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>
            {user?.role === 'admin' ? '👑' : user?.role === 'finance' ? '💰' : user?.role === 'poc' ? '📻' : '👤'}
          </div>
          <div className="hide-mobile">
            <div style={{ fontSize:12, fontWeight:600, color:'#1A1612', lineHeight:1 }}>{user?.name?.split(' ')[0]}</div>
            <div style={{ fontSize:10, color:'#A89880', textTransform:'capitalize', marginTop:2 }}>{user?.role}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
