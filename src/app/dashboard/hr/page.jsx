'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
export default function HRIndex() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/hr/employees') }, [router])
  return null
}
