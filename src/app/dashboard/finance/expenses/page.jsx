'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSocket } from '@/lib/socket'
import {
  Plus, X, Receipt, Search, AlertCircle, Trash2, Pencil,
  Users, ParkingCircle, Banknote, Plane, Fuel, HeartPulse,
  ScanSearch, Smartphone, Building2, Wallet, Bus, Car,
  KeyRound, FileText, Package, Tag, Download, TrendingUp,
  ChevronDown, Filter,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { API } from '@/lib/api'

// ── Categories ────────────────────────────────────────────────────
const CATEGORIES = [
  { v:'Parking',               c:'#F59E0B', I:ParkingCircle  },
  { v:'Advances',              c:'#10B981', I:Banknote       },
  { v:'Air Tickets',           c:'#3B82F6', I:Plane          },
  { v:'ENOC',                  c:'#EF4444', I:Fuel           },
  { v:'Health Insurance',      c:'#8B5CF6', I:HeartPulse     },
  { v:'Idfy',                  c:'#EC4899', I:ScanSearch     },
  { v:'Mobile Expenses',       c:'#06B6D4', I:Smartphone     },
  { v:'Office Expenses',       c:'#84CC16', I:Building2      },
  { v:'Petty Cash',            c:'#F97316', I:Wallet         },
  { v:'RTA Top-up',            c:'#0EA5E9', I:Bus            },
  { v:'Vehicle Expenses',      c:'#6366F1', I:Car            },
  { v:'Vehicle Rent',          c:'#7C3AED', I:KeyRound       },
  { v:'Visa Expenses',         c:'#D97706', I:FileText       },
  { v:'Miscellaneous Expenses',c:'#94A3B8', I:Package        },
]
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.v, c]))
const MONTHS  = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(); d.setMonth(d.getMonth() - i); return d.toISOString().slice(0, 7)
})
const EMP_COLORS = ['#FBBF24','#818CF8','#34D399','#F87171','#38BDF8','#A78BFA','#FB923C','#4ADE80']

// ── Helpers ───────────────────────────────────────────────────────
function hdr(json = true) {
  const h = { Authorization: `Bearer ${localStorage.getItem('gcd_token')}` }
  if (json) h['Content-Type'] = 'application/json'
  return h
}
function fmt(n) { return Number(n || 0).toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
function getUserRole() {
  try { const t = localStorage.getItem('gcd_token'); return t ? JSON.parse(atob(t.split('.')[1])).role : null } catch { return null }
}

// ── CSS ───────────────────────────────────────────────────────────
const CSS = `
  .ex-kpi   { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
  .ex-charts{ display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
  .ex-skel  { background:var(--card); border-radius:14px; animation:ex-pulse 1.4s ease infinite; }
  @keyframes ex-pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }
  .ex-card  { background:var(--card); border:1px solid var(--border); border-radius:16px; overflow:hidden; transition:box-shadow 0.18s,transform 0.18s; }
  .ex-card:hover { box-shadow:0 6px 24px rgba(0,0,0,0.10); transform:translateY(-1px); }
  .ex-filters{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  .ex-select { padding:9px 14px; border-radius:24px; border:1.5px solid var(--border); background:var(--card); color:var(--text); font-size:12.5px; font-weight:600; cursor:pointer; outline:none; font-family:inherit; }
  .ex-hero-row { display:flex; align-items:center; gap:14px; margin-bottom:20px; }
  @media(max-width:640px){
    .ex-kpi    { grid-template-columns:repeat(2,1fr) !important; }
    .ex-charts { grid-template-columns:1fr !important; }
    .ex-hero-row { flex-wrap:wrap; gap:10px; }
    .ex-hero-row>div:last-child { width:100%; }
    .ex-hero-actions { width:100%; display:flex; gap:8px; }
    .ex-hero-actions select, .ex-hero-actions button { flex:1; }
    .ex-filters { gap:6px; }
    .ex-filters .ex-search-wrap { width:100%; }
    .ex-filters .ex-select { flex:1 1 auto; min-width:0; }
  }
  @media(max-width:900px) and (min-width:641px){
    .ex-charts { grid-template-columns:repeat(2,1fr) !important; }
    .ex-kpi    { grid-template-columns:repeat(2,1fr) !important; }
  }
`

// ── Tooltip ───────────────────────────────────────────────────────
const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:'8px 12px', fontSize:12, fontFamily:'inherit', boxShadow:'0 4px 16px rgba(0,0,0,0.12)' }}>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.fill, fontWeight:700 }}>
          {p.name} — AED {fmt(p.value)}
        </div>
      ))}
    </div>
  )
}

