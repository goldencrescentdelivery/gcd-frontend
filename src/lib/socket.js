'use client'
import { useEffect, useRef } from 'react'

// socket.io-client is lazy-imported so it only loads when a connection is
// actually needed — keeps it out of every page's initial JS bundle.

const instances = new Map() // namespace → socket instance

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

async function getSocket(namespace = '/') {
  if (typeof window === 'undefined') return null

  const key = namespace
  if (instances.get(key)?.connected) return instances.get(key)

  const token = localStorage.getItem('gcd_token') // legacy — cookie is sent automatically
  const { io } = await import('socket.io-client')

  const url = namespace === '/' ? API_URL : `${API_URL}${namespace}`
  const sock = io(url, {
    auth:               token ? { token } : {},  // legacy header fallback
    withCredentials:    true,                    // send HttpOnly cookies
    transports:         ['websocket', 'polling'],
    reconnectionAttempts: 5,
  })

  instances.set(key, sock)
  return sock
}

export { getSocket }

export function getNotifSocket()   { return getSocket('/notifications') }
export function getPayrollSocket() { return getSocket('/payroll') }

export function disconnectSocket(namespace = '/') {
  const sock = instances.get(namespace)
  sock?.disconnect()
  instances.delete(namespace)
}

export function disconnectAll() {
  instances.forEach(s => s.disconnect())
  instances.clear()
}

export function useSocket(events = {}, namespace = '/') {
  const sockRef   = useRef(null)
  const eventsRef = useRef(events)
  eventsRef.current = events

  useEffect(() => {
    let cancelled = false

    getSocket(namespace).then(sock => {
      if (cancelled || !sock) return
      sockRef.current = sock
      Object.entries(eventsRef.current).forEach(([ev, fn]) => sock.on(ev, fn))
    })

    return () => {
      cancelled = true
      if (sockRef.current) {
        Object.entries(eventsRef.current).forEach(([ev, fn]) => sockRef.current.off(ev, fn))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace])

  return sockRef.current
}

// Convenience hook for notification namespace
export function useNotifSocket(events = {}) {
  return useSocket(events, '/notifications')
}
