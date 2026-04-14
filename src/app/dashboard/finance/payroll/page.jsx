'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { payrollApi, empApi } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import {
  Plus, X, Download, Check, Search, Wallet, TrendingUp,
  FileText, AlertCircle, Users, ChevronDown, ChevronUp, BarChart2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

const _raw = process.env.NEXT_PUBLIC_API_URL
const API = _raw && !_raw.startsWith("http") ? `https://${_raw}` : (_raw || "http://localhost:4000")
const APP_VERSION = '2.4.0'

const MONTHS = Array.from({length:12},(_,i)=>{
  const d=new Date(); d.setMonth(d.getMonth()-i)
  return d.toISOString().slice(0,7)
})

const DED_TYPES = [
  {v:'traffic_fine',  l:'Traffic Fine',   c:'#EF4444'},
  {v:'iloe_fee',      l:'ILOE Fee',       c:'#3B82F6'},
  {v:'iloe_fine',     l:'ILOE Fine',      c:'#EF4444'},
  {v:'cash_variance', l:'Cash Variance',  c:'#F59E0B'},
  {v:'other',         l:'Other',          c:'#6B5D4A'},
]
const BON_TYPES = [
  {v:'performance',l:'Performance', c:'#10B981'},
  {v:'kpi',        l:'KPI Bonus',   c:'#3B82F6'},
  {v:'other',      l:'Other',       c:'#B8860B'},
]
const ROLE_CFG = {
  admin:           {l:'Admin',           c:'#7C3AED', bg:'rgba(124,58,237,0.1)'},
  manager:         {l:'Manager',         c:'#1D6FA4', bg:'rgba(29,111,164,0.1)'},
  general_manager: {l:'GM',              c:'#0F766E', bg:'rgba(15,118,110,0.1)'},
  hr:              {l:'HR',              c:'#B45309', bg:'rgba(180,83,9,0.1)'},
  accountant:      {l:'Accountant',      c:'#2E7D52', bg:'rgba(46,125,82,0.1)'},
  poc:             {l:'POC',             c:'#B8860B', bg:'rgba(184,134,11,0.1)'},
  driver:          {l:'Driver',          c:'#64748B', bg:'rgba(100,116,139,0.1)'},
}

