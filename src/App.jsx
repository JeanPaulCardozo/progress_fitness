import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { api, getToken, googleLoginUrl, setToken } from './api'
import { project, reducedMotion, releaseVelocity, rubberband, spring } from './motion'
import { AI_PROMPT, DEFAULT_PLAN, EXTRA, FEELS, parsePlan, planToText, WARMUPS, youtubeId } from './plan'

const today = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD en hora local
const fmtDate = (d, o = { weekday: 'short', day: 'numeric', month: 'short' }) => new Date(d + 'T00:00').toLocaleDateString('es', o)
const kg = (n) => `${+(+n).toFixed(1)} kg`
const vol = (sets) => sets.reduce((a, s) => a + s.weight * s.reps, 0)
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const byDate = (sets) => Object.entries(Object.groupBy(sets, (s) => s.date)).sort(([a], [b]) => b.localeCompare(a))
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
// "90–120 s" → 90, "2 min" → 120, "circuito" → null
const restSeconds = (r) => { const n = +r?.match(/\d+/)?.[0]; return n ? (/min/.test(r) ? n * 60 : n) : null }
const haptic = (p = 10) => navigator.vibrate?.(p)

// El navegador solo deja sonar audio si el contexto se creó en un toque del usuario
let audio
const unlockAudio = () => { try { audio ??= new AudioContext(); audio.resume() } catch { /* sin audio */ } }
function beep() {
  if (!audio) return
  for (const t of [0, 0.35, 0.7]) {
    const o = audio.createOscillator(), g = audio.createGain(), at = audio.currentTime + t
    o.frequency.value = 880
    g.gain.setValueAtTime(0.25, at); g.gain.exponentialRampToValueAtTime(0.001, at + 0.25)
    o.connect(g).connect(audio.destination); o.start(at); o.stop(at + 0.25)
  }
}

// Vuelta del login con Google: la API redirige a /#token=... o /#error=...
const OAUTH_ERRORS = {
  google: 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.',
  google_email: 'Tu correo de Google no está verificado. Verifícalo en Google o entra con correo y contraseña.',
}
function takeOAuthResult() {
  const h = new URLSearchParams(location.hash.slice(1))
  if (!h.has('token') && !h.has('error')) return null
  history.replaceState(null, '', location.pathname + location.search) // que el token no quede en la URL ni en el historial
  if (h.get('token')) setToken(h.get('token'))
  return h.get('error') && (OAUTH_ERRORS[h.get('error')] ?? 'No se pudo iniciar sesión.')
}
const OAUTH_ERROR = takeOAuthResult() // una sola vez, al cargar la página

export default function App() {
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(!!getToken())
  const [notice, setNotice] = useState(OAUTH_ERROR)

  useEffect(() => {
    if (getToken()) api.me().then(setUser).catch(() => setToken(null)).finally(() => setBooting(false))
  }, [])

  const login = ({ token, user }) => { setToken(token); setUser(user) }
  const logout = () => { setToken(null); setUser(null); setNotice(null) }

  if (booting) return <div className="boot"><Logo /></div>
  return user ? <Dashboard user={user} onLogout={logout} /> : <Landing onAuth={login} notice={notice} />
}

/* ───────────────────────── Iconos ───────────────────────── */

const ICONS = {
  train: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12',
  warmup: 'M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .5 2 1.5 3 2.5 3 0-3-1-5 0-8z',
  history: 'M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5zM4 10h16M8 3v4M16 3v4',
  progress: 'M4 19h16M6 15l4-4 3 3 5-6',
  plan: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  timer: 'M10 2h4M12 13V9M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a6.5 6.5 0 0 0 10 10z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  play: 'M7 4.5v15l12-7.5z',
  up: 'M12 19V5M6 11l6-6 6 6',
  calendar: 'M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5zM4 10h16M8 3v4M16 3v4',
}
const Icon = ({ name, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ICONS[name]} />
  </svg>
)

const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
)

const Eye = ({ off }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M3 3l18 18" />}
  </svg>
)

const Logo = () => (
  <span className="logo"><span className="logo-mark"><Icon name="up" size={16} /></span><span>Progress<b>Fit</b></span></span>
)

/* ───────────────────────── Tema día / noche ───────────────────────── */

const THEME = 'pf_theme'
const THEME_BG = { light: '#f2f2f7', dark: '#0b0d10' }
const sysDark = matchMedia('(prefers-color-scheme: dark)')
const currentTheme = () => document.documentElement.dataset.theme || (sysDark.matches ? 'dark' : 'light')
function applyTheme(t) {
  document.documentElement.dataset.theme = t
  try { localStorage.setItem(THEME, t) } catch { /* modo privado: el tema dura lo que la pestaña */ }
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', THEME_BG[t]))
}

// El cambio se revela en círculo desde el propio botón: el origen deja claro qué lo provocó
function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme)
  useEffect(() => { // mientras el usuario no elija, sigue al sistema
    const follow = () => { if (!document.documentElement.dataset.theme) setTheme(currentTheme()) }
    sysDark.addEventListener('change', follow)
    return () => sysDark.removeEventListener('change', follow)
  }, [])

  function toggle(e) {
    const next = theme === 'dark' ? 'light' : 'dark'
    const swap = () => { applyTheme(next); flushSync(() => setTheme(next)) }
    if (!document.startViewTransition) return swap()
    const r = e.currentTarget.getBoundingClientRect()
    const x = r.left + r.width / 2, y = r.top + r.height / 2
    const vt = document.startViewTransition(swap)
    if (reducedMotion()) return // se queda el fundido corto por defecto, sin movimiento
    vt.ready.then(() => {
      const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 560, easing: 'cubic-bezier(.2, .8, .2, 1)', pseudoElement: '::view-transition-new(root)' },
      )
    })
  }

  const label = theme === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo noche'
  return (
    <button className="icon-btn theme-toggle" data-mode={theme} onClick={toggle} aria-label={label} title={label}>
      <Icon name="sun" /><Icon name="moon" />
    </button>
  )
}

