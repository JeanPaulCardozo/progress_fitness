// node src/plan.check.js  → comprueba el parser del plan
import assert from 'node:assert/strict'
import { DAYS, DEFAULT_PLAN, GUIDE, parsePlan, planToText } from './plan.js'

const p = parsePlan(DEFAULT_PLAN)
assert.equal(p.days.length, DAYS.length)
p.days.forEach((d, i) => {
  assert.deepEqual(d.ex, DAYS[i].ex.map(([n, s, r, rest]) => [n, s, r, rest]), `Día ${i + 1}`)
  assert.equal(d.title, DAYS[i].title); assert.equal(d.sub, DAYS[i].sub); assert.equal(d.cardio, DAYS[i].cardio)
})
assert.deepEqual(p.guide, GUIDE)
assert.equal(planToText(p), DEFAULT_PLAN) // ida y vuelta estable

// Texto pegado desde Notion
const n = parsePlan(`Perfil: hombre, 25 años
1️⃣ Día 1 — Tren superior (empuje + tracción ligera)
Objetivo: fuerza y volumen.
Calentamiento (5 min): movilidad de hombros.
Bloque principal:
1. Press de banca con barra o mancuernas — 4 series x 6–8 rep — descanso 90–120 s.
2. curl de bíceps con barra  - 3 x 10 - descanso de 60 - 90 s.
Cardio final (5–8 min): saltos.
3️⃣ Día 3 — Full body
Bloque principal (circuito — 3 rondas): descansar 90–120 s entre rondas.
1. Sentadilla goblet — 10–12
5. Plancha 3×30–45 s`)
assert.equal(n.intro, 'Perfil: hombre, 25 años')
assert.equal(n.days.length, 2)
assert.deepEqual(n.days[0].ex, [['Press de banca con barra o mancuernas', 4, '6–8', '90–120 s'], ['curl de bíceps con barra', 3, '10', '60 - 90 s']])
assert.equal(n.days[0].sub, 'empuje + tracción ligera')
assert.equal(n.days[0].warmup, 'movilidad de hombros.')
assert.deepEqual(n.days[1].ex, [['Sentadilla goblet', 3, '10–12', ''], ['Plancha', 3, '30–45 s', '']])
console.log('plan.check ok')
