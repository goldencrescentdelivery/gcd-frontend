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

  const load = useCallback(async () => {
    setLoading(true)
    const h = { headers: { Authorization: `Bearer ${localStorage.getItem('gcd_token')}` } }
    try {
      const [s, e] = await Promise.all([
        fetch(`${API}/api/sims`, h).then(r => r.json()),
        fetch(`${API}/api/employees`, h).then(r => r.json()),
      ])
      setSims(s.sims||[])
      setEmps(e.employees||[])
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const stationSims = sims.filter(s => s.station_code === station)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, animation:'slideUp 0.3s ease' }}>
      <POCHeader
        title="SIM Cards" icon={Smartphone} color="#0D9488"
        station={station} onStationChange={setStation} canSwitch={canSwitch}
        showDate={false}
        subtitle={`${stationSims.length} SIMs at ${station}`}
      />

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:14 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height:168, borderRadius:16 }}/>)}
        </div>
      ) : (
        <SimSection sims={stationSims} emps={emps} station={station} onRefresh={load}/>
      )}
    </div>
  )
}
