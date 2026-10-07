import { useEffect, useMemo, useRef, useState } from 'react'
import { api, getToken, setToken } from './api'
import { AI_PROMPT, DEFAULT_PLAN, EXTRA, FEELS, parsePlan, planToText } from './plan'

const today = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD en hora local
const fmtDate = (d, o = { weekday: 'short', day: 'numeric', month: 'short' }) => new Date(d + 'T00:00').toLocaleDateString('es', o)
const kg = (n) => `${+(+n).toFixed(1)} kg`
const vol = (sets) => sets.reduce((a, s) => a + s.weight * s.reps, 0)
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const byDate =(sets) => Object.entries(Object.groupBy(sets, (s) => s.date)).sort(([a], [b]) => b.localeCompare(a))

export default function App() {
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(!!getToken())

  useEffect(() => {
    if (getToken()) api.me().then(setUser).catch(() => setToken(null)).finally(() => setBooting(false))
  }, [])

  const login = ({ token, user }) => { setToken(token); setUser(user) }
  const logout = () => { setToken(null); setUser(null) }

  if (booting) return <div className="boot"><Logo /></div>
  return user ? <Dashboard user={user} onLogout={logout} /> : <Landing onAuth={login} />
}

const Logo = () => (
  <span className="logo"><span className="logo-mark">▲</span>PROGRESS<b>FIT</b></span>
)

/* ───────────────────────── Sin sesión ───────────────────────── */

function Landing({ onAuth }) {
  return (
    <div className="landing">
      <div className="blobs" aria-hidden><i /><i /><i /></div>
      <header className="landing-top"><Logo /></header>
      <main className="landing-grid">
        <section className="hero">
          <span className="pill">● Tu plan, tus series, tu progreso</span>
          <h1>Cada serie cuenta.<br /><span className="grad">Mídela.</span></h1>
          <p className="lead">Apunta peso, repeticiones y cómo te sentiste en cada serie. La app te muestra cuándo toca subir peso y cuánto has avanzado.</p>
          <ul className="features">
            <li><b>🏋️</b><div><strong>Registro rápido</strong><span>Pensado para usarlo entre series, con una mano.</span></div></li>
            <li><b>📈</b><div><strong>Sobrecarga progresiva</strong><span>Te avisa cuando completas el rango y toca subir.</span></div></li>
            <li><b>🏆</b><div><strong>Récords e historial</strong><span>Tus PR y tu volumen semana a semana.</span></div></li>
            <li><b>✨</b><div><strong>Tu plan, a tu medida</strong><span>Pide tu rutina a una IA, pega el texto y la app se organiza sola.</span></div></li>
          </ul>
          <div className="mock" aria-hidden>
            <div className="mock-head"><span>Press de banca</span><em>PR 72,5 kg</em></div>
            <svg viewBox="0 0 200 50"><polyline points="0,44 30,40 60,36 90,37 120,28 150,22 180,14 200,8" /></svg>
            <div className="mock-sets"><span>70×8</span><span>70×8</span><span>72,5×6</span><span className="new">+ serie</span></div>
          </div>
        </section>
        <AuthCard onAuth={onAuth} />
      </main>
    </div>
  )
}

function AuthCard({ onAuth }) {
  const resetToken = new URLSearchParams(location.search).get('reset')
  const [mode, setMode] = useState(resetToken ? 'reset' : 'login')
  const [msg, setMsg] = useState(null) // { type: 'error' | 'ok', text, link? }
  const [busy, setBusy] = useState(false)

  const go = (m) => { setMode(m); setMsg(null) }

  async function submit(e) {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.currentTarget))
    const email = f.email?.trim().toLowerCase()
    if (f.confirm !== undefined && f.confirm !== f.password) return setMsg({ type: 'error', text: 'Las contraseñas no coinciden.' })
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
  const pw = (name, label, ac) => (
    <label>{label}<input name={name} type="password" required minLength={8} autoComplete={ac} placeholder="Mínimo 8 caracteres" /></label>
  )

  return (
    <section className="auth card">
      {(mode === 'login' || mode === 'register') && (
        <div className="seg" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => go('login')}>Iniciar sesión</button>
          <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => go('register')}>Registrarse</button>
        </div>
      )}
      <h2>{titles[mode][0]}</h2>
      <p className="muted">{titles[mode][1]}</p>

      <form onSubmit={submit} key={mode}>
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

        <button className="btn primary block" disabled={busy}>
          {busy ? 'Un momento…' : { login: 'Entrar', register: 'Crear cuenta', forgot: 'Enviar enlace', reset: 'Guardar contraseña' }[mode]}
        </button>
      </form>
      {(mode === 'forgot' || mode === 'reset') && <button className="link center" onClick={() => go('login')}>← Volver a iniciar sesión</button>}
    </section>
  )
}

