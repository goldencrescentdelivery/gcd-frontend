'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { NAV, GOLD } from '@/lib/data'
import {
  BarChart3, Users, DollarSign, UserCircle, Clock, CalendarOff,
  FileText, Wallet, Receipt, ChevronDown, LogOut, Menu, X,
  ShieldCheck, Radio, HardDrive, KeyRound, ChevronLeft, ChevronRight, Settings, Trophy, AlertTriangle,
} from 'lucide-react'

const ICONS = { Settings,
  BarChart3, Users, DollarSign, UserCircle, Clock, CalendarOff,
  FileText, Wallet, Receipt, ShieldCheck, Radio, HardDrive, KeyRound, Trophy, AlertTriangle,
}

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const pathname  = usePathname()
  const { user, logout } = useAuth()
  const router    = useRouter()
  const [expanded, setExpanded] = useState({ '/dashboard/hr': true, '/dashboard/finance': true })

  function toggle(href) { setExpanded(p => ({ ...p, [href]: !p[href] })) }

  const nav = NAV.filter(item => !item.roles || item.roles.includes(user?.role))

  function handleLogout() {
    logout()
    router.replace('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar${collapsed?' collapsed':''}${mobileOpen?' mobile-open':''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ display:'flex', alignItems:'center', justifyContent: collapsed?'center':'space-between', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, overflow:'hidden' }}>
              <img
                src="/logo.webp"
                alt="GCD Logo"
                style={{
                  width: collapsed ? 36 : 40,
                  height: collapsed ? 36 : 40,
                  borderRadius: 10,
                  objectFit: 'contain',
                  flexShrink: 0,
                  background: '#fff',
                  padding: 2,
                  transition: 'width 0.3s ease, height 0.3s ease',
                }}
              />
              {!collapsed && (
                <div style={{ animation:'slideRight 0.2s ease' }}>
                  <div style={{ fontWeight:800, fontSize:14, color:'#1A1612', letterSpacing:'-0.02em', lineHeight:1.2 }}>Golden Crescent</div>
                  <div style={{ fontSize:9.5, color:'#B8860B', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase' }}>Operations</div>
                </div>
              )}
            </div>
            {/* Desktop collapse toggle */}
            <button onClick={() => setCollapsed(p => !p)}
              className="btn btn-ghost btn-icon btn-sm"
              style={{ display:'flex', flexShrink:0 }}
              title={collapsed ? 'Expand' : 'Collapse'}>
              {collapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
            </button>
          </div>
        </div>

        {/* User chip */}
        {!collapsed && user && (
          <div style={{ margin:'10px 12px', padding:'10px 12px', background:'#FAFAF8', borderRadius:12, border:'1px solid #EAE6DE', animation:'slideDown 0.3s ease' }}>
            <div style={{ fontWeight:700, fontSize:12.5, color:'#1A1612', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.name}</div>
            <div style={{ fontSize:11, color:'#B8860B', fontWeight:600, textTransform:'capitalize', marginTop:1 }}>{user.role}{user.station_code ? ` · ${user.station_code}` : ''}</div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex:1, paddingTop:4, paddingBottom:12 }}>
          {nav.map((item, i) => {
            const Icon      = ICONS[item.icon]
            const isActive  = pathname.startsWith(item.href)
            const isExpanded= expanded[item.href]
            const hasChildren = item.children?.length > 0

            return (
              <div key={item.href} style={{ animation:`slideRight 0.3s ${i*0.04}s ease both` }}>
                {hasChildren ? (
                  <>
                    <div
                      className={`nav-item${isActive?' active':''}`}
                      onClick={() => !collapsed && toggle(item.href)}
                      style={{ userSelect:'none' }}
                    >
                      {Icon && <Icon size={16} className="nav-icon"/>}
                      <span className="nav-label" style={{ flex:1 }}>{item.label}</span>
                      {!collapsed && (
                        <ChevronDown size={13} style={{ transition:'transform 0.25s ease', transform: isExpanded?'rotate(180deg)':'none', opacity:0.5, flexShrink:0 }}/>
                      )}
                    </div>
                    {/* Children */}
                    <div style={{
                      overflow:'hidden',
                      maxHeight: collapsed ? 0 : isExpanded ? '400px' : '0',
                      transition:'max-height 0.35s cubic-bezier(0.16,1,0.3,1)',
                    }}>
                      {item.children?.filter(c => !c.roles || c.roles?.includes(user?.role)).map(child => {
                        const CIcon      = ICONS[child.icon]
                        const childActive= pathname === child.href || pathname.startsWith(child.href+'/')
                        return (
                          <Link key={child.href} href={child.href}
                            className={`nav-item${childActive?' active':''}`}
                            style={{ paddingLeft: collapsed ? undefined : 36, fontSize:12.5 }}
                            onClick={() => setMobileOpen(false)}
                          >
                            {CIcon && <CIcon size={14} className="nav-icon" style={{ opacity:0.7 }}/>}
                            <span className="nav-label">{child.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <Link href={item.href}
                    className={`nav-item${isActive?' active':''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    {Icon && <Icon size={16} className="nav-icon"/>}
                    <span className="nav-label">{item.label}</span>
                  </Link>
                )}
              </div>
            )
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding:'8px 8px 16px', borderTop:'1px solid #F5F4F1', marginTop:'auto' }}>
          <button onClick={handleLogout} className="nav-item" style={{ width:'100%', color:'#C0392B' }}>
            <LogOut size={16} className="nav-icon"/>
            <span className="nav-label">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
