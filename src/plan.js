// Plan por defecto (ejemplo), tomado de la página de Notion "Plan semanal — Pérdida de grasa, ganancia de masa y mejora de energía".
// Cada usuario lo sustituye por su propio plan en texto (ver parsePlan más abajo).
// ex: [nombre, series, rango de reps, descanso]
export const DAYS = [
  {
    n: 1, title: 'Tren superior', sub: 'Empuje + tracción ligera',
    goal: 'Fuerza y volumen en pectoral, hombro y dorsal, mejorar postura.',
    warmup: 'Movilidad de hombros, escápulas, 2 min saltos suaves.',
    cardio: 'Saltos combinados: 6×20" saltos con cuerda o jumping jacks / 40" descanso activo.',
    ex: [
      ['Press de banca', 4, '6–8', '90–120 s'],
      ['Remo con mancuerna/barra', 4, '8–10', '90 s'],
      ['Press militar con mancuernas', 3, '8–10', '60–90 s'],
      ['Pull-ups asistidas / jalón', 3, '6–10', '60–90 s'],
      ['Face pulls / pájaros', 3, '12–15', '45–60 s'],
      ['Fondos en paralelas / banco', 3, '8–10', '60–90 s'],
      ['Curl de bíceps con barra', 3, '10', '60–90 s'],
    ],
  },
  {
    n: 2, title: 'Tren inferior', sub: 'Fuerza + glúteo / femoral',
    goal: 'Hipertrofia y fuerza en piernas, enfoque en glúteo y femoral.',
    warmup: 'Movilidad de cadera, 2 min saltos suaves.',
    cardio: '5–8 min saltos combinados: jumping jacks, saltos laterales, mini burpees.',
    ex: [
      ['Sentadilla trasera / frontal', 4, '6–8', '120 s'],
      ['Peso muerto rumano', 4, '8–10', '90–120 s'],
      ['Zancadas', 3, '10–12 por pierna', '60–90 s'],
      ['Hip thrust', 3, '8–12', '90 s'],
      ['Elevaciones de gemelo', 3, '12–15', '45–60 s'],
      ['Curl femoral', 3, '10–12', '60 s'],
    ],
  },
  {
    n: 3, title: 'Full body', sub: 'Hipertrofia y movilidad',
    goal: 'Bomba muscular general, trabajo de core y movilidad. Circuito de 3 rondas, 90–120 s entre rondas.',
    warmup: 'Movilidad global + 90 s saltos suaves.',
    cardio: 'EMOM 5 min: 30" saltos con cuerda / 30" recuperación activa.',
    ex: [
      ['Sentadilla goblet', 3, '10–12', 'circuito'],
      ['Remo con mancuerna 1 brazo', 3, '10 por brazo', 'circuito'],
      ['Press inclinado con mancuernas', 3, '10–12', 'circuito'],
      ['Peso muerto piernas rígidas', 3, '10–12', 'circuito'],
      ['Plancha', 3, '30–45 s', 'circuito'],
    ],
  },
  {
    n: 4, title: 'Tren superior', sub: 'Fuerza y accesorios',
    goal: 'Aumentar fuerza en movimientos principales y trabajo de accesorios.',
    warmup: 'Movilidad hombros, 2 min saltos suaves.',
    cardio: 'Saltos combinados: 8×20" jumping jacks / 40" descanso.',
    ex: [
      ['Press inclinado con mancuernas / barra', 4, '6–8', '90–120 s'],
      ['Dominadas / jalón', 4, '6–8', '90–120 s'],
      ['Remo invertido / máquina', 3, '8–10', '60–90 s'],
      ['Press de hombro arnold / elevaciones laterales', 3, '10 / 12–15', '45–60 s'],
      ['Curl bíceps', 3, '8–12', '45–60 s'],
      ['Extensiones tríceps', 3, '10–12', '45–60 s'],
      ['Curl Martillo', 3, '10', '45–60 s'],
      ['Extensión de tríceps en polea', 3, '12', '45–60 s'],
    ],
  },
  {
    n: 5, title: 'Tren inferior', sub: 'Potencia y acondicionamiento',
    goal: 'Potencia, explosividad y acondicionamiento.',
    warmup: 'Movilidad cadera + 2 min saltos suaves.',
    cardio: '10 min saltos combinados (jumping jacks, burpees suaves, saltos laterales) ajustando intensidad.',
    ex: [
      ['Peso muerto convencional', 4, '4–6', '120 s'],
      ['Sentadilla búlgara', 3, '8–10 por pierna', '60–90 s'],
      ['Kettlebell swing / hip hinge', 3, '12–15', '60 s'],
      ['Step-ups con peso', 3, '10 por pierna', '60–90 s'],
      ['Ab wheel / crunch con carga', 3, '12–15', '45–60 s'],
    ],
  },
]

