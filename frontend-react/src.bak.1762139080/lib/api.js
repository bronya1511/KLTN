const BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8080/api'
export const api = {
  async get(path, { params } = {}) {
    const qs = params ? `?${new URLSearchParams(params)}` : ''
    const r = await fetch(`${BASE}${path}${qs}`)
    return { data: await r.json() }
  },
  async post(path, body) {
    const r = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    })
    return { data: await r.json() }
  },
}
