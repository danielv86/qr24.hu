/**
 * Saját (szabadkézi) QR-forma.
 *
 * Egy forma több körvonalból áll, és mindegyik külön szerkeszthető. A `cut`
 * módú körvonalak kivágást készítenek (például egy fej szemeit), így egy
 * egyszínű sziluettből is kirajzolható az arc.
 *
 * A csomópontokat 0..1 közötti, normalizált koordinátákkal tároljuk, így
 * ugyanaz az alak rajzolható egy 8 px-es modulra és egy 1024 px-es exportra is.
 */

export interface ShapePoint {
  x: number
  y: number
}

export type ShapeMode = 'add' | 'cut'

export interface ShapeContour {
  points: ShapePoint[]
  /** 0 = éles sarkok, 1 = teljesen lekerekített (Catmull-Rom görbe). */
  smooth: number
  mode: ShapeMode
}

export interface CustomShape {
  contours: ShapeContour[]
}

export const CUSTOM_SHAPE_MIN_POINTS = 3
export const CUSTOM_SHAPE_MAX_POINTS = 24
export const CUSTOM_SHAPE_MAX_CONTOURS = 6

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

function format(value: number): string {
  return Number(value.toFixed(2)).toString()
}

export function shapeBounds(points: ShapePoint[]): {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
} {
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
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

/** A csomópontokat a 0..1-es dobozba igazítja, megtartva az arányokat. */
export function normalizeShapePoints(points: ShapePoint[]): ShapePoint[] {
  const bounds = shapeBounds(points)
  const size = Math.max(bounds.width, bounds.height)
  if (!size) return []
  const offsetX = (size - bounds.width) / 2
  const offsetY = (size - bounds.height) / 2
  return points.map(point => ({
    x: round((point.x - bounds.minX + offsetX) / size),
    y: round((point.y - bounds.minY + offsetY) / size),
  }))
}

/**
 * A teljes formát (minden körvonalat együtt) igazítja a 0..1-es dobozba.
 * Fontos, hogy együtt számoljuk: így a szemek helye nem csúszik el a fejen.
 */
export function normalizeContours(contours: ShapeContour[]): ShapeContour[] {
  const all = contours.flatMap(contour => contour.points)
  const bounds = shapeBounds(all)
  const size = Math.max(bounds.width, bounds.height)
  if (!size) return contours
  const offsetX = (size - bounds.width) / 2
  const offsetY = (size - bounds.height) / 2
  const map = (point: ShapePoint) => ({
    x: round((point.x - bounds.minX + offsetX) / size),
    y: round((point.y - bounds.minY + offsetY) / size),
  })
  return contours.map(contour => ({ ...contour, points: contour.points.map(map) }))
}

/** Egy zárt sokszög területe. */
export function shapeArea(points: ShapePoint[]): number {
  if (points.length < 3) return 0
  let sum = 0
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!
    const next = points[(index + 1) % points.length]!
    sum += current.x * next.y - next.x * current.y
  }
  return Math.abs(sum) / 2
}

/** A forma tényleges tintale fedettsége: a kivágások levonódnak. */
export function shapeCoverage(shape: CustomShape | null | undefined): number {
  if (!shape) return 0
  let coverage = 0
  for (const contour of shape.contours) {
    const area = shapeArea(contour.points)
    coverage += contour.mode === 'cut' ? -area : area
  }
  return Math.max(0, Math.min(1, coverage))
}

function distanceToSegment(point: ShapePoint, a: ShapePoint, b: ShapePoint): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  if (!lengthSquared) return Math.hypot(point.x - a.x, point.y - a.y)
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared))
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy))
}

function simplifyStep(points: ShapePoint[], tolerance: number): ShapePoint[] {
  if (points.length < 3) return [...points]
  let worstIndex = 0
  let worstDistance = 0
  const first = points[0]!
  const last = points[points.length - 1]!
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = distanceToSegment(points[index]!, first, last)
    if (distance > worstDistance) {
      worstDistance = distance
      worstIndex = index
    }
  }
  if (worstDistance <= tolerance) return [first, last]
  const left = simplifyStep(points.slice(0, worstIndex + 1), tolerance)
  const right = simplifyStep(points.slice(worstIndex), tolerance)
  return [...left.slice(0, -1), ...right]
}

/** Csökkenti a csomópontok számát (Ramer–Douglas–Peucker). */
export function simplifyShapePoints(
  points: ShapePoint[],
  maxPoints = CUSTOM_SHAPE_MAX_POINTS,
): ShapePoint[] {
  const deduped: ShapePoint[] = []
  for (const point of points) {
    const previous = deduped[deduped.length - 1]
    if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) > 0.002) deduped.push(point)
  }
  if (deduped.length > 1) {
    const first = deduped[0]!
    const last = deduped[deduped.length - 1]!
    if (Math.hypot(first.x - last.x, first.y - last.y) < 0.002) deduped.pop()
  }
  if (deduped.length <= maxPoints) return deduped

  const closed = [...deduped, deduped[0]!]
  let tolerance = 0.004
  let simplified = deduped
  for (let attempt = 0; attempt < 12; attempt += 1) {
    simplified = simplifyStep(closed, tolerance).slice(0, -1)
    if (simplified.length <= maxPoints) return simplified
    tolerance *= 1.6
  }
  return simplified.slice(0, maxPoints)
}