// Ejercicios extra que estaban en la lista de Notion pero no en el plan
export const EXTRA = ['Curl de muñeca con mancuernas', 'Curl de muñeca (flexión)', 'Curl inverso (barra o EZ)', 'Remo con barra']

export const FEELS = ['Fácil', 'Moderado', 'Difícil', 'Al fallo']

export const GUIDE = [
  ['📋 Resumen rápido', [
    'Sesiones: 5 por semana (Día 1 a Día 5).',
    'Duración: máximo 60 minutos por sesión.',
    'Estructura: 5 min calentamiento → bloque principal (fuerza/hipertrofia + movilidad) → 5–10 min cardio final.',
    'Pasos diarios: 8.000–12.000 (base 10.000). Si estás empezando, +1.000 pasos/semana hasta llegar a 10.000.',
  ]],
  ['📈 Cómo usar la progresión', [
    'Sobrecarga progresiva: cada semana intenta añadir 1–5 repeticiones, subir 1 serie o aumentar 2–5% del peso cuando completes el rango superior con buena técnica.',
    'Registra pesos, repeticiones y sensaciones en cada sesión.',
  ]],
  ['🏋️ Estructura de cada sesión (máx. 60 min)', [
    'Calentamiento 5 min: 30 s jumping jacks, 30 s movilidad cadera, 30 s rotación hombros, 30 s sentadilla sin peso, 60–90 s saltos suaves.',
    'Bloque principal 40–50 min: compuestos primero (sentadilla, peso muerto, press, remos). Superseries o circuito moderado para ahorrar tiempo.',
    'Cardio 5–10 min: cuerda, jumping jacks, burpees suaves, saltos laterales. 20–30 s esfuerzo / 30–40 s recuperación.',
    'Estiramiento suave / respiración: opcional 2–3 min.',
  ]],
  ['🔧 Si sólo tienes mancuernas', [
    'Press de banca → press con mancuernas en el suelo o banco.',
    'Sentadilla → goblet o sentadilla con salto.',
    'Peso muerto → peso muerto rumano con mancuerna.',
    'Pulls/Remo → remo inclinado con mancuerna.',
    'Hip thrust → puente de glúteo con peso.',
  ]],
  ['🧘 Movilidad diaria (10 min)', [
    '2 min respiración diafragmática + foam rolling suave.',
    '2 min movilidad de cadera (círculos, apertura 90/90).',
    '2 min movilidad de hombro (band pull-aparts, brazos en cruz).',
    '2–3 min core activo (antirotación con banda, planchas laterales cortas).',
  ]],
  ['🚶 Pasos diarios', [
    'Meta: 8.000–12.000 pasos/día (ideal 10.000).',
    'Caminatas de 10–15 min después de comidas para energía y control glucémico.',
  ]],
  ['🍽️ Alimentación: división de plato', [
    '½ plato verduras y hortalizas · ¼ proteína magra · ¼ carbohidratos complejos y/o grasas saludables.',
    'Ejemplos: avena proteica con frutas y mantequilla de maní · pollo, arroz integral y ensalada · salmón, batata y verduras asadas.',
  ]],
  ['📏 Cómo medir el progreso', [
    '1 mes: cambios pequeños, fuerza y técnica.',
    '3 meses: +1–2 kg masa magra, -2–4 cm cintura.',
    '6 meses: +2–5 kg masa magra, -4–8 cm cintura.',
    'Datos medibles: peso, circunferencias, fotos, fuerza, pasos y energía.',
  ]],
  ['✅ Consejos finales', [
    'Paciencia y consistencia.',
    'Dormir 7–9 h, priorizar proteínas.',
    'Técnica primero, peso después.',
    'Revisar el plan cada 4 semanas y ajustar según progreso.',
  ]],
]

const INTRO = 'Pérdida de grasa, ganancia de masa y mejora de energía. 5 sesiones por semana, 60 min máximo cada una.'

/* ── Plan en texto ──
   # Día 1: Tren superior (Empuje + tracción ligera)
   Objetivo: ...
   Calentamiento: ...
   - Press de banca: 4 x 6–8, descanso 90–120 s
   Cardio: ...
   # Consejos            ← un título sin "Día N" es una sección de la guía
   - Dormir 7–9 h
   También entiende el formato de Notion ("Press de banca — 4 series x 6–8 rep — descanso 90 s"). */

