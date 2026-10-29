import type { ShapePoint } from './custom-shape'

/**
 * Alakzat (sziluett) kitöltés.
 *
 * A QR-mátrix mindig négyzetes, ezért a kód egy befoglalható négyzetbe kerül,
 * a sziluett többi részét pedig ugyanolyan modulok töltik ki, mint a kódot.
 * Minden számítás 0..1 közötti, normalizált térben történik, így ugyanaz az
 * eredmény jön ki az előnézetben (512 px) és az exportban (1024 px vagy több).
 */

export type SilhouetteId =
  | 'none'
  | 'fish'
  | 'heart'
  | 'star'
  | 'circle'
  | 'hexagon'
  | 'triangle'
  | 'custom'

export interface SilhouettePreset {
  id: Exclude<SilhouetteId, 'none' | 'custom'>
  label: string
  points: ShapePoint[]
}

function circle(radius = 0.47, steps = 64): ShapePoint[] {
  return Array.from({ length: steps }, (_, index) => {
    const angle = (Math.PI * 2 * index) / steps
    return { x: round(0.5 + Math.cos(angle) * radius), y: round(0.5 + Math.sin(angle) * radius) }
  })
}

function polygon(radius: number, sides: number, startAngle = -Math.PI / 2): ShapePoint[] {
  return Array.from({ length: sides }, (_, index) => {
    const angle = startAngle + (Math.PI * 2 * index) / sides
    return { x: round(0.5 + Math.cos(angle) * radius), y: round(0.5 + Math.sin(angle) * radius) }
  })
}

function star(outer = 0.47, inner = 0.19, points = 5): ShapePoint[] {
  const result: ShapePoint[] = []
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outer : inner
    const angle = -Math.PI / 2 + (Math.PI / points) * index
    result.push({ x: round(0.5 + Math.cos(angle) * radius), y: round(0.5 + Math.sin(angle) * radius) })
  }
  return result
}

/** Klasszikus szívgörbe, 0..1-es dobozba igazítva. */
function heart(steps = 72): ShapePoint[] {
  const raw: ShapePoint[] = []
  for (let index = 0; index < steps; index += 1) {
    const t = (Math.PI * 2 * index) / steps
    const x = 16 * Math.sin(t) ** 3
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
    raw.push({ x, y: -y })
  }
  const minX = Math.min(...raw.map(point => point.x))
  const maxX = Math.max(...raw.map(point => point.x))
  const minY = Math.min(...raw.map(point => point.y))
  const maxY = Math.max(...raw.map(point => point.y))
  const scale = Math.min(0.88 / (maxX - minX), 0.88 / (maxY - minY))
  const offsetX = 0.5 - ((minX + maxX) / 2) * scale
  const offsetY = 0.5 - ((minY + maxY) / 2) * scale
  return raw.map(point => ({ x: round(point.x * scale + offsetX), y: round(point.y * scale + offsetY) }))
}

/**
 * Halacska: a fej jobbra néz, a farok villás. A test a legvastagabb rész,
 * ezért a befoglalható négyzet oda kerül, a farok és az uszonyok kitöltést kapnak.
 */
const FISH: ShapePoint[] = [
  { x: 0.955, y: 0.5 },
  { x: 0.87, y: 0.4 },
  { x: 0.77, y: 0.33 },
  { x: 0.69, y: 0.305 },
  { x: 0.63, y: 0.298 },
  { x: 0.588, y: 0.122 },
  { x: 0.478, y: 0.108 },
  { x: 0.438, y: 0.298 },
  { x: 0.36, y: 0.308 },
  { x: 0.27, y: 0.318 },
  { x: 0.195, y: 0.332 },
  { x: 0.052, y: 0.192 },
  { x: 0.132, y: 0.49 },
  { x: 0.048, y: 0.808 },
  { x: 0.2, y: 0.696 },
  { x: 0.28, y: 0.722 },
  { x: 0.356, y: 0.748 },
  { x: 0.4, y: 0.952 },
  { x: 0.505, y: 0.944 },
  { x: 0.542, y: 0.754 },
  { x: 0.64, y: 0.776 },
  { x: 0.75, y: 0.736 },
  { x: 0.86, y: 0.642 },
]

export const SILHOUETTE_PRESETS: SilhouettePreset[] = [
  { id: 'fish', label: 'Halacska', points: FISH },
  { id: 'heart', label: 'Szív', points: heart() },
  { id: 'star', label: 'Csillag', points: star() },
  { id: 'circle', label: 'Kör', points: circle() },
  { id: 'hexagon', label: 'Hatszög', points: polygon(0.47, 6) },
  { id: 'triangle', label: 'Háromszög', points: [{ x: 0.5, y: 0.06 }, { x: 0.95, y: 0.92 }, { x: 0.05, y: 0.92 }] },
]