/* ───────────────────────── Hoja modal ───────────────────────── */

// Hoja inferior en móvil (se arrastra para cerrar, con inercia) y tarjeta centrada en escritorio.
// Todo el movimiento sale de un muelle sobre p (0 = abierta, 1 = cerrada), así que se puede agarrar a medio camino.
function Sheet({ title, onClose, children }) {
  const dlg = useRef(), panel = useRef(), anim = useRef(), drag = useRef(null), p = useRef(1)
  const titleId = useId()
  const mobile = () => matchMedia('(max-width: 759px)').matches

  const render = (v) => {
    const el = panel.current
    if (!el) return
    if (mobile()) { el.style.transform = `translate3d(0, ${v * el.offsetHeight}px, 0)`; el.style.opacity = '' }
    else { el.style.transform = `translate3d(0, ${v * 16}px, 0) scale(${1 - v * 0.04})`; el.style.opacity = String(1 - v) }
    dlg.current.style.setProperty('--scrim', String(Math.min(1, Math.max(0, 1 - v))))
  }
  const animate = (to, velocity = 0, opts = {}, done) => {
    anim.current?.stop()
    anim.current = spring(p.current, to, { velocity, restDelta: 0.001, restSpeed: 0.01, ...opts, onUpdate: (v) => { p.current = v; render(v) }, onDone: done })
  }
  const dismiss = (velocity = 0) => animate(1, velocity, { response: 0.3 }, onClose)

  useEffect(() => {
    dlg.current.showModal()
    render(1)
    animate(0)
    return () => anim.current?.stop()
  }, [])

  const down = (e) => {
    if (!mobile() || e.target.closest('button, input, a')) return
    anim.current?.stop() // agarrarla a medio camino la detiene donde está, sin saltos
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { y0: e.clientY, from: p.current * panel.current.offsetHeight, h: panel.current.offsetHeight, hist: [{ y: e.clientY, t: e.timeStamp }] }
  }
  const move = (e) => {
    const d = drag.current
    if (!d) return
    let y = d.from + e.clientY - d.y0
    if (y < 0) y = rubberband(y, d.h) // hacia arriba no hay más hoja: resiste
    p.current = y / d.h
    render(p.current)
    d.hist = [...d.hist.slice(-5), { y: e.clientY, t: e.timeStamp }]
  }
  const up = () => {
    const d = drag.current
    if (!d) return
    drag.current = null
    const v = releaseVelocity(d.hist)
    // Se decide por adónde va, no por dónde se soltó: un golpe rápido hacia abajo cierra aunque apenas se movió
    if (p.current * d.h + project(v) > d.h * 0.4) dismiss(v / d.h)
    else animate(0, v / d.h, { damping: 0.8, response: 0.3 })
  }

  return (
    <dialog ref={dlg} className="sheet" aria-labelledby={titleId} onCancel={(e) => { e.preventDefault(); dismiss() }}>
      <div className="sheet-scrim" onClick={() => dismiss()} />
      <div className="sheet-panel" ref={panel}>
        <header className="sheet-head" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <span className="grabber" aria-hidden />
          <h2 id={titleId}>{title}</h2>
          <button className="icon-btn" onClick={() => dismiss()} aria-label="Cerrar"><Icon name="x" size={20} /></button>
        </header>
        <div className="sheet-body">{children(dismiss)}</div>
      </div>
    </dialog>
  )
}

/* ───────────────────────── Aviso flotante ───────────────────────── */

function Toast({ toast, onDone }) {
  const [out, setOut] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setOut(true), toast.action ? 5000 : 2600)
    return () => clearTimeout(t)
  }, [toast])
  const error = toast.tone === 'error'
  return (
    <div className={`toast ${error ? 'error' : ''} ${out ? 'out' : ''}`} role={error ? 'alert' : 'status'} onAnimationEnd={() => out && onDone()}>
      <Icon name={error ? 'x' : 'check'} size={18} />
      <span>{toast.text}</span>
      {toast.action && <button onClick={() => { toast.action[1](); setOut(true) }}>{toast.action[0]}</button>}
    </div>
  )
}

/* ───────────────────────── Sin sesión ───────────────────────── */

const FEATURES = [
  ['bolt', 'Registro rápido', 'Pensado para usarlo entre series, con una mano.'],
  ['progress', 'Sobrecarga progresiva', 'Te avisa cuando completas el rango y toca subir.'],
  ['trophy', 'Récords e historial', 'Tus PR y tu volumen semana a semana.'],
  ['sparkle', 'Tu plan, a tu medida', 'Pide tu rutina a una IA, pega el texto y la app se organiza sola.'],
]

function Landing({ onAuth, notice }) {
  return (
    <div className="landing">
      <div className="glow" aria-hidden />
      <header className="landing-top"><Logo /><ThemeToggle /></header>
      <main className="landing-grid">
        <section className="hero">
          <span className="pill"><i />Tu plan, tus series, tu progreso</span>
          <h1>Cada serie cuenta.<br /><span className="grad">Mídela.</span></h1>
          <p className="lead">Apunta peso, repeticiones y cómo te sentiste en cada serie. La app te muestra cuándo toca subir peso y cuánto has avanzado.</p>
          <ul className="features">
            {FEATURES.map(([ic, t, d]) => (
              <li key={t}><b><Icon name={ic} size={20} /></b><div><strong>{t}</strong><span>{d}</span></div></li>
            ))}
          </ul>
          <div className="mock" aria-hidden>
            <div className="mock-head"><span>Press de banca</span><em>PR 72,5 kg</em></div>
            <svg viewBox="0 0 200 50"><polyline points="0,44 30,40 60,36 90,37 120,28 150,22 180,14 200,8" /></svg>
            <div className="mock-sets"><span>70×8</span><span>70×8</span><span>72,5×6</span><span className="new">+ serie</span></div>
          </div>
        </section>
        <AuthCard onAuth={onAuth} notice={notice} />
      </main>
    </div>
  )
}

