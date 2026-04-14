'use client'
import React, { useState } from 'react'
import { HardDrive, Download, RefreshCw, CheckCircle, AlertCircle, Database } from 'lucide-react'

const _raw = process.env.NEXT_PUBLIC_API_URL
const API = _raw && !_raw.startsWith("http") ? `https://${_raw}` : (_raw || "http://localhost:4000")
function hdr() { return { Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }

export default function BackupPage() {
  const [loading, setLoading] = useState(false)
  const [status,  setStatus]  = useState(null)

  async function runBackup() {
    setLoading(true); setStatus(null)
    try {
      const res  = await fetch(`${API}/api/backup`, { method:'POST', headers:hdr() })
      const data = await res.json()
      if (res.ok) setStatus({ ok:true,  msg: data.message || 'Backup completed successfully' })
      else        setStatus({ ok:false, msg: data.error   || 'Backup failed' })
    } catch(e) {
      setStatus({ ok:false, msg: e.message || 'Server unreachable' })
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, animation:'slideUp 0.35s ease' }}>
      <div>
        <h1 style={{ fontWeight:900, fontSize:22, color:'#1A1612', letterSpacing:'-0.03em', margin:0 }}>Backup</h1>
        <p style={{ fontSize:12, color:'#A89880', marginTop:4 }}>Database backup and data export</p>
      </div>

      {/* Main backup card */}
      <div className="card" style={{ padding:'28px 24px', textAlign:'center' }}>
        <div style={{ width:72, height:72, borderRadius:20, background:'linear-gradient(135deg,#FDF6E3,#FEF9F0)', border:'2px solid #F0D78C', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}>
          <HardDrive size={32} color="#B8860B"/>
        </div>
        <h2 style={{ fontWeight:800, fontSize:18, color:'#1A1612', marginBottom:8 }}>Database Backup</h2>
        <p style={{ fontSize:13, color:'#A89880', marginBottom:24, lineHeight:1.6 }}>
          Creates a full snapshot of all operational data including employees, attendance, payroll, leaves, vehicles, and documents.
        </p>

        {status && (
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:12, background:status.ok?'#ECFDF5':'#FEF2F2', border:`1px solid ${status.ok?'#A7F3D0':'#FCA5A5'}`, marginBottom:20, textAlign:'left' }}>
            {status.ok ? <CheckCircle size={18} color="#2E7D52"/> : <AlertCircle size={18} color="#C0392B"/>}
            <span style={{ fontSize:13, fontWeight:600, color:status.ok?'#2E7D52':'#C0392B' }}>{status.msg}</span>
          </div>
        )}

        <button onClick={runBackup} disabled={loading}
          style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'12px 28px', borderRadius:24, background:loading?'#A89880':'linear-gradient(135deg,#B8860B,#D4A017)', color:'white', fontWeight:700, fontSize:14, border:'none', cursor:loading?'not-allowed':'pointer', fontFamily:'Poppins,sans-serif', transition:'all 0.2s', boxShadow:loading?'none':'0 4px 16px rgba(184,134,11,0.35)' }}>
          {loading ? <><RefreshCw size={16} style={{ animation:'spin 1s linear infinite' }}/> Running…</> : <><Download size={16}/> Run Backup</>}
        </button>
      </div>

      {/* Info cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
        {[
          { icon:Database, title:'What is backed up', items:['Employees & users','Attendance records','Payroll & deductions','Leave requests','Vehicle data','SIM cards','Documents'] },
          { icon:CheckCircle, title:'Backup includes', items:['All active records','Historical data','Relationships intact','Timestamps preserved'] },
        ].map((s,i) => {
          const Icon = s.icon
          return (
            <div key={i} className="card" style={{ padding:'18px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <Icon size={16} color="#B8860B"/>
                <span style={{ fontWeight:700, fontSize:13, color:'#1A1612' }}>{s.title}</span>
              </div>
              <ul style={{ listStyle:'none', padding:0, margin:0 }}>
                {s.items.map(item => (
                  <li key={item} style={{ fontSize:12, color:'#6B5D4A', padding:'3px 0', display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background:'#B8860B', flexShrink:0 }}/>{item}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}