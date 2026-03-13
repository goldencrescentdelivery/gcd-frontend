'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { payrollApi, empApi } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import { Plus, X, Download, Check, ChevronDown, ChevronUp, FileText, DollarSign } from 'lucide-react'

const MONTHS = Array.from({length:12},(_,i)=>{
  const d = new Date(); d.setMonth(d.getMonth()-i)
  return d.toISOString().slice(0,7)
})
const DED_TYPES = [
  {v:'traffic_fine',  l:'🚨 Traffic Fine'},
  {v:'iloe_fee',      l:'📋 ILOE Fee'},
  {v:'iloe_fine',     l:'⚠️ ILOE Fine'},
  {v:'cash_variance', l:'💸 Cash Variance'},
  {v:'other',         l:'📌 Other'},
]
const BON_TYPES = [{v:'performance',l:'Performance'},{v:'kpi',l:'KPI Bonus'},{v:'other',l:'Other'}]
const DED_COLORS = { traffic_fine:'#C0392B', iloe_fee:'#1D6FA4', iloe_fine:'#C0392B', cash_variance:'#B45309', other:'#6B5D4A' }

function AddDeductionModal({ employees, month, onSave, onClose }) {
  const [form, setForm] = useState({ emp_id:'', type:'traffic_fine', amount:'', description:'', reference:'' })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  async function handleSave() {
    if (!form.emp_id||!form.amount) return alert('Employee and amount required')
    setSaving(true)
    try { await payrollApi.addDeduction({...form, month, amount:parseFloat(form.amount)}); onSave() }
    catch(e) { alert(e.message) } finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:420 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18 }}>
          <h3 style={{ fontWeight:700,fontSize:16,color:'#1A1612' }}>Add Deduction</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17}/></button>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          <div><label className="input-label">Employee *</label>
            <select className="input" value={form.emp_id} onChange={e=>set('emp_id',e.target.value)}>
              <option value="">Select DA…</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
            </select></div>
          <div><label className="input-label">Type *</label>
            <select className="input" value={form.type} onChange={e=>set('type',e.target.value)}>
              {DED_TYPES.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
            </select></div>
          <div><label className="input-label">Amount (AED) *</label>
            <input className="input" type="number" step="0.01" value={form.amount} onChange={e=>set('amount',e.target.value)} placeholder="0.00"/></div>
          <div><label className="input-label">Description <span style={{ color:'#A89880',fontSize:10 }}>(DA will see this)</span></label>
            <input className="input" value={form.description} onChange={e=>set('description',e.target.value)} placeholder="e.g. Fine for Salik zone violation on 15 Dec"/></div>
          <div><label className="input-label">Reference</label>
            <input className="input" value={form.reference} onChange={e=>set('reference',e.target.value)} placeholder="Fine No / ticket No"/></div>
        </div>
        <div style={{ display:'flex',gap:10,justifyContent:'flex-end',marginTop:18 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Add Deduction'}</button>
        </div>
      </div>
    </div>
  )
}

function AddBonusModal({ employees, month, onSave, onClose }) {
  const [form, setForm] = useState({ emp_id:'', type:'performance', amount:'', description:'' })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  async function handleSave() {
    if (!form.emp_id||!form.amount) return alert('Employee and amount required')
    setSaving(true)
    try { await payrollApi.addBonus({...form, month, amount:parseFloat(form.amount)}); onSave() }
    catch(e) { alert(e.message) } finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:400 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18 }}>
          <h3 style={{ fontWeight:700,fontSize:16,color:'#1A1612' }}>Add Bonus / Addition</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17}/></button>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          <div><label className="input-label">Employee *</label>
            <select className="input" value={form.emp_id} onChange={e=>set('emp_id',e.target.value)}>
              <option value="">Select DA…</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
            </select></div>
          <div><label className="input-label">Type</label>
            <select className="input" value={form.type} onChange={e=>set('type',e.target.value)}>
              {BON_TYPES.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
            </select></div>
          <div><label className="input-label">Amount (AED) *</label>
            <input className="input" type="number" step="0.01" value={form.amount} onChange={e=>set('amount',e.target.value)}/></div>
          <div><label className="input-label">Description</label>
            <input className="input" value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Reason for bonus"/></div>
        </div>
        <div style={{ display:'flex',gap:10,justifyContent:'flex-end',marginTop:18 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Add Bonus'}</button>
        </div>
      </div>
    </div>
  )
}

function exportPayslipTxt(slip) {
  const net = Number(slip.net_pay||Number(slip.base_salary)+Number(slip.bonus_total||0)-Number(slip.deduction_total||0))
  const lines = [
    '===============================================',
    '       GOLDEN CRESCENT DELIVERY SERVICES',
    '     Burjuman Business Tower, Dubai, UAE',
    '===============================================',
    `  PAYSLIP — ${slip.month}`,
    `  Employee : ${slip.name}`,
    `  ID       : ${slip.emp_id}`,
    `  Station  : ${slip.station_code||'DDB7'}`,
    '-----------------------------------------------',
    `  Base Salary     : AED ${Number(slip.base_salary).toLocaleString().padStart(10)}`,
  ]
  if (slip.bonuses?.length) {
    lines.push('  --- Additions ---')
    slip.bonuses.forEach(b=>lines.push(`  ${(b.type).padEnd(16)}: AED ${Number(b.amount).toLocaleString().padStart(10)}`))
  }
  if (slip.deductions?.length) {
    lines.push('  --- Deductions ---')
    slip.deductions.forEach(d=>lines.push(`  ${(DED_TYPES.find(t=>t.v===d.type)?.l||d.type).padEnd(18)}: AED -${Number(d.amount).toLocaleString()}`))
  }
  lines.push('-----------------------------------------------')
  lines.push(`  NET PAY         : AED ${net.toLocaleString().padStart(10)}`)
  lines.push(`  Status          : ${slip.payroll_status==='paid'?'PAID':'PENDING'}`)
  lines.push('===============================================')
  lines.push(`  Generated: ${new Date().toLocaleDateString('en-AE')}`)
  lines.push('===============================================')
  const blob = new Blob([lines.join('\n')], {type:'text/plain'})
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `payslip_${slip.emp_id}_${slip.month}.txt`
  a.click()
}

function exportAllSalariesCSV(payroll, month) {
  const rows = [['Employee ID','Name','Station','Base Salary','Bonus','Deductions','Net Pay','Status']]
  payroll.forEach(s=>{
    const net = Number(s.net_pay||Number(s.base_salary)+Number(s.bonus_total||0)-Number(s.deduction_total||0))
    rows.push([s.emp_id,s.name,s.station_code||'DDB7',s.base_salary,s.bonus_total||0,s.deduction_total||0,net,s.payroll_status])
  })
  const csv  = rows.map(r=>r.join(',')).join('\n')
  const blob = new Blob([csv], {type:'text/csv'})
  const a    = document.createElement('a')
  a.href     = URL.createObjectURL(blob)
  a.download = `salaries_${month}.csv`
  a.click()
}

export default function PayrollPage() {
  const [payroll,   setPayroll]   = useState([])
  const [employees, setEmployees] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [month,     setMonth]     = useState(MONTHS[0])
  const [expanded,  setExpanded]  = useState(null)
  const [modal,     setModal]     = useState(null) // 'deduction'|'bonus'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pr, emps] = await Promise.all([payrollApi.list({month}), empApi.list()])
      setPayroll(pr.payroll)
      setEmployees(emps.employees)
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [month])

  useEffect(()=>{ load() },[load])
  useSocket({
    'payroll:deduction_added': ()=>load(),
    'payroll:deduction_removed': ()=>load(),
    'payroll:bonus_added': ()=>load(),
    'payroll:paid': ()=>load(),
  })

  async function markPaid(slip) {
    if (!confirm(`Mark ${slip.name} — ${month} as PAID?`)) return
    try { await payrollApi.markPaid([slip.emp_id], month); load() }
    catch(e) { alert(e.message) }
  }

  async function markAllPaid() {
    const unpaid = payroll.filter(p=>p.payroll_status!=='paid')
    if (!unpaid.length) return alert('All already paid')
    if (!confirm(`Mark ALL ${unpaid.length} employees as paid for ${month}?`)) return
    try {
      await payrollApi.markPaid(unpaid.map(p=>p.emp_id), month); load()
    } catch(e) { alert(e.message) }
  }

  const totalBase = payroll.reduce((s,p)=>s+Number(p.base_salary),0)
  const totalBonus= payroll.reduce((s,p)=>s+Number(p.bonus_total||0),0)
  const totalDed  = payroll.reduce((s,p)=>s+Number(p.deduction_total||0),0)
  const totalNet  = payroll.reduce((s,p)=>s+Number(p.net_pay||Number(p.base_salary)+Number(p.bonus_total||0)-Number(p.deduction_total||0)),0)
  const paidCount = payroll.filter(p=>p.payroll_status==='paid').length

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, animation:'slideUp 0.35s ease' }}>
      {/* Controls */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <select className="input" value={month} onChange={e=>setMonth(e.target.value)} style={{ width:160 }}>
          {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <div style={{ flex:1 }}/>
        <button className="btn btn-secondary btn-sm" onClick={()=>exportAllSalariesCSV(payroll,month)}>
          <Download size={13}/> Export CSV
        </button>
        <button className="btn btn-secondary btn-sm" onClick={()=>setModal('bonus')}>
          <Plus size={13}/> Add Bonus
        </button>
        <button className="btn btn-danger btn-sm" onClick={()=>setModal('deduction')}>
          <Plus size={13}/> Add Deduction
        </button>
        <button className="btn btn-primary btn-sm" onClick={markAllPaid}>
          <Check size={13}/> Mark All Paid
        </button>
      </div>

      {/* Totals */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12 }}>
        {[
          {l:'Total Base',   v:`AED ${totalBase.toLocaleString()}`,  c:'#1A1612', bg:'#F5F4F1', bc:'#EAE6DE'},
          {l:'+ Bonuses',    v:`AED ${totalBonus.toLocaleString()}`, c:'#2E7D52', bg:'#ECFDF5', bc:'#A7F3D0'},
          {l:'- Deductions', v:`AED ${totalDed.toLocaleString()}`,   c:'#C0392B', bg:'#FEF2F2', bc:'#FCA5A5'},
          {l:'Net Payroll',  v:`AED ${totalNet.toLocaleString()}`,   c:'#B8860B', bg:'#FDF6E3', bc:'#F0D78C'},
          {l:'Paid',         v:`${paidCount}/${payroll.length}`,     c:'#1D6FA4', bg:'#EFF6FF', bc:'#BFDBFE'},
        ].map((s,i)=>(
          <div key={s.l} className="stat-card" style={{ textAlign:'center', background:s.bg, border:`1px solid ${s.bc}`, animationDelay:`${i*0.06}s`, padding:'14px 10px' }}>
            <div style={{ fontWeight:800, fontSize:18, color:s.c, letterSpacing:'-0.03em', marginBottom:3 }}>{s.v}</div>
            <div style={{ fontSize:11, color:s.c, fontWeight:600, opacity:0.8 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Payroll cards */}
      {loading ? <div style={{ padding:40,textAlign:'center',color:'#A89880' }}>Loading…</div> : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {payroll.map((slip,i) => {
            const net = Number(slip.net_pay||Number(slip.base_salary)+Number(slip.bonus_total||0)-Number(slip.deduction_total||0))
            const isOpen = expanded === slip.emp_id
            return (
              <div key={slip.emp_id} style={{ background:'#FFF', border:'1px solid #EAE6DE', borderRadius:14, overflow:'hidden', animation:`slideUp 0.3s ${i*0.04}s ease both` }}>
                {/* Row */}
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', cursor:'pointer' }} onClick={()=>setExpanded(isOpen?null:slip.emp_id)}>
                  <div style={{ width:38,height:38,borderRadius:10,background:'#FDF6E3',border:'1px solid #F0D78C',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>{slip.avatar}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700,fontSize:13.5,color:'#1A1612' }}>{slip.name}</div>
                    <div style={{ fontSize:11,color:'#A89880',marginTop:1 }}>{slip.emp_id} · {slip.station_code||'DDB7'}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontWeight:800,fontSize:16,color:slip.payroll_status==='paid'?'#2E7D52':'#B8860B',letterSpacing:'-0.02em' }}>AED {net.toLocaleString()}</div>
                    <div style={{ fontSize:11,color:'#A89880',marginTop:1 }}>Base: {Number(slip.base_salary).toLocaleString()} {Number(slip.bonus_total)>0&&<span style={{ color:'#2E7D52' }}>+{Number(slip.bonus_total).toLocaleString()}</span>} {Number(slip.deduction_total)>0&&<span style={{ color:'#C0392B' }}>-{Number(slip.deduction_total).toLocaleString()}</span>}</div>
                  </div>
                  <span className={`badge ${slip.payroll_status==='paid'?'badge-success':'badge-warning'}`} style={{ flexShrink:0 }}>{slip.payroll_status==='paid'?'Paid':'Pending'}</span>
                  {isOpen?<ChevronUp size={16} color="#A89880"/>:<ChevronDown size={16} color="#A89880"/>}
                </div>

                {/* Expanded */}
                {isOpen && (
                  <div style={{ borderTop:'1px solid #F5F4F1', padding:'14px 18px', background:'#FAFAF8' }}>
                    <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={()=>exportPayslipTxt(slip)}><FileText size={12}/> Export Payslip</button>
                      {slip.payroll_status!=='paid' && <button className="btn btn-success btn-sm" onClick={()=>markPaid(slip)}><Check size={12}/> Mark Paid</button>}
                    </div>

                    {slip.bonuses?.length>0 && (
                      <div style={{ marginBottom:12 }}>
                        <div style={{ fontSize:11,fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',color:'#2E7D52',marginBottom:8 }}>Bonuses / Additions</div>
                        {slip.bonuses.map(b=>(
                          <div key={b.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',background:'#F0FDF4',borderRadius:8,border:'1px solid #A7F3D0',marginBottom:5 }}>
                            <div>
                              <span style={{ fontSize:12,fontWeight:600,color:'#2E7D52' }}>{b.type}</span>
                              {b.description&&<span style={{ fontSize:11,color:'#A89880',marginLeft:8 }}>{b.description}</span>}
                            </div>
                            <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                              <span style={{ fontFamily:'monospace',fontWeight:700,color:'#2E7D52' }}>+AED {Number(b.amount).toLocaleString()}</span>
                              <button className="btn btn-ghost btn-icon btn-sm" style={{ color:'#C0392B' }} onClick={()=>payrollApi.removeDeduction(b.id).then(load)}>×</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {slip.deductions?.length>0 && (
                      <div>
                        <div style={{ fontSize:11,fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',color:'#C0392B',marginBottom:8 }}>Deductions</div>
                        {slip.deductions.map(d=>(
                          <div key={d.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'7px 10px',background:'#FEF7F6',borderRadius:8,border:'1px solid #FCA5A5',marginBottom:5 }}>
                            <div style={{ flex:1,marginRight:10 }}>
                              <span style={{ fontSize:12,fontWeight:600,color:DED_COLORS[d.type]||'#6B5D4A' }}>{DED_TYPES.find(t=>t.v===d.type)?.l||d.type}</span>
                              {d.description&&<div style={{ fontSize:11,color:'#6B5D4A',marginTop:2 }}>{d.description}</div>}
                              {d.reference&&<div style={{ fontSize:10,color:'#C4B49A',fontFamily:'monospace' }}>Ref: {d.reference}</div>}
                            </div>
                            <div style={{ display:'flex',gap:8,alignItems:'center',flexShrink:0 }}>
                              <span style={{ fontFamily:'monospace',fontWeight:700,color:'#C0392B' }}>-AED {Number(d.amount).toLocaleString()}</span>
                              <button className="btn btn-ghost btn-icon btn-sm" style={{ color:'#C0392B' }} onClick={()=>payrollApi.removeDeduction(d.id).then(load)}>×</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!slip.deductions?.length && !slip.bonuses?.length && (
                      <div style={{ textAlign:'center',color:'#C4B49A',fontSize:12,padding:'10px 0' }}>No deductions or bonuses this month</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {payroll.length===0 && <div style={{ textAlign:'center',padding:40,color:'#A89880' }}>No payroll data for {month}</div>}
        </div>
      )}

      {modal==='deduction' && <AddDeductionModal employees={employees} month={month} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal==='bonus'     && <AddBonusModal     employees={employees} month={month} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
    </div>
  )
}
