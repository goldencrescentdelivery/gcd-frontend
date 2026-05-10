'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { customerApi } from '@/lib/api'
import {
  Building2, Plus, Search, Pencil, Trash2, X, ChevronDown,
  Hash, MapPin, FileText, DollarSign, Users, Tag,
} from 'lucide-react'

const TYPE_META = {
  sale_invoice:     { label:'Sale Invoice',     bg:'#EFF6FF', border:'#BFDBFE', color:'#1D4ED8' },
  purchase_invoice: { label:'Purchase Invoice', bg:'#F5F3FF', border:'#DDD6FE', color:'#6D28D9' },
  both:             { label:'Both',             bg:'#FFFBEB', border:'#FDE68A', color:'#92400E' },
}

const EMPTY_FORM = {
  name:'', address:'', trn_no:'', opening_balance:'',
  customer_type:'sale_invoice', cost_center:'',
  ncod_rate:'', cod_rate:'', rp_rate:'', pickup_rate:'',
  ncod_inv_rate:'', cod_inv_rate:'', rp_inv_rate:'', pickup_inv_rate:'',
  notes:'',
}

function fmt(n) {
  const v = parseFloat(n)
  return isNaN(v) ? null : v.toLocaleString('en-AE', { minimumFractionDigits:2, maximumFractionDigits:2 })
}

function initials(name) {
  return (name || '?').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()
}

