'use client'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useEffect, useState } from 'react'

const PAGE_TITLES = {
  '/dashboard/analytics':         'Analytics',
  '/dashboard/hr/employees':      'Employees',
  '/dashboard/hr/attendance':     'Attendance',
  '/dashboard/hr/leaves':         'Leaves',
  '/dashboard/hr/documents':      'Documents',
  '/dashboard/hr/compliance':     'Compliance',
  '/dashboard/hr/users':          'User Accounts',
  '/dashboard/finance/payroll':   'Payroll',
  '/dashboard/finance/expenses':  'Expenses',
  '/dashboard/poc':               'POC Station',
  '/dashboard/backup':            'Backup',
  '/dashboard/settings':          'Settings',
  '/dashboard/performance':       'Performance',
  '/dashboard/roster':            'Weekly Roster',
  '/dashboard/damage':            'Damage Reports',
  '/dashboard/advances':          'Salary Advances',
}

const ROLE_CFG = {
  admin:           { l:'Admin',    e:'👑' },
  manager:         { l:'Manager',  e:'⭐' },
  general_manager: { l:'GM',       e:'🎯' },
  hr:              { l:'HR',       e:'👥' },
  accountant:      { l:'Finance',  e:'💰' },
  poc:             { l:'POC',      e:'📡' },
  driver:          { l:'Driver',   e:'🚗' },
}

export default function Topbar({ onMenuClick }) {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, logout } = useAuth()

  function signOut() {
    try { logout() } catch(e) {}
    localStorage.removeItem('gcd_token')
    localStorage.removeItem('gcd_user')
    router.replace('/login')
  }

  const title = PAGE_TITLES[pathname] || 'Dashboard'
  const role  = ROLE_CFG[user?.role] || { l: user?.role, e: '👤' }

  return (
    <header className="topbar">
      {/* Menu button — mobile only */}
      <button onClick={onMenuClick} className="btn btn-ghost btn-icon" id="mobile-menu-btn"
        style={{ display:'none', color:'var(--text-sub)', flexShrink:0 }}>
        <Menu size={20}/>
      </button>

      {/* Title */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:16, color:'var(--text)', letterSpacing:'-0.01em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{title}</div>
        <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:1 }}>
          {new Date().toLocaleDateString('en-AE',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}
        </div>
      </div>

      {/* Right side */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        {/* User pill */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 10px 5px 5px', background:'var(--bg-alt)', border:'1px solid var(--border)', borderRadius:20, cursor:'default' }}>
          <div style={{ width:26, height:26, borderRadius:8, background:'linear-gradient(135deg,#B8860B,#D4A017)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>
            {role.e}
          </div>
          <div className="hide-mobile">
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', lineHeight:1 }}>{user?.name?.split(' ')[0]}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{role.l}</div>
          </div>
        </div>

        {/* Sign out — always visible */}
        <button onClick={signOut}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:20, background:'var(--red-bg)', border:'1px solid var(--red-border)', color:'var(--red)', fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif', whiteSpace:'nowrap', flexShrink:0 }}>
          <LogOut size={13}/><span className="hide-mobile">Sign Out</span>
        </button>
      </div>
    </header>
  )
}