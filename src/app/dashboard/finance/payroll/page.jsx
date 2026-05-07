'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { payrollApi, empApi } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import {
  Plus, X, Download, Check, Search, Wallet, TrendingUp,
  FileText, AlertCircle, Users, ChevronDown, ChevronUp, BarChart2
} from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

import { API } from '@/lib/api'
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
function resolveRole(roleStr) {
  if (!roleStr) return ROLE_CFG.driver
  const r = roleStr.toLowerCase().trim()
  if (r === 'admin') return ROLE_CFG.admin
  if (r === 'general manager' || r === 'general_manager' || r === 'gm') return ROLE_CFG.general_manager
  if (r === 'manager' || r === 'dispatcher') return ROLE_CFG.manager
  if (r === 'hr' || r === 'hr manager') return ROLE_CFG.hr
  if (r === 'accountant' || r === 'finance mgr') return ROLE_CFG.accountant
  if (r === 'poc') return ROLE_CFG.poc
  if (r === 'driver') return ROLE_CFG.driver
  return ROLE_CFG.driver
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

/* ── Shared payslip data extractor ── */
function slipData(slip, month) {
  const fmtN = n => Number(n||0).toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2})
  const bonuses    = slip.bonuses    || []
  const deductions = slip.deductions || []
  const incentive  = bonuses.filter(b=>b.type==='kpi').reduce((s,b)=>s+Number(b.amount),0)
  const perfBonus  = bonuses.filter(b=>b.type==='performance').reduce((s,b)=>s+Number(b.amount),0)
  const otherBon   = bonuses.filter(b=>b.type==='other')
  const monthBonus    = otherBon.length ? Number(otherBon[otherBon.length-1].amount) : 0
  const otherAddition = otherBon.slice(0,-1).reduce((s,b)=>s+Number(b.amount),0)
  const monthBonusLabel = otherBon.length && otherBon[otherBon.length-1].description
    ? otherBon[otherBon.length-1].description
    : new Date(month+'-01').toLocaleString('en-US',{month:'long'})+' Bonus'
  const cashAdv    = deductions.filter(d=>d.type==='cash_variance').reduce((s,d)=>s+Number(d.amount),0)
  const trafficFine= deductions.filter(d=>d.type==='traffic_fine').reduce((s,d)=>s+Number(d.amount),0)
  const absentDays = deductions.filter(d=>d.type==='iloe_fee'||d.type==='iloe_fine').reduce((s,d)=>s+Number(d.amount),0)
  const otherDed   = deductions.filter(d=>d.type==='other').reduce((s,d)=>s+Number(d.amount),0)
  const base       = Number(slip.base_salary||0)
  const hourlyRate = Number(slip.hourly_rate||3.85)
  const totalAdd   = base + Number(slip.bonus_total||0)
  const totalDed   = Number(slip.deduction_total||0)
  const net        = Number(slip.net_pay||(totalAdd - totalDed))
  const isPaid     = slip.payroll_status === 'paid'
  const paidOn     = slip.paid_on ? new Date(slip.paid_on).toLocaleDateString('en-GB') : '—'
  const monthShort = new Date(month+'-01').toLocaleString('en-US',{month:'short',year:'2-digit'}).replace(' ','-')
  const roleLabel  = {driver:'Delivery Associate',admin:'Admin',hr:'HR Manager',poc:'POC',accountant:'Accountant',manager:'Manager',general_manager:'General Manager'}[slip.role] || slip.role || 'Staff'
  const row = (l1,v1,l2,v2) => `<tr><td class="lbl">${l1}</td><td class="val">${fmtN(v1)}</td><td class="lbl">${l2}</td><td class="val">${fmtN(v2)}</td></tr>`
  return { fmtN, incentive, perfBonus, monthBonus, otherAddition, monthBonusLabel, cashAdv, trafficFine, absentDays, otherDed, base, hourlyRate, totalAdd, totalDed, net, isPaid, paidOn, monthShort, roleLabel, row }
}

