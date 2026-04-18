'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './auth'

import { API } from '@/lib/api'
const Ctx = createContext({})

export function AlertsProvider({ children }) {
  const { user } = useAuth()
  const [counts, setCounts] = useState({})

  const refresh = useCallback(async () => {
    if (!user) return
    const h = { Authorization: `Bearer ${localStorage.getItem('gcd_token')}` }
    try {
      const res = await fetch(`${API}/api/analytics/alerts`, { headers: h })
      if (!res.ok) return
      const data = await res.json()
      setCounts(data)
    } catch(e) { /* silent */ }
  }, [user])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [refresh])

  return <Ctx.Provider value={{ counts, refresh }}>{children}</Ctx.Provider>
}

export function useAlerts() { return useContext(Ctx) }
