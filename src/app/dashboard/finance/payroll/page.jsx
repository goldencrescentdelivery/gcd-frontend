'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { payrollApi, empApi } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import { Plus, X, Download, Check, ChevronDown, ChevronUp, FileText, TrendingUp, TrendingDown, Wallet, AlertCircle, Search, Filter } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL

const MONTHS = Array.from({length:12},(_,i)=>{
  const d = new Date(); d.setMonth(d.getMonth()-i)
  return d.toISOString().slice(0,7)
})

const DED_TYPES = [
  {v:'traffic_fine',  l:'Traffic Fine',   e:'🚨', c:'#C0392B'},
  {v:'iloe_fee',      l:'ILOE Fee',       e:'📋', c:'#1D6FA4'},
  {v:'iloe_fine',     l:'ILOE Fine',      e:'⚠️', c:'#C0392B'},
  {v:'cash_variance', l:'Cash Variance',  e:'💸', c:'#B45309'},
  {v:'other',         l:'Other',          e:'📌', c:'#6B5D4A'},
]
const BON_TYPES = [
  {v:'performance',l:'Performance Bonus', e:'⭐'},
  {v:'kpi',        l:'KPI Bonus',         e:'🎯'},
  {v:'other',      l:'Other Addition',    e:'➕'},
]