const BULLET = /^([-*•]|\d+[.)])\s+/
const SETS = /(\d+)\s*(?:series?\s*)?[x×]\s*(.+?)\s*(?=,|\s[—–-]\s|descanso|$)/i
const FIELD = /^(objetivo|calentamiento|cardio)[^:]*:\s*(.+)/i
const FIELD_KEY = { objetivo: 'goal', calentamiento: 'warmup', cardio: 'cardio' }
const DAY_RE = /^d[ií]a\s*\d+\s*[:.—–-]?\s*/i

export function parsePlan(text) {
  const plan = { intro: [], days: [], guide: [] }
  let day = null, section = null
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const header = line.match(/^#+\s*(.*)$/)?.[1] ?? line.match(/^\S{0,4}\s*(d[ií]a\s*\d+.*)$/i)?.[1]
    if (header != null && DAY_RE.test(header)) {
      const m = header.replace(DAY_RE, '').match(/^(.*?)\s*(?:\|\s*(.*)|\((.*)\))?$/)
      day = { title: m[1] || `Día ${plan.days.length + 1}`, sub: m[2] || m[3] || '', goal: '', warmup: '', cardio: '', ex: [] }
      plan.days.push(day); section = null
      continue
    }
    if (header != null) {
      section = [header, []]; plan.guide.push(section); day = null
      continue
    }
    const l = line.replace(BULLET, '')
    if (section) { section[1].push(l); continue }
    if (!day) { plan.intro.push(l); continue }
    const f = l.match(FIELD)
    if (f) { day[FIELD_KEY[f[1].toLowerCase()]] = f[2]; continue }
    if (l.endsWith(':')) continue
    const rest = l.match(/descanso\s*(?:de\s*)?(.+?)\.?$/i)?.[1] ?? ''
    const s = l.match(SETS)
    if (s) {
      const name = l.slice(0, s.index).replace(/[\s—–\-:,·]+$/, '')
      if (name) day.ex.push([name, +s[1], s[2].replace(/\s*rep(eticione)?s?\.?$/i, ''), rest])
    } else if (BULLET.test(line) && !l.includes(':')) {
      // Ejercicio sin series ("Sentadilla goblet — 10–12"): 3 series por defecto
      const [name, reps = ''] = l.split(/\s[—–-]\s/)
      day.ex.push([name, 3, reps, rest])
    }
  }
  plan.intro = plan.intro.join(' ')
  return plan
}

export function planToText({ intro, days, guide }) {
  return [
    intro,
    ...days.map((d, i) => [
      `# Día ${i + 1}: ${d.title}${d.sub ? ` (${d.sub})` : ''}`,
      d.goal && `Objetivo: ${d.goal}`,
      d.warmup && `Calentamiento: ${d.warmup}`,
      ...d.ex.map(([n, s, r, rest]) => `- ${n}: ${s} x ${r}${rest ? `, descanso ${rest}` : ''}`),
      d.cardio && `Cardio: ${d.cardio}`,
    ].filter(Boolean).join('\n')),
    ...guide.map(([t, items]) => [`# ${t}`, ...items.map((x) => `- ${x}`)].join('\n')),
  ].filter(Boolean).join('\n\n')
}

export const DEFAULT_PLAN = planToText({ intro: INTRO, days: DAYS, guide: GUIDE })

export const AI_PROMPT = `Actúa como entrenador personal. Créame un plan de entrenamiento semanal.

Mis datos: [edad, sexo, altura, peso]
Objetivo: [ganar masa muscular / perder grasa / fuerza / resistencia…]
Días por semana: [ej. 4] · Duración por sesión: [ej. 60 min]
Material disponible: [gimnasio completo / mancuernas / en casa…]
Lesiones o limitaciones: [ninguna / …]

Responde SOLO con el plan en texto plano, sin tablas ni negritas, exactamente con este formato:

Una línea de resumen del plan.

# Día 1: Nombre del día (enfoque)
Objetivo: qué se trabaja ese día
Calentamiento: qué hacer
- Nombre del ejercicio: 4 x 8–10, descanso 90 s
- Otro ejercicio: 3 x 12, descanso 60 s
Cardio: qué hacer al final

(repite "# Día N" para cada día)

# Consejos
- un consejo por línea

Puedes añadir más secciones como "# Alimentación" o "# Movilidad" con el mismo formato de lista.`
