'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Wallet, Plus, X, Check, Clock, AlertCircle, TrendingDown, Search } from 'lucide-react'

import { API } from '@/lib/api'
function hdr() { return { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }
const MONTHS = Array.from({length:6},(_,i)=>{ const d=new Date(); d.setMonth(d.getMonth()+i); return d.toISOString().slice(0,7) })

const STATUS_CFG = {
  pending:  { c:'#B45309', bg:'#FFFBEB', bc:'#FCD34D', l:'Pending', icon:Clock },
  approved: { c:'#2E7D52', bg:'#ECFDF5', bc:'#A7F3D0', l:'Approved', icon:Check },
  rejected: { c:'#C0392B', bg:'#FEF2F2', bc:'#FCA5A5', l:'Rejected', icon:X },
}

export default function AdvancesPage() {
  const [advances,  setAdvances]  = useState([])
  const [emps,      setEmps]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [reviewing, setReviewing] = useState(null)
  const [form,      setForm]      = useState({ emp_id:'', amount:'', reason:'', month:MONTHS[0], deduct_month:MONTHS[1] })
  const [reviewNote,setReviewNote]= useState('')
  const [saving,    setSaving]    = useState(false)
  const [filter,    setFilter]    = useState('all')
  const [search,    setSearch]    = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [adv, empsD] = await Promise.all([
        fetch(`${API}/api/advances`, {headers:hdr()}).then(r=>r.json()),
        fetch(`${API}/api/employees`, {headers:{Authorization:`Bearer ${localStorage.getItem('gcd_token')}`}}).then(r=>r.json()),
      ])
      setAdvances(adv.advances||[])
      setEmps(empsD.employees||[])
    } catch(e){} finally{setLoading(false)}
  }, [])

  useEffect(()=>{load()},[load])

  async function submitAdvance() {
    if (!form.emp_id||!form.amount) return
    setSaving(true)
    try {
      await fetch(`${API}/api/advances`, {method:'POST', headers:hdr(), body:JSON.stringify(form)})
      setModal(false); setForm({emp_id:'',amount:'',reason:'',month:MONTHS[0],deduct_month:MONTHS[1]}); load()
    } catch(e){} finally{setSaving(false)}
  }

  async function reviewAdvance(status) {
    setSaving(true)
    try {
      await fetch(`${API}/api/advances/${reviewing.id}`, {method:'PATCH', headers:hdr(), body:JSON.stringify({status, review_note:reviewNote})})
      setReviewing(null); load()
    } catch(e){} finally{setSaving(false)}
  }

  const filtered = advances
    .filter(a => filter==='all' || a.status===filter)
    .filter(a => !search || a.name?.toLowerCase().includes(search.toLowerCase()))
  const totalPending  = advances.filter(a=>a.status==='pending').reduce((s,a)=>s+Number(a.amount),0)
  const totalApproved = advances.filter(a=>a.status==='approved').reduce((s,a)=>s+Number(a.amount),0)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,animation:'slideUp 0.35s ease'}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontWeight:900,fontSize:22,color:'#1A1612',letterSpacing:'-0.03em',display:'flex',alignItems:'center',gap:10}}>
            <Wallet size={22} color="#B8860B"/> Salary Advances
          </h1>
          <p style={{fontSize:12,color:'#A89880',marginTop:3}}>DA advance requests with auto payroll deduction</p>
        </div>
        <button onClick={()=>setModal(true)} className="btn btn-primary" style={{borderRadius:24}}>
          <Plus size={15}/> New Request
        </button>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10}}>
        {[
          {l:'Total Requests',v:advances.length,          c:'#1A1612',bg:'#FAFAF8',bc:'#EAE6DE'},
          {l:'Pending Amount',v:`AED ${totalPending.toLocaleString()}`,c:'#B45309',bg:'#FFFBEB',bc:'#FCD34D'},
          {l:'Approved Total',v:`AED ${totalApproved.toLocaleString()}`,c:'#2E7D52',bg:'#ECFDF5',bc:'#A7F3D0'},
          {l:'Rejected',      v:advances.filter(a=>a.status==='rejected').length,c:'#C0392B',bg:'#FEF2F2',bc:'#FCA5A5'},
        ].map(s=>(
          <div key={s.l} style={{textAlign:'center',padding:'14px 10px',borderRadius:13,background:s.bg,border:`1px solid ${s.bc}`}}>
            <div style={{fontWeight:900,fontSize:20,color:s.c,letterSpacing:'-0.02em'}}>{s.v}</div>
            <div style={{fontSize:10,color:s.c,fontWeight:600,marginTop:4,opacity:0.85}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div style={{display:'flex',gap:7,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{position:'relative',flex:'0 0 200px'}}>
          <Search size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',pointerEvents:'none'}}/>
          <input className="input" placeholder="Search employee…" value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:30,borderRadius:20}}/>
        </div>
      </div>
      <div style={{display:'flex',gap:7}}>
        {['all','pending','approved','rejected'].map(f=>{
          const cfg = STATUS_CFG[f]
          return (
            <button key={f} onClick={()=>setFilter(f)} style={{padding:'7px 16px',borderRadius:20,fontSize:12,fontWeight:filter===f?700:500,border:`1.5px solid ${filter===f?(cfg?.bc||'#B8860B'):'#EAE6DE'}`,background:filter===f?(cfg?.bg||'#FDF6E3'):'#FFF',color:filter===f?(cfg?.c||'#B8860B'):'#A89880',cursor:'pointer',fontFamily:'Poppins,sans-serif',textTransform:'capitalize'}}>
              {f==='all'?`All (${advances.length})`:cfg.l}
            </button>
          )
        })}
      </div>

      {/* List */}
      {loading ? (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {[1,2,3].map(i=><div key={i} className="skeleton" style={{height:100,borderRadius:14}}/>)}
        </div>
      ) : filtered.length===0 ? (
        <div style={{textAlign:'center',padding:60,color:'#A89880'}}>
          <Wallet size={40} style={{margin:'0 auto 12px',display:'block',opacity:0.2}}/>
          <div style={{fontWeight:600,color:'#6B5D4A'}}>No {filter==='all'?'':filter} advance requests</div>
        </div>
      ) : filtered.map((adv,i)=>{
        const sc = STATUS_CFG[adv.status]||STATUS_CFG.pending
        const Icon = sc.icon
        return (
          <div key={adv.id} style={{background:'#FFF',border:`1.5px solid ${sc.bc}`,borderRadius:14,padding:'14px 16px',animation:`slideUp 0.3s ${i*0.04}s ease both`}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
              <div style={{width:44,height:44,borderRadius:13,background:sc.bg,border:`1.5px solid ${sc.bc}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Icon size={18} color={sc.c}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:'#1A1612'}}>{adv.name}</div>
                    <div style={{fontSize:11,color:'#A89880',marginTop:2}}>
                      {adv.station_code} · Requested for <strong>{adv.month}</strong>
                      {adv.deduct_month&&<> · Deduct in <strong>{adv.deduct_month}</strong></>}
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontWeight:900,fontSize:18,color:sc.c,letterSpacing:'-0.02em'}}>AED {Number(adv.amount).toLocaleString()}</div>
                    <span style={{fontSize:10.5,fontWeight:700,color:sc.c,background:sc.bg,border:`1px solid ${sc.bc}`,borderRadius:20,padding:'2px 9px'}}>{sc.l}</span>
                  </div>
                </div>
                {adv.reason&&<div style={{fontSize:12,color:'#6B5D4A',marginTop:6,padding:'7px 10px',background:'#FAFAF8',borderRadius:8}}>{adv.reason}</div>}
                {adv.review_note&&<div style={{fontSize:11.5,color:'#A89880',marginTop:5,fontStyle:'italic'}}>"{adv.review_note}"</div>}
                <div style={{fontSize:10.5,color:'#C4B49A',marginTop:5}}>{adv.created_at?.slice(0,10)}</div>
              </div>
            </div>
            {adv.status==='pending' && (
              <div style={{display:'flex',gap:8,marginTop:12,paddingTop:10,borderTop:'1px solid #F5F4F1'}}>
                <button onClick={()=>{setReviewing(adv);setReviewNote('')}} style={{flex:1,padding:'8px',borderRadius:10,background:'linear-gradient(135deg,#ECFDF5,#D1FAE5)',border:'1.5px solid #A7F3D0',color:'#2E7D52',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'Poppins,sans-serif'}}>
                  ✓ Approve
                </button>
                <button onClick={async()=>{if(!confirm('Reject this advance?'))return;await fetch(`${API}/api/advances/${adv.id}`,{method:'PATCH',headers:hdr(),body:JSON.stringify({status:'rejected'})});load()}} style={{flex:1,padding:'8px',borderRadius:10,background:'#FEF2F2',border:'1.5px solid #FCA5A5',color:'#C0392B',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'Poppins,sans-serif'}}>
                  ✕ Reject
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* New Advance Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{maxWidth:440,padding:0,overflow:'hidden'}}>
            <div style={{padding:'22px 24px 18px',background:'linear-gradient(135deg,#ECFDF5,#FFF)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                <h3 style={{fontWeight:900,fontSize:17,color:'#1A1612'}}>Request Salary Advance</h3>
                <button onClick={()=>setModal(false)} style={{width:30,height:30,borderRadius:9,background:'rgba(0,0,0,0.06)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={14}/></button>
              </div>
              <p style={{fontSize:12,color:'#A89880'}}>Approved advances auto-deduct from next month's payroll</p>
            </div>
            <div style={{padding:'16px 24px 20px',display:'flex',flexDirection:'column',gap:13}}>
              <div>
                <label className="input-label">Employee *</label>
                <select className="input" value={form.emp_id} onChange={e=>setForm(p=>({...p,emp_id:e.target.value}))}>
                  <option value="">Select DA…</option>
                  {emps.map(e=><option key={e.id} value={e.id}>{e.name} — {e.id}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Advance Amount (AED) *</label>
                <div style={{position:'relative'}}>
                  <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:13,color:'#A89880',fontWeight:600}}>AED</span>
                  <input className="input" type="number" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} style={{paddingLeft:48,fontSize:16,fontWeight:700}}/>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <label className="input-label">For Month</label>
                  <select className="input" value={form.month} onChange={e=>setForm(p=>({...p,month:e.target.value}))}>
                    {MONTHS.map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Deduct In</label>
                  <select className="input" value={form.deduct_month} onChange={e=>setForm(p=>({...p,deduct_month:e.target.value}))}>
                    {MONTHS.map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="input-label">Reason</label>
                <input className="input" value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))} placeholder="Brief reason for advance…"/>
              </div>
              <div style={{display:'flex',gap:10,marginTop:4}}>
                <button onClick={()=>setModal(false)} className="btn btn-secondary" style={{flex:1,justifyContent:'center'}}>Cancel</button>
                <button onClick={submitAdvance} disabled={saving||!form.emp_id||!form.amount} style={{flex:2,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'11px',borderRadius:10,background:'linear-gradient(135deg,#2E7D52,#22C55E)',color:'white',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',opacity:saving?0.7:1}}>
                  {saving?'Submitting…':'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {reviewing && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setReviewing(null)}>
          <div className="modal" style={{maxWidth:380}}>
            <h3 style={{fontWeight:800,fontSize:16,color:'#1A1612',marginBottom:6}}>Approve Advance</h3>
            <p style={{fontSize:12,color:'#A89880',marginBottom:14}}>AED {Number(reviewing.amount).toLocaleString()} for {reviewing.name}</p>
            <div><label className="input-label">Approval Note (optional)</label>
              <input className="input" value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder="Any notes…"/></div>
            <div style={{background:'#ECFDF5',border:'1px solid #A7F3D0',borderRadius:10,padding:'10px 12px',marginTop:12,fontSize:12.5,color:'#2E7D52',fontWeight:600}}>
              ✓ AED {Number(reviewing.amount).toLocaleString()} will be deducted in {reviewing.deduct_month}
            </div>
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <button onClick={()=>setReviewing(null)} className="btn btn-secondary" style={{flex:1,justifyContent:'center'}}>Cancel</button>
              <button onClick={()=>reviewAdvance('approved')} disabled={saving} style={{flex:2,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px',borderRadius:10,background:'linear-gradient(135deg,#2E7D52,#22C55E)',color:'white',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif'}}>
                {saving?'Approving…':'Approve & Deduct'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