/** A kiválasztott alakzat körvonala, vagy null, ha nincs alakzat. */
export function silhouettePoints(id: SilhouetteId, custom?: ShapePoint[] | null): ShapePoint[] | null {
  if (id === 'none') return null
  if (id === 'custom') return custom && custom.length >= 3 ? custom : null
  return SILHOUETTE_PRESETS.find(preset => preset.id === id)?.points ?? null
}

export function silhouetteLabel(id: SilhouetteId): string {
  if (id === 'none') return 'Nincs alakzat'
  if (id === 'custom') return 'Saját alakzat'
  return SILHOUETTE_PRESETS.find(preset => preset.id === id)?.label ?? 'Alakzat'
}

export function pointInPolygon(x: number, y: number, points: ShapePoint[]): boolean {
  let inside = false
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
    const current = points[index]!
    const before = points[previous]!
    if (
      current.y > y !== before.y > y &&
      x < ((before.x - current.x) * (y - current.y)) / (before.y - current.y) + current.x
    ) {
      inside = !inside
    }
  }
  return inside
}

export function polygonBounds(points: ShapePoint[]) {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const point of points) {
    if (point.x < minX) minX = point.x
    if (point.y < minY) minY = point.y
    if (point.x > maxX) maxX = point.x
    if (point.y > maxY) maxY = point.y
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

export function pointsToPath(points: ShapePoint[]): string {
  if (!points.length) return ''
  return `${points.map((point, index) => `${index === 0 ? 'M' : 'L'}${round(point.x)} ${round(point.y)}`).join('')}Z`
}

/**
 * A legnagyobb tengelypárhuzamos négyzet, ami teljesen az alakzaton belül van.
 * Chebyshev-távolság transzformációval: minden cellára megkapjuk, mekkora
 * négyzet fér el körülötte, és a legnagyobbat választjuk.
 */
export function fitSquareInside(points: ShapePoint[], resolution = 96): {
  centerX: number
  centerY: number
  side: number
} {
  const bounds = polygonBounds(points)
  const step = Math.max(bounds.width, bounds.height) / resolution
  if (!Number.isFinite(step) || step <= 0) return { centerX: 0.5, centerY: 0.5, side: 0 }

  const columns = Math.max(1, Math.ceil(bounds.width / step))
  const rows = Math.max(1, Math.ceil(bounds.height / step))
  const distance = Array.from({ length: rows }, () => new Array<number>(columns).fill(0))

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = bounds.minX + (column + 0.5) * step
      const y = bounds.minY + (row + 0.5) * step
      distance[row]![column] = pointInPolygon(x, y, points) ? Number.POSITIVE_INFINITY : 0
    }
  }

  const relax = (row: number, column: number, neighbours: number[]) => {
    if (distance[row]![column] === 0) return
    distance[row]![column] = Math.min(distance[row]![column]!, Math.min(...neighbours) + 1)
  }
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      relax(row, column, [
        row > 0 ? distance[row - 1]![column]! : 0,
        column > 0 ? distance[row]![column - 1]! : 0,
        row > 0 && column > 0 ? distance[row - 1]![column - 1]! : 0,
        row > 0 && column < columns - 1 ? distance[row - 1]![column + 1]! : 0,
      ])
    }
  }
  for (let row = rows - 1; row >= 0; row -= 1) {
    for (let column = columns - 1; column >= 0; column -= 1) {
      relax(row, column, [
        row < rows - 1 ? distance[row + 1]![column]! : 0,
        column < columns - 1 ? distance[row]![column + 1]! : 0,
        row < rows - 1 && column < columns - 1 ? distance[row + 1]![column + 1]! : 0,
        row < rows - 1 && column > 0 ? distance[row + 1]![column - 1]! : 0,
      ])
    }
  }

  let bestRow = 0
  let bestColumn = 0
  let best = 0
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const value = Number.isFinite(distance[row]![column]) ? distance[row]![column]! : 0
      if (value > best) {
        best = value
        bestRow = row
        bestColumn = column
      }
    }
  }

  return {
    centerX: bounds.minX + (bestColumn + 0.5) * step,
    centerY: bounds.minY + (bestRow + 0.5) * step,
    // A Chebyshev-távolság d cella: a középpontból d - 1 cella biztonsággal
    // befelé még az alakzaton belül van, ez adja a befoglalható négyzet felét.
    side: Math.max(0, (best - 1) * 2 * step),
  }
}