/* ───────────────────────── Con sesión ───────────────────────── */

const TABS = [['train', '🏋️', 'Entrenar'], ['history', '🗓️', 'Historial'], ['progress', '📈', 'Progreso'], ['plan', '📋', 'Plan']]

function Dashboard({ user, onLogout }) {
  const [tab, setTab] = useState('train')
  const [sets, setSets] = useState(null)
  const [planText, setPlanText] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([api.listSets(), api.getPlan()])
      .then(([s, p]) => { setSets(s); setPlanText(p?.text || DEFAULT_PLAN) })
      .catch((e) => setError(e.message))
  }, [])
  const plan = useMemo(() => planText && parsePlan(planText), [planText])

  const run = async (fn) => { setError(null); try { await fn(); return true } catch (e) { setError(e.message); return false } }
  const add = (s) => run(async () => { const row = await api.addSet(s); setSets((p) => [...p, row]) })
  const del = (id) => run(async () => { await api.deleteSet(id); setSets((p) => p.filter((s) => s.id !== id)) })
  const savePlan = (text) => run(async () => { await api.savePlan(text); setPlanText(text) })

  return (
    <div className="app">
      <header className="topbar">
        <Logo />
        <nav className="tabs">
          {TABS.map(([k, ic, label]) => (
            <button key={k} aria-current={tab === k} onClick={() => setTab(k)}><span>{ic}</span>{label}</button>
          ))}
        </nav>
        <div className="who">
          <span className="avatar">{user.name?.[0]?.toUpperCase()}</span>
          <button className="btn ghost sm" onClick={onLogout}>Salir</button>
        </div>
      </header>
      <main className="content">
        {error && <p className="msg error" role="alert">{error}</p>}
        {!plan ? <p className="muted center">{error ? '' : 'Cargando…'}</p> : <>
          {tab === 'train' && <Train user={user} sets={sets} plan={plan} isDefault={planText === DEFAULT_PLAN} onAdd={add} onDelete={del} onSavePlan={savePlan} onGoPlan={() => setTab('plan')} />}
          {tab === 'history' && <History sets={sets} days={plan.days} onDelete={del} />}
          {tab === 'progress' && <Progress sets={sets} days={plan.days} />}
          {tab === 'plan' && <Plan plan={plan} text={planText} onSave={savePlan} />}
        </>}
      </main>
    </div>
  )
}

