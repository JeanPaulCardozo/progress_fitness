// Cliente de la API. Contrato en API.md.
// Con VITE_API_URL definido habla con el backend real; sin él usa un mock en localStorage.
const BASE = import.meta.env.VITE_API_URL
const TOKEN = 'pf_token'

export const getToken = () => localStorage.getItem(TOKEN)
export const setToken = (t) => (t ? localStorage.setItem(TOKEN, t) : localStorage.removeItem(TOKEN))

async function http(method, path, body) {
  const form = body instanceof URLSearchParams
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(!form && { 'Content-Type': 'application/json' }), ...(getToken() && { Authorization: `Bearer ${getToken()}` }) },
    body: form ? body : body && JSON.stringify(body),
  })
  if (res.status === 401 && getToken()) { setToken(null); location.reload() }
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) throw Object.assign(new Error(data?.message || 'Algo salió mal. Inténtalo de nuevo.'), { status: res.status })
  return data
}

// Adaptación a la API real: login con formulario OAuth2, rutas con barra final y campos en snake_case.
// La API no guarda el nº de serie, así que se numera por orden dentro de cada fecha + día + ejercicio.
const norm = (s) => ({ ...s, createdAt: s.created_at })
const withSerie = (sets) => {
  const n = {}
  return sets.toSorted((a, b) => a.id - b.id).map((s) => {
    const k = `${s.date}|${s.day}|${s.exercise}`
    return { ...norm(s), serie: (n[k] = (n[k] ?? 0) + 1) }
  })
}
const remote = {
  register: async (name, email, password) => {
    await http('POST', '/auth/register', { name, email, password })
    return remote.login(email, password)
  },
  login: async (email, password) => {
    const { access_token } = await http('POST', '/auth/login', new URLSearchParams({ username: email, password }))
    setToken(access_token)
    return { token: access_token, user: await remote.me() }
  },
  forgotPassword: (email) => http('POST', '/auth/forgot-password', { email }),
  resetPassword: (token, password) => http('POST', '/auth/reset-password', { token, password }),
  me: () => http('GET', '/auth/me'),
  listSets: async () => withSerie(await http('GET', '/sets/')),
  addSet: async (set) => ({ ...norm(await http('POST', '/sets/', set)), serie: set.serie }),
  deleteSet: (id) => http('DELETE', `/sets/${id}`),
  // Sin plan la API responde 404; la app lo trata como "usa el plan de ejemplo"
  getPlan: () => http('GET', '/plan/').catch((e) => { if (e.status === 404) return { text: null }; throw e }),
  savePlan: (text) => http('PUT', '/plan/', { text }),
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

const mockApi = {
  register: (name, email, password) => local('POST', '/auth/register', { name, email, password }),
  login: (email, password) => local('POST', '/auth/login', { email, password }),
  forgotPassword: (email) => local('POST', '/auth/forgot-password', { email }),
  resetPassword: (token, password) => local('POST', '/auth/reset-password', { token, password }),
  me: () => local('GET', '/me'),
  listSets: () => local('GET', '/sets'),
  addSet: (set) => local('POST', '/sets', set),
  deleteSet: (id) => local('DELETE', `/sets/${id}`),
  getPlan: () => local('GET', '/plan'),
  savePlan: (text) => local('PUT', '/plan', { text }),
}

export const api = BASE ? remote : mockApi
