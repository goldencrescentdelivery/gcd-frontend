'use client'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Menu, Bell, Search } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import { useState } from 'react'

const PAGE_TITLES = {
  '/dashboard/analytics':          { title:'Analytics', sub:'Live overview' },
  '/dashboard/hr':                 { title:'HR & Staff', sub:'People management' },
  '/dashboard/hr/employees':       { title:'Employees', sub:'Delivery Associates' },
  '/dashboard/hr/attendance':      { title:'Attendance', sub:'Daily tracking' },
  '/dashboard/hr/leaves':          { title:'Leave Requests', sub:'Approvals' },
  '/dashboard/hr/documents':       { title:'Documents', sub:'Expiry tracking' },
  '/dashboard/hr/compliance':      { title:'Compliance', sub:'Fines & insurance' },
  '/dashboard/hr/users':           { title:'User Accounts', sub:'Logins & access' },
  '/dashboard/finance':            { title:'Finance', sub:'Payroll & expenses' },
  '/dashboard/finance/payroll':    { title:'Payroll', sub:'Salaries & deductions' },
  '/dashboard/finance/expenses':   { title:'Expenses', sub:'Claims & approvals' },
  '/dashboard/poc':                { title:'POC Station', sub:'Station management' },
  '/dashboard/backup':             { title:'Backup & Data', sub:'Database safety' },
}

export default function Topbar({ onMenuClick }) {
  const pathname  = usePathname()
  const { user }  = useAuth()
  const [showSearch, setShowSearch] = useState(false)

  const pageInfo = Object.entries(PAGE_TITLES).sort((a,b)=>b[0].length-a[0].length)
    .find(([k]) => pathname.startsWith(k))?.[1] || { title:'Dashboard', sub:'' }

  const today    = new Date()
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <header className="topbar">
      {/* Mobile menu button */}
      <button className="btn btn-ghost btn-icon" onClick={onMenuClick}
        style={{ display:'none' }}
        id="mobile-menu-btn">
        <Menu size={20}/>
      </button>

      {/* Page title */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:800, fontSize:16, color:'#1A1612', letterSpacing:'-0.02em', lineHeight:1.2 }}>
          {pageInfo.title}
        </div>
        {pageInfo.sub && (
          <div style={{ fontSize:11, color:'#A89880', fontWeight:500 }}>{pageInfo.sub}</div>
        )}
      </div>

      {/* Right side */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        {/* Date chip */}
        <div style={{ fontSize:11.5, color:'#A89880', fontWeight:500, whiteSpace:'nowrap' }}
          className="hide-mobile">
          {today.toLocaleDateString('en-AE', { weekday:'short', month:'short', day:'numeric' })}
        </div>

        {/* User chip */}
        {user && (
          <div style={{
            display:'flex', alignItems:'center', gap:8, padding:'6px 12px',
            background:'linear-gradient(135deg,#FDF6E3,#FEF9F0)', border:'1px solid #F0D78C',
            borderRadius:24, cursor:'default'
          }}>
            <div style={{ width:24, height:24, borderRadius:8, background:'linear-gradient(135deg,#B8860B,#D4A017)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'white', fontWeight:700, flexShrink:0 }}>
              {user.name?.charAt(0)?.toUpperCase()}
            </div>
            <span style={{ fontSize:12, fontWeight:600, color:'#B8860B', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
              className="hide-mobile">
              {user.name?.split(' ')[0]}
            </span>
          </div>
        )}
      </div>

      {/* Mobile menu button show */}
      <style>{`
        @media (max-width:1024px) {
          #mobile-menu-btn { display:flex !important; }
        }
      `}</style>
    </header>
  )
}