/**
 * A csomópontokból SVG-útvonalat készít. `smooth` > 0 esetén Catmull-Rom
 * görbékké alakítja a töröttvonalat.
 */
export function shapePathFromPoints(
  points: ShapePoint[],
  x: number,
  y: number,
  size: number,
  smooth = 0,
): string {
  if (points.length < 3) return ''
  const scaled = points.map(point => [x + point.x * size, y + point.y * size] as const)
  const k = Math.max(0, Math.min(1, smooth))
  if (k < 0.02) {
    const [first, ...rest] = scaled
    return `M${format(first![0])} ${format(first![1])}${rest
      .map(point => `L${format(point[0])} ${format(point[1])}`)
      .join('')}Z`
  }
  const count = scaled.length
  let d = `M${format(scaled[0]![0])} ${format(scaled[0]![1])}`
  for (let index = 0; index < count; index += 1) {
    const previous = scaled[(index - 1 + count) % count]!
    const current = scaled[index]!
    const next = scaled[(index + 1) % count]!
    const afterNext = scaled[(index + 2) % count]!
    const c1x = current[0] + ((next[0] - previous[0]) / 6) * k
    const c1y = current[1] + ((next[1] - previous[1]) / 6) * k
    const c2x = next[0] - ((afterNext[0] - current[0]) / 6) * k
    const c2y = next[1] - ((afterNext[1] - current[1]) / 6) * k
    d += `C${format(c1x)} ${format(c1y)} ${format(c2x)} ${format(c2y)} ${format(next[0])} ${format(next[1])}`
  }
  return `${d}Z`
}

/**
 * Egy körvonal útvonala. A kivágásokat fordított körjárással rajzoljuk, így a
 * nonzero szabály lyukat vág – nem kell evenodd, és az egymást átfedő
 * hozzáadások uniója is helyes marad.
 */
export function contourPath(
  contour: ShapeContour,
  x: number,
  y: number,
  size: number,
  forceReverse = false,
): string {
  const reverse = forceReverse !== (contour.mode === 'cut')
  const points = reverse ? [...contour.points].reverse() : contour.points
  return shapePathFromPoints(points, x, y, size, contour.smooth)
}

export function customShapePath(shape: CustomShape | null | undefined, x: number, y: number, size: number): string {
  if (!shape) return ''
  return shape.contours.map(contour => contourPath(contour, x, y, size)).join('')
}

/**
 * Sarokkeret saját formából: a külső alak 7, a belső 5 modul dobozára
 * skálázva, ellenkező körjárással, hogy a belseje lyuk legyen.
 */
export function customFramePath(shape: CustomShape | null | undefined, x: number, y: number, size: number): string {
  if (!shape) return ''
  const inset = size / 7
  return (
    customShapePath(shape, x, y, size) +
    shape.contours.map(contour => contourPath(contour, x + inset, y + inset, size - inset * 2, true)).join('')
  )
}

export function isValidCustomShape(shape: CustomShape | null | undefined): shape is CustomShape {
  return Boolean(shape && shape.contours.some(contour => contour.points.length >= CUSTOM_SHAPE_MIN_POINTS))
}

export function cloneCustomShape(shape: CustomShape | null | undefined): CustomShape | null {
  if (!shape) return null
  return {
    contours: shape.contours.map(contour => ({
      ...contour,
      points: contour.points.map(point => ({ ...point })),
    })),
  }
}

/**
 * JSON-ból érkező forma ellenőrzése. Elfogadja a csupasz `{ contours }`
 * szerkezetet és az exportált `{ shape: { contours } }` burkot is.
 */
export function parseCustomShape(value: unknown): CustomShape | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const source = record.shape && typeof record.shape === 'object' ? (record.shape as Record<string, unknown>) : record
  if (!Array.isArray(source.contours)) return null

  const clamp = (input: number) => Math.min(1, Math.max(0, input))
  const contours: ShapeContour[] = []
  for (const raw of source.contours.slice(0, CUSTOM_SHAPE_MAX_CONTOURS)) {
    if (!raw || typeof raw !== 'object') continue
    const contour = raw as Record<string, unknown>
    if (!Array.isArray(contour.points)) continue
    const points: ShapePoint[] = []
    for (const point of contour.points.slice(0, CUSTOM_SHAPE_MAX_POINTS)) {
      if (!point || typeof point !== 'object') continue
      const { x, y } = point as Record<string, unknown>
      if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) continue
      points.push({ x: round(clamp(x)), y: round(clamp(y)) })
    }
    if (points.length < CUSTOM_SHAPE_MIN_POINTS) continue
    const smooth = typeof contour.smooth === 'number' && Number.isFinite(contour.smooth) ? clamp(contour.smooth) : 0.5
    contours.push({ points, smooth, mode: contour.mode === 'cut' ? 'cut' : 'add' })
  }
  return contours.length ? { contours } : null
}

/** Egy új körvonal létrehozása a szerkesztőhöz. */
export function createContour(
  points: ShapePoint[],
  smooth = 0.5,
  mode: ShapeMode = 'add',
): ShapeContour {
  return { points: points.map(point => ({ ...point })), smooth, mode }
}
