'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HandoversRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/poc/handovers') }, [router])
  return null
}