const CSS = `
  /* ── Hero ── */
  .cust-hero {
    background: linear-gradient(135deg, #0f1623 0%, #1a2535 50%, #1e3a5f 100%);
    border-radius: 16px; padding: 24px; margin-bottom: 20px;
  }
  .cust-hero-top {
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 20px; flex-wrap: wrap;
  }
  .cust-hero-icon {
    width: 44px; height: 44px; border-radius: 12px;
    background: rgba(184,134,11,0.15); border: 1px solid rgba(184,134,11,0.3);
    display: flex; align-items: center; justify-content: center; color: #B8860B; flex-shrink: 0;
  }
  .cust-hero-title { font-size: 20px; font-weight: 800; color: white; margin: 0; }
  .cust-hero-sub   { font-size: 12px; color: rgba(255,255,255,0.5); margin: 3px 0 0; }
  .cust-add-btn {
    margin-left: auto; display: flex; align-items: center; gap: 7px;
    padding: 10px 20px; border-radius: 10px; border: none;
    background: #B8860B; color: white; font-weight: 700; font-size: 13px;
    cursor: pointer; font-family: Poppins, sans-serif; white-space: nowrap;
    transition: background 0.15s;
  }
  .cust-add-btn:hover { background: #9a7209; }
  .cust-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .cust-kpi {
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px; padding: 14px 16px;
  }
  .cust-kpi-val   { font-size: 26px; font-weight: 800; line-height: 1.1; }
  .cust-kpi-label { font-size: 10px; color: rgba(255,255,255,0.45); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px; }

  /* ── Toolbar ── */
  .cust-toolbar {
    display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;
  }
  .cust-search-wrap {
    display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px;
    background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 0 12px;
  }
  .cust-search-input {
    flex: 1; border: none; outline: none; background: transparent; color: var(--text);
    font-family: Poppins, sans-serif; font-size: 13px; padding: 9px 0;
  }
  .cust-filter-sel {
    padding: 9px 14px; border-radius: 10px; border: 1px solid var(--border);
    background: var(--card); color: var(--text); font-family: Poppins, sans-serif;
    font-size: 13px; outline: none; cursor: pointer;
  }

  /* ── Grid ── */
  .cust-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }

  /* ── Card ── */
  .cust-card {
    background: var(--card); border: 1px solid var(--border); border-radius: 14px;
    overflow: hidden; display: flex; flex-direction: column;
    transition: box-shadow 0.15s, transform 0.15s;
  }
  .cust-card:hover { box-shadow: 0 6px 28px rgba(0,0,0,0.10); transform: translateY(-2px); }
  .cust-card-header {
    display: flex; align-items: center; gap: 12px;
    padding: 16px 16px 12px; border-bottom: 1px solid var(--border);
  }
  .cust-avatar {
    width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
    background: linear-gradient(135deg, #B8860B, #D4A017);
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 15px; color: white; letter-spacing: 0.03em;
  }
  .cust-name { font-size: 14px; font-weight: 700; color: var(--text); line-height: 1.3; }
  .cust-trn  { font-size: 11px; color: var(--text-muted); margin-top: 2px; font-family: monospace; }
  .cust-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-left: auto; flex-shrink: 0; }
  .cust-badge {
    display: inline-flex; align-items: center; gap: 3px;
    font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 20px;
    border: 1px solid; white-space: nowrap;
  }
  .cust-card-body { padding: 12px 16px; flex: 1; display: flex; flex-direction: column; gap: 10px; }
  .cust-meta { display: flex; align-items: flex-start; gap: 6px; font-size: 12px; color: var(--text-muted); }
  .cust-meta-icon { flex-shrink: 0; margin-top: 1px; }

  /* ── Rates grid ── */
  .cust-rates {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 6px; background: var(--bg-alt); border-radius: 10px; padding: 10px;
    border: 1px solid var(--border);
  }
  .cust-rate-item { text-align: center; }
  .cust-rate-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 2px; }
  .cust-rate-val   { font-size: 13px; font-weight: 700; color: var(--text); }
  .cust-rate-nil   { font-size: 12px; color: var(--text-muted); opacity: 0.4; }

  /* ── Card actions ── */
  .cust-card-actions { padding: 10px 16px 14px; display: flex; gap: 7px; }
  .cust-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 13px; border-radius: 8px; font-size: 12px; font-weight: 600;
    cursor: pointer; font-family: Poppins, sans-serif; white-space: nowrap;
    transition: opacity 0.15s; border: 1px solid transparent;
  }
  .cust-btn:hover { opacity: 0.82; }
  .cust-btn-edit { border-color: #93C5FD; background: #EFF6FF; color: #2563EB; }
  .cust-btn-del  { border-color: #FCA5A5; background: #FEF2F2; color: #EF4444; padding: 6px 10px; }

  /* ── Modal ── */
  .cust-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 1000;
    display: flex; align-items: flex-start; justify-content: center;
    padding: 24px 16px; overflow-y: auto;
  }
  .cust-modal {
    background: var(--card); border-radius: 16px; width: 100%; max-width: 740px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.3); display: flex; flex-direction: column;
    animation: cust-slide 0.2s ease;
  }
  @keyframes cust-slide { from { opacity:0; transform:translateY(-16px) } to { opacity:1; transform:translateY(0) } }
  .cust-modal-header {
    display: flex; align-items: center; gap: 12px; padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
  }
  .cust-modal-title { font-size: 16px; font-weight: 800; color: var(--text); flex: 1; }
  .cust-modal-close {
    width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border);
    background: var(--bg-alt); display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--text-muted);
  }
  .cust-modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; max-height: 70vh; }
  .cust-section-label {
    font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;
    color: #B8860B; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
  }
  .cust-section-label::after { content:''; flex:1; height:1px; background: rgba(184,134,11,0.2); }
  .cust-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .cust-form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .cust-form-row-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .cust-field label {
    display: block; font-size: 10.5px; font-weight: 700; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px;
  }
  .cust-input {
    width: 100%; padding: 8px 11px; border-radius: 8px;
    border: 1px solid var(--border); background: var(--bg-alt); color: var(--text);
    font-size: 12.5px; font-family: Poppins, sans-serif; outline: none; box-sizing: border-box;
    transition: border-color 0.15s;
  }
  .cust-input:focus { border-color: #B8860B; }
  .cust-input-prefix { display: flex; }
  .cust-input-prefix span {
    padding: 8px 10px; background: var(--card); border: 1px solid var(--border);
    border-right: none; border-radius: 8px 0 0 8px; font-size: 11px; font-weight: 700;
    color: var(--text-muted); display: flex; align-items: center;
  }
  .cust-input-prefix .cust-input { border-radius: 0 8px 8px 0; }
  .cust-type-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
  .cust-type-opt {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 10px 8px; border-radius: 10px; cursor: pointer;
    border: 2px solid var(--border); background: var(--bg-alt);
    transition: all 0.15s; text-align: center;
  }
  .cust-type-opt.active { border-color: #B8860B; background: #FFFBEB; }
  .cust-type-opt span { font-size: 11px; font-weight: 700; color: var(--text); }
  .cust-modal-footer {
    display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px;
    border-top: 1px solid var(--border);
  }
  .cust-btn-cancel {
    padding: 9px 20px; border-radius: 9px; border: 1px solid var(--border);
    background: var(--bg-alt); color: var(--text); font-weight: 600; font-size: 13px;
    cursor: pointer; font-family: Poppins, sans-serif;
  }
  .cust-btn-save {
    padding: 9px 24px; border-radius: 9px; border: none;
    background: #B8860B; color: white; font-weight: 700; font-size: 13px;
    cursor: pointer; font-family: Poppins, sans-serif; transition: background 0.15s;
  }
  .cust-btn-save:hover { background: #9a7209; }
  .cust-btn-save:disabled { opacity: 0.55; cursor: not-allowed; }

  /* ── Skeleton ── */
  @keyframes cust-pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }
  .cust-skel { animation: cust-pulse 1.5s ease infinite; background: var(--card); border-radius: 14px; }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .cust-grid { grid-template-columns: 1fr; }
    .cust-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 600px) {
    .cust-hero { padding: 16px; border-radius: 12px; }
    .cust-kpi-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
    .cust-kpi-val { font-size: 20px; }
    .cust-add-btn { padding: 8px 14px; font-size: 12px; }
    .cust-form-row  { grid-template-columns: 1fr; }
    .cust-form-row-3 { grid-template-columns: 1fr 1fr; }
    .cust-form-row-4 { grid-template-columns: 1fr 1fr; }
    .cust-modal-body { padding: 16px; }
    .cust-modal-header { padding: 16px; }
    .cust-modal-footer { padding: 12px 16px; }
    .cust-rates { grid-template-columns: repeat(2,1fr); }
    .cust-card-header { flex-wrap: wrap; }
    .cust-badges { margin-left: 0; }
  }
`

