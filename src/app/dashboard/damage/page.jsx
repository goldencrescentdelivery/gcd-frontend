'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Camera, Plus, X, Check, Clock, Wrench, Car } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL
function hdr(json=true) {
  const h = { Authorization:`Bearer ${localStorage.getItem('gcd_token')}` }
  if (json) h['Content-Type']='application/json'
  return h
}

const SEV = {
  minor:    { c:'#2E7D52', bg:'#ECFDF5', bc:'#A7F3D0', l:'Minor' },
  moderate: { c:'#B45309', bg:'#FFFBEB', bc:'#FCD34D', l:'Moderate' },
  major:    { c:'#C0392B', bg:'#FEF2F2', bc:'#FCA5A5', l:'Major' },
  totaled:  { c:'#7C3AED', bg:'#F5F3FF', bc:'#DDD6FE', l:'Totaled' },
}
const STATUS = {
  pending:  { c:'#B45309', bg:'#FFFBEB', bc:'#FCD34D', l:'Pending Review' },
  reviewed: { c:'#1D6FA4', bg:'#EFF6FF', bc:'#BFDBFE', l:'Under Review' },
  resolved: { c:'#2E7D52', bg:'#ECFDF5', bc:'#A7F3D0', l:'Resolved' },
}

export default function DamagePage() {
  const [reports,  setReports]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')
  const [selected, setSelected] = useState(null)
  const [reviewing,setReviewing]= useState(null)
  const [reviewForm,setReviewForm] = useState({status:'reviewed',review_note:'',repair_cost:'',deduct_from_da:false})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`${API}/api/damage${filter!=='all'?`?status=${filter}`:''}`, {headers:hdr(false)}).then(r=>r.json())
      setReports(d.reports||[])
    } catch(e){} finally{setLoading(false)}
  }, [filter])

  useEffect(()=>{load()},[load])

  async function submitReview() {
    await fetch(`${API}/api/damage/${reviewing.id}/review`, {
      method:'PATCH', headers:hdr(),
      body:JSON.stringify({...reviewForm, repair_cost:parseFloat(reviewForm.repair_cost)||null})
    })
    setReviewing(null); load()
  }

  const pending  = reports.filter(r=>r.status==='pending').length
  const resolved = reports.filter(r=>r.status==='resolved').length

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,animation:'slideUp 0.35s ease'}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontWeight:900,fontSize:22,color:'#1A1612',letterSpacing:'-0.03em',display:'flex',alignItems:'center',gap:10}}>
            <AlertTriangle size={22} color="#C0392B"/> Damage Reports
          </h1>
          <p style={{fontSize:12,color:'#A89880',marginTop:3}}>Vehicle damage tracking and resolution</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
        {[
          {l:'Total Reports', v:reports.length,  c:'#1A1612', bg:'#FAFAF8', bc:'#EAE6DE'},
          {l:'Pending',       v:pending,          c:'#B45309', bg:'#FFFBEB', bc:'#FCD34D'},
          {l:'Resolved',      v:resolved,         c:'#2E7D52', bg:'#ECFDF5', bc:'#A7F3D0'},
          {l:'Total Cost',    v:`AED ${reports.reduce((s,r)=>s+Number(r.repair_cost||0),0).toLocaleString()}`, c:'#7C3AED', bg:'#F5F3FF', bc:'#DDD6FE'},
        ].map(s=>(
          <div key={s.l} style={{textAlign:'center',padding:'14px 10px',borderRadius:13,background:s.bg,border:`1px solid ${s.bc}`}}>
            <div style={{fontWeight:900,fontSize:20,color:s.c,letterSpacing:'-0.03em'}}>{s.v}</div>
            <div style={{fontSize:10,color:s.c,fontWeight:600,marginTop:4,opacity:0.85}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{display:'flex',gap:7}}>
        {['all','pending','reviewed','resolved'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:'7px 16px',borderRadius:20,fontSize:12,fontWeight:filter===f?700:500,border:`1.5px solid ${filter===f?'#B8860B':'#EAE6DE'}`,background:filter===f?'#FDF6E3':'#FFF',color:filter===f?'#B8860B':'#A89880',cursor:'pointer',fontFamily:'Poppins,sans-serif',textTransform:'capitalize'}}>
            {f==='all'?'All':STATUS[f]?.l||f}
          </button>
        ))}
      </div>

      {/* Reports grid */}
      {loading ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12}}>
          {[1,2,3].map(i=><div key={i} className="skeleton" style={{height:200,borderRadius:16}}/>)}
        </div>
      ) : reports.length===0 ? (
        <div style={{textAlign:'center',padding:60,color:'#A89880'}}>
          <Car size={48} style={{margin:'0 auto 14px',display:'block',opacity:0.15}}/>
          <div style={{fontWeight:600,color:'#6B5D4A',fontSize:16}}>No damage reports</div>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12}}>
          {reports.map((r,i)=>{
            const sv = SEV[r.severity]||SEV.minor
            const st = STATUS[r.status]||STATUS.pending
            return (
              <div key={r.id} style={{background:'#FFF',border:`1.5px solid ${sv.bc}`,borderRadius:16,overflow:'hidden',animation:`slideUp 0.4s ${i*0.04}s ease both`,cursor:'pointer',transition:'all 0.2s'}}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 6px 24px rgba(0,0,0,0.08)'}}
                onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}
                onClick={()=>setSelected(selected?.id===r.id?null:r)}>
                {/* Severity bar */}
                <div style={{height:4,background:`linear-gradient(90deg,${sv.c},${sv.c}88)`}}/>
                <div style={{padding:'14px 16px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                    <div>
                      <div style={{fontWeight:800,fontSize:15,color:'#1A1612'}}>{r.plate||'Unknown Plate'}</div>
                      <div style={{fontSize:11,color:'#A89880',marginTop:1}}>{[r.make,r.model].filter(Boolean).join(' ')}</div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:5,alignItems:'flex-end'}}>
                      <span style={{fontSize:10.5,fontWeight:700,color:sv.c,background:sv.bg,border:`1px solid ${sv.bc}`,borderRadius:20,padding:'2px 9px'}}>{sv.l}</span>
                      <span style={{fontSize:10.5,fontWeight:700,color:st.c,background:st.bg,border:`1px solid ${st.bc}`,borderRadius:20,padding:'2px 9px'}}>{st.l}</span>
                    </div>
                  </div>
                  <div style={{fontSize:12.5,color:'#6B5D4A',lineHeight:1.5,marginBottom:10}}>{r.description}</div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:8,borderTop:'1px solid #F5F4F1'}}>
                    <div>
                      <div style={{fontSize:11.5,fontWeight:600,color:'#1A1612'}}>{r.emp_name}</div>
                      <div style={{fontSize:10.5,color:'#A89880'}}>{r.reported_at?.slice(0,10)}</div>
                    </div>
                    {r.repair_cost && <div style={{fontWeight:800,fontSize:14,color:'#C0392B'}}>AED {Number(r.repair_cost).toLocaleString()}</div>}
                  </div>
                  {/* Photos */}
                  {[r.photo_1,r.photo_2,r.photo_3,r.photo_4].filter(Boolean).length>0 && (
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5,marginTop:10}}>
                      {[r.photo_1,r.photo_2,r.photo_3,r.photo_4].filter(Boolean).map((url,pi)=>(
                        <a key={pi} href={url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}>
                          <img src={url} alt="" style={{width:'100%',aspectRatio:'1',objectFit:'cover',borderRadius:7,border:'1px solid #EAE6DE'}}/>
                        </a>
                      ))}
                    </div>
                  )}
                  {r.status==='pending' && (
                    <button onClick={e=>{e.stopPropagation();setReviewing(r);setReviewForm({status:'reviewed',review_note:'',repair_cost:'',deduct_from_da:false})}}
                      style={{marginTop:12,width:'100%',padding:'8px',borderRadius:10,background:'linear-gradient(135deg,#FEF2F2,#FFE4E4)',border:'1.5px solid #FCA5A5',color:'#C0392B',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'Poppins,sans-serif',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
                      <Wrench size={13}/> Review Report
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewing && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setReviewing(null)}>
          <div className="modal" style={{maxWidth:440}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <div>
                <h3 style={{fontWeight:900,fontSize:17,color:'#1A1612'}}>Review Damage Report</h3>
                <p style={{fontSize:12,color:'#A89880',marginTop:2}}>{reviewing.plate} · {reviewing.emp_name}</p>
              </div>
              <button onClick={()=>setReviewing(null)} style={{width:30,height:30,borderRadius:9,background:'#F5F4F1',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={14}/></button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{background:'#FEF7F6',borderRadius:10,padding:'10px 12px',fontSize:12.5,color:'#6B5D4A',lineHeight:1.5}}>{reviewing.description}</div>
              <div>
                <label className="input-label">Resolution Status</label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[{v:'reviewed',l:'Under Review'},{v:'resolved',l:'Resolved'}].map(s=>(
                    <button key={s.v} onClick={()=>setReviewForm(p=>({...p,status:s.v}))} style={{padding:'9px',borderRadius:10,border:`2px solid ${reviewForm.status===s.v?'#B8860B':'#EAE6DE'}`,background:reviewForm.status===s.v?'#FDF6E3':'#FFF',color:reviewForm.status===s.v?'#B8860B':'#A89880',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'Poppins,sans-serif'}}>
                      {s.l}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="input-label">Repair Cost (AED)</label>
                <input className="input" type="number" value={reviewForm.repair_cost} onChange={e=>setReviewForm(p=>({...p,repair_cost:e.target.value}))} placeholder="0"/></div>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'#FEF7F6',borderRadius:10,cursor:'pointer'}} onClick={()=>setReviewForm(p=>({...p,deduct_from_da:!p.deduct_from_da}))}>
                <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${reviewForm.deduct_from_da?'#C0392B':'#EAE6DE'}`,background:reviewForm.deduct_from_da?'#C0392B':'#FFF',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {reviewForm.deduct_from_da&&<Check size={12} color="white"/>}
                </div>
                <div>
                  <div style={{fontSize:12.5,fontWeight:700,color:'#1A1612'}}>Deduct from DA salary</div>
                  <div style={{fontSize:11,color:'#A89880'}}>Will create a deduction in next payroll</div>
                </div>
              </div>
              <div><label className="input-label">Review Notes</label>
                <textarea className="input" rows={3} value={reviewForm.review_note} onChange={e=>setReviewForm(p=>({...p,review_note:e.target.value}))} placeholder="Notes for this report…" style={{resize:'vertical'}}/></div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:18}}>
              <button onClick={()=>setReviewing(null)} className="btn btn-secondary" style={{flex:1,justifyContent:'center'}}>Cancel</button>
              <button onClick={submitReview} className="btn btn-primary" style={{flex:2,justifyContent:'center'}}>Submit Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
