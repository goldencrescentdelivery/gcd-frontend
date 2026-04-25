'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { API } from '@/lib/api'
import { Car, ArrowDownToLine, ArrowUpFromLine, Fuel, Gauge, User, MapPin, Calendar, X, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react'

const FUEL_LABEL = { empty:'Empty', quarter:'1/4', half:'1/2', three_quarter:'3/4', full:'Full' }
const hdr = () => ({ Authorization:`Bearer ${localStorage.getItem('gcd_token')}` })

function PhotoViewer({ photos, onClose }) {
  const [idx, setIdx] = useState(0)
  const list = photos.filter(Boolean)
  if (!list.length) return null

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', zIndex:9999, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}
      onClick={onClose}>
      <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:36, height:36, color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <X size={18}/>
      </button>
      <div style={{ position:'relative', maxWidth:'90vw', maxHeight:'80vh' }} onClick={e=>e.stopPropagation()}>
        <img src={list[idx]} alt={`Photo ${idx+1}`} style={{ maxWidth:'90vw', maxHeight:'80vh', objectFit:'contain', borderRadius:12 }}/>
        <div style={{ position:'absolute', bottom:-40, left:'50%', transform:'translateX(-50%)', display:'flex', alignItems:'center', gap:12, color:'white', fontSize:13 }}>
          <button onClick={()=>setIdx(i=>Math.max(0,i-1))} disabled={idx===0}
            style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:30, height:30, color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity:idx===0?0.4:1 }}>
            <ChevronLeft size={16}/>
          </button>
          <span>{idx+1} / {list.length}</span>
          <button onClick={()=>setIdx(i=>Math.min(list.length-1,i+1))} disabled={idx===list.length-1}
            style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:30, height:30, color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity:idx===list.length-1?0.4:1 }}>
            <ChevronRight size={16}/>
          </button>
        </div>
      </div>
    </div>
  )
}

