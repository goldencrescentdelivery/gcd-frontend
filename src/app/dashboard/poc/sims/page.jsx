'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { API } from '@/lib/api'
import { useStation, POCHeader, SimSection } from '../_components/poc-shared'
import { Smartphone } from 'lucide-react'

export default function SimsPage() {
  const { user } = useAuth()
  const { station, setStation, canSwitch } = useStation(user)
  const [sims,    setSims]    = useState([])
  const [emps,    setEmps]    = useState([])
  const [loading, setLoading] = useState(true)

  // Phase 3: Etisalat enrichment — loaded lazily AFTER sims render
  // null = not yet fetched, {} = fetched (may be empty), { msisdn: {...} } = has data
  const [etData,     setEtData]     = useState(null)
  const [etLoading,  setEtLoading]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setEtData(null)   // reset enrichment on full refresh
    const h = { headers: { Authorization: `Bearer ${localStorage.getItem('gcd_token')}` } }
    try {
      const [s, e] = await Promise.all([
        fetch(`${API}/api/sims`,      h).then(r => r.json()),
        fetch(`${API}/api/employees`, h).then(r => r.json()),
      ])
      setSims(s.sims     || [])
      setEmps(e.employees || [])
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Phase 3: fetch Etisalat enrichment only after the DB sims are already displayed.
  // Uses AbortController so navigating away cancels the request instantly.
  useEffect(() => {
    if (loading) return   // wait for Phase 1+2 to finish first

    // No Etisalat SIMs in DB yet? skip silently
    const etisalatSims = sims.filter(
      s => /etisalat|e&/i.test(s.carrier || '')
    )
    if (!etisalatSims.length) { setEtData({}); return }

    const ctrl = new AbortController()
    setEtLoading(true)

    ;(async () => {
      try {
        const token = localStorage.getItem('gcd_token')
        const res   = await fetch(`${API}/api/etisalat/sims`, {
          headers: { Authorization: `Bearer ${token}` },
          signal:  ctrl.signal,
        })
        if (res.ok) {
          const d = await res.json()
          setEtData(d.sims || {})
        } else {
          setEtData({})
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.error('[Etisalat]', e)
        setEtData({})
      } finally {
        setEtLoading(false)
      }
    })()

    return () => ctrl.abort()
  }, [loading, sims])   // re-runs after load() resolves

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, animation:'slideUp 0.3s ease' }}>
      <POCHeader
        title="SIM Cards" icon={Smartphone} color="#0D9488"
        station={station} onStationChange={setStation} canSwitch={canSwitch}
        showDate={false}
        subtitle={`${sims.length} SIM${sims.length!==1?'s':''} total`}
      />

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:14 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height:168, borderRadius:16 }}/>)}
        </div>
      ) : (
        <SimSection
          sims={sims}
          emps={emps}
          station={station}
          onRefresh={load}
          etisalatData={etData}
          etisalatLoading={etLoading}
        />
      )}
    </div>
  )
}