function AuthCard({ onAuth, notice }) {
  const resetToken = new URLSearchParams(location.search).get('reset')
  const [mode, setMode] = useState(resetToken ? 'reset' : 'login')
  const [msg, setMsg] = useState(notice && { type: 'error', text: notice }) // { type: 'error' | 'ok', text, link? }
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)
  const [mismatch, setMismatch] = useState(false)

  const go = (m) => { setMode(m); setMsg(null); setShow(false); setMismatch(false) }

  // Se valida mientras escribe, no al enviar: el error aparece junto al campo que lo causa
  function check(e) {
    const f = e.currentTarget
    if (!f.confirm) return
    const bad = f.confirm.value !== '' && f.confirm.value !== f.password.value
    f.confirm.setCustomValidity(bad ? 'Las contraseñas no coinciden.' : '')
    setMismatch(bad)
  }

  async function submit(e) {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.currentTarget))
    const email = f.email?.trim().toLowerCase()
    setBusy(true); setMsg(null)
    try {
      if (mode === 'login') onAuth(await api.login(email, f.password))
      if (mode === 'register') onAuth(await api.register(f.name.trim(), email, f.password))
      if (mode === 'forgot') {
        const r = await api.forgotPassword(email)
        setMsg({ type: 'ok', text: 'Si hay una cuenta con ese correo, te llegará un enlace para restablecer la contraseña.', link: r?.devResetLink })
      }
      if (mode === 'reset') {
        await api.resetPassword(resetToken, f.password)
        history.replaceState(null, '', location.pathname)
        setMode('login'); setMsg({ type: 'ok', text: 'Contraseña actualizada. Ya puedes iniciar sesión.' })
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  const titles = {
    login: ['Bienvenido de nuevo', 'Entra para seguir con tu progreso.'],
    register: ['Crea tu cuenta', 'Empieza a registrar tus entrenamientos.'],
    forgot: ['Recuperar contraseña', 'Te enviaremos un enlace a tu correo.'],
    reset: ['Nueva contraseña', 'Elige una contraseña nueva para tu cuenta.'],
  }
  // Un solo interruptor para todos los campos: al registrarse se ven las dos contraseñas a la vez
  const pw = (name, label, ac) => (
    <label>{label}
      <span className="pw">
        <input name={name} type={show ? 'text' : 'password'} required minLength={8} autoComplete={ac} placeholder="Mínimo 8 caracteres" aria-invalid={name === 'confirm' && mismatch} />
        <button type="button" className="pw-toggle" onClick={() => setShow(!show)} aria-pressed={show} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} title={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
          <Eye off={show} />
        </button>
      </span>
      {name === 'confirm' && mismatch && <span className="field-error">Las contraseñas no coinciden.</span>}
    </label>
  )

  return (
    <section className="auth card">
      {(mode === 'login' || mode === 'register') && (
        <div className="seg" data-active={mode === 'register' ? 1 : 0}>
          <button type="button" aria-pressed={mode === 'login'} onClick={() => go('login')}>Iniciar sesión</button>
          <button type="button" aria-pressed={mode === 'register'} onClick={() => go('register')}>Registrarse</button>
        </div>
      )}
      <h2>{titles[mode][0]}</h2>
      <p className="muted">{titles[mode][1]}</p>

      <form onSubmit={submit} onInput={check} key={mode}>
        {mode === 'register' && <label>Nombre<input name="name" required autoComplete="name" placeholder="Tu nombre" /></label>}
        {mode !== 'reset' && <label>Correo<input name="email" type="email" required autoComplete="email" inputMode="email" placeholder="tu@correo.com" /></label>}
        {mode === 'login' && pw('password', 'Contraseña', 'current-password')}
        {(mode === 'register' || mode === 'reset') && <>{pw('password', 'Contraseña', 'new-password')}{pw('confirm', 'Repite la contraseña', 'new-password')}</>}
        {mode === 'login' && <button type="button" className="link right" onClick={() => go('forgot')}>¿Olvidaste tu contraseña?</button>}

        {msg && (
          <p className={`msg ${msg.type}`} role="status">
            {msg.text}
            {msg.link && <><br /><small>Modo local (sin API): <a href={msg.link}>abrir enlace de recuperación</a></small></>}
          </p>
        )}

        <button className="btn primary block" disabled={busy} aria-busy={busy}>
          {busy ? <span className="spinner" aria-label="Un momento" /> : { login: 'Entrar', register: 'Crear cuenta', forgot: 'Enviar enlace', reset: 'Guardar contraseña' }[mode]}
        </button>
      </form>

      {googleLoginUrl && (mode === 'login' || mode === 'register') && (
        <>
          <p className="or"><span>o</span></p>
          <a className="btn google block" href={googleLoginUrl}><GoogleG />Continuar con Google</a>
        </>
      )}
      {(mode === 'forgot' || mode === 'reset') && <button className="link center" onClick={() => go('login')}>← Volver a iniciar sesión</button>}
    </section>
  )
}

/* ───────────────────────── Con sesión ───────────────────────── */

const MAX_DAYS = 7 // la API valida day entre 1 y 7
const TABS = [['train', 'Entrenar'], ['warmup', 'Calentar'], ['history', 'Historial'], ['progress', 'Progreso'], ['plan', 'Plan']]
const SET_FIELDS = ['date', 'day', 'exercise', 'serie', 'reps', 'weight', 'feel', 'notes']

function Dashboard({ user, onLogout }) {
  const [tab, setTab] = useState('train')
  const [sets, setSets] = useState(null)
  const [planText, setPlanText] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [rest, setRest] = useState(null) // { end, total }: vive aquí para seguir contando al cambiar de pestaña
  const [picker, setPicker] = useState(false)
  const [toast, setToast] = useState(null)

  const load = useCallback(() => {
    Promise.all([api.listSets(), api.getPlan()])
      .then(([s, p]) => { setSets(s); setPlanText(p?.text || DEFAULT_PLAN) })
      .catch((e) => setLoadError(e.message))
  }, [])
  useEffect(load, [load])
  const plan = useMemo(() => planText && parsePlan(planText), [planText])

  // Borde bajo la barra superior solo cuando hay contenido pasando por debajo
  useEffect(() => {
    const on = () => document.documentElement.toggleAttribute('data-scrolled', scrollY > 4)
    on(); addEventListener('scroll', on, { passive: true })
    return () => { removeEventListener('scroll', on); document.documentElement.removeAttribute('data-scrolled') }
  }, [])

  const notify = (text, opts = {}) => setToast({ id: Math.random(), text, ...opts })
  const run = async (fn) => { try { await fn(); return true } catch (e) { notify(e.message, { tone: 'error' }); return false } }
  const startRest = (sec) => { unlockAudio(); setRest({ end: Date.now() + sec * 1000, total: sec }) }
  const add = (s, restSec) => run(async () => {
    const row = await api.addSet(s)
    setSets((p) => [...p, row])
    haptic()
    notify(`Serie ${s.serie} guardada`, restSec && { action: [`Descansar ${clock(restSec)}`, () => startRest(restSec)] })
  })
  // Borrar es inmediato y sin preguntar; "Deshacer" la vuelve a crear con los mismos datos
  const del = (id) => {
    const s = sets.find((x) => x.id === id)
    setSets((p) => p.filter((x) => x.id !== id))
    api.deleteSet(id).then(
      () => notify(`${s.exercise} · ${+s.weight}×${s.reps} borrada`, { action: ['Deshacer', () => restore(s)] }),
      (e) => { setSets((p) => [...p, s]); notify(e.message, { tone: 'error' }) },
    )
  }
  const restore = (s) => run(async () => {
    const row = await api.addSet(Object.fromEntries(SET_FIELDS.map((k) => [k, s[k]])))
    setSets((p) => [...p, row])
  })
  const savePlan = (text) => run(async () => { await api.savePlan(text); setPlanText(text) })
  const go = (k) => { setTab(k); scrollTo({ top: 0 }) }

  return (
    <div className={`app ${rest ? 'has-timer' : ''}`}>
      <header className="topbar">
        <Logo />
        <nav className="tabs" aria-label="Secciones">
          {TABS.map(([k, label]) => (
            <button key={k} aria-current={tab === k ? 'page' : undefined} onClick={() => go(k)}><Icon name={k} />{label}</button>
          ))}
        </nav>
        <div className="who">
          <ThemeToggle />
          <span className="avatar" title={user.name} aria-hidden>{user.name?.[0]?.toUpperCase()}</span>
          <button className="icon-btn" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión"><Icon name="logout" size={20} /></button>
        </div>
      </header>
      <main className="content" key={tab}>
        {loadError
          ? <Empty icon="x" text={`No se pudieron cargar tus datos. ${loadError}`} action={<button className="btn primary" onClick={() => { setLoadError(null); load() }}>Reintentar</button>} />
          : !plan ? <Skeleton /> : <>
            {tab === 'train' && <Train user={user} sets={sets} plan={plan} isDefault={planText === DEFAULT_PLAN} onAdd={add} onDelete={del} onSavePlan={savePlan} onNotify={notify} onGoPlan={() => go('plan')} />}
            {tab === 'warmup' && <Warmup />}
            {tab === 'history' && <History sets={sets} days={plan.days} onDelete={del} />}
            {tab === 'progress' && <Progress sets={sets} days={plan.days} />}
            {tab === 'plan' && <Plan plan={plan} text={planText} onSave={savePlan} onNotify={notify} />}
          </>}
      </main>
      {toast && <Toast key={toast.id} toast={toast} onDone={() => setToast(null)} />}
      {rest
        ? <RestTimer timer={rest} onChange={setRest} />
        : <button className="timer-fab" onClick={() => setPicker(true)} aria-label="Temporizador de descanso" title="Temporizador de descanso"><Icon name="timer" size={26} /></button>}
      {picker && <TimerPicker onStart={startRest} onClose={() => setPicker(false)} />}
    </div>
  )
}

const Skeleton = () => (
  <div className="skeleton" aria-label="Cargando" role="status">
    <i style={{ height: 56, width: '60%' }} /><i style={{ height: 64 }} /><i style={{ height: 180 }} /><i style={{ height: 180 }} />
  </div>
)

const PRESETS = [30, 45, 60, 90, 120, 180]

function TimerPicker({ onStart, onClose }) {
  return (
    <Sheet title="Descanso" onClose={onClose}>
      {(dismiss) => {
        const start = (s) => { onStart(s); dismiss() }
        return (
          <>
            <div className="presets">
              {PRESETS.map((s) => <button key={s} className="btn tinted" onClick={() => start(s)}>{clock(s)}</button>)}
            </div>
            <form className="custom-time" onSubmit={(e) => {
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              const s = +f.get('min') * 60 + +f.get('sec')
              if (s > 0) start(s)
            }}>
              <label>min<input name="min" type="number" inputMode="numeric" min="0" max="59" defaultValue="1" /></label>
              <label>seg<input name="sec" type="number" inputMode="numeric" min="0" max="59" defaultValue="0" /></label>
              <button className="btn primary">Iniciar</button>
            </form>
          </>
        )
      }}
    </Sheet>
  )
}

function Warmup() {
  if (!WARMUPS.length) return <Empty text="Todavía no hay videos de calentamiento." />
  return (
    <>
      <h1>Calentamiento</h1>
      {WARMUPS.map(([title, url]) => {
        const id = youtubeId(url)
        return (
          <article key={url} className="card video">
            <h3>{title}</h3>
            {id
              ? <iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title={title} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
              : <a className="btn tinted" href={url} target="_blank" rel="noopener noreferrer"><Icon name="play" size={18} />Ver video</a>}
          </article>
        )
      })}
    </>
  )
}

// Cuenta contra una hora de fin, no con ticks: no se desfasa si el navegador frena la pestaña
function RestTimer({ timer, onChange }) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id) }, [])
  useEffect(() => { // pantalla encendida mientras descansas (si el navegador lo permite)
    let lock, gone = false
    navigator.wakeLock?.request('screen').then((l) => (gone ? l.release() : (lock = l)), () => {})
    return () => { gone = true; lock?.release() }
  }, [])
  const left = Math.max(0, Math.ceil((timer.end - now) / 1000))
  const done = left === 0
  useEffect(() => {
    if (!done) return
    beep(); haptic([300, 150, 300]) // sonido, vibración y color cambian en el mismo instante
    const t = setTimeout(() => onChange(null), 6000)
    return () => clearTimeout(t)
  }, [done, onChange])
  const shift = (s) => onChange({ end: Math.max(timer.end, Date.now()) + s * 1000, total: done ? s : timer.total })

  return (
    <div className={`rest-timer ${done ? 'done' : ''}`} role="timer" aria-live={done ? 'assertive' : 'off'}>
      <i style={{ transform: `scaleX(${Math.min(1, left / timer.total)})` }} />
      <span className="rest-label">{done ? '¡Siguiente serie!' : 'Descanso'}</span>
      <b>{clock(left)}</b>
      <button disabled={done} onClick={() => onChange({ ...timer, end: timer.end - 15000 })} aria-label="Quitar 15 segundos">−15</button>
      <button onClick={() => shift(15)} aria-label="Añadir 15 segundos">+15</button>
      <button onClick={() => onChange(null)} aria-label="Cerrar temporizador"><Icon name="x" size={18} /></button>
    </div>
  )
}

