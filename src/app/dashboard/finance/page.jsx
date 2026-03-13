'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
export default function FinanceIndex() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/finance/payroll') }, [router])
  return null
}
