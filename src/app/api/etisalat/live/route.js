// Vercel-side proxy for Etisalat ThingWorx live fleet data.
// Runs on Vercel (different IPs to Railway) so it can reach the Etisalat server.
// Caches the response for 55 s — all fleet-page clients share one upstream call.

import { NextResponse } from 'next/server'

const BASE    = 'https://iotmobility.etisalatdigital.ae'
const APP_KEY = '8a3745a8-f755-417d-8049-e57d13041789'
const ET_USER = 'GCDS'
const ET_PASS = 'NIkTtPQWwPLyUZ8Y6'
const ORG     = 'Amazon-Thrifty'

// Module-level cache — survives across warm Vercel invocations
let _cache   = null
let _cacheTs = 0
const CACHE_MS = 55_000

// Session cookie cache
let _cookie = null
let _cookieExpiry = 0

function parseCookies(setCookieArr = []) {
  return (Array.isArray(setCookieArr) ? setCookieArr : [setCookieArr])
    .map(c => c.split(';')[0].trim()).filter(Boolean).join('; ')
}

async function login() {
  const r1 = await fetch(`${BASE}/Thingworx/FormLogin/${ORG}`, {
    method: 'GET',
    redirect: 'manual',
  })
  const cookie1 = parseCookies(r1.headers.getSetCookie ? r1.headers.getSetCookie() : [])
  const csrfMatch = cookie1.match(/CSRFID=([^;,\s]+)/)
  const csrfid = csrfMatch?.[1] || ''

  const formBody = new URLSearchParams({
    'thingworx-form-userid':  ET_USER,
    'thingworx-form-password': ET_PASS,
    'x-csrf-id':              csrfid,
    'x-thingworx-session':    'true',
    'OrganizationName':       ORG,
  })

  const r2 = await fetch(`${BASE}/Thingworx/action-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookie1 },
    body: formBody.toString(),
    redirect: 'manual',
  })
  const cookie2 = parseCookies(r2.headers.getSetCookie ? r2.headers.getSetCookie() : [])
  // Merge cookies
  const merged = {}
  for (const part of `${cookie1}; ${cookie2}`.split(';')) {
    const eq = part.indexOf('=')
    if (eq > 0) merged[part.slice(0, eq).trim()] = part.slice(eq + 1).trim()
  }
  const combined = Object.entries(merged).map(([k,v]) => `${k}=${v}`).join('; ')
  console.log('[etisalat] login r2.status:', r2.status, '| keys:', Object.keys(merged).join(','))
  return combined
}

async function getSession() {
  if (_cookie && Date.now() < _cookieExpiry) return _cookie
  _cookie = await login()
  _cookieExpiry = Date.now() + 4 * 3600 * 1000
  return _cookie
}

async function fetchLive() {
  // Try AppKey first (simpler, stateless)
  const r = await fetch(
    `${BASE}/Thingworx/Things/PostgreSQL/Services/GetVehicleByClientNameAndFilter_APIByAppKey`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'appKey': APP_KEY },
      body: JSON.stringify({ Username: ET_USER, PageNumber: '1', PlateFilter: '' }),
    }
  )
  if (r.ok) return r.json()

  // Fall back to session login
  console.log('[etisalat] AppKey failed with', r.status, '— trying session login')
  const cookie = await getSession()
  const r2 = await fetch(
    `${BASE}/Thingworx/Things/PostgreSQL/Services/GetVehicleByClientNameAndFilter_APIByAppKey`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({ Username: ET_USER, PageNumber: '1', PlateFilter: '' }),
    }
  )
  if (!r2.ok) throw new Error(`Etisalat HTTP ${r2.status}`)
  return r2.json()
}

export async function GET() {
  // Serve cached data immediately if fresh
  if (_cache && Date.now() - _cacheTs < CACHE_MS) {
    return NextResponse.json(_cache, { headers: { 'X-Cache': 'HIT' } })
  }

  try {
    const data = await fetchLive()
    const rows = data?.rows || []
    console.log('[etisalat] live OK — rows:', rows.length)
    _cache   = data
    _cacheTs = Date.now()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[etisalat] live error:', err.message)
    // Return stale cache if available rather than an error
    if (_cache) return NextResponse.json(_cache, { headers: { 'X-Stale': '1' } })
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
