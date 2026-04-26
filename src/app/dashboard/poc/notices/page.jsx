'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { API } from '@/lib/api'
import { useStation, hdr, POCHeader, AnnModal } from '../_components/poc-shared'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Bell, Plus, Pencil, Trash2, MapPin } from 'lucide-react'

export default function NoticesPage() {
  const { user } = useAuth()
  const { station, setStation, canSwitch } = useStation(user)
  const [anns,       setAnns]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(null)
  const [confirmDlg, setConfirmDlg] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const h = { headers: { Authorization: `Bearer ${localStorage.getItem('gcd_token')}` } }
    try {
      const a = await fetch(`${API}/api/poc/announcements`, h).then(r => r.json())
      setAnns(a.announcements||[])
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function deleteAnn(id) {
    setConfirmDlg({
      title:'Delete announcement?', message:'This notice will be removed for all stations immediately.',
      confirmLabel:'Delete', danger:true,
      onConfirm: async () => {
        setConfirmDlg(null)
        await fetch(`${API}/api/poc/announcements/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${localStorage.getItem('gcd_token')}` } })
        load()
      },
    })
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, animation:'slideUp 0.3s ease' }}>
      <POCHeader
        title="Notices" icon={Bell} color="#6366F1"
        station={station} onStationChange={setStation} canSwitch={canSwitch}
        showDate={false}
        subtitle={`${anns.length} active announcement${anns.length!==1?'s':''}`}
      />

      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <button className="btn btn-primary" onClick={() => setModal('ann-add')} style={{ borderRadius:20 }}>
          <Plus size={14}/> New Notice
        </button>
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height:100, borderRadius:16 }}/>)}
        </div>
      ) : anns.length===0 ? (
        <div style={{ textAlign:'center', padding:50, color:'var(--text-muted)' }}>
          <Bell size={36} style={{ margin:'0 auto 12px', display:'block', opacity:0.15 }}/>
          <div style={{ fontSize:13, fontWeight:600 }}>No announcements yet</div>
          <div style={{ fontSize:12, marginTop:4 }}>Post a notice to inform your station team.</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {anns.map((ann, i) => (
            <div key={ann.id} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'16px', animation:`slideUp 0.3s ${i*0.06}s ease both`, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, width:4, height:'100%', background:'linear-gradient(180deg,#6366F1,#8B5CF6)' }}/>
              <div style={{ paddingLeft:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:'var(--text)', flex:1, marginRight:8 }}>{ann.title}</div>
                  <div style={{ display:'flex', gap:4, flexShrink:0, alignItems:'center' }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:ann.station_code?'#EEF2FF':'var(--bg-alt)', color:ann.station_code?'#4F46E5':'var(--text-muted)', border:`1px solid ${ann.station_code?'#C7D2FE':'var(--border)'}` }}>
                      <MapPin size={9} style={{ verticalAlign:'middle', marginRight:2 }}/>{ann.station_code||'All Stations'}
                    </span>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal({type:'ann-edit',ann})}><Pencil size={12}/></button>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color:'#EF4444' }} onClick={() => deleteAnn(ann.id)}><Trash2 size={12}/></button>
                  </div>
                </div>
                <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6, marginBottom:8 }}>{ann.body}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', opacity:0.6 }}>
                  {new Date(ann.created_at).toLocaleString('en-AE',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal==='ann-add' && <AnnModal onClose={() => setModal(null)} onSave={() => { setModal(null); load() }}/>}
      {modal?.type==='ann-edit' && <AnnModal ann={modal.ann} onClose={() => setModal(null)} onSave={() => { setModal(null); load() }}/>}
      <ConfirmDialog open={!!confirmDlg} title={confirmDlg?.title} message={confirmDlg?.message} confirmLabel={confirmDlg?.confirmLabel} danger={confirmDlg?.danger??true} onConfirm={confirmDlg?.onConfirm} onCancel={() => setConfirmDlg(null)}/>
    </div>
  )
}
