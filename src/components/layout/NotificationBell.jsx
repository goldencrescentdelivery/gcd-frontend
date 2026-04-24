'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, X, AlertTriangle, Users, Truck, RefreshCw } from 'lucide-react'
import { API } from '@/lib/api'

const SEV = {
  expired:  { c:'#C0392B', bg:'#FEF2F2', bc:'#FCA5A5', label:'Expired'  },
  critical: { c:'#D97706', bg:'#FFFBEB', bc:'#FDE68A', label:'Critical' },
  warning:  { c:'#1D6FA4', bg:'#EFF6FF', bc:'#BFDBFE', label:'Expiring' },
}

function AlertItem({ item }) {
  const sev  = SEV[item.severity] || SEV.warning
  const abs  = Math.abs(item.days)
  return (
    <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', display:'flex', gap:10, alignItems:'center' }}>
      <div style={{ width:36, height:36, borderRadius:10, background:sev.bg, border:`1px solid ${sev.bc}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <AlertTriangle size={15} color={sev.c}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:12.5, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
          {item.label} · <span style={{ fontWeight:600 }}>{item.date?.slice(0,10)}</span>
          {item.station_code && <span style={{ marginLeft:5, color:'#B8860B', fontWeight:600 }}>{item.station_code}</span>}
        </div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <span style={{ fontSize:10.5, fontWeight:700, color:sev.c, background:sev.bg, border:`1px solid ${sev.bc}`, borderRadius:20, padding:'2px 8px', display:'block' }}>{sev.label}</span>
        <span style={{ fontSize:10, color:sev.c, fontWeight:600, marginTop:3, display:'block' }}>
          {item.days < 0 ? `${abs}d ago` : `${abs}d left`}
        </span>
      </div>
    </div>
  )
}

export default function NotificationBell({ userRole }) {
  const [open,    setOpen]    = useState(false)
  const [tab,     setTab]     = useState('drivers')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/notifications/alerts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('gcd_token')}` }
      })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        // Auto-push once per day for expired/critical items
        const expired  = json.alerts?.filter(a => a.severity === 'expired').length  || 0
        const critical = json.alerts?.filter(a => a.severity === 'critical').length || 0
        if ((expired + critical) > 0) {
          const lastPush = localStorage.getItem('gcd_last_doc_push')
          const today    = new Date().toISOString().slice(0, 10)
          if (lastPush !== today) {
            localStorage.setItem('gcd_last_doc_push', today)
            fetch(`${API}/api/notifications/push-critical`, {
              method: 'POST',
              headers: { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gcd_token')}` },
              body: JSON.stringify({ expiredCount: expired, criticalCount: critical }),
            }).catch(() => {})
          }
        }
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAlerts()
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [fetchAlerts])

  const total       = data?.total         || 0
  const staffList   = data?.staff         || []
  const driverList  = data?.drivers       || []
  const staffCount  = staffList.length
  const driverCount = driverList.length
  const urgent      = data?.alerts?.filter(a => a.severity !== 'warning').length || 0

  const list = tab === 'drivers' ? driverList : staffList

  if (!['admin','general_manager','manager'].includes(userRole)) return null

  return (
    <div ref={ref} style={{ position:'relative', flexShrink:0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="btn btn-ghost btn-icon"
        title="Notifications"
        style={{ color:'var(--text-sub)', position:'relative' }}>
        <Bell size={17}/>
        {total > 0 && (
          <span style={{
            position:'absolute', top:3, right:3,
            minWidth:15, height:15, borderRadius:8,
            background: urgent > 0 ? '#C0392B' : '#B8860B',
            color:'white', fontSize:8.5, fontWeight:800,
            display:'flex', alignItems:'center', justifyContent:'center',
            padding:'0 3px', lineHeight:1, boxShadow:'0 0 0 2px var(--bg)',
          }}>
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position:'fixed', top:58, right:12,
          width:360, maxHeight:'72vh',
          background:'var(--card)', border:'1px solid var(--border)',
          borderRadius:16, boxShadow:'0 8px 32px rgba(0,0,0,0.16)',
          zIndex:9999, display:'flex', flexDirection:'column',
          overflow:'hidden', animation:'slideUp 0.2s ease',
        }}>
          {/* Header */}
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Bell size={14} color="#B8860B"/>
              <span style={{ fontWeight:800, fontSize:14, color:'var(--text)' }}>Alerts</span>
              {total > 0 && (
                <span style={{ fontSize:10.5, fontWeight:700, background:'#FEF2F2', color:'#C0392B', border:'1px solid #FCA5A5', borderRadius:20, padding:'1px 8px' }}>
                  {total} alert{total !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div style={{ display:'flex', gap:4 }}>
              <button onClick={fetchAlerts} className="btn btn-ghost btn-icon" style={{ width:28, height:28 }} title="Refresh">
                <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}/>
              </button>
              <button onClick={() => setOpen(false)} className="btn btn-ghost btn-icon" style={{ width:28, height:28 }}>
                <X size={13}/>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            {[
              { k:'drivers', label:'Drivers', Icon:Truck,  count:driverCount },
              { k:'staff',   label:'Staff',   Icon:Users,  count:staffCount  },
            ].map(t => (
              <button key={t.k} onClick={() => setTab(t.k)} style={{
                flex:1, padding:'10px 8px', border:'none',
                background: tab === t.k ? 'var(--bg-alt)' : 'transparent',
                borderBottom: tab === t.k ? '2px solid #B8860B' : '2px solid transparent',
                color: tab === t.k ? '#B8860B' : 'var(--text-muted)',
                fontWeight:700, fontSize:12, cursor:'pointer',
                fontFamily:'Poppins,sans-serif',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                transition:'all 0.15s',
              }}>
                <t.Icon size={12}/>
                {t.label}
                {t.count > 0 && (
                  <span style={{
                    background: tab === t.k ? '#B8860B' : 'var(--border)',
                    color: tab === t.k ? 'white' : 'var(--text-muted)',
                    borderRadius:20, padding:'1px 6px', fontSize:10, fontWeight:700,
                  }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Alert list */}
          <div style={{ overflowY:'auto', flex:1 }}>
            {loading ? (
              <div style={{ padding:'30px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:12 }}>Loading…</div>
            ) : list.length === 0 ? (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--text-muted)' }}>
                <Bell size={30} style={{ margin:'0 auto 10px', display:'block', opacity:0.15 }}/>
                <div style={{ fontWeight:700, fontSize:13, color:'var(--text-sub)' }}>All clear</div>
                <div style={{ fontSize:11, marginTop:4 }}>No {tab === 'drivers' ? 'driver' : 'staff'} document alerts</div>
              </div>
            ) : (
              <>
                {/* Severity summary */}
                {(() => {
                  const exp = list.filter(a => a.severity === 'expired').length
                  const crit = list.filter(a => a.severity === 'critical').length
                  const warn = list.filter(a => a.severity === 'warning').length
                  return (
                    <div style={{ display:'flex', gap:6, padding:'10px 14px', background:'var(--bg-alt)', borderBottom:'1px solid var(--border)', flexWrap:'wrap' }}>
                      {exp  > 0 && <span style={{ fontSize:10.5, fontWeight:700, color:'#C0392B', background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:20, padding:'2px 9px' }}>🔴 {exp} Expired</span>}
                      {crit > 0 && <span style={{ fontSize:10.5, fontWeight:700, color:'#D97706', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:20, padding:'2px 9px' }}>🟠 {crit} Critical</span>}
                      {warn > 0 && <span style={{ fontSize:10.5, fontWeight:700, color:'#1D6FA4', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:20, padding:'2px 9px' }}>🔵 {warn} Expiring</span>}
                    </div>
                  )
                })()}
                {list.map((item, i) => <AlertItem key={i} item={item}/>)}
              </>
            )}
          </div>

          {/* Footer */}
          {list.length > 0 && (
            <div style={{ padding:'10px 14px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
              <a href="/dashboard/hr/employees" style={{ fontSize:11.5, fontWeight:700, color:'#B8860B', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                View all employees →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
