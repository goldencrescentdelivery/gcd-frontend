'use client'
import { useState, useEffect } from 'react'
import { empApi } from '@/lib/api'
import { differenceInDays, parseISO } from 'date-fns'
import { AlertTriangle, CheckCircle, Clock, Upload } from 'lucide-react'

function ExpiryRow({ label, dateStr }) {
  if (!dateStr) return null
  const d  = differenceInDays(parseISO(dateStr.slice(0,10)), new Date())
  const cls = d<0||d<=30?'badge-danger':d<=90?'badge-warning':'badge-success'
  const Icon = d<0||d<=30?AlertTriangle:d<=90?Clock:CheckCircle
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid #F5F4F1'}}>
      <div>
        <div style={{fontSize:12.5,color:'#1A1612',fontWeight:500}}>{label}</div>
        <div style={{fontSize:10.5,color:'#C4B49A',marginTop:1,fontFamily:'monospace'}}>{dateStr.slice(0,10)}</div>
      </div>
      <span className={`badge ${cls}`}><Icon size={9}/> {d<0?'EXPIRED':`${d}d left`}</span>
    </div>
  )
}

export default function DocumentsPage() {
  const [employees, setEmployees] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    empApi.list().then(d=>setEmployees(d.employees)).catch(console.error).finally(()=>setLoading(false))
  }, [])

  const today   = new Date()
  const critical = employees.filter(emp => {
    const v = emp.visa_expiry    ? differenceInDays(parseISO(emp.visa_expiry.slice(0,10)),    today) : 999
    const l = emp.license_expiry ? differenceInDays(parseISO(emp.license_expiry.slice(0,10)), today) : 999
    return Math.min(v,l) <= 60
  })

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#A89880'}}>Loading…</div>

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,animation:'slideUp 0.35s ease'}}>
      {critical.length > 0 && (
        <div style={{background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:12,padding:'14px 18px',display:'flex',gap:12,alignItems:'flex-start'}}>
          <AlertTriangle size={20} color="#C0392B" style={{flexShrink:0,marginTop:1}}/>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:'#C0392B',marginBottom:3}}>{critical.length} employee{critical.length>1?'s':''} need attention</div>
            <div style={{fontSize:12.5,color:'#6B5D4A'}}>{critical.map(e=>e.name.split(' ')[0]).join(', ')} — expiring within 60 days</div>
          </div>
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
        {employees.map((emp,i) => (
          <div key={emp.id} className="card" style={{animation:`slideUp 0.3s ${i*0.04}s ease both`}}>
            <div style={{display:'flex',alignItems:'center',gap:11,marginBottom:14}}>
              <div style={{width:36,height:36,borderRadius:9,background:'#FDF6E3',border:'1px solid #F0D78C',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17}}>{emp.avatar}</div>
              <div>
                <div style={{fontWeight:700,fontSize:13.5,color:'#1A1612'}}>{emp.name}</div>
                <div style={{fontSize:11,color:'#A89880'}}>{emp.role} · {emp.nationality||'—'}</div>
              </div>
            </div>
            <ExpiryRow label="Visa / Residency" dateStr={emp.visa_expiry}/>
            <ExpiryRow label="Driving License"  dateStr={emp.license_expiry}/>
            {!emp.license_expiry && <div style={{padding:'9px 0',fontSize:12,color:'#C4B49A',borderBottom:'1px solid #F5F4F1'}}>No driving license required</div>}
            <div style={{marginTop:12,display:'flex',gap:8}}>
              <button className="btn btn-secondary btn-sm" style={{flex:1,justifyContent:'center',fontSize:11}}>View Docs</button>
              <button className="btn btn-secondary btn-sm" style={{flex:1,justifyContent:'center',fontSize:11}}><Upload size={11}/> Upload</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
