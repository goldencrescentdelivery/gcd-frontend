'use client'
import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

let socketInstance = null

export function getSocket() {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('gcd_token')
  if (!token) return null
  if (!socketInstance || socketInstance.disconnected) {
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
  const sockRef = useRef(null)

  useEffect(() => {
    const sock = getSocket()
    if (!sock) return
    sockRef.current = sock

    Object.entries(events).forEach(([event, handler]) => {
      sock.on(event, handler)
    })

    return () => {
      Object.entries(events).forEach(([event, handler]) => {
        sock.off(event, handler)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return sockRef.current
}
