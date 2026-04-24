'use client'
import React, { useState, useEffect, useCallback } from 'react'
import {
  Plus, X, Pencil, Trash2, AlertCircle, ExternalLink,
  Download, Printer, Calendar, RefreshCw, Link2,
} from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'

import { API } from '@/lib/api'

function hdr() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('gcd_token')}` } }

function expiry(ds) {
  if (!ds) return null
  try {
    const d = differenceInDays(parseISO(ds.slice(0, 10)), new Date())
    if (d < 0)   return { label: 'Expired',    d, c: '#EF4444', bg: '#FEF2F2', bc: '#FECACA' }
    if (d <= 30) return { label: `${d}d left`, d, c: '#EF4444', bg: '#FEF2F2', bc: '#FECACA' }
    if (d <= 90) return { label: `${d}d left`, d, c: '#F59E0B', bg: '#FFFBEB', bc: '#FDE68A' }
    return { label: 'Valid', d, c: '#10B981', bg: '#F0FDF4', bc: '#A7F3D0' }
  } catch { return null }
}

const CATEGORIES = [
  { v: 'license',    l: 'Commercial License', emoji: '🏢', color: '#1D4ED8', bg: '#EFF6FF', bc: '#BFDBFE' },
  { v: 'ejari',      l: 'Ejari / Tenancy',    emoji: '🏠', color: '#6D28D9', bg: '#F5F3FF', bc: '#DDD6FE' },
  { v: 'insurance',  l: 'Insurance',          emoji: '🛡️', color: '#047857', bg: '#F0FDF4', bc: '#A7F3D0' },
  { v: 'permit',     l: 'Permit / Approval',  emoji: '✅', color: '#B45309', bg: '#FFFBEB', bc: '#FDE68A' },
  { v: 'certificate',l: 'Certificate',        emoji: '📜', color: '#B91C1C', bg: '#FEF2F2', bc: '#FECACA' },
  { v: 'other',      l: 'Other',              emoji: '📄', color: '#4B5563', bg: '#F9FAFB', bc: '#E5E7EB' },
]
const catMap = Object.fromEntries(CATEGORIES.map(c => [c.v, c]))

const EVENT_TYPES = [
  { v: 'renewal',  l: 'Renewal',  color: '#1D4ED8', bg: '#EFF6FF' },
  { v: 'meeting',  l: 'Meeting',  color: '#6D28D9', bg: '#F5F3FF' },
  { v: 'deadline', l: 'Deadline', color: '#B91C1C', bg: '#FEF2F2' },
  { v: 'payment',  l: 'Payment',  color: '#B45309', bg: '#FFFBEB' },
  { v: 'holiday',  l: 'Holiday',  color: '#047857', bg: '#F0FDF4' },
  { v: 'other',    l: 'Other',    color: '#4B5563', bg: '#F9FAFB' },
]
const evtMap = Object.fromEntries(EVENT_TYPES.map(e => [e.v, e]))

function Lbl({ children }) {
  return <label style={{ display:'block', fontSize:10.5, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:5 }}>{children}</label>
}

/* ── Google Drive link helper ── */
function driveViewUrl(url) {
  if (!url) return null
  // Convert Google Drive share link to embed/view link
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (m) return `https://drive.google.com/file/d/${m[1]}/view`
  return url
}
function drivePrintUrl(url) {
  if (!url) return null
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (m) return `https://docs.google.com/viewer?url=https://drive.google.com/uc?id=${m[1]}&embedded=true`
  return url
}

