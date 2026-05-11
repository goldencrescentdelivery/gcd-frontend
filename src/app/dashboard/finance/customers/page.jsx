'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { customerApi, customerInvoiceApi } from '@/lib/api'
import {
  Building2, Plus, Search, Pencil, Trash2, X, ChevronLeft,
  Hash, MapPin, FileText, DollarSign, Tag, Receipt,
  RefreshCw, TrendingUp, AlertCircle, FileSpreadsheet,
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

const EMPTY_INV = { invoice_date: new Date().toISOString().slice(0,10), invoice_no:'', cost_center:'', description:'', invoice_amount:'', vat:'', grand_total:'' }

function fmtAed(n) {
  const v = parseFloat(n)
  return isNaN(v) ? '—' : `AED ${v.toLocaleString('en-AE', { minimumFractionDigits:2, maximumFractionDigits:2 })}`
}
function fmtNum(n) {
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
  .cust-toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
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
  .cust-name  { font-size: 14px; font-weight: 700; color: var(--text); line-height: 1.3; }
  .cust-trn   { font-size: 11px; color: var(--text-muted); margin-top: 2px; font-family: monospace; }
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
  .cust-rate-item  { text-align: center; }
  .cust-rate-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 2px; }
  .cust-rate-val   { font-size: 13px; font-weight: 700; color: var(--text); }
  .cust-rate-nil   { font-size: 12px; color: var(--text-muted); opacity: 0.4; }

  /* ── Card actions ── */
  .cust-card-actions { padding: 10px 16px 14px; display: flex; gap: 7px; flex-wrap: wrap; }
  .cust-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 13px; border-radius: 8px; font-size: 12px; font-weight: 600;
    cursor: pointer; font-family: Poppins, sans-serif; white-space: nowrap;
    transition: opacity 0.15s; border: 1px solid transparent;
  }
  .cust-btn:hover    { opacity: 0.82; }
  .cust-btn-inv  { border-color: #93C5FD; background: #EFF6FF; color: #2563EB; }
  .cust-btn-edit { border-color: #6EE7B7; background: #ECFDF5; color: #059669; }
  .cust-btn-del  { border-color: #FCA5A5; background: #FEF2F2; color: #EF4444; padding: 6px 10px; }

  /* ── Customer Modal ── */
  .cust-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 9998;
    display: flex; align-items: flex-start; justify-content: center;
    padding: 24px 16px; overflow-y: auto; backdrop-filter: blur(4px);
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
  .cust-modal-title  { font-size: 16px; font-weight: 800; color: var(--text); flex: 1; }
  .cust-modal-close  {
    width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border);
    background: var(--bg-alt); display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--text-muted);
  }
  .cust-modal-body   { padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; max-height: 70vh; }
  .cust-section-label {
    font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;
    color: #B8860B; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
  }
  .cust-section-label::after { content:''; flex:1; height:1px; background: rgba(184,134,11,0.2); }
  .cust-form-row   { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
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
  .cust-type-opt span   { font-size: 11px; font-weight: 700; color: var(--text); }
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
  .cust-btn-save:hover    { background: #9a7209; }
  .cust-btn-save:disabled { opacity: 0.55; cursor: not-allowed; }

  /* ── Invoice drill-down hero ── */
  .inv-hero {
    background: linear-gradient(135deg, #0f1623 0%, #1a2535 50%, #1e3a5f 100%);
    border-radius: 16px; padding: 22px; margin-bottom: 16px;
  }
  .inv-back-btn {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.7); font-size: 12px; font-weight: 600;
    padding: 6px 12px; border-radius: 8px; cursor: pointer;
    font-family: Poppins, sans-serif; margin-bottom: 18px;
  }
  .inv-hero-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
  .inv-cust-avatar {
    width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0;
    background: linear-gradient(135deg, #B8860B, #D4A017);
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 16px; color: white;
    box-shadow: 0 4px 12px rgba(184,134,11,0.3);
  }
  .inv-hero-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .inv-kpi {
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px; padding: 14px 16px;
  }
  .inv-kpi-label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
  .inv-kpi-val   { font-size: 18px; font-weight: 900; letter-spacing: -0.02em; line-height: 1; }

  /* ── Invoice table card ── */
  .inv-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
  .inv-table-wrap { overflow-x: auto; }
  .inv-table { width: 100%; border-collapse: collapse; min-width: 760px; }
  .inv-table th {
    padding: 11px 14px; font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted); background: var(--bg-alt);
    border-bottom: 1px solid var(--border); text-align: left; white-space: nowrap;
  }
  .inv-table th:last-child { text-align: right; }
  .inv-table td {
    padding: 12px 14px; font-size: 13px; color: var(--text);
    border-bottom: 1px solid var(--border); vertical-align: middle;
  }
  .inv-table tr:last-child td { border-bottom: none; }
  .inv-table tr:hover td { background: var(--bg-alt); }
  .inv-table .inv-amt { font-weight: 700; text-align: right; white-space: nowrap; }
  .inv-table .inv-grand { font-weight: 800; color: #2563EB; text-align: right; white-space: nowrap; }
  .inv-table .inv-actions { text-align: right; white-space: nowrap; }
  .inv-no-badge {
    font-family: monospace; font-size: 11.5px; font-weight: 700;
    background: var(--bg-alt); border: 1px solid var(--border);
    padding: 2px 8px; border-radius: 6px; color: var(--text);
  }

  /* ── Invoice modal ── */
  .inv-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    padding: 20px; backdrop-filter: blur(6px);
  }
  .inv-modal {
    background: var(--card); border-radius: 20px; width: 100%; max-width: 520px;
    border: 1px solid var(--border); overflow: hidden; animation: cust-slide 0.2s ease;
    box-shadow: 0 24px 60px rgba(0,0,0,0.35);
  }
  .inv-modal-header {
    padding: 18px 22px; border-bottom: 1px solid var(--border);
    background: linear-gradient(135deg, #0f1623, #1a2535);
    display: flex; align-items: center; justify-content: space-between;
  }

  /* ── Skeleton ── */
  @keyframes cust-pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }
  .cust-skel { animation: cust-pulse 1.5s ease infinite; background: var(--card); border-radius: 14px; }
  @keyframes pc-spin { to { transform:rotate(360deg); } }
  .pc-spin { animation: pc-spin 0.8s linear infinite; }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .cust-grid { grid-template-columns: 1fr; }
    .cust-kpi-grid { grid-template-columns: repeat(2, 1fr); }
    .inv-hero-kpis { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 600px) {
    .cust-hero { padding: 16px; border-radius: 12px; }
    .cust-kpi-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
    .cust-kpi-val  { font-size: 20px; }
    .cust-add-btn  { padding: 8px 14px; font-size: 12px; }
    .cust-form-row   { grid-template-columns: 1fr; }
    .cust-form-row-3 { grid-template-columns: 1fr 1fr; }
    .cust-form-row-4 { grid-template-columns: 1fr 1fr; }
    .cust-modal-body   { padding: 16px; }
    .cust-modal-header { padding: 16px; }
    .cust-modal-footer { padding: 12px 16px; }
    .cust-rates { grid-template-columns: repeat(2,1fr); }
    .cust-card-header { flex-wrap: wrap; }
    .cust-badges { margin-left: 0; }
    .inv-hero-kpis { grid-template-columns: 1fr 1fr; }
  }
`

/* ── Rate Cell ──────────────────────────────────────────────── */
function RateCell({ label, value }) {
  const v = fmtNum(value)
  return (
    <div className="cust-rate-item">
      <div className="cust-rate-label">{label}</div>
      {v !== null
        ? <div className="cust-rate-val">AED {v}</div>
        : <div className="cust-rate-nil">—</div>}
    </div>
  )
}

/* ── Invoice Modal ──────────────────────────────────────────── */
function InvoiceModal({ customer, invoice, onSave, onClose }) {
  const isEdit = !!invoice
  const [form, setForm] = useState(invoice ? {
    invoice_date:   invoice.invoice_date?.slice(0,10) || new Date().toISOString().slice(0,10),
    invoice_no:     invoice.invoice_no    || '',
    cost_center:    invoice.cost_center   || '',
    description:    invoice.description   || '',
    invoice_amount: invoice.invoice_amount != null ? String(invoice.invoice_amount) : '',
    vat:            invoice.vat            != null ? String(invoice.vat)            : '',
    grand_total:    invoice.grand_total    != null ? String(invoice.grand_total)    : '',
  } : { ...EMPTY_INV, cost_center: customer?.cost_center || '' })

  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  function set(k, v) {
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'invoice_amount' || k === 'vat') {
        const amt = parseFloat(k === 'invoice_amount' ? v : next.invoice_amount)
        const vat = parseFloat(k === 'vat' ? v : next.vat)
        if (!isNaN(amt)) {
          if (k === 'invoice_amount' && next.vat === '') {
            const autoVat = Math.round(amt * 5) / 100
            next.vat = String(autoVat)
            next.grand_total = String(amt + autoVat)
          } else if (!isNaN(vat)) {
            next.grand_total = String(amt + vat)
          }
        }
      }
      return next
    })
  }

  async function handleSubmit() {
    if (!form.invoice_date || !form.invoice_amount) { setErr('Invoice date and amount are required'); return }
    const amt = parseFloat(form.invoice_amount)
    if (isNaN(amt) || amt <= 0) { setErr('Invoice amount must be a positive number'); return }
    setSaving(true); setErr('')
    try {
      const payload = {
        customer_id:    customer.id,
        invoice_date:   form.invoice_date,
        invoice_no:     form.invoice_no     || null,
        cost_center:    form.cost_center    || null,
        description:    form.description    || null,
        invoice_amount: amt,
        vat:            form.vat !== '' ? parseFloat(form.vat) : null,
        grand_total:    form.grand_total !== '' ? parseFloat(form.grand_total) : null,
      }
      if (isEdit) {
        await customerInvoiceApi.update(invoice.id, payload)
      } else {
        await customerInvoiceApi.create(payload)
      }
      onSave()
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="inv-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="inv-modal">
        {/* Header */}
        <div className="inv-modal-header">
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'rgba(184,134,11,0.2)', border:'1px solid rgba(184,134,11,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Receipt size={17} color="#D4A017"/>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:'white' }}>{isEdit ? 'Edit Invoice' : 'New Invoice'}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginTop:1 }}>{customer.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', cursor:'pointer', color:'rgba(255,255,255,0.6)', display:'flex', padding:7, borderRadius:8 }}><X size={15}/></button>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
          {err && (
            <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#DC2626', display:'flex', gap:8, alignItems:'center' }}>
              <AlertCircle size={14}/> {err}
            </div>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="cust-field">
              <label>Invoice Date <span style={{ color:'#EF4444' }}>*</span></label>
              <input type="date" value={form.invoice_date} onChange={e => set('invoice_date', e.target.value)} className="cust-input"/>
            </div>
            <div className="cust-field">
              <label>Invoice No</label>
              <input value={form.invoice_no} onChange={e => set('invoice_no', e.target.value)} placeholder="e.g. INV-2026-001" className="cust-input" style={{ fontFamily:'monospace' }}/>
            </div>
          </div>
          <div className="cust-field">
            <label>Description</label>
            <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. AMAZON DSH6 January Services" className="cust-input"/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="cust-field">
              <label>Cost Center</label>
              <input value={form.cost_center} onChange={e => set('cost_center', e.target.value)} placeholder="e.g. DSH6" className="cust-input"/>
            </div>
            <div className="cust-field">
              <label>Invoice Amount (AED) <span style={{ color:'#EF4444' }}>*</span></label>
              <div className="cust-input-prefix">
                <span>AED</span>
                <input type="number" min="0" step="0.01" value={form.invoice_amount} onChange={e => set('invoice_amount', e.target.value)} placeholder="0.00" className="cust-input"/>
              </div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="cust-field">
              <label>VAT (auto 5%)</label>
              <div className="cust-input-prefix">
                <span>AED</span>
                <input type="number" min="0" step="0.01" value={form.vat} onChange={e => set('vat', e.target.value)} placeholder="0.00" className="cust-input"/>
              </div>
            </div>
            <div className="cust-field">
              <label>Grand Total</label>
              <div className="cust-input-prefix">
                <span>AED</span>
                <input type="number" min="0" step="0.01" value={form.grand_total} onChange={e => set('grand_total', e.target.value)} placeholder="0.00" className="cust-input"
                  style={{ background:'var(--card)', fontWeight:700 }}/>
              </div>
            </div>
          </div>
          <button onClick={handleSubmit} disabled={saving}
            style={{ padding:'13px', borderRadius:12, border:'none', cursor:saving?'not-allowed':'pointer', background:saving?'var(--border)':'linear-gradient(135deg,#B8860B,#D4A017)', color:saving?'var(--text-muted)':'white', fontWeight:700, fontSize:14, fontFamily:'Poppins,sans-serif', marginTop:4, transition:'all 0.2s', boxShadow:saving?'none':'0 3px 12px rgba(184,134,11,0.35)' }}>
            {saving ? (isEdit ? 'Saving…' : 'Adding…') : (isEdit ? 'Save Changes' : 'Add Invoice')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Customer Modal ─────────────────────────────────────────── */
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
      if (isEdit) { await customerApi.update(customer.id, payload) }
      else        { await customerApi.create(payload) }
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
        <div className="cust-modal-header">
          <div style={{ width:36, height:36, borderRadius:10, background:'rgba(184,134,11,0.12)', border:'1px solid rgba(184,134,11,0.25)', display:'flex', alignItems:'center', justifyContent:'center', color:'#B8860B' }}>
            <Building2 size={18}/>
          </div>
          <div className="cust-modal-title">{isEdit ? 'Edit Customer' : 'Add New Customer'}</div>
          <button onClick={onClose} className="cust-modal-close"><X size={15}/></button>
        </div>
        <div className="cust-modal-body">
          {error && (
            <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#DC2626', fontWeight:600 }}>
              {error}
            </div>
          )}
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
                      onChange={e => set(r.key, e.target.value)} placeholder="0.00" className="cust-input"/>
                  </div>
                  <div className="cust-input-prefix">
                    <span>AED</span>
                    <input type="number" min="0" step="0.01" value={form[r.ikey]}
                      onChange={e => set(r.ikey, e.target.value)} placeholder="0.00" className="cust-input"/>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="cust-section-label"><FileText size={12}/> Notes</div>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={3} placeholder="Any additional notes about this customer…"
              className="cust-input" style={{ resize:'vertical', padding:'10px 11px' }}/>
          </div>
        </div>
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

/* ── Customer Invoices Drill-down ───────────────────────────── */
function CustomerInvoicesView({ customer, isAdmin, onBack }) {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [invModal,   setInvModal]   = useState(null) // null | 'new' | {invoice}
  const [search,     setSearch]     = useState('')

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await customerInvoiceApi.list(customer.id)
      setData(res)
    } catch(e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }, [customer.id])

  useEffect(() => { load() }, [load])

  async function handleDelete(id) {
    if (!confirm('Delete this invoice? This cannot be undone.')) return
    try { await customerInvoiceApi.delete(id); load() }
    catch(e) { alert(e.message) }
  }

  const invoices = useMemo(() => {
    const list = data?.invoices || []
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter(i =>
      i.invoice_no?.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q) ||
      i.cost_center?.toLowerCase().includes(q) ||
      i.invoice_date?.includes(q)
    )
  }, [data, search])

  const typeMeta = TYPE_META[customer.customer_type] || TYPE_META.sale_invoice

  return (
    <div>
      {/* Drill-down hero */}
      <div className="inv-hero">
        <button onClick={onBack} className="inv-back-btn">
          <ChevronLeft size={13}/> Back to Customers
        </button>
        <div className="inv-hero-row">
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div className="inv-cust-avatar">{initials(customer.name)}</div>
            <div>
              <div style={{ fontWeight:800, fontSize:18, color:'white', letterSpacing:'-0.02em' }}>{customer.name}</div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4, flexWrap:'wrap' }}>
                <span style={{ fontSize:11, padding:'2px 10px', borderRadius:20, background:typeMeta.bg, color:typeMeta.color, fontWeight:700, border:`1px solid ${typeMeta.border}` }}>
                  {typeMeta.label}
                </span>
                {customer.cost_center && (
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>
                    <Hash size={10} style={{ display:'inline', marginRight:3 }}/>{customer.cost_center}
                  </span>
                )}
                {customer.trn_no && (
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)', fontFamily:'monospace' }}>TRN: {customer.trn_no}</span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <button onClick={() => load(true)} title="Refresh"
              style={{ width:36, height:36, borderRadius:9, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <RefreshCw size={14} color="rgba(255,255,255,0.6)" className={refreshing ? 'pc-spin' : ''}/>
            </button>
            <button onClick={() => setInvModal('new')}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:10, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#B8860B,#D4A017)', color:'white', fontWeight:700, fontSize:13, fontFamily:'Poppins,sans-serif', boxShadow:'0 2px 10px rgba(184,134,11,0.4)', whiteSpace:'nowrap' }}>
              <Plus size={14}/> Add Invoice
            </button>
          </div>
        </div>
        {/* KPI tiles */}
        <div className="inv-hero-kpis">
          {[
            { label:'Total Invoices', value: loading ? '…' : String(data?.count || 0), color:'#FBBF24' },
            { label:'Invoice Amount', value: loading ? '…' : fmtAed(data?.total_amount || 0), color:'white' },
            { label:'Total VAT',      value: loading ? '…' : fmtAed(data?.total_vat    || 0), color:'#34D399' },
            { label:'Grand Total',    value: loading ? '…' : fmtAed(data?.total_grand  || 0), color:'#60A5FA' },
          ].map(k => (
            <div key={k.label} className="inv-kpi">
              <div className="inv-kpi-label">{k.label}</div>
              <div className="inv-kpi-val" style={{ color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice table card */}
      <div className="inv-card">
        {/* Toolbar */}
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ flex:1, position:'relative' }}>
            <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search invoices…"
              style={{ width:'100%', padding:'8px 12px 8px 34px', borderRadius:9, border:'1px solid var(--border)', background:'var(--bg-alt)', color:'var(--text)', fontSize:13, fontFamily:'Poppins,sans-serif', outline:'none', boxSizing:'border-box' }}/>
          </div>
          {invoices.length > 0 && (
            <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600, whiteSpace:'nowrap' }}>{invoices.length} records</span>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding:32, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>Loading invoices…</div>
        ) : invoices.length === 0 ? (
          <div style={{ padding:'52px 20px', textAlign:'center', color:'var(--text-muted)' }}>
            <FileSpreadsheet size={40} style={{ margin:'0 auto 14px', display:'block', opacity:0.12 }}/>
            <div style={{ fontWeight:600, fontSize:13 }}>
              {search ? 'No invoices match your search' : 'No invoices yet'}
            </div>
            <div style={{ fontSize:11, marginTop:4 }}>
              {!search && 'Click "+ Add Invoice" to create the first one'}
            </div>
          </div>
        ) : (
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Invoice No</th>
                  <th>Description</th>
                  <th>Cost Center</th>
                  <th style={{ textAlign:'right' }}>Amount</th>
                  <th style={{ textAlign:'right' }}>VAT</th>
                  <th style={{ textAlign:'right' }}>Grand Total</th>
                  <th style={{ textAlign:'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, idx) => (
                  <tr key={inv.id}>
                    <td style={{ color:'var(--text-muted)', fontSize:11, fontWeight:600 }}>{idx + 1}</td>
                    <td style={{ whiteSpace:'nowrap', fontWeight:600 }}>{inv.invoice_date?.slice(0,10)}</td>
                    <td>
                      {inv.invoice_no
                        ? <span className="inv-no-badge">{inv.invoice_no}</span>
                        : <span style={{ color:'var(--text-muted)', fontSize:11 }}>—</span>}
                    </td>
                    <td style={{ maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {inv.description || <span style={{ color:'var(--text-muted)', fontSize:11 }}>—</span>}
                    </td>
                    <td>
                      {inv.cost_center
                        ? <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:6, background:'var(--bg-alt)', border:'1px solid var(--border)', color:'var(--text)' }}>{inv.cost_center}</span>
                        : <span style={{ color:'var(--text-muted)', fontSize:11 }}>—</span>}
                    </td>
                    <td className="inv-amt">{fmtAed(inv.invoice_amount)}</td>
                    <td className="inv-amt" style={{ color:'#059669' }}>{fmtAed(inv.vat)}</td>
                    <td className="inv-grand">{fmtAed(inv.grand_total)}</td>
                    <td className="inv-actions">
                      <button onClick={() => setInvModal(inv)}
                        style={{ background:'#EFF6FF', border:'1px solid #93C5FD', color:'#2563EB', borderRadius:7, padding:'4px 10px', fontSize:11.5, fontWeight:600, cursor:'pointer', fontFamily:'Poppins,sans-serif', marginRight:6 }}>
                        <Pencil size={10} style={{ display:'inline', marginRight:4 }}/>Edit
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(inv.id)}
                          style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', color:'#EF4444', borderRadius:7, padding:'4px 8px', fontSize:11.5, cursor:'pointer' }}>
                          <Trash2 size={10}/>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice modal */}
      {invModal && (
        <InvoiceModal
          customer={customer}
          invoice={invModal === 'new' ? null : invModal}
          onSave={() => { setInvModal(null); load() }}
          onClose={() => setInvModal(null)}/>
      )}
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────────────── */
export default function CustomersPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [customers,    setCustomers]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [modal,        setModal]        = useState(null)
  const [search,       setSearch]       = useState('')
  const [typeFilter,   setTypeFilter]   = useState('')
  const [drillCustomer, setDrillCustomer] = useState(null)

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

  function handleSaved() { setModal(null); load() }

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

  // Show invoice drill-down if a customer is selected
  if (drillCustomer) {
    return (
      <>
        <style>{CSS}</style>
        <CustomerInvoicesView
          customer={drillCustomer}
          isAdmin={isAdmin}
          onBack={() => setDrillCustomer(null)}/>
      </>
    )
  }

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
          <input className="cust-search-input" placeholder="Search by name, TRN, cost center…"
            value={search} onChange={e => setSearch(e.target.value)}/>
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
                <div className="cust-card-header">
                  <div className="cust-avatar">{initials(c.name)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="cust-name">{c.name}</div>
                    {c.trn_no && <div className="cust-trn">TRN: {c.trn_no}</div>}
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
                      <span>Opening Balance: <strong style={{ color:'var(--text)' }}>AED {fmtNum(c.opening_balance)}</strong></span>
                    </div>
                  )}
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
                <div className="cust-card-actions">
                  <button onClick={() => setDrillCustomer(c)} className="cust-btn cust-btn-inv">
                    <Receipt size={11}/> Invoices
                  </button>
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

      {modal && (
        <CustomerModal
          customer={modal === 'add' ? null : modal}
          onSave={handleSaved}
          onClose={() => setModal(null)}/>
      )}
    </>
  )
}
