'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { empApi } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import { Search, Plus, X, Pencil, Trash2, ChevronDown } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'

const STATIONS = ['All','DDB7','DDB6','DSH6','DXD3']
const STATUS_CFG = {
  active:   { l:'Active',   c:'badge-success' },
  on_leave: { l:'On Leave', c:'badge-warning'  },
  inactive: { l:'Inactive', c:'badge-muted'    },
}
const CYCLES = ['A','B','C','Beset','MR','FM']
const CYCLE_HRS = { A:5, B:4, C:5, Beset:5, MR:4, FM:5 }

function expiryBadge(ds) {
  if (!ds) return null
  try {
    const d = differenceInDays(parseISO(ds.slice(0,10)), new Date())
    if (d < 0)   return <span className="badge badge-danger">Expired</span>
    if (d <= 30) return <span className="badge badge-danger">{d}d</span>
    if (d <= 90) return <span className="badge badge-warning">{d}d</span>
    return <span className="badge badge-success">OK</span>
  } catch { return null }
}

const EMPTY = {
  id:'', name:'', role:'Driver', dept:'Operations', status:'active',
  salary:'', joined:'', phone:'', nationality:'', zone:'',
  visa_expiry:'', license_expiry:'', avatar:'👤',
  station:'DDB7 Station', station_code:'DDB7',
  hourly_rate:'3.85', iloe_expiry:'', annual_leave_start:'',
  amazon_id:'', emirates_id:'', annual_leave_balance:30
}

