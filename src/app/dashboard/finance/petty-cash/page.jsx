'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import {
  Wallet, Plus, ArrowDownLeft, ArrowUpRight,
  ChevronLeft, ChevronRight, X, Users, Trash2,
  TrendingUp, TrendingDown, User, Search, Receipt,
  HandCoins, AlertCircle,
} from 'lucide-react'
import { API } from '@/lib/api'

const hdr = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('gcd_token') : ''}`,
})

const EXPENSE_TYPES = [
  'ADVANCES', 'AIR TICKETS', 'CASH VARIANCE', 'FINE', 'Fuel',
  'INCENTIVE', 'INCENTIVE DEDUCTIONS', 'Miscellaneous Exp.', 'Mobile Expenses',
  'OverTime', 'Parking Fee', 'RTA PARKING TOPUP', 'RTA TOPUP',
  'Salik', 'Vehicle Damage', 'Vehicle Expenses',
]

const ROLE_LABELS = {
  admin: 'Admin', general_manager: 'Manager', hr: 'HR',
  accountant: 'Accountant', poc: 'POC', manager: 'Manager',
}

function fmt(n) {
  return `AED ${Math.abs(Number(n || 0)).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function Lbl({ children }) {
  return (
    <label style={{ display:'block', fontSize:10.5, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:5 }}>
      {children}
    </label>
  )
}

/* ── Driver Picker ─────────────────────────────────────────── */
function DriverPicker({ drivers, value, onChange }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const selected = drivers.find(d => d.id === value)
  const filtered = drivers.filter(d =>
    !q || d.name.toLowerCase().includes(q.toLowerCase()) || d.id.toLowerCase().includes(q.toLowerCase())
  )
  return (
    <div style={{ position:'relative' }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-alt)', cursor:'pointer', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <User size={14} color="var(--text-muted)"/>
          <span style={{ fontSize:13, color: selected ? 'var(--text)' : 'var(--text-muted)', fontWeight: selected ? 600 : 400 }}>
            {selected ? `${selected.name} · ${selected.id}` : 'Select driver (optional)…'}
          </span>
        </div>
        <ChevronRight size={13} color="var(--text-muted)" style={{ transform: open ? 'rotate(90deg)' : 'none', transition:'transform 0.15s' }}/>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:100, overflow:'hidden' }}>
          <div style={{ padding:'8px 10px', borderBottom:'1px solid var(--border)', position:'relative' }}>
            <Search size={12} style={{ position:'absolute', left:20, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search driver…"
              style={{ width:'100%', padding:'6px 8px 6px 28px', borderRadius:8, border:'1px solid var(--border)', fontSize:12, background:'var(--bg-alt)', color:'var(--text)', fontFamily:'Poppins,sans-serif', outline:'none' }}
              onClick={e => e.stopPropagation()} autoFocus/>
          </div>
          <div style={{ maxHeight:200, overflowY:'auto' }}>
            <div onClick={() => { onChange(''); setOpen(false); setQ('') }}
              style={{ padding:'9px 14px', cursor:'pointer', fontSize:12, color:'var(--text-muted)', fontStyle:'italic' }}
              onMouseEnter={e => e.currentTarget.style.background='var(--bg-alt)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              — No driver
            </div>
            {filtered.map(d => (
              <div key={d.id} onClick={() => { onChange(d.id); setOpen(false); setQ('') }}
                style={{ padding:'9px 14px', cursor:'pointer', display:'flex', gap:8, alignItems:'center', background: d.id === value ? '#FDF6E3' : 'transparent' }}
                onMouseEnter={e => { if (d.id !== value) e.currentTarget.style.background='var(--bg-alt)' }}
                onMouseLeave={e => { if (d.id !== value) e.currentTarget.style.background='transparent' }}>
                <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,#B8860B,#D4A017)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'white', flexShrink:0 }}>
                  {d.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize:12.5, fontWeight:600, color:'var(--text)' }}>{d.name}</div>
                  <div style={{ fontSize:10.5, color:'var(--text-muted)' }}>{d.id} · {d.station_code||'—'}</div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding:'16px', textAlign:'center', fontSize:12, color:'var(--text-muted)' }}>No drivers found</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Expense Modal ──────────────────────────────────────────── */
function ExpenseModal({ drivers, onSave, onClose }) {
  const [form, setForm] = useState({
    expense_type:'', amount:'', note:'',
    date: new Date().toISOString().slice(0,10),
    emp_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  async function handleSave() {
    if (!form.expense_type || !form.amount) return setErr('Expense type and amount required')
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) return setErr('Amount must be positive')
    setSaving(true); setErr(null)
    try {
      const res = await fetch(`${API}/api/petty-cash/expense`, {
        method:'POST', headers: hdr(),
        body: JSON.stringify({ expense_type:form.expense_type, amount:amt, note:form.note||null, date:form.date, emp_id:form.emp_id||null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSave()
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
      <div style={{ background:'var(--card)', borderRadius:20, width:'100%', maxWidth:460, border:'1px solid var(--border)', overflow:'hidden', animation:'slideUp 0.2s ease' }}>
        {/* Header */}
        <div style={{ padding:'18px 22px', background:'linear-gradient(135deg,#1A1612,#2C1F0A)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:'rgba(184,134,11,0.2)', border:'1px solid rgba(184,134,11,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Receipt size={17} color="#D4A017"/>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:'white' }}>Record Expense</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:1 }}>Log a petty cash expense</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', display:'flex', padding:6, borderRadius:8 }}><X size={16}/></button>
        </div>

        <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
          {err && (
            <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#DC2626', display:'flex', gap:8, alignItems:'center' }}>
              <AlertCircle size={14}/> {err}
            </div>
          )}

          <div>
            <Lbl>Expense Type *</Lbl>
            <select className="input" value={form.expense_type} onChange={set('expense_type')} style={{ borderRadius:10 }}>
              <option value="">Select type…</option>
              {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <Lbl>Amount (AED) *</Lbl>
              <input className="input" type="number" min="0.01" step="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00" style={{ borderRadius:10 }}/>
            </div>
            <div>
              <Lbl>Date *</Lbl>
              <input className="input" type="date" value={form.date} onChange={set('date')} style={{ borderRadius:10 }}/>
            </div>
          </div>

          <div>
            <Lbl>Driver (optional)</Lbl>
            <DriverPicker drivers={drivers} value={form.emp_id} onChange={v => setForm(p => ({ ...p, emp_id:v }))}/>
          </div>

          <div>
            <Lbl>Note (optional)</Lbl>
            <input className="input" value={form.note} onChange={set('note')} placeholder="Add a note…" style={{ borderRadius:10 }}/>
          </div>

          <button onClick={handleSave} disabled={saving}
            style={{ padding:'13px', borderRadius:12, border:'none', cursor:saving?'not-allowed':'pointer', background:saving?'var(--border)':'linear-gradient(135deg,#B8860B,#D4A017)', color:saving?'var(--text-muted)':'white', fontWeight:700, fontSize:14, fontFamily:'Poppins,sans-serif', marginTop:4, transition:'all 0.2s', boxShadow: saving ? 'none' : '0 4px 14px rgba(184,134,11,0.35)' }}>
            {saving ? 'Saving…' : 'Record Expense'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Give Cash Modal ────────────────────────────────────────── */
function GiveCashModal({ users, onSave, onClose }) {
  const [form, setForm] = useState({
    user_id:'', amount:'', note:'',
    date: new Date().toISOString().slice(0,10),
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  async function handleSave() {
    if (!form.user_id || !form.amount) return setErr('Recipient and amount required')
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) return setErr('Amount must be positive')
    setSaving(true); setErr(null)
    try {
      const res = await fetch(`${API}/api/petty-cash/allocate`, {
        method:'POST', headers: hdr(),
        body: JSON.stringify({ user_id:form.user_id, amount:amt, note:form.note||null, date:form.date }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSave()
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  const selected = users.find(u => u.id === form.user_id)

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
      <div style={{ background:'var(--card)', borderRadius:20, width:'100%', maxWidth:460, border:'1px solid var(--border)', overflow:'hidden', animation:'slideUp 0.2s ease' }}>
        {/* Header */}
        <div style={{ padding:'18px 22px', background:'linear-gradient(135deg,#0F3D1F,#1A5C2E)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:'rgba(46,125,82,0.25)', border:'1px solid rgba(46,125,82,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <HandCoins size={17} color="#4ADE80"/>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:'white' }}>Give Cash</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:1 }}>Allocate petty cash to a team member</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', display:'flex', padding:6, borderRadius:8 }}><X size={16}/></button>
        </div>

        <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
          {err && (
            <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#DC2626', display:'flex', gap:8, alignItems:'center' }}>
              <AlertCircle size={14}/> {err}
            </div>
          )}

          <div>
            <Lbl>Give To *</Lbl>
            <select className="input" value={form.user_id} onChange={set('user_id')} style={{ borderRadius:10 }}>
              <option value="">Select recipient…</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} — {ROLE_LABELS[u.role]||u.role}</option>
              ))}
            </select>
            {selected && (
              <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'#ECFDF5', border:'1px solid #A7F3D0', borderRadius:9 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:'#2E7D52', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'white' }}>
                  {selected.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div style={{ fontSize:12, fontWeight:600, color:'#2E7D52' }}>{selected.name} · {ROLE_LABELS[selected.role]||selected.role}</div>
              </div>
            )}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <Lbl>Amount (AED) *</Lbl>
              <input className="input" type="number" min="0.01" step="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00" style={{ borderRadius:10 }}/>
            </div>
            <div>
              <Lbl>Date *</Lbl>
              <input className="input" type="date" value={form.date} onChange={set('date')} style={{ borderRadius:10 }}/>
            </div>
          </div>

          <div>
            <Lbl>Note (optional)</Lbl>
            <input className="input" value={form.note} onChange={set('note')} placeholder="e.g. March operational expenses" style={{ borderRadius:10 }}/>
          </div>

          <button onClick={handleSave} disabled={saving}
            style={{ padding:'13px', borderRadius:12, border:'none', cursor:saving?'not-allowed':'pointer', background:saving?'var(--border)':'linear-gradient(135deg,#2E7D52,#22C55E)', color:saving?'var(--text-muted)':'white', fontWeight:700, fontSize:14, fontFamily:'Poppins,sans-serif', marginTop:4, transition:'all 0.2s', boxShadow: saving?'none':'0 4px 14px rgba(46,125,82,0.35)' }}>
            {saving ? 'Processing…' : 'Give Cash'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Transaction Row ────────────────────────────────────────── */
function TxRow({ record, canDelete, onDelete }) {
  const isAlloc = record.type === 'allocation'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid var(--border)', transition:'background 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background='var(--bg-alt)'}
      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
      <div style={{ width:38, height:38, borderRadius:11, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background: isAlloc ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)' }}>
        {isAlloc ? <ArrowDownLeft size={16} color="#22C55E"/> : <ArrowUpRight size={16} color="#EF4444"/>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>
          {isAlloc ? 'Cash Received' : record.expense_type}
        </div>
        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2, display:'flex', gap:6, flexWrap:'wrap' }}>
          {record.emp_name && (
            <span style={{ color:'#B8860B', fontWeight:600, display:'flex', alignItems:'center', gap:3 }}>
              <User size={9}/> {record.emp_name}
            </span>
          )}
          {record.note && <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:180 }}>{record.note}</span>}
          {!record.note && !record.emp_name && (
            <span>{isAlloc ? `From ${record.created_by_name||'Accountant'}` : record.date}</span>
          )}
        </div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:13, fontWeight:800, color: isAlloc ? '#22C55E' : '#EF4444' }}>
          {isAlloc ? '+' : '-'}{fmt(record.amount)}
        </div>
        <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{record.date}</div>
      </div>
      {canDelete && (
        <button onClick={() => onDelete(record.id)}
          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4, display:'flex', borderRadius:6, flexShrink:0 }}
          onMouseEnter={e => e.currentTarget.style.color='#EF4444'}
          onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>
          <Trash2 size={13}/>
        </button>
      )}
    </div>
  )
}

/* ── Balance Card ───────────────────────────────────────────── */
function BalanceCard({ balance, total_allocated, total_spent }) {
  const isNeg  = balance < 0
  const isZero = balance === 0
  const color  = isNeg ? '#EF4444' : isZero ? '#10B981' : '#F59E0B'
  const bg     = isNeg ? 'linear-gradient(135deg,#FEF2F2,#FEE2E2)' : isZero ? 'linear-gradient(135deg,#F0FDF4,#DCFCE7)' : 'linear-gradient(135deg,#FFFBEB,#FEF3C7)'
  const border = isNeg ? '#FECACA' : isZero ? '#BBF7D0' : '#FDE68A'

  return (
    <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:18, padding:'22px 24px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:color }}/>
        <span style={{ fontSize:10.5, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'0.06em' }}>Your Balance</span>
      </div>
      <div style={{ fontSize:36, fontWeight:900, color, letterSpacing:'-0.04em', lineHeight:1, marginBottom:8 }}>
        {isNeg ? '-' : ''}{fmt(balance)}
      </div>
      <div style={{ fontSize:12, color, opacity:0.75, marginBottom:18 }}>
        {isNeg ? `${fmt(Math.abs(balance))} remaining to record` : isZero ? 'Fully accounted — nothing pending' : 'Cash received — expenses pending'}
      </div>
      <div style={{ display:'flex', gap:0, background:'rgba(255,255,255,0.6)', borderRadius:12, overflow:'hidden', border:`1px solid ${border}` }}>
        <div style={{ flex:1, padding:'12px 16px' }}>
          <div style={{ fontSize:9.5, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700, marginBottom:4, display:'flex', alignItems:'center', gap:4 }}>
            <TrendingDown size={10} color="#22C55E"/> Received
          </div>
          <div style={{ fontSize:15, fontWeight:800, color:'#22C55E' }}>{fmt(total_allocated)}</div>
        </div>
        <div style={{ width:1, background:border }}/>
        <div style={{ flex:1, padding:'12px 16px' }}>
          <div style={{ fontSize:9.5, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700, marginBottom:4, display:'flex', alignItems:'center', gap:4 }}>
            <TrendingUp size={10} color="#EF4444"/> Spent
          </div>
          <div style={{ fontSize:15, fontWeight:800, color:'#EF4444' }}>{fmt(total_spent)}</div>
        </div>
      </div>
    </div>
  )
}

/* ── User Detail Panel ──────────────────────────────────────── */
function UserDetailPanel({ userId, userName, userRole, onBack, canDelete }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/petty-cash/user/${userId}`, { headers: hdr() })
      setData(await res.json())
    } catch {} finally { setLoading(false) }
  }, [userId])

  useEffect(() => { load() }, [load])

  async function handleDelete(id) {
    if (!confirm('Delete this record?')) return
    await fetch(`${API}/api/petty-cash/${id}`, { method:'DELETE', headers:hdr() })
    load()
  }

  const balance = Number(data?.balance || 0)
  const isNeg   = balance < 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <button onClick={onBack}
        style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:13, fontWeight:600, padding:0, fontFamily:'Poppins,sans-serif', alignSelf:'flex-start' }}>
        <ChevronLeft size={14}/> Back to Overview
      </button>

      {/* User balance card */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, overflow:'hidden' }}>
        <div style={{ background:'linear-gradient(135deg,#1A1612,#2C1F0A)', padding:'20px 22px', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:'rgba(184,134,11,0.2)', border:'1px solid rgba(184,134,11,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, color:'#D4A017', flexShrink:0 }}>
            {userName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:16, color:'white' }}>{userName}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:2 }}>{ROLE_LABELS[userRole]||userRole}</div>
          </div>
        </div>
        <div style={{ padding:'20px 22px' }}>
          <div style={{ fontSize:28, fontWeight:900, color: isNeg?'#EF4444':'#22C55E', letterSpacing:'-0.03em', marginBottom:14 }}>
            {isNeg?'-':''}{fmt(balance)}
          </div>
          <div style={{ display:'flex', gap:0, borderRadius:12, overflow:'hidden', border:'1px solid var(--border)' }}>
            <div style={{ flex:1, padding:'11px 14px', background:'var(--bg-alt)' }}>
              <div style={{ fontSize:9.5, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700, marginBottom:3 }}>Received</div>
              <div style={{ fontSize:14, fontWeight:800, color:'#22C55E' }}>{fmt(data?.total_allocated||0)}</div>
            </div>
            <div style={{ width:1, background:'var(--border)' }}/>
            <div style={{ flex:1, padding:'11px 14px', background:'var(--bg-alt)' }}>
              <div style={{ fontSize:9.5, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700, marginBottom:3 }}>Spent</div>
              <div style={{ fontSize:14, fontWeight:800, color:'#EF4444' }}>{fmt(data?.total_spent||0)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:13.5, color:'var(--text)' }}>Transaction History</div>
        {loading ? (
          <div style={{ padding:32, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>Loading…</div>
        ) : !data?.records?.length ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>No transactions yet</div>
        ) : (
          data.records.map(r => <TxRow key={r.id} record={r} canDelete={canDelete} onDelete={handleDelete}/>)
        )}
      </div>
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────────────── */
export default function PettyCashPage() {
  const { user }  = useAuth()
  const [myData,   setMyData]   = useState(null)
  const [summary,  setSummary]  = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [drivers,  setDrivers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)
  const [drillUser, setDrillUser] = useState(null)
  const [tab,      setTab]      = useState('my')

  const canGiveCash = ['admin','accountant'].includes(user?.role)
  const canViewTeam = ['admin','accountant','general_manager','manager'].includes(user?.role)
  const canDelete   = ['admin','accountant'].includes(user?.role)

  const load = useCallback(async () => {
    try {
      const h = { headers: hdr() }
      const fetches = [
        fetch(`${API}/api/petty-cash/my`, h).then(r => r.json()),
        fetch(`${API}/api/employees`, h).then(r => r.json()),
      ]
      if (canViewTeam) {
        fetches.push(
          fetch(`${API}/api/petty-cash/summary`, h).then(r => r.json()),
          fetch(`${API}/api/auth/users`, h).then(r => r.json()),
        )
      }
      const results = await Promise.all(fetches)
      setMyData(results[0])
      setDrivers((results[1]?.employees||[]).filter(e => e.role === 'driver' || e.dept?.toLowerCase().includes('driver')))
      if (canViewTeam) {
        setSummary(results[2]?.summary||[])
        setAllUsers((results[3]?.users||[]).filter(u => u.role !== 'driver' && u.id !== user?.id))
      }
    } catch {} finally { setLoading(false) }
  }, [canViewTeam, user?.id])

  useEffect(() => { load() }, [load])

  async function handleDeleteMy(id) {
    if (!confirm('Delete this record?')) return
    await fetch(`${API}/api/petty-cash/${id}`, { method:'DELETE', headers:hdr() })
    load()
  }

  if (loading) return (
    <div style={{ padding:60, textAlign:'center' }}>
      <div className="skeleton" style={{ width:200, height:20, borderRadius:8, margin:'0 auto 10px' }}/>
      <div className="skeleton" style={{ width:140, height:14, borderRadius:8, margin:'0 auto' }}/>
    </div>
  )

  if (drillUser) {
    return (
      <div style={{ maxWidth:680, margin:'0 auto' }}>
        <UserDetailPanel
          userId={drillUser.id} userName={drillUser.name} userRole={drillUser.role}
          onBack={() => setDrillUser(null)} canDelete={canDelete}/>
      </div>
    )
  }

  const balance          = Number(myData?.balance||0)
  const totalAllocAll    = summary.reduce((s,u) => s + Number(u.total_allocated||0), 0)
  const totalSpentAll    = summary.reduce((s,u) => s + Number(u.total_spent||0), 0)
  const unaccounted      = summary.filter(u => Number(u.balance) < 0).length

  return (
    <div style={{ maxWidth:740, margin:'0 auto', display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── Hero ── */}
      <div style={{ background:'linear-gradient(135deg,#1A1612 0%,#2C1F0A 60%,#1A1612 100%)', borderRadius:20, padding:'22px 24px', position:'relative', overflow:'hidden' }}>
        {/* decorative circles */}
        <div style={{ position:'absolute', right:-50, top:-50, width:180, height:180, borderRadius:'50%', background:'rgba(184,134,11,0.08)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', left:-30, bottom:-40, width:120, height:120, borderRadius:'50%', background:'rgba(184,134,11,0.06)', pointerEvents:'none' }}/>

        <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:50, height:50, borderRadius:15, background:'linear-gradient(135deg,#B8860B,#D4A017)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 16px rgba(184,134,11,0.4)' }}>
              <Wallet size={22} color="white"/>
            </div>
            <div>
              <div style={{ fontWeight:900, fontSize:18, color:'white', letterSpacing:'-0.02em' }}>Petty Cash</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginTop:2 }}>
                {user?.name} · <span style={{ color:'#D4A017', fontWeight:600 }}>{ROLE_LABELS[user?.role]||user?.role}</span>
              </div>
            </div>
          </div>

          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {canGiveCash && (
              <button onClick={() => setModal('give')}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 18px', borderRadius:12, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#2E7D52,#22C55E)', color:'white', fontWeight:700, fontSize:13, fontFamily:'Poppins,sans-serif', boxShadow:'0 3px 10px rgba(46,125,82,0.4)', whiteSpace:'nowrap' }}>
                <HandCoins size={15}/> Give Cash
              </button>
            )}
            <button onClick={() => setModal('expense')}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 18px', borderRadius:12, border:'1px solid rgba(184,134,11,0.4)', cursor:'pointer', background:'rgba(184,134,11,0.12)', color:'#D4A017', fontWeight:700, fontSize:13, fontFamily:'Poppins,sans-serif', whiteSpace:'nowrap' }}>
              <Receipt size={15}/> Record Expense
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      {canViewTeam && (
        <div style={{ display:'flex', gap:6, background:'var(--bg-alt)', borderRadius:14, padding:4, border:'1px solid var(--border)' }}>
          {[['my','My Balance'],['team','Team Overview']].map(([v,l]) => (
            <button key={v} onClick={() => setTab(v)}
              style={{ flex:1, padding:'9px 16px', borderRadius:10, border:'none', background: tab===v ? 'var(--card)' : 'transparent', color: tab===v ? '#B8860B' : 'var(--text-muted)', fontWeight: tab===v ? 700 : 500, fontSize:13, cursor:'pointer', fontFamily:'Poppins,sans-serif', transition:'all 0.2s', boxShadow: tab===v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* ── My Balance ── */}
      {tab === 'my' && (
        <>
          <BalanceCard balance={balance} total_allocated={myData?.total_allocated||0} total_spent={myData?.total_spent||0}/>

          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontWeight:700, fontSize:13.5, color:'var(--text)' }}>Transaction History</span>
              {myData?.records?.length > 0 && (
                <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>{myData.records.length} records</span>
              )}
            </div>
            {!myData?.records?.length ? (
              <div style={{ padding:'48px 20px', textAlign:'center', color:'var(--text-muted)' }}>
                <Wallet size={36} style={{ margin:'0 auto 12px', display:'block', opacity:0.15 }}/>
                <div style={{ fontWeight:600, fontSize:13, color:'var(--text-sub)' }}>No transactions yet</div>
                <div style={{ fontSize:11, marginTop:4 }}>Record an expense or receive cash to get started</div>
              </div>
            ) : (
              myData.records.map(r => <TxRow key={r.id} record={r} canDelete={canDelete} onDelete={handleDeleteMy}/>)
            )}
          </div>
        </>
      )}

      {/* ── Team Overview ── */}
      {tab === 'team' && (
        <>
          {/* Summary stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10 }}>
            {[
              { label:'Total Distributed', value:fmt(totalAllocAll), color:'#22C55E', bg:'#F0FDF4', bc:'#BBF7D0', icon:<TrendingDown size={14} color="#22C55E"/> },
              { label:'Total Spent',       value:fmt(totalSpentAll), color:'#EF4444', bg:'#FEF2F2', bc:'#FECACA', icon:<TrendingUp  size={14} color="#EF4444"/> },
              { label:'Unaccounted',       value:unaccounted,        color: unaccounted>0?'#EF4444':'#10B981', bg: unaccounted>0?'#FEF2F2':'#F0FDF4', bc: unaccounted>0?'#FECACA':'#BBF7D0', icon:<Users size={14} color={unaccounted>0?'#EF4444':'#10B981'}/> },
            ].map((s,i) => (
              <div key={i} style={{ background:s.bg, border:`1px solid ${s.bc}`, borderRadius:14, padding:'16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                  {s.icon}
                  <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:s.color }}>{s.label}</span>
                </div>
                <div style={{ fontSize:20, fontWeight:900, color:s.color, letterSpacing:'-0.03em' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Team list */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:13.5, color:'var(--text)' }}>
              Team Members
            </div>
            {!summary.length ? (
              <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>No records yet</div>
            ) : summary.map(u => {
              const bal = Number(u.balance)
              const neg = bal < 0
              const initials = u.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
              return (
                <div key={u.id} onClick={() => setDrillUser({ id:u.id, name:u.name, role:u.role })}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--bg-alt)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#B8860B,#D4A017)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:13, fontWeight:800, color:'white' }}>
                    {initials}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>{u.name}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                      {ROLE_LABELS[u.role]||u.role}
                      {Number(u.transaction_count)>0 && ` · ${u.transaction_count} transactions`}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:14, fontWeight:800, color: neg?'#EF4444':'#22C55E' }}>
                      {neg?'-':''}{fmt(Math.abs(bal))}
                    </div>
                    <div style={{ fontSize:10, fontWeight:600, marginTop:2, color: neg?'#EF4444':'#10B981' }}>{neg?'Unaccounted':'Clear'}</div>
                  </div>
                  <ChevronRight size={14} style={{ color:'var(--text-muted)', flexShrink:0 }}/>
                </div>
              )
            })}
          </div>
        </>
      )}

      {modal==='expense' && <ExpenseModal drivers={drivers} onSave={() => { setModal(null); load() }} onClose={() => setModal(null)}/>}
      {modal==='give'    && <GiveCashModal users={allUsers} onSave={() => { setModal(null); load() }} onClose={() => setModal(null)}/>}
    </div>
  )
}