/* ── Single slip inner HTML (no <html>/<body> wrapper) ── */
function slipInnerHtml(slip, month, logoUrl) {
  const { fmtN, incentive, perfBonus, monthBonus, otherAddition, monthBonusLabel, cashAdv, trafficFine, absentDays, otherDed, base, hourlyRate, totalAdd, totalDed, net, isPaid, paidOn, monthShort, roleLabel, row } = slipData(slip, month)
  return `
  <div class="hdr">
    <img src="${logoUrl}" alt="GCD Logo" onerror="this.style.display='none'"/>
    <div class="hdr-text">
      <div class="co-name">Golden Crescent Delivery Services</div>
      <div class="co-addr">Burjuman Business Tower, 18th floor, office #1868</div>
    </div>
  </div>
  <div class="slip-title">Salary Slip</div>
  <table class="info-tbl">
    <tr>
      <td class="key">Employee ID</td><td class="data">${slip.id}</td>
      <td class="key">Employee Name</td><td class="data">${slip.name}</td>
    </tr>
    <tr>
      <td class="key">Designation</td><td class="data">${roleLabel}</td>
      <td class="key">Salary Period</td><td class="data">${monthShort}</td>
    </tr>
  </table>
  <table class="main-tbl">
    <tr><th colspan="2">Earnings</th><th colspan="2">Deductions</th></tr>
    ${row('Basic Salary',base,'Cash Advance',cashAdv)}
    ${row('Rate Per Hour',hourlyRate,'Traffic Fine',trafficFine)}
    ${row('Total Working Hrs',0,'Absent Days',absentDays)}
    ${row('Incentive',incentive,'Other',otherDed)}
    ${row('Performance Bonus',perfBonus,'Pending Deductions',0)}
    ${row('Other Addition',otherAddition,'Carry Forwarded',0)}
    <tr><td class="lbl">${monthBonusLabel}</td><td class="val">${fmtN(monthBonus)}</td><td></td><td></td></tr>
    <tr class="total-row">
      <td>TOTAL ADDITION</td><td style="text-align:right;font-weight:bold;">${fmtN(totalAdd)}</td>
      <td>TOTAL DEDUCTION</td><td style="text-align:right;font-weight:bold;">${fmtN(totalDed)}</td>
    </tr>
    <tr class="net-row">
      <td colspan="2" style="text-align:center;font-weight:bold;">Net Salary</td>
      <td colspan="2" style="text-align:center;font-weight:bold;">${fmtN(net)}</td>
    </tr>
  </table>
  <div class="footer">
    <div>Salary paid by &nbsp;<span class="cb">${isPaid?'✓':''}</span> Cash &nbsp;&nbsp;&nbsp;<span class="cb">${isPaid?'✓':''}</span> Bank account</div>
    <div style="margin-top:4px;">Date of amount paid: &nbsp; ${paidOn}</div>
    <div class="footer-grid">
      <div></div>
      <div class="sig-line">Employee Signature</div>
    </div>
  </div>`
}

