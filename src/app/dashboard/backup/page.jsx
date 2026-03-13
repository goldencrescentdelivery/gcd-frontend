'use client'
import React, { useState, useEffect } from 'react'
import { backupApi } from '@/lib/api'
import { Download, Database, Clock, Shield, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'

export default function BackupPage() {
  const [stats,     setStats]     = useState(null)
  const [history,   setHistory]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [backing,   setBacking]   = useState(false)
  const [lastDone,  setLastDone]  = useState(null)

  useEffect(() => {
    Promise.all([backupApi.stats(), backupApi.history()])
      .then(([s,h]) => { setStats(s); setHistory(h.backups||[]) })
      .catch(console.error)
      .finally(()=>setLoading(false))
  }, [])

  async function handleBackup() {
    setBacking(true)
    try {
      await backupApi.download()
      setLastDone(new Date())
      // Refresh history
      backupApi.history().then(h=>setHistory(h.backups||[])).catch(()=>{})
    } catch(e) { alert('Backup failed: '+e.message) } finally { setBacking(false) }
  }

  const lastBackup  = history[0]
  const daysSince   = lastBackup ? Math.floor((Date.now()-new Date(lastBackup.created_at))/86400000) : null
  const backupOK    = daysSince !== null && daysSince <= 7

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, animation:'slideUp 0.35s ease' }}>

      {/* Header warning or OK */}
      {daysSince !== null && (
        <div style={{ background: backupOK?'#ECFDF5':'#FEF2F2', border:`1px solid ${backupOK?'#A7F3D0':'#FCA5A5'}`, borderRadius:14, padding:'16px 20px', display:'flex', gap:14, alignItems:'center' }}>
          {backupOK ? <CheckCircle size={22} color="#2E7D52"/> : <AlertTriangle size={22} color="#C0392B"/>}
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:backupOK?'#2E7D52':'#C0392B', marginBottom:3 }}>
              {backupOK ? 'Data is protected' : '⚠️ Backup overdue'}
            </div>
            <div style={{ fontSize:13, color:'#6B5D4A' }}>
              Last backup: <strong>{daysSince===0?'Today':`${daysSince} days ago`}</strong> · {new Date(lastBackup.created_at).toLocaleString('en-AE')}
              {!backupOK && ' — We recommend backing up at least once a week.'}
            </div>
          </div>
        </div>
      )}

      {/* Main backup button */}
      <div style={{ background:'linear-gradient(135deg,#FDF6E3,#FEF3D0)', border:'1px solid #F0D78C', borderRadius:18, padding:'28px 32px', textAlign:'center' }}>
        <div style={{ width:64,height:64,borderRadius:18,background:'linear-gradient(135deg,#B8860B,#D4A017)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',boxShadow:'0 8px 24px rgba(184,134,11,0.3)' }}>
          <Shield size={30} color="#fff"/>
        </div>
        <div style={{ fontWeight:800, fontSize:20, color:'#1A1612', marginBottom:8, letterSpacing:'-0.02em' }}>Database Backup</div>
        <div style={{ fontSize:13.5, color:'#6B5D4A', marginBottom:24, lineHeight:1.6, maxWidth:420, margin:'0 auto 24px' }}>
          Downloads a complete backup of all employee records, payroll, attendance, leaves, compliance, and delivery data as a JSON file. Store this file in a safe place.
        </div>
        <button
          className="btn btn-primary"
          style={{ padding:'14px 36px', fontSize:15, fontWeight:700 }}
          onClick={handleBackup}
          disabled={backing}
        >
          {backing ? <><RefreshCw size={16} style={{ animation:'spin 1s linear infinite', marginRight:8 }}/> Creating Backup…</> : <><Download size={16} style={{ marginRight:8 }}/> Download Full Backup</>}
        </button>
        {lastDone && <div style={{ fontSize:12, color:'#2E7D52', marginTop:14, fontWeight:600 }}>✓ Backup downloaded at {lastDone.toLocaleTimeString('en-AE')}</div>}
      </div>

      {/* Database stats */}
      {stats && (
        <div className="card">
          <div style={{ fontWeight:700, fontSize:15, color:'#1A1612', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
            <Database size={17} color="#B8860B"/> Database Contents
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
            {stats.tables?.map(t=>(
              <div key={t.table} style={{ background:'#FAFAF8', border:'1px solid #EAE6DE', borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontWeight:800, fontSize:22, color:'#1A1612', letterSpacing:'-0.03em' }}>{t.rows.toLocaleString()}</div>
                <div style={{ fontSize:11.5, color:'#A89880', marginTop:3, textTransform:'capitalize' }}>{t.table.replace(/_/g,' ')}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:14, padding:'10px 14px', background:'#F0FDF4', border:'1px solid #A7F3D0', borderRadius:10, fontSize:13, color:'#2E7D52', fontWeight:500 }}>
            Total: <strong>{stats.total_rows?.toLocaleString()}</strong> rows across <strong>{stats.tables?.length}</strong> tables
          </div>
        </div>
      )}

      {/* Backup history */}
      <div className="card">
        <div style={{ fontWeight:700, fontSize:15, color:'#1A1612', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
          <Clock size={17} color="#B8860B"/> Backup History
        </div>
        {history.length===0 ? (
          <div style={{ textAlign:'center', padding:30, color:'#A89880', fontSize:13 }}>No backups yet — run your first backup above</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {history.map((b,i)=>(
              <div key={b.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'#FAFAF8', borderRadius:10, border:'1px solid #EAE6DE' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1A1612' }}>{new Date(b.created_at).toLocaleString('en-AE')}</div>
                  <div style={{ fontSize:11.5, color:'#A89880', marginTop:2 }}>
                    {b.rows?.toLocaleString()} rows · {b.size_bytes ? `${(b.size_bytes/1024).toFixed(0)} KB` : '—'} · by {b.triggered_by_name||'system'}
                  </div>
                </div>
                <span className="badge badge-success" style={{ fontSize:10 }}>Complete</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="card" style={{ background:'#FFFBEB', border:'1px solid #FCD34D' }}>
        <div style={{ fontWeight:700, fontSize:14, color:'#B45309', marginBottom:12 }}>📋 Backup Recommendations</div>
        {[
          'Run a backup every week — especially before payroll processing',
          'Store backup files in Google Drive or email them to yourself',
          'Keep at least 3 months of backup files before deleting old ones',
          'After any major data entry (new employees, payroll), run a backup',
          'Neon.tech also keeps automatic 7-day point-in-time restore as a safety net',
        ].map((tip,i)=>(
          <div key={i} style={{ display:'flex', gap:10, marginBottom:8, fontSize:13, color:'#92400E' }}>
            <span style={{ fontWeight:700, flexShrink:0 }}>{i+1}.</span>
            <span>{tip}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
