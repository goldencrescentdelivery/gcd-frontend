'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { empApi } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import { Search, Plus, X, Pencil, Trash2, ChevronRight, Shield, Phone, User, Building2, AlertCircle, CheckCircle2, Briefcase, CreditCard, Calendar, Users } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'

const STATIONS = ['All','DDB7','DDB6','DSH6','DXD3']
const STATION_COLORS = { DDB7:'#B8860B', DDB6:'#1D6FA4', DSH6:'#2E7D52', DXD3:'#7C3AED' }
const STATION_BG     = { DDB7:'#FDF6E3', DDB6:'#EFF6FF', DSH6:'#ECFDF5', DXD3:'#F5F3FF' }
const STATUS_CFG = {
  active:   { l:'Active',   c:'#2E7D52', bg:'#ECFDF5', bc:'#A7F3D0', dot:'#22C55E' },
  on_leave: { l:'On Leave', c:'#B45309', bg:'#FFFBEB', bc:'#FCD34D', dot:'#F59E0B' },
  inactive: { l:'Inactive', c:'#6B5D4A', bg:'#F5F4F1', bc:'#EAE6DE', dot:'#A89880' },
}
const API = process.env.NEXT_PUBLIC_API_URL

const EMPTY = {
  id:'', name:'', role:'Driver', dept:'Operations', status:'active',
  salary:'', joined:'', phone:'', work_number:'', nationality:'', zone:'',
  visa_expiry:'', license_expiry:'', avatar:'',
  station_code:'DDB7', hourly_rate:'3.85',
  iloe_expiry:'', annual_leave_start:'',
  amazon_id:'', emirates_id:'', annual_leave_balance:30,
  project_type:'pulser', per_shipment_rate:'0.5', performance_bonus:'100',
  login_email:'', login_password:''
}

function expiryInfo(ds) {
  if (!ds) return null
  try {
    const d = differenceInDays(parseISO(ds.slice(0,10)), new Date())
    if (d < 0)   return { label:'Expired',    color:'#C0392B', bg:'#FEF2F2' }
    if (d <= 30) return { label:`${d}d left`, color:'#C0392B', bg:'#FEF2F2' }
    if (d <= 90) return { label:`${d}d left`, color:'#B45309', bg:'#FFFBEB' }
    return { label:'Valid', color:'#2E7D52', bg:'#ECFDF5' }
  } catch { return null }
}

function calcNetSalary(emp) {
  const base = Number(emp.salary||0)
  const hrs  = Number(emp.total_hours || 0)
  const rate = Number(emp.hourly_rate || 3.85)
  const perf = Number(emp.performance_bonus || 100)
  const shipments = Number(emp.total_shipments || 0)
  const perShip   = Number(emp.per_shipment_rate || 0.5)

  if (emp.project_type === 'cret') {
    return base + shipments * perShip
  }
  // Pulser (default)
  return base + hrs * rate + perf
}