function RateCell({ label, value }) {
  const v = fmt(value)
  return (
    <div className="cust-rate-item">
      <div className="cust-rate-label">{label}</div>
      {v !== null
        ? <div className="cust-rate-val">AED {v}</div>
        : <div className="cust-rate-nil">—</div>}
    </div>
  )
}

function CustomerModal({ customer, onSave, onClose }) {
  const isEdit = !!customer
  const [form, setForm]   = useState(customer ? {
    name:            customer.name            || '',
    address:         customer.address         || '',
    trn_no:          customer.trn_no          || '',
    opening_balance: customer.opening_balance != null ? String(customer.opening_balance) : '',
    customer_type:   customer.customer_type   || 'sale_invoice',
    cost_center:     customer.cost_center     || '',
    ncod_rate:       customer.ncod_rate       != null ? String(customer.ncod_rate)       : '',
    cod_rate:        customer.cod_rate        != null ? String(customer.cod_rate)        : '',
    rp_rate:         customer.rp_rate         != null ? String(customer.rp_rate)         : '',
    pickup_rate:     customer.pickup_rate     != null ? String(customer.pickup_rate)     : '',
    ncod_inv_rate:   customer.ncod_inv_rate   != null ? String(customer.ncod_inv_rate)   : '',
    cod_inv_rate:    customer.cod_inv_rate    != null ? String(customer.cod_inv_rate)    : '',
    rp_inv_rate:     customer.rp_inv_rate     != null ? String(customer.rp_inv_rate)     : '',
    pickup_inv_rate: customer.pickup_inv_rate != null ? String(customer.pickup_inv_rate) : '',
    notes:           customer.notes           || '',
  } : { ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit() {
    if (!form.name.trim()) { setError('Customer name is required'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        opening_balance:  form.opening_balance  !== '' ? parseFloat(form.opening_balance)  : 0,
        ncod_rate:        form.ncod_rate        !== '' ? parseFloat(form.ncod_rate)        : null,
        cod_rate:         form.cod_rate         !== '' ? parseFloat(form.cod_rate)         : null,
        rp_rate:          form.rp_rate          !== '' ? parseFloat(form.rp_rate)          : null,
        pickup_rate:      form.pickup_rate      !== '' ? parseFloat(form.pickup_rate)      : null,
        ncod_inv_rate:    form.ncod_inv_rate    !== '' ? parseFloat(form.ncod_inv_rate)    : null,
        cod_inv_rate:     form.cod_inv_rate     !== '' ? parseFloat(form.cod_inv_rate)     : null,
        rp_inv_rate:      form.rp_inv_rate      !== '' ? parseFloat(form.rp_inv_rate)      : null,
        pickup_inv_rate:  form.pickup_inv_rate  !== '' ? parseFloat(form.pickup_inv_rate)  : null,
      }
      if (isEdit) {
        await customerApi.update(customer.id, payload)
      } else {
        await customerApi.create(payload)
      }
      onSave()
    } catch(e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const rateField = (key, label) => (
    <div className="cust-field" key={key}>
      <label>{label}</label>
      <div className="cust-input-prefix">
        <span>AED</span>
        <input type="number" min="0" step="0.01" value={form[key]}
          onChange={e => set(key, e.target.value)}
          placeholder="0.00" className="cust-input"/>
      </div>
    </div>
  )

  return (
    <div className="cust-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cust-modal">
        {/* Header */}
        <div className="cust-modal-header">
          <div style={{ width:36, height:36, borderRadius:10, background:'rgba(184,134,11,0.12)', border:'1px solid rgba(184,134,11,0.25)', display:'flex', alignItems:'center', justifyContent:'center', color:'#B8860B' }}>
            <Building2 size={18}/>
          </div>
          <div className="cust-modal-title">{isEdit ? 'Edit Customer' : 'Add New Customer'}</div>
          <button onClick={onClose} className="cust-modal-close"><X size={15}/></button>
        </div>

        {/* Body */}
        <div className="cust-modal-body">
          {error && (
            <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#DC2626', fontWeight:600 }}>
              {error}
            </div>
          )}

          {/* Section 1: Company Info */}
          <div>
            <div className="cust-section-label"><Building2 size={12}/> Company Details</div>
            <div className="cust-form-row" style={{ marginBottom:12 }}>
              <div className="cust-field" style={{ gridColumn:'span 2' }}>
                <label>Customer Name <span style={{ color:'#EF4444' }}>*</span></label>
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Noon Food LLC" className="cust-input"/>
              </div>
            </div>
            <div className="cust-form-row">
              <div className="cust-field" style={{ gridColumn:'span 2' }}>
                <label>Address</label>
                <input value={form.address} onChange={e => set('address', e.target.value)}
                  placeholder="e.g. Boulevard Plaza, Downtown Dubai" className="cust-input"/>
              </div>
            </div>
            <div className="cust-form-row" style={{ marginTop:12 }}>
              <div className="cust-field">
                <label>TRN Number</label>
                <input value={form.trn_no} onChange={e => set('trn_no', e.target.value)}
                  placeholder="e.g. 100435177900003" className="cust-input" style={{ fontFamily:'monospace' }}/>
              </div>
              <div className="cust-field">
                <label>Cost Center</label>
                <input value={form.cost_center} onChange={e => set('cost_center', e.target.value)}
                  placeholder="e.g. JNT, DDB6, NOON" className="cust-input"/>
              </div>
            </div>
          </div>

          {/* Section 2: Classification */}
          <div>
            <div className="cust-section-label"><Tag size={12}/> Classification</div>
            <div className="cust-form-row">
              <div className="cust-field">
                <label>Customer Type</label>
                <div className="cust-type-grid">
                  {Object.entries(TYPE_META).map(([k, m]) => (
                    <div key={k} className={`cust-type-opt${form.customer_type === k ? ' active' : ''}`}
                      onClick={() => set('customer_type', k)}>
                      <span>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="cust-field">
                <label>Opening Balance (AED)</label>
                <div className="cust-input-prefix">
                  <span>AED</span>
                  <input type="number" min="0" step="0.01" value={form.opening_balance}
                    onChange={e => set('opening_balance', e.target.value)}
                    placeholder="0.00" className="cust-input"/>
                </div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4 }}>Starting balance for this customer</div>
              </div>
            </div>
          </div>

          {/* Section 3: Rate Card */}
          <div>
            <div className="cust-section-label"><DollarSign size={12}/> Rate Card</div>
            <div style={{ background:'var(--bg-alt)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr', gap:'8px 12px', alignItems:'center', marginBottom:10 }}>
                <div/>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', textAlign:'center' }}>Rate</div>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', textAlign:'center' }}>Invoice Rate</div>
              </div>
              {[
                { key:'ncod_rate', ikey:'ncod_inv_rate', label:'NCOD' },
                { key:'cod_rate',  ikey:'cod_inv_rate',  label:'COD' },
                { key:'rp_rate',   ikey:'rp_inv_rate',   label:'RP' },
                { key:'pickup_rate', ikey:'pickup_inv_rate', label:'Pickup' },
              ].map(r => (
                <div key={r.key} style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr', gap:'8px 12px', alignItems:'center', marginBottom:8 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{r.label}</div>
                  <div className="cust-input-prefix">
                    <span>AED</span>
                    <input type="number" min="0" step="0.01" value={form[r.key]}
                      onChange={e => set(r.key, e.target.value)}
                      placeholder="0.00" className="cust-input"/>
                  </div>
                  <div className="cust-input-prefix">
                    <span>AED</span>
                    <input type="number" min="0" step="0.01" value={form[r.ikey]}
                      onChange={e => set(r.ikey, e.target.value)}
                      placeholder="0.00" className="cust-input"/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Notes */}
          <div>
            <div className="cust-section-label"><FileText size={12}/> Notes</div>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={3} placeholder="Any additional notes about this customer…"
              className="cust-input" style={{ resize:'vertical', padding:'10px 11px' }}/>
          </div>
        </div>

        {/* Footer */}
        <div className="cust-modal-footer">
          <button onClick={onClose} className="cust-btn-cancel">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="cust-btn-save">
            {saving ? (isEdit ? 'Saving…' : 'Adding…') : (isEdit ? 'Save Changes' : 'Add Customer')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CustomersPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [customers, setCustomers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null) // null | 'add' | {customer object}
  const [search,    setSearch]    = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  async function load() {
    try {
      const data = await customerApi.list()
      setCustomers(data.customers || [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id) {
    if (!confirm('Delete this customer? This cannot be undone.')) return
    try { await customerApi.delete(id); setCustomers(prev => prev.filter(c => c.id !== id)) }
    catch(e) { alert(e.message) }
  }

  function handleSaved() {
    setModal(null)
    load()
  }

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return customers.filter(c => {
      if (typeFilter && c.customer_type !== typeFilter) return false
      if (!s) return true
      return (
        c.name?.toLowerCase().includes(s) ||
        c.trn_no?.toLowerCase().includes(s) ||
        c.cost_center?.toLowerCase().includes(s) ||
        c.address?.toLowerCase().includes(s)
      )
    })
  }, [customers, search, typeFilter])

  const totalSale = customers.filter(c => c.customer_type === 'sale_invoice').length
  const totalPur  = customers.filter(c => c.customer_type === 'purchase_invoice').length
  const totalBoth = customers.filter(c => c.customer_type === 'both').length

  return (
    <>
      <style>{CSS}</style>

      {/* Hero */}
      <div className="cust-hero">
        <div className="cust-hero-top">
          <div className="cust-hero-icon"><Building2 size={20}/></div>
          <div>
            <div className="cust-hero-title">Customers</div>
            <div className="cust-hero-sub">Companies &amp; clients we receive payments from</div>
          </div>
          <button onClick={() => setModal('add')} className="cust-add-btn">
            <Plus size={15}/> Add Customer
          </button>
        </div>
        <div className="cust-kpi-grid">
          <div className="cust-kpi">
            <div className="cust-kpi-val" style={{ color:'#B8860B' }}>{customers.length}</div>
            <div className="cust-kpi-label">Total</div>
          </div>
          <div className="cust-kpi">
            <div className="cust-kpi-val" style={{ color:'#3B82F6' }}>{totalSale}</div>
            <div className="cust-kpi-label">Sale Invoice</div>
          </div>
          <div className="cust-kpi">
            <div className="cust-kpi-val" style={{ color:'#8B5CF6' }}>{totalPur}</div>
            <div className="cust-kpi-label">Purchase Invoice</div>
          </div>
          <div className="cust-kpi">
            <div className="cust-kpi-val" style={{ color:'#F59E0B' }}>{totalBoth}</div>
            <div className="cust-kpi-label">Both Types</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="cust-toolbar">
        <div className="cust-search-wrap">
          <Search size={14} style={{ color:'var(--text-muted)', flexShrink:0 }}/>
          <input
            className="cust-search-input"
            placeholder="Search by name, TRN, cost center…"
            value={search}
            onChange={e => setSearch(e.target.value)}/>
          {search && (
            <button onClick={() => setSearch('')}
              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex' }}>
              <X size={13}/>
            </button>
          )}
        </div>
        <select className="cust-filter-sel" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option value="sale_invoice">Sale Invoice</option>
          <option value="purchase_invoice">Purchase Invoice</option>
          <option value="both">Both</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="cust-grid">
          {[1,2,3,4].map(i => (
            <div key={i} className="cust-skel" style={{ height:220, opacity: 1 - (i-1)*0.12 }}/>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'70px 20px', color:'var(--text-muted)' }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <Building2 size={28} style={{ opacity:0.25 }}/>
          </div>
          <div style={{ fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:6 }}>
            {search || typeFilter ? 'No customers match your search' : 'No customers yet'}
          </div>
          <div style={{ fontSize:13, marginBottom:20 }}>
            {search || typeFilter ? 'Try adjusting your filters' : 'Add your first customer to get started.'}
          </div>
          {!search && !typeFilter && (
            <button onClick={() => setModal('add')}
              style={{ padding:'10px 24px', borderRadius:10, border:'none', background:'#B8860B', color:'white', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
              <Plus size={13} style={{ display:'inline', marginRight:6, verticalAlign:'middle' }}/>
              Add Customer
            </button>
          )}
        </div>
      ) : (
        <div className="cust-grid">
          {filtered.map(c => {
            const typeMeta = TYPE_META[c.customer_type] || TYPE_META.sale_invoice
            const hasRates = [c.ncod_rate, c.cod_rate, c.rp_rate, c.pickup_rate].some(r => r != null)
            return (
              <div key={c.id} className="cust-card">
                {/* Header */}
                <div className="cust-card-header">
                  <div className="cust-avatar">{initials(c.name)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="cust-name">{c.name}</div>
                    {c.trn_no && (
                      <div className="cust-trn">TRN: {c.trn_no}</div>
                    )}
                  </div>
                  <div className="cust-badges">
                    <span className="cust-badge"
                      style={{ background:typeMeta.bg, borderColor:typeMeta.border, color:typeMeta.color }}>
                      {typeMeta.label}
                    </span>
                    {c.cost_center && (
                      <span className="cust-badge"
                        style={{ background:'var(--bg-alt)', borderColor:'var(--border)', color:'var(--text-muted)' }}>
                        <Hash size={9}/> {c.cost_center}
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="cust-card-body">
                  {c.address && (
                    <div className="cust-meta">
                      <MapPin size={11} className="cust-meta-icon" style={{ color:'var(--text-muted)' }}/>
                      <span>{c.address}</span>
                    </div>
                  )}
                  {c.opening_balance != null && parseFloat(c.opening_balance) !== 0 && (
                    <div className="cust-meta">
                      <DollarSign size={11} className="cust-meta-icon" style={{ color:'#B8860B' }}/>
                      <span>Opening Balance: <strong style={{ color:'var(--text)' }}>AED {fmt(c.opening_balance)}</strong></span>
                    </div>
                  )}

                  {/* Rates */}
                  {hasRates && (
                    <div className="cust-rates">
                      <RateCell label="NCOD"   value={c.ncod_rate}/>
                      <RateCell label="COD"    value={c.cod_rate}/>
                      <RateCell label="RP"     value={c.rp_rate}/>
                      <RateCell label="Pickup" value={c.pickup_rate}/>
                    </div>
                  )}

                  {c.notes && (
                    <div style={{ fontSize:11.5, color:'var(--text-muted)', fontStyle:'italic', borderLeft:'2px solid var(--border)', paddingLeft:8 }}>
                      {c.notes}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="cust-card-actions">
                  <button onClick={() => setModal(c)} className="cust-btn cust-btn-edit">
                    <Pencil size={11}/> Edit
                  </button>
                  {isAdmin && (
                    <button onClick={() => handleDelete(c.id)} className="cust-btn cust-btn-del">
                      <Trash2 size={11}/>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <CustomerModal
          customer={modal === 'add' ? null : modal}
          onSave={handleSaved}
          onClose={() => setModal(null)}/>
      )}
    </>
  )
}