function hdr() { return { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }

function fmt(n) { return Number(n||0).toLocaleString('en-AE', {minimumFractionDigits:0, maximumFractionDigits:0}) }

// ── Section label ─────────────────────────────────────────────
function SLabel({ children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, margin:'16px 0 10px' }}>
      <div style={{ height:1, flex:1, background:'linear-gradient(90deg,#EAE6DE,transparent)' }}/>
      <span style={{ fontSize:9.5, fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', color:'#C4B49A' }}>{children}</span>
      <div style={{ height:1, flex:1, background:'linear-gradient(90deg,transparent,#EAE6DE)' }}/>
    </div>
  )
}

// ── Add Deduction Modal ───────────────────────────────────────
function DeductionModal({ employees, month, onSave, onClose }) {
  const [form, setForm] = useState({ emp_id:'', type:'traffic_fine', amount:'', description:'', reference:'' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  const selectedType = DED_TYPES.find(t=>t.v===form.type)

  async function handleSave() {
    if (!form.emp_id||!form.amount) return setErr('Employee and amount required')
    setSaving(true); setErr(null)
    try { await payrollApi.addDeduction({...form, month, amount:parseFloat(form.amount)}); onSave() }
    catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:440, padding:0, overflow:'hidden' }}>
        <div style={{ padding:'22px 24px 0', background:'linear-gradient(135deg,#FEF2F2,#FFF9F9)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <h3 style={{ fontWeight:900, fontSize:17, color:'#1A1612' }}>➖ Add Deduction</h3>
              <p style={{ fontSize:11.5, color:'#A89880', marginTop:2 }}>{month} · DA will see this in their payslip</p>
            </div>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:9, background:'rgba(0,0,0,0.05)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14}/></button>
          </div>
          {/* Type selector */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6, marginBottom:16 }}>
            {DED_TYPES.map(t=>(
              <button key={t.v} onClick={()=>set('type',t.v)} type="button"
                style={{ padding:'8px 4px', borderRadius:10, border:`2px solid ${form.type===t.v?t.c:'#EAE6DE'}`, background:form.type===t.v?`${t.c}12`:'#FFF', cursor:'pointer', textAlign:'center', transition:'all 0.18s' }}>
                <div style={{ fontSize:16, marginBottom:2 }}>{t.e}</div>
                <div style={{ fontSize:9, fontWeight:700, color:form.type===t.v?t.c:'#A89880', lineHeight:1.2 }}>{t.l}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding:'16px 24px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          {err && <div style={{ display:'flex', gap:8, alignItems:'center', background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:9, padding:'9px 12px', fontSize:12.5, color:'#C0392B' }}><AlertCircle size={13}/>{err}</div>}
          <div>
            <label className="input-label">Employee *</label>
            <select className="input" value={form.emp_id} onChange={e=>set('emp_id',e.target.value)} style={{ borderRadius:10 }}>
              <option value="">Select DA…</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.name} — {e.id}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Amount (AED) *</label>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'#A89880', fontWeight:600 }}>AED</span>
              <input className="input" type="number" step="0.01" value={form.amount} onChange={e=>set('amount',e.target.value)} placeholder="0.00" style={{ paddingLeft:48, borderRadius:10, fontSize:15, fontWeight:700 }}/>
            </div>
          </div>
          <div>
            <label className="input-label">Description <span style={{ color:'#C4B49A', textTransform:'none', letterSpacing:0, fontSize:10, fontWeight:400 }}>— DA will see this</span></label>
            <input className="input" value={form.description} onChange={e=>set('description',e.target.value)} placeholder="e.g. Salik fine on Dec 15" style={{ borderRadius:10 }}/>
          </div>
          <div>
            <label className="input-label">Reference No.</label>
            <input className="input" value={form.reference} onChange={e=>set('reference',e.target.value)} placeholder="Fine / ticket number" style={{ borderRadius:10 }}/>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex:1, justifyContent:'center', borderRadius:10 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ flex:2, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px', borderRadius:10, background:`linear-gradient(135deg,${selectedType?.c||'#C0392B'},${selectedType?.c||'#C0392B'}cc)`, color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', opacity:saving?0.6:1 }}>
              {saving?'Saving…':'Add Deduction'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Add Bonus Modal ───────────────────────────────────────────
function BonusModal({ employees, month, onSave, onClose }) {
  const [form, setForm] = useState({ emp_id:'', type:'performance', amount:'', description:'' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  async function handleSave() {
    if (!form.emp_id||!form.amount) return setErr('Employee and amount required')
    setSaving(true); setErr(null)
    try { await payrollApi.addBonus({...form, month, amount:parseFloat(form.amount)}); onSave() }
    catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:420, padding:0, overflow:'hidden' }}>
        <div style={{ padding:'22px 24px 16px', background:'linear-gradient(135deg,#ECFDF5,#F0FFF8)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <h3 style={{ fontWeight:900, fontSize:17, color:'#1A1612' }}>➕ Add Bonus</h3>
              <p style={{ fontSize:11.5, color:'#A89880', marginTop:2 }}>{month} · Addition to payslip</p>
            </div>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:9, background:'rgba(0,0,0,0.05)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14}/></button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {BON_TYPES.map(t=>(
              <button key={t.v} onClick={()=>set('type',t.v)} type="button"
                style={{ padding:'10px 6px', borderRadius:10, border:`2px solid ${form.type===t.v?'#2E7D52':'#EAE6DE'}`, background:form.type===t.v?'#ECFDF5':'#FFF', cursor:'pointer', textAlign:'center', transition:'all 0.18s' }}>
                <div style={{ fontSize:18, marginBottom:3 }}>{t.e}</div>
                <div style={{ fontSize:10, fontWeight:700, color:form.type===t.v?'#2E7D52':'#A89880' }}>{t.l}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding:'16px 24px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          {err && <div style={{ display:'flex', gap:8, alignItems:'center', background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:9, padding:'9px 12px', fontSize:12.5, color:'#C0392B' }}><AlertCircle size={13}/>{err}</div>}
          <div>
            <label className="input-label">Employee *</label>
            <select className="input" value={form.emp_id} onChange={e=>set('emp_id',e.target.value)} style={{ borderRadius:10 }}>
              <option value="">Select DA…</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.name} — {e.id}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Amount (AED) *</label>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'#A89880', fontWeight:600 }}>AED</span>
              <input className="input" type="number" step="0.01" value={form.amount} onChange={e=>set('amount',e.target.value)} placeholder="0.00" style={{ paddingLeft:48, borderRadius:10, fontSize:15, fontWeight:700 }}/>
            </div>
          </div>
          <div>
            <label className="input-label">Description</label>
            <input className="input" value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Reason for bonus" style={{ borderRadius:10 }}/>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex:1, justifyContent:'center', borderRadius:10 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ flex:2, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px', borderRadius:10, background:'linear-gradient(135deg,#2E7D52,#22C55E)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', opacity:saving?0.6:1 }}>
              {saving?'Saving…':'Add Bonus'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Set Salary Modal ──────────────────────────────────────────
function SalaryModal({ emp, onSave, onClose }) {
  const [salary,  setSalary]  = useState(emp?.base_salary||emp?.salary||'')
  const [saving,  setSaving]  = useState(false)

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
      <div className="modal" style={{ maxWidth:360 }}>
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
            <input className="input" type="number" value={salary} onChange={e=>setSalary(e.target.value)} placeholder="0" autoFocus style={{ paddingLeft:48, fontSize:18, fontWeight:800, letterSpacing:'-0.02em' }}/>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex:2, justifyContent:'center' }}>{saving?'Saving…':'Update Salary'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Export helpers ────────────────────────────────────────────
function exportCSV(payroll, month) {
  const rows = [['Employee','ID','Station','Base Salary','Bonuses','Deductions','Net Pay','Status']]
  payroll.forEach(s=>{
    const net = Number(s.net_pay||(Number(s.base_salary)+Number(s.bonus_total||0)-Number(s.deduction_total||0)))
    rows.push([s.name, s.id, s.station_code||'', s.base_salary, s.bonus_total||0, s.deduction_total||0, net, s.payroll_status||'pending'])
  })
  const blob = new Blob([rows.map(r=>r.join(',')).join('\n')], {type:'text/csv'})
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`payroll_${month}.csv`; a.click()
}

function exportPayslip(slip) {
  const net = Number(slip.net_pay||(Number(slip.base_salary)+Number(slip.bonus_total||0)-Number(slip.deduction_total||0)))
  const lines = [
    '═══════════════════════════════════════',
    '      GOLDEN CRESCENT DELIVERY',
    '       Burjuman Business Tower',
    '            Dubai, UAE',
    '═══════════════════════════════════════',
    `  PAYSLIP — ${slip.month||''}`,
    `  Name     : ${slip.name}`,
    `  ID       : ${slip.emp_id||slip.id}`,
    '───────────────────────────────────────',
    `  Base Salary        AED ${fmt(slip.base_salary)}`,
  ]
  if (slip.bonuses?.length) {
    lines.push('  ─ Additions ─')
    slip.bonuses.forEach(b=>lines.push(`  ${(b.type||'').padEnd(18)} AED +${fmt(b.amount)}`))
  }
  if (slip.deductions?.length) {
    lines.push('  ─ Deductions ─')
    slip.deductions.forEach(d=>lines.push(`  ${(d.type||'').padEnd(18)} AED -${fmt(d.amount)}`))
  }
  lines.push('───────────────────────────────────────')
  lines.push(`  NET PAY             AED ${fmt(net)}`)
  lines.push(`  Status : ${slip.payroll_status==='paid'?'PAID ✓':'PENDING'}`)
  lines.push('═══════════════════════════════════════')
  const blob = new Blob([lines.join('\n')], {type:'text/plain'})
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`payslip_${slip.emp_id||slip.id}_${slip.month||''}.txt`; a.click()
}

// ── Payroll Card ──────────────────────────────────────────────
function PayrollCard({ slip, onMarkPaid, onEditSalary, onRemoveDed, onRemoveBonus, index }) {
  const [open, setOpen] = useState(false)
  const net      = Number(slip.net_pay||(Number(slip.base_salary)+Number(slip.bonus_total||0)-Number(slip.deduction_total||0)))
  const isPaid   = slip.payroll_status === 'paid'
  const hasItems = slip.deductions?.length || slip.bonuses?.length

  return (
    <div style={{ background:'#FFF', border:`1px solid ${isPaid?'#A7F3D0':'#EAE6DE'}`, borderRadius:16, overflow:'hidden', animation:`slideUp 0.4s ${index*0.04}s ease both`, transition:'box-shadow 0.2s, border-color 0.2s' }}>
      {/* Main row */}
      <div style={{ padding:'14px 16px', cursor:'pointer' }} onClick={()=>setOpen(p=>!p)}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {/* Avatar */}
          <div style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(135deg,#FDF6E3,#FEF3D0)', border:'1.5px solid #F0D78C', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
            {slip.avatar||'👤'}
          </div>

          {/* Name + meta */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:14, color:'#1A1612', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{slip.name}</div>
            <div style={{ fontSize:11, color:'#A89880', marginTop:2, display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
              <span style={{ fontFamily:'monospace' }}>{slip.id}</span>
              {slip.station_code && <span style={{ background:'#FDF6E3', color:'#B8860B', fontWeight:700, padding:'1px 6px', borderRadius:5, fontSize:10 }}>{slip.station_code}</span>}
            </div>
          </div>

          {/* Net pay + status */}
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontWeight:900, fontSize:17, color:isPaid?'#2E7D52':'#B8860B', letterSpacing:'-0.03em' }}>AED {fmt(net)}</div>
            <div style={{ display:'flex', alignItems:'center', gap:5, justifyContent:'flex-end', marginTop:4 }}>
              <span style={{ fontSize:10, fontWeight:700, color:isPaid?'#2E7D52':'#B45309', background:isPaid?'#ECFDF5':'#FFFBEB', border:`1px solid ${isPaid?'#A7F3D0':'#FCD34D'}`, padding:'2px 8px', borderRadius:20 }}>
                {isPaid?'✓ Paid':'Pending'}
              </span>
              {open ? <ChevronUp size={14} color="#A89880"/> : <ChevronDown size={14} color="#A89880"/>}
            </div>
          </div>
        </div>

        {/* Summary pills */}
        <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, color:'#6B5D4A', background:'#FAFAF8', border:'1px solid #EAE6DE', borderRadius:8, padding:'3px 10px' }}>
            Base: AED {fmt(slip.base_salary)}
          </span>
          {Number(slip.bonus_total)>0 && (
            <span style={{ fontSize:11, color:'#2E7D52', background:'#ECFDF5', border:'1px solid #A7F3D0', borderRadius:8, padding:'3px 10px' }}>
              +AED {fmt(slip.bonus_total)}
            </span>
          )}
          {Number(slip.deduction_total)>0 && (
            <span style={{ fontSize:11, color:'#C0392B', background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:8, padding:'3px 10px' }}>
              -AED {fmt(slip.deduction_total)}
            </span>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div style={{ borderTop:'1px solid #F5F4F1' }}>
          {/* Actions */}
          <div style={{ padding:'10px 14px', display:'flex', gap:8, flexWrap:'wrap', background:'#FAFAF8' }}>
            <button onClick={()=>onEditSalary(slip)} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:9, background:'#FFF', border:'1px solid #EAE6DE', fontSize:11.5, fontWeight:600, color:'#6B5D4A', cursor:'pointer' }}>
              ✏️ Edit Salary
            </button>
            <button onClick={()=>exportPayslip({...slip, month: slip.month||new Date().toISOString().slice(0,7)})} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:9, background:'#FFF', border:'1px solid #EAE6DE', fontSize:11.5, fontWeight:600, color:'#6B5D4A', cursor:'pointer' }}>
              <FileText size={12}/> Export
            </button>
            {!isPaid && (
              <button onClick={()=>onMarkPaid(slip)} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:9, background:'linear-gradient(135deg,#2E7D52,#22C55E)', border:'none', fontSize:11.5, fontWeight:700, color:'#FFF', cursor:'pointer', marginLeft:'auto' }}>
                <Check size={12}/> Mark Paid
              </button>
            )}
          </div>

          {/* Bonuses */}
          {slip.bonuses?.length > 0 && (
            <div style={{ padding:'10px 14px', borderTop:'1px solid #F5F4F1' }}>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', color:'#2E7D52', marginBottom:8 }}>➕ Additions</div>
              {slip.bonuses.map(b=>(
                <div key={b.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', background:'#F0FDF4', borderRadius:9, border:'1px solid #A7F3D030', marginBottom:6 }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:'#2E7D52' }}>{BON_TYPES.find(t=>t.v===b.type)?.e} {b.type}</div>
                    {b.description && <div style={{ fontSize:11, color:'#A89880', marginTop:1 }}>{b.description}</div>}
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ fontWeight:800, color:'#2E7D52', fontSize:13 }}>+AED {fmt(b.amount)}</span>
                    <button onClick={()=>onRemoveBonus(b.id)} style={{ width:22, height:22, borderRadius:6, background:'#FEF2F2', border:'1px solid #FCA5A5', color:'#C0392B', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Deductions */}
          {slip.deductions?.length > 0 && (
            <div style={{ padding:'10px 14px', borderTop:'1px solid #F5F4F1' }}>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', color:'#C0392B', marginBottom:8 }}>➖ Deductions</div>
              {slip.deductions.map(d=>{
                const dt = DED_TYPES.find(t=>t.v===d.type)
                return (
                  <div key={d.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'8px 10px', background:'#FEF7F6', borderRadius:9, border:'1px solid #FCA5A530', marginBottom:6 }}>
                    <div style={{ flex:1, marginRight:10 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:dt?.c||'#C0392B' }}>{dt?.e} {dt?.l||d.type}</div>
                      {d.description && <div style={{ fontSize:11, color:'#6B5D4A', marginTop:1 }}>{d.description}</div>}
                      {d.reference && <div style={{ fontSize:10, color:'#C4B49A', fontFamily:'monospace', marginTop:1 }}>Ref: {d.reference}</div>}
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                      <span style={{ fontWeight:800, color:'#C0392B', fontSize:13 }}>-AED {fmt(d.amount)}</span>
                      <button onClick={()=>onRemoveDed(d.id)} style={{ width:22, height:22, borderRadius:6, background:'#FEF2F2', border:'1px solid #FCA5A5', color:'#C0392B', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 }}>×</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!hasItems && (
            <div style={{ padding:'16px 14px', textAlign:'center', color:'#C4B49A', fontSize:12 }}>No deductions or bonuses this month</div>
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
    try {
      await fetch(`${API}/api/payroll/bonuses/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } })
      load()
    } catch(e){ alert(e.message) }
  }

  const filtered   = payroll.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase()))
  const totalBase  = payroll.reduce((s,p)=>s+Number(p.base_salary||0),0)
  const totalBonus = payroll.reduce((s,p)=>s+Number(p.bonus_total||0),0)
  const totalDed   = payroll.reduce((s,p)=>s+Number(p.deduction_total||0),0)
  const totalNet   = payroll.reduce((s,p)=>s+Number(p.net_pay||(Number(p.base_salary)+Number(p.bonus_total||0)-Number(p.deduction_total||0))),0)
  const paidCount  = payroll.filter(p=>p.payroll_status==='paid').length

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, animation:'slideUp 0.35s ease' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontWeight:900, fontSize:20, color:'#1A1612', letterSpacing:'-0.03em' }}>Payroll</h1>
          <p style={{ fontSize:12, color:'#A89880', marginTop:3 }}>{payroll.length} employees · {paidCount} paid this month</p>
        </div>
        {/* Month selector */}
        <select value={month} onChange={e=>setMonth(e.target.value)}
          style={{ padding:'8px 14px', borderRadius:20, border:'1.5px solid #EAE6DE', background:'#FFF', fontSize:13, fontWeight:600, color:'#1A1612', cursor:'pointer', outline:'none' }}>
          {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* ── Summary hero ── */}
      <div style={{ background:'linear-gradient(135deg,#1A1612 0%,#2C1F0A 100%)', borderRadius:20, padding:'20px 18px', color:'white', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-20, top:-20, width:160, height:160, borderRadius:'50%', background:'rgba(184,134,11,0.12)' }}/>
        <div style={{ position:'absolute', right:50, bottom:-40, width:100, height:100, borderRadius:'50%', background:'rgba(184,134,11,0.07)' }}/>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>Net Payroll — {month}</div>
        <div style={{ fontWeight:900, fontSize:32, letterSpacing:'-0.04em', color:'#D4A017', marginBottom:16 }}>AED {fmt(totalNet)}</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {[
            { l:'Base',       v:`${fmt(totalBase)}`,  c:'rgba(255,255,255,0.9)' },
            { l:'+ Bonuses',  v:`${fmt(totalBonus)}`, c:'#4ADE80' },
            { l:'- Deductions',v:`${fmt(totalDed)}`,  c:'#F87171' },
            { l:'Paid',       v:`${paidCount}/${payroll.length}`, c:'#FCD34D' },
          ].map(s=>(
            <div key={s.l} style={{ background:'rgba(255,255,255,0.07)', borderRadius:11, padding:'10px 8px', textAlign:'center', backdropFilter:'blur(10px)' }}>
              <div style={{ fontWeight:800, fontSize:14, color:s.c, letterSpacing:'-0.02em' }}>{s.v}</div>
              <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.4)', marginTop:3, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Action bar ── */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ flex:'1 1 200px', position:'relative' }}>
          <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#C4B49A', pointerEvents:'none' }}/>
          <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search employee…" style={{ paddingLeft:34, borderRadius:20 }}/>
        </div>
        <button onClick={()=>exportCSV(payroll,month)} className="btn btn-secondary" style={{ borderRadius:20, fontSize:12 }}>
          <Download size={13}/> Export CSV
        </button>
        <button onClick={()=>setModal('bonus')} style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:20, background:'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border:'1.5px solid #A7F3D0', color:'#2E7D52', fontWeight:700, fontSize:12, cursor:'pointer' }}>
          ➕ Add Bonus
        </button>
        <button onClick={()=>setModal('deduction')} style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:20, background:'linear-gradient(135deg,#FEF2F2,#FFE4E4)', border:'1.5px solid #FCA5A5', color:'#C0392B', fontWeight:700, fontSize:12, cursor:'pointer' }}>
          ➖ Add Deduction
        </button>
        <button onClick={markAllPaid} className="btn btn-primary" style={{ borderRadius:20, fontSize:12 }}>
          <Check size={13}/> Mark All Paid
        </button>
      </div>

      {/* ── Cards ── */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2,3].map(i=><div key={i} className="skeleton" style={{ height:88, borderRadius:16 }}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'50px 20px', color:'#A89880' }}>
          <div style={{ fontSize:40, marginBottom:10 }}>💰</div>
          <div style={{ fontWeight:600, color:'#6B5D4A' }}>{search?`No results for "${search}"`:'No payroll data for this month'}</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map((slip,i)=>(
            <PayrollCard
              key={slip.id||slip.emp_id}
              slip={slip}
              index={i}
              onMarkPaid={markPaid}
              onEditSalary={s=>setModal({type:'salary',emp:s})}
              onRemoveDed={removeDed}
              onRemoveBonus={removeBonus}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {modal==='deduction' && <DeductionModal employees={employees} month={month} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal==='bonus'     && <BonusModal     employees={employees} month={month} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
      {modal?.type==='salary' && <SalaryModal emp={modal.emp} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
    </div>
  )
}
