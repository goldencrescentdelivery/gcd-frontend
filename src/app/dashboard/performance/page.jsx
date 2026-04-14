'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Trophy, Star, TrendingUp, Award, Users, ChevronRight, Zap, Target, RefreshCw } from 'lucide-react'

const _raw = process.env.NEXT_PUBLIC_API_URL
const API = _raw && !_raw.startsWith("http") ? `https://${_raw}` : (_raw || "http://localhost:4000")
function hdr() { return { Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } }
function fmt(n) { return Number(n||0).toFixed(0) }

const MONTHS = Array.from({length:6},(_,i)=>{ const d=new Date(); d.setMonth(d.getMonth()-i); return d.toISOString().slice(0,7) })

const GRADE_CFG = {
  'A+': { c:'#FFD700', bg:'linear-gradient(135deg,#FFF7D6,#FFFBEB)', bc:'#F0D78C', glow:'rgba(212,160,23,0.4)', label:'Elite' },
  'A':  { c:'#2E7D52', bg:'linear-gradient(135deg,#ECFDF5,#F0FFF8)', bc:'#A7F3D0', glow:'rgba(46,125,82,0.3)', label:'Excellent' },
  'B':  { c:'#1D6FA4', bg:'linear-gradient(135deg,#EFF6FF,#DBEAFE)', bc:'#BFDBFE', glow:'rgba(29,111,164,0.3)', label:'Good' },
  'C':  { c:'#B45309', bg:'linear-gradient(135deg,#FFFBEB,#FEF3C7)', bc:'#FCD34D', glow:'rgba(180,83,9,0.2)', label:'Average' },
  'D':  { c:'#C0392B', bg:'linear-gradient(135deg,#FEF2F2,#FFE4E4)', bc:'#FCA5A5', glow:'rgba(192,57,43,0.2)', label:'Needs Improvement' },
}

function ScoreRing({ score, size=80 }) {
  const r = (size-10)/2
  const circ = 2*Math.PI*r
  const pct  = Math.min(100, Math.max(0, score))
  const dash  = (pct/100)*circ
  const c = score>=90?'#FFD700':score>=80?'#2E7D52':score>=70?'#1D6FA4':score>=60?'#B45309':'#C0392B'
  return (
    <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F0EDE6" strokeWidth={8}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{transition:'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)'}}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{transform:'rotate(90deg)',transformOrigin:`${size/2}px ${size/2}px`,
          fontSize:size>60?18:14, fontWeight:900, fill:c, fontFamily:'Poppins,sans-serif'}}>
        {fmt(score)}
      </text>
    </svg>
  )
}

