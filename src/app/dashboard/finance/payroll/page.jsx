'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { payrollApi, empApi } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import { Plus, X, Download, Check, ChevronDown, ChevronUp, FileText, TrendingUp, Wallet, AlertCircle, Search, Users } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL

const MONTHS = Array.from({length:12},(_,i)=>{
  const d = new Date(); d.setMonth(d.getMonth()-i)
  return d.toISOString().slice(0,7)
})
const DED_TYPES = [
  {v:'traffic_fine',  l:'Traffic Fine',   c:'#C0392B'},
  {v:'iloe_fee',      l:'ILOE Fee',       c:'#1D6FA4'},
  {v:'iloe_fine',     l:'ILOE Fine',      c:'#C0392B'},
  {v:'cash_variance', l:'Cash Variance',  c:'#B45309'},
  {v:'other',         l:'Other',          c:'#6B5D4A'},
]
const BON_TYPES = [
  {v:'performance',l:'Performance',  c:'#2E7D52'},
  {v:'kpi',        l:'KPI Bonus',    c:'#1D6FA4'},
  {v:'other',      l:'Other',        c:'#B8860B'},
]

function hdr() { return { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }
function fmt(n) { return Number(n||0).toLocaleString('en-AE', {minimumFractionDigits:0, maximumFractionDigits:0}) }

// ── Excel export (professional, styled) ──────────────────────
function exportToExcel(payroll, month, single=null) {
  const rows = single ? [single] : payroll

  // Build CSV with Excel-compatible formatting
  const headers = ['Employee Name','Employee ID','Station','Project','Base Salary (AED)','Bonuses (AED)','Deductions (AED)','Net Pay (AED)','Status','Paid On']
  const csvRows = [
    [`GOLDEN CRESCENT DELIVERY SERVICES`],
    [`Payroll Report — ${month}`],
    [`Generated: ${new Date().toLocaleDateString('en-AE')}`],
    [],
    headers,
    ...rows.map(s => {
      const net = Number(s.net_pay||(Number(s.base_salary)+Number(s.bonus_total||0)-Number(s.deduction_total||0)))
      return [
        s.name, s.id, s.station_code||'', (s.project_type||'pulser').toUpperCase(),
        Number(s.base_salary||0), Number(s.bonus_total||0), Number(s.deduction_total||0),
        net, s.payroll_status==='paid'?'PAID':'PENDING', s.paid_on?.slice(0,10)||''
      ]
    }),
    [],
    ['','','','TOTALS',
      rows.reduce((a,s)=>a+Number(s.base_salary||0),0),
      rows.reduce((a,s)=>a+Number(s.bonus_total||0),0),
      rows.reduce((a,s)=>a+Number(s.deduction_total||0),0),
      rows.reduce((a,s)=>a+Number(s.net_pay||(Number(s.base_salary)+Number(s.bonus_total||0)-Number(s.deduction_total||0))),0),
      `${rows.filter(s=>s.payroll_status==='paid').length}/${rows.length} paid`, ''
    ]
  ]

  const csv = csvRows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8'})
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = single ? `payroll_${single.id}_${month}.csv` : `payroll_${month}_all.csv`
  a.click()
}

// ── HTML Payslip (print-quality) ─────────────────────────────
function generatePayslip(slip, month) {
  const net = Number(slip.net_pay||(Number(slip.base_salary)+Number(slip.bonus_total||0)-Number(slip.deduction_total||0)))
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Payslip — ${slip.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
  .slip { background: white; max-width: 750px; margin: 0 auto; border: 2px solid #1a1a2e; border-radius: 8px; overflow: hidden; }
  .header { background: #1a1a2e; color: white; padding: 20px 24px; display: flex; align-items: center; gap: 16px; }
  .logo { width: 60px; height: 60px; background: #B8860B; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; color: white; flex-shrink: 0; }
  .company { flex: 1; }
  .company h1 { font-size: 18px; letter-spacing: 0.05em; margin-bottom: 3px; }
  .company p { font-size: 11px; color: rgba(255,255,255,0.6); line-height: 1.5; }
  .slip-title { background: #B8860B; color: white; text-align: center; padding: 10px; font-size: 16px; font-weight: 700; letter-spacing: 0.1em; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-bottom: 2px solid #eee; }
  .info-cell { padding: 10px 20px; border-right: 1px solid #eee; border-bottom: 1px solid #eee; }
  .info-cell:nth-child(even) { border-right: none; }
  .info-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px; }
  .info-value { font-size: 13px; font-weight: 700; color: #1a1a2e; }
  .table-section { display: grid; grid-template-columns: 1fr 1fr; }
  .table-col { padding: 0; }
  .table-col:first-child { border-right: 2px solid #eee; }
  .col-head { background: #f8f8f8; padding: 10px 16px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #1a1a2e; border-bottom: 1px solid #eee; }
  .row { display: flex; justify-content: space-between; padding: 8px 16px; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
  .row .label { color: #555; }
  .row .amount { font-weight: 600; color: #1a1a2e; }
  .row .green { color: #2E7D52; }
  .row .red { color: #C0392B; }
  .total-row { background: #f8f8f8; font-weight: 800; border-top: 2px solid #ddd; }
  .net-row { background: #1a1a2e; color: white; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; }
  .net-row .net-label { font-size: 14px; font-weight: 600; }
  .net-row .net-amount { font-size: 22px; font-weight: 900; color: #B8860B; }
  .footer { padding: 16px 20px; border-top: 2px solid #eee; }
  .sig-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 8px; }
  .sig-box { border-top: 1px solid #999; padding-top: 6px; font-size: 10px; color: #888; text-align: center; }
  .status-badge { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; background: ${slip.payroll_status==='paid'?'#ECFDF5':'#FFFBEB'}; color: ${slip.payroll_status==='paid'?'#2E7D52':'#B45309'}; border: 1px solid ${slip.payroll_status==='paid'?'#A7F3D0':'#FCD34D'}; }
  @media print { body { background: white; padding: 0; } .slip { border: none; } }
</style>
</head>
<body>
<div class="slip">
  <div class="header">
    <div class="logo">GCD</div>
    <div class="company">
      <h1>GOLDEN CRESCENT DELIVERY SERVICES LLC</h1>
      <p>Burjuman Business Tower, Dubai, UAE<br/>TRN No. : 104563584200003</p>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:4px">PAYSLIP</div>
      <div style="font-size:18px;font-weight:900;color:#B8860B">${month}</div>
      <div style="margin-top:6px"><span class="status-badge">${slip.payroll_status==='paid'?'✓ PAID':'PENDING'}</span></div>
    </div>
  </div>
  <div class="info-grid">
    <div class="info-cell"><div class="info-label">Employee Name</div><div class="info-value">${slip.name}</div></div>
    <div class="info-cell"><div class="info-label">Employee ID</div><div class="info-value">${slip.id}</div></div>
    <div class="info-cell"><div class="info-label">Designation</div><div class="info-value">${slip.role||'Delivery Associate'}</div></div>
    <div class="info-cell"><div class="info-label">Station</div><div class="info-value">${slip.station_code||'—'}</div></div>
    <div class="info-cell"><div class="info-label">Project Type</div><div class="info-value">${(slip.project_type||'Pulser').toUpperCase()}</div></div>
    <div class="info-cell"><div class="info-label">Pay Period</div><div class="info-value">${new Date(month+'-01').toLocaleString('en-AE',{month:'long',year:'numeric'})}</div></div>
  </div>
  <div class="table-section">
    <div class="table-col">
      <div class="col-head">Earnings</div>
      <div class="row"><span class="label">Base Salary</span><span class="amount">AED ${fmt(slip.base_salary)}</span></div>
      ${(slip.bonuses||[]).map(b=>`<div class="row"><span class="label">${b.type||'Bonus'}</span><span class="amount green">AED +${fmt(b.amount)}</span></div>`).join('')}
      <div class="row total-row"><span class="label">Gross Amount</span><span class="amount">AED ${fmt(Number(slip.base_salary)+Number(slip.bonus_total||0))}</span></div>
    </div>
    <div class="table-col">
      <div class="col-head">Deductions</div>
      ${(slip.deductions||[]).map(d=>`<div class="row"><span class="label">${DED_TYPES.find(t=>t.v===d.type)?.l||d.type}</span><span class="amount red">AED ${fmt(d.amount)}</span></div>`).join('')}
      ${!(slip.deductions?.length)? '<div class="row"><span class="label">—</span><span class="amount">AED 0</span></div>' : ''}
      <div class="row total-row"><span class="label">Total Deductions</span><span class="amount red">AED ${fmt(slip.deduction_total||0)}</span></div>
    </div>
  </div>
  <div class="net-row">
    <div class="net-label">NET SALARY</div>
    <div class="net-amount">AED ${fmt(net)}</div>
  </div>
  <div class="footer">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div style="font-size:12px;color:#555">Payment Method: <strong>Bank Transfer</strong></div>
      ${slip.paid_on ? `<div style="font-size:12px;color:#555">Date Paid: <strong>${slip.paid_on.slice(0,10)}</strong></div>` : ''}
    </div>
    <div class="sig-row">
      <div class="sig-box">Employee Signature</div>
      <div class="sig-box">HR Manager</div>
      <div class="sig-box">Authorized By</div>
    </div>
    <div style="text-align:center;font-size:9px;color:#bbb;margin-top:12px">This is a computer-generated payslip. Golden Crescent Delivery Services LLC — ${month}</div>
  </div>
</div>
<script>window.onload=()=>window.print()</script>
</body>
</html>`
  const w = window.open('','_blank')
  w.document.write(html)
  w.document.close()
}

// ── Add Deduction Modal ───────────────────────────────────────
function DeductionModal({ employees, month, onSave, onClose }) {
  const [form, setForm] = useState({ emp_id:'', type:'traffic_fine', amount:'', description:'', reference:'' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  async function handleSave() {
    if (!form.emp_id||!form.amount) return setErr('Employee and amount required')
    setSaving(true); setErr(null)
    try { await payrollApi.addDeduction({...form, month, amount:parseFloat(form.amount)}); onSave() }
    catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:440, padding:0, overflow:'hidden' }}>
        <div style={{ padding:'22px 24px 16px', background:'linear-gradient(135deg,#FEF2F2,#FFF9F9)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div>
              <h3 style={{ fontWeight:900, fontSize:17, color:'#1A1612' }}>Add Deduction</h3>
              <p style={{ fontSize:11.5, color:'#A89880', marginTop:2 }}>{month}</p>
            </div>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:9, background:'rgba(0,0,0,0.05)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14}/></button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
            {DED_TYPES.map(t=>(
              <button key={t.v} onClick={()=>set('type',t.v)} type="button"
                style={{ padding:'8px 4px', borderRadius:10, border:`2px solid ${form.type===t.v?t.c:'#EAE6DE'}`, background:form.type===t.v?`${t.c}12`:'#FFF', cursor:'pointer', textAlign:'center', transition:'all 0.18s' }}>
                <div style={{ fontSize:9.5, fontWeight:700, color:form.type===t.v?t.c:'#A89880', lineHeight:1.3 }}>{t.l}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding:'16px 24px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          {err && <div style={{ display:'flex', gap:8, alignItems:'center', background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:9, padding:'9px 12px', fontSize:12.5, color:'#C0392B' }}><AlertCircle size={13}/>{err}</div>}
          <div><label className="input-label">Employee *</label>
            <select className="input" value={form.emp_id} onChange={e=>set('emp_id',e.target.value)}>
              <option value="">Select DA…</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.name} — {e.id}</option>)}
            </select></div>
          <div><label className="input-label">Amount (AED) *</label>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'#A89880', fontWeight:600 }}>AED</span>
              <input className="input" type="number" step="0.01" value={form.amount} onChange={e=>set('amount',e.target.value)} style={{ paddingLeft:48, fontSize:15, fontWeight:700 }}/>
            </div></div>
          <div><label className="input-label">Description</label>
            <input className="input" value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Visible to DA"/></div>
          <div><label className="input-label">Reference No.</label>
            <input className="input" value={form.reference} onChange={e=>set('reference',e.target.value)} placeholder="Fine / ticket number"/></div>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex:2, justifyContent:'center', background:`linear-gradient(135deg,${DED_TYPES.find(t=>t.v===form.type)?.c||'#C0392B'},${DED_TYPES.find(t=>t.v===form.type)?.c||'#C0392B'}cc)` }}>
              {saving?'Saving…':'Add Deduction'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Bonus Modal — single or bulk ──────────────────────────────
function BonusModal({ employees, month, onSave, onClose }) {
  const [bulk,    setBulk]    = useState(false)
  const [empId,   setEmpId]   = useState('')
  const [type,    setType]    = useState('performance')
  const [amount,  setAmount]  = useState('')
  const [desc,    setDesc]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState(null)
  const [progress,setProgress]= useState(null)

  async function handleSave() {
    if (!amount) return setErr('Amount required')
    if (!bulk && !empId) return setErr('Select an employee')
    setSaving(true); setErr(null)
    try {
      if (bulk) {
        // Add to ALL employees
        setProgress(`Adding to ${employees.length} employees…`)
        await Promise.all(employees.map(e =>
          payrollApi.addBonus({ emp_id:e.id, type, amount:parseFloat(amount), description:desc, month })
        ))
        setProgress(null)
      } else {
        await payrollApi.addBonus({ emp_id:empId, type, amount:parseFloat(amount), description:desc, month })
      }
      onSave()
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:440, padding:0, overflow:'hidden' }}>
        <div style={{ padding:'22px 24px 16px', background:'linear-gradient(135deg,#ECFDF5,#F0FFF8)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div>
              <h3 style={{ fontWeight:900, fontSize:17, color:'#1A1612' }}>Add Bonus</h3>
              <p style={{ fontSize:11.5, color:'#A89880', marginTop:2 }}>{month}</p>
            </div>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:9, background:'rgba(0,0,0,0.05)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14}/></button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {BON_TYPES.map(t=>(
              <button key={t.v} onClick={()=>setType(t.v)} type="button"
                style={{ padding:'10px 6px', borderRadius:10, border:`2px solid ${type===t.v?t.c:'#EAE6DE'}`, background:type===t.v?`${t.c}12`:'#FFF', cursor:'pointer', textAlign:'center', transition:'all 0.18s' }}>
                <div style={{ fontSize:11, fontWeight:700, color:type===t.v?t.c:'#A89880' }}>{t.l}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding:'16px 24px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          {err && <div style={{ display:'flex', gap:8, alignItems:'center', background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:9, padding:'9px 12px', fontSize:12.5, color:'#C0392B' }}><AlertCircle size={13}/>{err}</div>}

          {/* Bulk toggle */}
          <div style={{ display:'flex', gap:8 }}>
            {[{v:false,l:'Single Employee'},{v:true,l:`All ${employees.length} Employees`}].map(opt=>(
              <button key={String(opt.v)} onClick={()=>{setBulk(opt.v);setEmpId('')}} type="button"
                style={{ flex:1, padding:'9px', borderRadius:10, border:`2px solid ${bulk===opt.v?'#2E7D52':'#EAE6DE'}`, background:bulk===opt.v?'#ECFDF5':'#FFF', color:bulk===opt.v?'#2E7D52':'#A89880', fontWeight:700, fontSize:12, cursor:'pointer', transition:'all 0.18s', fontFamily:'Poppins,sans-serif' }}>
                {opt.l}
              </button>
            ))}
          </div>

          {!bulk && (
            <div><label className="input-label">Employee *</label>
              <select className="input" value={empId} onChange={e=>setEmpId(e.target.value)}>
                <option value="">Select DA…</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.name} — {e.id}</option>)}
              </select></div>
          )}

          {bulk && (
            <div style={{ background:'#FDF6E3', border:'1px solid #F0D78C', borderRadius:10, padding:'10px 12px', fontSize:12.5, color:'#B8860B', fontWeight:600 }}>
              This bonus will be added to all {employees.length} employees for {month}
            </div>
          )}

          <div><label className="input-label">Amount (AED) *</label>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'#A89880', fontWeight:600 }}>AED</span>
              <input className="input" type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} style={{ paddingLeft:48, fontSize:15, fontWeight:700 }}/>
            </div></div>
          <div><label className="input-label">Description</label>
            <input className="input" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Reason for bonus"/></div>

          {progress && <div style={{ background:'#ECFDF5', border:'1px solid #A7F3D0', borderRadius:9, padding:'8px 12px', fontSize:12, color:'#2E7D52', fontWeight:600 }}>{progress}</div>}

          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ flex:2, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px', borderRadius:10, background:'linear-gradient(135deg,#2E7D52,#22C55E)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', opacity:saving?0.7:1 }}>
              {saving ? <><span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Saving…</> : bulk ? `Add to All (${employees.length})` : 'Add Bonus'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Salary Edit Modal ─────────────────────────────────────────
function SalaryModal({ emp, onSave, onClose }) {
  const [salary, setSalary] = useState(emp?.base_salary||'')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!salary) return
    setSaving(true)
    try {
      await fetch(`${API}/api/employees/${emp.id}`, {
        method:'PUT', headers:hdr(),
        body:JSON.stringify({ ...emp, salary:parseFloat(salary) })
      })
      onSave()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:340 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <h3 style={{ fontWeight:900, fontSize:16, color:'#1A1612' }}>Edit Base Salary</h3>
            <p style={{ fontSize:12, color:'#A89880', marginTop:2 }}>{emp.name}</p>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:9, background:'#F5F4F1', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14}/></button>
        </div>
        <div>
          <label className="input-label">Base Salary (AED/month)</label>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'#A89880', fontWeight:600 }}>AED</span>
            <input className="input" type="number" value={salary} onChange={e=>setSalary(e.target.value)} autoFocus style={{ paddingLeft:48, fontSize:20, fontWeight:900 }}/>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex:2, justifyContent:'center' }}>{saving?'Saving…':'Update'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Payroll Card ──────────────────────────────────────────────
function PayrollCard({ slip, onMarkPaid, onEditSalary, onRemoveDed, onRemoveBonus, onExport, index }) {
  const [open, setOpen] = useState(false)
  const net    = Number(slip.net_pay||(Number(slip.base_salary)+Number(slip.bonus_total||0)-Number(slip.deduction_total||0)))
  const isPaid = slip.payroll_status === 'paid'

  return (
    <div style={{ background:'#FFF', border:`1.5px solid ${isPaid?'#A7F3D0':'#EAE6DE'}`, borderRadius:16, overflow:'hidden', animation:`slideUp 0.4s ${index*0.04}s ease both`, transition:'box-shadow 0.2s' }}>
      <div style={{ padding:'14px 16px', cursor:'pointer' }} onClick={()=>setOpen(p=>!p)}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(135deg,#FDF6E3,#FEF3D0)', border:'1.5px solid #F0D78C', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:'#B8860B', flexShrink:0 }}>
            {slip.name?.slice(0,2).toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:14, color:'#1A1612', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{slip.name}</div>
            <div style={{ fontSize:11, color:'#A89880', marginTop:2, display:'flex', gap:6, flexWrap:'wrap' }}>
              <span style={{ fontFamily:'monospace' }}>{slip.id}</span>
              {slip.station_code && <span style={{ background:'#FDF6E3', color:'#B8860B', fontWeight:700, padding:'1px 6px', borderRadius:5, fontSize:10 }}>{slip.station_code}</span>}
              {slip.project_type && <span style={{ background:'#F5F3FF', color:'#7C3AED', fontWeight:700, padding:'1px 6px', borderRadius:5, fontSize:10 }}>{slip.project_type.toUpperCase()}</span>}
            </div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontWeight:900, fontSize:16, color:isPaid?'#2E7D52':'#B8860B', letterSpacing:'-0.02em' }}>AED {fmt(net)}</div>
            <div style={{ display:'flex', alignItems:'center', gap:5, justifyContent:'flex-end', marginTop:4 }}>
              <span style={{ fontSize:10, fontWeight:700, color:isPaid?'#2E7D52':'#B45309', background:isPaid?'#ECFDF5':'#FFFBEB', border:`1px solid ${isPaid?'#A7F3D0':'#FCD34D'}`, padding:'2px 8px', borderRadius:20 }}>
                {isPaid?'✓ Paid':'Pending'}
              </span>
              {open ? <ChevronUp size={13} color="#A89880"/> : <ChevronDown size={13} color="#A89880"/>}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, color:'#6B5D4A', background:'#FAFAF8', border:'1px solid #EAE6DE', borderRadius:8, padding:'3px 9px' }}>Base: AED {fmt(slip.base_salary)}</span>
          {Number(slip.bonus_total)>0 && <span style={{ fontSize:11, color:'#2E7D52', background:'#ECFDF5', border:'1px solid #A7F3D0', borderRadius:8, padding:'3px 9px' }}>+AED {fmt(slip.bonus_total)}</span>}
          {Number(slip.deduction_total)>0 && <span style={{ fontSize:11, color:'#C0392B', background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:8, padding:'3px 9px' }}>-AED {fmt(slip.deduction_total)}</span>}
        </div>
      </div>

      {open && (
        <div style={{ borderTop:'1px solid #F5F4F1' }}>
          <div style={{ padding:'10px 14px', display:'flex', gap:8, flexWrap:'wrap', background:'#FAFAF8', borderBottom:'1px solid #F5F4F1' }}>
            <button onClick={()=>onEditSalary(slip)} style={{ padding:'6px 12px', borderRadius:9, background:'#FFF', border:'1px solid #EAE6DE', fontSize:11.5, fontWeight:600, color:'#6B5D4A', cursor:'pointer', fontFamily:'Poppins,sans-serif', display:'flex', alignItems:'center', gap:5 }}><Wallet size={12}/> Edit Salary</button>
            <button onClick={()=>onExport(slip)} style={{ padding:'6px 12px', borderRadius:9, background:'#FFF', border:'1px solid #EAE6DE', fontSize:11.5, fontWeight:600, color:'#1D6FA4', cursor:'pointer', fontFamily:'Poppins,sans-serif', display:'flex', alignItems:'center', gap:5 }}><FileText size={12}/> Payslip</button>
            <button onClick={()=>exportToExcel(null, null, slip)} style={{ padding:'6px 12px', borderRadius:9, background:'#FFF', border:'1px solid #EAE6DE', fontSize:11.5, fontWeight:600, color:'#2E7D52', cursor:'pointer', fontFamily:'Poppins,sans-serif', display:'flex', alignItems:'center', gap:5 }}><Download size={12}/> Export CSV</button>
            {!isPaid && <button onClick={()=>onMarkPaid(slip)} style={{ padding:'6px 14px', borderRadius:9, background:'linear-gradient(135deg,#2E7D52,#22C55E)', border:'none', fontSize:11.5, fontWeight:700, color:'#FFF', cursor:'pointer', fontFamily:'Poppins,sans-serif', marginLeft:'auto', display:'flex', alignItems:'center', gap:5 }}><Check size={12}/> Mark Paid</button>}
          </div>

          {slip.bonuses?.length > 0 && (
            <div style={{ padding:'10px 14px', borderBottom:'1px solid #F5F4F1' }}>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', color:'#2E7D52', marginBottom:8 }}>Additions</div>
              {slip.bonuses.map(b=>(
                <div key={b.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 10px', background:'#F0FDF4', borderRadius:9, marginBottom:6 }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:'#2E7D52' }}>{b.type}</div>
                    {b.description && <div style={{ fontSize:11, color:'#A89880', marginTop:1 }}>{b.description}</div>}
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ fontWeight:800, color:'#2E7D52', fontSize:13 }}>+AED {fmt(b.amount)}</span>
                    <button onClick={()=>onRemoveBonus(b.id)} style={{ width:22, height:22, borderRadius:6, background:'#FEF2F2', border:'1px solid #FCA5A5', color:'#C0392B', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, fontFamily:'Poppins,sans-serif' }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {slip.deductions?.length > 0 && (
            <div style={{ padding:'10px 14px' }}>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', color:'#C0392B', marginBottom:8 }}>Deductions</div>
              {slip.deductions.map(d=>{
                const dt = DED_TYPES.find(t=>t.v===d.type)
                return (
                  <div key={d.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'7px 10px', background:'#FEF7F6', borderRadius:9, marginBottom:6 }}>
                    <div style={{ flex:1, marginRight:10 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:dt?.c||'#C0392B' }}>{dt?.l||d.type}</div>
                      {d.description && <div style={{ fontSize:11, color:'#6B5D4A', marginTop:1 }}>{d.description}</div>}
                      {d.reference && <div style={{ fontSize:10, color:'#C4B49A', fontFamily:'monospace', marginTop:1 }}>Ref: {d.reference}</div>}
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                      <span style={{ fontWeight:800, color:'#C0392B', fontSize:13 }}>-AED {fmt(d.amount)}</span>
                      <button onClick={()=>onRemoveDed(d.id)} style={{ width:22, height:22, borderRadius:6, background:'#FEF2F2', border:'1px solid #FCA5A5', color:'#C0392B', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, fontFamily:'Poppins,sans-serif' }}>×</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function PayrollPage() {
  const [payroll,   setPayroll]   = useState([])
  const [employees, setEmployees] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [month,     setMonth]     = useState(MONTHS[0])
  const [modal,     setModal]     = useState(null)
  const [search,    setSearch]    = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pr, emps] = await Promise.all([payrollApi.list({month}), empApi.list()])
      setPayroll(pr.payroll||[])
      setEmployees(emps.employees||[])
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [month])

  useEffect(()=>{ load() },[load])
  useSocket({ 'payroll:deduction_added':load, 'payroll:deduction_removed':load, 'payroll:bonus_added':load, 'payroll:paid':load })

  async function markPaid(slip) {
    if (!confirm(`Mark ${slip.name} as PAID for ${month}?`)) return
    try { await payrollApi.markPaid(slip.id, month); load() } catch(e) { alert(e.message) }
  }
  async function markAllPaid() {
    const unpaid = payroll.filter(p=>p.payroll_status!=='paid')
    if (!unpaid.length) return alert('All already paid')
    if (!confirm(`Mark ALL ${unpaid.length} employees as paid for ${month}?`)) return
    try { await Promise.all(unpaid.map(s=>payrollApi.markPaid(s.id,month))); load() } catch(e) { alert(e.message) }
  }
  async function removeDed(id) { try { await payrollApi.removeDeduction(id); load() } catch(e){ alert(e.message) } }
  async function removeBonus(id) {
    try { await fetch(`${API}/api/payroll/bonuses/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }); load() } catch(e){ alert(e.message) }
  }

  const filtered   = payroll.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase()))
  const totalBase  = payroll.reduce((s,p)=>s+Number(p.base_salary||0),0)
  const totalBonus = payroll.reduce((s,p)=>s+Number(p.bonus_total||0),0)
  const totalDed   = payroll.reduce((s,p)=>s+Number(p.deduction_total||0),0)
  const totalNet   = payroll.reduce((s,p)=>s+Number(p.net_pay||(Number(p.base_salary)+Number(p.bonus_total||0)-Number(p.deduction_total||0))),0)
  const paidCount  = payroll.filter(p=>p.payroll_status==='paid').length

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, animation:'slideUp 0.35s ease' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontWeight:900, fontSize:20, color:'#1A1612', letterSpacing:'-0.03em' }}>Payroll</h1>
          <p style={{ fontSize:12, color:'#A89880', marginTop:3 }}>{payroll.length} employees · {paidCount} paid this month</p>
        </div>
        <select value={month} onChange={e=>setMonth(e.target.value)}
          style={{ padding:'8px 14px', borderRadius:20, border:'1.5px solid #EAE6DE', background:'#FFF', fontSize:13, fontWeight:600, color:'#1A1612', cursor:'pointer', outline:'none', fontFamily:'Poppins,sans-serif' }}>
          {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Summary hero */}
      <div style={{ background:'linear-gradient(135deg,#1A1612 0%,#2C1F0A 100%)', borderRadius:20, padding:'20px 18px', color:'white', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-20, top:-20, width:160, height:160, borderRadius:'50%', background:'rgba(184,134,11,0.12)' }}/>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:4 }}>Net Payroll — {month}</div>
        <div style={{ fontWeight:900, fontSize:26, letterSpacing:'-0.04em', color:'#D4A017', marginBottom:16 }}>AED {fmt(totalNet)}</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {[
            { l:'Base',        v:`${fmt(totalBase)}`,  c:'rgba(255,255,255,0.9)' },
            { l:'+ Bonuses',   v:`${fmt(totalBonus)}`, c:'#4ADE80' },
            { l:'- Deductions',v:`${fmt(totalDed)}`,   c:'#F87171' },
            { l:'Paid',        v:`${paidCount}/${payroll.length}`, c:'#FCD34D' },
          ].map(s=>(
            <div key={s.l} style={{ background:'rgba(255,255,255,0.07)', borderRadius:11, padding:'10px 8px', textAlign:'center' }}>
              <div style={{ fontWeight:800, fontSize:13, color:s.c, letterSpacing:'-0.02em' }}>{s.v}</div>
              <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.4)', marginTop:3, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ flex:'1 1 180px', position:'relative' }}>
          <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#C4B49A', pointerEvents:'none' }}/>
          <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search employee…" style={{ paddingLeft:34, borderRadius:20 }}/>
        </div>
        <button onClick={()=>exportToExcel(payroll,month)} className="btn btn-secondary" style={{ borderRadius:20, fontSize:12 }}>
          <Download size={13}/> Export All CSV
        </button>
        <button onClick={()=>{ filtered.forEach(s => generatePayslip(s, month)) }} className="btn btn-secondary" style={{ borderRadius:20, fontSize:12, color:'#1D6FA4', borderColor:'#BFDBFE', background:'#EFF6FF' }}>
          <FileText size={13}/> All Payslips
        </button>
        <button onClick={()=>setModal('bonus')} style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:20, background:'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border:'1.5px solid #A7F3D0', color:'#2E7D52', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
          <Plus size={13}/> Add Bonus
        </button>
        <button onClick={()=>setModal('deduction')} style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:20, background:'linear-gradient(135deg,#FEF2F2,#FFE4E4)', border:'1.5px solid #FCA5A5', color:'#C0392B', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
          <Plus size={13}/> Add Deduction
        </button>
        <button onClick={markAllPaid} className="btn btn-primary" style={{ borderRadius:20, fontSize:12 }}>
          <Check size={13}/> Mark All Paid
        </button>
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2,3].map(i=><div key={i} className="skeleton" style={{ height:88, borderRadius:16 }}/>)}
        </div>
      ) : filtered.length===0 ? (
        <div style={{ textAlign:'center', padding:'50px 20px', color:'#A89880' }}>
          <Wallet size={40} style={{ margin:'0 auto 10px', display:'block', opacity:0.2 }}/>
          <div style={{ fontWeight:600, color:'#6B5D4A' }}>{search?`No results for "${search}"`:'No payroll data for this month'}</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map((slip,i)=>(
            <PayrollCard key={slip.id||slip.emp_id} slip={slip} index={i}
              onMarkPaid={markPaid}
              onEditSalary={s=>setModal({type:'salary',emp:s})}
              onRemoveDed={removeDed}
              onRemoveBonus={removeBonus}
              onExport={s=>generatePayslip(s,month)}/>
          ))}
        </div>
      )}

      {modal==='deduction'   && <DeductionModal employees={employees} month={month} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal==='bonus'       && <BonusModal     employees={employees} month={month} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal?.type==='salary'&& <SalaryModal    emp={modal.emp}       onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
    </div>
  )
}