/** Determinisztikus „zaj”, hogy az előnézet és az export ugyanazt a kitöltést adja. */
export function hashRandom(a: number, b: number): number {
  let value = (a * 374761393 + b * 668265263) ^ 0x5bf03635
  value = (value ^ (value >>> 13)) * 1274126177
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296
}

export interface SilhouetteField {
  left: number
  top: number
  side: number
}

/**
 * A kitöltő modulok középpontjai: az alakzaton belül, de a kódmező körüli
 * tiszta sávon kívül. A rács lépésköze a kód modulmérete, így a kitöltés
 * pontosan ugyanolyan modulokból áll, mint maga a kód.
 */
export function fillLattice(options: {
  polygon: ShapePoint[]
  field: SilhouetteField
  /** A tiszta sáv a kódmező körül, a modulméret többszöröse. */
  gap: number
  /** Modulméret normalizált egységben. */
  step: number
  /** A kitöltő modulok aránya (0..1); 0,55 körül néz ki természetesnek. */
  density?: number
  /** A keresőminták körüli tiszta udvar sugara modulban. */
  eyeRadius?: number
}): ShapePoint[] {
  const { polygon, field, gap, step } = options
  const density = options.density ?? 0.55
  const eyeRadius = options.eyeRadius ?? 4.4
  const bounds = polygonBounds(polygon)
  const cells: ShapePoint[] = []
  if (step <= 0) return cells

  const startX = Math.floor((bounds.minX - field.left) / step) * step + field.left
  const startY = Math.floor((bounds.minY - field.top) / step) * step + field.top
  const eyes = [
    { x: field.left + 3.5 * step, y: field.top + 3.5 * step },
    { x: field.left + field.side - 3.5 * step, y: field.top + 3.5 * step },
    { x: field.left + 3.5 * step, y: field.top + field.side - 3.5 * step },
  ]

  let row = 0
  for (let y = startY; y <= bounds.maxY; y += step, row += 1) {
    let column = 0
    for (let x = startX; x <= bounds.maxX; x += step, column += 1) {
      const centerX = x + step / 2
      const centerY = y + step / 2
      if (!pointInPolygon(centerX, centerY, polygon)) continue
      const insideField =
        centerX > field.left - gap &&
        centerX < field.left + field.side + gap &&
        centerY > field.top - gap &&
        centerY < field.top + field.side + gap
      if (insideField) continue
      if (eyes.some(eye => Math.hypot(centerX - eye.x, centerY - eye.y) < step * eyeRadius)) continue
      if (hashRandom(row, column) > 1 - density) continue
      cells.push({ x: round(centerX), y: round(centerY) })
    }
  }
  return cells
}

export type SilhouetteRating = 'good' | 'risky' | 'unsafe'

export interface SilhouetteEvaluation {
  field: SilhouetteField
  rating: SilhouetteRating
  /** A kód modulmérete pixelben a megadott (névleges) vászonméret mellett. */
  cellPixels: number
  label: string
  detail: string
}

/**
 * Olvashatósági becslés. Nem tiltás: a felület csak figyelmeztet, mert a
 * végső szót úgyis a telefonos olvasó mondja ki.
 */
export function evaluateSilhouette(options: {
  points: ShapePoint[]
  moduleCount: number
  /** Névleges vászonméret pixelben (az export 1024 px). */
  canvasSize?: number
  /** A vászon belső margója, amit a renderelő hagy. */
  padding?: number
}): SilhouetteEvaluation {
  const canvasSize = options.canvasSize ?? 1024
  const padding = options.padding ?? 0.03
  const square = fitSquareInside(options.points)
  const usable = square.side / (options.moduleCount + 2)
  const cellPixels = Math.round(usable * canvasSize * (1 - padding * 2))
  const rating: SilhouetteRating = cellPixels >= 9 ? 'good' : cellPixels >= 6 ? 'risky' : 'unsafe'
  const label = rating === 'good' ? 'Olvashatóság: jó' : rating === 'risky' ? 'Olvashatóság: figyelmeztetés' : 'Olvashatóság: nem javasolt'
  const detail =
    rating === 'good'
      ? `${options.moduleCount}×${options.moduleCount} modul · kb. ${cellPixels} px modulméret 1024 px-en`
      : rating === 'risky'
        ? `A kód kicsi az alakzathoz (kb. ${cellPixels} px modul). Nagyobb alakzat vagy rövidebb tartalom ajánlott.`
        : `A kód túl kicsire zsugorodna (kb. ${cellPixels} px modul). Válassz nagyobb, vastagabb alakzatot.`
  return { field: { left: square.centerX - square.side / 2, top: square.centerY - square.side / 2, side: square.side }, rating, cellPixels, label, detail }
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000
}
