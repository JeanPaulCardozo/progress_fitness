// Física de las interacciones: muelles interrumpibles, proyección de inercia y resistencia en los bordes.
// Mismos parámetros que usa Apple (WWDC 2018, "Designing Fluid Interfaces"): damping + response en vez de masa/rigidez.

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// Muelle con masa 1. Arranca desde el valor actual y con la velocidad del dedo, así que se puede
// interrumpir y redirigir en cualquier momento sin saltos. damping 1 = sin rebote, < 1 = rebota.
export function spring(from, to, { velocity = 0, response = 0.35, damping = 1, restDelta = 0.5, restSpeed = 5, onUpdate, onDone }) {
  if (reducedMotion()) { onUpdate(to); onDone?.(); return { stop() {} } }
  const k = (2 * Math.PI / response) ** 2
  const c = (4 * Math.PI * damping) / response
  let x = from, v = velocity, last = performance.now(), id
  const tick = (now) => {
    const dt = Math.min(0.064, (now - last) / 1000) // si la pestaña se congela, no salta al final de golpe
    last = now
    const n = Math.ceil(dt / 0.004), h = dt / n // subpasos: estable con muelles rígidos
    for (let i = 0; i < n; i++) { v += (-k * (x - to) - c * v) * h; x += v * h }
    if (Math.abs(v) < restSpeed && Math.abs(x - to) < restDelta) { onUpdate(to); onDone?.(); return }
    onUpdate(x)
    id = requestAnimationFrame(tick)
  }
  id = requestAnimationFrame(tick)
  return { stop: () => cancelAnimationFrame(id) }
}

// Dónde se pararía algo lanzado a esta velocidad (px/s), con la deceleración del scroll de iOS
export const project = (velocity, rate = 0.998) => ((velocity / 1000) * rate) / (1 - rate)

// Pasado el borde, cuanto más tiras menos se mueve: responde, pero deja claro que no hay más
export const rubberband = (over, dim, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over))

// Velocidad al soltar a partir de los últimos movimientos del puntero (los de los últimos 100 ms)
export function releaseVelocity(hist) {
  const end = hist.at(-1)
  const start = hist.find((p) => end.t - p.t <= 100) ?? end
  return end.t > start.t ? ((end.y - start.y) / (end.t - start.t)) * 1000 : 0
}