/* ── Single payslip — opens its own tab and prints ── */
function generatePayslip(slip, month) {
  const logoUrl = window.location.origin + '/logo.webp'
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<title>Payslip — ${slip.name} — ${month}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,sans-serif;background:#fff;padding:28px;font-size:11px;color:#000;}
  .wrap{max-width:700px;margin:0 auto;}
  .hdr{display:flex;align-items:center;gap:16px;margin-bottom:6px;}
  .hdr img{width:72px;height:auto;}
  .hdr-text{flex:1;}
  .co-name{font-size:16px;font-weight:bold;text-transform:uppercase;text-align:center;letter-spacing:0.02em;}
  .co-addr{font-size:10px;text-align:center;margin-top:3px;color:#333;}
  .slip-title{text-align:center;font-size:13px;font-style:italic;font-weight:bold;border-top:2px solid #000;border-bottom:2px solid #000;padding:4px 0;margin:8px 0 10px;}
  .info-tbl{width:100%;border-collapse:collapse;margin-bottom:10px;}
  .info-tbl td{border:1px solid #000;padding:5px 8px;}
  .info-tbl .key{font-weight:bold;width:18%;}
  .info-tbl .data{width:32%;}
  .main-tbl{width:100%;border-collapse:collapse;margin-bottom:0;}
  .main-tbl td,.main-tbl th{border:1px solid #000;padding:5px 8px;}
  .main-tbl th{background:#d9d9d9;font-weight:bold;text-align:center;font-size:11px;}
  .lbl{width:22%;color:#000;}
  .val{width:28%;text-align:right;font-weight:bold;}
  .total-row td{font-weight:bold;background:#f0f0f0;}
  .net-row td{font-weight:bold;font-size:12px;}
  .footer{margin-top:20px;font-size:11px;}
  .footer-grid{display:flex;justify-content:space-between;align-items:flex-end;margin-top:32px;}
  .sig-line{border-top:1px solid #000;padding-top:4px;min-width:180px;text-align:center;font-size:10px;}
  .cb{display:inline-block;width:12px;height:12px;border:1px solid #000;vertical-align:middle;margin-right:3px;text-align:center;line-height:12px;font-size:9px;}
  @media print{body{padding:8px;}@page{size:A4;margin:12mm;}}
</style></head>
<body><div class="wrap">${slipInnerHtml(slip, month, logoUrl)}</div>
<script>window.onload=function(){setTimeout(function(){window.print()},600)}</script>
</body></html>`
  const w = window.open('','_blank')
  w.document.write(html)
  w.document.close()
}

/* ── All payslips — 2 per A4 page, single tab, prints as PDF ── */
function generateAllPayslips(slips, month) {
  const logoUrl = window.location.origin + '/logo.webp'

  // Group into pairs
  const pages = []
  for (let i = 0; i < slips.length; i += 2) {
    pages.push(slips.slice(i, i + 2))
  }

  const pagesHtml = pages.map((pair, pi) => `
    <div class="page${pi === pages.length - 1 ? ' last' : ''}">
      <div class="slip">${slipInnerHtml(pair[0], month, logoUrl)}</div>
      ${pair[1]
        ? `<div class="sep"></div><div class="slip">${slipInnerHtml(pair[1], month, logoUrl)}</div>`
        : '<div class="slip empty"></div>'
      }
    </div>`).join('\n')

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<title>All Payslips — ${month}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,sans-serif;background:#fff;font-size:10px;color:#000;}

  .page{display:flex;flex-direction:column;height:277mm;padding:8mm;page-break-after:always;}
  .page.last{page-break-after:avoid;}
  .slip{flex:1;min-height:0;overflow:hidden;padding:5mm;border:1px solid #ccc;}
  .slip.empty{border:none;}
  .sep{height:4mm;flex-shrink:0;}

  .hdr{display:flex;align-items:center;gap:10px;margin-bottom:4px;}
  .hdr img{width:52px;height:auto;}
  .hdr-text{flex:1;}
  .co-name{font-size:12px;font-weight:bold;text-transform:uppercase;text-align:center;letter-spacing:0.02em;}
  .co-addr{font-size:8.5px;text-align:center;margin-top:2px;color:#333;}
  .slip-title{text-align:center;font-size:10.5px;font-style:italic;font-weight:bold;border-top:1.5px solid #000;border-bottom:1.5px solid #000;padding:3px 0;margin:5px 0 7px;}

  .info-tbl{width:100%;border-collapse:collapse;margin-bottom:7px;}
  .info-tbl td{border:1px solid #000;padding:3px 6px;font-size:9.5px;}
  .info-tbl .key{font-weight:bold;width:18%;}
  .info-tbl .data{width:32%;}

  .main-tbl{width:100%;border-collapse:collapse;}
  .main-tbl td,.main-tbl th{border:1px solid #000;padding:3px 6px;font-size:9.5px;}
  .main-tbl th{background:#d9d9d9;font-weight:bold;text-align:center;}
  .lbl{width:22%;color:#000;}
  .val{width:28%;text-align:right;font-weight:bold;}
  .total-row td{font-weight:bold;background:#f0f0f0;}
  .net-row td{font-weight:bold;font-size:10px;}

  .footer{margin-top:10px;font-size:9.5px;}
  .footer-grid{display:flex;justify-content:space-between;align-items:flex-end;margin-top:14px;}
  .sig-line{border-top:1px solid #000;padding-top:3px;min-width:140px;text-align:center;font-size:8.5px;}
  .cb{display:inline-block;width:10px;height:10px;border:1px solid #000;vertical-align:middle;margin-right:2px;text-align:center;line-height:10px;font-size:8px;}

  @media print{
    body{background:#fff;}
    @page{size:A4 portrait;margin:0;}
    .page{page-break-after:always;}
    .page.last{page-break-after:avoid;}
  }
</style></head>
<body>
${pagesHtml}
<script>window.onload=function(){setTimeout(function(){window.print()},800)}</script>
</body></html>`

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
            <button onClick={onClose} style={{ width:28,height:28,borderRadius:'50%',background:'rgba(0,0,0,0.06)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><X size={13}/></button>
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
            <button onClick={onClose} style={{ width:28,height:28,borderRadius:'50%',background:'rgba(0,0,0,0.06)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><X size={13}/></button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
            {BON_TYPES.map(t=>(
              <button key={t.v} onClick={()=>setType(t.v)} type="button"
                style={{ padding:'8px',borderRadius:100,border:`2px solid ${type===t.v?t.c:'rgba(0,0,0,0.1)'}`,background:type===t.v?`${t.c}15`:'rgba(255,255,255,0.7)',cursor:'pointer',textAlign:'center',transition:'all 0.15s',fontFamily:'Poppins,sans-serif' }}>
                <div style={{ fontSize:11,fontWeight:700,color:type===t.v?t.c:'#A89880' }}>{t.l}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding:'16px 22px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          {err&&<div style={{ background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:9,padding:'8px 12px',fontSize:12,color:'#EF4444',display:'flex',gap:6,alignItems:'center' }}><AlertCircle size={12}/>{err}</div>}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <button onClick={()=>{setBulk(false);setEmpId('')}} style={{ padding:'9px',borderRadius:100,border:`2px solid ${!bulk?'#10B981':'rgba(0,0,0,0.1)'}`,background:!bulk?'rgba(16,185,129,0.1)':'rgba(255,255,255,0.7)',color:!bulk?'#10B981':'#A89880',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'Poppins,sans-serif' }}>Single</button>
            <button onClick={()=>setBulk(true)} style={{ padding:'9px',borderRadius:100,border:`2px solid ${bulk?'#10B981':'rgba(0,0,0,0.1)'}`,background:bulk?'rgba(16,185,129,0.1)':'rgba(255,255,255,0.7)',color:bulk?'#10B981':'#A89880',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'Poppins,sans-serif' }}>All ({employees.length})</button>
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
            <button onClick={handleSave} disabled={saving} style={{ flex:2,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'11px',borderRadius:100,background:'linear-gradient(135deg,#10B981,#22C55E)',color:'white',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',opacity:saving?0.7:1 }}>
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
            <button onClick={onClose} style={{ width:28,height:28,borderRadius:'50%',background:'rgba(0,0,0,0.06)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><X size={13}/></button>
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
            <button onClick={handleSave} disabled={saving} style={{ flex:2,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'11px',borderRadius:100,background:'linear-gradient(135deg,#EF4444,#F87171)',color:'white',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',opacity:saving?0.7:1 }}>
              {saving?'Saving…':'Add Deduction'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Payroll Card ── */
function PayrollCard({ slip, onMarkPaid, markingPaid, onEditSalary, onRemoveDed, onRemoveBonus, month, index }) {
  const [open, setOpen] = useState(false)
  const net    = Number(slip.net_pay||(Number(slip.base_salary)+Number(slip.bonus_total||0)-Number(slip.deduction_total||0)))
  const isPaid = slip.payroll_status === 'paid'
  const role   = resolveRole(slip.role)

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
            <div style={{ fontSize:11, color:'#A89880', fontFamily:'inherit' }}>{slip.id}</div>
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
            {!isPaid&&<button
              onClick={()=>!markingPaid&&onMarkPaid(slip)}
              disabled={markingPaid}
              style={{ padding:'6px 14px',borderRadius:9,background:'linear-gradient(135deg,#10B981,#22C55E)',border:'none',fontSize:11.5,fontWeight:700,color:'white',cursor:markingPaid?'not-allowed':'pointer',fontFamily:'Poppins,sans-serif',marginLeft:'auto',display:'flex',alignItems:'center',gap:4,opacity:markingPaid?0.65:1,transition:'opacity 0.15s' }}>
              {markingPaid
                ? <><span style={{width:10,height:10,border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite'}}/> Saving…</>
                : <><Check size={11}/> Mark Paid</>
              }
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
                    <button onClick={()=>onRemoveBonus(b.id, b.type)} style={{ width:20,height:20,borderRadius:5,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',color:'#EF4444',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontFamily:'Poppins,sans-serif' }}>×</button>
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
                      {d.reference&&<div style={{ fontSize:10,color:'#C4B49A',fontFamily:'inherit',marginTop:1 }}>Ref: {d.reference}</div>}
                    </div>
                    <div style={{ display:'flex',gap:8,alignItems:'center',flexShrink:0 }}>
                      <span style={{ fontWeight:800,color:'#EF4444',fontSize:13 }}>-AED {fmt(d.amount)}</span>
                      <button onClick={()=>onRemoveDed(d.id, dt?.l||d.type)} style={{ width:20,height:20,borderRadius:5,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',color:'#EF4444',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontFamily:'Poppins,sans-serif' }}>×</button>
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
  const [payroll,     setPayroll]     = useState([])
  const [employees,   setEmployees]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [month,       setMonth]       = useState(MONTHS[0])
  const [modal,       setModal]       = useState(null)
  const [search,      setSearch]      = useState('')
  const [confirmDlg,  setConfirmDlg]  = useState(null) // replaces window.confirm()
  const [markingPaid, setMarkingPaid] = useState(new Set()) // IDs currently being marked paid

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

  function markPaid(slip) {
    setConfirmDlg({
      title: `Mark ${slip.name} as paid?`,
      message: `This will record ${slip.name}'s salary for ${month} as paid. The payslip will be locked.`,
      confirmLabel: 'Mark Paid', danger: false,
      onConfirm: async () => {
        setConfirmDlg(null)
        setMarkingPaid(s => new Set(s).add(slip.id))
        try { await payrollApi.markPaid(slip.id, month); load() } catch(e) { console.error(e) }
        finally { setMarkingPaid(s => { const n=new Set(s); n.delete(slip.id); return n }) }
      },
    })
  }
  function markAllPaid() {
    const unpaid = payroll.filter(p => p.payroll_status !== 'paid')
    if (!unpaid.length) {
      setConfirmDlg({
        title: 'All employees already paid',
        message: `Every employee has been marked as paid for ${month}.`,
        confirmLabel: 'OK', danger: false,
        onConfirm: () => setConfirmDlg(null),
      })
      return
    }
    setConfirmDlg({
      title: `Mark all ${unpaid.length} employees as paid?`,
      message: `This will lock payslips for all ${unpaid.length} unpaid employees for ${month}. This cannot be undone.`,
      confirmLabel: `Pay All (${unpaid.length})`, danger: false,
      onConfirm: async () => {
        setConfirmDlg(null)
        const ids = unpaid.map(s => s.id)
        setMarkingPaid(new Set(ids))
        await Promise.all(unpaid.map(s => payrollApi.markPaid(s.id, month)))
        setMarkingPaid(new Set())
        load()
      },
    })
  }
  function removeDed(id, label) {
    setConfirmDlg({
      title: 'Remove deduction?',
      message: label ? `Remove "${label}" deduction from this payslip?` : 'Remove this deduction?',
      confirmLabel: 'Remove', danger: true,
      onConfirm: async () => {
        setConfirmDlg(null)
        try { await payrollApi.removeDeduction(id); load() } catch(e) { console.error(e) }
      },
    })
  }
  function removeBonus(id, label) {
    setConfirmDlg({
      title: 'Remove bonus?',
      message: label ? `Remove "${label}" addition from this payslip?` : 'Remove this bonus?',
      confirmLabel: 'Remove', danger: true,
      onConfirm: async () => {
        setConfirmDlg(null)
        try {
          await fetch(`${API}/api/payroll/bonuses/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${localStorage.getItem('gcd_token')}`}})
          load()
        } catch(e) { console.error(e) }
      },
    })
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
        <div className="r-grid-4" style={{ gap:8 }}>
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
        <button onClick={()=>exportCSV(payroll,month)} style={{ padding:'8px 14px',borderRadius:100,background:'rgba(255,255,255,0.7)',border:'1.5px solid rgba(0,0,0,0.1)',fontSize:12,fontWeight:600,color:'#6B5D4A',cursor:'pointer',fontFamily:'Poppins,sans-serif',display:'flex',alignItems:'center',gap:5 }}>
          <Download size={13}/> Export CSV
        </button>
        <button onClick={()=>generateAllPayslips(filtered,month)} style={{ padding:'8px 14px',borderRadius:100,background:'rgba(29,111,164,0.1)',border:'1.5px solid rgba(29,111,164,0.3)',fontSize:12,fontWeight:600,color:'#1D6FA4',cursor:'pointer',fontFamily:'Poppins,sans-serif',display:'flex',alignItems:'center',gap:5 }}>
          <FileText size={13}/> All Payslips
        </button>
        <button onClick={()=>setModal('bonus')} style={{ padding:'8px 14px',borderRadius:100,background:'rgba(16,185,129,0.1)',border:'1.5px solid rgba(16,185,129,0.3)',fontSize:12,fontWeight:600,color:'#10B981',cursor:'pointer',fontFamily:'Poppins,sans-serif',display:'flex',alignItems:'center',gap:5 }}>
          <Plus size={13}/> Bonus
        </button>
        <button onClick={()=>setModal('deduction')} style={{ padding:'8px 14px',borderRadius:100,background:'rgba(239,68,68,0.08)',border:'1.5px solid rgba(239,68,68,0.25)',fontSize:12,fontWeight:600,color:'#EF4444',cursor:'pointer',fontFamily:'Poppins,sans-serif',display:'flex',alignItems:'center',gap:5 }}>
          <Plus size={13}/> Deduction
        </button>
        <button onClick={markAllPaid} style={{ padding:'8px 14px',borderRadius:100,background:'linear-gradient(135deg,#B8860B,#D4A017)',border:'none',fontSize:12,fontWeight:700,color:'white',cursor:'pointer',fontFamily:'Poppins,sans-serif',display:'flex',alignItems:'center',gap:5 }}>
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
            markingPaid={markingPaid.has(slip.id)}
            onEditSalary={s=>setModal({type:'salary',emp:s})}
            onRemoveDed={removeDed}
            onRemoveBonus={removeBonus}/>
        ))
      }

      {modal==='bonus'        && <BonusModal     employees={employees} month={month} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal==='deduction'    && <DeductionModal employees={employees} month={month} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal?.type==='salary' && <SalaryModal    emp={modal.emp}       onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}

      <ConfirmDialog
        open={!!confirmDlg}
        title={confirmDlg?.title}
        message={confirmDlg?.message}
        confirmLabel={confirmDlg?.confirmLabel}
        danger={confirmDlg?.danger ?? false}
        onConfirm={confirmDlg?.onConfirm}
        onCancel={() => setConfirmDlg(null)}
      />
    </div>
  )
}