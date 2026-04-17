'use client'
import React, { useState, useEffect, useCallback } from 'react'
import {
  FileText, Plus, X, Pencil, Trash2, AlertCircle, CheckCircle2,
  Calendar, Building2, Clock, ChevronRight, RefreshCw,
} from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'

const _raw = process.env.NEXT_PUBLIC_API_URL
const API  = _raw && !_raw.startsWith('http') ? `https://${_raw}` : (_raw || 'http://localhost:4000')

function hdr() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('gcd_token')}` } }

/* ── Expiry helper ── */
function expiry(ds) {
  if (!ds) return null
  try {
    const d = differenceInDays(parseISO(ds.slice(0, 10)), new Date())
    if (d < 0)    return { label: 'Expired',     d, c: '#EF4444', bg: '#FEF2F2', bc: '#FECACA' }
    if (d <= 30)  return { label: `${d}d left`,  d, c: '#EF4444', bg: '#FEF2F2', bc: '#FECACA' }
    if (d <= 90)  return { label: `${d}d left`,  d, c: '#F59E0B', bg: '#FFFBEB', bc: '#FDE68A' }
    return { label: 'Valid', d, c: '#10B981', bg: '#F0FDF4', bc: '#A7F3D0' }
  } catch { return null }
}

/* ── Category config ── */
const CATEGORIES = [
  { v: 'license',    l: 'Commercial License', icon: '🏢', color: '#2563EB', bg: '#EFF6FF', bc: '#BFDBFE' },
  { v: 'ejari',      l: 'Ejari / Tenancy',    icon: '🏠', color: '#7C3AED', bg: '#F5F3FF', bc: '#DDD6FE' },
  { v: 'insurance',  l: 'Insurance',          icon: '🛡️', color: '#059669', bg: '#F0FDF4', bc: '#A7F3D0' },
  { v: 'permit',     l: 'Permit / Approval',  icon: '✅', color: '#D97706', bg: '#FFFBEB', bc: '#FDE68A' },
  { v: 'certificate',l: 'Certificate',        icon: '📜', color: '#DC2626', bg: '#FEF2F2', bc: '#FECACA' },
  { v: 'other',      l: 'Other',              icon: '📄', color: '#6B7280', bg: '#F9FAFB', bc: '#E5E7EB' },
]
const catMap = Object.fromEntries(CATEGORIES.map(c => [c.v, c]))

/* ── Event type config ── */
const EVENT_TYPES = [
  { v: 'renewal',   l: 'Renewal',     color: '#2563EB', bg: '#EFF6FF' },
  { v: 'meeting',   l: 'Meeting',     color: '#7C3AED', bg: '#F5F3FF' },
  { v: 'deadline',  l: 'Deadline',    color: '#DC2626', bg: '#FEF2F2' },
  { v: 'payment',   l: 'Payment',     color: '#D97706', bg: '#FFFBEB' },
  { v: 'holiday',   l: 'Holiday',     color: '#059669', bg: '#F0FDF4' },
  { v: 'other',     l: 'Other',       color: '#6B7280', bg: '#F9FAFB' },
]
const evtMap = Object.fromEntries(EVENT_TYPES.map(e => [e.v, e]))

/* ── Label component ── */
function Lbl({ children }) {
  return <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>{children}</label>
}

/* ── Document Modal ── */
function DocModal({ doc, onSave, onClose }) {
  const [form, setForm] = useState(doc ? {
    name: doc.name || '',
    document_number: doc.document_number || '',
    issued_by: doc.issued_by || '',
    issue_date: doc.issue_date?.slice(0, 10) || '',
    expiry_date: doc.expiry_date?.slice(0, 10) || '',
    category: doc.category || 'other',
    notes: doc.notes || '',
  } : { name: '', document_number: '', issued_by: '', issue_date: '', expiry_date: '', category: 'other', notes: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState(null)

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSave() {
    if (!form.name) return setErr('Document name is required')
    setSaving(true); setErr(null)
    try {
      const url    = doc ? `${API}/api/office/documents/${doc.id}` : `${API}/api/office/documents`
      const method = doc ? 'PUT' : 'POST'
      const r = await fetch(url, { method, headers: hdr(), body: JSON.stringify(form) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      onSave()
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay">
      <div style={{ background: 'var(--card)', borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', margin: 0 }}>{doc ? 'Edit Document' : 'Add Document'}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Office record with expiry tracking</p>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-alt)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} color="var(--text-sub)" />
            </button>
          </div>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 13 }}>
          {err && <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: 'var(--red)' }}><AlertCircle size={14} />{err}</div>}

          <div>
            <Lbl>Category</Lbl>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
              {CATEGORIES.map(c => (
                <button key={c.v} type="button" onClick={() => set('category', c.v)}
                  style={{ padding: '8px 6px', borderRadius: 10, border: `2px solid ${form.category === c.v ? c.color : 'var(--border)'}`, background: form.category === c.v ? c.bg : 'var(--card)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                  <div style={{ fontSize: 16, marginBottom: 3 }}>{c.icon}</div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: form.category === c.v ? c.color : 'var(--text-muted)', lineHeight: 1.2 }}>{c.l}</div>
                </button>
              ))}
            </div>
          </div>

          <div><Lbl>Document Name *</Lbl><input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Commercial License 2025" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
            <div><Lbl>Document Number</Lbl><input className="input" value={form.document_number} onChange={e => set('document_number', e.target.value)} placeholder="CN-12345" /></div>
            <div><Lbl>Issued By</Lbl><input className="input" value={form.issued_by} onChange={e => set('issued_by', e.target.value)} placeholder="DED, RERA…" /></div>
            <div><Lbl>Issue Date</Lbl><input className="input" type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)} /></div>
            <div><Lbl>Expiry Date</Lbl><input className="input" type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} /></div>
          </div>
          <div><Lbl>Notes</Lbl><textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes…" style={{ resize: 'vertical' }} /></div>
        </div>
        <div style={{ padding: '14px 24px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ minWidth: 120, justifyContent: 'center' }}>
            {saving ? 'Saving…' : doc ? 'Save Changes' : 'Add Document'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Event Modal ── */
function EventModal({ event, onSave, onClose }) {
  const [form, setForm] = useState(event ? {
    title: event.title || '',
    description: event.description || '',
    event_date: event.event_date?.slice(0, 10) || '',
    event_type: event.event_type || 'other',
  } : { title: '', description: '', event_date: '', event_type: 'other' })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState(null)

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSave() {
    if (!form.title || !form.event_date) return setErr('Title and date are required')
    setSaving(true); setErr(null)
    try {
      const url    = event ? `${API}/api/office/events/${event.id}` : `${API}/api/office/events`
      const method = event ? 'PUT' : 'POST'
      const r = await fetch(url, { method, headers: hdr(), body: JSON.stringify(form) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      onSave()
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay">
      <div style={{ background: 'var(--card)', borderRadius: 20, width: '100%', maxWidth: 440, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', margin: 0 }}>{event ? 'Edit Event' : 'Add Event'}</h3>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-alt)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 13 }}>
          {err && <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: 'var(--red)' }}><AlertCircle size={14} />{err}</div>}

          <div>
            <Lbl>Event Type</Lbl>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EVENT_TYPES.map(t => (
                <button key={t.v} type="button" onClick={() => set('event_type', t.v)}
                  style={{ padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${form.event_type === t.v ? t.color : 'var(--border)'}`, background: form.event_type === t.v ? t.bg : 'var(--card)', color: form.event_type === t.v ? t.color : 'var(--text-muted)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Poppins,sans-serif' }}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          <div><Lbl>Title *</Lbl><input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Commercial License Renewal" /></div>
          <div><Lbl>Date *</Lbl><input className="input" type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)} /></div>
          <div><Lbl>Description</Lbl><textarea className="input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Details, responsible person…" style={{ resize: 'vertical' }} /></div>
        </div>
        <div style={{ padding: '14px 24px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ minWidth: 110, justifyContent: 'center' }}>
            {saving ? 'Saving…' : event ? 'Save' : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══ MAIN PAGE ══════════════════════════════════════════════════ */
export default function OfficePage() {
  const [docs,      setDocs]      = useState([])
  const [events,    setEvents]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [docModal,  setDocModal]  = useState(null)   // null | { mode:'add'|'edit', doc }
  const [evtModal,  setEvtModal]  = useState(null)
  const [userRole,  setUserRole]  = useState(null)
  const [tab,       setTab]       = useState('documents')

  useEffect(() => {
    try { const t = localStorage.getItem('gcd_token'); if (t) { const p = JSON.parse(atob(t.split('.')[1])); setUserRole(p.role) } } catch (e) {}
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [dr, er] = await Promise.all([
        fetch(`${API}/api/office/documents`, { headers: hdr() }).then(r => r.json()),
        fetch(`${API}/api/office/events`,    { headers: hdr() }).then(r => r.json()),
      ])
      setDocs(dr.documents || [])
      setEvents(er.events  || [])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function deleteDoc(id) {
    if (!confirm('Delete this document?')) return
    await fetch(`${API}/api/office/documents/${id}`, { method: 'DELETE', headers: hdr() })
    setDocs(p => p.filter(d => d.id !== id))
  }
  async function deleteEvt(id) {
    if (!confirm('Delete this event?')) return
    await fetch(`${API}/api/office/events/${id}`, { method: 'DELETE', headers: hdr() })
    setEvents(p => p.filter(e => e.id !== id))
  }

  const canEdit = ['admin', 'general_manager', 'hr'].includes(userRole)

  // Compute document stats
  const expired    = docs.filter(d => { const e = expiry(d.expiry_date); return e && e.d < 0 })
  const expiring30 = docs.filter(d => { const e = expiry(d.expiry_date); return e && e.d >= 0 && e.d <= 30 })
  const valid      = docs.filter(d => { const e = expiry(d.expiry_date); return !e || e.d > 30 })

  // Upcoming events (next 90 days)
  const today = new Date(); today.setHours(0,0,0,0)
  const upcoming = events.filter(e => {
    if (!e.event_date) return false
    const d = new Date(e.event_date); d.setHours(0,0,0,0)
    return d >= today
  }).sort((a,b) => new Date(a.event_date) - new Date(b.event_date))
  const past = events.filter(e => {
    if (!e.event_date) return false
    const d = new Date(e.event_date); d.setHours(0,0,0,0)
    return d < today
  }).sort((a,b) => new Date(b.event_date) - new Date(a.event_date))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 20, color: 'var(--text)', margin: 0, letterSpacing: '-0.03em' }}>Office Profile</h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>Company documents, licenses & upcoming events</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={14} color="var(--text-muted)" />
          </button>
          {canEdit && tab === 'documents' && (
            <button className="btn btn-primary" onClick={() => setDocModal({ mode: 'add' })} style={{ borderRadius: 24 }}>
              <Plus size={14} /> Add Document
            </button>
          )}
          {tab === 'events' && (
            <button className="btn btn-primary" onClick={() => setEvtModal({ mode: 'add' })} style={{ borderRadius: 24 }}>
              <Plus size={14} /> Add Event
            </button>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {[
          { l: 'Total Docs',  v: docs.length,      c: 'var(--text)',  bg: 'var(--bg-alt)', bc: 'var(--border)', icon: FileText   },
          { l: 'Expired',     v: expired.length,    c: '#EF4444',      bg: '#FEF2F2',       bc: '#FECACA',       icon: AlertCircle },
          { l: 'Expiring 30d',v: expiring30.length, c: '#F59E0B',      bg: '#FFFBEB',       bc: '#FDE68A',       icon: Clock       },
          { l: 'Upcoming Events', v: upcoming.length, c: '#2563EB',    bg: '#EFF6FF',       bc: '#BFDBFE',       icon: Calendar    },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.l} style={{ background: s.bg, border: `1px solid ${s.bc}`, borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
              <Icon size={20} color={s.c} style={{ margin: '0 auto 6px', display: 'block' }} />
              <div style={{ fontWeight: 900, fontSize: 22, color: s.c, letterSpacing: '-0.04em', lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: 10.5, color: s.c, fontWeight: 600, marginTop: 4, opacity: 0.8 }}>{s.l}</div>
            </div>
          )
        })}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)' }}>
        {[{ id: 'documents', l: 'Documents' }, { id: 'events', l: 'Events' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '9px 18px', fontSize: 12.5, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? 'var(--gold)' : 'var(--text-muted)', background: 'none', border: 'none', borderBottom: `2.5px solid ${tab === t.id ? 'var(--gold)' : 'transparent'}`, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', marginBottom: -1, transition: 'all 0.15s' }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── Documents tab ── */}
      {tab === 'documents' && (
        loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
            {[1,2,3,4].map(i => <div key={i} className="sk" style={{ height: 140, borderRadius: 14 }}/>)}
          </div>
        ) : docs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <FileText size={44} style={{ margin: '0 auto 14px', display: 'block', opacity: 0.12 }} />
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-sub)' }}>No documents yet</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>Add your first office document to start tracking expiries</div>
          </div>
        ) : (
          <>
            {/* Expired / expiring alerts */}
            {(expired.length > 0 || expiring30.length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {expired.length > 0 && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertCircle size={16} color="#EF4444" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#EF4444' }}>{expired.length} document{expired.length > 1 ? 's' : ''} expired:</span>
                    <span style={{ fontSize: 12.5, color: '#7F1D1D' }}>{expired.map(d => d.name).join(', ')}</span>
                  </div>
                )}
                {expiring30.length > 0 && (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Clock size={16} color="#F59E0B" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B' }}>{expiring30.length} expiring within 30 days:</span>
                    <span style={{ fontSize: 12.5, color: '#92400E' }}>{expiring30.map(d => d.name).join(', ')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Document cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 12 }}>
              {docs.map(doc => {
                const cat  = catMap[doc.category] || catMap.other
                const exp  = expiry(doc.expiry_date)
                return (
                  <div key={doc.id} style={{ background: 'var(--card)', border: `1px solid ${exp?.d !== undefined && exp.d <= 30 ? exp.bc : 'var(--border)'}`, borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', transition: 'box-shadow 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}>
                    {/* Card header */}
                    <div style={{ background: cat.bg, borderBottom: `1px solid ${cat.bc}`, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>{cat.icon}</div>
                        <div>
                          <div style={{ fontSize: 9.5, fontWeight: 800, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{cat.l}</div>
                          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)', marginTop: 1 }}>{doc.name}</div>
                        </div>
                      </div>
                      {exp && (
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: exp.c, background: exp.bg, border: `1px solid ${exp.bc}`, borderRadius: 20, padding: '2px 9px', flexShrink: 0 }}>
                          {exp.label}
                        </span>
                      )}
                    </div>
                    {/* Card body */}
                    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[
                        doc.document_number && { l: 'Doc No.',    v: doc.document_number },
                        doc.issued_by       && { l: 'Issued By',  v: doc.issued_by       },
                        doc.issue_date      && { l: 'Issue Date', v: doc.issue_date.slice(0,10) },
                        doc.expiry_date     && { l: 'Expiry',     v: doc.expiry_date.slice(0,10) },
                      ].filter(Boolean).map(row => (
                        <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.l}</span>
                          <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600, fontFamily: 'monospace' }}>{row.v}</span>
                        </div>
                      ))}
                      {doc.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>{doc.notes}</div>}
                    </div>
                    {/* Actions */}
                    {canEdit && (
                      <div style={{ padding: '0 14px 12px', display: 'flex', gap: 6 }}>
                        <button onClick={() => setDocModal({ mode: 'edit', doc })} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', borderRadius: 9, fontSize: 11.5, padding: '6px' }}>
                          <Pencil size={11} /> Edit
                        </button>
                        <button onClick={() => deleteDoc(doc.id)} style={{ padding: '6px 10px', borderRadius: 9, background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )
      )}

      {/* ── Events tab ── */}
      {tab === 'events' && (
        loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3].map(i => <div key={i} className="sk" style={{ height: 70, borderRadius: 12 }} />)}
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Calendar size={44} style={{ margin: '0 auto 14px', display: 'block', opacity: 0.12 }} />
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-sub)' }}>No events yet</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>Track renewals, meetings, deadlines and payments</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            {/* Upcoming */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Upcoming ({upcoming.length})</div>
              {upcoming.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 12 }}>No upcoming events</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {upcoming.map(ev => {
                    const et   = evtMap[ev.event_type] || evtMap.other
                    const daysAway = differenceInDays(parseISO(ev.event_date.slice(0, 10)), new Date())
                    const isToday = daysAway === 0
                    const isSoon  = daysAway <= 7
                    return (
                      <div key={ev.id} style={{ background: 'var(--card)', border: `1px solid ${isSoon ? et.color + '40' : 'var(--border)'}`, borderLeft: `3px solid ${et.color}`, borderRadius: 12, padding: '11px 14px', display: 'flex', gap: 12, alignItems: 'flex-start', boxShadow: isToday ? `0 0 0 2px ${et.color}30` : 'none' }}>
                        <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 44 }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: et.color, lineHeight: 1 }}>
                            {new Date(ev.event_date).toLocaleDateString('en-AE', { day: 'numeric' })}
                          </div>
                          <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            {new Date(ev.event_date).toLocaleDateString('en-AE', { month: 'short' })}
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: 9.5, fontWeight: 700, color: et.color, background: et.bg, borderRadius: 5, padding: '1px 7px' }}>{et.l}</span>
                            {isToday && <span style={{ fontSize: 9.5, fontWeight: 800, color: '#EF4444', background: '#FEF2F2', borderRadius: 5, padding: '1px 7px' }}>TODAY</span>}
                            {!isToday && isSoon && <span style={{ fontSize: 9.5, fontWeight: 800, color: '#F59E0B', background: '#FFFBEB', borderRadius: 5, padding: '1px 7px' }}>{daysAway}d</span>}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{ev.title}</div>
                          {ev.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{ev.description}</div>}
                          {ev.created_by_name && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Added by {ev.created_by_name}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button onClick={() => setEvtModal({ mode: 'edit', event: ev })} style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--bg-alt)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={11} color="var(--text-sub)" /></button>
                          <button onClick={() => deleteEvt(ev.id)} style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--red-bg)', border: '1px solid var(--red-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={11} color="var(--red)" /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Past */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Past ({past.length})</div>
              {past.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 12 }}>No past events</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {past.slice(0, 10).map(ev => {
                    const et = evtMap[ev.event_type] || evtMap.other
                    return (
                      <div key={ev.id} style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', borderLeft: `3px solid ${et.color}80`, borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'flex-start', opacity: 0.7 }}>
                        <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 44 }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-muted)', lineHeight: 1 }}>
                            {new Date(ev.event_date).toLocaleDateString('en-AE', { day: 'numeric' })}
                          </div>
                          <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            {new Date(ev.event_date).toLocaleDateString('en-AE', { month: 'short' })}
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 9.5, fontWeight: 700, color: et.color, background: et.bg, borderRadius: 5, padding: '1px 7px', marginBottom: 3, display: 'inline-block' }}>{et.l}</span>
                          <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-sub)' }}>{ev.title}</div>
                          {ev.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{ev.description}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button onClick={() => deleteEvt(ev.id)} style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--red-bg)', border: '1px solid var(--red-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={10} color="var(--red)" /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* Modals */}
      {docModal && (
        <DocModal
          doc={docModal.mode === 'edit' ? docModal.doc : null}
          onSave={() => { setDocModal(null); load() }}
          onClose={() => setDocModal(null)}
        />
      )}
      {evtModal && (
        <EventModal
          event={evtModal.mode === 'edit' ? evtModal.event : null}
          onSave={() => { setEvtModal(null); load() }}
          onClose={() => setEvtModal(null)}
        />
      )}
    </div>
  )
}
