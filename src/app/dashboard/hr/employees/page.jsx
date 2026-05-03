'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { empApi } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import {
  Search, Plus, X, Pencil, Trash2, Phone, User, Building2,
  AlertCircle, CheckCircle2, Briefcase, CreditCard, Calendar,
  Users, Receipt, ExternalLink, Shield, ChevronRight, Truck, ArrowLeftRight,
  Mail, MapPin, Clock
} from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'

import { API } from '@/lib/api'
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
  visa_type:'company',
  project_type:'pulser', per_shipment_rate:'0.5', performance_bonus:'100',
  login_email:'', login_password:'',
  // Extended personal / WPS fields
  sub_group_name:'', beneficiary_first_name:'', beneficiary_middle_name:'',
  beneficiary_last_name:'', father_family_name:'', dob:'', gender:'',
  marital_status:'', uid_number:'', emirates_issuing_visa:'',
  residential_location:'', work_location:'', passport_no:'', email_id:'', visa_file_no:'',
  insurance_url:''
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
  'residential_location','work_location',
  'emirates_issuing_visa','visa_expiry','license_expiry','amazon_id',
  'sub_group_name',
]
const COMPLETION_LABELS = {
  phone:'Phone', emirates_id:'Emirates ID', nationality:'Nationality',
  dob:'Date of Birth', gender:'Gender', marital_status:'Marital Status',
  passport_no:'Passport No', uid_number:'UID Number', visa_file_no:'Visa File No',
  email_id:'Email', father_family_name:'Father/Family Name',
  residential_location:'Residential Location',
  work_location:'Work Location', emirates_issuing_visa:'Emirates Issuing Visa',
  visa_expiry:'Visa Expiry', license_expiry:'License Expiry',
  amazon_id:'Amazon ID', sub_group_name:'Sub Group',
}
function profileCompletion(emp) {
  if (!emp) return 0
  const filled = COMPLETION_FIELDS.filter(f => emp[f] && String(emp[f]).trim() !== '').length
  const hasSalary = Number(emp.salary||0) > 0 ? 1 : 0
  return Math.round(((filled + hasSalary) / (COMPLETION_FIELDS.length + 1)) * 100)
}
function missingFields(emp) {
  if (!emp) return []
  const missing = COMPLETION_FIELDS.filter(f => !emp[f] || String(emp[f]).trim() === '').map(f => COMPLETION_LABELS[f]||f)
  if (!Number(emp.salary||0)) missing.unshift('Salary')
  return missing
}

