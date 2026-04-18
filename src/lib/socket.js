'use client'
import { useEffect, useRef } from 'react'

// socket.io-client is NOT imported statically.  A static top-level import
// would place the entire ~200 KB library into the JS chunk of every page
// that touches this module — including pages that never open a socket.
// Instead we use a dynamic import() inside getSocket() so webpack splits
// socket.io-client into its own lazy chunk that is only downloaded the
// first time a real connection is needed (i.e. after the page is already
// interactive).

let socketInstance = null

export async function getSocket() {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('gcd_token')
  if (!token) return null
  if (!socketInstance || socketInstance.disconnected) {
    const { io } = await import('socket.io-client')
    socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    })
  }
  return socketInstance
}

export function disconnectSocket() {
  socketInstance?.disconnect()
  socketInstance = null
}

export function useSocket(events = {}) {
  const sockRef   = useRef(null)
  // Capture events in a ref so the effect doesn't need them as deps
  const eventsRef = useRef(events)
  eventsRef.current = events

  useEffect(() => {
    let cancelled = false

    getSocket().then(sock => {
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
  }, [])

  return sockRef.current
}