function ScoreBar({ label, value, max=20, color }) {
  const pct = (value/max)*100
  return (
    <div style={{marginBottom:8}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
        <span style={{fontSize:11.5,color:'#6B5D4A',fontWeight:500}}>{label}</span>
        <span style={{fontSize:11.5,fontWeight:700,color}}>{fmt(value)}/{max}</span>
      </div>
      <div style={{height:6,background:'#F0EDE6',borderRadius:10,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:10,transition:'width 1s ease'}}/>
      </div>
    </div>
  )
}

export default function PerformancePage() {
  const [scores,  setScores]  = useState([])
  const [month,   setMonth]   = useState(MONTHS[0])
  const [loading, setLoading] = useState(true)
  const [selected,setSelected]= useState(null)
  const [history, setHistory] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`${API}/api/performance?month=${month}`, {headers:hdr()}).then(r=>r.json())
      setScores(d.scores||[])
    } catch(e){console.error(e)} finally{setLoading(false)}
  }, [month])

  useEffect(()=>{load()},[load])

  async function loadHistory(empId) {
    const d = await fetch(`${API}/api/performance/${empId}`, {headers:hdr()}).then(r=>r.json())
    setHistory(d.history||[])
  }

  function selectDA(s) {
    setSelected(s)
    loadHistory(s.emp_id)
  }

  const top3 = scores.slice(0,3)
  const rest  = scores.slice(3)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20,animation:'slideUp 0.35s ease'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontWeight:900,fontSize:22,color:'#1A1612',letterSpacing:'-0.03em',display:'flex',alignItems:'center',gap:10}}>
            <Trophy size={22} color="#B8860B"/> Performance Scorecard
          </h1>
          <p style={{fontSize:12,color:'#A89880',marginTop:3}}>Monthly DA scoring — attendance, deliveries, compliance & more</p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select value={month} onChange={e=>setMonth(e.target.value)}
            style={{padding:'8px 14px',borderRadius:20,border:'1.5px solid #EAE6DE',background:'#FFF',fontSize:13,fontWeight:600,color:'#1A1612',cursor:'pointer',outline:'none',fontFamily:'Poppins,sans-serif'}}>
            {MONTHS.map(m=><option key={m}>{m}</option>)}
          </select>
          <button onClick={load} style={{width:36,height:36,borderRadius:10,background:'#F5F4F1',border:'1px solid #EAE6DE',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <RefreshCw size={14} color="#6B5D4A"/>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
          {[1,2,3,4].map(i=><div key={i} className="skeleton" style={{height:180,borderRadius:18}}/>)}
        </div>
      ) : scores.length===0 ? (
        <div style={{textAlign:'center',padding:'60px 20px',color:'#A89880'}}>
          <Trophy size={48} style={{margin:'0 auto 14px',display:'block',opacity:0.15}}/>
          <div style={{fontWeight:700,color:'#6B5D4A',fontSize:16}}>No scores yet for {month}</div>
          <div style={{fontSize:12,marginTop:6}}>Click refresh to compute scores for all active DAs</div>
          <button onClick={load} className="btn btn-primary" style={{margin:'16px auto 0',display:'flex',borderRadius:20}}>
            <Zap size={14}/> Compute Scores
          </button>
        </div>
      ) : (
        <>
          {/* Podium top 3 */}
          {top3.length >= 1 && (
            <div style={{background:'linear-gradient(135deg,#1A1612 0%,#2C1F0A 100%)',borderRadius:20,padding:'24px 20px',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',right:-30,top:-30,width:200,height:200,borderRadius:'50%',background:'rgba(184,134,11,0.1)'}}/>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:20}}>🏆 Top Performers — {month}</div>
              <div style={{display:'grid',gridTemplateColumns:top3.length>=3?'1fr 1.2fr 1fr':top3.length===2?'1fr 1fr':'1fr',gap:12,alignItems:'flex-end'}}>
                {top3.length>=2 && (
                  <div style={{textAlign:'center',animation:'slideUp 0.5s 0.1s ease both'}}>
                    <div style={{fontSize:24,marginBottom:8}}>🥈</div>
                    <div style={{width:56,height:56,borderRadius:16,background:'linear-gradient(135deg,#C0C0C0,#E8E8E8)',margin:'0 auto 8px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:900,color:'#1A1612',boxShadow:'0 4px 16px rgba(192,192,192,0.4)'}}>
                      {top3[1]?.name?.slice(0,2).toUpperCase()}
                    </div>
                    <div style={{fontWeight:700,fontSize:13,color:'white',marginBottom:3}}>{top3[1]?.name}</div>
                    <div style={{fontWeight:900,fontSize:22,color:'#C0C0C0'}}>{fmt(top3[1]?.total_score)}</div>
                  </div>
                )}
                <div style={{textAlign:'center',animation:'slideUp 0.5s ease both'}}>
                  <div style={{fontSize:32,marginBottom:6}}>🥇</div>
                  <div style={{width:70,height:70,borderRadius:20,background:'linear-gradient(135deg,#B8860B,#D4A017)',margin:'0 auto 10px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:900,color:'white',boxShadow:'0 6px 24px rgba(184,134,11,0.5)'}}>
                    {top3[0]?.name?.slice(0,2).toUpperCase()}
                  </div>
                  <div style={{fontWeight:800,fontSize:15,color:'white',marginBottom:4}}>{top3[0]?.name}</div>
                  <div style={{fontWeight:900,fontSize:28,color:'#D4A017',letterSpacing:'-0.03em'}}>{fmt(top3[0]?.total_score)}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:3}}>out of 100</div>
                </div>
                {top3.length>=3 && (
                  <div style={{textAlign:'center',animation:'slideUp 0.5s 0.2s ease both'}}>
                    <div style={{fontSize:24,marginBottom:8}}>🥉</div>
                    <div style={{width:56,height:56,borderRadius:16,background:'linear-gradient(135deg,#CD7F32,#E8A96A)',margin:'0 auto 8px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:900,color:'white',boxShadow:'0 4px 16px rgba(205,127,50,0.4)'}}>
                      {top3[2]?.name?.slice(0,2).toUpperCase()}
                    </div>
                    <div style={{fontWeight:700,fontSize:13,color:'white',marginBottom:3}}>{top3[2]?.name}</div>
                    <div style={{fontWeight:900,fontSize:22,color:'#CD7F32'}}>{fmt(top3[2]?.total_score)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Full leaderboard */}
          <div style={{display:'grid',gridTemplateColumns:selected?'1fr 340px':'1fr',gap:16}}>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {scores.map((s,i)=>{
                const gc = GRADE_CFG[s.grade]||GRADE_CFG['C']
                const isSelected = selected?.emp_id===s.emp_id
                return (
                  <div key={s.emp_id} onClick={()=>selectDA(s)} style={{background:isSelected?gc.bg:'#FFF',border:`1.5px solid ${isSelected?gc.bc:'#EAE6DE'}`,borderRadius:14,padding:'14px 16px',cursor:'pointer',transition:'all 0.2s',boxShadow:isSelected?`0 4px 20px ${gc.glow}`:'none',animation:`slideUp 0.4s ${i*0.04}s ease both`}}
                    onMouseEnter={e=>!isSelected&&(e.currentTarget.style.borderColor='#D4C4A8')}
                    onMouseLeave={e=>!isSelected&&(e.currentTarget.style.borderColor='#EAE6DE')}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      {/* Rank */}
                      <div style={{width:32,height:32,borderRadius:10,background:i<3?'linear-gradient(135deg,#FDF6E3,#FEF9F0)':'#F5F4F1',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:14,color:i<3?'#B8860B':'#A89880',flexShrink:0}}>
                        {i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}
                      </div>
                      {/* Avatar */}
                      <div style={{width:44,height:44,borderRadius:13,background:gc.bg,border:`1.5px solid ${gc.bc}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:900,color:gc.c,flexShrink:0}}>
                        {s.name?.slice(0,2).toUpperCase()}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:14,color:'#1A1612'}}>{s.name}</div>
                        <div style={{fontSize:11,color:'#A89880',marginTop:1}}>
                          {s.station_code} · <span style={{fontWeight:700,color:gc.c}}>{gc.label}</span>
                        </div>
                      </div>
                      {/* Score */}
                      <div style={{flexShrink:0}}>
                        <ScoreRing score={s.total_score} size={60}/>
                      </div>
                      {/* Grade badge */}
                      <div style={{width:44,height:44,borderRadius:12,background:gc.bg,border:`2px solid ${gc.bc}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <span style={{fontWeight:900,fontSize:16,color:gc.c}}>{s.grade}</span>
                      </div>
                    </div>
                    {/* Score bars mini */}
                    <div style={{marginTop:12,display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6}}>
                      {[
                        {l:'Attend',v:s.attendance_score,c:'#2E7D52'},
                        {l:'Deliver',v:s.delivery_score,c:'#1D6FA4'},
                        {l:'Comply',v:s.compliance_score,c:'#7C3AED'},
                        {l:'Leaves',v:s.leave_score,c:'#B45309'},
                        {l:'Conduct',v:s.deduction_score,c:'#B8860B'},
                      ].map(b=>(
                        <div key={b.l} style={{textAlign:'center'}}>
                          <div style={{height:4,background:'#F0EDE6',borderRadius:10,overflow:'hidden',marginBottom:3}}>
                            <div style={{height:'100%',width:`${(b.v/20)*100}%`,background:b.c,borderRadius:10}}/>
                          </div>
                          <div style={{fontSize:9.5,color:'#A89880',fontWeight:600}}>{b.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Detail panel */}
            {selected && (
              <div style={{position:'sticky',top:16,height:'fit-content',animation:'slideLeft 0.3s cubic-bezier(0.16,1,0.3,1)'}}>
                <div className="card" style={{padding:0,overflow:'hidden'}}>
                  {/* Header */}
                  <div style={{background:`linear-gradient(135deg,#1A1612,#2C1F0A)`,padding:'20px 18px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                      <div>
                        <div style={{fontWeight:800,fontSize:16,color:'white'}}>{selected.name}</div>
                        <div style={{fontSize:12,color:'rgba(255,255,255,0.45)',marginTop:2}}>{selected.station_code}</div>
                      </div>
                      <button onClick={()=>setSelected(null)} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,0.1)',border:'none',color:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>×</button>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:14}}>
                      <ScoreRing score={selected.total_score} size={80}/>
                      <div>
                        <div style={{fontWeight:900,fontSize:32,color:(GRADE_CFG[selected.grade]||GRADE_CFG['C']).c,letterSpacing:'-0.03em'}}>{selected.grade}</div>
                        <div style={{fontSize:12,color:'rgba(255,255,255,0.45)'}}>{(GRADE_CFG[selected.grade]||GRADE_CFG['C']).label}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{padding:'16px 18px',display:'flex',flexDirection:'column',gap:8}}>
                    <div style={{fontSize:11,fontWeight:700,color:'#A89880',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>Score Breakdown</div>
                    <ScoreBar label="Attendance"  value={selected.attendance_score}  color="#2E7D52"/>
                    <ScoreBar label="Deliveries"  value={selected.delivery_score}    color="#1D6FA4"/>
                    <ScoreBar label="Compliance"  value={selected.compliance_score}  color="#7C3AED"/>
                    <ScoreBar label="Leave Usage" value={selected.leave_score}       color="#B45309"/>
                    <ScoreBar label="Conduct"     value={selected.deduction_score}   color="#B8860B"/>
                  </div>
                  {/* History */}
                  {history.length>1 && (
                    <div style={{padding:'0 18px 18px'}}>
                      <div style={{fontSize:11,fontWeight:700,color:'#A89880',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>6-Month Trend</div>
                      <div style={{display:'flex',gap:8,alignItems:'flex-end',height:60}}>
                        {history.slice(0,6).reverse().map((h,i)=>{
                          const gc = GRADE_CFG[h.grade]||GRADE_CFG['C']
                          return (
                            <div key={h.month} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                              <div style={{width:'100%',background:gc.c,borderRadius:'4px 4px 0 0',opacity:0.85,transition:'height 0.8s ease',height:`${(h.total_score/100)*52}px`}}/>
                              <div style={{fontSize:9,color:'#A89880',fontWeight:600}}>{h.month.slice(5)}</div>
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
        </>
      )}
    </div>
  )
}