/* ── Completion Ring (SVG) ───────────────────────────────────── */
function CompletionRing({ pct, size=54, stroke=3 }) {
  const r   = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = pct === 100 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'
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
    visa_type:            emp.visa_type||'company',
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
    insurance_url:            emp.insurance_url||'',
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
      const safeDate = v => (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) ? v : null
      const data = {
        ...form,
        salary:             Number(form.salary)||0,
        hourly_rate:        Number(form.hourly_rate)||3.85,
        per_shipment_rate:  Number(form.per_shipment_rate)||0.5,
        performance_bonus:  Number(form.performance_bonus)||100,
        annual_leave_balance: Number(form.annual_leave_balance)||30,
        dob:                safeDate(form.dob),
        joined:             safeDate(form.joined),
        visa_expiry:        safeDate(form.visa_expiry),
        license_expiry:     safeDate(form.license_expiry),
        iloe_expiry:        safeDate(form.iloe_expiry),
        annual_leave_start: safeDate(form.annual_leave_start),
      }
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
    if (form.project_type==='office') return `AED ${base} (fixed salary)`
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
            <div className="modal-two-col">
              {mode==='add' && inp('Employee ID *','id','text','DA001')}
              {inp('Full Name *','name','text','Mohammed Al Rashid')}
              {inp('Phone Number','phone','tel','+971 50 XXX XXXX')}
              {inp('Work Number','work_number','text','Internal contact')}
              {inp('Amazon / Transporter ID','amazon_id','text','TRS-00123')}
              {inp('Emirates ID','emirates_id','text','784-XXXX-XXXXXXX-X')}
              {inp('Nationality','nationality','text','UAE')}
              <div style={{ gridColumn:'span 2' }}>
                <Lbl>Visa Type</Lbl>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    { v:'company', l:'Company Visa',  d:'Sponsored by Golden Crescent' },
                    { v:'own',     l:'Own Visa',       d:"Employee's own sponsorship"  },
                  ].map(opt => (
                    <button key={opt.v} type="button" onClick={() => set('visa_type', opt.v)}
                      style={{ padding:'12px', borderRadius:11, border:`2px solid ${form.visa_type===opt.v?'var(--gold)':'var(--border)'}`, background:form.visa_type===opt.v?'var(--amber-bg)':'var(--card)', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
                      <div style={{ fontWeight:700, fontSize:13, color:form.visa_type===opt.v?'var(--gold)':'var(--text)' }}>{opt.l}</div>
                      <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:2 }}>{opt.d}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab==='personal' && (
            <div className="modal-two-col">
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
            </div>
          )}

          {tab==='work' && (
            <div className="modal-two-col">
              {sel('Role *','role',['Driver','HR Manager','Finance Mgr','Accountant','Dispatcher','General Manager','Admin','POC','Other'])}
              {sel('Department *','dept',['Operations','HR','Finance','Admin','Other'])}
              {sel('Station','station_code',['DDB1','DXE6'])}
              {sel('Status','status',[{v:'active',l:'Active'},{v:'on_leave',l:'On Leave'},{v:'inactive',l:'Inactive'}])}
              <div style={{ gridColumn:'span 2' }}>
                <div style={{ background:'var(--purple-bg)', border:'1px solid var(--purple-border)', borderRadius:12, padding:'14px 16px' }}>
                  <label style={{ fontSize:11, fontWeight:800, letterSpacing:'0.06em', textTransform:'uppercase', color:'#7C3AED', marginBottom:10, display:'block' }}>Project & Salary Type</label>
                  <div className="modal-proj-col" style={{ marginBottom:12 }}>
                    {[{v:'pulser',l:'Pulser',d:'Base + Hours × Rate + Bonus'},{v:'cret',l:'CRET',d:'Base + Shipments × Rate'},{v:'office',l:'Office',d:'Fixed Base Salary'}].map(p=>(
                      <button key={p.v} onClick={e=>{e.stopPropagation();set('project_type',p.v)}} type="button"
                        style={{ padding:'11px', borderRadius:10, border:`2px solid ${form.project_type===p.v?'#7C3AED':'var(--border)'}`, background:form.project_type===p.v?'var(--purple-bg)':'var(--card)', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
                        <div style={{ fontWeight:700, fontSize:13, color:form.project_type===p.v?'#7C3AED':'var(--text)' }}>{p.l}</div>
                        <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:2 }}>{p.d}</div>
                      </button>
                    ))}
                  </div>
                  <div className="modal-proj-col">
                    {inp('Base Salary (AED)','salary','number','3800')}
                    {form.project_type==='pulser' && inp('Hourly Rate','hourly_rate','number','3.85')}
                    {form.project_type==='cret' && inp('Per Shipment Rate','per_shipment_rate','number','0.5')}
                    {form.project_type==='pulser' && inp('Performance Bonus','performance_bonus','number','100')}
                  </div>
                  <div style={{ marginTop:10, background:form.project_type==='office'?'var(--amber-bg)':form.project_type==='pulser'?'var(--green-bg)':'var(--blue-bg)', borderRadius:9, padding:'8px 12px', fontSize:12, color:form.project_type==='office'?'#92400E':form.project_type==='pulser'?'var(--green)':'var(--blue)', fontWeight:600 }}>
                    Formula: {previewSalary()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab==='docs' && (
            <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
              <div className="modal-two-col">
                {inp('Visa Expiry','visa_expiry','date')}
                {inp('License Expiry','license_expiry','date')}
                {inp('ILOE Expiry','iloe_expiry','date')}
              </div>
              <div>
                <Lbl>Insurance Card (Google Drive URL)</Lbl>
                <input className="input" type="url" value={form.insurance_url||''} autoComplete="off" spellCheck={false}
                  placeholder="https://drive.google.com/file/d/…/view"
                  onChange={e=>set('insurance_url',e.target.value)}/>
                <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:5 }}>
                  Paste the Google Drive sharing link. The DA will see their insurance card in the portal.
                </div>
              </div>
            </div>
          )}

          {tab==='login' && mode==='add' && (
            <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
              <div style={{ background:'var(--amber-bg)', border:'1px solid var(--amber-border)', borderRadius:10, padding:'12px 14px', fontSize:12.5, color:'#92400E' }}>
                <strong>Optional:</strong> Creates a driver portal login for this DA.
              </div>
              <div className="modal-two-col">
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
          <span style={{ fontSize:13, fontWeight:700, color:emp.work_number?'var(--text)':'var(--text-muted)', fontFamily:'inherit' }}>
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
                  <span style={{ fontSize:13, fontWeight:700, fontFamily:'inherit', color:'var(--text)' }}>{s.phone_number}</span>
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
                    <span style={{ fontSize:11, fontFamily:'inherit', color:'var(--text)' }}>{h.phone_number}</span>
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
  const [fleetAsgn,   setFleetAsgn]  = useState([])
  const [fleetHv,     setFleetHv]    = useState([])
  const [fleetLoad,   setFleetLoad]  = useState(false)
  const [attendance,  setAttendance] = useState([])
  const [attLoad,     setAttLoad]    = useState(false)
  const [notes,       setNotes]      = useState([])
  const [tab,         setTab]        = useState('overview')
  const [isMobile,    setIsMobile]   = useState(false)

  const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('gcd_token')}` })

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    setLeavesLoad(true)
    fetch(`${API}/api/leaves?emp_id=${emp.id}&stage=all`, { headers: auth() })
      .then(r => r.json()).then(d => setLeaves(d.leaves || [])).catch(() => setLeaves([])).finally(() => setLeavesLoad(false))
  }, [emp.id])

  useEffect(() => {
    setAttLoad(true)
    const month = new Date().toISOString().slice(0, 7)
    fetch(`${API}/api/attendance?emp_id=${emp.id}&month=${month}`, { headers: auth() })
      .then(r => r.json()).then(d => setAttendance(d.records || d.attendance || [])).catch(() => setAttendance([])).finally(() => setAttLoad(false))
  }, [emp.id])

  useEffect(() => {
    fetch(`${API}/api/employees/${emp.id}/notes`, { headers: auth() })
      .then(r => r.json()).then(d => setNotes(d.notes || [])).catch(() => setNotes([]))
  }, [emp.id])

  useEffect(() => {
    if (tab !== 'expenses') return
    setExpLoad(true)
    fetch(`${API}/api/expenses?emp_id=${emp.id}`, { headers: auth() })
      .then(r => r.json()).then(d => setExpenses(d.expenses || [])).catch(() => setExpenses([])).finally(() => setExpLoad(false))
  }, [tab, emp.id])

  useEffect(() => {
    if (tab !== 'fleet') return
    setFleetLoad(true)
    Promise.all([
      fetch(`${API}/api/handovers?emp_id=${emp.id}`, { headers: auth() }).then(r => r.json()).catch(() => ({ handovers: [] })),
      fetch(`${API}/api/vehicles/assignments/history?emp_id=${emp.id}`, { headers: auth() }).then(r => r.json()).catch(() => ({ history: [] })),
    ]).then(([hv, asgn]) => { setFleetHv(hv.handovers || []); setFleetAsgn(asgn.history || []) }).finally(() => setFleetLoad(false))
  }, [tab, emp.id])

  // ── Computed values ─────────────────────────────────────────
  const s          = STATUS[emp.status] || STATUS.inactive
  const sc         = SC_COLOR[emp.station_code]  || '#B8860B'
  const sbg        = SC_BG[emp.station_code]     || '#FFFBEB'
  const sbc        = SC_BORDER[emp.station_code] || '#FDE68A'
  const pct        = profileCompletion(emp)
  const missing    = missingFields(emp)
  const ringColor  = pct === 100 ? '#10B981' : pct >= 60 ? '#F59E0B' : '#EF4444'
  const serviceDays = emp.joined ? differenceInDays(new Date(), parseISO(emp.joined.slice(0,10))) : 0
  const today       = new Date().toISOString().slice(0, 10)
  const onLeaveNow  = leaves.filter(l => l.status === 'approved' && l.from_date <= today && l.to_date >= today).length
  const alertDocs   = [emp.visa_expiry, emp.license_expiry, emp.iloe_expiry].filter(d => { if (!d) return false; const i = expiry(d); return i && (i.label === 'Expired' || parseInt(i.label) <= 30) }).length
  const usedByType  = type => leaves.filter(l => l.type === type && l.status === 'approved').reduce((s, l) => s + (l.days || 0), 0)
  const curVehicle  = fleetHv.find(h => h.type === 'received' && !fleetHv.find(h2 => h2.vehicle_id === h.vehicle_id && h2.type === 'returned' && new Date(h2.submitted_at) > new Date(h.submitted_at)))
  const thisMonth   = new Date().toISOString().slice(0, 7)
  const monthExp    = expenses.filter(e => e.date?.slice(0, 7) === thisMonth)
  const totalMonthExp    = monthExp.reduce((s, e) => s + Number(e.amount || 0), 0)
  const pendingMonthExp  = monthExp.filter(e => e.status === 'pending').length
  const approvedMonthExp = monthExp.filter(e => e.status === 'approved').reduce((s, e) => s + Number(e.amount || 0), 0)

  const TABS = [
    { id: 'overview',   l: 'Overview'    },
    { id: 'personal',   l: 'Personal Info'},
    { id: 'employment', l: 'Employment'  },
    { id: 'documents',  l: 'Documents'   },
    { id: 'attendance', l: 'Attendance'  },
    { id: 'leaves',     l: `Leaves${leaves.length > 0 ? ` (${leaves.length})` : ''}` },
    { id: 'sims',       l: 'SIMs'        },
    { id: 'fleet',      l: 'Fleet'       },
    { id: 'expenses',   l: 'Expenses'    },
    { id: 'tasks',      l: 'Tasks'       },
    { id: 'history',    l: 'History'     },
  ]

  // ── Shared sub-components ────────────────────────────────────
  function InfoRow({ label, value }) {
    const v = typeof value === 'object' && value !== null ? JSON.stringify(value) : value
    return (
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'7px 0', borderBottom:'1px solid var(--border)', gap:8 }}>
        <span style={{ fontSize:11.5, color:'var(--text-muted)', flexShrink:0 }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:600, color: v ? 'var(--text)' : 'var(--text-muted)', textAlign:'right', wordBreak:'break-word' }}>{v || '—'}</span>
      </div>
    )
  }
  function SectionBox({ title, badge, badgeColor='#10B981', children, onViewAll, viewAllHref }) {
    return (
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 14px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ fontSize:12, fontWeight:800, color:'var(--text)' }}>{title}</span>
            {badge && <span style={{ fontSize:9.5, fontWeight:700, color:badgeColor, background:`${badgeColor}15`, border:`1px solid ${badgeColor}30`, borderRadius:20, padding:'1px 7px' }}>{badge}</span>}
          </div>
          {(onViewAll || viewAllHref) && (
            viewAllHref
              ? <a href={viewAllHref} style={{ fontSize:11, fontWeight:600, color:'var(--gold)', textDecoration:'none', display:'flex', alignItems:'center', gap:2 }}>View All <ChevronRight size={10}/></a>
              : <button onClick={onViewAll} style={{ fontSize:11, fontWeight:600, color:'var(--gold)', background:'none', border:'none', cursor:'pointer', padding:0, display:'flex', alignItems:'center', gap:2, fontFamily:'Poppins,sans-serif' }}>View All <ChevronRight size={10}/></button>
          )}
        </div>
        <div style={{ padding:'4px 14px 10px' }}>{children}</div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div style={{ background:`linear-gradient(120deg,${sbg} 0%,var(--card) 60%)`, padding:'18px 22px 0', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:14 }}>
          {/* Avatar */}
          <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{ width:60, height:60, borderRadius:30, background:`linear-gradient(135deg,${sbg},${sbc})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, color:sc, boxShadow:`0 4px 14px ${sc}28` }}>
              {emp.name?.slice(0,2).toUpperCase()}
            </div>
            <CompletionRing pct={pct} size={60} stroke={3}/>
            <div style={{ position:'absolute', bottom:2, right:2, width:12, height:12, borderRadius:'50%', background:s.dot, border:'2.5px solid var(--card)' }}/>
          </div>

          {/* Name + badges */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap', marginBottom:3 }}>
              <h2 style={{ margin:0, fontSize:17, fontWeight:900, color:'var(--text)', letterSpacing:'-0.03em' }}>{emp.name}</h2>
              <span style={{ fontSize:10.5, fontWeight:700, color:s.c, background:s.bg, border:`1.5px solid ${s.bc}`, borderRadius:20, padding:'2px 8px' }}>{s.l}</span>
            </div>
            <div style={{ fontSize:11.5, color:'var(--text-muted)', marginBottom:7 }}>{emp.role}</div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              <span style={{ fontSize:10.5, fontWeight:700, color:sc, background:sbg, border:`1.5px solid ${sbc}`, borderRadius:20, padding:'2px 8px' }}>{emp.station_code||'DDB1'}</span>
              {emp.project_type && <span style={{ fontSize:10.5, fontWeight:700, color:'#7C3AED', background:'var(--purple-bg)', border:'1.5px solid var(--purple-border)', borderRadius:20, padding:'2px 8px' }}>{emp.project_type.toUpperCase()}</span>}
              {emp.visa_type && <span style={{ fontSize:10.5, fontWeight:600, color:emp.visa_type==='own'?'#0369A1':'#065F46', background:emp.visa_type==='own'?'#EFF6FF':'#ECFDF5', border:`1.5px solid ${emp.visa_type==='own'?'#BAE6FD':'#A7F3D0'}`, borderRadius:20, padding:'2px 8px' }}>{emp.visa_type==='own'?'Own Visa':'Co. Visa'}</span>}
            </div>
            <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:5 }}>DA ID: {emp.id}</div>
          </div>

          {/* Completion + close */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5, flexShrink:0 }}>
            <button onClick={onClose} className="btn-close"><X size={14}/></button>
            <div style={{ textAlign:'right' }}>
              <span style={{ fontSize:20, fontWeight:900, color:ringColor, letterSpacing:'-0.04em' }}>{pct}%</span>
              <span style={{ fontSize:9.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginLeft:4 }}>COMPLETE</span>
            </div>
            <div style={{ width:110, height:4, borderRadius:99, background:'var(--border)' }}>
              <div style={{ height:'100%', borderRadius:99, background:ringColor, width:`${pct}%`, transition:'width 0.5s' }}/>
            </div>
            {pct < 100 && missing.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:3, justifyContent:'flex-end', maxWidth:150 }}>
                {missing.slice(0,3).map(f=>(
                  <span key={f} style={{ fontSize:9.5, fontWeight:600, color:'#EF4444', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:5, padding:'1px 5px' }}>{f}</span>
                ))}
                {missing.length>3 && <span style={{ fontSize:9.5, color:'var(--text-muted)' }}>+{missing.length-3}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${isMobile?2:4},1fr)`, gap:1, background:'var(--border)', borderRadius:'10px 10px 0 0', overflow:'hidden' }}>
          {[
            { l:'Active Status',  v:s.l,                  sub:`Since ${emp.joined?.slice(0,10)||'—'}`,    c:s.c,                  bg:s.bg                                                      },
            { l:'Total Service',  v:`${serviceDays} Days`, sub:`Join Date: ${emp.joined?.slice(0,10)||'—'}`,c:'var(--blue)',        bg:'var(--blue-bg)'                                          },
            { l:'On Leave',       v:`${onLeaveNow} Days`,  sub:onLeaveNow>0?'Currently on leave':'—',      c:onLeaveNow>0?'#F59E0B':'var(--text-muted)', bg:onLeaveNow>0?'#FFFBEB':'var(--bg-alt)' },
            { l:'Alerts',         v:alertDocs,             sub:alertDocs>0?'Documents expiring':'No active alerts', c:alertDocs>0?'#EF4444':'var(--text-muted)', bg:alertDocs>0?'#FEF2F2':'var(--bg-alt)' },
          ].map(stat=>(
            <div key={stat.l} style={{ padding:'10px 12px', background:stat.bg, textAlign:'center' }}>
              <div style={{ fontWeight:900, fontSize:14, color:stat.c, letterSpacing:'-0.02em' }}>{stat.v}</div>
              <div style={{ fontSize:9.5, fontWeight:700, color:'var(--text-muted)', marginTop:1 }}>{stat.l}</div>
              <div style={{ fontSize:9.5, color:stat.c, opacity:0.7, marginTop:1 }}>{stat.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TABS ───────────────────────────────────────────────── */}
      <div className="slider-track" style={{ display:'flex', overflowX:'auto', padding:'0 18px', borderBottom:'1px solid var(--border)', flexShrink:0, background:'var(--bg-alt)', scrollbarWidth:'none' }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:'10px 13px', fontSize:11.5, fontWeight:tab===t.id?700:500, color:tab===t.id?'var(--gold)':'var(--text-muted)', background:'none', border:'none', borderBottom:`2.5px solid ${tab===t.id?'var(--gold)':'transparent'}`, cursor:'pointer', fontFamily:'Poppins,sans-serif', marginBottom:-1, transition:'all 0.15s', whiteSpace:'nowrap', flexShrink:0 }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── CONTENT ────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:'auto', padding:'18px 20px' }}>

        {/* ══════════ OVERVIEW ═══════════════════════════════ */}
        {tab==='overview' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Top 3 info cards */}
            <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'repeat(3,1fr)', gap:12 }}>

              {/* Contact Information — dark card */}
              <div style={{ background:'#1C1917', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'14px 16px' }}>
                <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em', color:'#78716C', marginBottom:12 }}>Contact Information</div>
                {[
                  { Icon:Phone,  label:'Phone',             value:emp.phone },
                  { Icon:Mail,   label:'Email',             value:emp.email_id },
                  { Icon:Users,  label:'Emergency Contact', value:emp.emergency_contact_name },
                  { Icon:MapPin, label:'Address',           value:emp.residential_location },
                ].filter(r=>r.value).map(row=>(
                  <div key={row.label} style={{ display:'flex', gap:10, marginBottom:10 }}>
                    <div style={{ width:26, height:26, borderRadius:8, background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <row.Icon size={11} color="#A8A29E"/>
                    </div>
                    <div>
                      <div style={{ fontSize:9.5, color:'#78716C', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{row.label}</div>
                      <div style={{ fontSize:11.5, color:'#F5F5F4', fontWeight:500, marginTop:1, wordBreak:'break-word' }}>{row.value}</div>
                    </div>
                  </div>
                ))}
                {!emp.phone && !emp.email_id && !emp.residential_location && (
                  <div style={{ fontSize:11.5, color:'#78716C', textAlign:'center', padding:'12px 0' }}>No contact details</div>
                )}
              </div>

              {/* Personal Information */}
              <SectionBox title="Personal Information" badge={pct>=80?'Verified':null} badgeColor="#10B981">
                {[
                  { l:'Marital Status',  v:emp.marital_status },
                  { l:'Date of Birth',   v:emp.dob ? `${emp.dob.slice(0,10)} (${Math.floor(differenceInDays(new Date(),parseISO(emp.dob.slice(0,10)))/365)} Yrs)` : null },
                  { l:'Father / Family', v:emp.father_family_name },
                  { l:'Gender',          v:emp.gender },
                  { l:'Nationality',     v:emp.nationality },
                ].map(r=><InfoRow key={r.l} label={r.l} value={r.v}/>)}
              </SectionBox>

              {/* Work & Access */}
              <SectionBox title="Work & Access Information" badge={emp.status==='active'?'+ Active':null} badgeColor="#10B981">
                {[
                  { l:'DA Type / Category',  v:emp.station_code },
                  { l:'Device / App Access', v:emp.project_type?.toUpperCase() },
                  { l:'Visa Type',           v:emp.visa_type==='own'?'Own Visa':'Co. Visa' },
                  { l:'Employee ID',         v:emp.id },
                  { l:'Punch ID',            v:emp.punch_id },
                  { l:'System Access',       v:'Enabled' },
                ].map(r=><InfoRow key={r.l} label={r.l} value={r.v}/>)}
              </SectionBox>
            </div>

            {/* Middle 3 cards */}
            <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'repeat(3,1fr)', gap:12 }}>

              {/* Employment */}
              <SectionBox title="Employment Information">
                {[
                  { l:'Designation',       v:emp.role },
                  { l:'Employment Type',   v:emp.employment_type||'Full Time' },
                  { l:'Department',        v:emp.dept },
                  { l:'Reporting To',      v:emp.reporting_to||'Operations Manager' },
                  { l:'Work Location',     v:emp.work_location },
                  { l:'Probation End',     v:emp.probation_end_date?.slice(0,10) },
                ].map(r=><InfoRow key={r.l} label={r.l} value={r.v}/>)}
              </SectionBox>

              {/* Salary */}
              <SectionBox title="Salary Information">
                {[
                  { l:'Salary',           v:`AED ${Number(emp.salary||0).toLocaleString('en-US')} /mo` },
                  { l:'Overtime Eligible',v:emp.hourly_rate?'Yes':'No' },
                ].map(r=><InfoRow key={r.l} label={r.l} value={r.v}/>)}
                <div style={{ marginTop:10, background:'var(--purple-bg)', border:'1px solid var(--purple-border)', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ fontSize:9.5, fontWeight:800, color:'#7C3AED', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:5 }}>Salary Formula</div>
                  <div style={{ fontSize:12.5, color:'var(--text)', fontWeight:600 }}>
                    {emp.project_type==='office' ? `AED ${Number(emp.salary||0).toLocaleString('en-US')} (fixed salary)`
                      : emp.project_type==='cret' ? `AED ${Number(emp.salary||0).toLocaleString('en-US')} + shipments × ${emp.per_shipment_rate||0.5}`
                      : `AED ${Number(emp.salary||0).toLocaleString('en-US')} + hrs × ${emp.hourly_rate||3.85} + ${emp.performance_bonus||100} bonus`}
                  </div>
                </div>
              </SectionBox>

              {/* Documents */}
              <SectionBox title="Documents" onViewAll={()=>setTab('documents')}>
                {[
                  { l:'Passport',    v:emp.passport_no,   d:null              },
                  { l:'Visa',        v:emp.visa_file_no,  d:emp.visa_expiry   },
                  { l:'Emirates ID', v:emp.emirates_id,   d:null              },
                  { l:'License',     v:emp.license_expiry?'On file':null, d:emp.license_expiry },
                ].filter(r=>r.v||r.d).map(r=>{
                  const info = r.d ? expiry(r.d) : { label:'Verified', c:'#10B981', bg:'#F0FDF4', bc:'#A7F3D0' }
                  return (
                    <div key={r.l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
                      <span style={{ fontSize:11.5, color:'var(--text-muted)' }}>{r.l}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        {r.d && <span style={{ fontSize:10, color:'var(--text-muted)' }}>Till {r.d.slice(0,10)}</span>}
                        {info && <span style={{ fontSize:10, fontWeight:700, color:info.c, background:info.bg, border:`1px solid ${info.bc||info.bg}`, borderRadius:20, padding:'1px 6px' }}>{info.label==='Valid'?'Verified':info.label}</span>}
                      </div>
                    </div>
                  )
                })}
                {!emp.passport_no&&!emp.visa_file_no&&!emp.emirates_id&&!emp.visa_expiry&&(
                  <div style={{ textAlign:'center', padding:'14px 0', color:'var(--text-muted)', fontSize:12 }}>No documents uploaded</div>
                )}
              </SectionBox>
            </div>

            {/* Bottom 4 summary cards */}
            <div style={{ display:'grid', gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)', gap:12 }}>

              {/* Leave Balance */}
              <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:11.5, fontWeight:800, color:'var(--text)' }}>Leave Balance</span>
                  <button onClick={()=>setTab('leaves')} style={{ fontSize:10.5, fontWeight:600, color:'var(--gold)', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'Poppins,sans-serif' }}>View All</button>
                </div>
                <div style={{ padding:'8px 12px' }}>
                  {[
                    { l:'Annual Leave',  used:usedByType('Annual'),   total:Number(emp.annual_leave_balance||30), c:'#F59E0B' },
                    { l:'Sick Leave',    used:usedByType('Sick'),      total:15, c:'#3B82F6' },
                    { l:'Casual Leave',  used:usedByType('Casual'),    total:16, c:'#10B981' },
                    { l:'Unpaid Leave',  used:usedByType('Unpaid'),    total:null, c:'#9CA3AF' },
                  ].map(lt=>(
                    <div key={lt.l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderBottom:'1px solid var(--border)' }}>
                      <span style={{ fontSize:10.5, color:'var(--text-muted)' }}>{lt.l}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:lt.c }}>{lt.used}{lt.total?<span style={{ fontWeight:400, color:'var(--text-muted)' }}> / {lt.total}</span>:''} <span style={{ fontWeight:400, fontSize:10, color:'var(--text-muted)' }}>Days</span></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SIM Information */}
              <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:11.5, fontWeight:800, color:'var(--text)' }}>SIM Information</span>
                  <button onClick={()=>setTab('sims')} style={{ fontSize:10.5, fontWeight:600, color:'var(--gold)', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'Poppins,sans-serif' }}>View All</button>
                </div>
                <div style={{ padding:'8px 12px' }}>
                  {[
                    { l:'SIM Number',    v:emp.work_number },
                    { l:'Status',        v:emp.work_number?'Active':'Unassigned' },
                    { l:'Provider',      v:emp.sim_provider },
                    { l:'Assigned Date', v:emp.sim_assigned_date?.slice(0,10) },
                  ].map(r=>(
                    <div key={r.l} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid var(--border)' }}>
                      <span style={{ fontSize:10.5, color:'var(--text-muted)' }}>{r.l}</span>
                      <span style={{ fontSize:11, fontWeight:600, color:r.v?'var(--text)':'var(--text-muted)' }}>{r.v||'—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fleet / Vehicle */}
              <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:11.5, fontWeight:800, color:'var(--text)' }}>Fleet / Vehicle</span>
                  <button onClick={()=>setTab('fleet')} style={{ fontSize:10.5, fontWeight:600, color:'var(--gold)', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'Poppins,sans-serif' }}>View All</button>
                </div>
                <div style={{ padding:'8px 12px' }}>
                  {[
                    { l:'Vehicle Number', v:curVehicle?.plate||emp.vehicle_number },
                    { l:'Vehicle Type',   v:curVehicle?.vehicle_type||emp.vehicle_type },
                    { l:'Assigned Date',  v:curVehicle?.submitted_at?.slice(0,10) },
                    { l:'Status',         v:curVehicle?'Active':'Unassigned' },
                  ].map(r=>(
                    <div key={r.l} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid var(--border)' }}>
                      <span style={{ fontSize:10.5, color:'var(--text-muted)' }}>{r.l}</span>
                      <span style={{ fontSize:11, fontWeight:600, color:r.v?'var(--text)':'var(--text-muted)' }}>{r.v||'—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expenses This Month */}
              <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:11.5, fontWeight:800, color:'var(--text)' }}>Expenses (Month)</span>
                  <a href={`/dashboard/finance/expenses?emp_id=${emp.id}`} style={{ fontSize:10.5, fontWeight:600, color:'var(--gold)', textDecoration:'none' }}>View All</a>
                </div>
                <div style={{ padding:'8px 12px' }}>
                  <div style={{ fontWeight:900, fontSize:17, color:'var(--red)', letterSpacing:'-0.03em', marginBottom:1 }}>AED {totalMonthExp.toLocaleString('en-US')}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:8 }}>Total Claims</div>
                  <div style={{ display:'flex', gap:6 }}>
                    <div style={{ flex:1, background:'var(--green-bg)', borderRadius:8, padding:'6px', textAlign:'center' }}>
                      <div style={{ fontWeight:800, fontSize:12, color:'var(--green)' }}>AED {approvedMonthExp.toLocaleString('en-US')}</div>
                      <div style={{ fontSize:9, color:'var(--green)', opacity:0.8 }}>Approved</div>
                    </div>
                    <div style={{ flex:1, background:'var(--amber-bg)', borderRadius:8, padding:'6px', textAlign:'center' }}>
                      <div style={{ fontWeight:800, fontSize:12, color:'var(--amber)' }}>{pendingMonthExp}</div>
                      <div style={{ fontSize:9, color:'var(--amber)', opacity:0.8 }}>Pending</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Attendance */}
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:12, fontWeight:800, color:'var(--text)' }}>Recent Attendance</span>
                <button onClick={()=>setTab('attendance')} style={{ fontSize:11, fontWeight:600, color:'var(--gold)', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'Poppins,sans-serif' }}>View Full Attendance</button>
              </div>
              <div style={{ padding:'14px 16px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:12 }}>
                  {[
                    { l:'Present',    v:attendance.filter(a=>a.status==='present').length,  c:'#10B981', bg:'#F0FDF4' },
                    { l:'Absent',     v:attendance.filter(a=>a.status==='absent').length,   c:'#EF4444', bg:'#FEF2F2' },
                    { l:'Late',       v:attendance.filter(a=>a.is_late).length,             c:'#F59E0B', bg:'#FFFBEB' },
                    { l:'Early Leave',v:attendance.filter(a=>a.early_leave).length,         c:'#3B82F6', bg:'#EFF6FF' },
                  ].map(stat=>(
                    <div key={stat.l} style={{ textAlign:'center', padding:'8px', borderRadius:10, background:stat.bg, border:'1px solid var(--border)' }}>
                      <div style={{ fontSize:16, fontWeight:900, color:stat.c }}>{attLoad?'—':stat.v}</div>
                      <div style={{ fontSize:9.5, color:'var(--text-muted)', marginTop:1 }}>{stat.l}</div>
                    </div>
                  ))}
                </div>
                {attLoad ? <div className="sk" style={{ height:26, borderRadius:6 }}/> : attendance.length>0 ? (
                  <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                    {attendance.slice(-30).map((a,i)=>{
                      const c=a.status==='present'?'#10B981':a.status==='absent'?'#EF4444':a.status==='leave'?'#F59E0B':'#D1D5DB'
                      return <div key={i} title={`${a.date?.slice(0,10)} — ${a.status}`} style={{ width:9, height:26, borderRadius:2, background:c, opacity:0.8, cursor:'default' }} onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0.8'}/>
                    })}
                  </div>
                ) : <div style={{ textAlign:'center', padding:'10px 0', color:'var(--text-muted)', fontSize:12 }}>No attendance records this month</div>}
              </div>
            </div>

            {/* Notes */}
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:12, fontWeight:800, color:'var(--text)' }}>Notes</span>
                <button onClick={async()=>{
                  const text=prompt('Add note:')
                  if(!text?.trim()) return
                  try {
                    await fetch(`${API}/api/employees/${emp.id}/notes`,{method:'POST',headers:{...auth(),'Content-Type':'application/json'},body:JSON.stringify({text})})
                    const d=await fetch(`${API}/api/employees/${emp.id}/notes`,{headers:auth()}).then(r=>r.json())
                    setNotes(d.notes||[])
                  } catch(e){}
                }} style={{ fontSize:11, fontWeight:700, color:'var(--gold)', background:'var(--amber-bg)', border:'1px solid var(--gold-border)', borderRadius:20, padding:'4px 12px', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
                  + Add Note
                </button>
              </div>
              <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:8 }}>
                {notes.length===0 ? (
                  <div style={{ textAlign:'center', padding:'14px 0', color:'var(--text-muted)', fontSize:12 }}>No more notes</div>
                ) : notes.map((n,i)=>(
                  <div key={n.id||i} style={{ background:'var(--bg-alt)', borderRadius:10, padding:'10px 12px', border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:12.5, color:'var(--text)', marginBottom:4 }}>{n.text||n.content}</div>
                    <div style={{ fontSize:10.5, color:'var(--text-muted)' }}>{n.created_by_name||'Team'} · {n.created_at?.slice(0,10)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            {userRole!=='accountant' && (
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={onEdit} className="btn btn-secondary" style={{ flex:1, justifyContent:'center', borderRadius:12 }}><Pencil size={13}/> Edit Employee</button>
                <button onClick={onDelete} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px', borderRadius:12, background:'var(--red-bg)', border:'1px solid var(--red-border)', color:'var(--red)', fontWeight:700, fontSize:12.5, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}><Trash2 size={13}/> Delete</button>
              </div>
            )}
          </div>
        )}

        {/* ══════════ PERSONAL INFO ══════════════════════════ */}
        {tab==='personal' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <SectionBox title="Personal Details">
              {[
                {l:'Full Name',      v:emp.name},
                {l:'Date of Birth',  v:emp.dob?.slice(0,10)},
                {l:'Gender',         v:emp.gender},
                {l:'Marital Status', v:emp.marital_status},
                {l:'Father / Family',v:emp.father_family_name},
                {l:'Nationality',    v:emp.nationality},
                {l:'Religion',       v:emp.religion},
                {l:'Languages',      v:emp.languages},
              ].map(r=><InfoRow key={r.l} label={r.l} value={r.v}/>)}
            </SectionBox>
            <SectionBox title="Contact Details">
              {[
                {l:'Phone',              v:emp.phone},
                {l:'Email',              v:emp.email_id},
                {l:'Emergency Contact',  v:emp.emergency_contact_name},
                {l:'Emergency Phone',    v:emp.emergency_contact_phone},
                {l:'Residential Location',v:emp.residential_location},
              ].map(r=><InfoRow key={r.l} label={r.l} value={r.v}/>)}
            </SectionBox>
          </div>
        )}

        {/* ══════════ EMPLOYMENT ═════════════════════════════ */}
        {tab==='employment' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <SectionBox title="Employment Details">
              {[
                {l:'Designation',      v:emp.role},
                {l:'Department',       v:emp.dept},
                {l:'Employment Type',  v:emp.employment_type||'Full Time'},
                {l:'Reporting To',     v:emp.reporting_to||'Operations Manager'},
                {l:'Work Location',    v:emp.work_location},
                {l:'Probation End Date',v:emp.probation_end_date?.slice(0,10)},
                {l:'Joined Date',      v:emp.joined?.slice(0,10)},
              ].map(r=><InfoRow key={r.l} label={r.l} value={r.v}/>)}
            </SectionBox>
            <SectionBox title="Salary & Compensation">
              {[
                {l:'Base Salary',       v:`AED ${Number(emp.salary||0).toLocaleString('en-US')} /mo`},
                {l:'Hourly Rate',       v:emp.hourly_rate?`AED ${emp.hourly_rate} /hr`:null},
                {l:'Performance Bonus', v:emp.performance_bonus?`AED ${emp.performance_bonus}`:null},
                {l:'Per Shipment Rate', v:emp.per_shipment_rate?`AED ${emp.per_shipment_rate}`:null},
              ].map(r=><InfoRow key={r.l} label={r.l} value={r.v}/>)}
              <div style={{ marginTop:10, background:'var(--purple-bg)', border:'1px solid var(--purple-border)', borderRadius:10, padding:'10px 12px' }}>
                <div style={{ fontSize:9.5, fontWeight:800, color:'#7C3AED', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:5 }}>Salary Formula</div>
                <div style={{ fontSize:12.5, color:'var(--text)', fontWeight:600 }}>
                  {emp.project_type==='office'?`AED ${Number(emp.salary||0).toLocaleString('en-US')} (fixed salary)`:emp.project_type==='cret'?`AED ${Number(emp.salary||0).toLocaleString('en-US')} + shipments × ${emp.per_shipment_rate||0.5}`:`AED ${Number(emp.salary||0).toLocaleString('en-US')} + hrs × ${emp.hourly_rate||3.85} + ${emp.performance_bonus||100} bonus`}
                </div>
              </div>
            </SectionBox>
          </div>
        )}

        {/* ══════════ DOCUMENTS ══════════════════════════════ */}
        {tab==='documents' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div className="r-grid-3" style={{ gap:8 }}>
              {[['Visa',emp.visa_expiry],['License',emp.license_expiry],['ILOE',emp.iloe_expiry]].map(([l,d])=>{
                const info=expiry(d)
                return (
                  <div key={l} style={{ textAlign:'center', padding:'12px 8px', borderRadius:12, background:info?.bg||'var(--bg-alt)', border:`1px solid ${info?.bc||'var(--border)'}` }}>
                    <div style={{ fontSize:10, fontWeight:800, color:info?.c||'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{l}</div>
                    <div style={{ fontSize:13, color:info?.c||'var(--text-muted)', fontWeight:700 }}>{info?.label||'N/A'}</div>
                    {d && <div style={{ fontSize:10, color:info?.c||'var(--text-muted)', opacity:0.7, marginTop:2 }}>{d.slice(0,10)}</div>}
                  </div>
                )
              })}
            </div>
            <SectionBox title="Document Numbers">
              {[
                {l:'Passport No',          v:emp.passport_no},
                {l:'UID Number',           v:emp.uid_number},
                {l:'Emirates ID',          v:emp.emirates_id},
                {l:'Visa File No',         v:emp.visa_file_no},
                {l:'Emirates Issuing Visa',v:emp.emirates_issuing_visa},
                {l:'Email',                v:emp.email_id},
              ].map(r=><InfoRow key={r.l} label={r.l} value={r.v}/>)}
            </SectionBox>
          </div>
        )}

        {/* ══════════ ATTENDANCE ═════════════════════════════ */}
        {tab==='attendance' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div className="r-grid-3" style={{ gap:8 }}>
              {[
                {l:'Present', v:attendance.filter(a=>a.status==='present').length, c:'#10B981', bg:'#F0FDF4'},
                {l:'Absent',  v:attendance.filter(a=>a.status==='absent').length,  c:'#EF4444', bg:'#FEF2F2'},
                {l:'On Leave',v:attendance.filter(a=>a.status==='leave').length,   c:'#F59E0B', bg:'#FFFBEB'},
              ].map(s=>(
                <div key={s.l} style={{ textAlign:'center', padding:'12px', borderRadius:12, background:s.bg, border:'1px solid var(--border)' }}>
                  <div style={{ fontWeight:900, fontSize:22, color:s.c }}>{attLoad?'—':s.v}</div>
                  <div style={{ fontSize:11, color:s.c, opacity:0.8, marginTop:3, fontWeight:600 }}>{s.l}</div>
                </div>
              ))}
            </div>
            {attLoad ? <div style={{ textAlign:'center', padding:20, color:'var(--text-muted)', fontSize:12 }}>Loading…</div>
            : attendance.length===0 ? <div style={{ textAlign:'center', padding:30, color:'var(--text-muted)', fontSize:12 }}>No attendance records this month</div>
            : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {attendance.map(a=>{
                  const c=a.status==='present'?'#10B981':a.status==='absent'?'#EF4444':'#F59E0B'
                  return (
                    <div key={a.id||a.date} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'var(--bg-alt)', borderRadius:10, border:'1px solid var(--border)' }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:c, flexShrink:0 }}/>
                      <span style={{ fontSize:12, fontWeight:600, color:'var(--text)', flex:1 }}>{a.date?.slice(0,10)}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:c, textTransform:'capitalize' }}>{a.status}</span>
                      {a.check_in&&<span style={{ fontSize:10.5, color:'var(--text-muted)' }}>{a.check_in} – {a.check_out||'—'}</span>}
                    </div>
                  )
                })}
              </div>}
          </div>
        )}

        {/* ══════════ LEAVES ═════════════════════════════════ */}
        {tab==='leaves' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div className="r-grid-3" style={{ gap:6, marginBottom:4 }}>
              {[
                {l:'Total',   v:leaves.length,                                  c:'var(--text)',bg:'var(--bg-alt)'},
                {l:'Approved',v:leaves.filter(l=>l.status==='approved').length, c:'#10B981',   bg:'#F0FDF4'},
                {l:'Pending', v:leaves.filter(l=>l.status==='pending').length,  c:'#F59E0B',   bg:'#FFFBEB'},
              ].map(s=>(
                <div key={s.l} style={{ textAlign:'center', padding:'8px 4px', borderRadius:10, background:s.bg, border:'1px solid var(--border)' }}>
                  <div style={{ fontWeight:900, fontSize:18, color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:9.5, color:s.c, fontWeight:600, marginTop:2, opacity:0.8 }}>{s.l}</div>
                </div>
              ))}
            </div>
            {leavesLoad ? <div style={{ textAlign:'center', padding:20, color:'var(--text-muted)', fontSize:12 }}>Loading…</div>
            : leaves.length===0 ? <div style={{ textAlign:'center', padding:20, color:'var(--text-muted)', fontSize:12 }}><Calendar size={28} style={{ margin:'0 auto 8px', display:'block', opacity:0.2 }}/>No leave records</div>
            : leaves.map(lv=>{
              const TC={Annual:'#B8860B',Sick:'#2563EB',Emergency:'#EF4444',Unpaid:'#6B7280',Other:'#9CA3AF'}
              const SC2={approved:'#10B981',pending:'#F59E0B',rejected:'#EF4444'}
              const SBG={approved:'#F0FDF4',pending:'#FFFBEB',rejected:'#FEF2F2'}
              const tc=TC[lv.type]||'#9CA3AF', sc2=SC2[lv.status]||'#9CA3AF'
              return (
                <div key={lv.id} style={{ background:'var(--bg-alt)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                    <span style={{ fontSize:11.5, fontWeight:700, color:tc, background:`${tc}12`, borderRadius:6, padding:'2px 8px' }}>{lv.type}</span>
                    <span style={{ fontSize:10.5, fontWeight:700, color:sc2, background:SBG[lv.status], borderRadius:20, padding:'2px 8px' }}>{lv.status}</span>
                  </div>
                  <div style={{ fontSize:12, color:'var(--text)', fontWeight:600, marginBottom:2 }}>{lv.from_date?.slice(0,10)} → {lv.to_date?.slice(0,10)}</div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>{lv.days} day{lv.days!==1?'s':''}</span>
                    {lv.reason&&<span style={{ fontSize:10.5, color:'var(--text-sub)', maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lv.reason}</span>}
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
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{emp.phone||'—'}</div>
            </div>
          </div>
        )}

        {tab==='fleet' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {fleetLoad ? <div style={{ textAlign:'center', padding:30, color:'var(--text-muted)', fontSize:12 }}>Loading…</div> : (
              <>
                {curVehicle ? (
                  <div style={{ background:'var(--green-bg)', border:'1px solid #A7F3D0', borderRadius:12, padding:'12px 14px' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#10B981', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Current Vehicle</div>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:40, height:40, borderRadius:10, background:'#DCFCE7', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Truck size={19} color="#10B981"/></div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:800, fontSize:16, color:'var(--text)' }}>{curVehicle.plate||'—'}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>Since {new Date(curVehicle.submitted_at).toLocaleDateString('en-AE',{day:'numeric',month:'short',year:'numeric'})}</div>
                      </div>
                      <span style={{ fontSize:10, fontWeight:700, color:'#10B981', background:'#DCFCE7', border:'1px solid #A7F3D0', borderRadius:20, padding:'2px 9px' }}>Active</span>
                    </div>
                    {curVehicle.fuel_level&&<div style={{ marginTop:8, fontSize:11, color:'var(--text-sub)' }}>Fuel at receive: {curVehicle.fuel_level}{curVehicle.odometer?` · ODO: ${curVehicle.odometer} km`:''}</div>}
                  </div>
                ) : (
                  <div style={{ background:'var(--bg-alt)', border:'1px dashed var(--border)', borderRadius:12, padding:16, textAlign:'center' }}>
                    <Truck size={20} color="var(--text-muted)" style={{ margin:'0 auto 6px', display:'block', opacity:0.3 }}/>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}>No vehicle currently assigned</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}><ArrowLeftRight size={11}/> Receive / Return History</div>
                  {fleetHv.length===0 ? <div style={{ textAlign:'center', padding:'14px 0', color:'var(--text-muted)', fontSize:12 }}>No handover records</div> : (
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {fleetHv.map(h=>{
                        const isRecv=h.type==='received'
                        return (
                          <div key={h.id} style={{ padding:'9px 12px', borderRadius:10, background:'var(--bg-alt)', border:`1px solid ${isRecv?'#A7F3D0':'#FECACA'}` }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:h.fuel_level||h.odometer||h.condition_note?5:0 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                                <span style={{ fontSize:10, fontWeight:700, color:isRecv?'#10B981':'#EF4444', background:isRecv?'#F0FDF4':'#FEF2F2', borderRadius:5, padding:'1px 7px', textTransform:'uppercase' }}>{h.type}</span>
                                <span style={{ fontWeight:700, fontSize:12.5, color:'var(--text)' }}>{h.plate||'—'}</span>
                              </div>
                              <span style={{ fontSize:10.5, color:'var(--text-muted)' }}>{new Date(h.submitted_at).toLocaleDateString('en-AE',{day:'numeric',month:'short',year:'numeric'})}</span>
                            </div>
                            {(h.fuel_level||h.odometer||h.condition_note)&&<div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:4 }}>
                              {h.fuel_level&&<span style={{ fontSize:10.5, color:'var(--text-sub)' }}>Fuel: {h.fuel_level}</span>}
                              {h.odometer&&<span style={{ fontSize:10.5, color:'var(--text-sub)' }}>ODO: {h.odometer} km</span>}
                              {h.condition_note&&<span style={{ fontSize:10.5, color:'var(--text-sub)', flexBasis:'100%', marginTop:2 }}>{h.condition_note}</span>}
                            </div>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                {fleetAsgn.length>0&&(
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}><Truck size={11}/> POC Assignment History</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {fleetAsgn.map((a,i)=>(
                        <div key={a.id||i} style={{ padding:'9px 12px', borderRadius:10, background:'var(--bg-alt)', border:'1px solid var(--border)' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                              <span style={{ fontSize:10, fontWeight:700, color:'#2563EB', background:'#EFF6FF', borderRadius:5, padding:'1px 7px' }}>POC</span>
                              <span style={{ fontWeight:700, fontSize:12.5, color:'var(--text)' }}>{a.plate||a.vehicle_plate||'—'}</span>
                            </div>
                            <span style={{ fontSize:10.5, color:'var(--text-muted)' }}>{a.date?new Date(a.date).toLocaleDateString('en-AE',{day:'numeric',month:'short',year:'numeric'}):'—'}</span>
                          </div>
                          {a.assigned_by_name&&<div style={{ fontSize:10.5, color:'var(--text-sub)', marginTop:4 }}>Assigned by: {a.assigned_by_name}</div>}
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
            <a href={`/dashboard/finance/expenses?emp_id=${emp.id}`} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px', borderRadius:10, background:'var(--blue-bg)', border:'1px solid var(--blue-border)', color:'var(--blue)', fontWeight:600, fontSize:12, textDecoration:'none', marginBottom:12 }}>
              <Receipt size={13}/> View All Expenses <ExternalLink size={11}/>
            </a>
            {expLoad ? <div style={{ textAlign:'center', padding:20, color:'var(--text-muted)', fontSize:12 }}>Loading…</div>
            : expenses.length===0 ? <div style={{ textAlign:'center', padding:24, color:'var(--text-muted)', fontSize:12 }}><Receipt size={28} style={{ margin:'0 auto 8px', display:'block', opacity:0.2 }}/>No expenses found</div>
            : expenses.slice(0,20).map(ex=>(
              <div key={ex.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', background:'var(--bg-alt)', border:'1px solid var(--border)', borderRadius:9, marginBottom:5 }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:160 }}>{ex.description||ex.category||'Expense'}</div>
                  <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:1 }}>{ex.date?.slice(0,10)}</div>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:'#EF4444', flexShrink:0 }}>AED {Number(ex.amount||0).toLocaleString('en-US')}</span>
              </div>
            ))}
          </div>
        )}

        {tab==='tasks' && (
          <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-muted)' }}>
            <Briefcase size={32} style={{ margin:'0 auto 12px', display:'block', opacity:0.15 }}/>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--text-sub)' }}>Tasks coming soon</div>
          </div>
        )}

        {tab==='history' && (
          <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-muted)' }}>
            <Clock size={32} style={{ margin:'0 auto 12px', display:'block', opacity:0.15 }}/>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--text-sub)' }}>Activity history coming soon</div>
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
        <div style={{ width:44,height:44,borderRadius:13,background:`linear-gradient(135deg,${sbg},var(--card))`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:900,color:sc,flexShrink:0,position:'relative' }}>
          {emp.name?.slice(0,2).toUpperCase()}
          <CompletionRing pct={profileCompletion(emp)} size={44} stroke={3}/>
          <div style={{ position:'absolute',bottom:-1,right:-1,width:11,height:11,borderRadius:'50%',background:s.dot,border:'2px solid var(--card)' }}/>
        </div>

        {/* Main info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700,fontSize:13.5,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{emp.name}</div>
          <div style={{ fontSize:11,color:'var(--text-muted)',marginTop:2,display:'flex',gap:5,alignItems:'center' }}>
            <span style={{ fontFamily:'inherit' }}>{emp.id}</span>
            {emp.work_number&&<><span>·</span><span style={{ color:'var(--text-sub)' }}>{emp.work_number}</span></>}
          </div>
        </div>

        {/* Right badges */}
        <div style={{ display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4,flexShrink:0 }}>
          <span style={{ fontSize:11,fontWeight:700,color:sc,background:sbg,border:`1px solid ${sbc}`,borderRadius:7,padding:'2px 8px' }}>{emp.station_code||'DDB1'}</span>
          {emp.project_type&&<span style={{ fontSize:10,fontWeight:600,color:'#7C3AED',background:'var(--purple-bg)',borderRadius:5,padding:'1px 6px' }}>{emp.project_type.toUpperCase()}</span>}
          {(()=>{ const vt=emp.visa_type||'company'; return <span style={{ fontSize:10,fontWeight:600,color:vt==='own'?'#0369A1':'#065F46',background:vt==='own'?'#EFF6FF':'#ECFDF5',border:`1px solid ${vt==='own'?'#BAE6FD':'#A7F3D0'}`,borderRadius:5,padding:'1px 6px' }}>{vt==='own'?'Own Visa':'Co. Visa'}</span> })()}
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
            {l:'Total',   v:total,   c:'var(--text)', bg:'var(--bg-alt)',     bc:'var(--border)'     },
            {l:'Active',  v:active,  c:'#10B981',    bg:'#F0FDF4',           bc:'#A7F3D0'           },
            {l:'On Leave',v:onLeave, c:'#F59E0B',    bg:'#FFFBEB',           bc:'#FDE68A'           },
            {l:'Alerts',  v:alerts,  c:'#EF4444',    bg:'var(--red-bg)',     bc:'var(--red-border)' },
          ].map((s,i)=>(
            <div key={s.l} style={{ background:s.bg, border:`1px solid ${s.bc}`, borderRadius:13, padding:'14px 12px', textAlign:'center', transition:'all 0.2s' }}>
              <div style={{ fontWeight:900, fontSize:22, color:s.c, letterSpacing:'-0.04em', lineHeight:1 }}>{s.v}</div>
              <div style={{ fontSize:10.5, color:s.c, fontWeight:600, marginTop:4, opacity:0.8 }}>{s.l}</div>
            </div>
          ))}
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

      {/* Detail drawer — right-side panel */}
      {selected && (
        <div className="emp-drawer-overlay">
          <div className="emp-drawer-backdrop" onClick={()=>setSelected(null)}/>
          <div className="emp-drawer-panel">
            <DetailDrawer emp={selected} onEdit={()=>setModal({mode:'edit',emp:selected})} onDelete={()=>handleDelete(selected)} onClose={()=>setSelected(null)} onRefresh={load} userRole={userRole}
              onSelectEmployee={id=>{ const t=employees.find(e=>e.id===id); if(t) setSelected(t) }}/>
          </div>
        </div>
      )}

      {modal && <EmpModal key={`${modal.mode}-${modal.emp?.id||'new'}`} mode={modal.mode} emp={modal.emp} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
    </div>
  )
}