function hdr() { return { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }
function fmt(n) { return Number(n||0).toLocaleString('en-AE',{minimumFractionDigits:0,maximumFractionDigits:0}) }

const GlassTip = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null
  return (
    <div style={{ background:'rgba(255,255,255,0.95)', backdropFilter:'blur(16px)', border:'1px solid rgba(255,255,255,0.8)', borderRadius:10, padding:'8px 12px', boxShadow:'0 4px 16px rgba(0,0,0,0.1)', fontFamily:'Poppins,sans-serif', fontSize:11.5 }}>
      <div style={{ fontWeight:700, color:'#6B5D4A', marginBottom:4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color:p.color||p.fill, fontWeight:600, display:'flex', gap:8, justifyContent:'space-between' }}>
          <span>{p.name}</span><strong>AED {fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

/* ── Beautiful Payslip ── */
function generatePayslip(slip, month) {
  const net = Number(slip.net_pay||(Number(slip.base_salary)+Number(slip.bonus_total||0)-Number(slip.deduction_total||0)))
  const isPaid = slip.payroll_status === 'paid'
  const roleLabel = ROLE_CFG[slip.role]?.l || slip.role || 'Staff'

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Payslip — ${slip.name} — ${month}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Poppins',Arial,sans-serif;background:#F5EDD8;padding:16px;min-height:100vh;display:flex;align-items:flex-start;justify-content:center;}
  .slip{background:white;width:100%;max-width:680px;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.15);}
  
  /* Header */
  .header{background:linear-gradient(135deg,#0F0C07 0%,#1E1608 50%,#2C1F0A 100%);padding:28px 32px 24px;position:relative;overflow:hidden;}
  .header::before{content:'';position:absolute;right:-40px;top:-40px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(212,160,23,0.2) 0%,transparent 70%);}
  .header::after{content:'';position:absolute;left:-20px;bottom:-30px;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,rgba(56,189,248,0.12) 0%,transparent 70%);}
  .header-grid{display:grid;grid-template-columns:auto 1fr auto;gap:20px;align-items:center;position:relative;}
  .logo-box{width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#B8860B,#D4A017);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:white;letter-spacing:0.05em;box-shadow:0 4px 16px rgba(184,134,11,0.4);}
  .company-name{font-weight:900;font-size:16px;color:white;letter-spacing:-0.02em;margin-bottom:4px;}
  .company-sub{font-size:10.5px;color:rgba(255,255,255,0.45);line-height:1.6;}
  .slip-badge{text-align:right;}
  .slip-title{font-size:13px;font-weight:700;color:rgba(255,255,255,0.45);letter-spacing:0.1em;text-transform:uppercase;}
  .slip-month{font-size:22px;font-weight:900;color:#D4A017;letter-spacing:-0.03em;margin:4px 0;}
  .status-pill{display:inline-block;padding:4px 14px;border-radius:20px;font-size:10.5px;font-weight:700;background:${isPaid?'rgba(52,211,153,0.2)':'rgba(251,146,60,0.2)'};color:${isPaid?'#34D399':'#FB923C'};border:1px solid ${isPaid?'rgba(52,211,153,0.4)':'rgba(251,146,60,0.4)'};}

  /* Employee info band */
  .info-band{background:#FAFAF8;border-bottom:1px solid #EAE6DE;padding:18px 32px;}
  .info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
  .info-item .label{font-size:9.5px;font-weight:700;color:#A89880;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;}
  .info-item .value{font-size:13.5px;font-weight:700;color:#1A1612;}
  .role-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;background:${ROLE_CFG[slip.role]?.bg||'rgba(100,116,139,0.1)'};color:${ROLE_CFG[slip.role]?.c||'#64748B'};border:1px solid ${ROLE_CFG[slip.role]?.c||'#64748B'}33;}

  /* Earnings/Deductions */
  .body{padding:24px 32px;}
  .section-title{font-size:10px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:8px;}
  .section-title::after{content:'';flex:1;height:1px;background:#EAE6DE;}
  .line-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #F5F4F1;}
  .line-row:last-child{border-bottom:none;}
  .line-label{font-size:12.5px;color:#6B5D4A;}
  .line-amount{font-size:13px;font-weight:700;}
  .green{color:#10B981;}
  .red{color:#EF4444;}
  .tables{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;}
  
  /* Net pay hero */
  .net-row{background:linear-gradient(135deg,#0F0C07,#2C1F0A);border-radius:14px;padding:18px 24px;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;}
  .net-label{font-size:13px;font-weight:600;color:rgba(255,255,255,0.6);letter-spacing:0.04em;text-transform:uppercase;}
  .net-amount{font-size:28px;font-weight:900;color:#D4A017;letter-spacing:-0.04em;}

  /* Footer */
  .sig-section{border-top:1px solid #EAE6DE;padding:16px 32px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;}
  .sig-box{text-align:center;}
  .sig-line{border-top:1.5px solid #C4B49A;padding-top:6px;margin-top:30px;font-size:10px;color:#A89880;}
  .footer-note{text-align:center;padding:10px 32px 16px;font-size:9.5px;color:#C4B49A;}
  .made-with{text-align:center;font-size:9px;color:#D4C4A8;padding-bottom:12px;}

  @media print{
    body{background:white !important;padding:0 !important;margin:0;}
    .slip{box-shadow:none !important;border-radius:0 !important;width:100% !important;max-width:100% !important;}
    .header{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;background:linear-gradient(135deg,#0F0C07 0%,#1E1608 50%,#2C1F0A 100%) !important;}
    .net-row{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;background:linear-gradient(135deg,#0F0C07,#2C1F0A) !important;}
    .info-band{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
    *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
  }
  /* Force color printing */
  html{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
</style>
</head>
<body>
<div class="slip">
  <div class="header">
    <div class="header-grid">
      <div class="logo-box">GCD</div>
      <div>
        <div class="company-name">GOLDEN CRESCENT DELIVERY SERVICES LLC</div>
        <div class="company-sub">Burjuman Business Tower, Dubai, UAE&nbsp;&nbsp;|&nbsp;&nbsp;TRN: 104563584200003</div>
      </div>
      <div class="slip-badge">
        <div class="slip-title">Salary Slip</div>
        <div class="slip-month">${month}</div>
        <span class="status-pill">${isPaid?'✓ PAID':'PENDING'}</span>
      </div>
    </div>
  </div>

  <div class="info-band">
    <div class="info-grid">
      <div class="info-item"><div class="label">Employee Name</div><div class="value">${slip.name}</div></div>
      <div class="info-item"><div class="label">Employee ID</div><div class="value">${slip.id}</div></div>
      <div class="info-item"><div class="label">Designation</div><div class="value"><span class="role-badge">${roleLabel}</span></div></div>
      <div class="info-item"><div class="label">Station</div><div class="value">${slip.station_code||'—'}</div></div>
      <div class="info-item"><div class="label">Project Type</div><div class="value">${(slip.project_type||'Pulser').toUpperCase()}</div></div>
      <div class="info-item"><div class="label">Pay Period</div><div class="value">${new Date(month+'-01').toLocaleString('en-AE',{month:'long',year:'numeric'})}</div></div>
    </div>
  </div>

  <div class="body">
    <div class="tables">
      <div>
        <div class="section-title" style="color:#10B981;">Earnings</div>
        <div class="line-row"><span class="line-label">Base Salary</span><span class="line-amount">AED ${fmt(slip.base_salary)}</span></div>
        ${(slip.bonuses||[]).map(b=>`<div class="line-row"><span class="line-label">${b.type||'Bonus'}${b.description?' — '+b.description:''}</span><span class="line-amount green">+AED ${fmt(b.amount)}</span></div>`).join('')}
        <div class="line-row" style="background:#F0FDF4;border-radius:8px;padding:8px 10px;margin-top:8px;">
          <span class="line-label" style="font-weight:700;color:#1A1612;">Gross Amount</span>
          <span class="line-amount" style="color:#10B981;">AED ${fmt(Number(slip.base_salary)+Number(slip.bonus_total||0))}</span>
        </div>
      </div>
      <div>
        <div class="section-title" style="color:#EF4444;">Deductions</div>
        ${(slip.deductions||[]).length===0?`<div class="line-row"><span class="line-label" style="color:#A89880;">No deductions</span><span class="line-amount">AED 0</span></div>`:
          (slip.deductions||[]).map(d=>`<div class="line-row"><span class="line-label">${DED_TYPES.find(t=>t.v===d.type)?.l||d.type}${d.description?' — '+d.description:''}</span><span class="line-amount red">-AED ${fmt(d.amount)}</span></div>`).join('')}
        <div class="line-row" style="background:#FEF2F2;border-radius:8px;padding:8px 10px;margin-top:8px;">
          <span class="line-label" style="font-weight:700;color:#1A1612;">Total Deductions</span>
          <span class="line-amount red">-AED ${fmt(slip.deduction_total||0)}</span>
        </div>
      </div>
    </div>

    <div class="net-row">
      <div>
        <div class="net-label">Net Salary</div>
        ${isPaid&&slip.paid_on?`<div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:3px;">Paid on ${slip.paid_on?.slice(0,10)}</div>`:''}
      </div>
      <div class="net-amount">AED ${fmt(net)}</div>
    </div>

    <div class="sig-section">
      <div class="sig-box"><div class="sig-line">Employee Signature</div></div>
      <div class="sig-box"><div class="sig-line">HR Manager</div></div>
      <div class="sig-box"><div class="sig-line">Authorized By</div></div>
    </div>
  </div>

  <div class="footer-note">This is a computer-generated salary slip. Golden Crescent Delivery Services LLC — ${month} — v${APP_VERSION}</div>
  <div class="made-with">Made with ❤️ by Waleed</div>
</div>
<script>document.fonts.ready.then(()=>setTimeout(()=>window.print(),500))</script>
</body>
</html>`

  const w = window.open('','_blank')
  w.document.write(html)
  w.document.close()
}

/* ── Export CSV ── */
function exportCSV(payroll, month, single=null) {
  const rows = single ? [single] : payroll
  const lines = [
    ['GOLDEN CRESCENT DELIVERY SERVICES LLC'],
    [`Payroll Report — ${month}`],
    [`Generated: ${new Date().toLocaleDateString('en-AE')} | v${APP_VERSION}`],
    [],
    ['Employee','ID','Role','Station','Project','Base (AED)','Bonuses (AED)','Deductions (AED)','Net Pay (AED)','Status'],
    ...rows.map(s => {
      const net = Number(s.net_pay||(Number(s.base_salary)+Number(s.bonus_total||0)-Number(s.deduction_total||0)))
      return [s.name,s.id,ROLE_CFG[s.role]?.l||s.role||'',s.station_code||'',(s.project_type||'pulser').toUpperCase(),Number(s.base_salary||0),Number(s.bonus_total||0),Number(s.deduction_total||0),net,s.payroll_status==='paid'?'PAID':'PENDING']
    }),
    [],
    ['','','','','TOTALS',
      rows.reduce((a,s)=>a+Number(s.base_salary||0),0),
      rows.reduce((a,s)=>a+Number(s.bonus_total||0),0),
      rows.reduce((a,s)=>a+Number(s.deduction_total||0),0),
      rows.reduce((a,s)=>a+Number(s.net_pay||(Number(s.base_salary)+Number(s.bonus_total||0)-Number(s.deduction_total||0))),0),
      `${rows.filter(s=>s.payroll_status==='paid').length}/${rows.length} paid`
    ]
  ]
  const csv = lines.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}))
  a.download = single?`payslip_${single.id}_${month}.csv`:`payroll_${month}.csv`
  a.click()
}

/* ── Salary Modal ── */
function SalaryModal({ emp, onSave, onClose }) {
  const [salary, setSalary] = useState(String(emp?.base_salary||emp?.salary||''))
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)

  async function handleSave() {
    if (!salary||isNaN(parseFloat(salary))) return setErr('Enter a valid amount')
    setSaving(true); setErr(null)
    try {
      // Fetch current employee data first to avoid overwriting fields
      const current = await fetch(`${API}/api/employees/${emp.id}`, { headers:{ Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }).then(r=>r.json())
      const empData = current.employee || emp
      const res = await fetch(`${API}/api/employees/${emp.id}`, {
        method:'PUT', headers:hdr(),
        body:JSON.stringify({ ...empData, salary:parseFloat(salary), id:emp.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error||'Failed to update')
      onSave()
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:360, padding:0, overflow:'hidden' }}>
        <div style={{ padding:'22px 24px 18px', background:'linear-gradient(135deg,rgba(184,134,11,0.1),transparent)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
            <h3 style={{ fontWeight:900, fontSize:16, color:'#1A1612', margin:0 }}>Edit Base Salary</h3>
            <button onClick={onClose} style={{ width:28,height:28,borderRadius:8,background:'rgba(0,0,0,0.06)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><X size={13}/></button>
          </div>
          <p style={{ fontSize:12, color:'#A89880', margin:0 }}>{emp.name} · {ROLE_CFG[emp.role]?.l||emp.role||'Staff'}</p>
        </div>
        <div style={{ padding:'16px 24px 22px' }}>
          {err && <div style={{ background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:9,padding:'8px 12px',fontSize:12.5,color:'#EF4444',marginBottom:12,display:'flex',gap:6,alignItems:'center' }}><AlertCircle size={12}/>{err}</div>}
          <label className="input-label">Base Salary (AED/month)</label>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:13,color:'#A89880',fontWeight:600 }}>AED</span>
            <input className="input" type="number" value={salary} onChange={e=>setSalary(e.target.value)} autoFocus style={{ paddingLeft:50, fontSize:20, fontWeight:900, letterSpacing:'-0.03em' }}/>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:18 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex:2, justifyContent:'center' }}>
              {saving?'Saving…':'Update Salary'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Bonus Modal ── */
function BonusModal({ employees, month, onSave, onClose }) {
  const [bulk,   setBulk]   = useState(false)
  const [empId,  setEmpId]  = useState('')
  const [type,   setType]   = useState('performance')
  const [amount, setAmount] = useState('')
  const [desc,   setDesc]   = useState('')
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)

  async function handleSave() {
    if (!amount) return setErr('Amount required')
    if (!bulk&&!empId) return setErr('Select an employee')
    setSaving(true); setErr(null)
    try {
      if (bulk) {
        await Promise.all(employees.map(e=>payrollApi.addBonus({emp_id:e.id,type,amount:parseFloat(amount),description:desc,month})))
      } else {
        await payrollApi.addBonus({emp_id:empId,type,amount:parseFloat(amount),description:desc,month})
      }
      onSave()
    } catch(e){setErr(e.message)} finally{setSaving(false)}
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:440, padding:0, overflow:'hidden' }}>
        <div style={{ padding:'20px 22px 16px', background:'linear-gradient(135deg,rgba(16,185,129,0.1),transparent)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div><h3 style={{ fontWeight:900, fontSize:16, color:'#1A1612', margin:0 }}>Add Bonus</h3><p style={{ fontSize:12, color:'#A89880', marginTop:2 }}>{month}</p></div>
            <button onClick={onClose} style={{ width:28,height:28,borderRadius:8,background:'rgba(0,0,0,0.06)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><X size={13}/></button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
            {BON_TYPES.map(t=>(
              <button key={t.v} onClick={()=>setType(t.v)} type="button"
                style={{ padding:'8px',borderRadius:10,border:`2px solid ${type===t.v?t.c:'rgba(0,0,0,0.1)'}`,background:type===t.v?`${t.c}15`:'rgba(255,255,255,0.7)',cursor:'pointer',textAlign:'center',transition:'all 0.15s',fontFamily:'Poppins,sans-serif' }}>
                <div style={{ fontSize:11,fontWeight:700,color:type===t.v?t.c:'#A89880' }}>{t.l}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding:'16px 22px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          {err&&<div style={{ background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:9,padding:'8px 12px',fontSize:12,color:'#EF4444',display:'flex',gap:6,alignItems:'center' }}><AlertCircle size={12}/>{err}</div>}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <button onClick={()=>{setBulk(false);setEmpId('')}} style={{ padding:'9px',borderRadius:10,border:`2px solid ${!bulk?'#10B981':'rgba(0,0,0,0.1)'}`,background:!bulk?'rgba(16,185,129,0.1)':'rgba(255,255,255,0.7)',color:!bulk?'#10B981':'#A89880',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'Poppins,sans-serif' }}>Single</button>
            <button onClick={()=>setBulk(true)} style={{ padding:'9px',borderRadius:10,border:`2px solid ${bulk?'#10B981':'rgba(0,0,0,0.1)'}`,background:bulk?'rgba(16,185,129,0.1)':'rgba(255,255,255,0.7)',color:bulk?'#10B981':'#A89880',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'Poppins,sans-serif' }}>All ({employees.length})</button>
          </div>
          {!bulk&&<div><label className="input-label">Employee</label>
            <select className="input" value={empId} onChange={e=>setEmpId(e.target.value)}>
              <option value="">Select…</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.name} — {e.id}</option>)}
            </select></div>}
          {bulk&&<div style={{ background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:10,padding:'10px 12px',fontSize:12.5,color:'#B45309',fontWeight:600 }}>Bonus will be added to all {employees.length} employees</div>}
          <div><label className="input-label">Amount (AED)</label>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:13,color:'#A89880',fontWeight:600 }}>AED</span>
              <input className="input" type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{ paddingLeft:50, fontSize:16, fontWeight:700 }}/>
            </div></div>
          <div><label className="input-label">Description</label>
            <input className="input" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Reason for bonus"/></div>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ flex:2,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'11px',borderRadius:10,background:'linear-gradient(135deg,#10B981,#22C55E)',color:'white',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',opacity:saving?0.7:1 }}>
              {saving?'Saving…':bulk?`Add to All`:'Add Bonus'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Deduction Modal ── */
function DeductionModal({ employees, month, onSave, onClose }) {
  const [form, setForm] = useState({ emp_id:'', type:'traffic_fine', amount:'', description:'', reference:'' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  async function handleSave() {
    if (!form.emp_id||!form.amount) return setErr('Employee and amount required')
    setSaving(true); setErr(null)
    try { await payrollApi.addDeduction({...form,month,amount:parseFloat(form.amount)}); onSave() }
    catch(e){setErr(e.message)} finally{setSaving(false)}
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:440, padding:0, overflow:'hidden' }}>
        <div style={{ padding:'20px 22px 16px', background:'linear-gradient(135deg,rgba(239,68,68,0.08),transparent)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div><h3 style={{ fontWeight:900, fontSize:16, color:'#1A1612', margin:0 }}>Add Deduction</h3><p style={{ fontSize:12, color:'#A89880', marginTop:2 }}>{month}</p></div>
            <button onClick={onClose} style={{ width:28,height:28,borderRadius:8,background:'rgba(0,0,0,0.06)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><X size={13}/></button>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {DED_TYPES.map(t=>(
              <button key={t.v} onClick={()=>set('type',t.v)} type="button"
                style={{ padding:'6px 12px',borderRadius:20,border:`2px solid ${form.type===t.v?t.c:'rgba(0,0,0,0.1)'}`,background:form.type===t.v?`${t.c}12`:'rgba(255,255,255,0.7)',cursor:'pointer',whiteSpace:'nowrap',transition:'all 0.15s',fontFamily:'Poppins,sans-serif' }}>
                <span style={{ fontSize:11,fontWeight:700,color:form.type===t.v?t.c:'#A89880' }}>{t.l}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding:'16px 22px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          {err&&<div style={{ background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:9,padding:'8px 12px',fontSize:12,color:'#EF4444',display:'flex',gap:6,alignItems:'center' }}><AlertCircle size={12}/>{err}</div>}
          <div><label className="input-label">Employee</label>
            <select className="input" value={form.emp_id} onChange={e=>set('emp_id',e.target.value)}>
              <option value="">Select…</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.name} — {e.id}</option>)}
            </select></div>
          <div><label className="input-label">Amount (AED)</label>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:13,color:'#A89880',fontWeight:600 }}>AED</span>
              <input className="input" type="number" value={form.amount} onChange={e=>set('amount',e.target.value)} style={{ paddingLeft:50, fontSize:16, fontWeight:700 }}/>
            </div></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label className="input-label">Description</label><input className="input" value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Visible to DA"/></div>
            <div><label className="input-label">Reference No.</label><input className="input" value={form.reference} onChange={e=>set('reference',e.target.value)} placeholder="Fine / ticket number"/></div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ flex:2,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'11px',borderRadius:10,background:'linear-gradient(135deg,#EF4444,#F87171)',color:'white',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',opacity:saving?0.7:1 }}>
              {saving?'Saving…':'Add Deduction'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Payroll Card ── */
function PayrollCard({ slip, onMarkPaid, onEditSalary, onRemoveDed, onRemoveBonus, month, index }) {
  const [open, setOpen] = useState(false)
  const net    = Number(slip.net_pay||(Number(slip.base_salary)+Number(slip.bonus_total||0)-Number(slip.deduction_total||0)))
  const isPaid = slip.payroll_status === 'paid'
  const role   = ROLE_CFG[slip.role] || ROLE_CFG.driver

  return (
    <div style={{ background:'rgba(255,255,255,0.65)', backdropFilter:'blur(16px)', border:`1.5px solid ${isPaid?'rgba(52,211,153,0.3)':'rgba(255,255,255,0.7)'}`, borderRadius:16, overflow:'hidden', animation:`slideUp 0.4s ${index*0.04}s ease both`, boxShadow:'0 2px 12px rgba(0,0,0,0.05)', transition:'box-shadow 0.2s' }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow='0 6px 24px rgba(0,0,0,0.1)'}
      onMouseLeave={e=>e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.05)'}>
      {/* Top color bar */}
      <div style={{ height:3, background:isPaid?'linear-gradient(90deg,#34D399,#10B981)':'linear-gradient(90deg,#B8860B,#D4A017)' }}/>

      <div style={{ padding:'13px 16px', cursor:'pointer' }} onClick={()=>setOpen(p=>!p)}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {/* Avatar */}
          <div style={{ width:46,height:46,borderRadius:14,background:'linear-gradient(135deg,rgba(184,134,11,0.12),rgba(212,160,23,0.08))',border:'1.5px solid rgba(184,134,11,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:'#B8860B',flexShrink:0 }}>
            {slip.name?.slice(0,2).toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3, flexWrap:'wrap' }}>
              <span style={{ fontWeight:700, fontSize:14, color:'#1A1612' }}>{slip.name}</span>
              {/* Role badge */}
              <span style={{ fontSize:9.5, fontWeight:700, color:role.c, background:role.bg, borderRadius:20, padding:'2px 8px', border:`1px solid ${role.c}33` }}>{role.l}</span>
              {slip.station_code && <span style={{ fontSize:9.5, fontWeight:700, color:'#B8860B', background:'rgba(184,134,11,0.1)', borderRadius:20, padding:'2px 8px' }}>{slip.station_code}</span>}
              {slip.project_type && <span style={{ fontSize:9.5, fontWeight:600, color:'#7C3AED', background:'rgba(124,58,237,0.08)', borderRadius:20, padding:'2px 8px' }}>{slip.project_type.toUpperCase()}</span>}
            </div>
            <div style={{ fontSize:11, color:'#A89880', fontFamily:'monospace' }}>{slip.id}</div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontWeight:900, fontSize:18, color:isPaid?'#10B981':'#B8860B', letterSpacing:'-0.03em' }}>AED {fmt(net)}</div>
            <div style={{ display:'flex', alignItems:'center', gap:5, justifyContent:'flex-end', marginTop:4 }}>
              <span style={{ fontSize:10, fontWeight:700, color:isPaid?'#10B981':'#F59E0B', background:isPaid?'rgba(16,185,129,0.1)':'rgba(245,158,11,0.1)', borderRadius:20, padding:'2px 8px' }}>
                {isPaid?'✓ Paid':'Pending'}
              </span>
              {open?<ChevronUp size={13} color="#A89880"/>:<ChevronDown size={13} color="#A89880"/>}
            </div>
          </div>
        </div>

        {/* Summary chips */}
        <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
          <span style={{ fontSize:11,color:'#6B5D4A',background:'rgba(0,0,0,0.04)',borderRadius:8,padding:'3px 9px' }}>Base: AED {fmt(slip.base_salary)}</span>
          {Number(slip.bonus_total)>0&&<span style={{ fontSize:11,color:'#10B981',background:'rgba(16,185,129,0.08)',borderRadius:8,padding:'3px 9px' }}>+AED {fmt(slip.bonus_total)}</span>}
          {Number(slip.deduction_total)>0&&<span style={{ fontSize:11,color:'#EF4444',background:'rgba(239,68,68,0.08)',borderRadius:8,padding:'3px 9px' }}>-AED {fmt(slip.deduction_total)}</span>}
        </div>
      </div>

      {/* Expanded actions + detail */}
      {open && (
        <div style={{ borderTop:'1px solid rgba(0,0,0,0.06)' }}>
          {/* Action row */}
          <div style={{ padding:'10px 14px', display:'flex', gap:7, flexWrap:'wrap', background:'rgba(0,0,0,0.02)' }}>
            <button onClick={()=>onEditSalary(slip)} style={{ padding:'6px 12px',borderRadius:9,background:'rgba(255,255,255,0.8)',border:'1px solid rgba(0,0,0,0.1)',fontSize:11.5,fontWeight:600,color:'#6B5D4A',cursor:'pointer',fontFamily:'Poppins,sans-serif',display:'flex',alignItems:'center',gap:4 }}>
              <Wallet size={11}/> Edit Salary
            </button>
            <button onClick={()=>generatePayslip({...slip},month)} style={{ padding:'6px 12px',borderRadius:9,background:'rgba(255,255,255,0.8)',border:'1px solid rgba(0,0,0,0.1)',fontSize:11.5,fontWeight:600,color:'#1D6FA4',cursor:'pointer',fontFamily:'Poppins,sans-serif',display:'flex',alignItems:'center',gap:4 }}>
              <FileText size={11}/> Payslip
            </button>
            <button onClick={()=>exportCSV(null,month,slip)} style={{ padding:'6px 12px',borderRadius:9,background:'rgba(255,255,255,0.8)',border:'1px solid rgba(0,0,0,0.1)',fontSize:11.5,fontWeight:600,color:'#10B981',cursor:'pointer',fontFamily:'Poppins,sans-serif',display:'flex',alignItems:'center',gap:4 }}>
              <Download size={11}/> CSV
            </button>
            {!isPaid&&<button onClick={()=>onMarkPaid(slip)} style={{ padding:'6px 14px',borderRadius:9,background:'linear-gradient(135deg,#10B981,#22C55E)',border:'none',fontSize:11.5,fontWeight:700,color:'white',cursor:'pointer',fontFamily:'Poppins,sans-serif',marginLeft:'auto',display:'flex',alignItems:'center',gap:4 }}>
              <Check size={11}/> Mark Paid
            </button>}
          </div>

          {/* Bonuses */}
          {slip.bonuses?.length>0&&(
            <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize:9.5,fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',color:'#10B981',marginBottom:7 }}>Additions</div>
              {slip.bonuses.map(b=>(
                <div key={b.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',background:'rgba(16,185,129,0.05)',borderRadius:9,marginBottom:5,border:'1px solid rgba(16,185,129,0.1)' }}>
                  <div>
                    <div style={{ fontSize:12,fontWeight:600,color:'#10B981' }}>{b.type}</div>
                    {b.description&&<div style={{ fontSize:10.5,color:'#A89880',marginTop:1 }}>{b.description}</div>}
                  </div>
                  <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                    <span style={{ fontWeight:800,color:'#10B981',fontSize:13 }}>+AED {fmt(b.amount)}</span>
                    <button onClick={()=>onRemoveBonus(b.id)} style={{ width:20,height:20,borderRadius:5,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',color:'#EF4444',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontFamily:'Poppins,sans-serif' }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Deductions */}
          {slip.deductions?.length>0&&(
            <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize:9.5,fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',color:'#EF4444',marginBottom:7 }}>Deductions</div>
              {slip.deductions.map(d=>{
                const dt=DED_TYPES.find(t=>t.v===d.type)
                return (
                  <div key={d.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'7px 10px',background:'rgba(239,68,68,0.04)',borderRadius:9,marginBottom:5,border:'1px solid rgba(239,68,68,0.1)' }}>
                    <div style={{ flex:1,marginRight:10 }}>
                      <div style={{ fontSize:12,fontWeight:600,color:dt?.c||'#EF4444' }}>{dt?.l||d.type}</div>
                      {d.description&&<div style={{ fontSize:10.5,color:'#6B5D4A',marginTop:1 }}>{d.description}</div>}
                      {d.reference&&<div style={{ fontSize:10,color:'#C4B49A',fontFamily:'monospace',marginTop:1 }}>Ref: {d.reference}</div>}
                    </div>
                    <div style={{ display:'flex',gap:8,alignItems:'center',flexShrink:0 }}>
                      <span style={{ fontWeight:800,color:'#EF4444',fontSize:13 }}>-AED {fmt(d.amount)}</span>
                      <button onClick={()=>onRemoveDed(d.id)} style={{ width:20,height:20,borderRadius:5,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',color:'#EF4444',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontFamily:'Poppins,sans-serif' }}>×</button>
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

/* ── Main Page ── */
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
    } catch(e){ console.error(e) } finally { setLoading(false) }
  }, [month])

  useEffect(()=>{load()},[load])
  useSocket({'payroll:deduction_added':load,'payroll:bonus_added':load,'payroll:paid':load})

  async function markPaid(slip) {
    if (!confirm(`Mark ${slip.name} as PAID for ${month}?`)) return
    try { await payrollApi.markPaid(slip.id,month); load() } catch(e){alert(e.message)}
  }
  async function markAllPaid() {
    const unpaid = payroll.filter(p=>p.payroll_status!=='paid')
    if (!unpaid.length) return alert('All already paid')
    if (!confirm(`Mark ALL ${unpaid.length} as paid for ${month}?`)) return
    await Promise.all(unpaid.map(s=>payrollApi.markPaid(s.id,month))); load()
  }
  async function removeDed(id) { try { await payrollApi.removeDeduction(id); load() } catch(e){alert(e.message)} }
  async function removeBonus(id) {
    try { await fetch(`${API}/api/payroll/bonuses/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${localStorage.getItem('gcd_token')}`}}); load() } catch(e){alert(e.message)}
  }

  const filtered    = payroll.filter(s=>!search||s.name?.toLowerCase().includes(search.toLowerCase())||s.id?.toLowerCase().includes(search.toLowerCase()))
  const totalBase   = payroll.reduce((s,p)=>s+Number(p.base_salary||0),0)
  const totalBonus  = payroll.reduce((s,p)=>s+Number(p.bonus_total||0),0)
  const totalDed    = payroll.reduce((s,p)=>s+Number(p.deduction_total||0),0)
  const totalNet    = payroll.reduce((s,p)=>s+Number(p.net_pay||(Number(p.base_salary)+Number(p.bonus_total||0)-Number(p.deduction_total||0))),0)
  const paidCount   = payroll.filter(p=>p.payroll_status==='paid').length

  // Chart data
  const chartData = filtered.map(s=>({
    name: s.name?.split(' ')[0],
    Base: Number(s.base_salary||0),
    Bonus: Number(s.bonus_total||0),
    Deduction: Number(s.deduction_total||0),
    Net: Number(s.net_pay||(Number(s.base_salary)+Number(s.bonus_total||0)-Number(s.deduction_total||0))),
  }))

  const pieData = [
    {name:'Base',  value:totalBase,  color:'#B8860B'},
    {name:'Bonus', value:totalBonus, color:'#10B981'},
    {name:'Deductions',value:totalDed,color:'#EF4444'},
  ].filter(d=>d.value>0)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18, animation:'slideUp 0.35s ease' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <p style={{ fontSize:12, color:'#A89880', marginTop:4 }}>{payroll.length} employees · {paidCount} paid · v{APP_VERSION}</p>
        </div>
        <select value={month} onChange={e=>setMonth(e.target.value)}
          style={{ padding:'8px 14px',borderRadius:20,border:'1.5px solid rgba(255,255,255,0.7)',background:'rgba(255,255,255,0.65)',backdropFilter:'blur(12px)',fontSize:13,fontWeight:600,color:'#1A1612',cursor:'pointer',outline:'none',fontFamily:'Poppins,sans-serif' }}>
          {MONTHS.map(m=><option key={m}>{m}</option>)}
        </select>
      </div>

      {/* Hero summary */}
      <div style={{ background:'linear-gradient(135deg,#0F0C07 0%,#1E1608 50%,#2C1F0A 100%)', borderRadius:20, padding:'22px 22px 18px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-30, top:-30, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle,rgba(212,160,23,0.15) 0%,transparent 70%)', pointerEvents:'none'}}/>
        <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:4 }}>Net Payroll — {month}</div>
        <div style={{ fontWeight:900, fontSize:28, letterSpacing:'-0.04em', color:'#D4A017', marginBottom:14 }}>AED {fmt(totalNet)}</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {[
            {l:'Base',       v:`${fmt(totalBase)}`,  c:'rgba(255,255,255,0.9)'},
            {l:'+ Bonuses',  v:`${fmt(totalBonus)}`, c:'#34D399'},
            {l:'- Deductions',v:`${fmt(totalDed)}`,  c:'#F87171'},
            {l:'Paid',       v:`${paidCount}/${payroll.length}`, c:'#FCD34D'},
          ].map(s=>(
            <div key={s.l} style={{ background:'rgba(255,255,255,0.08)',borderRadius:11,padding:'10px 8px',textAlign:'center' }}>
              <div style={{ fontWeight:800,fontSize:14,color:s.c,letterSpacing:'-0.02em' }}>{s.v}</div>
              <div style={{ fontSize:9.5,color:'rgba(255,255,255,0.35)',marginTop:3,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      {payroll.length>0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }} className="two-col-glass">
          {/* Bar chart */}
          <div className="card" style={{ padding:'16px' }}>
            <div style={{ fontWeight:700, fontSize:13, color:'#1A1612', marginBottom:12 }}>Salary Breakdown by Employee</div>
            <ResponsiveContainer width="99%" height={160}>
              <BarChart data={chartData} barSize={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false}/>
                <XAxis dataKey="name" stroke="#C4B49A" fontSize={10} tickLine={false} axisLine={false}/>
                <YAxis stroke="#C4B49A" fontSize={10} tickLine={false} axisLine={false}/>
                <Tooltip content={<GlassTip/>} cursor={{fill:'rgba(0,0,0,0.03)'}}/>
                <Bar dataKey="Base"  name="Base"  fill="#B8860B" radius={[4,4,0,0]}/>
                <Bar dataKey="Bonus" name="Bonus" fill="#10B981" radius={[4,4,0,0]}/>
                <Bar dataKey="Net"   name="Net"   fill="#38BDF8" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Pie */}
          <div className="card" style={{ padding:'16px' }}>
            <div style={{ fontWeight:700, fontSize:13, color:'#1A1612', marginBottom:12 }}>Payroll Distribution</div>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <PieChart width={130} height={130}>
                <Pie data={pieData} cx={60} cy={60} innerRadius={35} outerRadius={58} paddingAngle={3} dataKey="value">
                  {pieData.map((p,i)=><Cell key={p.name} fill={p.color}/>)}
                </Pie>
                <Tooltip content={<GlassTip/>}/>
              </PieChart>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
                {pieData.map(p=>(
                  <div key={p.name}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:11, color:'#6B5D4A', display:'flex', alignItems:'center', gap:5 }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:p.color }}/>{p.name}
                      </span>
                      <span style={{ fontSize:11, fontWeight:700, color:p.color }}>AED {fmt(p.value)}</span>
                    </div>
                    <div style={{ height:4, background:'rgba(0,0,0,0.06)', borderRadius:10, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${totalNet>0?Math.round(p.value/totalNet*100):0}%`, background:p.color, borderRadius:10 }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ flex:'1 1 180px', position:'relative' }}>
          <Search size={13} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#C4B49A',pointerEvents:'none' }}/>
          <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search employee…" style={{ paddingLeft:34, borderRadius:20 }}/>
        </div>
        <button onClick={()=>exportCSV(payroll,month)} style={{ padding:'8px 14px',borderRadius:20,background:'rgba(255,255,255,0.7)',border:'1.5px solid rgba(0,0,0,0.1)',fontSize:12,fontWeight:600,color:'#6B5D4A',cursor:'pointer',fontFamily:'Poppins,sans-serif',display:'flex',alignItems:'center',gap:5 }}>
          <Download size={13}/> Export CSV
        </button>
        <button onClick={()=>{ filtered.forEach(s=>generatePayslip(s,month)) }} style={{ padding:'8px 14px',borderRadius:20,background:'rgba(29,111,164,0.1)',border:'1.5px solid rgba(29,111,164,0.3)',fontSize:12,fontWeight:600,color:'#1D6FA4',cursor:'pointer',fontFamily:'Poppins,sans-serif',display:'flex',alignItems:'center',gap:5 }}>
          <FileText size={13}/> All Payslips
        </button>
        <button onClick={()=>setModal('bonus')} style={{ padding:'8px 14px',borderRadius:20,background:'rgba(16,185,129,0.1)',border:'1.5px solid rgba(16,185,129,0.3)',fontSize:12,fontWeight:600,color:'#10B981',cursor:'pointer',fontFamily:'Poppins,sans-serif',display:'flex',alignItems:'center',gap:5 }}>
          <Plus size={13}/> Bonus
        </button>
        <button onClick={()=>setModal('deduction')} style={{ padding:'8px 14px',borderRadius:20,background:'rgba(239,68,68,0.08)',border:'1.5px solid rgba(239,68,68,0.25)',fontSize:12,fontWeight:600,color:'#EF4444',cursor:'pointer',fontFamily:'Poppins,sans-serif',display:'flex',alignItems:'center',gap:5 }}>
          <Plus size={13}/> Deduction
        </button>
        <button onClick={markAllPaid} style={{ padding:'8px 14px',borderRadius:20,background:'linear-gradient(135deg,#B8860B,#D4A017)',border:'none',fontSize:12,fontWeight:700,color:'white',cursor:'pointer',fontFamily:'Poppins,sans-serif',display:'flex',alignItems:'center',gap:5 }}>
          <Check size={13}/> Mark All Paid
        </button>
      </div>

      {/* Cards */}
      {loading ? Array(3).fill(0).map((_,i)=><div key={i} className="sk" style={{ height:100,borderRadius:16 }}/>) :
        filtered.length===0 ? (
          <div style={{ textAlign:'center',padding:'50px 20px',color:'#A89880' }}>
            <Wallet size={40} style={{ margin:'0 auto 12px',display:'block',opacity:0.2 }}/>
            <div style={{ fontWeight:600,color:'#6B5D4A' }}>No payroll data for {month}</div>
          </div>
        ) : filtered.map((slip,i)=>(
          <PayrollCard key={slip.id||slip.emp_id} slip={slip} month={month} index={i}
            onMarkPaid={markPaid}
            onEditSalary={s=>setModal({type:'salary',emp:s})}
            onRemoveDed={removeDed}
            onRemoveBonus={removeBonus}/>
        ))
      }

      {/* Footer */}
      <div style={{ textAlign:'center', padding:'8px 0 4px', borderTop:'1px solid rgba(0,0,0,0.06)', marginTop:8 }}>
        <span style={{ fontSize:10.5, color:'#C4B49A', fontWeight:500 }}>Made with ❤️ by Waleed &nbsp;·&nbsp; v{APP_VERSION}</span>
      </div>

      {modal==='bonus'        && <BonusModal     employees={employees} month={month} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal==='deduction'    && <DeductionModal employees={employees} month={month} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal?.type==='salary' && <SalaryModal    emp={modal.emp}       onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
    </div>
  )
}