import { NextResponse } from 'next/server'

const _raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
const BASE = _raw.startsWith('http') ? _raw : `https://${_raw}`

export async function GET(_req, { params }) {
  try {
    const res  = await fetch(`${BASE}/api/letters/verify/${params.id}`, { cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ valid: false, error: err.message, message: err.message }, { status: 500 })
  }
}