function Train({ user, sets, plan, isDefault, onAdd, onDelete, onSavePlan, onGoPlan }) {
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

  return (
    <>
      {isDefault && (
        <div className="card ai-tip">
          <span>✨</span>
          <p><b>Estás usando el plan de ejemplo.</b> Pídele a una IA un plan hecho para ti y pégalo en la app.</p>
          <button className="btn ghost sm" onClick={onGoPlan}>Crear mi plan</button>
        </div>
      )}

      <div className="hello">
        <div>
          <p className="muted">Hola, {user.name.split(' ')[0]} 👋</p>
          <h1>Día {dayN} · {day.title}</h1>
          {day.sub && <p className="muted">{day.sub}</p>}
        </div>
        <label className="date">Fecha<input type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
      </div>

      <div className="days" role="tablist" style={{ '--n': Math.min(N, 7) }}>
        {plan.days.map((d, i) => (
          <button key={i} role="tab" aria-selected={i + 1 === dayN} onClick={() => setSel(i + 1)}>
            <b>{i + 1}</b><span>{d.title}</span>
          </button>
        ))}
      </div>

      {day.ex.length > 0 && (
        <div className="progressbar" aria-label={`${done} de ${day.ex.length} ejercicios completos`}>
          <i style={{ width: `${(done / day.ex.length) * 100}%` }} />
          <span>{done}/{day.ex.length} ejercicios</span>
        </div>
      )}

      {(day.goal || day.warmup) && (
        <details className="card info">
          <summary>🎯 Objetivo y calentamiento</summary>
          {day.goal && <p>{day.goal}</p>}
          {day.warmup && <p><b>Calentamiento:</b> {day.warmup}</p>}
        </details>
      )}

      <div className="ex-list">
        {exList.map(([name, series, reps, rest]) => (
          <ExerciseCard
            key={name} name={name} series={series} reps={reps} rest={rest} date={date}
            todays={onDay.filter((s) => s.exercise === name).sort((a, b) => a.serie - b.serie)}
            history={sets.filter((s) => s.exercise === name && s.date < date)}
            onAdd={(s) => onAdd({ ...s, date, day: dayN, exercise: name })}
            onDelete={onDelete}
            onRemove={inPlan(name) && (() => confirm(`¿Quitar "${name}" del Día ${dayN}? Las series que ya registraste se conservan.`) && editDay((ex) => ex.filter((e) => e[0] !== name)))}
          />
        ))}
      </div>

      <form className="card add-ex" onSubmit={async (e) => {
        e.preventDefault()
        const form = e.currentTarget
        const f = Object.fromEntries(new FormData(form))
        const n = f.ex.trim()
        if (!inPlan(n) && await editDay((ex) => [...ex, [n, +f.series, f.reps.trim() || '8–12', '']])) form.reset()
      }}>
        <b>Añadir ejercicio al Día {dayN}</b>
        <input name="ex" list="all-ex" placeholder="Nombre del ejercicio" required maxLength={80} />
        <datalist id="all-ex">{allEx.map((n) => <option key={n} value={n} />)}</datalist>
        <div className="add-row">
          <label>series<input name="series" type="number" inputMode="numeric" min="1" max="10" defaultValue="3" required /></label>
          <label>reps<input name="reps" placeholder="8–12" maxLength={20} /></label>
          <button className="btn ghost">Añadir</button>
        </div>
      </form>

      {day.cardio && <div className="card cardio"><b>🔥 Cardio final</b><p>{day.cardio}</p></div>}
    </>
  )
}

function ExerciseCard({ name, series, reps, rest, todays, history, onAdd, onDelete, onRemove }) {
  const prev = byDate(history)[0]?.[1].sort((a, b) => a.serie - b.serie)
  const top = Math.max(...(reps.match(/\d+/g) ?? [0]).map(Number))
  // Progresión del plan: si completaste todas las series en el tope del rango, toca subir peso.
  const levelUp = prev && top > 0 && prev.length >= series && prev.every((s) => s.reps >= top)
  const ref = todays.at(-1) ?? prev?.at(-1)
  const complete = todays.length >= series

  function submit(e) {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.currentTarget))
    onAdd({ serie: todays.length + 1, weight: +f.weight, reps: +f.reps, feel: f.feel, notes: f.notes.trim() })
  }

  return (
    <article className={`card ex ${complete ? 'complete' : ''}`}>
      <header>
        <div>
          <h3>{name}</h3>
          {reps && <p className="target">{series} × {reps}{rest && <> · <span>⏱ {rest}</span></>}</p>}
        </div>
        <div className="ex-actions">
          <span className="count">{complete ? '✓' : `${todays.length}/${series}`}</span>
          {onRemove && <button className="icon-btn" onClick={onRemove} aria-label={`Quitar ${name} del plan`} title="Quitar del plan">🗑</button>}
        </div>
      </header>

      {prev && <p className="prev">Última vez: {prev.map((s) => `${+s.weight}×${s.reps}`).join(' · ')}</p>}
      {levelUp && <p className="hint">💡 Completaste el rango la última vez. Sube un 2–5 % el peso.</p>}

      {todays.length > 0 && (
        <ul className="chips">
          {todays.map((s) => (
            <li key={s.id} className={`feel-${FEELS.indexOf(s.feel)}`} title={s.notes || s.feel}>
              <small>S{s.serie}</small> {+s.weight}×{s.reps}
              <button aria-label={`Borrar serie ${s.serie}`} onClick={() => onDelete(s.id)}>×</button>
            </li>
          ))}
        </ul>
      )}

      <form className="set-form" onSubmit={submit} key={todays.length}>
        <label>kg<input name="weight" type="number" inputMode="decimal" step="0.5" min="0" required defaultValue={ref?.weight ?? ''} /></label>
        <label>reps<input name="reps" type="number" inputMode="numeric" min="1" required defaultValue={ref?.reps ?? ''} /></label>
        <label>sensación
          <select name="feel" defaultValue={ref?.feel ?? 'Moderado'}>{FEELS.map((f) => <option key={f}>{f}</option>)}</select>
        </label>
        <button className="btn primary" aria-label={`Guardar serie de ${name}`}>+ Serie</button>
        <input name="notes" className="notes" placeholder="Notas (opcional)" maxLength={200} />
      </form>
    </article>
  )
}