// ── Modal ─────────────────────────────────────────────────────
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
    project_type:         emp.project_type||'pulser',
    per_shipment_rate:    emp.per_shipment_rate||'0.5',
    performance_bonus:    emp.performance_bonus||'100',
    login_email:'', login_password:''
  } : EMPTY)
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)
  const [tab,    setTab]    = useState('identity')

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSave() {
    if (!form.name || !form.role || !form.dept) return setErr('Name, role and department required')
    if (mode === 'add' && !form.id) return setErr('Employee ID required (e.g. DA001)')
    setSaving(true); setErr(null)
    try {
      const data = { ...form, salary:Number(form.salary)||0, hourly_rate:Number(form.hourly_rate)||3.85,
        per_shipment_rate:Number(form.per_shipment_rate)||0.5, performance_bonus:Number(form.performance_bonus)||100 }
      const res = mode === 'add' ? await empApi.create(data) : await empApi.update(form.id, data)

      // Auto-create login account
      if (mode === 'add' && form.login_email && form.login_password) {
        const empId = res?.employee?.id || form.id
        const r = await fetch(`${API}/api/employees/${empId}/create-user`, {
          method:'POST',
          headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gcd_token')}` },
          body: JSON.stringify({ email: form.login_email.trim().toLowerCase(), password: form.login_password })
        })
        if (!r.ok) {
          const d = await r.json()
          console.warn('User account creation failed:', d.error)
        }
      }
      onSave()
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  function inp(label, k, type='text', placeholder='') {
    return (
      <div key={k}>
        <label style={{ display:'block', fontSize:11, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'#A89880', marginBottom:5 }}>{label}</label>
        <input className="input" type={type} value={form[k]||''} autoComplete="off" spellCheck={false}
          placeholder={placeholder} onChange={e => set(k, e.target.value)} style={{ borderRadius:10 }}/>
      </div>
    )
  }
  function sel(label, k, options) {
    return (
      <div key={k}>
        <label style={{ display:'block', fontSize:11, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'#A89880', marginBottom:5 }}>{label}</label>
        <select className="input" value={form[k]||''} onChange={e => set(k, e.target.value)} style={{ borderRadius:10 }}>
          {options.map(o => <option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
        </select>
      </div>
    )
  }

  const TABS = [
    { id:'identity', label:'Identity' },
    { id:'work',     label:'Work & Pay' },
    { id:'docs',     label:'Documents' },
    ...(mode==='add' ? [{ id:'login', label:'Login Account' }] : []),
  ]

  // Salary preview
  const previewSalary = () => {
    const base = Number(form.salary||0)
    const rate = Number(form.hourly_rate||3.85)
    const perf = Number(form.performance_bonus||100)
    const perShip = Number(form.per_shipment_rate||0.5)
    if (form.project_type === 'cret') {
      return `Base (${base}) + Shipments × ${perShip}`
    }
    return `Base (${base}) + Hours × ${rate} + Bonus (${perf})`
  }

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:560, padding:0, overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'22px 26px 0', background:'linear-gradient(135deg,#FAFAF8,#FFF)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
            <div>
              <h2 style={{ fontWeight:900, fontSize:17, color:'#1A1612', letterSpacing:'-0.02em' }}>{mode==='add'?'Add New DA':'Edit DA'}</h2>
              <p style={{ fontSize:12, color:'#A89880', marginTop:2 }}>{mode==='add'?'Create a new Delivery Associate':emp?.name}</p>
            </div>
            <button onClick={onClose} style={{ width:32, height:32, borderRadius:10, background:'#F5F4F1', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X size={15} color="#6B5D4A"/>
            </button>
          </div>
          <div style={{ display:'flex', gap:2, borderBottom:'2px solid #EAE6DE' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{ padding:'9px 16px', fontSize:12, fontWeight:tab===t.id?700:500, color:tab===t.id?'#B8860B':'#A89880', background:'none', border:'none', cursor:'pointer', borderBottom:`2px solid ${tab===t.id?'#B8860B':'transparent'}`, marginBottom:-2, transition:'all 0.2s', fontFamily:'Poppins,sans-serif' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding:'20px 26px', maxHeight:'56vh', overflowY:'auto' }}>
          {err && (
            <div style={{ display:'flex', gap:8, alignItems:'center', background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:10, padding:'10px 14px', fontSize:12.5, color:'#C0392B', marginBottom:14 }}>
              <AlertCircle size={14}/> {err}
            </div>
          )}

          {tab==='identity' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              {mode==='add' && inp('Employee ID *', 'id', 'text', 'DA001')}
              {inp('Full Name *', 'name', 'text', 'Mohammed Al Rashid')}
              {inp('Phone Number', 'phone', 'tel', '+971 50 XXX XXXX')}
              {inp('Work Number', 'work_number', 'text', 'Internal work contact')}
              {inp('Amazon / Transporter ID', 'amazon_id', 'text', 'TRS-00123')}
              {inp('Emirates ID', 'emirates_id', 'text', '784-XXXX-XXXXXXX-X')}
              {inp('Nationality', 'nationality', 'text', 'UAE')}
            </div>
          )}

          {tab==='work' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              {sel('Role *', 'role', ['Driver','HR Manager','Finance Mgr','Accountant','Dispatcher','General Manager','Admin','POC','Other'])}
              {sel('Department *', 'dept', ['Operations','HR','Finance','Admin','Other'])}
              {sel('Station', 'station_code', ['DDB7','DDB6','DSH6','DXD3'])}
              {sel('Status', 'status', [{v:'active',l:'Active'},{v:'on_leave',l:'On Leave'},{v:'inactive',l:'Inactive'}])}
              <div style={{ gridColumn:'span 2' }}>
                <div style={{ background:'#F8F7FF', border:'1px solid #DDD6FE', borderRadius:12, padding:'14px 16px' }}>
                  <label style={{ fontSize:11, fontWeight:800, letterSpacing:'0.06em', textTransform:'uppercase', color:'#7C3AED', marginBottom:10, display:'block' }}>Project & Salary Type</label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                    {[{v:'pulser',l:'Pulser',desc:'Base + Hours × Rate + Bonus'},{v:'cret',l:'CRET',desc:'Base + Shipments × Rate'}].map(p=>(
                      <button key={p.v} onClick={()=>set('project_type',p.v)} type="button"
                        style={{ padding:'12px', borderRadius:11, border:`2px solid ${form.project_type===p.v?'#7C3AED':'#EAE6DE'}`, background:form.project_type===p.v?'#F5F3FF':'#FAFAF8', cursor:'pointer', textAlign:'left', transition:'all 0.18s' }}>
                        <div style={{ fontWeight:700, fontSize:13, color:form.project_type===p.v?'#7C3AED':'#1A1612' }}>{p.l}</div>
                        <div style={{ fontSize:10.5, color:'#A89880', marginTop:3 }}>{p.desc}</div>
                      </button>
                    ))}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {inp('Base Salary (AED)', 'salary', 'number', '3800')}
                    {form.project_type === 'pulser' ? (
                      inp('Hourly Rate (AED)', 'hourly_rate', 'number', '3.85')
                    ) : (
                      inp('Per Shipment Rate', 'per_shipment_rate', 'number', '0.5 or 2')
                    )}
                    {form.project_type === 'pulser' && inp('Performance Bonus (AED)', 'performance_bonus', 'number', '100')}
                  </div>
                  <div style={{ marginTop:12, background:form.project_type==='pulser'?'#ECFDF5':'#EFF6FF', borderRadius:9, padding:'9px 12px', fontSize:12, color:form.project_type==='pulser'?'#2E7D52':'#1D6FA4', fontWeight:600 }}>
                    Formula: {previewSalary()}
                  </div>
                </div>
              </div>
              {inp('Start Date', 'joined', 'date')}
              {inp('AL Start Date', 'annual_leave_start', 'date')}
              {inp('AL Balance (days)', 'annual_leave_balance', 'number', '30')}
            </div>
          )}

          {tab==='docs' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              {inp('Visa Expiry', 'visa_expiry', 'date')}
              {inp('License Expiry', 'license_expiry', 'date')}
              {inp('ILOE Expiry', 'iloe_expiry', 'date')}
            </div>
          )}

          {tab==='login' && mode==='add' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ background:'#FFFBEB', border:'1px solid #FCD34D', borderRadius:12, padding:'12px 16px', fontSize:13, color:'#92400E' }}>
                <strong>Optional:</strong> Creates a login so this DA can access their personal portal.
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                {inp('Login Email', 'login_email', 'email', 'da@goldencrescent.ae')}
                {inp('Login Password', 'login_password', 'password', 'Min 6 characters')}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding:'16px 26px 22px', borderTop:'1px solid #EAE6DE', display:'flex', gap:10, justifyContent:'flex-end', background:'#FAFAF8' }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ borderRadius:10 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ borderRadius:10, minWidth:130, justifyContent:'center' }}>
            {saving ? <span style={{ display:'flex', alignItems:'center', gap:7 }}><span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Saving…</span> : mode==='add' ? 'Add DA' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Detail Drawer ─────────────────────────────────────────────
function DetailDrawer({ emp, onEdit, onDelete, onClose }) {
  const s  = STATUS_CFG[emp.status] || STATUS_CFG.inactive
  const sc = STATION_COLORS[emp.station_code] || '#B8860B'
  const sb = STATION_BG[emp.station_code]     || '#FDF6E3'

  return (
    <div style={{ background:'#FFF', border:'1px solid #EAE6DE', borderRadius:20, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.08)', animation:'slideLeft 0.25s cubic-bezier(0.16,1,0.3,1)' }}>
      <div style={{ background:`linear-gradient(135deg,${sb},#FFF)`, padding:'22px 18px 18px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-20, top:-20, width:100, height:100, borderRadius:'50%', background:`${sc}12` }}/>
        <button onClick={onClose} style={{ position:'absolute', top:14, right:14, width:28, height:28, borderRadius:8, background:'rgba(255,255,255,0.7)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <X size={14} color="#6B5D4A"/>
        </button>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:60, height:60, borderRadius:20, background:'#FFF', border:`2px solid ${sc}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:sc, margin:'0 auto 12px', boxShadow:`0 4px 16px ${sc}20` }}>
            {emp.name?.slice(0,2).toUpperCase()}
          </div>
          <div style={{ fontWeight:800, fontSize:15, color:'#1A1612', marginBottom:3 }}>{emp.name}</div>
          <div style={{ fontSize:12, color:'#6B5D4A', marginBottom:10 }}>{emp.role}</div>
          <div style={{ display:'flex', gap:6, justifyContent:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:11, fontWeight:700, color:s.c, background:s.bg, border:`1px solid ${s.bc}`, borderRadius:20, padding:'3px 10px' }}>{s.l}</span>
            <span style={{ fontSize:11, fontWeight:700, color:sc, background:'#FFF', border:`1px solid ${sc}40`, borderRadius:20, padding:'3px 10px' }}>{emp.station_code||'DDB7'}</span>
            {emp.project_type && <span style={{ fontSize:11, fontWeight:700, color:'#7C3AED', background:'#F5F3FF', border:'1px solid #DDD6FE', borderRadius:20, padding:'3px 10px' }}>{emp.project_type.toUpperCase()}</span>}
          </div>
        </div>
      </div>

      <div style={{ padding:'14px 16px' }}>
        {[
          { icon:User,      label:'Employee ID',  value:emp.id,                                     mono:true  },
          { icon:Phone,     label:'Phone',         value:emp.phone||'—',                             mono:false },
          { icon:Briefcase, label:'Work Number',   value:emp.work_number||'—',                       mono:false },
          { icon:CreditCard,label:'Emirates ID',   value:emp.emirates_id||'—',                       mono:false },
          { icon:Building2, label:'Transporter ID',value:emp.amazon_id||'—',                         mono:true  },
          { icon:User,      label:'Nationality',   value:emp.nationality||'—',                       mono:false },
          { icon:Shield,    label:'Salary',        value:`AED ${Number(emp.salary||0).toLocaleString()}/mo`, mono:false },
        ].map(row => {
          const Icon = row.icon
          return (
            <div key={row.label} style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 0', borderBottom:'1px solid #F5F4F1' }}>
              <Icon size={13} color="#C4B49A" style={{ flexShrink:0, width:18, textAlign:'center' }}/>
              <span style={{ fontSize:11.5, color:'#A89880', flex:1 }}>{row.label}</span>
              <span style={{ fontSize:12, color:'#1A1612', fontWeight:600, fontFamily:row.mono?'monospace':'Poppins,sans-serif', textAlign:'right', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.value}</span>
            </div>
          )
        })}

        {/* Salary formula */}
        <div style={{ margin:'12px 0 8px', background:'#F8F7FF', borderRadius:10, padding:'10px 12px' }}>
          <div style={{ fontSize:10, fontWeight:800, color:'#7C3AED', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:5 }}>Salary Formula</div>
          <div style={{ fontSize:11.5, color:'#6B5D4A', fontWeight:500 }}>
            {emp.project_type === 'cret'
              ? `AED ${emp.salary||0} + shipments × ${emp.per_shipment_rate||0.5}`
              : `AED ${emp.salary||0} + hrs × ${emp.hourly_rate||3.85} + ${emp.performance_bonus||100}`}
          </div>
        </div>

        {/* Doc expiry */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:7, margin:'8px 0 14px' }}>
          {[['Visa',emp.visa_expiry],['License',emp.license_expiry],['ILOE',emp.iloe_expiry]].map(([l,d])=>{
            const info = expiryInfo(d)
            return (
              <div key={l} style={{ textAlign:'center', padding:'9px 5px', borderRadius:11, background:info?.bg||'#FAFAF8', border:`1px solid ${info?info.color+'30':'#EAE6DE'}` }}>
                <div style={{ fontSize:10, fontWeight:700, color:info?.color||'#C4B49A', marginBottom:2 }}>{l}</div>
                <div style={{ fontSize:10, color:info?.color||'#A89880', fontWeight:600 }}>{info?.label||'N/A'}</div>
              </div>
            )
          })}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <button onClick={onEdit} className="btn btn-secondary" style={{ justifyContent:'center', borderRadius:12 }}>
            <Pencil size={13}/> Edit
          </button>
          <button onClick={onDelete} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px', borderRadius:12, background:'#FEF2F2', border:'1px solid #FCA5A5', color:'#C0392B', fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
            <Trash2 size={13}/> Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Employee Card ─────────────────────────────────────────────
function EmpCard({ emp, onClick, onEdit, onDelete, index }) {
  const s   = STATUS_CFG[emp.status] || STATUS_CFG.inactive
  const sc  = STATION_COLORS[emp.station_code] || '#B8860B'
  const exp = expiryInfo(emp.visa_expiry)
  const hasAlert = exp && (exp.label==='Expired' || parseInt(exp.label)<=60)

  return (
    <div onClick={onClick}
      style={{ background:'#FFF', border:`1px solid ${hasAlert?'#FCA5A5':'#EAE6DE'}`, borderRadius:16, padding:'14px 16px', cursor:'pointer', transition:'all 0.2s ease', animation:`slideUp 0.4s ${index*0.04}s ease both`, position:'relative', overflow:'hidden' }}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.08)';e.currentTarget.style.borderColor=hasAlert?'#F87171':'#D4C4A8'}}
      onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor=hasAlert?'#FCA5A5':'#EAE6DE'}}>

      {hasAlert && <div style={{ position:'absolute', top:10, right:10, width:8, height:8, borderRadius:'50%', background:'#C0392B', boxShadow:'0 0 0 3px rgba(192,57,43,0.2)', animation:'pulse-dot 2s infinite' }}/>}

      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:46, height:46, borderRadius:14, background:`linear-gradient(135deg,${STATION_BG[emp.station_code]||'#FDF6E3'},#FFF)`, border:`1.5px solid ${sc}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:sc, flexShrink:0, position:'relative' }}>
          {emp.name?.slice(0,2).toUpperCase()}
          <div style={{ position:'absolute', bottom:-2, right:-2, width:12, height:12, borderRadius:'50%', background:s.dot, border:'2px solid #FFF' }}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:14, color:'#1A1612', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{emp.name}</div>
          <div style={{ fontSize:11, color:'#A89880', marginTop:2, display:'flex', gap:5, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontFamily:'monospace' }}>{emp.id}</span>
            {emp.work_number && <><span>·</span><span style={{ color:'#6B5D4A' }}>{emp.work_number}</span></>}
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
          <span style={{ fontSize:11, fontWeight:800, color:sc, background:STATION_BG[emp.station_code]||'#FDF6E3', border:`1px solid ${sc}30`, borderRadius:8, padding:'2px 9px' }}>{emp.station_code||'DDB7'}</span>
          {emp.project_type && <span style={{ fontSize:10, fontWeight:600, color:'#7C3AED', background:'#F5F3FF', borderRadius:6, padding:'1px 7px' }}>{emp.project_type.toUpperCase()}</span>}
        </div>
      </div>

      <div style={{ display:'flex', gap:8, marginTop:10, paddingTop:10, borderTop:'1px solid #F5F4F1', alignItems:'center', flexWrap:'wrap' }}>
        <span style={{ flex:1, fontSize:11, fontWeight:600, color:s.c, display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:s.dot, display:'inline-block' }}/>{s.l}
        </span>
        {emp.phone && <span style={{ fontSize:11, color:'#6B5D4A', display:'flex', alignItems:'center', gap:3 }}><Phone size={10}/>{emp.phone}</span>}
        <button onClick={e=>{e.stopPropagation();onEdit(emp)}} style={{ padding:'4px 10px', borderRadius:7, background:'#F5F4F1', border:'none', cursor:'pointer', fontSize:11, color:'#6B5D4A', fontWeight:600, display:'flex', alignItems:'center', gap:4, fontFamily:'Poppins,sans-serif' }}>
          <Pencil size={11}/> Edit
        </button>
        <button onClick={e=>{e.stopPropagation();onDelete(emp)}} style={{ padding:'4px 8px', borderRadius:7, background:'#FEF2F2', border:'none', cursor:'pointer', color:'#C0392B', display:'flex', alignItems:'center', fontFamily:'Poppins,sans-serif' }}>
          <Trash2 size={11}/>
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [station,   setStation]   = useState('All')
  const [selected,  setSelected]  = useState(null)
  const [modal,     setModal]     = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const params = {}
      if (search)          params.search       = search
      if (station!=='All') params.station_code = station
      const data = await empApi.list(params)
      setEmployees(data.employees)
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [search, station])

  useEffect(() => { const t = setTimeout(load, 300); return ()=>clearTimeout(t) }, [load])

  useSocket({
    'employee:created': e     => setEmployees(p => [...p, e]),
    'employee:updated': e     => setEmployees(p => p.map(x => x.id===e.id ? e : x)),
    'employee:deleted': ({id})=> setEmployees(p => p.filter(x => x.id!==id)),
  })

  async function handleDelete(emp) {
    if (!confirm(`Delete ${emp.name}? This cannot be undone.`)) return
    try { await empApi.delete(emp.id); setEmployees(p=>p.filter(e=>e.id!==emp.id)); if(selected?.id===emp.id) setSelected(null) }
    catch(e) { alert(e.message) }
  }

  const total    = employees.length
  const active   = employees.filter(e=>e.status==='active').length
  const onLeave  = employees.filter(e=>e.status==='on_leave').length
  const alerts   = employees.filter(e=>{ const v=expiryInfo(e.visa_expiry); return v&&(v.label==='Expired'||parseInt(v.label)<=60) }).length

  return (
    <div style={{ display:'flex', gap:20, position:'relative' }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:14, minWidth:0 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontWeight:900, fontSize:20, color:'#1A1612', letterSpacing:'-0.03em' }}>Delivery Associates</h1>
            <p style={{ fontSize:12, color:'#A89880', marginTop:3 }}>{total} employees · {active} active</p>
          </div>
          <button className="btn btn-primary" onClick={()=>setModal({mode:'add',emp:null})} style={{ borderRadius:24 }}>
            <Plus size={15}/> Add DA
          </button>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {[
            { l:'Total',   v:total,   c:'#1A1612', bg:'#FAFAF8', bc:'#EAE6DE', icon:Users        },
            { l:'Active',  v:active,  c:'#2E7D52', bg:'#ECFDF5', bc:'#A7F3D0', icon:CheckCircle2 },
            { l:'On Leave',v:onLeave, c:'#B45309', bg:'#FFFBEB', bc:'#FCD34D', icon:Calendar      },
            { l:'Alerts',  v:alerts,  c:'#C0392B', bg:'#FEF2F2', bc:'#FCA5A5', icon:AlertCircle  },
          ].map((s,i)=>{
            const Icon=s.icon
            return (
              <div key={s.l} className="stat-card" style={{ padding:'14px 12px', textAlign:'center', background:s.bg, border:`1px solid ${s.bc}`, animationDelay:`${i*0.07}s` }}>
                <Icon size={20} color={s.c} style={{ margin:'0 auto 8px', display:'block' }}/>
                <div style={{ fontWeight:900, fontSize:22, color:s.c, letterSpacing:'-0.04em', lineHeight:1 }}>{s.v}</div>
                <div style={{ fontSize:10.5, color:s.c, fontWeight:600, marginTop:4, opacity:0.8 }}>{s.l}</div>
              </div>
            )
          })}
        </div>

        {/* Search + filters */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ flex:'1 1 200px', position:'relative' }}>
            <Search size={14} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#C4B49A', pointerEvents:'none' }}/>
            <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, ID, work number…" autoComplete="off" style={{ paddingLeft:38, borderRadius:24 }}/>
            {search && <button onClick={()=>setSearch('')} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#A89880', padding:0, display:'flex' }}><X size={13}/></button>}
          </div>
          <div style={{ display:'flex', gap:6, overflowX:'auto', scrollbarWidth:'none', flexShrink:0 }}>
            {STATIONS.map(s => {
              const color = STATION_COLORS[s]||'#6B5D4A'
              const isOn  = station === s
              return (
                <button key={s} onClick={()=>setStation(s)}
                  style={{ padding:'7px 14px', borderRadius:20, fontSize:12, fontWeight:isOn?700:500, cursor:'pointer', border:`1.5px solid ${isOn?color:'#EAE6DE'}`, background:isOn?(STATION_BG[s]||'#FDF6E3'):'#FFF', color:isOn?color:'#A89880', transition:'all 0.18s', boxShadow:isOn?`0 3px 10px ${color}20`:'none', whiteSpace:'nowrap' }}>
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[1,2,3,4].map(i=><div key={i} className="skeleton" style={{ height:90, borderRadius:16 }}/>)}
          </div>
        ) : employees.length===0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <Search size={40} style={{ margin:'0 auto 12px', display:'block', opacity:0.2 }}/>
            <div style={{ fontWeight:600, fontSize:15, color:'#6B5D4A' }}>{search?`No results for "${search}"`:'No employees found'}</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {employees.map((emp,i) => (
              <EmpCard key={emp.id} emp={emp} index={i}
                onClick={() => setSelected(selected?.id===emp.id ? null : emp)}
                onEdit={e => setModal({mode:'edit',emp:e})}
                onDelete={handleDelete}/>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ width:280, flexShrink:0, animation:'slideLeft 0.3s cubic-bezier(0.16,1,0.3,1)' }} className="emp-detail-panel">
          <div style={{ position:'sticky', top:0 }}>
            <DetailDrawer emp={selected} onEdit={()=>setModal({mode:'edit',emp:selected})} onDelete={()=>handleDelete(selected)} onClose={()=>setSelected(null)}/>
          </div>
        </div>
      )}

      {modal && <EmpModal mode={modal.mode} emp={modal.emp} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
    </div>
  )
}
