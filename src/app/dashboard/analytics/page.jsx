'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { analyticsApi } from '@/lib/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, Package, DollarSign, Plus, X, ChevronRight } from 'lucide-react'

const GOLD = '#B8860B'
const STATION_COLORS = { DDB7:'#B8860B', DDB6:'#1D6FA4', DSH6:'#2E7D52', DXD3:'#7C3AED' }

const Tip = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null
  return (
    <div style={{ background:'#fff', border:'1px solid #EAE6DE', borderRadius:10, padding:'10px 14px', boxShadow:'0 4px 16px rgba(0,0,0,0.1)' }}>
      <div style={{ fontSize:11, color:'#A89880', marginBottom:6, fontWeight:600 }}>{label}</div>
      {payload.map(p=><div key={p.dataKey} style={{ fontSize:12, color:p.color, marginBottom:2, fontWeight:500 }}>{p.name}: <strong>{Number(p.value||0).toLocaleString()}</strong></div>)}
    </div>
  )
}

function DeliveryModal({ onSave, onClose }) {
  const [form, setForm] = useState({ date:new Date().toISOString().slice(0,10), total:'', attempted:'', successful:'', returned:'', notes:'' })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  async function handleSave() {
    if (!form.total) return alert('Total deliveries required')
    setSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/deliveries`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gcd_token')}` },
        body: JSON.stringify({ ...form, total:parseInt(form.total), attempted:parseInt(form.attempted)||0, successful:parseInt(form.successful)||0, returned:parseInt(form.returned)||0 })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      onSave()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:420 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ fontWeight:700, fontSize:16, color:'#1A1612' }}>Log Daily Deliveries</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17}/></button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div><label className="input-label">Date</label><input className="input" type="date" value={form.date} onChange={e=>set('date',e.target.value)}/></div>
          <div><label className="input-label">Total Deliveries *</label><input className="input" type="number" value={form.total} onChange={e=>set('total',e.target.value)} placeholder="e.g. 120"/></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div><label className="input-label">Attempted</label><input className="input" type="number" value={form.attempted} onChange={e=>set('attempted',e.target.value)}/></div>
            <div><label className="input-label">Successful</label><input className="input" type="number" value={form.successful} onChange={e=>set('successful',e.target.value)}/></div>
          </div>
          <div><label className="input-label">Returned</label><input className="input" type="number" value={form.returned} onChange={e=>set('returned',e.target.value)}/></div>
          <div><label className="input-label">Notes</label><input className="input" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Any issues today?"/></div>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:18 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Submit'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Swipeable KPI Slider ──────────────────────────────────────