function Train({ user, sets, plan, isDefault, onAdd, onDelete, onSavePlan, onNotify, onGoPlan }) {
  const N = plan.days.length
  const last = sets.toSorted((a, b) => b.date.localeCompare(a.date) || b.createdAt?.localeCompare(a.createdAt))[0]
  const [date, setDate] = useState(today())
  const [sel, setSel] = useState(() => {
    if (!last) return 1
    return last.date === today() ? last.day : (last.day % N) + 1 // sigue la rotación del plan
  })
  if (!N) return <Empty text="Tu plan todavía no tiene días." action={<button className="btn primary" onClick={onGoPlan}>Crear mi plan</button>} />

  const dayN = Math.min(sel, N)
  const day = plan.days[dayN - 1]
  const onDay = sets.filter((s) => s.date === date)
  const inPlan = (n) => day.ex.some((e) => e[0] === n)
  const loggedExtra = [...new Set(onDay.filter((s) => s.day === dayN).map((s) => s.exercise))].filter((n) => !inPlan(n))
  const exList = [...day.ex, ...loggedExtra.map((n) => [n, 3, '', ''])]
  const done = day.ex.filter(([n, series]) => onDay.filter((s) => s.exercise === n).length >= series).length
  const allEx = [...new Set([...plan.days.flatMap((d) => d.ex.map((e) => e[0])), ...EXTRA, ...sets.map((s) => s.exercise)])]
  // Añadir o quitar ejercicios edita el plan del usuario
  const editDay = (fn) => onSavePlan(planToText({ ...plan, days: plan.days.map((d, i) => (i === dayN - 1 ? { ...d, ex: fn(d.ex) } : d)) }))
  const past = date !== today()

  return (
    <>
      {isDefault && (
        <div className="card ai-tip">
          <span><Icon name="sparkle" /></span>
          <p><b>Estás usando el plan de ejemplo.</b> Pídele a una IA un plan hecho para ti y pégalo en la app.</p>
          <button className="btn tinted sm" onClick={onGoPlan}>Crear mi plan</button>
        </div>
      )}

      <div className="hello">
        <div>
          <p className="eyebrow">Hola, {user.name.split(' ')[0]}</p>
          <h1>Día {dayN} · {day.title}</h1>
          {day.sub && <p className="muted">{day.sub}</p>}
        </div>
        <label className="date"><span className="sr-only">Fecha del entrenamiento</span>
          <Icon name="calendar" size={18} />
          <input type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
      </div>

      {past && (
        <div className="banner" role="status">
          <span>Registrando el <b>{fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</b></span>
          <button className="btn tinted sm" onClick={() => setDate(today())}>Volver a hoy</button>
        </div>
      )}

      <div className="days" style={{ '--n': Math.min(N, 7) }}>
        {plan.days.map((d, i) => (
          <button key={i} aria-pressed={i + 1 === dayN} onClick={() => setSel(i + 1)}>
            <b>{i + 1}</b><span>{d.title}</span>
          </button>
        ))}
      </div>

      {day.ex.length > 0 && (
        <div className="progressbar" role="progressbar" aria-valuemin={0} aria-valuemax={day.ex.length} aria-valuenow={done} aria-label="Ejercicios completos">
          <div className="progress-track"><i style={{ transform: `scaleX(${done / day.ex.length})` }} /></div>
          <span>{done === day.ex.length ? '¡Día completo!' : `${done} de ${day.ex.length} ejercicios`}</span>
        </div>
      )}

      {(day.goal || day.warmup) && (
        <details className="card info">
          <summary><Icon name="target" size={18} />Objetivo y calentamiento</summary>
          {day.goal && <p>{day.goal}</p>}
          {day.warmup && <p><b>Calentamiento:</b> {day.warmup}</p>}
        </details>
      )}

      <div className="ex-list">
        {exList.map(([name, series, reps, rest]) => (
          <ExerciseCard
            key={name} name={name} series={series} reps={reps} rest={rest}
            todays={onDay.filter((s) => s.exercise === name).sort((a, b) => a.serie - b.serie)}
            history={sets.filter((s) => s.exercise === name && s.date < date)}
            onAdd={(s) => onAdd({ ...s, date, day: dayN, exercise: name }, restSeconds(rest))}
            onDelete={onDelete}
          />
        ))}
      </div>

      <form className="card add-ex" onSubmit={async (e) => {
        e.preventDefault()
        const form = e.currentTarget
        const f = Object.fromEntries(new FormData(form))
        const n = f.ex.trim()
        if (inPlan(n)) return onNotify(`${n} ya está en el Día ${dayN}.`, { tone: 'error' })
        if (await editDay((ex) => [...ex, [n, +f.series, f.reps.trim() || '8–12', '']])) { form.reset(); onNotify(`${n} añadido al Día ${dayN}`) }
      }}>
        <b>Añadir ejercicio al Día {dayN}</b>
        <input name="ex" list="all-ex" placeholder="Nombre del ejercicio" required maxLength={80} aria-label="Nombre del ejercicio" />
        <datalist id="all-ex">{allEx.map((n) => <option key={n} value={n} />)}</datalist>
        <div className="add-row">
          <label>series<input name="series" type="number" inputMode="numeric" min="1" max="10" defaultValue="3" required /></label>
          <label>reps<input name="reps" placeholder="8–12" maxLength={20} /></label>
          <button className="btn tinted">Añadir</button>
        </div>
      </form>

      {day.cardio && <div className="card cardio"><b><Icon name="warmup" size={18} />Cardio final</b><p>{day.cardio}</p></div>}
    </>
  )
}

// Campo numérico con − / + grandes: entre series, con una mano y sin abrir el teclado
function Stepper({ name, label, inc = 1, ...props }) {
  const ref = useRef()
  const bump = (d) => { ref.current[d > 0 ? 'stepUp' : 'stepDown'](inc); haptic(5) }
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="stepper">
        <button type="button" tabIndex={-1} onClick={() => bump(-1)} aria-label={`Restar ${label}`}><Icon name="minus" size={18} /></button>
        <input ref={ref} name={name} type="number" aria-label={label} {...props} />
        <button type="button" tabIndex={-1} onClick={() => bump(1)} aria-label={`Sumar ${label}`}><Icon name="plus" size={18} /></button>
      </div>
    </div>
  )
}