/* ══ DOCUMENT MODAL ═════════════════════════════════════════════ */
function DocModal({ doc, onSave, onClose }) {
  const [form, setForm] = useState(doc ? {
    name: doc.name||'', document_number: doc.document_number||'',
    issued_by: doc.issued_by||'', issue_date: doc.issue_date?.slice(0,10)||'',
    expiry_date: doc.expiry_date?.slice(0,10)||'', category: doc.category||'other',
    notes: doc.notes||'', file_url: doc.file_url||'',
  } : { name:'', document_number:'', issued_by:'', issue_date:'', expiry_date:'', category:'other', notes:'', file_url:'' })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)
  function set(k,v) { setForm(p=>({...p,[k]:v})) }

  async function handleSave() {
    if (!form.name) return setErr('Document name is required')
    setSaving(true); setErr(null)
    try {
      const url    = doc ? `${API}/api/office/documents/${doc.id}` : `${API}/api/office/documents`
      const method = doc ? 'PUT' : 'POST'
      const r = await fetch(url, { method, headers: hdr(), body: JSON.stringify(form) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error||'Failed')
      onSave()
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay">
      <div style={{ background:'var(--card)', borderRadius:20, width:'100%', maxWidth:520, maxHeight:'92vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'var(--shadow-lg)', border:'1px solid var(--border)' }}>
        {/* Header */}
        <div style={{ padding:'22px 24px 18px', borderBottom:'1px solid var(--border)', flexShrink:0, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h3 style={{ fontWeight:800, fontSize:15, color:'var(--text)', margin:0 }}>{doc?'Edit Document':'Add Document'}</h3>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Office record with expiry tracking</p>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, background:'var(--bg-alt)', border:'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14}/></button>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 24px', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:14 }}>
          {err && <div style={{ display:'flex', gap:8, alignItems:'center', background:'var(--red-bg)', border:'1px solid var(--red-border)', borderRadius:10, padding:'10px 14px', fontSize:12.5, color:'var(--red)' }}><AlertCircle size={14}/>{err}</div>}

          {/* Category picker */}
          <div>
            <Lbl>Category</Lbl>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
              {CATEGORIES.map(c=>(
                <button key={c.v} type="button" onClick={()=>set('category',c.v)}
                  style={{ padding:'10px 8px', borderRadius:12, border:`2px solid ${form.category===c.v?c.color:'var(--border)'}`, background:form.category===c.v?c.bg:'var(--card)', cursor:'pointer', textAlign:'center', transition:'all 0.15s' }}>
                  <div style={{ fontSize:18, marginBottom:4 }}>{c.emoji}</div>
                  <div style={{ fontSize:9.5, fontWeight:700, color:form.category===c.v?c.color:'var(--text-muted)', lineHeight:1.2 }}>{c.l}</div>
                </button>
              ))}
            </div>
          </div>

          <div><Lbl>Document Name *</Lbl><input className="input" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Commercial License 2025-26"/></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
            <div><Lbl>Document Number</Lbl><input className="input" value={form.document_number} onChange={e=>set('document_number',e.target.value)} placeholder="CN-12345"/></div>
            <div><Lbl>Issued By</Lbl><input className="input" value={form.issued_by} onChange={e=>set('issued_by',e.target.value)} placeholder="DED, RERA, DLD…"/></div>
            <div><Lbl>Issue Date</Lbl><input className="input" type="date" value={form.issue_date} onChange={e=>set('issue_date',e.target.value)}/></div>
            <div><Lbl>Expiry Date</Lbl><input className="input" type="date" value={form.expiry_date} onChange={e=>set('expiry_date',e.target.value)}/></div>
          </div>

          {/* Google Drive link */}
          <div>
            <Lbl>Google Drive Link</Lbl>
            <div style={{ position:'relative' }}>
              <Link2 size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
              <input className="input" style={{ paddingLeft:32 }} value={form.file_url} onChange={e=>set('file_url',e.target.value)} placeholder="Paste Google Drive share link…"/>
            </div>
            <p style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:5 }}>Share the file in Google Drive → Copy link → Paste here. Others will be able to view, download, or print.</p>
          </div>

          <div><Lbl>Notes</Lbl><textarea className="input" rows={2} value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Any additional notes…" style={{ resize:'vertical' }}/></div>
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 24px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0 }}>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ minWidth:130, justifyContent:'center' }}>
            {saving ? 'Saving…' : doc ? 'Save Changes' : 'Add Document'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══ EVENT MODAL ════════════════════════════════════════════════ */
function EventModal({ event, onSave, onClose }) {
  const [form, setForm] = useState(event ? {
    title: event.title||'', description: event.description||'',
    event_date: event.event_date?.slice(0,10)||'', event_type: event.event_type||'other',
  } : { title:'', description:'', event_date:'', event_type:'other' })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)
  function set(k,v) { setForm(p=>({...p,[k]:v})) }

  async function handleSave() {
    if (!form.title||!form.event_date) return setErr('Title and date are required')
    setSaving(true); setErr(null)
    try {
      const url    = event ? `${API}/api/office/events/${event.id}` : `${API}/api/office/events`
      const method = event ? 'PUT' : 'POST'
      const r = await fetch(url, { method, headers: hdr(), body: JSON.stringify(form) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error||'Failed')
      onSave()
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay">
      <div style={{ background:'var(--card)', borderRadius:20, width:'100%', maxWidth:440, maxHeight:'92vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'var(--shadow-lg)', border:'1px solid var(--border)' }}>
        <div style={{ padding:'22px 24px 18px', borderBottom:'1px solid var(--border)', flexShrink:0, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontWeight:800, fontSize:15, color:'var(--text)', margin:0 }}>{event?'Edit Event':'Add Event'}</h3>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, background:'var(--bg-alt)', border:'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14}/></button>
        </div>
        <div style={{ padding:'20px 24px', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:14 }}>
          {err && <div style={{ display:'flex', gap:8, alignItems:'center', background:'var(--red-bg)', border:'1px solid var(--red-border)', borderRadius:10, padding:'10px 14px', fontSize:12.5, color:'var(--red)' }}><AlertCircle size={14}/>{err}</div>}
          <div>
            <Lbl>Event Type</Lbl>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {EVENT_TYPES.map(t=>(
                <button key={t.v} type="button" onClick={()=>set('event_type',t.v)}
                  style={{ padding:'5px 13px', borderRadius:20, border:`1.5px solid ${form.event_type===t.v?t.color:'var(--border)'}`, background:form.event_type===t.v?t.bg:'var(--card)', color:form.event_type===t.v?t.color:'var(--text-muted)', fontSize:11.5, fontWeight:700, cursor:'pointer', transition:'all 0.15s', fontFamily:'Poppins,sans-serif' }}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>
          <div><Lbl>Title *</Lbl><input className="input" value={form.title} onChange={e=>set('title',e.target.value)} placeholder="e.g. Commercial License Renewal"/></div>
          <div><Lbl>Date *</Lbl><input className="input" type="date" value={form.event_date} onChange={e=>set('event_date',e.target.value)}/></div>
          <div><Lbl>Description</Lbl><textarea className="input" rows={2} value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Details, responsible person…" style={{ resize:'vertical' }}/></div>
        </div>
        <div style={{ padding:'14px 24px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0 }}>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ minWidth:110, justifyContent:'center' }}>
            {saving?'Saving…':event?'Save':'Add Event'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══ MAIN PAGE ══════════════════════════════════════════════════ */
export default function OfficePage() {
  const [docs,     setDocs]     = useState([])
  const [events,   setEvents]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [docModal, setDocModal] = useState(null)
  const [evtModal, setEvtModal] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [tab,      setTab]      = useState('documents')

  useEffect(() => {
    try { const t=localStorage.getItem('gcd_token'); if(t){const p=JSON.parse(atob(t.split('.')[1]));setUserRole(p.role)} } catch(e){}
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [dr, er] = await Promise.all([
        fetch(`${API}/api/office/documents`, { headers: hdr() }).then(r=>r.json()),
        fetch(`${API}/api/office/events`,    { headers: hdr() }).then(r=>r.json()),
      ])
      setDocs(dr.documents||[])
      setEvents(er.events||[])
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const canEdit = ['admin','general_manager','hr'].includes(userRole)

  async function deleteDoc(id) {
    if (!confirm('Delete this document?')) return
    await fetch(`${API}/api/office/documents/${id}`, { method:'DELETE', headers:hdr() })
    setDocs(p=>p.filter(d=>d.id!==id))
  }
  async function deleteEvt(id) {
    if (!confirm('Delete this event?')) return
    await fetch(`${API}/api/office/events/${id}`, { method:'DELETE', headers:hdr() })
    setEvents(p=>p.filter(e=>e.id!==id))
  }

  const expired    = docs.filter(d=>{ const e=expiry(d.expiry_date); return e&&e.d<0 })
  const expiring30 = docs.filter(d=>{ const e=expiry(d.expiry_date); return e&&e.d>=0&&e.d<=30 })

  const today    = new Date(); today.setHours(0,0,0,0)
  const upcoming = events.filter(e=>{ if(!e.event_date) return false; const d=new Date(e.event_date); d.setHours(0,0,0,0); return d>=today }).sort((a,b)=>new Date(a.event_date)-new Date(b.event_date))
  const past     = events.filter(e=>{ if(!e.event_date) return false; const d=new Date(e.event_date); d.setHours(0,0,0,0); return d<today  }).sort((a,b)=>new Date(b.event_date)-new Date(a.event_date))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* ── Header ── */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, overflow:'hidden', boxShadow:'var(--shadow)' }}>
        <div style={{ height:4, background:'linear-gradient(90deg,#B8934A,#E8C97A,#B8934A)' }}/>
        <div className="page-header" style={{ padding:'18px 22px', margin:0 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <span style={{ fontSize:24 }}>🏢</span>
              <h1 style={{ fontWeight:900, fontSize:22, color:'var(--text)', margin:0, letterSpacing:'-0.03em' }}>Office Profile</h1>
            </div>
            <p style={{ fontSize:12.5, color:'var(--text-muted)', marginTop:0 }}>Company documents, licenses &amp; upcoming events</p>
          </div>
          <div className="page-header-actions">
            <button onClick={load} title="Refresh" style={{ width:36, height:36, borderRadius:10, background:'var(--bg-alt)', border:'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <RefreshCw size={14} color="var(--text-muted)"/>
            </button>
            {canEdit && tab==='documents' && (
              <button className="btn btn-primary" onClick={()=>setDocModal({mode:'add'})} style={{ borderRadius:24 }}>
                <Plus size={14}/> Add Document
              </button>
            )}
            {tab==='events' && (
              <button className="btn btn-primary" onClick={()=>setEvtModal({mode:'add'})} style={{ borderRadius:24 }}>
                <Plus size={14}/> Add Event
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="r-grid-4">
        {[
          { l:'Total Documents',     v:docs.length,        c:'#1D4ED8', bg:'#EFF6FF', bc:'#BFDBFE', em:'📁' },
          { l:'Expired',             v:expired.length,     c:'#DC2626', bg:'#FEF2F2', bc:'#FECACA', em:'⚠️' },
          { l:'Expiring in 30 days', v:expiring30.length,  c:'#D97706', bg:'#FFFBEB', bc:'#FDE68A', em:'⏳' },
          { l:'Upcoming Events',     v:upcoming.length,    c:'#047857', bg:'#F0FDF4', bc:'#A7F3D0', em:'📅' },
        ].map(s=>(
          <div key={s.l} style={{ background:s.bg, border:`1px solid ${s.bc}`, borderRadius:16, padding:'18px 16px', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{s.em}</div>
            <div style={{ fontWeight:900, fontSize:30, color:s.c, letterSpacing:'-0.04em', lineHeight:1 }}>{s.v}</div>
            <div style={{ fontSize:11, color:s.c, fontWeight:600, marginTop:7, opacity:0.8 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── Alert banners ── */}
      {expired.length>0 && (
        <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:12, padding:'11px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <AlertCircle size={15} color="#DC2626"/>
          <span style={{ fontSize:13, fontWeight:700, color:'#DC2626' }}>{expired.length} document{expired.length>1?'s':''} expired:</span>
          <span style={{ fontSize:12.5, color:'#7F1D1D' }}>{expired.map(d=>d.name).join(' · ')}</span>
        </div>
      )}
      {expiring30.length>0 && (
        <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:12, padding:'11px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <AlertCircle size={15} color="#D97706"/>
          <span style={{ fontSize:13, fontWeight:700, color:'#D97706' }}>{expiring30.length} expiring within 30 days:</span>
          <span style={{ fontSize:12.5, color:'#92400E' }}>{expiring30.map(d=>d.name).join(' · ')}</span>
        </div>
      )}

      {/* ── Tab bar ── */}
      <div style={{ display:'flex', gap:2, borderBottom:'1px solid var(--border)' }}>
        {[{id:'documents',l:'Documents'},{id:'events',l:'Events'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:'9px 20px', fontSize:12.5, fontWeight:tab===t.id?700:500, color:tab===t.id?'var(--gold)':'var(--text-muted)', background:'none', border:'none', borderBottom:`2.5px solid ${tab===t.id?'var(--gold)':'transparent'}`, cursor:'pointer', fontFamily:'Poppins,sans-serif', marginBottom:-1, transition:'all 0.15s' }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ══ DOCUMENTS TAB ══ */}
      {tab==='documents' && (
        loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[1,2,3].map(i=><div key={i} className="sk" style={{ height:120, borderRadius:14 }}/>)}
          </div>
        ) : docs.length===0 ? (
          <div style={{ textAlign:'center', padding:'80px 20px' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📁</div>
            <div style={{ fontWeight:700, fontSize:16, color:'var(--text-sub)' }}>No documents yet</div>
            <div style={{ fontSize:12.5, color:'var(--text-muted)', marginTop:4 }}>Add your first office document to start tracking expiries</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {docs.map(doc=>{
              const cat = catMap[doc.category]||catMap.other
              const exp = expiry(doc.expiry_date)
              const fileUrl = driveViewUrl(doc.file_url)
              return (
                <div key={doc.id} className="doc-card" style={{ border:`1px solid ${exp&&exp.d<=30?exp.bc:'var(--border)'}` }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow='var(--shadow-md)'}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow='var(--shadow)'}>

                  {/* Left accent */}
                  <div style={{ width:5, background:cat.color, flexShrink:0 }}/>

                  {/* Content */}
                  <div className="doc-card-body">
                    {/* Top row: emoji + info */}
                    <div style={{ display:'flex', alignItems:'center', gap:14, flex:1, minWidth:0, width:'100%' }}>
                      {/* Emoji */}
                      <div style={{ width:50, height:50, borderRadius:15, background:cat.bg, border:`1.5px solid ${cat.bc}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0, boxShadow:'0 2px 6px rgba(0,0,0,0.06)' }}>
                        {cat.emoji}
                      </div>

                      {/* Main info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                          <span style={{ fontSize:10, fontWeight:800, color:cat.color, textTransform:'uppercase', letterSpacing:'0.07em', background:cat.bg, border:`1px solid ${cat.bc}`, borderRadius:6, padding:'1px 8px' }}>{cat.l}</span>
                          {exp && <span style={{ fontSize:10.5, fontWeight:700, color:exp.c, background:exp.bg, border:`1px solid ${exp.bc}`, borderRadius:20, padding:'1px 9px' }}>{exp.label}</span>}
                        </div>
                        <div style={{ fontWeight:800, fontSize:15, color:'var(--text)', marginBottom:4 }}>{doc.name}</div>
                        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:2 }}>
                          {doc.document_number && (
                            <span style={{ fontSize:10.5, color:'var(--text-sub)', background:'var(--bg-alt)', border:'1px solid var(--border)', borderRadius:6, padding:'2px 9px' }}>
                              #{doc.document_number}
                            </span>
                          )}
                          {doc.issued_by && (
                            <span style={{ fontSize:10.5, color:'var(--text-sub)', background:'var(--bg-alt)', border:'1px solid var(--border)', borderRadius:6, padding:'2px 9px' }}>
                              {doc.issued_by}
                            </span>
                          )}
                          {doc.issue_date && (
                            <span style={{ fontSize:10.5, color:'var(--text-muted)', background:'var(--bg-alt)', border:'1px solid var(--border)', borderRadius:6, padding:'2px 9px' }}>
                              Issued {doc.issue_date.slice(0,10)}
                            </span>
                          )}
                          {doc.expiry_date && (
                            <span style={{ fontSize:10.5, color:'var(--text-muted)', background:'var(--bg-alt)', border:'1px solid var(--border)', borderRadius:6, padding:'2px 9px' }}>
                              Expires {doc.expiry_date.slice(0,10)}
                            </span>
                          )}
                        </div>
                        {doc.notes && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4, fontStyle:'italic' }}>{doc.notes}</div>}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="doc-card-actions">
                      {fileUrl ? (
                        <>
                          <a href={fileUrl} target="_blank" rel="noreferrer"
                            style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 13px', borderRadius:9, background:'#EFF6FF', border:'1px solid #BFDBFE', color:'#1D4ED8', fontSize:12, fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }}>
                            <ExternalLink size={12}/> View
                          </a>
                          <a href={doc.file_url} download
                            style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 13px', borderRadius:9, background:'var(--bg-alt)', border:'1px solid var(--border)', color:'var(--text-sub)', fontSize:12, fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }}>
                            <Download size={12}/> Download
                          </a>
                          <a href={fileUrl} target="_blank" rel="noreferrer" onClick={e=>{ e.preventDefault(); const w=window.open(fileUrl,'_blank'); w&&setTimeout(()=>w.print(),2000) }}
                            style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 13px', borderRadius:9, background:'var(--bg-alt)', border:'1px solid var(--border)', color:'var(--text-sub)', fontSize:12, fontWeight:700, textDecoration:'none', cursor:'pointer', whiteSpace:'nowrap' }}>
                            <Printer size={12}/> Print
                          </a>
                        </>
                      ) : (
                        <span style={{ fontSize:11, color:'var(--text-muted)', fontStyle:'italic' }}>No file attached</span>
                      )}
                      {canEdit && (
                        <>
                          <button onClick={()=>setDocModal({mode:'edit',doc})} style={{ width:32, height:32, borderRadius:9, background:'var(--bg-alt)', border:'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Pencil size={13} color="var(--text-sub)"/>
                          </button>
                          <button onClick={()=>deleteDoc(doc.id)} style={{ width:32, height:32, borderRadius:9, background:'var(--red-bg)', border:'1px solid var(--red-border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Trash2 size={13} color="var(--red)"/>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ══ EVENTS TAB ══ */}
      {tab==='events' && (
        loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[1,2,3].map(i=><div key={i} className="sk" style={{ height:72, borderRadius:12 }}/>)}
          </div>
        ) : events.length===0 ? (
          <div style={{ textAlign:'center', padding:'80px 20px' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📅</div>
            <div style={{ fontWeight:700, fontSize:16, color:'var(--text-sub)' }}>No events yet</div>
            <div style={{ fontSize:12.5, color:'var(--text-muted)', marginTop:4 }}>Track renewals, meetings, deadlines and payments</div>
          </div>
        ) : (
          <div className="events-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            {/* Upcoming */}
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                <Calendar size={12}/> Upcoming · {upcoming.length}
              </div>
              {upcoming.length===0
                ? <div style={{ textAlign:'center', padding:'24px', color:'var(--text-muted)', fontSize:12, background:'var(--bg-alt)', borderRadius:12 }}>No upcoming events</div>
                : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {upcoming.map(ev=>{
                      const et = evtMap[ev.event_type]||evtMap.other
                      const daysAway = differenceInDays(parseISO(ev.event_date.slice(0,10)), new Date())
                      const isToday = daysAway===0
                      const isSoon  = daysAway<=7
                      return (
                        <div key={ev.id} style={{ background:'var(--card)', border:`1px solid ${isSoon?et.color+'40':'var(--border)'}`, borderLeft:`4px solid ${et.color}`, borderRadius:12, padding:'12px 14px', display:'flex', gap:12, alignItems:'flex-start' }}>
                          <div style={{ flexShrink:0, textAlign:'center', minWidth:40, paddingTop:2 }}>
                            <div style={{ fontSize:20, fontWeight:900, color:et.color, lineHeight:1 }}>{new Date(ev.event_date).toLocaleDateString('en-AE',{day:'numeric'})}</div>
                            <div style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginTop:1 }}>{new Date(ev.event_date).toLocaleDateString('en-AE',{month:'short'})}</div>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
                              <span style={{ fontSize:9.5, fontWeight:700, color:et.color, background:et.bg, borderRadius:5, padding:'1px 7px' }}>{et.l}</span>
                              {isToday && <span style={{ fontSize:9.5, fontWeight:800, color:'#DC2626', background:'#FEF2F2', borderRadius:5, padding:'1px 7px' }}>TODAY</span>}
                              {!isToday&&isSoon && <span style={{ fontSize:9.5, fontWeight:800, color:'#D97706', background:'#FFFBEB', borderRadius:5, padding:'1px 7px' }}>{daysAway}d</span>}
                            </div>
                            <div style={{ fontWeight:700, fontSize:13.5, color:'var(--text)' }}>{ev.title}</div>
                            {ev.description && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{ev.description}</div>}
                            {ev.created_by_name && <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4 }}>Added by {ev.created_by_name}</div>}
                          </div>
                          <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                            <button onClick={()=>setEvtModal({mode:'edit',event:ev})} style={{ width:28, height:28, borderRadius:8, background:'var(--bg-alt)', border:'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Pencil size={11} color="var(--text-sub)"/></button>
                            <button onClick={()=>deleteEvt(ev.id)} style={{ width:28, height:28, borderRadius:8, background:'var(--red-bg)', border:'1px solid var(--red-border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Trash2 size={11} color="var(--red)"/></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
              }
            </div>

            {/* Past */}
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                <Calendar size={12}/> Past · {past.length}
              </div>
              {past.length===0
                ? <div style={{ textAlign:'center', padding:'24px', color:'var(--text-muted)', fontSize:12, background:'var(--bg-alt)', borderRadius:12 }}>No past events</div>
                : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {past.slice(0,10).map(ev=>{
                      const et = evtMap[ev.event_type]||evtMap.other
                      return (
                        <div key={ev.id} style={{ background:'var(--bg-alt)', border:'1px solid var(--border)', borderLeft:`4px solid ${et.color}80`, borderRadius:12, padding:'11px 14px', display:'flex', gap:12, alignItems:'flex-start', opacity:0.65 }}>
                          <div style={{ flexShrink:0, textAlign:'center', minWidth:40, paddingTop:2 }}>
                            <div style={{ fontSize:18, fontWeight:800, color:'var(--text-muted)', lineHeight:1 }}>{new Date(ev.event_date).toLocaleDateString('en-AE',{day:'numeric'})}</div>
                            <div style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginTop:1 }}>{new Date(ev.event_date).toLocaleDateString('en-AE',{month:'short'})}</div>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <span style={{ fontSize:9.5, fontWeight:700, color:et.color, background:et.bg, borderRadius:5, padding:'1px 7px', marginBottom:3, display:'inline-block' }}>{et.l}</span>
                            <div style={{ fontWeight:600, fontSize:12.5, color:'var(--text-sub)' }}>{ev.title}</div>
                            {ev.description && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{ev.description}</div>}
                          </div>
                          <button onClick={()=>deleteEvt(ev.id)} style={{ width:26, height:26, borderRadius:7, background:'var(--red-bg)', border:'1px solid var(--red-border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Trash2 size={10} color="var(--red)"/></button>
                        </div>
                      )
                    })}
                  </div>
              }
            </div>
          </div>
        )
      )}

      {/* Modals */}
      {docModal && <DocModal doc={docModal.mode==='edit'?docModal.doc:null} onSave={()=>{setDocModal(null);load()}} onClose={()=>setDocModal(null)}/>}
      {evtModal && <EventModal event={evtModal.mode==='edit'?evtModal.event:null} onSave={()=>{setEvtModal(null);load()}} onClose={()=>setEvtModal(null)}/>}
    </div>
  )
}