// ── Standalone controlled inputs to avoid re-render focus loss ──
function Field({ label, value, onChange, type='text', options, hint }) {
  return (
    <div>
      <label className="input-label">{label}{hint && <span style={{fontSize:10,color:'#A89880',marginLeft:6}}>{hint}</span>}</label>
      {options
        ? (
          <select className="input" value={value||''} onChange={e => onChange(e.target.value)}>
            {options.map(o => <option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
          </select>
        ) : (
          <input
            className="input"
            type={type}
            value={value||''}
            onChange={e => onChange(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        )
      }
    </div>
  )
}

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
  } : EMPTY)
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)

  // Key: use functional update so setter is stable and never causes re-render of inputs
  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSave() {
    if (!form.name || !form.role || !form.dept) return setErr('Name, role, dept required')
    if (mode === 'add' && !form.id) return setErr('Employee ID required (e.g. DA001)')
    setSaving(true); setErr(null)
    try {
      const data = { ...form, salary: Number(form.salary)||0, hourly_rate: Number(form.hourly_rate)||3.85 }
      if (mode === 'add') await empApi.create(data)
      else                await empApi.update(form.id, data)
      onSave()
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  // Helper renders — defined as plain functions returning JSX, NOT as components
  // This avoids React treating them as new component types on each render
  function inp(label, k, type='text', hint) {
    return (
      <div key={k}>
        <label className="input-label">{label}{hint && <span style={{fontSize:10,color:'#A89880',marginLeft:6}}>{hint}</span>}</label>
        <input className="input" type={type} value={form[k]||''} autoComplete="off" spellCheck={false}
          onChange={e => set(k, e.target.value)} />
      </div>
    )
  }
  function sel(label, k, options) {
    return (
      <div key={k}>
        <label className="input-label">{label}</label>
        <select className="input" value={form[k]||''} onChange={e => set(k, e.target.value)}>
          {options.map(o => <option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
        </select>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:620 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h2 style={{ fontWeight:700, fontSize:17, color:'#1A1612' }}>{mode==='add'?'Add Employee':'Edit Employee'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18}/></button>
        </div>
        {err && <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:9, padding:'10px 14px', fontSize:13, color:'#C0392B', marginBottom:14 }}>{err}</div>}

        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#C4B49A', marginBottom:10 }}>Identity</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:18 }}>
          {mode==='add' && inp('Employee ID *', 'id', 'text', 'e.g. DA001')}
          {inp('Full Name *',   'name')}
          {inp('Amazon DA ID',  'amazon_id',  'text', 'Amazon badge number')}
          {inp('Emirates ID',   'emirates_id')}
          {inp('Phone',         'phone')}
          {inp('Nationality',   'nationality')}
          {inp('Avatar Emoji',  'avatar')}
        </div>

        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#C4B49A', marginBottom:10 }}>Work Details</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:18 }}>
          {sel('Role *',       'role',         ['Driver','HR Manager','Finance Mgr','Dispatcher','Admin','POC','Other'])}
          {sel('Department *', 'dept',         ['Operations','HR','Finance','Admin','Other'])}
          {sel('Station',      'station_code', ['DDB7','DDB6','DSH6','DXD3'])}
          {sel('Status',       'status',       [{v:'active',l:'Active'},{v:'on_leave',l:'On Leave'},{v:'inactive',l:'Inactive'}])}
          {inp('Salary (AED/month)',              'salary',               'number')}
          {inp('Hourly Rate (AED)',               'hourly_rate',          'number', '3.85 or 3.00')}
          {inp('Start Date',                      'joined',               'date')}
          {inp('Annual Leave Start',              'annual_leave_start',   'date',   'Date leave cycle started')}
          {inp('Annual Leave Balance (days)',      'annual_leave_balance', 'number')}
        </div>

        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#C4B49A', marginBottom:10 }}>Documents & Expiry</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {inp('Visa Expiry',    'visa_expiry',    'date')}
          {inp('License Expiry', 'license_expiry', 'date')}
          {inp('ILOE Expiry',    'iloe_expiry',    'date', 'ILOE insurance expiry')}
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:22 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : mode==='add' ? 'Add Employee' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}


export default function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [station,   setStation]   = useState('All')
  const [selected,  setSelected]  = useState(null)
  const [modal,     setModal]     = useState(null)
  const searchRef   = useRef(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const params = {}
      if (search && search.length > 0) params.search = search
      if (station !== 'All') params.station_code = station
      const data = await empApi.list(params)
      setEmployees(data.employees)
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [search, station])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => load(), 300)
    return () => clearTimeout(t)
  }, [load])

  useSocket({
    'employee:created': e  => setEmployees(p => [...p, e]),
    'employee:updated': e  => setEmployees(p => p.map(x => x.id===e.id ? e : x)),
    'employee:deleted': ({id}) => setEmployees(p => p.filter(x => x.id!==id)),
  })

  async function handleDelete(emp) {
    if (!confirm(`Delete ${emp.name}? This cannot be undone.`)) return
    try {
      await empApi.delete(emp.id)
      setEmployees(p => p.filter(e => e.id!==emp.id))
      if (selected?.id === emp.id) setSelected(null)
    } catch(e) { alert(e.message) }
  }

  const counts = {
    total:    employees.length,
    active:   employees.filter(e=>e.status==='active').length,
    on_leave: employees.filter(e=>e.status==='on_leave').length,
    inactive: employees.filter(e=>e.status==='inactive').length,
  }

  return (
    <div style={{ display:'flex', gap:16, position:'relative' }}>
      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:14, minWidth:0 }}>

        {/* Toolbar */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {/* Search — kept outside any re-rendering parent */}
          <div className="search-wrap" style={{ flex:'1 1 200px' }}>
            <Search className="search-icon" size={14}/>
            <input
              ref={searchRef}
              className="input"
              placeholder="Search name, ID or Amazon ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoComplete="off"
            />
            {search && (
              <button onClick={()=>setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#A89880', padding:0 }}>
                <X size={13}/>
              </button>
            )}
          </div>

          {/* Station filter */}
          {STATIONS.map(s => (
            <button key={s} onClick={()=>setStation(s)}
              className={`btn btn-sm ${station===s?'btn-primary':'btn-secondary'}`}>
              {s}
            </button>
          ))}

          <button className="btn btn-primary" onClick={()=>setModal({mode:'add',emp:null})}>
            <Plus size={14}/> Add DA
          </button>
        </div>

        {/* Summary chips */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {[{l:'Total',v:counts.total,c:'#6B5D4A'},{l:'Active',v:counts.active,c:'#2E7D52'},{l:'On Leave',v:counts.on_leave,c:'#B45309'},{l:'Inactive',v:counts.inactive,c:'#C0392B'}].map((s,i)=>(
            <div key={s.l} style={{ background:'#FFFFFF', border:'1px solid #EAE6DE', borderRadius:10, padding:'8px 14px', display:'flex', gap:8, alignItems:'center', animation:`slideUp 0.3s ${i*0.05}s ease both` }}>
              <span style={{ fontSize:20, fontWeight:800, color:s.c, letterSpacing:'-0.03em' }}>{s.v}</span>
              <span style={{ fontSize:12, color:'#A89880', fontWeight:500 }}>{s.l}</span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          {loading ? <div style={{ padding:40, textAlign:'center', color:'#A89880' }}>Loading…</div> : (
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr>
                  <th>Employee</th><th>Amazon ID</th><th>Station</th>
                  <th>Status</th><th className="hide-mobile">Rate</th>
                  <th>Visa</th><th className="hide-mobile">ILOE</th><th></th>
                </tr></thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} style={{ cursor:'pointer' }} onClick={() => setSelected(emp)}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                          <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#FDF6E3,#FEF3D0)', border:'1px solid #F0D78C', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{emp.avatar}</div>
                          <div>
                            <div style={{ color:'#1A1612', fontWeight:600, fontSize:13 }}>{emp.name}</div>
                            <div style={{ fontSize:10.5, color:'#C4B49A', fontFamily:'monospace' }}>{emp.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily:'monospace', fontSize:12, color:'#6B5D4A' }}>{emp.amazon_id||'—'}</td>
                      <td><span style={{ fontSize:12, fontWeight:700, color:'#B8860B', background:'#FDF6E3', border:'1px solid #F0D78C', borderRadius:6, padding:'2px 8px' }}>{emp.station_code||'DDB7'}</span></td>
                      <td><span className={`badge ${STATUS_CFG[emp.status]?.c||'badge-muted'}`}>{STATUS_CFG[emp.status]?.l||emp.status}</span></td>
                      <td className="hide-mobile" style={{ fontFamily:'monospace', fontSize:12 }}>AED {emp.hourly_rate}/hr</td>
                      <td>{expiryBadge(emp.visa_expiry) ?? <span style={{ color:'#C4B49A', fontSize:12 }}>—</span>}</td>
                      <td className="hide-mobile">{expiryBadge(emp.iloe_expiry) ?? <span style={{ color:'#C4B49A', fontSize:12 }}>—</span>}</td>
                      <td onClick={e=>e.stopPropagation()}>
                        <div style={{ display:'flex', gap:5 }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setModal({mode:'edit',emp})}><Pencil size={13}/></button>
                          <button className="btn btn-ghost btn-icon btn-sm" style={{ color:'#C0392B' }} onClick={()=>handleDelete(emp)}><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {employees.length===0 && <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'#A89880' }}>
                    {search ? `No results for "${search}"` : 'No employees found'}
                  </td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="detail-panel" style={{ width:280, flexShrink:0, animation:'slideLeft 0.25s ease' }}>
          <div className="card" style={{ position:'sticky', top:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ fontSize:13, fontWeight:700, color:'#1A1612' }}>DA Profile</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setSelected(null)}><X size={15}/></button>
            </div>

            {/* Avatar + name */}
            <div style={{ textAlign:'center', marginBottom:16 }}>
              <div style={{ width:60, height:60, borderRadius:16, background:'linear-gradient(135deg,#FDF6E3,#FEF3D0)', border:'2px solid #F0D78C', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 10px' }}>{selected.avatar}</div>
              <div style={{ fontWeight:700, fontSize:15, color:'#1A1612', marginBottom:2 }}>{selected.name}</div>
              <div style={{ fontSize:11.5, color:'#A89880' }}>{selected.role}</div>
              <div style={{ display:'flex', gap:6, justifyContent:'center', marginTop:8, flexWrap:'wrap' }}>
                <span className={`badge ${STATUS_CFG[selected.status]?.c}`}>{STATUS_CFG[selected.status]?.l}</span>
                <span style={{ fontSize:12, fontWeight:700, color:'#B8860B', background:'#FDF6E3', border:'1px solid #F0D78C', borderRadius:6, padding:'2px 8px' }}>{selected.station_code||'DDB7'}</span>
              </div>
            </div>

            {/* Details */}
            {[
              ['Employee ID',     selected.id,                        true],
              ['Amazon DA ID',    selected.amazon_id||'—',            true],
              ['Emirates ID',     selected.emirates_id||'—',          false],
              ['Nationality',     selected.nationality||'—',           false],
              ['Phone',           selected.phone||'—',                 false],
              ['Salary',          `AED ${Number(selected.salary).toLocaleString()}/mo`, false],
              ['Hourly Rate',     `AED ${selected.hourly_rate}/hr`,   false],
              ['Start Date',      selected.joined?.slice(0,10)||'—',  false],
              ['AL Start',        selected.annual_leave_start?.slice(0,10)||'—', false],
              ['AL Balance',      `${selected.annual_leave_balance||0} days`, false],
            ].map(([l,v,mono]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #F5F4F1' }}>
                <span style={{ fontSize:11, color:'#A89880' }}>{l}</span>
                <span style={{ fontSize:12, color:'#1A1612', fontWeight:600, fontFamily:mono?'monospace':'inherit', textAlign:'right', maxWidth:150 }}>{v}</span>
              </div>
            ))}

            {/* Expiry section */}
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#C4B49A', marginBottom:8 }}>Document Expiry</div>
              {[['Visa',    selected.visa_expiry],['License', selected.license_expiry],['ILOE',    selected.iloe_expiry]].map(([l,d])=>(
                <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid #F5F4F1' }}>
                  <span style={{ fontSize:11, color:'#A89880' }}>{l}</span>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    {d && <span style={{ fontSize:10.5, color:'#C4B49A', fontFamily:'monospace' }}>{d.slice(0,10)}</span>}
                    {expiryBadge(d) ?? <span style={{ fontSize:11, color:'#C4B49A' }}>—</span>}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', gap:8, marginTop:14 }}>
              <button className="btn btn-secondary btn-sm" style={{ flex:1, justifyContent:'center' }} onClick={()=>setModal({mode:'edit',emp:selected})}><Pencil size={12}/> Edit</button>
              <button className="btn btn-danger btn-sm"    style={{ flex:1, justifyContent:'center' }} onClick={()=>handleDelete(selected)}><Trash2 size={12}/> Delete</button>
            </div>
          </div>
        </div>
      )}

      {modal && <EmpModal mode={modal.mode} emp={modal.emp} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load()}}/>}
    </div>
  )
}
