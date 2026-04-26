'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { API } from '@/lib/api'
import { useStation, POCHeader, DAsTab, EmpDetailModal } from '../_components/poc-shared'
import { Users } from 'lucide-react'

export default function DAsPage() {
  const { user } = useAuth()
  const { station, setStation, canSwitch } = useStation(user)
  const [emps,    setEmps]    = useState([])
  const [sims,    setSims]    = useState([])
  const [loading, setLoading] = useState(true)
  const [empDetail, setEmpDetail] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const h = { headers: { Authorization: `Bearer ${localStorage.getItem('gcd_token')}` } }
    try {
      const [e, s] = await Promise.all([
        fetch(`${API}/api/employees`, h).then(r => r.json()),
        fetch(`${API}/api/sims`, h).then(r => r.json()),
      ])
      setEmps(e.employees||[])
      setSims(s.sims||[])
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const stationEmps = emps.filter(e => e.station_code === station)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, animation:'slideUp 0.3s ease' }}>
      <POCHeader
        title="Delivery Agents" icon={Users} color="#8B5CF6"
        station={station} onStationChange={setStation} canSwitch={canSwitch}
        showDate={false}
        subtitle={`${stationEmps.length} DAs assigned to ${station}`}
      />

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:10 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height:100, borderRadius:16 }}/>)}
        </div>
      ) : (
        <DAsTab stationEmps={stationEmps} sims={sims} onViewEmp={setEmpDetail}/>
      )}

      {empDetail && <EmpDetailModal emp={empDetail} sims={sims} onClose={() => setEmpDetail(null)}/>}
    </div>
  )
}