function ExerciseCard({ name, series, reps, rest, todays, history, onAdd, onDelete }) {
  const prev = byDate(history)[0]?.[1].sort((a, b) => a.serie - b.serie)
  const top = Math.max(...(reps.match(/\d+/g) ?? [0]).map(Number))
  // Progresión del plan: si completaste todas las series en el tope del rango, toca subir peso.
  const levelUp = prev && top > 0 && prev.length >= series && prev.every((s) => s.reps >= top)
  const ref = todays.at(-1) ?? prev?.at(-1)
  const complete = todays.length >= series
  const [extra, setExtra] = useState(false)
  const [busy, setBusy] = useState(false) // evita series duplicadas por doble toque

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    const f = Object.fromEntries(new FormData(e.currentTarget))
    setBusy(true)
    await onAdd({ serie: todays.length + 1, weight: +f.weight, reps: +f.reps, feel: f.feel, notes: f.notes.trim() })
    setBusy(false)
  }

  return (
    <article className={`card ex ${complete ? 'complete' : ''}`}>
      <header>
        <div>
          <h3>{name}</h3>
          {reps && <p className="target">{series} × {reps}{rest && <span> · descanso {rest}</span>}</p>}
        </div>
        <span className="count" aria-label={complete ? 'Completado' : `${todays.length} de ${series} series`}>
          {complete ? <Icon name="check" size={16} /> : `${todays.length}/${series}`}
        </span>
      </header>

      {prev && <p className="prev">Última vez: {prev.map((s) => `${+s.weight}×${s.reps}`).join(' · ')}</p>}
      {levelUp && <p className="hint"><Icon name="up" size={16} />Completaste el rango la última vez. Sube un 2–5 % el peso.</p>}

      {todays.length > 0 && (
        <ul className="chips">
          {todays.map((s) => (
            <li key={s.id} className={`feel-${FEELS.indexOf(s.feel)}`} title={s.notes || s.feel}>
              <small>S{s.serie}</small> {+s.weight}×{s.reps}
              <button aria-label={`Borrar serie ${s.serie} de ${name}`} onClick={() => onDelete(s.id)}><Icon name="x" size={14} /></button>
            </li>
          ))}
        </ul>
      )}

      {complete && !extra
        ? <button className="link more" onClick={() => setExtra(true)}><Icon name="plus" size={16} />Serie extra</button>
        : (
          <form className="set-form" onSubmit={submit} key={todays.length}>
            <Stepper name="weight" label="kg" inputMode="decimal" step="0.5" inc={5} min="0" required defaultValue={ref?.weight ?? ''} />
            <Stepper name="reps" label="reps" inputMode="numeric" step="1" min="1" required defaultValue={ref?.reps ?? ''} />
            <fieldset className="feel">
              <legend className="sr-only">Sensación</legend>
              {FEELS.map((f, i) => (
                <label key={f} className={`feel-${i}`}>
                  <input type="radio" name="feel" value={f} defaultChecked={(ref?.feel ?? 'Moderado') === f} />
                  <span>{f}</span>
                </label>
              ))}
            </fieldset>
            <input name="notes" className="notes" placeholder="Notas (opcional)" maxLength={200} aria-label="Notas" />
            <button className="btn primary" disabled={busy} aria-label={`Guardar serie ${todays.length + 1} de ${name}`}>
              {busy ? <span className="spinner" /> : <><Icon name="plus" size={18} />Serie {todays.length + 1}</>}
            </button>
          </form>
        )}
    </article>
  )
}

