'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { API } from '@/lib/api'
import { useStation, hdr, POCHeader, DeliveryModal } from '../_components/poc-shared'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Package, Plus, Pencil, Trash2 } from 'lucide-react'

const TODAY = () => new Date().toISOString().slice(0, 10)

export default function DeliveriesPage() {
  const { user } = useAuth()
  const { station, setStation, canSwitch } = useStation(user)
  const [date,       setDate]      = useState(TODAY())
  const [delivs,     setDelivs]    = useState([])
  const [loading,    setLoading]   = useState(true)
  const [modal,      setModal]     = useState(null)
  const [confirmDlg, setConfirmDlg]= useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const h = { headers: { Authorization: `Bearer ${localStorage.getItem('gcd_token')}` } }
    try {
      const d = await fetch(`${API}/api/deliveries?station=${station}`, h).then(r => r.json())
      setDelivs(d.deliveries||[])
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [station])

  useEffect(() => { load() }, [load])

  const todayRecord  = delivs.find(d => d.date === date)
  const successRate  = todayRecord?.total > 0 ? Math.round(todayRecord.successful / todayRecord.total * 100) : null

  function deleteDelivery(id) {
    setConfirmDlg({
      title:'Delete delivery log?', message:'This delivery record will be permanently removed.',
      confirmLabel:'Delete', danger:true,
      onConfirm: async () => {
        setConfirmDlg(null)
        await fetch(`${API}/api/deliveries/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } })
        load()
      },
    })
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, animation:'slideUp 0.3s ease' }}>
      <POCHeader
        title="Deliveries" icon={Package} color="#F97316"
        station={station} onStationChange={setStation} canSwitch={canSwitch}
        date={date} onDateChange={setDate}
        subtitle="Track daily delivery counts and success rates"
      />

      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <button className="btn btn-primary" onClick={() => setModal(todayRecord?{type:'delivery-edit',delivery:todayRecord}:'delivery')} style={{ borderRadius:20 }}>
          <Package size={14}/> {todayRecord ? "Edit Today's Log" : "Log Today's Deliveries"}
        </button>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height:180, borderRadius:16 }}/>
      ) : (
        <>
          {todayRecord ? (
            <div style={{ background:'linear-gradient(135deg,var(--card),var(--bg-alt))', border:'1px solid var(--border)', borderRadius:18, padding:'20px' }}>
              <div style={{ fontWeight:700, fontSize:12, color:'var(--text-muted)', marginBottom:14, textTransform:'uppercase', letterSpacing:'0.06em' }}>📅 Today — {date}</div>
              <div className="four-kpi-grid" style={{ gap:10, marginBottom:16 }}>
                {[
                  { l:'Total',      v:todayRecord.total,      c:'#F97316', bg:'#FFF7ED' },
                  { l:'Attempted',  v:todayRecord.attempted,  c:'#3B82F6', bg:'#EFF6FF' },
                  { l:'Successful', v:todayRecord.successful, c:'#10B981', bg:'#ECFDF5' },
                  { l:'Returned',   v:todayRecord.returned,   c:'#EF4444', bg:'#FEF2F2' },
                ].map(s => (
                  <div key={s.l} style={{ textAlign:'center', padding:'14px 8px', borderRadius:14, background:s.bg, border:'1px solid var(--border)' }}>
                    <div style={{ fontWeight:900, fontSize:24, color:s.c, letterSpacing:'-0.03em' }}>{s.v}</div>
                    <div style={{ fontSize:10, color:s.c, fontWeight:600, marginTop:3, textTransform:'uppercase', letterSpacing:'0.04em' }}>{s.l}</div>
                  </div>
                ))}
              </div>
              {successRate !== null && (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)' }}>Success Rate</span>
                    <span style={{ fontSize:14, fontWeight:900, color:successRate>=90?'#10B981':successRate>=70?'#B45309':'#EF4444' }}>{successRate}%</span>
                  </div>
                  <div style={{ height:10, background:'var(--border)', borderRadius:20, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${successRate}%`, background:successRate>=90?'#10B981':successRate>=70?'#F59E0B':'#EF4444', borderRadius:20, transition:'width 1s ease' }}/>
                  </div>
                </div>
              )}
              {todayRecord.notes && <div style={{ marginTop:12, fontSize:12, color:'var(--text-muted)', padding:'8px 12px', background:'var(--bg-alt)', borderRadius:10, border:'1px solid var(--border)' }}>{todayRecord.notes}</div>}
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'32px 24px', background:'var(--card)', border:'1.5px dashed var(--border-med)', borderRadius:16 }}>
              <Package size={32} style={{ margin:'0 auto 10px', display:'block', opacity:0.15 }}/>
              <div style={{ fontSize:13, color:'var(--text-muted)' }}>No delivery log for {date} — tap above to log.</div>
            </div>
          )}

          {/* History */}
          {delivs.filter(d => d.date!==date).length > 0 && (
            <div>
              <div style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>History</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {delivs.filter(d => d.date!==date).slice(0,14).map((d, i) => {
                  const sr = d.total > 0 ? Math.round(d.successful / d.total * 100) : null
                  return (
                    <div key={d.id||i} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'11px 14px', display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ fontWeight:700, fontSize:12.5, color:'var(--text)', minWidth:86 }}>{d.date}</div>
                      <div style={{ flex:1, display:'flex', gap:10, flexWrap:'wrap' }}>
                        <span style={{ fontSize:12, color:'var(--text-muted)' }}><strong style={{ color:'var(--text)' }}>{d.total}</strong> total</span>
                        <span style={{ fontSize:12, color:'#10B981' }}><strong>{d.successful}</strong> ✓</span>
                        <span style={{ fontSize:12, color:'#EF4444' }}><strong>{d.returned}</strong> returned</span>
                      </div>
                      {sr !== null && (
                        <span style={{ fontSize:12, fontWeight:800, color:sr>=90?'#10B981':sr>=70?'#B45309':'#EF4444', background:sr>=90?'#ECFDF5':sr>=70?'#FFFBEB':'#FEF2F2', padding:'3px 8px', borderRadius:20, border:`1px solid ${sr>=90?'#A7F3D0':sr>=70?'#FCD34D':'#FCA5A5'}` }}>{sr}%</span>
                      )}
                      <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal({type:'delivery-edit',delivery:{...d,date:d.date}})}><Pencil size={12}/></button>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color:'#EF4444' }} onClick={() => deleteDelivery(d.id)}><Trash2 size={12}/></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {modal==='delivery' && <DeliveryModal date={date} station={station} onClose={() => setModal(null)} onSave={() => { setModal(null); load() }}/>}
      {modal?.type==='delivery-edit' && <DeliveryModal date={date} station={station} existing={modal.delivery} onClose={() => setModal(null)} onSave={() => { setModal(null); load() }}/>}
      <ConfirmDialog open={!!confirmDlg} title={confirmDlg?.title} message={confirmDlg?.message} confirmLabel={confirmDlg?.confirmLabel} danger={confirmDlg?.danger??true} onConfirm={confirmDlg?.onConfirm} onCancel={() => setConfirmDlg(null)}/>
    </div>
  )
}