function History({ sets, days: planDays, onDelete }) {
  const days = byDate(sets)
  if (!days.length) return <Empty text="Aún no hay sesiones. Ve a Entrenar y apunta tu primera serie." />
  return (
    <>
      <h1>Historial</h1>
      {days.map(([date, ds]) => (
        <details key={date} className="card session" open={date === days[0][0]}>
          <summary>
            <div><b>{fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</b><span className="muted">Día {ds[0].day} · {planDays[ds[0].day - 1]?.title}</span></div>
            <div className="right"><b>{Math.round(vol(ds)).toLocaleString('es')} kg</b><span className="muted">{ds.length} series</span></div>
          </summary>
          {Object.entries(Object.groupBy(ds, (s) => s.exercise)).map(([ex, xs]) => (
            <div key={ex} className="session-ex">
              <span>{ex}</span>
              <ul className="chips">
                {xs.sort((a, b) => a.serie - b.serie).map((s) => (
                  <li key={s.id} className={`feel-${FEELS.indexOf(s.feel)}`} title={[s.feel, s.notes].filter(Boolean).join(' · ')}>
                    {+s.weight}×{s.reps}
                    <button aria-label="Borrar serie" onClick={() => confirm('¿Borrar esta serie?') && onDelete(s.id)}>×</button>
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
  if (!sets.length) return <Empty text="Cuando registres series verás aquí tus récords y tu evolución." />

  const weekAgo = new Date(Date.now() - 6 * 864e5).toLocaleDateString('en-CA')
  const week = sets.filter((s) => s.date >= weekAgo)
  const sessions = new Set(sets.map((s) => s.date)).size
  const xs = sets.filter((s) => s.exercise === ex)
  const points = byDate(xs).reverse().map(([date, ds]) => ({ date, value: Math.max(...ds.map((s) => +s.weight)), vol: vol(ds) }))
  const pr = Math.max(...xs.map((s) => +s.weight))
  const diff = points.at(-1)?.value - points[0]?.value

  return (
    <>
      <h1>Progreso</h1>
      <div className="tiles">
        <Tile label="Sesiones totales" value={sessions} />
        <Tile label="Sesiones esta semana" value={`${new Set(week.map((s) => s.date)).size}/${days.length}`} />
        <Tile label="Volumen 7 días" value={`${Math.round(vol(week)).toLocaleString('es')} kg`} />
        <Tile label="Series registradas" value={sets.length} />
      </div>

      <section className="card">
        <label className="ex-select">Ejercicio
          <select value={ex} onChange={(e) => setEx(e.target.value)}>{exercises.map((n) => <option key={n}>{n}</option>)}</select>
        </label>
        <div className="tiles small">
          <Tile label="🏆 Récord" value={kg(pr)} />
          <Tile label="Desde el inicio" value={`${diff >= 0 ? '+' : ''}${kg(diff)}`} />
          <Tile label="Mejor volumen" value={`${Math.round(Math.max(...points.map((p) => p.vol))).toLocaleString('es')} kg`} />
        </div>
        <h3 className="chart-title">Peso máximo por sesión (kg)</h3>
        <LineChart points={points} />
      </section>
    </>
  )
}

const Tile = ({ label, value }) => <div className="tile"><span>{label}</span><b>{value}</b></div>
const Empty = ({ text, action }) => <div className="empty card"><span>🏁</span><p>{text}</p>{action}</div>

function LineChart({ points }) {
  const [hover, setHover] = useState(null)
  const box = useRef(null)
  const [W, setW] = useState(0)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [])
  const H = 240, L = 44, R = 16, T = 16, B = 30
  const vals = points.map((p) => p.value)
  let lo = Math.min(...vals), hi = Math.max(...vals)
  if (lo === hi) { lo -= 5; hi += 5 }
  const pad = (hi - lo) * 0.15; lo = Math.max(0, lo - pad); hi += pad
  const x = (i) => points.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (points.length - 1)
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)
  const ticks = [lo, (lo + hi) / 2, hi]
  const step = Math.ceil(points.length / Math.max(2, Math.floor(W / 90)))
  const h = hover != null && points[hover]

  return (
    <div className="chart" ref={box}>
      {W > L + R && <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evolución del peso máximo por sesión" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}><line className="grid" x1={L} x2={W - R} y1={y(t)} y2={y(t)} /><text className="axis" x={L - 8} y={y(t) + 4} textAnchor="end">{Math.round(t)}</text></g>
        ))}
        {points.map((p, i) => i % step === 0 && <text key={p.date} className="axis" x={x(i)} y={H - 8} textAnchor="middle">{fmtDate(p.date, { day: 'numeric', month: 'short' })}</text>)}
        {h && <line className="cross" x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} />}
        <polyline className="line" points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')} />
        {points.map((p, i) => <circle key={p.date} className="dot" cx={x(i)} cy={y(p.value)} r={hover === i ? 6 : 4} />)}
        {points.map((p, i) => (
          <rect key={p.date} x={x(i) - (W - L - R) / Math.max(points.length - 1, 1) / 2} y={0} width={(W - L - R) / Math.max(points.length - 1, 1)} height={H}
            fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
        ))}
      </svg>}
      {h && (
        <div className="tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <b>{kg(h.value)}</b><span>{fmtDate(h.date)} · vol. {Math.round(h.vol).toLocaleString('es')} kg</span>
        </div>
      )}
    </div>
  )
}

function AiTip() {
  const [copied, setCopied] = useState(false)
  const copy = () => navigator.clipboard.writeText(AI_PROMPT).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) })
  return (
    <section className="card ai-tip big">
      <span>✨</span>
      <div>
        <b>Sugerencia: deja que una IA escriba tu plan</b>
        <p>Copia este prompt, cambia lo que va entre corchetes por tus datos y pégalo en ChatGPT, Claude o Gemini. Después pega aquí la respuesta y la app organiza los días, los ejercicios y la guía.</p>
        <div className="row">
          <button className="btn primary sm" onClick={copy}>{copied ? '✓ Copiado' : 'Copiar prompt'}</button>
          <details><summary>Ver prompt</summary><pre>{AI_PROMPT}</pre></details>
        </div>
      </div>
    </section>
  )
}

function Plan({ plan, text, onSave }) {
  const [draft, setDraft] = useState(null) // null = viendo el plan, string = editando
  const preview = useMemo(() => draft != null && parsePlan(draft), [draft])

  if (draft != null) {
    const nEx = preview.days.reduce((a, d) => a + d.ex.length, 0)
    return (
      <>
        <h1>Editar plan</h1>
        <AiTip />
        <textarea className="plan-text" value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false} rows={18}
          placeholder={'Pega aquí tu plan. Ejemplo:\n\n# Día 1: Pecho y tríceps\n- Press de banca: 4 x 6–8, descanso 90 s'} aria-label="Plan en texto" />
        <div className="card preview">
          <b>Así lo entiende la app</b>
          {preview.days.length === 0
            ? <p className="msg error">No encuentro ningún día. Empieza cada día con una línea como <code># Día 1: Pierna</code>.</p>
            : <>
              <p className="muted">{plural(preview.days.length, 'día', 'días')} · {plural(nEx, 'ejercicio', 'ejercicios')} · {plural(preview.guide.length, 'sección', 'secciones')} de guía</p>
              <ul>
                {preview.days.map((d, i) => (
                  <li key={i}>Día {i + 1} · {d.title}: {d.ex.length ? `${d.ex.length} ejercicios` : <span className="warn">sin ejercicios (escribe "- Ejercicio: 3 x 10")</span>}</li>
                ))}
              </ul>
            </>}
        </div>
        <details className="card">
          <summary>📝 Formato del texto</summary>
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
        <div className="actions">
          <button className="btn primary" disabled={!preview.days.length} onClick={async () => (await onSave(draft.trim())) && setDraft(null)}>Guardar plan</button>
          <button className="btn ghost" onClick={() => setDraft(null)}>Cancelar</button>
          <button className="link" onClick={() => confirm('¿Reemplazar el texto por el plan de ejemplo?') && setDraft(DEFAULT_PLAN)}>Usar el plan de ejemplo</button>
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
        <button className="btn primary" onClick={() => setDraft(text)}>✏️ Editar en texto</button>
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