// ── Add / Edit Modal ──────────────────────────────────────────────
function ExpenseModal({ expense, employees, onSave, onClose }) {
  const isEdit = !!expense
  const [form, setForm] = useState({
    emp_id:      expense?.emp_id      || '',
    category:    expense?.category    || CATEGORIES[0].v,
    amount:      expense?.amount      || '',
    date:        expense?.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    description: expense?.description || '',
    month:       expense?.month       || MONTHS[0],
  })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)
  const set  = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const cat  = CAT_MAP[form.category] || CATEGORIES[0]
  const CI   = cat.I

  async function handleSave() {
    if (!form.emp_id || !form.amount) return setErr('Employee and amount are required')
    setSaving(true); setErr(null)
    try {
      if (isEdit) {
        await fetch(`${API}/api/expenses/${expense.id}`, { method: 'PUT', headers: hdr(), body: JSON.stringify(form) })
      } else {
        await fetch(`${API}/api/expenses`, { method: 'POST', headers: hdr(), body: JSON.stringify(form) })
      }
      onSave()
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480, padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 22px 14px', background: `linear-gradient(135deg,${cat.c}18,transparent)`, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontWeight: 900, fontSize: 17, color: 'var(--text)', margin: 0 }}>{isEdit ? 'Edit Expense' : 'Add Expense'}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{isEdit ? 'Update this record' : 'Log a company expense'}</p>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-alt)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14}/>
            </button>
          </div>
          {/* Category pills */}
          <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
            <div style={{ display: 'flex', gap: 7, width: 'max-content' }}>
              {CATEGORIES.map(c => { const CI2 = c.I; return (
                <button key={c.v} onClick={() => set('category', c.v)} type="button"
                  style={{ padding: '6px 12px', borderRadius: 20, border: `2px solid ${form.category === c.v ? c.c : 'var(--border)'}`, background: form.category === c.v ? `${c.c}18` : 'var(--card)', color: form.category === c.v ? c.c : 'var(--text-muted)', fontWeight: form.category === c.v ? 700 : 500, fontSize: 11.5, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CI2 size={11}/>{c.v}
                </button>
              )})}
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 5, textAlign: 'center', opacity: 0.6 }}>← scroll for all categories →</div>
        </div>

        <div style={{ padding: '16px 22px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {err && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 9, padding: '9px 12px', fontSize: 12.5, color: '#C0392B', display: 'flex', gap: 7, alignItems: 'center' }}>
              <AlertCircle size={13}/>{err}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="input-label">Employee *</label>
              <select className="input" value={form.emp_id} onChange={e => set('emp_id', e.target.value)}>
                <option value="">Select employee…</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Month</label>
              <select className="input" value={form.month} onChange={e => set('month', e.target.value)}>
                {MONTHS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="input-label">Amount (AED) *</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>AED</span>
              <input className="input" type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} style={{ paddingLeft: 52, fontSize: 16, fontWeight: 700 }}/>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="input-label">Date</label>
              <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)}/>
            </div>
            <div>
              <label className="input-label">Description</label>
              <input className="input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief note…"/>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 11, borderRadius: 10, background: `linear-gradient(135deg,${cat.c},${cat.c}cc)`, color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1, transition: 'opacity 0.15s' }}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function ExpensesPage() {
  const [expenses,    setExpenses]    = useState([])
  const [employees,   setEmployees]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(null)
  const [search,      setSearch]      = useState('')
  const [catFilter,   setCatFilter]   = useState('all')
  const [empFilter,   setEmpFilter]   = useState('all')
  const [sortBy,      setSortBy]      = useState('date')
  const [month,       setMonth]       = useState(MONTHS[0])
  const [userRole,    setUserRole]    = useState(null)
  const [showCharts,  setShowCharts]  = useState(true)

  useEffect(() => { setUserRole(getUserRole()) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const h = { headers: { Authorization: `Bearer ${localStorage.getItem('gcd_token')}` } }
    try {
      // ── Phase 1: expenses only → KPI + list render immediately ──
      const exp = await fetch(`${API}/api/expenses?month=${month}`, h).then(r => r.json())
      setExpenses(exp.expenses || [])
      setLoading(false)
      // ── Phase 2: employees in background (needed for modal only) ──
      fetch(`${API}/api/employees`, h).then(r => r.json()).then(e => setEmployees(e.employees || [])).catch(() => {})
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }, [month])

  useEffect(() => { load() }, [load])
  useSocket({ 'expense:created': load, 'expense:updated': load })

  // ── All computed values memoized ──────────────────────────────
  const { total, approvedAmt, pendingCount, byCat, byEmp } = useMemo(() => {
    const total       = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
    const approvedAmt = expenses.filter(e => e.status === 'approved').reduce((s, e) => s + Number(e.amount || 0), 0)
    const pendingCount = expenses.filter(e => e.status === 'pending').length

    const byCat = CATEGORIES.map(cat => ({
      name: cat.v, short: cat.v.split(' ')[0], Icon: cat.I,
      value: expenses.filter(e => e.category === cat.v).reduce((s, e) => s + Number(e.amount || 0), 0),
      color: cat.c,
    })).filter(c => c.value > 0).sort((a, b) => b.value - a.value)

    // Build from expense records — no employees API needed
    const empMap = {}
    for (const exp of expenses) {
      const name = exp.emp_name || exp.emp_id || 'Unknown'
      if (!empMap[name]) empMap[name] = { name, id: exp.emp_id, value: 0, count: 0 }
      empMap[name].value += Number(exp.amount || 0)
      empMap[name].count++
    }
    const byEmp = Object.values(empMap).sort((a, b) => b.value - a.value)

    return { total, approvedAmt, pendingCount, byCat, byEmp }
  }, [expenses])

  const filtered = useMemo(() => {
    let list = expenses.filter(e => {
      const q = search.toLowerCase()
      return (
        (!search || (e.emp_name || '').toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q)) &&
        (catFilter === 'all' || e.category === catFilter) &&
        (empFilter === 'all' || e.emp_id === empFilter)
      )
    })
    return [...list].sort((a, b) => {
      if (sortBy === 'amount') return Number(b.amount) - Number(a.amount)
      if (sortBy === 'emp')    return (a.emp_name || '').localeCompare(b.emp_name || '')
      if (sortBy === 'cat')    return a.category.localeCompare(b.category)
      return new Date(b.date || b.created_at) - new Date(a.date || a.created_at)
    })
  }, [expenses, search, catFilter, empFilter, sortBy])

  const canEdit = userRole === 'accountant' || userRole === 'admin' || userRole === 'general_manager'

  async function del(id) {
    if (!confirm('Delete this expense?')) return
    await fetch(`${API}/api/expenses/${id}`, { method: 'DELETE', headers: hdr() })
    load()
  }

  function exportCSV() {
    const stations = [...new Set(expenses.map(e => e.emp_station).filter(Boolean))].sort()
    const rows = [['Expense Type', ...stations, 'Total']]
    for (const cat of CATEGORIES) {
      const exps = expenses.filter(e => e.category === cat.v)
      if (!exps.length) continue
      const sTotals = stations.map(st => exps.filter(e => e.emp_station === st).reduce((s, e) => s + Number(e.amount || 0), 0))
      rows.push([cat.v, ...sTotals.map(v => v || ''), exps.reduce((s, e) => s + Number(e.amount || 0), 0)])
    }
    const colTotals = stations.map(st => expenses.filter(e => e.emp_station === st).reduce((s, e) => s + Number(e.amount || 0), 0))
    rows.push(['Total', ...colTotals.map(v => v || ''), expenses.reduce((s, e) => s + Number(e.amount || 0), 0)])
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = `expenses-${month}.csv`; a.click()
  }

  return (
    <>
      <style>{CSS}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'slideUp 0.3s ease' }}>

        {/* ── Hero ── */}
        <div style={{ background: 'linear-gradient(135deg,#0f1117 0%,#1a1f2e 50%,#1f1a2e 100%)', borderRadius: 16, padding: 24 }}>

          {/* Title row */}
          <div className="ex-hero-row">
            <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(251,191,36,0.15)', border: '1.5px solid rgba(251,191,36,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Receipt size={22} color="#FBBF24"/>
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 20, color: 'white', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Expenses</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>
                {loading ? 'Loading…' : `${expenses.length} record${expenses.length !== 1 ? 's' : ''} · AED ${fmt(total)} this month`}
              </div>
            </div>
            <div className="ex-hero-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <select value={month} onChange={e => setMonth(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 13px', color: 'rgba(255,255,255,0.85)', fontSize: 12.5, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                {MONTHS.map(m => <option key={m}>{m}</option>)}
              </select>
              {canEdit && (
                <button onClick={() => setModal('add')}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap', transition: 'opacity 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  <Plus size={14}/> Add Expense
                </button>
              )}
            </div>
          </div>

          {/* KPI tiles */}
          <div className="ex-kpi">
            {[
              { label: 'Total',     val: `AED ${fmt(total)}`,        color: '#F5F5F5',  sub: `${expenses.length} records`    },
              { label: 'Approved',  val: `AED ${fmt(approvedAmt)}`,  color: '#4ADE80',  sub: `${expenses.filter(e=>e.status==='approved').length} entries` },
              { label: 'Pending',   val: pendingCount,               color: '#FBBF24',  sub: 'awaiting approval'             },
              { label: 'Employees', val: byEmp.length,               color: '#A78BFA',  sub: 'with expenses'                 },
            ].map(k => (
              <div key={k.label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: k.color, lineHeight: 1.1 }}>
                  {loading ? <span style={{ opacity: 0.25 }}>—</span> : k.val}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{k.label}</div>
                {!loading && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginTop: 2 }}>{k.sub}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* ── Analytics (collapsible) ── */}
        {!loading && (byCat.length > 0 || byEmp.length > 0) && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            <button onClick={() => setShowCharts(p => !p)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={14} color="#FBBF24"/>
                <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>Analytics</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Spending breakdown for {month}</span>
              </div>
              <ChevronDown size={15} color="var(--text-muted)" style={{ transform: showCharts ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}/>
            </button>

            {showCharts && (
              <div style={{ padding: '0 14px 14px' }}>
                <div className="ex-charts">

                  {/* Donut — by category */}
                  {byCat.length > 0 && (
                    <div style={{ background: 'var(--bg-alt)', borderRadius: 12, padding: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--text)', marginBottom: 10 }}>By Category</div>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                        <PieChart width={130} height={120}>
                          <Pie data={byCat} cx={60} cy={55} innerRadius={30} outerRadius={52} paddingAngle={3} dataKey="value">
                            {byCat.map(c => <Cell key={c.name} fill={c.color}/>)}
                          </Pie>
                          <Tooltip content={<Tip/>}/>
                        </PieChart>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {byCat.slice(0, 5).map(c => (
                          <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 7, height: 7, borderRadius: 2, background: c.color, flexShrink: 0 }}/>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: c.color }}>AED {fmt(c.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bar — top categories */}
                  {byCat.length > 0 && (
                    <div style={{ background: 'var(--bg-alt)', borderRadius: 12, padding: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--text)', marginBottom: 10 }}>Top Spending</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                        {byCat.slice(0, 6).map(c => {
                          const pct = byCat[0]?.value > 0 ? Math.round(c.value / byCat[0].value * 100) : 0
                          return (
                            <div key={c.name}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 11.5, color: 'var(--text)', fontWeight: 500 }}>{c.short}</span>
                                <span style={{ fontSize: 11.5, fontWeight: 700, color: c.color }}>AED {fmt(c.value)}</span>
                              </div>
                              <div style={{ height: 5, background: 'var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: c.color, borderRadius: 10, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }}/>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Bar — employees */}
                  {byEmp.length > 0 && (
                    <div style={{ background: 'var(--bg-alt)', borderRadius: 12, padding: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Users size={13} color="#FBBF24"/> By Employee
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                        {byEmp.slice(0, 6).map((e, i) => {
                          const pct = byEmp[0]?.value > 0 ? Math.round(e.value / byEmp[0].value * 100) : 0
                          const c   = EMP_COLORS[i] || '#94A3B8'
                          return (
                            <div key={e.id || e.name}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 11.5, color: 'var(--text)', fontWeight: 500, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                                <span style={{ fontSize: 11.5, fontWeight: 700, color: c }}>AED {fmt(e.value)}</span>
                              </div>
                              <div style={{ height: 5, background: 'var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: 10, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }}/>
                              </div>
                              <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>{e.count} record{e.count !== 1 ? 's' : ''}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Costwise Summary Table ── */}
        {!loading && expenses.length > 0 && (() => {
          const stations   = [...new Set(expenses.map(e => e.emp_station).filter(Boolean))].sort()
          const catRows    = CATEGORIES.filter(cat => expenses.some(e => e.category === cat.v))
          const catTotals  = catRows.map(cat => ({
            cat,
            sts: stations.map(st => expenses.filter(e => e.category === cat.v && e.emp_station === st).reduce((s, e) => s + Number(e.amount || 0), 0)),
            row: expenses.filter(e => e.category === cat.v).reduce((s, e) => s + Number(e.amount || 0), 0),
          }))
          const colTotals  = stations.map(st => expenses.filter(e => e.emp_station === st).reduce((s, e) => s + Number(e.amount || 0), 0))
          const grandTotal = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
          if (!catRows.length) return null
          const TH = { padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-alt)', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'right' }
          const TD = { padding: '9px 14px', fontSize: 12.5, color: 'var(--text)', borderBottom: '1px solid var(--border)', textAlign: 'right', whiteSpace: 'nowrap' }
          return (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px 11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--text)' }}>Costwise Summary</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>By category × station</div>
                </div>
                <button onClick={exportCSV}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981', fontWeight: 700, fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Download size={12}/> CSV
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...TH, textAlign: 'left', position: 'sticky', left: 0, zIndex: 1, minWidth: 160 }}>Expense Type</th>
                      {stations.map(st => <th key={st} style={TH}>{st}</th>)}
                      <th style={{ ...TH, color: '#FBBF24' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catTotals.map(({ cat, sts, row }) => (
                      <tr key={cat.v}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-alt)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ ...TD, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--card)', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: cat.c, flexShrink: 0 }}/>
                            <span style={{ color: cat.c }}>{cat.v}</span>
                          </div>
                        </td>
                        {sts.map((v, i) => (
                          <td key={stations[i]} style={{ ...TD, color: v > 0 ? 'var(--text)' : 'var(--text-muted)', opacity: v > 0 ? 1 : 0.4 }}>
                            {v > 0 ? fmt(v) : '—'}
                          </td>
                        ))}
                        <td style={{ ...TD, fontWeight: 800, color: '#FBBF24' }}>{fmt(row)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border)' }}>
                      <td style={{ ...TD, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--bg-alt)', fontWeight: 800, color: 'var(--text)' }}>Total</td>
                      {colTotals.map((v, i) => (
                        <td key={stations[i]} style={{ ...TD, background: 'var(--bg-alt)', fontWeight: 700, color: '#FBBF24' }}>{v > 0 ? fmt(v) : '—'}</td>
                      ))}
                      <td style={{ ...TD, background: 'var(--bg-alt)', fontWeight: 900, color: '#FBBF24', fontSize: 14 }}>{fmt(grandTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )
        })()}

        {/* ── Filters ── */}
        <div className="ex-filters">
          <div className="ex-search-wrap" style={{ flex: '1 1 200px', position: 'relative', minWidth: 160 }}>
            <Search size={13} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}/>
            <input
              style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, borderRadius: 24, border: '1.5px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              placeholder="Search name, description…"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select value={empFilter} onChange={e => setEmpFilter(e.target.value)} className="ex-select">
            <option value="all">All Employees</option>
            {byEmp.map(e => <option key={e.id || e.name} value={e.id}>{e.name}</option>)}
          </select>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="ex-select">
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c.v} value={c.v}>{c.v}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="ex-select">
            <option value="date">Sort: Date</option>
            <option value="amount">Sort: Amount</option>
            <option value="emp">Sort: Employee</option>
            <option value="cat">Sort: Category</option>
          </select>
          {filtered.length > 0 && (
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* ── Expense List ── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="ex-skel" style={{ height: 88, opacity: 1 - (i - 1) * 0.15 }}/>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Receipt size={28} style={{ opacity: 0.2 }}/>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 6 }}>
              {expenses.length === 0 ? 'No expenses this month' : 'No results match your filters'}
            </div>
            <div style={{ fontSize: 13 }}>
              {expenses.length === 0 ? 'Add your first expense using the button above.' : 'Try adjusting filters or search.'}
            </div>
            {expenses.length === 0 && canEdit && (
              <button onClick={() => setModal('add')}
                style={{ marginTop: 18, padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Plus size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }}/> Add Expense
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((exp, i) => {
              const cat       = CAT_MAP[exp.category] || { c: '#94A3B8', I: Tag }
              const CatIcon   = cat.I
              const isPending  = exp.status === 'pending'
              const isRejected = exp.status === 'rejected'
              const statusC    = isPending ? '#FBBF24' : isRejected ? '#F87171' : '#34D399'
              const statusBg   = isPending ? 'rgba(251,191,36,0.1)' : isRejected ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)'
              const statusLabel = isPending ? 'Pending' : isRejected ? 'Rejected' : 'Approved'

              return (
                <div key={exp.id} className="ex-card" style={{ animation: `slideUp 0.28s ${Math.min(i, 10) * 0.025}s ease both` }}>
                  {/* Category accent bar */}
                  <div style={{ height: 3, background: `linear-gradient(90deg,${cat.c},${cat.c}55)` }}/>

                  <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 13 }}>
                    {/* Icon */}
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${cat.c}15`, border: `1.5px solid ${cat.c}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CatIcon size={19} color={cat.c}/>
                    </div>

                    {/* Main content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', lineHeight: 1.2 }}>
                            {exp.emp_name || exp.emp_id}
                          </div>
                          <div style={{ fontSize: 11, color: cat.c, fontWeight: 600, marginTop: 2 }}>
                            {exp.category}
                          </div>
                          {exp.description && (
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                              {exp.description}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 900, fontSize: 17, color: 'var(--text)', letterSpacing: '-0.03em' }}>
                            AED {fmt(exp.amount)}
                          </div>
                          <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10.5, fontWeight: 700, color: statusC, background: statusBg, borderRadius: 20, padding: '2px 9px' }}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>

                      {/* Footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                          <span>{exp.date?.slice(0, 10)}</span>
                          {exp.month && <span>· {exp.month}</span>}
                          {exp.emp_station && <span style={{ fontWeight: 600 }}>· {exp.emp_station}</span>}
                        </div>
                        {canEdit && (
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button onClick={() => setModal(exp)}
                              style={{ padding: '4px 11px', borderRadius: 8, background: 'var(--bg-alt)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, transition: 'background 0.15s' }}>
                              <Pencil size={10}/> Edit
                            </button>
                            <button onClick={() => del(exp.id)}
                              style={{ padding: '4px 9px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', color: '#EF4444', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', transition: 'background 0.15s' }}>
                              <Trash2 size={11}/>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* ── Modal ── */}
      {(modal === 'add' || (typeof modal === 'object' && modal?.id)) && (
        <ExpenseModal
          expense={typeof modal === 'object' ? modal : null}
          employees={employees}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load() }}
        />
      )}
    </>
  )
}