function History({ sets, days: planDays, onDelete }) {
  const days = byDate(sets)
  if (!days.length) return <Empty icon="history" text="Aún no hay sesiones. Ve a Entrenar y apunta tu primera serie." />
  return (
    <>
      <h1>Historial</h1>
      {days.map(([date, ds]) => (
        <details key={date} className="card session" open={date === days[0][0]}>
          <summary>
            <div><b>{fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</b><span className="muted">Día {ds[0].day} · {planDays[ds[0].day - 1]?.title}</span></div>
            <div className="right"><b>{Math.round(vol(ds)).toLocaleString('es')} kg</b><span className="muted">{plural(ds.length, 'serie', 'series')}</span></div>
          </summary>
          {Object.entries(Object.groupBy(ds, (s) => s.exercise)).map(([ex, xs]) => (
            <div key={ex} className="session-ex">
              <span>{ex}</span>
              <ul className="chips">
                {xs.sort((a, b) => a.serie - b.serie).map((s) => (
                  <li key={s.id} className={`feel-${FEELS.indexOf(s.feel)}`} title={[s.feel, s.notes].filter(Boolean).join(' · ')}>
                    {+s.weight}×{s.reps}
                    <button aria-label={`Borrar ${ex} ${+s.weight}×${s.reps}`} onClick={() => onDelete(s.id)}><Icon name="x" size={14} /></button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </details>
      ))}
    </>
  )
}

function Progress({ sets, days }) {
  const exercises = useMemo(() => byDate(sets).flatMap(([, ds]) => ds.map((s) => s.exercise)).filter((v, i, a) => a.indexOf(v) === i), [sets])
  const [ex, setEx] = useState(exercises[0])
  if (!sets.length) return <Empty icon="progress" text="Cuando registres series verás aquí tus récords y tu evolución." />

  const weekAgo = new Date(Date.now() - 6 * 864e5).toLocaleDateString('en-CA')
  const week = sets.filter((s) => s.date >= weekAgo)
  const sessions = new Set(sets.map((s) => s.date)).size
  const cur = exercises.includes(ex) ? ex : exercises[0] // por si borraste la última serie de ese ejercicio
  const xs = sets.filter((s) => s.exercise === cur)
  const points = byDate(xs).reverse().map(([date, ds]) => ({ date, value: Math.max(...ds.map((s) => +s.weight)), vol: vol(ds) }))
  const pr = Math.max(...xs.map((s) => +s.weight))
  const diff = points.at(-1)?.value - points[0]?.value

  return (
    <>
      <h1>Progreso</h1>
      <div className="tiles">
        <Tile label="Sesiones totales" value={sessions} />
        <Tile label="Esta semana" value={`${new Set(week.map((s) => s.date)).size}/${days.length}`} />
        <Tile label="Volumen 7 días" value={`${Math.round(vol(week)).toLocaleString('es')} kg`} />
        <Tile label="Series registradas" value={sets.length} />
      </div>

      <section className="card">
        <label className="ex-select">Ejercicio
          <select value={cur} onChange={(e) => setEx(e.target.value)}>{exercises.map((n) => <option key={n}>{n}</option>)}</select>
        </label>
        <div className="tiles small">
          <Tile label="Récord" value={kg(pr)} accent />
          <Tile label="Desde el inicio" value={`${diff >= 0 ? '+' : ''}${kg(diff)}`} />
          <Tile label="Mejor volumen" value={`${Math.round(Math.max(...points.map((p) => p.vol))).toLocaleString('es')} kg`} />
        </div>
        <h3 className="chart-title">Peso máximo por sesión (kg)</h3>
        <LineChart points={points} />
      </section>
    </>
  )
}

const Tile = ({ label, value, accent }) => <div className={`tile ${accent ? 'accent' : ''}`}><span>{label}</span><b>{value}</b></div>
const Empty = ({ icon = 'train', text, action }) => <div className="empty card"><span><Icon name={icon} size={28} /></span><p>{text}</p>{action}</div>

// Ratón, dedo o teclado: el punto más cercano al puntero se resalta mientras te mueves, no solo al tocar un punto
function LineChart({ points }) {
  const [hover, setHover] = useState(null)
  const box = useRef(null)
  const [W, setW] = useState(0)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [])
  const H = 270, L = 44, R = 16, T = 56, B = 30 // T deja sitio a la etiqueta sin tapar los puntos
  const vals = points.map((p) => p.value)
  let lo = Math.min(...vals), hi = Math.max(...vals)
  if (lo === hi) { lo -= 5; hi += 5 }
  const pad = (hi - lo) * 0.15; lo = Math.max(0, lo - pad); hi += pad
  const x = (i) => points.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (points.length - 1)
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)
  const ticks = [lo, (lo + hi) / 2, hi]
  const step = Math.ceil(points.length / Math.max(2, Math.floor(W / 90)))
  const h = hover != null && points[hover]
  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')

  const track = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    setHover(points.length === 1 ? 0 : Math.max(0, Math.min(points.length - 1, Math.round(((px - L) / (W - L - R)) * (points.length - 1)))))
  }
  const key = (e) => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    if (!d) return
    e.preventDefault()
    setHover((i) => Math.max(0, Math.min(points.length - 1, (i ?? (d > 0 ? -1 : points.length)) + d)))
  }

  return (
    <div className="chart" ref={box}>
      {W > L + R && (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" tabIndex={0} aria-label="Evolución del peso máximo por sesión. Usa las flechas para recorrer los puntos."
          onPointerDown={track} onPointerMove={track} onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)} onKeyDown={key} onBlur={() => setHover(null)}>
          <defs>
            <linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--tint-fg)" stopOpacity=".22" /><stop offset="1" stopColor="var(--tint-fg)" stopOpacity="0" /></linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}><line className="grid" x1={L} x2={W - R} y1={y(t)} y2={y(t)} /><text className="axis" x={L - 8} y={y(t) + 4} textAnchor="end">{Math.round(t)}</text></g>
          ))}
          {points.map((p, i) => i % step === 0 && <text key={p.date} className="axis" x={x(i)} y={H - 8} textAnchor="middle">{fmtDate(p.date, { day: 'numeric', month: 'short' })}</text>)}
          {points.length > 1 && <polygon className="area" points={`${x(0)},${H - B} ${line} ${x(points.length - 1)},${H - B}`} />}
          {h && <line className="cross" x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} />}
          <polyline className="line" points={line} />
          {points.map((p, i) => <circle key={p.date} className="dot" cx={x(i)} cy={y(p.value)} r={hover === i ? 6 : 4} />)}
        </svg>
      )}
      {h && (
        <div className="tip" style={{ left: `${Math.min(85, Math.max(15, (x(hover) / W) * 100))}%` }} aria-live="polite">
          <b>{kg(h.value)}</b><span>{fmtDate(h.date)} · vol. {Math.round(h.vol).toLocaleString('es')} kg</span>
        </div>
      )}
    </div>
  )
}

