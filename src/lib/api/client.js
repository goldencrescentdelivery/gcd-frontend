const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function authHeader() {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('gcd_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...authHeader(),
    ...(options.headers || {}),
  }
  const res = await fetch(`${API}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err  = new Error(body.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

export const api = {
  get:    (path, opts = {}) => apiFetch(path, { method: 'GET',    ...opts }),
  post:   (path, data)      => apiFetch(path, { method: 'POST',   body: JSON.stringify(data) }),
  patch:  (path, data)      => apiFetch(path, { method: 'PATCH',  body: JSON.stringify(data) }),
  put:    (path, data)      => apiFetch(path, { method: 'PUT',    body: JSON.stringify(data) }),
  delete: (path)            => apiFetch(path, { method: 'DELETE' }),
}
