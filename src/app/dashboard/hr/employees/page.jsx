'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { empApi } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import {
  Search, Plus, X, Pencil, Trash2, Phone, User, Building2,
  AlertCircle, CheckCircle2, Briefcase, CreditCard, Calendar,
  Users, Receipt, ExternalLink, Shield, ChevronRight, Truck, ArrowLeftRight
} from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'

const _raw = process.env.NEXT_PUBLIC_API_URL
const API = _raw && !_raw.startsWith("http") ? `https://${_raw}` : (_raw || "http://localhost:4000")
const STATIONS = ['All','DDB1','DXE6']
const SC_COLOR = { DDB1:'#B8860B', DXE6:'#2563EB' }
const SC_BG    = { DDB1:'#FFFBEB', DXE6:'#EFF6FF' }
const SC_BORDER= { DDB1:'#FDE68A', DXE6:'#BFDBFE' }

const STATUS = {
  active:   { l:'Active',   c:'#10B981', bg:'#F0FDF4', bc:'#A7F3D0', dot:'#10B981' },
  on_leave: { l:'On Leave', c:'#F59E0B', bg:'#FFFBEB', bc:'#FDE68A', dot:'#F59E0B' },
  inactive: { l:'Inactive', c:'#9CA3AF', bg:'#F9FAFB', bc:'#E5E7EB', dot:'#9CA3AF' },
}

const EMPTY = {
  id:'', name:'', role:'Driver', dept:'Operations', status:'active',
  salary:'', joined:'', phone:'', work_number:'', nationality:'', zone:'',
  visa_expiry:'', license_expiry:'', avatar:'',
  station_code:'DDB1', hourly_rate:'3.85',
  iloe_expiry:'', annual_leave_start:'',
  amazon_id:'', emirates_id:'', annual_leave_balance:30,
  project_type:'pulser', per_shipment_rate:'0.5', performance_bonus:'100',
  login_email:'', login_password:'',
  // Extended personal / WPS fields
  sub_group_name:'', beneficiary_first_name:'', beneficiary_middle_name:'',
  beneficiary_last_name:'', father_family_name:'', dob:'', gender:'',
  marital_status:'', uid_number:'', emirates_issuing_visa:'',
  residential_location:'', work_location:'', passport_no:'', email_id:'', visa_file_no:''
}