function AiTip() {
  const [copied, setCopied] = useState(false)
  const copy = () => navigator.clipboard.writeText(AI_PROMPT).then(() => { setCopied(true); haptic(); setTimeout(() => setCopied(false), 2500) })
  return (
    <section className="card ai-tip big">
      <span><Icon name="sparkle" /></span>
      <div>
        <b>Sugerencia: deja que una IA escriba tu plan</b>
        <p>Copia este prompt, cambia lo que va entre corchetes por tus datos y pégalo en ChatGPT, Claude o Gemini. Después pega aquí la respuesta y la app organiza los días, los ejercicios y la guía.</p>
        <div className="row">
          <button className="btn primary sm" onClick={copy}><Icon name={copied ? 'check' : 'copy'} size={16} />{copied ? 'Copiado' : 'Copiar prompt'}</button>
          <details><summary>Ver prompt</summary><pre>{AI_PROMPT}</pre></details>
        </div>
      </div>
    </section>
  )
}

function Plan({ plan, text, onSave, onNotify }) {
  const [draft, setDraft] = useState(null) // null = viendo el plan, string = editando
  const [saving, setSaving] = useState(false)
  const preview = useMemo(() => draft != null && parsePlan(draft), [draft])

  if (draft != null) {
    const nEx = preview.days.reduce((a, d) => a + d.ex.length, 0)
    const invalid = !preview.days.length || preview.days.length > MAX_DAYS
    const save = async () => {
      setSaving(true)
      if (await onSave(draft.trim())) { setDraft(null); onNotify('Plan guardado') }
      setSaving(false)
    }
    // Sin diálogos de "¿seguro?": la acción se hace y se puede deshacer
    const cancel = () => {
      const lost = draft
      setDraft(null)
      if (lost !== text) onNotify('Cambios descartados', { action: ['Deshacer', () => setDraft(lost)] })
    }
    const useExample = () => {
      const before = draft
      setDraft(DEFAULT_PLAN)
      onNotify('Texto reemplazado por el plan de ejemplo', { action: ['Deshacer', () => setDraft(before)] })
    }
    return (
      <>
        <h1>Editar plan</h1>
        <AiTip />
        <textarea className="plan-text" value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false} rows={18}
          placeholder={'Pega aquí tu plan. Ejemplo:\n\n# Día 1: Pecho y tríceps\n- Press de banca: 4 x 6–8, descanso 90 s'} aria-label="Plan en texto" />
        <div className="card preview" aria-live="polite">
          <b>Así lo entiende la app</b>
          {preview.days.length === 0
            ? <p className="msg error">No encuentro ningún día. Empieza cada día con una línea como <code># Día 1: Pierna</code>.</p>
            : <>
              {preview.days.length > MAX_DAYS && <p className="msg error">El plan puede tener como máximo {MAX_DAYS} días.</p>}
              <p className="muted">{plural(preview.days.length, 'día', 'días')} · {plural(nEx, 'ejercicio', 'ejercicios')} · {plural(preview.guide.length, 'sección', 'secciones')} de guía</p>
              <ul>
                {preview.days.map((d, i) => (
                  <li key={i}>Día {i + 1} · {d.title}: {d.ex.length ? plural(d.ex.length, 'ejercicio', 'ejercicios') : <span className="warn">sin ejercicios (escribe "- Ejercicio: 3 x 10")</span>}</li>
                ))}
              </ul>
            </>}
        </div>
        <details className="card">
          <summary>Formato del texto</summary>
          <pre>{`Resumen del plan (opcional)

# Día 1: Tren superior (Empuje)
Objetivo: fuerza en pecho y hombro
Calentamiento: movilidad de hombros
- Press de banca: 4 x 6–8, descanso 90 s
- Curl martillo: 3 x 10
Cardio: 5 min de comba

# Consejos
- Dormir 7–9 h`}</pre>
          <p className="muted">La app ignora las líneas que no siguen el formato. También puedes pegar el texto de tu plan de Notion.</p>
        </details>
        <div className="actions sticky-actions">
          <button className="btn primary" disabled={invalid || saving} onClick={save}>{saving ? <span className="spinner" /> : 'Guardar plan'}</button>
          <button className="btn tinted" onClick={cancel}>Cancelar</button>
          <button className="link" onClick={useExample}>Usar el plan de ejemplo</button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="hello">
        <div>
          <h1>Tu plan</h1>
          {plan.intro && <p className="muted">{plan.intro}</p>}
        </div>
        <button className="btn primary" onClick={() => setDraft(text)}><Icon name="edit" size={18} />Editar en texto</button>
      </div>
      <AiTip />
      <div className="plan-days">
        {plan.days.map((d, i) => (
          <details key={i} className="card">
            <summary><b className="badge">{i + 1}</b><div><strong>{d.title}</strong>{d.sub && <span className="muted">{d.sub}</span>}</div></summary>
            {d.goal && <p>{d.goal}</p>}
            <ol>{d.ex.map(([n, s, r, rest]) => <li key={n}><b>{n}</b> <span className="muted">{s} × {r}{rest && ` · ${rest}`}</span></li>)}</ol>
            {(d.warmup || d.cardio) && <p className="muted">{d.warmup && <><b>Calentamiento:</b> {d.warmup}<br /></>}{d.cardio && <><b>Cardio:</b> {d.cardio}</>}</p>}
          </details>
        ))}
      </div>
      {plan.guide.length > 0 && <h2>Guía</h2>}
      {plan.guide.map(([title, items]) => (
        <details key={title} className="card">
          <summary>{title}</summary>
          <ul>{items.map((t) => <li key={t}>{t}</li>)}</ul>
        </details>
      ))}
    </>
  )
}
