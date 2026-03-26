'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './auth'
import { differenceInDays, parseISO } from 'date-fns'

const API = process.env.NEXT_PUBLIC_API_URL
const Ctx = createContext({})

function isExpiring(ds, days = 30) {
  if (!ds) return false
  try { return differenceInDays(parseISO(ds.slice(0, 10)), new Date()) <= days }
  catch { return false }
}

export function AlertsProvider({ children }) {
  const { user } = useAuth()
  const [counts, setCounts] = useState({})

  const refresh = useCallback(async () => {
    if (!user) return
    const h = { Authorization: `Bearer ${localStorage.getItem('gcd_token')}` }
    try {
      const [eR, lR, sR, vR] = await Promise.allSettled([
        fetch(`${API}/api/employees`, { headers: h }).then(r => r.json()),
        fetch(`${API}/api/leaves?status=pending`, { headers: h }).then(r => r.json()),
        fetch(`${API}/api/sims`, { headers: h }).then(r => r.json()),
        fetch(`${API}/api/vehicles`, { headers: h }).then(r => r.json()),
      ])

      const emps   = eR.status === 'fulfilled' ? (eR.value?.employees || []) : []
      const leaves = lR.status === 'fulfilled' ? (lR.value?.leaves   || []) : []
      const sims   = sR.status === 'fulfilled' ? (sR.value?.sims     || []) : []
      const vehs   = vR.status === 'fulfilled' ? (vR.value?.vehicles || []) : []

      const employees = emps.filter(e =>
        isExpiring(e.visa_expiry) || isExpiring(e.license_expiry) || isExpiring(e.iloe_expiry)
      ).length

      const leavesPending = leaves.length

      const simsIssues = sims.filter(s =>
        s.status === 'damaged' || s.status === 'inactive'
      ).length

      const fleetIssues = vehs.filter(v =>
        v.status === 'grounded' || v.status === 'maintenance'
      ).length

      setCounts({
        employees,
        leaves:  leavesPending,
        sims:    simsIssues,
        fleet:   fleetIssues,
        hr:      employees + leavesPending,
        poc:     fleetIssues + simsIssues + leavesPending,
      })
    } catch(e) { /* silent */ }
  }, [user])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 5 * 60 * 1000) // refresh every 5 min
    return () => clearInterval(t)
  }, [refresh])

  return <Ctx.Provider value={{ counts, refresh }}>{children}</Ctx.Provider>
}

export function useAlerts() { return useContext(Ctx) }
