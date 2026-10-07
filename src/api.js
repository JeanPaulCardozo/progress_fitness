// Cliente de la API. Contrato en API.md.
// Con VITE_API_URL definido habla con el backend real; sin él usa un mock en localStorage.
const BASE = import.meta.env.VITE_API_URL
const TOKEN = 'pf_token'

export const getToken = () => localStorage.getItem(TOKEN)
export const setToken = (t) => (t ? localStorage.setItem(TOKEN, t) : localStorage.removeItem(TOKEN))

async function http(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(getToken() && { Authorization: `Bearer ${getToken()}` }) },
    body: body && JSON.stringify(body),
  })
  if (res.status === 401 && getToken()) { setToken(null); location.reload() }
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || 'Algo salió mal. Inténtalo de nuevo.')
  return data
}

// ponytail: mock solo para desarrollo, contraseñas en claro en localStorage. Se ignora en cuanto exista VITE_API_URL.
const db = {
  get: (k, d) => JSON.parse(localStorage.getItem('mock_' + k) ?? 'null') ?? d,
  set: (k, v) => localStorage.setItem('mock_' + k, JSON.stringify(v)),
}
const fail = (m) => { throw new Error(m) }
const pub = ({ password: _, ...u }) => u
const meMock = () => db.get('users', []).find((u) => u.token === getToken()) ?? (setToken(null), fail('Sesión expirada'))
const mock = {
  'POST /auth/register': ({ name, email, password }) => {
    const users = db.get('users', [])
    if (users.some((u) => u.email === email)) fail('Ya existe una cuenta con ese correo.')
    const u = { id: crypto.randomUUID(), name, email, password, token: crypto.randomUUID() }
    db.set('users', [...users, u])
    return { token: u.token, user: pub(u) }
  },
  'POST /auth/login': ({ email, password }) => {
    const u = db.get('users', []).find((u) => u.email === email && u.password === password)
    if (!u) fail('Correo o contraseña incorrectos.')
    return { token: u.token, user: pub(u) }
  },
  'POST /auth/forgot-password': ({ email }) => {
    const users = db.get('users', [])
    const u = users.find((u) => u.email === email)
    if (u) { u.reset = crypto.randomUUID(); db.set('users', users) }
    // El backend real envía este enlace por correo; el mock lo devuelve para poder probar el flujo.
    return u ? { devResetLink: `${location.origin}${location.pathname}?reset=${u.reset}` } : null
  },
  'POST /auth/reset-password': ({ token, password }) => {
    const users = db.get('users', [])
    const u = users.find((u) => u.reset && u.reset === token) ?? fail('El enlace no es válido o ya fue usado.')
    Object.assign(u, { password, reset: null })
    db.set('users', users)
    return null
  },
  'GET /me': () => pub(meMock()),
  'GET /sets': () => db.get('sets', []).filter((s) => s.userId === meMock().id),
  'POST /sets': (s) => {
    const row = { ...s, id: crypto.randomUUID(), userId: meMock().id, volume: s.weight * s.reps, createdAt: new Date().toISOString() }
    db.set('sets', [...db.get('sets', []), row])
    return row
  },
  'GET /plan': () => ({ text: db.get('plans', {})[meMock().id] ?? null }),
  'PUT /plan': ({ text }) => { db.set('plans', { ...db.get('plans', {}), [meMock().id]: text }); return { text } },
  'DELETE /sets': (_, id) => { db.set('sets', db.get('sets', []).filter((s) => s.id !== id || s.userId !== meMock().id)); return null },
}
async function local(method, path, body) {
  await new Promise((r) => setTimeout(r, 150))
  const [, p, id] = path.match(/^(.*?)(?:\/([0-9a-f-]{36}))?$/)
  return structuredClone(mock[`${method} ${p}`](body, id))
}

const call = BASE ? http : local

export const api = {
  register: (name, email, password) => call('POST', '/auth/register', { name, email, password }),
  login: (email, password) => call('POST', '/auth/login', { email, password }),
  forgotPassword: (email) => call('POST', '/auth/forgot-password', { email }),
  resetPassword: (token, password) => call('POST', '/auth/reset-password', { token, password }),
  me: () => call('GET', '/me'),
  listSets: () => call('GET', '/sets'),
  addSet: (set) => call('POST', '/sets', set),
  deleteSet: (id) => call('DELETE', `/sets/${id}`),
  getPlan: () => call('GET', '/plan'),
  savePlan: (text) => call('PUT', '/plan', { text }),
}
