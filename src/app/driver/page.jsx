'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { payrollApi, pocApi, attApi, leaveApi } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import { LogOut, DollarSign, Calendar, Bell, AlertTriangle, Plus, X, Clock, User, FileText } from 'lucide-react'

const DED_LABELS = { traffic_fine:'🚨 Traffic Fine', iloe_fee:'📋 ILOE Fee', iloe_fine:'⚠️ ILOE Fine', cash_variance:'💸 Cash Variance', other:'📌 Other' }
const DED_COLORS = { traffic_fine:'#C0392B', iloe_fee:'#1D6FA4', iloe_fine:'#C0392B', cash_variance:'#B45309', other:'#6B5D4A' }
const BON_COLORS = { performance:'#2E7D52', kpi:'#1D6FA4', other:'#B8860B' }

function LeaveModal({ onClose, onSave }) {
  const [form, setForm] = useState({ type:'Annual', from_date:'', to_date:'', reason:'' })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  const days = form.from_date && form.to_date
    ? Math.max(1, Math.round((new Date(form.to_date)-new Date(form.from_date))/86400000)+1) : 0

  async function handleSave() {
    if (!form.from_date||!form.to_date) return alert('Please fill in dates')
    setSaving(true)
    try { await leaveApi.create({...form, days}); onSave() }
    catch(e) { alert(e.message || 'Failed to submit leave. Make sure your account is linked to an employee ID.') } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:400 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ fontWeight:700, fontSize:16, color:'#1A1612' }}>Apply for Annual Leave</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17}/></button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label className="input-label">Leave Type</label>
            <select className="input" value={form.type} onChange={e=>set('type',e.target.value)}>
              {['Annual','Sick','Emergency','Unpaid','Other'].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div><label className="input-label">From *</label>
              <input className="input" type="date" value={form.from_date} onChange={e=>set('from_date',e.target.value)}/></div>
            <div><label className="input-label">To *</label>
              <input className="input" type="date" value={form.to_date} onChange={e=>set('to_date',e.target.value)}/></div>
          </div>
          {days>0 && <div style={{ background:'#FDF6E3', border:'1px solid #F0D78C', borderRadius:9, padding:'8px 12px', fontSize:13, color:'#B8860B', fontWeight:600 }}>{days} day{days>1?'s':''}</div>}
          <div><label className="input-label">Reason</label>
            <input className="input" value={form.reason} onChange={e=>set('reason',e.target.value)} placeholder="Reason for leave"/></div>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:18 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving||!form.from_date||!form.to_date}>
            {saving?'Submitting…':'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DriverPortal() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [profile,       setProfile]       = useState(null)
  const [payroll,       setPayroll]       = useState([])
  const [myLeaves,      setMyLeaves]      = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [todayAtt,      setTodayAtt]      = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [tab,           setTab]           = useState('payroll')
  const [leaveModal,    setLeaveModal]    = useState(false)

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (user.role !== 'driver') { router.replace('/dashboard/analytics'); return }

    async function loadData() {
      setLoading(true)
      try {
        const today = new Date().toISOString().slice(0,10)
        const token = localStorage.getItem('gcd_token')
        const hdr   = { Authorization:`Bearer ${token}` }
        const base  = process.env.NEXT_PUBLIC_API_URL

        const [pr, ann, att, lv, emp] = await Promise.all([
          payrollApi.list({ emp_id: user.emp_id }),
          pocApi.announcements(),
          attApi.list({ date: today }),
          fetch(`${base}/api/leaves?emp_id=${user.emp_id}`, { headers: hdr }).then(r=>r.json()),
          fetch(`${base}/api/employees/${user.emp_id}`, { headers: hdr }).then(r=>r.ok?r.json():{employee:null}),
        ])
        setPayroll(pr.payroll)
        setAnnouncements(ann.announcements)
        setTodayAtt(att.attendance?.[0]||null)
        setMyLeaves(lv.leaves||[])
        setProfile(emp.employee||null)
      } catch(e) { console.error(e) } finally { setLoading(false) }
    }
    loadData()
  }, [user, router])

  useSocket({
    'payroll:deduction_added': ({emp_id}) => { if(emp_id===user?.emp_id) payrollApi.list({emp_id:user.emp_id}).then(d=>setPayroll(d.payroll)).catch(()=>{}) },
    'payroll:paid':            (row)      => { if(row.emp_id===user?.emp_id) payrollApi.list({emp_id:user.emp_id}).then(d=>setPayroll(d.payroll)).catch(()=>{}) },
    'announcement:new':        ann        => setAnnouncements(p=>[ann,...p]),
    'attendance:updated':      row        => { if(row.emp_id===user?.emp_id) setTodayAtt(row) },
    'leave:created':           l          => { if(l.emp_id===user?.emp_id) setMyLeaves(p=>[l,...p]) },
    'leave:updated':           l          => { if(l.emp_id===user?.emp_id) setMyLeaves(p=>p.map(x=>x.id===l.id?{...x,...l}:x)) },
  })

  if (!user||user.role!=='driver') return null
  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#A89880', fontSize:14 }}>Loading…</div>

  const ytd = payroll.filter(p=>p.payroll_status==='paid').reduce((s,p)=>s+Number(p.net_pay||0),0)
  const pendingLeaves = myLeaves.filter(l=>l.status==='pending').length

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#FDF6E3,#F8F7F4)', paddingBottom:50 }}>
      {/* Header */}
      <div style={{ background:'#FFF', borderBottom:'1px solid #EAE6DE', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src="/logo.webp" alt="GCD" style={{ width:36,height:36,borderRadius:9,objectFit:'contain',background:'#fff',padding:2 }}/>
          <div>
            <div style={{ fontWeight:800,fontSize:14,color:'#1A1612' }}>Golden Crescent</div>
            <div style={{ fontSize:10,color:'#B8860B',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase' }}>DA Portal</div>
          </div>
        </div>
        <button onClick={()=>{logout();router.replace('/login')}} className="btn btn-ghost btn-sm" style={{ color:'#A89880' }}>
          <LogOut size={15}/> Sign Out
        </button>
      </div>

      <div style={{ maxWidth:540, margin:'0 auto', padding:'20px 16px' }}>
        {/* Profile card */}
        <div style={{ background:'#FFF', border:'1px solid #EAE6DE', borderRadius:18, padding:20, marginBottom:14, animation:'slideUp 0.35s ease', boxShadow:'0 4px 20px rgba(184,134,11,0.08)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
            <div style={{ width:56,height:56,borderRadius:15,background:'linear-gradient(135deg,#FDF6E3,#FEF3D0)',border:'2px solid #D4A017',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0 }}>
              {profile?.avatar||'👤'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700,fontSize:17,color:'#1A1612',letterSpacing:'-0.02em' }}>{user.name}</div>
              <div style={{ fontSize:12,color:'#6B5D4A',marginTop:2 }}>{profile?.role} · {profile?.station_code||'DDB1'}</div>
            </div>
            {todayAtt ? (
              <span className={`badge ${todayAtt.status==='present'?'badge-success':'badge-warning'}`} style={{ fontSize:11 }}>
                {todayAtt.status==='present'?'✓ Present':'On Leave'}
              </span>
            ) : <span className="badge badge-muted" style={{ fontSize:11 }}>Not logged</span>}
          </div>

          {/* Key details — ALL visible to driver */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {[
              ['Employee ID',   user.emp_id,                          true ],
              ['Amazon DA ID',  profile?.amazon_id||'—',             true ],
              ['Hourly Rate',   `AED ${profile?.hourly_rate||3.85}/hr`,false],
              ['Salary',        `AED ${Number(profile?.salary||0).toLocaleString()}/mo`, false],
              ['AL Balance',    `${profile?.annual_leave_balance||0} days`, false],
              ['AL Start Date', profile?.annual_leave_start?.slice(0,10)||'—', false],
            ].map(([l,v,mono])=>(
              <div key={l} style={{ background:'#FAFAF8',borderRadius:9,padding:'9px 12px',border:'1px solid #EAE6DE' }}>
                <div style={{ fontSize:10,color:'#A89880',marginBottom:2,fontWeight:500 }}>{l}</div>
                <div style={{ fontSize:13,color:'#1A1612',fontWeight:700,fontFamily:mono?'monospace':'inherit' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Document expiry */}
          <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
            {[['Visa',profile?.visa_expiry],['License',profile?.license_expiry],['ILOE',profile?.iloe_expiry]].map(([l,d])=>{
              if (!d) return null
              const days = Math.round((new Date(d.slice(0,10))-new Date())/86400000)
              const c    = days<0?'#C0392B':days<=60?'#B45309':'#2E7D52'
              return (
                <div key={l} style={{ background: days<=60?'#FEF2F2':'#ECFDF5', borderRadius:9, padding:'9px 12px', border:`1px solid ${days<=60?'#FCA5A5':'#A7F3D0'}`, textAlign:'center' }}>
                  <div style={{ fontSize:10,color:c,fontWeight:600,textTransform:'uppercase',marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:11,color:c,fontWeight:700 }}>{days<0?'EXPIRED':days<=60?`${days}d left`:'OK'}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Today */}
        {todayAtt && todayAtt.cycle && (
          <div style={{ background:'linear-gradient(135deg,#FDF6E3,#FEF3D0)',border:'1px solid #F0D78C',borderRadius:14,padding:'14px 18px',marginBottom:14,display:'flex',gap:16,flexWrap:'wrap' }}>
            <div><div style={{ fontSize:10,color:'#B8860B',fontWeight:600,textTransform:'uppercase',marginBottom:3 }}>Today's Cycle</div><div style={{ fontSize:20,fontWeight:800,color:'#1A1612' }}>{todayAtt.cycle}{todayAtt.is_rescue?' 🆘':''}</div></div>
            <div><div style={{ fontSize:10,color:'#B8860B',fontWeight:600,textTransform:'uppercase',marginBottom:3 }}>Hours</div><div style={{ fontSize:20,fontWeight:800,color:'#1A1612' }}>{todayAtt.cycle_hours||'—'}h</div></div>
            <div><div style={{ fontSize:10,color:'#B8860B',fontWeight:600,textTransform:'uppercase',marginBottom:3 }}>Earnings</div><div style={{ fontSize:20,fontWeight:800,color:'#2E7D52' }}>AED {parseFloat(todayAtt.earnings||0).toFixed(2)}</div></div>
          </div>
        )}

        {/* Quick actions */}
        <div style={{ display:'flex', gap:10, marginBottom:14 }}>
          <button className="btn btn-primary" style={{ flex:1, justifyContent:'center' }} onClick={()=>setLeaveModal(true)}>
            <Plus size={13}/> Apply Leave
          </button>
          <button className={`btn btn-sm ${tab==='notices'?'btn-primary':'btn-secondary'}`} style={{ flex:1, justifyContent:'center' }} onClick={()=>setTab('notices')}>
            <Bell size={13}/> Notices {announcements.length>0?`(${announcements.length})`:''}
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom:14 }}>
          <button className={`tab${tab==='payroll'?' active':''}`} onClick={()=>setTab('payroll')}>💰 Payslips</button>
          <button className={`tab${tab==='leaves'?' active':''}`}  onClick={()=>setTab('leaves')}>🏖 Leave History {pendingLeaves>0?`(${pendingLeaves})`:''}</button>
          <button className={`tab${tab==='notices'?' active':''}`} onClick={()=>setTab('notices')}>📢 Notices</button>
        </div>

        {/* Payslips */}
        {tab==='payroll' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:4 }}>
              <div style={{ background:'#FDF6E3',border:'1px solid #F0D78C',borderRadius:12,padding:14,textAlign:'center' }}>
                <div style={{ fontSize:11,color:'#B8860B',fontWeight:600,marginBottom:4 }}>YTD Earned</div>
                <div style={{ fontSize:20,fontWeight:800,color:'#B8860B' }}>AED {ytd.toLocaleString()}</div>
              </div>
              <div style={{ background:'#ECFDF5',border:'1px solid #A7F3D0',borderRadius:12,padding:14,textAlign:'center' }}>
                <div style={{ fontSize:11,color:'#2E7D52',fontWeight:600,marginBottom:4 }}>Monthly Base</div>
                <div style={{ fontSize:20,fontWeight:800,color:'#2E7D52' }}>AED {Number(profile?.salary||0).toLocaleString()}</div>
              </div>
            </div>
            {payroll.length===0 && <div style={{ textAlign:'center',padding:40,color:'#A89880' }}>No payslips yet</div>}
            {payroll.map((slip,i) => {
              const net      = Number(slip.net_pay||Number(slip.base_salary)+Number(slip.bonus_total||0)-Number(slip.deduction_total||0))
              const totalDed = Number(slip.deduction_total||0)
              const totalBon = Number(slip.bonus_total||0)
              return (
                <div key={slip.id||i} style={{ background:'#FFF',border:'1px solid #EAE6DE',borderRadius:14,overflow:'hidden',animation:`slideUp 0.3s ${i*0.06}s ease both` }}>
                  <div style={{ padding:'16px 18px' }}>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
                      <div style={{ fontWeight:700,fontSize:15,color:'#1A1612' }}>{slip.month}</div>
                      <span className={`badge ${slip.payroll_status==='paid'?'badge-success':'badge-warning'}`}>{slip.payroll_status==='paid'?'✓ Paid':'⏳ Pending'}</span>
                    </div>
                    <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                      <div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontSize:12.5,color:'#A89880' }}>Base Salary</span><span style={{ fontFamily:'monospace',fontSize:12.5 }}>AED {Number(slip.base_salary).toLocaleString()}</span></div>
                      {totalBon>0 && <div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontSize:12.5,color:'#A89880' }}>Bonus / Additions</span><span style={{ fontFamily:'monospace',fontSize:12.5,color:'#2E7D52',fontWeight:600 }}>+AED {totalBon.toLocaleString()}</span></div>}
                      {totalDed>0 && <div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontSize:12.5,color:'#A89880' }}>Total Deductions</span><span style={{ fontFamily:'monospace',fontSize:12.5,color:'#C0392B',fontWeight:600 }}>-AED {totalDed.toLocaleString()}</span></div>}
                      <div style={{ display:'flex',justifyContent:'space-between',paddingTop:9,borderTop:'1px solid #EAE6DE',marginTop:4 }}>
                        <span style={{ fontSize:14,fontWeight:700,color:'#1A1612' }}>Net Pay</span>
                        <span style={{ fontSize:16,fontWeight:800,color:'#B8860B',letterSpacing:'-0.02em' }}>AED {net.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  {/* Bonus breakdown */}
                  {slip.bonuses?.length>0 && (
                    <div style={{ background:'#F0FDF4',borderTop:'1px solid #A7F3D0',padding:'12px 18px' }}>
                      <div style={{ fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#2E7D52',marginBottom:8 }}>➕ Additions / Bonuses</div>
                      {slip.bonuses.map(b=>(
                        <div key={b.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6,padding:'6px 10px',background:'rgba(255,255,255,0.7)',borderRadius:8,border:'1px solid #A7F3D030' }}>
                          <div>
                            <div style={{ fontSize:12,fontWeight:600,color:BON_COLORS[b.type]||'#2E7D52' }}>{b.type}</div>
                            {b.description&&<div style={{ fontSize:11,color:'#A89880',marginTop:1 }}>{b.description}</div>}
                          </div>
                          <span style={{ fontFamily:'monospace',fontWeight:700,color:'#2E7D52',fontSize:13 }}>+AED {Number(b.amount).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Deduction breakdown */}
                  {slip.deductions?.length>0 && (
                    <div style={{ background:'#FEF7F6',borderTop:'1px solid #FCA5A5',padding:'12px 18px' }}>
                      <div style={{ fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#C0392B',marginBottom:8,display:'flex',alignItems:'center',gap:6 }}>
                        <AlertTriangle size={11}/> Deductions
                      </div>
                      {slip.deductions.map(d=>(
                        <div key={d.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8,padding:'8px 10px',background:'rgba(255,255,255,0.7)',borderRadius:8,border:`1px solid ${DED_COLORS[d.type]||'#EAE6DE'}30` }}>
                          <div style={{ flex:1,marginRight:10 }}>
                            <div style={{ fontSize:12,fontWeight:600,color:DED_COLORS[d.type]||'#6B5D4A' }}>{DED_LABELS[d.type]||d.type}</div>
                            {d.description&&<div style={{ fontSize:11,color:'#6B5D4A',marginTop:2,lineHeight:1.4 }}>{d.description}</div>}
                            {d.reference&&<div style={{ fontSize:10,color:'#C4B49A',fontFamily:'monospace',marginTop:1 }}>Ref: {d.reference}</div>}
                          </div>
                          <span style={{ fontFamily:'monospace',fontWeight:700,color:'#C0392B',fontSize:13,flexShrink:0 }}>-AED {Number(d.amount).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Leaves */}
        {tab==='leaves' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <button className="btn btn-primary btn-sm" style={{ alignSelf:'flex-end' }} onClick={()=>setLeaveModal(true)}>
              <Plus size={13}/> New Request
            </button>
            {myLeaves.length===0 && <div style={{ textAlign:'center',padding:40,color:'#A89880' }}>No leave requests yet</div>}
            {myLeaves.map((l,i)=>(
              <div key={l.id} style={{ background:'#FFF',border:'1px solid #EAE6DE',borderRadius:12,padding:'14px 16px',animation:`slideUp 0.3s ${i*0.05}s ease both` }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6 }}>
                  <div>
                    <div style={{ fontWeight:700,fontSize:14,color:'#1A1612' }}>{l.type} Leave</div>
                    <div style={{ fontSize:12,color:'#A89880',marginTop:2 }}>{l.from_date} → {l.to_date} · <strong>{l.days}d</strong></div>
                    {l.reason&&<div style={{ fontSize:12,color:'#6B5D4A',marginTop:3 }}>{l.reason}</div>}
                  </div>
                  <span className={`badge ${l.status==='approved'?'badge-success':l.status==='rejected'?'badge-danger':'badge-warning'}`}>
                    {l.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notices */}
        {tab==='notices' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {announcements.length===0 && <div style={{ textAlign:'center',padding:40,color:'#A89880' }}>No announcements</div>}
            {announcements.map((ann,i)=>(
              <div key={ann.id} style={{ background:'#FFF',border:'1px solid #EAE6DE',borderRadius:12,padding:'14px 16px',animation:`slideUp 0.3s ${i*0.06}s ease both` }}>
                <div style={{ fontWeight:700,fontSize:14,color:'#1A1612',marginBottom:6 }}>{ann.title}</div>
                <div style={{ fontSize:13,color:'#6B5D4A',lineHeight:1.6,marginBottom:6 }}>{ann.body}</div>
                <div style={{ fontSize:11,color:'#C4B49A' }}>{new Date(ann.created_at).toLocaleDateString('en-AE',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {leaveModal && <LeaveModal onClose={()=>setLeaveModal(false)} onSave={()=>{setLeaveModal(false);leaveApi.list({emp_id:user.emp_id}).then(d=>setMyLeaves(d.leaves)).catch(()=>{})}}/>}
    </div>
  )
}