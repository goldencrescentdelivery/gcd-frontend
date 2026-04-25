'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { API } from '@/lib/api'
import {
  Car, ArrowDownToLine, ArrowUpFromLine, Fuel, Gauge,
  User, MapPin, X, ChevronLeft, ChevronRight, Search, Camera,
} from 'lucide-react'

const FUEL_LABEL = { empty:'Empty', quarter:'1/4', half:'1/2', three_quarter:'3/4', full:'Full' }
const hdr = () => ({ Authorization:`Bearer ${localStorage.getItem('gcd_token')}` })

// ── Lightbox ────────────────────────────────────────────────────
function Lightbox({ photos, startIdx, onClose }) {
  const [idx, setIdx] = useState(startIdx || 0)
  const list = photos.filter(Boolean)

  const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), [])
  const next = useCallback(() => setIdx(i => Math.min(list.length - 1, i + 1)), [list.length])

  useEffect(() => {
    const fn = e => {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape')     onClose()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [prev, next, onClose])

  if (!list.length) return null

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.94)', zIndex:9999, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}
      onClick={onClose}>
      {/* Close */}
      <button onClick={onClose}
        style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:40, height:40, color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <X size={20}/>
      </button>

      {/* Image */}
      <div style={{ position:'relative' }} onClick={e=>e.stopPropagation()}>
        <img src={list[idx]} alt={`Photo ${idx+1}`}
          style={{ maxWidth:'88vw', maxHeight:'78vh', objectFit:'contain', borderRadius:12, boxShadow:'0 8px 40px rgba(0,0,0,0.6)' }}/>

        {/* Prev */}
        {idx > 0 && (
          <button onClick={prev}
            style={{ position:'absolute', left:-50, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:38, height:38, color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ChevronLeft size={20}/>
          </button>
        )}
        {/* Next */}
        {idx < list.length - 1 && (
          <button onClick={next}
            style={{ position:'absolute', right:-50, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:38, height:38, color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ChevronRight size={20}/>
          </button>
        )}
      </div>

      {/* Counter + strip */}
      <div style={{ marginTop:20, display:'flex', alignItems:'center', gap:10 }} onClick={e=>e.stopPropagation()}>
        <span style={{ color:'rgba(255,255,255,0.6)', fontSize:13 }}>{idx+1} / {list.length}</span>
        <div style={{ display:'flex', gap:6 }}>
          {list.map((url, i) => (
            <div key={i} onClick={()=>setIdx(i)}
              style={{ width:46, height:46, borderRadius:7, overflow:'hidden', cursor:'pointer', border:`2px solid ${i===idx?'white':'transparent'}`, opacity: i===idx?1:0.5, transition:'all 0.15s' }}>
              <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Card ────────────────────────────────────────────────────────
function HandoverCard({ h, onPhoto }) {
  const isReceived = h.type === 'received'
  const photos = [h.photo_1, h.photo_2, h.photo_3, h.photo_4].filter(Boolean)

  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
      {/* Colour bar */}
      <div style={{ height:3, background: isReceived ? '#10B981' : '#EF4444' }}/>

      <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>

        {/* Row 1 — plate + type + date */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ width:36, height:36, borderRadius:9, background: isReceived?'#ECFDF5':'#FEF2F2', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {isReceived ? <ArrowDownToLine size={16} color="#10B981"/> : <ArrowUpFromLine size={16} color="#EF4444"/>}
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:16, color:'var(--text)', letterSpacing:'0.02em' }}>
                {h.vehicle_plate || h.plate || '—'}
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>{h.make} {h.model}</div>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background: isReceived?'#ECFDF5':'#FEF2F2', color: isReceived?'#10B981':'#EF4444' }}>
              {isReceived ? 'Received' : 'Returned'}
            </span>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>
              {new Date(h.submitted_at).toLocaleDateString('en-AE',{day:'numeric',month:'short',year:'numeric'})}
            </div>
          </div>
        </div>

        {/* Row 2 — 4 detail chips */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:6 }}>
          {[
            { icon:<User size={11}/>,   label:'Driver',   value: h.emp_name || '—' },
            { icon:<MapPin size={11}/>, label:'Station',  value: h.station_code || h.vehicle_station || '—' },
            { icon:<Fuel size={11}/>,   label:'Fuel',     value: FUEL_LABEL[h.fuel_level] || h.fuel_level || '—' },
            { icon:<Gauge size={11}/>,  label:'ODO',      value: h.odometer ? `${Number(h.odometer).toLocaleString()} km` : '—' },
          ].map(c => (
            <div key={c.label} style={{ background:'var(--bg-alt)', borderRadius:8, padding:'7px 8px' }}>
              <div style={{ fontSize:9.5, color:'var(--text-muted)', fontWeight:700, display:'flex', alignItems:'center', gap:3, marginBottom:2 }}>
                {c.icon} {c.label}
              </div>
              <div style={{ fontSize:12, color:'var(--text)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Row 3 — handover person */}
        {(h.handover_from || h.handover_to) && (
          <div style={{ fontSize:12, color:'var(--text-sub)' }}>
            <span style={{ color:'var(--text-muted)' }}>{isReceived ? 'Received from:' : 'Handed to:'}</span>{' '}
            <strong style={{ color:'var(--text)' }}>{h.handover_from || h.handover_to}</strong>
          </div>
        )}

        {/* Row 4 — condition note */}
        {h.condition_note && (
          <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8, padding:'7px 10px', fontSize:12, color:'#92400E' }}>
            {h.condition_note}
          </div>
        )}

        {/* Row 5 — photos (always shown) */}
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
            <div style={{ fontSize:10.5, color:'var(--text-muted)', fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
              <Camera size={11}/> PHOTOS
              {photos.length > 0 && (
                <span style={{ background:'var(--gold,#B8860B)', color:'white', borderRadius:10, padding:'1px 7px', fontSize:10, fontWeight:700 }}>{photos.length}</span>
              )}
            </div>
            {h.photos_expire_at && photos.length > 0 && (
              <span style={{ fontSize:10, color:'#F59E0B' }}>
                expires {new Date(h.photos_expire_at).toLocaleDateString('en-AE',{day:'numeric',month:'short'})}
              </span>
            )}
          </div>

          {photos.length === 0 ? (
            <div style={{ background:'var(--bg-alt)', borderRadius:8, padding:'10px', display:'flex', alignItems:'center', gap:8, color:'var(--text-muted)', fontSize:12 }}>
              <Camera size={14} style={{ opacity:0.4 }}/>
              No photos uploaded
            </div>
          ) : (
            <div style={{ display:'flex', gap:6 }}>
              {photos.map((url, i) => (
                <div key={i} onClick={()=>onPhoto(photos, i)}
                  style={{ flex:1, aspectRatio:'1', borderRadius:8, overflow:'hidden', cursor:'pointer', border:'2px solid var(--border)', position:'relative' }}>
                  <img src={url} alt={`Photo ${i+1}`} style={{ width:'100%', height:'100%', objectFit:'cover' }}
                    loading="lazy"/>
                  {i === 0 && photos.length > 1 && (
                    <div style={{ position:'absolute', bottom:3, right:3, background:'rgba(0,0,0,0.65)', color:'white', fontSize:9, fontWeight:700, borderRadius:5, padding:'1px 5px' }}>
                      1/{photos.length}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────
export default function HandoversPage() {
  const { user } = useAuth()
  const [handovers, setHandovers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('all')
  const [search,    setSearch]    = useState('')
  const [dateFilter,setDateFilter]= useState('all')  // all | today | week
  const [lightbox,  setLightbox]  = useState(null)

  useEffect(() => {
    fetch(`${API}/api/handovers`, { headers: hdr() })
      .then(r => r.json())
      .then(d => setHandovers(d.handovers || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const filtered = handovers.filter(h => {
    if (filter !== 'all' && h.type !== filter) return false
    if (dateFilter === 'today') {
      const d = new Date(h.submitted_at)
      if (d.toDateString() !== now.toDateString()) return false
    } else if (dateFilter === 'week') {
      const d = new Date(h.submitted_at)
      const diff = (now - d) / (1000 * 60 * 60 * 24)
      if (diff > 7) return false
    }
    if (search) {
      const q = search.toLowerCase()
      return (
        (h.vehicle_plate||h.plate||'').toLowerCase().includes(q) ||
        (h.emp_name||'').toLowerCase().includes(q) ||
        (h.station_code||'').toLowerCase().includes(q) ||
        (h.handover_from||'').toLowerCase().includes(q) ||
        (h.handover_to||'').toLowerCase().includes(q)
      )
    }
    return true
  })

  const counts = {
    all:      handovers.length,
    received: handovers.filter(h=>h.type==='received').length,
    returned: handovers.filter(h=>h.type==='returned').length,
    today:    handovers.filter(h=>new Date(h.submitted_at).toDateString()===now.toDateString()).length,
  }

  return (
    <div style={{ maxWidth:860, margin:'0 auto', padding:'0 0 40px' }}>

      {/* Stats strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        {[
          { label:'Total',    value:counts.all,      color:'#6366F1' },
          { label:'Received', value:counts.received,  color:'#10B981' },
          { label:'Returned', value:counts.returned,  color:'#EF4444' },
          { label:'Today',    value:counts.today,     color:'#F59E0B' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 14px' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.label}</div>
            <div style={{ fontSize:26, fontWeight:800, color:s.color, lineHeight:1.1, marginTop:2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        {/* Search */}
        <div style={{ flex:1, minWidth:160, position:'relative' }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Plate, driver, station…"
            style={{ width:'100%', padding:'8px 10px 8px 30px', borderRadius:9, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', fontSize:12.5, fontFamily:'Poppins,sans-serif', boxSizing:'border-box', outline:'none' }}/>
        </div>

        {/* Type filter */}
        <div style={{ display:'flex', background:'var(--bg-alt)', borderRadius:9, padding:3, gap:2 }}>
          {[['all','All'],['received','In'],['returned','Out']].map(([v,l]) => (
            <button key={v} onClick={()=>setFilter(v)}
              style={{ padding:'6px 12px', borderRadius:7, border:'none', background: filter===v?'var(--card)':'transparent', color: filter===v?'var(--text)':'var(--text-muted)', fontWeight: filter===v?700:500, fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif', boxShadow: filter===v?'0 1px 4px rgba(0,0,0,0.1)':'none', transition:'all 0.15s' }}>
              {l}
            </button>
          ))}
        </div>

        {/* Date filter */}
        <div style={{ display:'flex', background:'var(--bg-alt)', borderRadius:9, padding:3, gap:2 }}>
          {[['all','All time'],['today','Today'],['week','This week']].map(([v,l]) => (
            <button key={v} onClick={()=>setDateFilter(v)}
              style={{ padding:'6px 12px', borderRadius:7, border:'none', background: dateFilter===v?'var(--card)':'transparent', color: dateFilter===v?'var(--text)':'var(--text-muted)', fontWeight: dateFilter===v?700:500, fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif', boxShadow: dateFilter===v?'0 1px 4px rgba(0,0,0,0.1)':'none', transition:'all 0.15s' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <div style={{ fontSize:11.5, color:'var(--text-muted)', marginBottom:10 }}>
          {filtered.length} record{filtered.length!==1?'s':''} {filter!=='all'||dateFilter!=='all'||search?'matching filters':'total'}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2,3].map(i=>(
            <div key={i} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, height:160, animation:'pulse 1.5s ease infinite', opacity:0.6 }}/>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'50px 20px', color:'var(--text-muted)' }}>
          <Car size={40} style={{ margin:'0 auto 12px', display:'block', opacity:0.2 }}/>
          <div style={{ fontWeight:600, fontSize:14 }}>No handovers found</div>
          <div style={{ fontSize:12, marginTop:4 }}>Try adjusting your filters</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map(h => (
            <HandoverCard key={h.id} h={h}
              onPhoto={(photos, i) => setLightbox({ photos, startIdx: i })}/>
          ))}
        </div>
      )}

      {lightbox && (
        <Lightbox
          photos={lightbox.photos}
          startIdx={lightbox.startIdx}
          onClose={() => setLightbox(null)}/>
      )}
    </div>
  )
}