function hdr() { return { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }
function expiry(ds) {
  if (!ds) return null
  try {
    const d = differenceInDays(parseISO(ds.slice(0,10)), new Date())
    if (d < 0)   return { label:'Expired',    c:'#EF4444', bg:'#FEF2F2', bc:'#FECACA' }
    if (d <= 30) return { label:`${d}d left`, c:'#EF4444', bg:'#FEF2F2', bc:'#FECACA' }
    if (d <= 90) return { label:`${d}d left`, c:'#F59E0B', bg:'#FFFBEB', bc:'#FDE68A' }
    return { label:'Valid', c:'#10B981', bg:'#F0FDF4', bc:'#A7F3D0' }
  } catch { return null }
}

/* ── Profile completion ──────────────────────────────────────── */
const COMPLETION_FIELDS = [
  'phone','emirates_id','nationality','dob','gender','marital_status',
  'passport_no','uid_number','visa_file_no','email_id','father_family_name',
  'beneficiary_first_name','residential_location','work_location',
  'emirates_issuing_visa','visa_expiry','license_expiry','amazon_id',
  'sub_group_name',
]
function profileCompletion(emp) {
  if (!emp) return 0
  const filled = COMPLETION_FIELDS.filter(f => emp[f] && String(emp[f]).trim() !== '').length
  const hasSalary = Number(emp.salary||0) > 0 ? 1 : 0
  return Math.round(((filled + hasSalary) / (COMPLETION_FIELDS.length + 1)) * 100)
}

/* ── Completion Ring (SVG) ───────────────────────────────────── */
function CompletionRing({ pct, size=54, stroke=3 }) {
  const r   = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = pct === 100 ? '#10B981' : pct >= 60 ? '#F59E0B' : '#E5E7EB'
  return (
    <svg width={size} height={size} style={{ position:'absolute', top:0, left:0, transform:'rotate(-90deg)', pointerEvents:'none' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition:'stroke-dasharray 0.5s ease' }}/>
    </svg>
  )
}

/* ── Label ───────────────────────────────────────────────────── */
function Lbl({ children }) {
  return <label style={{ display:'block', fontSize:10.5, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:5 }}>{children}</label>
}

/* ── Modal ───────────────────────────────────────────────────── */
function EmpModal({ emp, onSave, onClose, mode }) {
  const [form, setForm] = useState(() => emp ? {
    ...emp,
    salary:               emp.salary||'',
    hourly_rate:          emp.hourly_rate||'3.85',
    annual_leave_balance: emp.annual_leave_balance||30,
    joined:               emp.joined?.slice(0,10)||'',
    visa_expiry:          emp.visa_expiry?.slice(0,10)||'',
    license_expiry:       emp.license_expiry?.slice(0,10)||'',
    iloe_expiry:          emp.iloe_expiry?.slice(0,10)||'',
    annual_leave_start:   emp.annual_leave_start?.slice(0,10)||'',
    dob:                  emp.dob?.slice(0,10)||'',
    project_type:         emp.project_type||'pulser',
    per_shipment_rate:    emp.per_shipment_rate||'0.5',
    performance_bonus:    emp.performance_bonus||'100',
    sub_group_name:           emp.sub_group_name||'',
    beneficiary_first_name:   emp.beneficiary_first_name||'',
    beneficiary_middle_name:  emp.beneficiary_middle_name||'',
    beneficiary_last_name:    emp.beneficiary_last_name||'',
    father_family_name:       emp.father_family_name||'',
    gender:                   emp.gender||'',
    marital_status:            emp.marital_status||'',
    uid_number:               emp.uid_number||'',
    emirates_issuing_visa:    emp.emirates_issuing_visa||'',
    residential_location:     emp.residential_location||'',
    work_location:            emp.work_location||'',
    passport_no:              emp.passport_no||'',
    email_id:                 emp.email_id||'',
    visa_file_no:             emp.visa_file_no||'',
    login_email:'', login_password:''
  } : EMPTY)
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)
  const [tab,    setTab]    = useState('identity')

  function set(k,v) { setForm(p=>({...p,[k]:v})) }

  async function handleSave() {
    if (!form.name||!form.role||!form.dept) return setErr('Name, role and department required')
    if (mode==='add'&&!form.id) return setErr('Employee ID required')
    setSaving(true); setErr(null)
    try {
      const data = {...form, salary:Number(form.salary)||0, hourly_rate:Number(form.hourly_rate)||3.85,
        per_shipment_rate:Number(form.per_shipment_rate)||0.5, performance_bonus:Number(form.performance_bonus)||100}
      const res = mode==='add' ? await empApi.create(data) : await empApi.update(form.id,data)
      if (mode==='add'&&form.login_email&&form.login_password) {
        const empId = res?.employee?.id||form.id
        await fetch(`${API}/api/employees/${empId}/create-user`,{method:'POST',headers:hdr(),body:JSON.stringify({email:form.login_email.trim().toLowerCase(),password:form.login_password})}).catch(()=>{})
      }
      onSave()
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  function inp(label, k, type='text', placeholder='') {
    return (
      <div key={k}>
        <Lbl>{label}</Lbl>
        <input className="input" type={type} value={form[k]||''} autoComplete="off" spellCheck={false}
          placeholder={placeholder} onChange={e=>set(k,e.target.value)}/>
      </div>
    )
  }
  function sel(label, k, options) {
    return (
      <div key={k}>
        <Lbl>{label}</Lbl>
        <select className="input" value={form[k]||''} onChange={e=>set(k,e.target.value)}>
          {options.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
        </select>
      </div>
    )
  }

  const TABS = [
    {id:'identity',l:'Identity'},
    {id:'personal',l:'Personal'},
    {id:'work',l:'Work & Pay'},
    {id:'docs',l:'Documents'},
    ...(mode==='add'?[{id:'login',l:'Login'}]:[]),
  ]

  const previewSalary = () => {
    const base=Number(form.salary||0), rate=Number(form.hourly_rate||3.85)
    const perf=Number(form.performance_bonus||100), perShip=Number(form.per_shipment_rate||0.5)
    return form.project_type==='cret'
      ? `AED ${base} + shipments × ${perShip}`
      : `AED ${base} + hours × ${rate} + ${perf} bonus`
  }

  return (
    <div className="modal-overlay">
      <div style={{ background:'var(--card)', borderRadius:20, width:'100%', maxWidth:540, maxHeight:'92vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'var(--shadow-lg)', border:'1px solid var(--border)' }}>
        {/* Header */}
        <div style={{ padding:'20px 24px 0', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <h3 style={{ fontWeight:800, fontSize:16, color:'var(--text)', margin:0 }}>{mode==='add'?'Add New DA':'Edit DA'}</h3>
              <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{mode==='add'?'Create a new Delivery Associate':emp?.name}</p>
            </div>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, background:'var(--bg-alt)', border:'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X size={14} color="var(--text-sub)"/>
            </button>
          </div>
          <div style={{ display:'flex', gap:2 }}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{ padding:'8px 14px', fontSize:12.5, fontWeight:tab===t.id?700:500, color:tab===t.id?'var(--gold)':'var(--text-muted)', background:'none', border:'none', borderBottom:`2px solid ${tab===t.id?'var(--gold)':'transparent'}`, cursor:'pointer', fontFamily:'Poppins,sans-serif', marginBottom:-1, transition:'all 0.15s' }}>
                {t.l}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 24px', overflowY:'auto', flex:1 }}>
          {err && (
            <div style={{ display:'flex', gap:8, alignItems:'center', background:'var(--red-bg)', border:'1px solid var(--red-border)', borderRadius:10, padding:'10px 14px', fontSize:12.5, color:'var(--red)', marginBottom:14 }}>
              <AlertCircle size={14}/>{err}
            </div>
          )}

          {tab==='identity' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
              {mode==='add' && inp('Employee ID *','id','text','DA001')}
              {inp('Full Name *','name','text','Mohammed Al Rashid')}
              {inp('Phone Number','phone','tel','+971 50 XXX XXXX')}
              {inp('Work Number','work_number','text','Internal contact')}
              {inp('Amazon / Transporter ID','amazon_id','text','TRS-00123')}
              {inp('Emirates ID','emirates_id','text','784-XXXX-XXXXXXX-X')}
              {inp('Nationality','nationality','text','UAE')}
            </div>
          )}

          {tab==='personal' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
              {inp('Sub Group Name','sub_group_name')}
              {inp('Passport No','passport_no','text','A1234567')}
              {inp('Email ID','email_id','email','name@example.com')}
              {inp('Visa File No','visa_file_no')}
              {inp('UID Number','uid_number')}
              {inp('Emirates Issuing Visa','emirates_issuing_visa','text','Dubai')}
              {inp('Father / Family Name','father_family_name')}
              {inp('Date of Birth','dob','date')}
              {sel('Gender','gender',[{v:'',l:'— Select —'},{v:'Male',l:'Male'},{v:'Female',l:'Female'}])}
              {sel('Marital Status','marital_status',[{v:'',l:'— Select —'},{v:'Single',l:'Single'},{v:'Married',l:'Married'},{v:'Divorced',l:'Divorced'},{v:'Widowed',l:'Widowed'}])}
              {inp('Residential Location','residential_location','text','Dubai, Al Quoz')}
              {inp('Work Location','work_location','text','DXE6 Station')}
              <div style={{ gridColumn:'span 2' }}>
                <div style={{ background:'var(--blue-bg)', border:'1px solid var(--blue-border)', borderRadius:12, padding:'14px 16px' }}>
                  <label style={{ fontSize:11, fontWeight:800, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--blue)', marginBottom:10, display:'block' }}>Beneficiary Details</label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                    {inp('First Name','beneficiary_first_name')}
                    {inp('Middle Name','beneficiary_middle_name')}
                    {inp('Last Name','beneficiary_last_name')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab==='work' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
              {sel('Role *','role',['Driver','HR Manager','Finance Mgr','Accountant','Dispatcher','General Manager','Admin','POC','Other'])}
              {sel('Department *','dept',['Operations','HR','Finance','Admin','Other'])}
              {sel('Station','station_code',['DDB1','DXE6'])}
              {sel('Status','status',[{v:'active',l:'Active'},{v:'on_leave',l:'On Leave'},{v:'inactive',l:'Inactive'}])}
              <div style={{ gridColumn:'span 2' }}>
                <div style={{ background:'var(--purple-bg)', border:'1px solid var(--purple-border)', borderRadius:12, padding:'14px 16px' }}>
                  <label style={{ fontSize:11, fontWeight:800, letterSpacing:'0.06em', textTransform:'uppercase', color:'#7C3AED', marginBottom:10, display:'block' }}>Project & Salary Type</label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                    {[{v:'pulser',l:'Pulser',d:'Base + Hours × Rate + Bonus'},{v:'cret',l:'CRET',d:'Base + Shipments × Rate'}].map(p=>(
                      <button key={p.v} onClick={()=>set('project_type',p.v)} type="button"
                        style={{ padding:'11px', borderRadius:10, border:`2px solid ${form.project_type===p.v?'#7C3AED':'var(--border)'}`, background:form.project_type===p.v?'var(--purple-bg)':'var(--card)', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
                        <div style={{ fontWeight:700, fontSize:13, color:form.project_type===p.v?'#7C3AED':'var(--text)' }}>{p.l}</div>
                        <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:2 }}>{p.d}</div>
                      </button>
                    ))}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {inp('Base Salary (AED)','salary','number','3800')}
                    {form.project_type==='pulser' ? inp('Hourly Rate','hourly_rate','number','3.85') : inp('Per Shipment Rate','per_shipment_rate','number','0.5')}
                    {form.project_type==='pulser' && inp('Performance Bonus','performance_bonus','number','100')}
                  </div>
                  <div style={{ marginTop:10, background:form.project_type==='pulser'?'var(--green-bg)':'var(--blue-bg)', borderRadius:9, padding:'8px 12px', fontSize:12, color:form.project_type==='pulser'?'var(--green)':'var(--blue)', fontWeight:600 }}>
                    Formula: {previewSalary()}
                  </div>
                </div>
              </div>
              {inp('Start Date','joined','date')}
              {inp('AL Start Date','annual_leave_start','date')}
              {inp('AL Balance (days)','annual_leave_balance','number','30')}
            </div>
          )}

          {tab==='docs' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
              {inp('Visa Expiry','visa_expiry','date')}
              {inp('License Expiry','license_expiry','date')}
              {inp('ILOE Expiry','iloe_expiry','date')}
            </div>
          )}

          {tab==='login' && mode==='add' && (
            <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
              <div style={{ background:'var(--amber-bg)', border:'1px solid var(--amber-border)', borderRadius:10, padding:'12px 14px', fontSize:12.5, color:'#92400E' }}>
                <strong>Optional:</strong> Creates a driver portal login for this DA.
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
                {inp('Login Email','login_email','email','da@goldencrescent.ae')}
                {inp('Login Password','login_password','password','Min 6 characters')}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 24px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0 }}>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ minWidth:120, justifyContent:'center' }}>
            {saving ? <><span style={{ width:13,height:13,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.8s linear infinite',display:'inline-block'}}/> Saving…</> : mode==='add'?'Add DA':'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Work Number Assigner ─────────────────────────────────────── */
function WorkNumberAssigner({ emp, onSaved, userRole, onSelectEmployee }) {
  const [mode,    setMode]    = useState('view') // 'view' | 'pick'
  const [sims,    setSims]    = useState([])
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [conflict,setConflict]= useState(null)   // { conflictEmpId, conflictEmpName }
  const [step,    setStep]    = useState(0)       // 0 | 1 | 2
  const [pending, setPending] = useState('')
  const [history, setHistory] = useState(null)   // null = hidden, [] = loaded
  const [hLoad,   setHLoad]   = useState(false)

  const canEdit = ['admin','manager','general_manager','hr','poc'].includes(userRole)

  function reset() { setMode('view'); setStep(0); setConflict(null); setPending(''); setSims([]) }

  async function openPicker() {
    setMode('pick'); setLoading(true)
    try {
      const r = await fetch(`${API}/api/sims`, { headers: hdr() })
      const d = await r.json()
      setSims((d.sims||[]).filter(s => s.phone_number && (s.status==='available' || s.emp_id===emp.id)))
    } catch(e) {} finally { setLoading(false) }
  }

  async function tryAssign(phoneNumber, force=false) {
    setSaving(true)
    try {
      const r = await fetch(`${API}/api/employees/${emp.id}/assign-work-number`, {
        method:'POST', headers:hdr(),
        body: JSON.stringify({ phone_number: phoneNumber, force })
      })
      const d = await r.json()
      if (d.conflict) {
        setPending(phoneNumber)
        setConflict({ conflictEmpId: d.conflictEmpId, conflictEmpName: d.conflictEmpName })
        setStep(1)
      } else if (d.ok) { reset(); onSaved?.() }
      else if (d.error) { alert(d.error); reset() }
    } catch(e) {} finally { setSaving(false) }
  }

  async function handleRemove() {
    if (!confirm('Remove work number from this employee?')) return
    setSaving(true)
    try {
      await fetch(`${API}/api/employees/${emp.id}/work-number`, { method:'DELETE', headers:hdr() })
      onSaved?.()
    } catch(e) {} finally { setSaving(false) }
  }

  async function openHistory() {
    setHLoad(true); setHistory([])
    try {
      const r = await fetch(`${API}/api/employees/work-number/history?emp_id=${emp.id}`, { headers: hdr() })
      const d = await r.json()
      setHistory(d.history||[])
    } catch(e) { setHistory([]) } finally { setHLoad(false) }
  }

  const ACTION_COLOR = { assigned:'#10B981', reassigned:'#F59E0B', removed:'#EF4444' }
  const ACTION_BG    = { assigned:'#F0FDF4', reassigned:'#FFFBEB', removed:'#FEF2F2' }

  return (
    <div style={{ background:'var(--bg-alt)', borderRadius:10, padding:'10px 12px', marginBottom:10, border:'1px solid var(--border)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Work Number</div>
        {canEdit && emp.work_number && (
          <button onClick={history===null ? openHistory : ()=>setHistory(null)}
            style={{ fontSize:10, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'Poppins,sans-serif', textDecoration:'underline' }}>
            {history===null ? 'History' : 'Hide'}
          </button>
        )}
      </div>

      {/* ── Conflict step 1 ── */}
      {step===1 && conflict && (
        <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:9, padding:'10px 12px', fontSize:12 }}>
          <div style={{ fontWeight:600, color:'#92400E', marginBottom:8 }}>
            ⚠️ <strong>{pending}</strong> is already assigned to <strong>{conflict.conflictEmpName}</strong>. Proceed?
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={()=>setStep(2)} style={{ flex:1, padding:'6px', borderRadius:7, background:'#B8860B', color:'white', border:'none', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'Poppins,sans-serif' }}>Yes, proceed</button>
            <button onClick={reset} style={{ flex:1, padding:'6px', borderRadius:7, background:'var(--card)', color:'var(--text-sub)', border:'1px solid var(--border)', cursor:'pointer', fontSize:11, fontFamily:'Poppins,sans-serif' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Conflict step 2 ── */}
      {step===2 && conflict && (
        <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:9, padding:'10px 12px', fontSize:12 }}>
          <div style={{ fontWeight:600, color:'#7F1D1D', marginBottom:8 }}>
            Assign a new number to <strong>{conflict.conflictEmpName}</strong>?
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={()=>{ tryAssign(pending,true); onSelectEmployee?.(conflict.conflictEmpId) }}
              disabled={saving}
              style={{ flex:1, padding:'6px', borderRadius:7, background:'#10B981', color:'white', border:'none', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'Poppins,sans-serif' }}>
              Yes, reassign them
            </button>
            <button onClick={()=>tryAssign(pending,true)} disabled={saving}
              style={{ flex:1, padding:'6px', borderRadius:7, background:'#EF4444', color:'white', border:'none', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'Poppins,sans-serif' }}>
              {saving?'…':'No, just remove it'}
            </button>
          </div>
        </div>
      )}

      {/* ── View mode ── */}
      {step===0 && mode==='view' && (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:700, color:emp.work_number?'var(--text)':'var(--text-muted)', fontFamily:emp.work_number?'monospace':'inherit' }}>
            {emp.work_number||'Not assigned'}
          </span>
          {canEdit && (
            <div style={{ display:'flex', gap:5 }}>
              <button onClick={openPicker} style={{ padding:'4px 10px', borderRadius:7, background:'var(--card)', border:'1px solid var(--border)', color:'var(--text-sub)', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'Poppins,sans-serif', display:'flex', alignItems:'center', gap:4 }}>
                <Phone size={10}/> {emp.work_number?'Change':'Assign'}
              </button>
              {emp.work_number && (
                <button onClick={handleRemove} disabled={saving} style={{ padding:'4px 8px', borderRadius:7, background:'var(--red-bg)', border:'1px solid var(--red-border)', color:'var(--red)', cursor:'pointer', display:'flex', alignItems:'center' }}>
                  <X size={10}/>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SIM picker ── */}
      {step===0 && mode==='pick' && (
        <div>
          {loading ? (
            <div style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center', padding:'10px 0' }}>Loading SIMs…</div>
          ) : sims.length===0 ? (
            <div style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center', padding:'10px 0' }}>No available SIM numbers</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:180, overflowY:'auto', marginBottom:8 }}>
              {sims.map(s => (
                <button key={s.id} onClick={()=>tryAssign(s.phone_number)} disabled={saving}
                  style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', borderRadius:8,
                    background: s.emp_id===emp.id ? 'var(--green-bg)' : 'var(--card)',
                    border: `1px solid ${s.emp_id===emp.id ? 'var(--green)' : 'var(--border)'}`,
                    cursor:'pointer', textAlign:'left', fontFamily:'Poppins,sans-serif' }}>
                  <span style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:'var(--text)' }}>{s.phone_number}</span>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    {s.emp_id===emp.id && <span style={{ fontSize:10, color:'var(--green)', fontWeight:700 }}>Current</span>}
                    <span style={{ fontSize:10, color:'var(--text-muted)' }}>{s.carrier}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          <button onClick={reset} style={{ width:'100%', padding:'6px', borderRadius:8, background:'var(--bg-alt)', border:'1px solid var(--border)', color:'var(--text-sub)', cursor:'pointer', fontSize:11, fontFamily:'Poppins,sans-serif' }}>Cancel</button>
        </div>
      )}

      {/* ── History panel ── */}
      {history !== null && (
        <div style={{ marginTop:10, borderTop:'1px solid var(--border)', paddingTop:10 }}>
          {hLoad ? (
            <div style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center' }}>Loading…</div>
          ) : history.length===0 ? (
            <div style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center' }}>No history yet</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:160, overflowY:'auto' }}>
              {history.map(h => (
                <div key={h.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 8px', borderRadius:7, background:'var(--card)', border:'1px solid var(--border)' }}>
                  <div>
                    <span style={{ fontSize:10, fontWeight:700, color:ACTION_COLOR[h.action], background:ACTION_BG[h.action], borderRadius:4, padding:'1px 6px', marginRight:6, textTransform:'capitalize' }}>{h.action}</span>
                    <span style={{ fontSize:11, fontFamily:'monospace', color:'var(--text)' }}>{h.phone_number}</span>
                  </div>
                  <span style={{ fontSize:10, color:'var(--text-muted)' }}>{new Date(h.performed_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Detail Drawer ───────────────────────────────────────────── */
function DetailDrawer({ emp, onEdit, onDelete, onClose, onRefresh, userRole, onSelectEmployee }) {
  const [leaves,      setLeaves]     = useState([])
  const [leavesLoad,  setLeavesLoad] = useState(true)
  const [expenses,    setExpenses]   = useState([])
  const [expLoad,     setExpLoad]    = useState(false)
  const [fleetAsgn,   setFleetAsgn]  = useState([])   // assignment history
  const [fleetHv,     setFleetHv]    = useState([])   // handover history
  const [fleetLoad,   setFleetLoad]  = useState(false)
  const [tab,         setTab]        = useState('info')

  const hdr = () => ({ Authorization:`Bearer ${localStorage.getItem('gcd_token')}` })

  useEffect(() => {
    setLeavesLoad(true)
    fetch(`${API}/api/leaves?emp_id=${emp.id}&stage=all`,{headers:hdr()})
      .then(r=>r.json()).then(d=>setLeaves(d.leaves||[])).catch(()=>setLeaves([])).finally(()=>setLeavesLoad(false))
  }, [emp.id])

  useEffect(() => {
    if (tab !== 'expenses') return
    setExpLoad(true)
    fetch(`${API}/api/expenses?emp_id=${emp.id}`,{headers:hdr()})
      .then(r=>r.json()).then(d=>setExpenses(d.expenses||[])).catch(()=>setExpenses([])).finally(()=>setExpLoad(false))
  }, [tab, emp.id])

  useEffect(() => {
    if (tab !== 'fleet') return
    setFleetLoad(true)
    Promise.all([
      fetch(`${API}/api/handovers?emp_id=${emp.id}`,{headers:hdr()}).then(r=>r.json()).catch(()=>({handovers:[]})),
      fetch(`${API}/api/vehicles/assignments/history?emp_id=${emp.id}`,{headers:hdr()}).then(r=>r.json()).catch(()=>({history:[]})),
    ]).then(([hv, asgn]) => {
      setFleetHv(hv.handovers||[])
      setFleetAsgn(asgn.history||[])
    }).finally(()=>setFleetLoad(false))
  }, [tab, emp.id])

  const s   = STATUS[emp.status]||STATUS.inactive
  const sc  = SC_COLOR[emp.station_code]||'#B8860B'
  const sbg = SC_BG[emp.station_code]||'#FFFBEB'
  const sbc = SC_BORDER[emp.station_code]||'#FDE68A'

  const TABS = [
    { id:'info',     l:'Profile' },
    { id:'leaves',   l:`Leaves${leaves.length>0?` (${leaves.length})`:''}`  },
    { id:'sims',     l:'SIMs' },
    { id:'fleet',    l:'Fleet' },
    { id:'expenses', l:'Expenses' },
  ]

  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', boxShadow:'var(--shadow-md)', display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Profile header */}
      <div style={{ background:`linear-gradient(135deg,${sbg},var(--card))`, padding:'20px 16px 14px', position:'relative', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <button onClick={onClose} style={{ position:'absolute',top:12,right:12,width:26,height:26,borderRadius:8,background:'var(--card)',border:'1px solid var(--border)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
          <X size={13} color="var(--text-sub)"/>
        </button>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:54,height:54,borderRadius:16,background:'var(--card)',border:`2px solid ${sbc}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900,color:sc,margin:'0 auto 10px',boxShadow:`0 4px 12px ${sc}18`,position:'relative' }}>
            {emp.name?.slice(0,2).toUpperCase()}
            <CompletionRing pct={profileCompletion(emp)} size={54} stroke={3}/>
          </div>
          <div style={{ fontWeight:800,fontSize:14,color:'var(--text)',marginBottom:2 }}>{emp.name}</div>
          <div style={{ fontSize:12,color:'var(--text-muted)',marginBottom:10 }}>{emp.role}</div>
          <div style={{ display:'flex',gap:5,justifyContent:'center',flexWrap:'wrap' }}>
            <span style={{ fontSize:11,fontWeight:700,color:s.c,background:s.bg,border:`1px solid ${s.bc}`,borderRadius:20,padding:'2px 9px' }}>{s.l}</span>
            <span style={{ fontSize:11,fontWeight:700,color:sc,background:sbg,border:`1px solid ${sbc}`,borderRadius:20,padding:'2px 9px' }}>{emp.station_code||'DDB1'}</span>
            {emp.project_type && <span style={{ fontSize:11,fontWeight:700,color:'#7C3AED',background:'var(--purple-bg)',border:'1px solid var(--purple-border)',borderRadius:20,padding:'2px 9px' }}>{emp.project_type.toUpperCase()}</span>}
          </div>
        </div>
      </div>

      {/* Scrollable tab bar */}
      <div className="detail-tabs" style={{ display:'flex', overflowX:'auto', padding:'0 14px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:'9px 12px', fontSize:12, fontWeight:tab===t.id?700:500, color:tab===t.id?'var(--gold)':'var(--text-muted)', background:'none', border:'none', borderBottom:`2px solid ${tab===t.id?'var(--gold)':'transparent'}`, cursor:'pointer', fontFamily:'Poppins,sans-serif', marginBottom:-1, transition:'all 0.15s', whiteSpace:'nowrap', flexShrink:0 }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px' }}>
        {tab==='info' && (
          <>
            {/* 2-column grid of info fields */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              {/* Left column — core work info */}
              <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                <div style={{ fontSize:9.5, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:5, paddingLeft:4 }}>Work Info</div>
                {[
                  {icon:User,      l:'Employee ID', v:emp.id,                                             mono:true  },
                  {icon:Building2, l:'Amazon ID',   v:emp.amazon_id||'—',                                 mono:true  },
                  {icon:Users,     l:'Sub Group',   v:emp.sub_group_name||'—',                            mono:false },
                  {icon:Building2, l:'Work Location',v:emp.work_location||'—',                            mono:false },
                  {icon:Shield,    l:'Salary',      v:`AED ${Number(emp.salary||0).toLocaleString()}/mo`, mono:false },
                ].map(row=>{ const Icon=row.icon; return (
                  <div key={row.l} style={{ display:'flex',alignItems:'center',gap:7,padding:'6px 9px',borderRadius:8,background:'var(--bg-alt)' }}>
                    <Icon size={11} color="var(--text-muted)" style={{ flexShrink:0 }}/>
                    <span style={{ fontSize:11,color:'var(--text-muted)',flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{row.l}</span>
                    <span style={{ fontSize:11.5,color:'var(--text)',fontWeight:600,fontFamily:row.mono?'monospace':'Poppins,sans-serif',maxWidth:130,wordBreak:'break-all',textAlign:'right' }}>{row.v}</span>
                  </div>
                )})}
              </div>

              {/* Right column — personal info */}
              <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                <div style={{ fontSize:9.5, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:5, paddingLeft:4 }}>Personal</div>
                {[
                  {icon:Phone,     l:'Phone',         v:emp.phone||'—',                 mono:false },
                  {icon:CreditCard,l:'Emirates ID',   v:emp.emirates_id||'—',           mono:false },
                  {icon:User,      l:'Nationality',   v:emp.nationality||'—',           mono:false },
                  {icon:Calendar,  l:'Date of Birth', v:emp.dob?.slice(0,10)||'—',      mono:false },
                  {icon:User,      l:'Gender',        v:emp.gender||'—',                mono:false },
                  {icon:User,      l:'Marital Status',v:emp.marital_status||'—',        mono:false },
                ].map(row=>{ const Icon=row.icon; return (
                  <div key={row.l} style={{ display:'flex',alignItems:'center',gap:7,padding:'6px 9px',borderRadius:8,background:'var(--bg-alt)' }}>
                    <Icon size={11} color="var(--text-muted)" style={{ flexShrink:0 }}/>
                    <span style={{ fontSize:11,color:'var(--text-muted)',flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{row.l}</span>
                    <span style={{ fontSize:11.5,color:'var(--text)',fontWeight:600,fontFamily:row.mono?'monospace':'Poppins,sans-serif',maxWidth:130,wordBreak:'break-all',textAlign:'right' }}>{row.v}</span>
                  </div>
                )})}
              </div>
            </div>

            {/* Full-width extra fields (shown only when filled) */}
            {(emp.passport_no||emp.uid_number||emp.visa_file_no||emp.email_id||emp.father_family_name||emp.emirates_issuing_visa||emp.residential_location||(emp.beneficiary_first_name||emp.beneficiary_last_name)) && (
              <div style={{ display:'flex',flexDirection:'column',gap:1,marginBottom:12 }}>
                <div style={{ fontSize:9.5,fontWeight:800,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:5,paddingLeft:4 }}>Documents & Additional</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1 }}>
                  {[
                    ...(emp.passport_no          ?[{icon:CreditCard,l:'Passport No',         v:emp.passport_no,                 mono:true }]:[]),
                    ...(emp.uid_number           ?[{icon:CreditCard,l:'UID Number',           v:emp.uid_number,                  mono:true }]:[]),
                    ...(emp.visa_file_no         ?[{icon:CreditCard,l:'Visa File No',         v:emp.visa_file_no,                mono:true }]:[]),
                    ...(emp.email_id             ?[{icon:User,      l:'Email',                v:emp.email_id,                    mono:false}]:[]),
                    ...(emp.father_family_name   ?[{icon:User,      l:'Father/Family Name',   v:emp.father_family_name,          mono:false}]:[]),
                    ...(emp.emirates_issuing_visa?[{icon:User,      l:'Emirates Issuing Visa',v:emp.emirates_issuing_visa,       mono:false}]:[]),
                    ...(emp.residential_location ?[{icon:User,      l:'Residential',          v:emp.residential_location,        mono:false}]:[]),
                    ...((emp.beneficiary_first_name||emp.beneficiary_last_name)?[{icon:User,  l:'Beneficiary',v:[emp.beneficiary_first_name,emp.beneficiary_middle_name,emp.beneficiary_last_name].filter(Boolean).join(' '),mono:false}]:[]),
                  ].map(row=>{ const Icon=row.icon; return (
                    <div key={row.l} style={{ display:'flex',alignItems:'center',gap:7,padding:'6px 9px',borderRadius:8,background:'var(--bg-alt)' }}>
                      <Icon size={11} color="var(--text-muted)" style={{ flexShrink:0 }}/>
                      <span style={{ fontSize:11,color:'var(--text-muted)',flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{row.l}</span>
                      <span style={{ fontSize:11.5,color:'var(--text)',fontWeight:600,fontFamily:row.mono?'monospace':'Poppins,sans-serif',maxWidth:130,wordBreak:'break-all',textAlign:'right' }}>{row.v}</span>
                    </div>
                  )})}
                </div>
              </div>
            )}

            <div style={{ background:'var(--purple-bg)',border:'1px solid var(--purple-border)',borderRadius:10,padding:'9px 12px',marginBottom:10 }}>
              <div style={{ fontSize:10,fontWeight:700,color:'#7C3AED',letterSpacing:'0.07em',textTransform:'uppercase',marginBottom:4 }}>Salary Formula</div>
              <div style={{ fontSize:11.5,color:'var(--text-sub)',fontWeight:500 }}>
                {emp.project_type==='cret' ? `AED ${emp.salary||0} + shipments × ${emp.per_shipment_rate||0.5}` : `AED ${emp.salary||0} + hrs × ${emp.hourly_rate||3.85} + ${emp.performance_bonus||100}`}
              </div>
            </div>

            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:12 }}>
              {[['Visa',emp.visa_expiry],['License',emp.license_expiry],['ILOE',emp.iloe_expiry]].map(([l,d])=>{
                const info=expiry(d)
                return (
                  <div key={l} style={{ textAlign:'center',padding:'8px 4px',borderRadius:9,background:info?.bg||'var(--bg-alt)',border:`1px solid ${info?.bc||'var(--border)'}` }}>
                    <div style={{ fontSize:10,fontWeight:700,color:info?.c||'var(--text-muted)',marginBottom:2 }}>{l}</div>
                    <div style={{ fontSize:10,color:info?.c||'var(--text-muted)',fontWeight:600 }}>{info?.label||'N/A'}</div>
                  </div>
                )
              })}
            </div>

            {userRole !== 'accountant' && (
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                <button onClick={onEdit} className="btn btn-secondary" style={{ justifyContent:'center',borderRadius:10 }}>
                  <Pencil size={13}/> Edit
                </button>
                <button onClick={onDelete} style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px',borderRadius:10,background:'var(--red-bg)',border:'1px solid var(--red-border)',color:'var(--red)',fontWeight:600,fontSize:12,cursor:'pointer',fontFamily:'Poppins,sans-serif' }}>
                  <Trash2 size={13}/> Delete
                </button>
              </div>
            )}
          </>
        )}

        {tab==='leaves' && (
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:4 }}>
              {[
                {l:'Total',   v:leaves.length,                                    c:'var(--text)',bg:'var(--bg-alt)'},
                {l:'Approved',v:leaves.filter(l=>l.status==='approved').length,   c:'#10B981',   bg:'#F0FDF4'     },
                {l:'Pending', v:leaves.filter(l=>l.status==='pending').length,    c:'#F59E0B',   bg:'#FFFBEB'     },
              ].map(s=>(
                <div key={s.l} style={{ textAlign:'center',padding:'8px 4px',borderRadius:10,background:s.bg,border:'1px solid var(--border)' }}>
                  <div style={{ fontWeight:900,fontSize:18,color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:9.5,color:s.c,fontWeight:600,marginTop:2,opacity:0.8 }}>{s.l}</div>
                </div>
              ))}
            </div>
            {leavesLoad ? <div style={{ textAlign:'center',padding:20,color:'var(--text-muted)',fontSize:12 }}>Loading…</div>
            : leaves.length===0 ? (
              <div style={{ textAlign:'center',padding:20,color:'var(--text-muted)',fontSize:12 }}>
                <Calendar size={28} style={{ margin:'0 auto 8px',display:'block',opacity:0.2 }}/>No leave records
              </div>
            ) : leaves.map((lv)=>{
              const TC={Annual:'#B8860B',Sick:'#2563EB',Emergency:'#EF4444',Unpaid:'#6B7280',Other:'#9CA3AF'}
              const SC2={approved:'#10B981',pending:'#F59E0B',rejected:'#EF4444'}
              const SBG={approved:'#F0FDF4',pending:'#FFFBEB',rejected:'#FEF2F2'}
              const tc=TC[lv.type]||'#9CA3AF', sc2=SC2[lv.status]||'#9CA3AF'
              return (
                <div key={lv.id} style={{ background:'var(--bg-alt)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 12px' }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5 }}>
                    <span style={{ fontSize:11.5,fontWeight:700,color:tc,background:`${tc}12`,borderRadius:6,padding:'2px 8px' }}>{lv.type}</span>
                    <span style={{ fontSize:10.5,fontWeight:700,color:sc2,background:SBG[lv.status],borderRadius:20,padding:'2px 8px' }}>{lv.status}</span>
                  </div>
                  <div style={{ fontSize:12,color:'var(--text)',fontWeight:600,marginBottom:2 }}>
                    {lv.from_date?.slice(0,10)} → {lv.to_date?.slice(0,10)}
                  </div>
                  <div style={{ display:'flex',justifyContent:'space-between' }}>
                    <span style={{ fontSize:11,color:'var(--text-muted)' }}>{lv.days} day{lv.days!==1?'s':''}</span>
                    {lv.reason&&<span style={{ fontSize:10.5,color:'var(--text-sub)',maxWidth:110,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{lv.reason}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab==='sims' && (
          <div>
            <WorkNumberAssigner emp={emp} onSaved={onRefresh} userRole={userRole} onSelectEmployee={onSelectEmployee}/>
            <div style={{ marginTop:10, padding:'10px 12px', background:'var(--bg-alt)', border:'1px solid var(--border)', borderRadius:10 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>Personal Phone</div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', fontFamily:'monospace' }}>{emp.phone||'—'}</div>
            </div>
          </div>
        )}

        {tab==='fleet' && (
          <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
            {fleetLoad ? (
              <div style={{ textAlign:'center',padding:30,color:'var(--text-muted)',fontSize:12 }}>Loading…</div>
            ) : (
              <>
                {/* Current vehicle — last "received" without a subsequent "returned" */}
                {(() => {
                  const cur = fleetHv.find(h =>
                    h.type === 'received' &&
                    !fleetHv.find(h2 =>
                      h2.vehicle_id === h.vehicle_id &&
                      h2.type === 'returned' &&
                      new Date(h2.submitted_at) > new Date(h.submitted_at)
                    )
                  )
                  return cur ? (
                    <div style={{ background:'var(--green-bg)',border:'1px solid #A7F3D0',borderRadius:12,padding:'12px 14px' }}>
                      <div style={{ fontSize:10,fontWeight:700,color:'#10B981',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8 }}>Current Vehicle</div>
                      <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                        <div style={{ width:40,height:40,borderRadius:10,background:'#DCFCE7',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                          <Truck size={19} color="#10B981"/>
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontWeight:800,fontSize:16,color:'var(--text)',fontFamily:'monospace' }}>{cur.plate||'—'}</div>
                          <div style={{ fontSize:11,color:'var(--text-muted)',marginTop:2 }}>
                            Since {new Date(cur.submitted_at).toLocaleDateString('en-AE',{day:'numeric',month:'short',year:'numeric'})}
                          </div>
                        </div>
                        <span style={{ fontSize:10,fontWeight:700,color:'#10B981',background:'#DCFCE7',border:'1px solid #A7F3D0',borderRadius:20,padding:'2px 9px',flexShrink:0 }}>Active</span>
                      </div>
                      {cur.fuel_level && (
                        <div style={{ marginTop:8,fontSize:11,color:'var(--text-sub)' }}>Fuel at receive: {cur.fuel_level}{cur.odometer?` · ODO: ${cur.odometer} km`:''}</div>
                      )}
                    </div>
                  ) : (
                    <div style={{ background:'var(--bg-alt)',border:'1px dashed var(--border)',borderRadius:12,padding:'16px',textAlign:'center' }}>
                      <Truck size={20} color="var(--text-muted)" style={{ margin:'0 auto 6px',display:'block',opacity:0.3 }}/>
                      <div style={{ fontSize:12,color:'var(--text-muted)' }}>No vehicle currently assigned</div>
                    </div>
                  )
                })()}

                {/* Receive / Return log */}
                <div>
                  <div style={{ fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8,display:'flex',alignItems:'center',gap:6 }}>
                    <ArrowLeftRight size={11}/> Receive / Return History
                  </div>
                  {fleetHv.length===0 ? (
                    <div style={{ textAlign:'center',padding:'14px 0',color:'var(--text-muted)',fontSize:12 }}>No handover records</div>
                  ) : (
                    <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                      {fleetHv.map(h=>{
                        const isRecv = h.type==='received'
                        return (
                          <div key={h.id} style={{ padding:'9px 12px',borderRadius:10,background:'var(--bg-alt)',border:`1px solid ${isRecv?'#A7F3D0':'#FECACA'}` }}>
                            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:h.fuel_level||h.odometer||h.condition_note?5:0 }}>
                              <div style={{ display:'flex',alignItems:'center',gap:7 }}>
                                <span style={{ fontSize:10,fontWeight:700,color:isRecv?'#10B981':'#EF4444',background:isRecv?'#F0FDF4':'#FEF2F2',borderRadius:5,padding:'1px 7px',textTransform:'uppercase' }}>
                                  {h.type}
                                </span>
                                <span style={{ fontWeight:700,fontSize:12.5,color:'var(--text)',fontFamily:'monospace' }}>{h.plate||'—'}</span>
                              </div>
                              <span style={{ fontSize:10.5,color:'var(--text-muted)',flexShrink:0 }}>
                                {new Date(h.submitted_at).toLocaleDateString('en-AE',{day:'numeric',month:'short',year:'numeric'})}
                              </span>
                            </div>
                            {(h.fuel_level||h.odometer||h.condition_note) && (
                              <div style={{ display:'flex',gap:12,flexWrap:'wrap',marginTop:4 }}>
                                {h.fuel_level    && <span style={{ fontSize:10.5,color:'var(--text-sub)' }}>Fuel: {h.fuel_level}</span>}
                                {h.odometer      && <span style={{ fontSize:10.5,color:'var(--text-sub)' }}>ODO: {h.odometer} km</span>}
                                {h.condition_note&& <span style={{ fontSize:10.5,color:'var(--text-sub)',flexBasis:'100%',marginTop:2 }}>{h.condition_note}</span>}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* POC assignment history — only shown if records exist */}
                {fleetAsgn.length > 0 && (
                  <div>
                    <div style={{ fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8,display:'flex',alignItems:'center',gap:6 }}>
                      <Truck size={11}/> POC Assignment History
                    </div>
                    <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                      {fleetAsgn.map((a,i)=>(
                        <div key={a.id||i} style={{ padding:'9px 12px',borderRadius:10,background:'var(--bg-alt)',border:'1px solid var(--border)' }}>
                          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                            <div style={{ display:'flex',alignItems:'center',gap:7 }}>
                              <span style={{ fontSize:10,fontWeight:700,color:'#2563EB',background:'#EFF6FF',borderRadius:5,padding:'1px 7px',textTransform:'uppercase' }}>POC</span>
                              <span style={{ fontWeight:700,fontSize:12.5,color:'var(--text)',fontFamily:'monospace' }}>{a.plate||a.vehicle_plate||'—'}</span>
                            </div>
                            <span style={{ fontSize:10.5,color:'var(--text-muted)',flexShrink:0 }}>
                              {a.date ? new Date(a.date).toLocaleDateString('en-AE',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                            </span>
                          </div>
                          {a.assigned_by_name && (
                            <div style={{ fontSize:10.5,color:'var(--text-sub)',marginTop:4 }}>Assigned by: {a.assigned_by_name}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab==='expenses' && (
          <div>
            <a href={`/dashboard/finance/expenses?emp_id=${emp.id}`}
              style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px',borderRadius:10,background:'var(--blue-bg)',border:'1px solid var(--blue-border)',color:'var(--blue)',fontWeight:600,fontSize:12,textDecoration:'none',marginBottom:12 }}>
              <Receipt size={13}/> View All Expenses <ExternalLink size={11}/>
            </a>
            {expLoad ? (
              <div style={{ textAlign:'center',padding:20,color:'var(--text-muted)',fontSize:12 }}>Loading…</div>
            ) : expenses.length===0 ? (
              <div style={{ textAlign:'center',padding:24,color:'var(--text-muted)',fontSize:12 }}>
                <Receipt size={28} style={{ margin:'0 auto 8px',display:'block',opacity:0.2 }}/>No expenses found
              </div>
            ) : expenses.slice(0,20).map(ex=>(
              <div key={ex.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',background:'var(--bg-alt)',border:'1px solid var(--border)',borderRadius:9,marginBottom:5 }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:12,fontWeight:600,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:130 }}>{ex.description||ex.category||'Expense'}</div>
                  <div style={{ fontSize:10.5,color:'var(--text-muted)',marginTop:1 }}>{ex.date?.slice(0,10)}</div>
                </div>
                <span style={{ fontSize:12,fontWeight:700,color:'#EF4444',flexShrink:0 }}>AED {Number(ex.amount||0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Employee Card ───────────────────────────────────────────── */
function EmpCard({ emp, onClick, onEdit, onDelete, index, isSelected, userRole }) {
  const s   = STATUS[emp.status]||STATUS.inactive
  const sc  = SC_COLOR[emp.station_code]||'#B8860B'
  const sbg = SC_BG[emp.station_code]||'#FFFBEB'
  const sbc = SC_BORDER[emp.station_code]||'#FDE68A'
  const exp = expiry(emp.visa_expiry)
  const hasAlert = exp && (exp.label==='Expired'||parseInt(exp.label)<=60)

  return (
    <div onClick={onClick}
      style={{ background:'var(--card)', border:`1px solid ${isSelected?sc:hasAlert?'var(--red-border)':'var(--border)'}`, borderRadius:14, padding:'14px 16px', cursor:'pointer', transition:'all 0.18s', boxShadow:isSelected?`0 0 0 3px ${sc}20`:'none', position:'relative', overflow:'hidden' }}
      onMouseEnter={e=>{if(!isSelected){e.currentTarget.style.boxShadow='var(--shadow-md)';e.currentTarget.style.borderColor=hasAlert?'var(--red)':sc+'66'}}}
      onMouseLeave={e=>{if(!isSelected){e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor=hasAlert?'var(--red-border)':'var(--border)'}}}>

      {hasAlert && <div style={{ position:'absolute',top:12,right:12,width:7,height:7,borderRadius:'50%',background:'var(--red)',boxShadow:'0 0 0 3px rgba(239,68,68,0.2)',animation:'pulse-dot 2s infinite'}}/>}

      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        {/* Avatar */}
        <div style={{ width:44,height:44,borderRadius:13,background:`linear-gradient(135deg,${sbg},var(--card))`,border:`1.5px solid ${sbc}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:900,color:sc,flexShrink:0,position:'relative' }}>
          {emp.name?.slice(0,2).toUpperCase()}
          <CompletionRing pct={profileCompletion(emp)} size={44} stroke={3}/>
          <div style={{ position:'absolute',bottom:-1,right:-1,width:11,height:11,borderRadius:'50%',background:s.dot,border:'2px solid var(--card)' }}/>
        </div>

        {/* Main info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700,fontSize:13.5,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{emp.name}</div>
          <div style={{ fontSize:11,color:'var(--text-muted)',marginTop:2,display:'flex',gap:5,alignItems:'center' }}>
            <span style={{ fontFamily:'monospace' }}>{emp.id}</span>
            {emp.work_number&&<><span>·</span><span style={{ color:'var(--text-sub)' }}>{emp.work_number}</span></>}
          </div>
        </div>

        {/* Right badges */}
        <div style={{ display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4,flexShrink:0 }}>
          <span style={{ fontSize:11,fontWeight:700,color:sc,background:sbg,border:`1px solid ${sbc}`,borderRadius:7,padding:'2px 8px' }}>{emp.station_code||'DDB1'}</span>
          {emp.project_type&&<span style={{ fontSize:10,fontWeight:600,color:'#7C3AED',background:'var(--purple-bg)',borderRadius:5,padding:'1px 6px' }}>{emp.project_type.toUpperCase()}</span>}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display:'flex',gap:8,marginTop:11,paddingTop:11,borderTop:'1px solid var(--border)',alignItems:'center',flexWrap:'wrap' }}>
        <span style={{ flex:1,fontSize:11,fontWeight:600,color:s.c,display:'flex',alignItems:'center',gap:4 }}>
          <span style={{ width:6,height:6,borderRadius:'50%',background:s.dot,display:'inline-block' }}/>{s.l}
        </span>
        {emp.phone&&<span style={{ fontSize:11,color:'var(--text-sub)',display:'flex',alignItems:'center',gap:3 }}><Phone size={10}/>{emp.phone}</span>}
        {userRole !== 'accountant' && <>
          <button onClick={e=>{e.stopPropagation();onEdit(emp)}}
            style={{ padding:'4px 10px',borderRadius:7,background:'var(--bg-alt)',border:'1px solid var(--border)',cursor:'pointer',fontSize:11,color:'var(--text-sub)',fontWeight:600,display:'flex',alignItems:'center',gap:4,fontFamily:'Poppins,sans-serif' }}>
            <Pencil size={11}/> Edit
          </button>
          <button onClick={e=>{e.stopPropagation();onDelete(emp)}}
            style={{ padding:'4px 8px',borderRadius:7,background:'var(--red-bg)',border:'1px solid var(--red-border)',cursor:'pointer',color:'var(--red)',display:'flex',alignItems:'center',fontFamily:'Poppins,sans-serif' }}>
            <Trash2 size={11}/>
          </button>
        </>}
      </div>
    </div>
  )
}

/* ══ MAIN PAGE ═══════════════════════════════════════════════ */
export default function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [station,   setStation]   = useState('All')
  const [selected,  setSelected]  = useState(null)
  const [modal,     setModal]     = useState(null)
  const [userRole,  setUserRole]  = useState(null)
  const [isMobile,  setIsMobile]  = useState(false)
  const [page,      setPage]      = useState(1)
  const PAGE_SIZE = 20

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    try { const t=localStorage.getItem('gcd_token'); if(t){const p=JSON.parse(atob(t.split('.')[1]));setUserRole(p.role)} } catch(e){}
  }, [])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const params = {}
      if (search)          params.search       = search
      if (station!=='All') params.station_code = station
      const data = await empApi.list(params)
      setEmployees((data.employees||[]).filter(e => (e.role||'').toLowerCase() === 'driver'))
      setSelected(s => s ? (data.employees.find(e => e.id === s.id) || s) : null)
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [search, station])

  useEffect(() => { setPage(1) }, [search, station])
  useEffect(() => { const t=setTimeout(load,300); return()=>clearTimeout(t) }, [load])

  useSocket({
    'employee:created': e      => setEmployees(p=>[...p,e]),
    'employee:updated': e      => { setEmployees(p=>p.map(x=>x.id===e.id?e:x)); setSelected(s=>s?.id===e.id?e:s) },
    'employee:deleted': ({id}) => { setEmployees(p=>p.filter(x=>x.id!==id)); setSelected(s=>s?.id===id?null:s) },
  })

  async function handleDelete(emp) {
    if (!confirm(`Delete ${emp.name}? This cannot be undone.`)) return
    try { await empApi.delete(emp.id); setEmployees(p=>p.filter(e=>e.id!==emp.id)); if(selected?.id===emp.id) setSelected(null) }
    catch(e) { alert(e.message) }
  }

  const total      = employees.length
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const paginated  = employees.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)

  const active  = employees.filter(e=>e.status==='active').length
  const onLeave = employees.filter(e=>e.status==='on_leave').length
  const alerts  = employees.filter(e=>{ const v=expiry(e.visa_expiry); return v&&(v.label==='Expired'||parseInt(v.label)<=60) }).length

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Main column */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

        {/* Action bar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <p style={{ fontSize:12.5, color:'var(--text-muted)' }}>{total} DAs · {active} active</p>
          {userRole !== 'accountant' && (
            <button className="btn btn-primary" onClick={()=>setModal({mode:'add',emp:null})} style={{ borderRadius:24, flexShrink:0 }}>
              <Plus size={14}/> Add DA
            </button>
          )}
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)', gap:10 }}>
          {[
            {l:'Total',   v:total,   c:'var(--text)', bg:'var(--bg-alt)',     bc:'var(--border)',       icon:Users        },
            {l:'Active',  v:active,  c:'#10B981',    bg:'#F0FDF4',           bc:'#A7F3D0',             icon:CheckCircle2 },
            {l:'On Leave',v:onLeave, c:'#F59E0B',    bg:'#FFFBEB',           bc:'#FDE68A',             icon:Calendar      },
            {l:'Alerts',  v:alerts,  c:'#EF4444',    bg:'var(--red-bg)',     bc:'var(--red-border)',   icon:AlertCircle  },
          ].map((s,i)=>{
            const Icon=s.icon
            return (
              <div key={s.l} style={{ background:s.bg, border:`1px solid ${s.bc}`, borderRadius:13, padding:'14px 12px', textAlign:'center', transition:'all 0.2s' }}>
                <Icon size={20} color={s.c} style={{ margin:'0 auto 8px', display:'block' }}/>
                <div style={{ fontWeight:900, fontSize:22, color:s.c, letterSpacing:'-0.04em', lineHeight:1 }}>{s.v}</div>
                <div style={{ fontSize:10.5, color:s.c, fontWeight:600, marginTop:4, opacity:0.8 }}>{s.l}</div>
              </div>
            )
          })}
        </div>

        {/* Search + filter */}
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ flex:'1 1 200px', position:'relative' }}>
            <Search size={14} style={{ position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',pointerEvents:'none' }}/>
            <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, ID, work number…" autoComplete="off" style={{ paddingLeft:38, borderRadius:24 }}/>
            {search&&<button onClick={()=>setSearch('')} style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:0,display:'flex' }}><X size={13}/></button>}
          </div>
          <div style={{ display:'flex', gap:5 }}>
            {STATIONS.map(s=>{
              const col=SC_COLOR[s]||'var(--text-sub)', isOn=station===s
              return (
                <button key={s} onClick={()=>setStation(s)}
                  style={{ padding:'7px 14px',borderRadius:20,fontSize:12,fontWeight:isOn?700:500,cursor:'pointer',border:`1.5px solid ${isOn?col:'var(--border)'}`,background:isOn?(SC_BG[s]||'var(--amber-bg)'):'var(--card)',color:isOn?col:'var(--text-muted)',transition:'all 0.15s',whiteSpace:'nowrap' }}>
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
            {[1,2,3,4].map(i=><div key={i} className="sk" style={{ height:86, borderRadius:14 }}/>)}
          </div>
        ) : employees.length===0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <Search size={40} style={{ margin:'0 auto 12px', display:'block', opacity:0.15 }}/>
            <div style={{ fontWeight:700, fontSize:15, color:'var(--text-sub)' }}>{search?`No results for "${search}"`:'No DAs found'}</div>
          </div>
        ) : (
          <>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {paginated.map((emp,i)=>(
                <EmpCard key={emp.id} emp={emp} index={i}
                  isSelected={selected?.id===emp.id}
                  onClick={()=>setSelected(selected?.id===emp.id?null:emp)}
                  onEdit={e=>setModal({mode:'edit',emp:e})}
                  onDelete={handleDelete}
                  userRole={userRole}/>
              ))}
            </div>
            {totalPages > 1 && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, paddingTop:8 }}>
                <button className="btn btn-secondary btn-sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>‹ Prev</button>
                <span style={{ fontSize:12.5, color:'var(--text-muted)' }}>Page {page} of {totalPages}</span>
                <button className="btn btn-secondary btn-sm" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Next ›</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail popup */}
      {selected && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setSelected(null)}>
          <div style={{ background:'var(--card)', borderRadius:20, width:'100%', maxWidth:820, height:'92vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'var(--shadow-lg)', border:'1px solid var(--border)' }}>
            <DetailDrawer emp={selected} onEdit={()=>setModal({mode:'edit',emp:selected})} onDelete={()=>handleDelete(selected)} onClose={()=>setSelected(null)} onRefresh={load} userRole={userRole}
              onSelectEmployee={id=>{ const t=employees.find(e=>e.id===id); if(t) setSelected(t) }}/>
          </div>
        </div>
      )}

      {modal && <EmpModal mode={modal.mode} emp={modal.emp} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
    </div>
  )
}