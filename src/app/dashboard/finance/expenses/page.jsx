'use client'
import { useState, useEffect, useCallback } from 'react'
import { expenseApi, empApi } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import { Plus, Check, X, Receipt } from 'lucide-react'

const S = { approved:{l:'Approved',c:'badge-success'}, pending:{l:'Pending',c:'badge-warning'}, rejected:{l:'Rejected',c:'badge-danger'} }
const CC = { Fuel:'#1D6FA4', Maintenance:'#B45309', Training:'#B8860B', Software:'#7C3AED', Office:'#2E7D52' }

function AddExpenseModal({ employees, onSave, onClose }) {
  const [form, setForm] = useState({ emp_id:'', category:'Fuel', amount:'', date:new Date().toISOString().slice(0,10), description:'' })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  async function handleSave() {
    if (!form.emp_id||!form.amount) return
    setSaving(true)
    try { await expenseApi.create(form); onSave() }
    catch(e) { alert(e.message) } finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:400}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <h3 style={{fontWeight:700,fontSize:16,color:'#1A1612'}}>Submit Expense</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17}/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div><label className="input-label">Employee *</label>
            <select className="input" value={form.emp_id} onChange={e=>set('emp_id',e.target.value)}>
              <option value="">Select…</option>{employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div><label className="input-label">Category</label>
            <select className="input" value={form.category} onChange={e=>set('category',e.target.value)}>
              {['Fuel','Maintenance','Training','Software','Office','Other'].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="input-label">Amount (AED) *</label><input className="input" type="number" value={form.amount} onChange={e=>set('amount',e.target.value)} placeholder="0.00"/></div>
          <div><label className="input-label">Date</label><input className="input" type="date" value={form.date} onChange={e=>set('date',e.target.value)}/></div>
          <div><label className="input-label">Description</label><input className="input" value={form.description} onChange={e=>set('description',e.target.value)}/></div>
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:18}}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Submit'}</button>
        </div>
      </div>
    </div>
  )
}

export default function ExpensesPage() {
  const [expenses,  setExpenses]  = useState([])
  const [employees, setEmployees] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('All')
  const [modal,     setModal]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ex, emps] = await Promise.all([expenseApi.list(), empApi.list()])
      setExpenses(ex.expenses); setEmployees(emps.employees)
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useSocket({
    'expense:created': e => setExpenses(p=>[e,...p]),
    'expense:updated': e => setExpenses(p=>p.map(x=>x.id===e.id?{...x,...e}:x)),
  })

  async function setStatus(id, status) {
    try { const d=await expenseApi.setStatus(id,status); setExpenses(p=>p.map(x=>x.id===d.expense.id?{...x,...d.expense}:x)) }
    catch(e) { alert(e.message) }
  }

  const filtered = filter==='All' ? expenses : expenses.filter(e=>e.status===filter.toLowerCase())
  const pending  = expenses.filter(e=>e.status==='pending').reduce((s,e)=>s+Number(e.amount),0)
  const approved = expenses.filter(e=>e.status==='approved').reduce((s,e)=>s+Number(e.amount),0)
  const total    = expenses.reduce((s,e)=>s+Number(e.amount),0)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,animation:'slideUp 0.35s ease'}}>
      <div className="stat-grid-3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        {[{l:'Total',v:`AED ${total.toLocaleString()}`,c:'#1A1612'},{l:'Pending',v:`AED ${pending.toLocaleString()}`,c:'#B45309'},{l:'Approved',v:`AED ${approved.toLocaleString()}`,c:'#2E7D52'}].map((s,i)=>(
          <div key={s.l} className="stat-card" style={{animationDelay:`${i*0.07}s`}}>
            <Receipt size={16} color="#B8860B" style={{marginBottom:10,opacity:0.6}}/>
            <div style={{fontWeight:800,fontSize:20,color:s.c,letterSpacing:'-0.03em',marginBottom:3}}>{s.v}</div>
            <div style={{fontSize:12,color:'#A89880',fontWeight:500}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div className="tabs">
          {['All','Pending','Approved','Rejected'].map(f=><button key={f} className={`tab${filter===f?' active':''}`} onClick={()=>setFilter(f)}>{f}</button>)}
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>setModal(true)}><Plus size={13}/> Submit Expense</button>
      </div>
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        {loading ? <div style={{padding:40,textAlign:'center',color:'#A89880'}}>Loading…</div> : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Employee</th><th>Category</th><th className="hide-mobile">Description</th><th className="hide-mobile">Date</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(exp=>{
                  const col=CC[exp.category]||'#B8860B'
                  return (
                    <tr key={exp.id}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:15}}>{exp.avatar||'👤'}</span>
                          <span style={{color:'#1A1612',fontWeight:600,fontSize:13}}>{exp.name?.split(' ')[0]}</span>
                        </div>
                      </td>
                      <td><span style={{fontSize:11.5,padding:'3px 9px',borderRadius:6,background:`${col}15`,color:col,fontWeight:600,border:`1px solid ${col}30`}}>{exp.category}</span></td>
                      <td className="hide-mobile" style={{maxWidth:200,fontSize:12,color:'#6B5D4A'}}>{exp.description||'—'}</td>
                      <td className="hide-mobile" style={{fontFamily:'monospace',fontSize:11.5}}>{exp.date?.slice(0,10)}</td>
                      <td style={{fontWeight:700,color:'#B8860B',fontFamily:'monospace',fontSize:13}}>AED {Number(exp.amount).toLocaleString()}</td>
                      <td><span className={`badge ${S[exp.status]?.c}`}>{S[exp.status]?.l}</span></td>
                      <td>{exp.status==='pending'&&(<div style={{display:'flex',gap:6}}>
                        <button className="btn btn-success btn-sm" style={{padding:'5px 10px'}} onClick={()=>setStatus(exp.id,'approved')}><Check size={12}/></button>
                        <button className="btn btn-danger  btn-sm" style={{padding:'5px 10px'}} onClick={()=>setStatus(exp.id,'rejected')}><X size={12}/></button>
                      </div>)}</td>
                    </tr>
                  )
                })}
                {filtered.length===0&&<tr><td colSpan={7} style={{textAlign:'center',padding:40,color:'#A89880'}}>No expenses found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal && <AddExpenseModal employees={employees} onClose={()=>setModal(false)} onSave={()=>{setModal(false);load()}}/>}
    </div>
  )
}