function HandoverCard({ h, onViewPhotos }) {
  const isReceived = h.type === 'received'
  const photos = [h.photo_1, h.photo_2, h.photo_3, h.photo_4].filter(Boolean)

  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
      <div style={{ height:3, background: isReceived ? '#10B981' : '#EF4444' }}/>
      <div style={{ padding:'14px 16px' }}>
        {/* Header row */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:10, background: isReceived?'#ECFDF5':'#FEF2F2', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {isReceived ? <ArrowDownToLine size={17} color="#10B981"/> : <ArrowUpFromLine size={17} color="#EF4444"/>}
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:'var(--text)' }}>{h.vehicle_plate || h.plate || '—'}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>{h.make} {h.model}</div>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background: isReceived?'#ECFDF5':'#FEF2F2', color: isReceived?'#10B981':'#EF4444' }}>
              {isReceived ? 'Received' : 'Returned'}
            </span>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
              {new Date(h.submitted_at).toLocaleDateString('en-AE',{day:'numeric',month:'short',year:'numeric'})}
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
          <div style={{ background:'var(--bg-alt)', borderRadius:9, padding:'8px 10px' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, marginBottom:2 }}>DRIVER</div>
            <div style={{ fontSize:12.5, color:'var(--text)', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
              <User size={11}/> {h.emp_name || '—'}
            </div>
          </div>
          <div style={{ background:'var(--bg-alt)', borderRadius:9, padding:'8px 10px' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, marginBottom:2 }}>STATION</div>
            <div style={{ fontSize:12.5, color:'var(--text)', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
              <MapPin size={11}/> {h.station_code || h.vehicle_station || '—'}
            </div>
          </div>
          <div style={{ background:'var(--bg-alt)', borderRadius:9, padding:'8px 10px' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, marginBottom:2 }}>FUEL</div>
            <div style={{ fontSize:12.5, color:'var(--text)', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
              <Fuel size={11}/> {FUEL_LABEL[h.fuel_level] || h.fuel_level || '—'}
            </div>
          </div>
          <div style={{ background:'var(--bg-alt)', borderRadius:9, padding:'8px 10px' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, marginBottom:2 }}>ODOMETER</div>
            <div style={{ fontSize:12.5, color:'var(--text)', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
              <Gauge size={11}/> {h.odometer ? `${Number(h.odometer).toLocaleString()} km` : '—'}
            </div>
          </div>
        </div>

        {/* Handover person */}
        {(h.handover_from || h.handover_to) && (
          <div style={{ fontSize:12, color:'var(--text-sub)', marginBottom:8 }}>
            {isReceived ? 'Received from' : 'Handed to'}: <strong>{h.handover_from || h.handover_to}</strong>
          </div>
        )}

        {/* Condition note */}
        {h.condition_note && (
          <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8, padding:'8px 10px', fontSize:12, color:'#92400E', marginBottom:10 }}>
            {h.condition_note}
          </div>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <div>
            <div style={{ fontSize:10.5, color:'var(--text-muted)', fontWeight:600, marginBottom:6 }}>
              PHOTOS ({photos.length})
              {h.photos_expire_at && (
                <span style={{ marginLeft:8, color:'#F59E0B' }}>
                  — expires {new Date(h.photos_expire_at).toLocaleDateString('en-AE',{day:'numeric',month:'short'})}
                </span>
              )}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {photos.map((url, i) => (
                <div key={i} onClick={()=>onViewPhotos(photos, i)}
                  style={{ width:64, height:64, borderRadius:8, overflow:'hidden', cursor:'pointer', flexShrink:0, border:'1px solid var(--border)' }}>
                  <img src={url} alt={`Photo ${i+1}`} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function HandoversPage() {
  const { user } = useAuth()
  const [handovers, setHandovers]     = useState([])
  const [loading,   setLoading]       = useState(true)
  const [filter,    setFilter]        = useState('all')  // all | received | returned
  const [search,    setSearch]        = useState('')
  const [viewer,    setViewer]        = useState(null)   // { photos, startIdx }

  useEffect(() => {
    fetch(`${API}/api/handovers`, { headers: hdr() })
      .then(r => r.json())
      .then(d => setHandovers(d.handovers || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = handovers.filter(h => {
    if (filter !== 'all' && h.type !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        (h.vehicle_plate||h.plate||'').toLowerCase().includes(q) ||
        (h.emp_name||'').toLowerCase().includes(q) ||
        (h.station_code||'').toLowerCase().includes(q)
      )
    }
    return true
  })

  const received = handovers.filter(h => h.type === 'received').length
  const returned = handovers.filter(h => h.type === 'returned').length

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'0 0 40px' }}>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Total Records', value: handovers.length, color:'#6366F1' },
          { label:'Received',      value: received,          color:'#10B981' },
          { label:'Returned',      value: returned,           color:'#EF4444' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>{s.label}</div>
            <div style={{ fontSize:24, fontWeight:800, color:s.color, marginTop:2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:180, position:'relative' }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search plate, driver, station…"
            style={{ width:'100%', padding:'9px 10px 9px 32px', borderRadius:10, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', fontSize:13, fontFamily:'Poppins,sans-serif', boxSizing:'border-box' }}/>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {['all','received','returned'].map(f => (
            <button key={f} onClick={()=>setFilter(f)}
              style={{ padding:'8px 14px', borderRadius:9, border:'1px solid var(--border)', background: filter===f?'var(--gold)':'var(--card)', color: filter===f?'#fff':'var(--text)', fontWeight:600, fontSize:12, cursor:'pointer', textTransform:'capitalize', fontFamily:'Poppins,sans-serif' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>
          <Car size={36} style={{ margin:'0 auto 12px', display:'block', opacity:0.3 }}/>
          <div style={{ fontWeight:600 }}>No handovers found</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {filtered.map(h => (
            <HandoverCard key={h.id} h={h} onViewPhotos={(photos, startIdx) => setViewer({ photos, startIdx })}/>
          ))}
        </div>
      )}

      {viewer && (
        <PhotoViewer photos={viewer.photos} onClose={() => setViewer(null)}/>
      )}
    </div>
  )
}