function KpiSlider({ kpis, loading }) {
  const scrollRef  = useRef(null)
  const [activeIdx, setActiveIdx] = useState(0)

  function onScroll() {
    if (!scrollRef.current) return
    const el      = scrollRef.current
    const cardW   = el.firstChild?.offsetWidth || 200
    const gap     = 12
    const idx     = Math.round(el.scrollLeft / (cardW + gap))
    setActiveIdx(Math.min(idx, kpis.length - 1))
  }

  function scrollTo(idx) {
    if (!scrollRef.current) return
    const el    = scrollRef.current
    const cardW = el.firstChild?.offsetWidth || 200
    const gap   = 12
    el.scrollTo({ left: idx * (cardW + gap), behavior:'smooth' })
  }

  return (
    <div>
      {/* Slider row */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{
          display:'flex', gap:12,
          overflowX:'auto', overflowY:'hidden',
          scrollSnapType:'x mandatory',
          WebkitOverflowScrolling:'touch',
          scrollbarWidth:'none',
          paddingBottom:4,
          paddingRight:16,   // peek of next card
        }}
      >
        <style>{`.kpi-scroll::-webkit-scrollbar{display:none}`}</style>
        {kpis.map((card, i) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="stat-card"
              style={{
                minWidth:'calc(50% - 6px)',   // 2 cards visible
                maxWidth:'calc(50% - 6px)',
                scrollSnapAlign:'start',
                flexShrink:0,
                animationDelay:`${i*0.08}s`,
                position:'relative',
                overflow:'hidden',
              }}
            >
              {/* Background decoration */}
              <div style={{
                position:'absolute', right:-10, bottom:-10,
                width:70, height:70, borderRadius:'50%',
                background:`${card.color}10`,
              }}/>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14, position:'relative' }}>
                <div style={{ width:42, height:42, borderRadius:12, background:`${card.color}15`, border:`1px solid ${card.color}30`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={19} color={card.color}/>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#2E7D52', background:'#ECFDF5', padding:'2px 7px', borderRadius:6, border:'1px solid #A7F3D0' }}>
                  <span className="dot-live"/> LIVE
                </div>
              </div>

              <div style={{ fontWeight:800, fontSize:26, color:'#1A1612', marginBottom:3, letterSpacing:'-0.04em', lineHeight:1, position:'relative' }}>
                {loading ? <div className="skeleton" style={{ width:60, height:28, borderRadius:6 }}/> : card.value}
              </div>
              <div style={{ fontSize:12, color:'#6B5D4A', fontWeight:600, marginTop:6 }}>{card.label}</div>
              <div style={{ fontSize:10.5, color:'#A89880', marginTop:2 }}>{card.sub}</div>
            </div>
          )
        })}
      </div>

      {/* Dot indicators */}
      <div style={{ display:'flex', gap:5, justifyContent:'center', marginTop:10 }}>
        {kpis.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            style={{
              width: activeIdx===i ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: activeIdx===i ? GOLD : '#EAE6DE',
              border:'none', cursor:'pointer', padding:0,
              transition:'width 0.3s cubic-bezier(0.16,1,0.3,1), background 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Swipe hint on first load */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, marginTop:6, opacity:0.5 }}>
        <span style={{ fontSize:10.5, color:'#A89880' }}>Swipe to see more</span>
        <ChevronRight size={11} color="#A89880"/>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [summary,  setSummary]  = useState(null)
  const [chart,    setChart]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [userRole, setUserRole] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('gcd_token')
      const user  = JSON.parse(localStorage.getItem('gcd_user')||'{}')
      setUserRole(user.role)
      const [sum, ch] = await Promise.all([
        analyticsApi.summary(),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics/deliveries-chart?months=6`, {
          headers:{ Authorization:`Bearer ${token}` }
        }).then(r=>r.json()).catch(()=>({ chart:[] }))
      ])
      setSummary(sum)
      setChart(ch.chart || [])
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const kpis = [
    { icon:Users,      label:'Active DAs',        value: summary ? String(summary.employees?.active||0)                                   : '—', sub:'Total employees',    color:'#B8860B' },
    { icon:Package,    label:"Today's Deliveries", value: summary ? String(summary.today_deliveries||0)                                   : '—', sub:'All stations',       color:'#1D6FA4' },
    { icon:TrendingUp, label:'Present Today',      value: summary ? String(summary.attendance?.present||0)                                : '—', sub:'Checked in',        color:'#2E7D52' },
    { icon:DollarSign, label:'Pending Fines',      value: summary ? `AED ${Number(summary.compliance?.pending_amount||0).toLocaleString()}`: '—', sub:'Unresolved',       color:'#C0392B' },
  ]

  const chartData = chart.length > 0 ? chart : [{ month:'No data', total:0, DDB7:0, DDB6:0, DSH6:0, DXD3:0 }]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

      {/* Log deliveries button */}
      {(userRole==='poc'||userRole==='admin'||userRole==='manager') && (
        <div style={{ display:'flex', justifyContent:'flex-end' }}>
          <button className="btn btn-primary" onClick={()=>setModal(true)}>
            <Plus size={14}/> Log Today's Deliveries
          </button>
        </div>
      )}

      {/* KPI Slider — swipeable on mobile, grid on desktop */}
      <>
        {/* Mobile: slider */}
        <div className="show-mobile-only">
          <KpiSlider kpis={kpis} loading={loading}/>
        </div>

        {/* Desktop: grid */}
        <div className="hide-on-mobile" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
          {kpis.map((card, i) => {
            const Icon = card.icon
            return (
              <div key={card.label} className="stat-card" style={{ animationDelay:`${i*0.08}s`, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', right:-10, bottom:-10, width:70, height:70, borderRadius:'50%', background:`${card.color}08` }}/>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                  <div style={{ width:42, height:42, borderRadius:12, background:`${card.color}15`, border:`1px solid ${card.color}30`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon size={19} color={card.color}/>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#2E7D52', background:'#ECFDF5', padding:'2px 7px', borderRadius:6, border:'1px solid #A7F3D0' }}>
                    <span className="dot-live"/> LIVE
                  </div>
                </div>
                <div style={{ fontWeight:800, fontSize:26, color:'#1A1612', marginBottom:4, letterSpacing:'-0.04em' }}>
                  {loading ? <div className="skeleton" style={{ width:60, height:28, borderRadius:6 }}/> : card.value}
                </div>
                <div style={{ fontSize:12, color:'#6B5D4A', fontWeight:600 }}>{card.label}</div>
                <div style={{ fontSize:10.5, color:'#A89880', marginTop:2 }}>{card.sub}</div>
              </div>
            )
          })}
        </div>
      </>

      {/* Deliveries chart */}
      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18, flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:'#1A1612' }}>Monthly Deliveries by Station</div>
            <div style={{ fontSize:12, color:'#A89880', marginTop:2 }}>Last 6 months — logged daily by POC</div>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {Object.entries(STATION_COLORS).map(([s,c])=>(
              <span key={s} style={{ fontSize:11, fontWeight:600, color:c, background:`${c}12`, border:`1px solid ${c}25`, borderRadius:6, padding:'2px 8px' }}>{s}</span>
            ))}
          </div>
        </div>
        {loading ? (
          <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:'#A89880' }}>Loading…</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6"/>
              <XAxis dataKey="month" stroke="#C4B49A" fontSize={11}/>
              <YAxis stroke="#C4B49A" fontSize={11}/>
              <Tooltip content={<Tip/>}/>
              {Object.entries(STATION_COLORS).map(([s,c])=>(
                <Bar key={s} dataKey={s} name={s} stackId="a" fill={c} radius={s==='DXD3'?[4,4,0,0]:[0,0,0,0]}/>
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
        {chart.length===0 && !loading && (
          <div style={{ textAlign:'center', marginTop:-160, position:'relative', zIndex:2 }}>
            <div style={{ display:'inline-block', background:'#FFFBEB', border:'1px solid #FCD34D', borderRadius:10, padding:'12px 20px', fontSize:13, color:'#B45309', fontWeight:500 }}>
              📊 No delivery data yet — POC logs deliveries daily using the button above
            </div>
          </div>
        )}
      </div>

      {/* Bottom row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }} className="two-col">
        <div className="card">
          <div style={{ fontWeight:700, fontSize:14, color:'#1A1612', marginBottom:14 }}>Today's Attendance</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { l:'Present',      v:summary?.attendance?.present||0,  c:'#2E7D52', bg:'#ECFDF5', bc:'#A7F3D0' },
              { l:'Absent',       v:summary?.attendance?.absent||0,   c:'#C0392B', bg:'#FEF2F2', bc:'#FCA5A5' },
              { l:'Pending Leave',v:summary?.pending_leaves||0,       c:'#B45309', bg:'#FFFBEB', bc:'#FCD34D' },
            ].map(s=>(
              <div key={s.l} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:s.bg, borderRadius:10, border:`1px solid ${s.bc}` }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:s.c, flexShrink:0 }}/>
                <span style={{ flex:1, fontSize:13, color:'#1A1612', fontWeight:500 }}>{s.l}</span>
                <span style={{ fontWeight:800, fontSize:20, color:s.c }}>{s.v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight:700, fontSize:14, color:'#1A1612', marginBottom:14 }}>Payroll This Month</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { l:'Base Salaries', v:`AED ${Number(summary?.payroll?.base_total||0).toLocaleString()}`,  c:'#1A1612' },
              { l:'Bonuses',       v:`AED ${Number(summary?.payroll?.bonus_total||0).toLocaleString()}`, c:'#2E7D52' },
              { l:'Deductions',    v:`AED ${Number(summary?.payroll?.ded_total||0).toLocaleString()}`,   c:'#C0392B' },
            ].map(s=>(
              <div key={s.l} style={{ display:'flex', justifyContent:'space-between', padding:'10px 12px', background:'#FAFAF8', borderRadius:10, border:'1px solid #EAE6DE' }}>
                <span style={{ fontSize:13, color:'#6B5D4A', fontWeight:500 }}>{s.l}</span>
                <span style={{ fontWeight:700, fontSize:14, color:s.c }}>{s.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {modal && <DeliveryModal onClose={()=>setModal(false)} onSave={()=>{setModal(false);load()}}/>}
    </div>
  )
}
