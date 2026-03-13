'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { NAV, GOLD } from '@/lib/data'
import {
  BarChart3, Users, DollarSign, UserCircle, Clock, CalendarOff,
  FileText, Wallet, Receipt, ChevronDown, LogOut, Menu, X, ShieldCheck, Radio, HardDrive, KeyRound,
} from 'lucide-react'

const ICONS = { BarChart3, Users, DollarSign, UserCircle, Clock, CalendarOff, FileText, Wallet, Receipt, ShieldCheck, Radio, HardDrive, KeyRound }

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const router = useRouter()
  const [expanded, setExpanded] = useState({ '/dashboard/hr': true, '/dashboard/finance': true })

  function toggle(href) { setExpanded(p => ({ ...p, [href]: !p[href] })) }
  function handleLogout() { logout(); router.replace('/login') }
  function close() { setMobileOpen(false) }

  const allowedNav = NAV.filter(n => n.roles.includes(user?.role))

  const cls = ['sidebar', collapsed && 'collapsed', mobileOpen && 'mobile-open'].filter(Boolean).join(' ')

  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={close} />}
      <aside className={cls}>
        {/* Header */}
        <div style={{ padding:'16px 12px 12px', borderBottom:'1px solid #EAE6DE', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          {!collapsed && (
            <div>
              <div style={{ fontFamily:"'Poppins',sans-serif", fontWeight:700, fontSize:14, color:'#1A1612', letterSpacing:'-0.02em' }}>Golden Crescent</div>
              <div style={{ fontSize:9, letterSpacing:'0.16em', textTransform:'uppercase', color:GOLD, marginTop:1, fontWeight:600 }}>Operations</div>
            </div>
          )}
          <button onClick={() => { setCollapsed(c => !c); setMobileOpen(false) }} className="btn btn-ghost btn-icon" style={{ color:'#A89880', flexShrink:0 }}>
            {collapsed ? <Menu size={16} /> : <X size={16} />}
          </button>
        </div>

        {/* User pill */}
        {!collapsed && user && (
          <div style={{ margin:'12px 10px 4px', background:'linear-gradient(135deg,#FDF6E3,#FEF9EC)', borderRadius:10, padding:'10px 12px', border:'1px solid #F0D78C', animation:'slideDown 0.3s ease' }}>
            <div style={{ fontSize:12.5, fontWeight:600, color:'#1A1612', marginBottom:2 }}>{user.name}</div>
            <div style={{ fontSize:10.5, color:GOLD, textTransform:'capitalize', fontWeight:500 }}>{user.role}</div>
          </div>
        )}

        <nav style={{ flex:1, paddingTop:8, paddingBottom:8, overflow:'hidden' }}>
          {allowedNav.map((item, idx) => {
            const Icon = ICONS[item.icon]
            const isActive  = pathname.startsWith(item.href)
            const hasCh     = item.children?.length > 0
            const isExp     = expanded[item.href]
            return (
              <div key={item.href} style={{ animationDelay:`${idx*0.04}s` }}>
                {hasCh ? (
                  <div className={`nav-item${isActive?' active':''}`} onClick={() => !collapsed && toggle(item.href)} style={{ justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      {Icon && <Icon className="nav-icon" size={17} />}
                      <span className="nav-label">{item.label}</span>
                    </div>
                    {!collapsed && <ChevronDown size={13} style={{ transition:'transform 0.2s', transform:isExp?'none':'rotate(-90deg)', color:'#C4B49A' }} />}
                  </div>
                ) : (
                  <Link href={item.href} className={`nav-item${isActive?' active':''}`} onClick={close}>
                    {Icon && <Icon className="nav-icon" size={17} />}
                    <span className="nav-label">{item.label}</span>
                  </Link>
                )}
                {hasCh && isExp && !collapsed && (
                  <div style={{ paddingLeft:8, animation:'slideDown 0.2s ease' }}>
                    {item.children.map(child => {
                      const CI = ICONS[child.icon]
                      return (
                        <Link key={child.href} href={child.href} className={`nav-item${pathname===child.href?' active':''}`} style={{ fontSize:12.5, padding:'7px 12px' }} onClick={close}>
                          {CI && <CI className="nav-icon" size={14} />}
                          <span className="nav-label">{child.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div style={{ borderTop:'1px solid #EAE6DE', padding:'10px 8px', flexShrink:0 }}>
          <button className="nav-item" style={{ width:'100%' }} onClick={handleLogout}>
            <LogOut className="nav-icon" size={16} />
            <span className="nav-label">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
