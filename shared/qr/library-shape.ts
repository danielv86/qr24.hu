import {
  CUSTOM_SHAPE_MAX_POINTS,
  CUSTOM_SHAPE_MIN_POINTS,
  normalizeShapePoints,
} from './custom-shape'
import type { ShapePoint } from './custom-shape'

/**
 * Adminban feltöltött alakzat. A generátor alakzat-választójában jelenik meg,
 * és ugyanaz a motor illeszti bele a QR-kódot, mint a beépített formáknál:
 * a kód a legnagyobb befoglalható négyzetbe kerül, a többi részt modulok
 * töltik ki.
 */
export interface LibraryShape {
  id: string
  label: string
  /** 0..1 közé normált, legfeljebb 24 csomópontú körvonal. */
  points: ShapePoint[]
  createdAt: string
}

export const LIBRARY_SHAPE_MAX_COUNT = 40
export const LIBRARY_SHAPE_LABEL_MAX = 48
export const LIBRARY_SHAPE_ID_MAX = 40

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

/** A feltöltött csomópontok ellenőrzése és a 0..1-es dobozba igazítása. */
export function normalizeLibraryShapePoints(value: unknown): ShapePoint[] {
  if (!Array.isArray(value)) return []
  const points: ShapePoint[] = []
  for (const raw of value.slice(0, CUSTOM_SHAPE_MAX_POINTS)) {
    if (!raw || typeof raw !== 'object') continue
    const { x, y } = raw as Record<string, unknown>
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) continue
    points.push({ x: round(Math.min(1, Math.max(0, x))), y: round(Math.min(1, Math.max(0, y))) })
  }
  if (points.length < CUSTOM_SHAPE_MIN_POINTS) return []
  const normalized = normalizeShapePoints(points)
  return normalized.length >= CUSTOM_SHAPE_MIN_POINTS ? normalized : []
}

/** A beállításokban tárolt (esetleg hibás vagy hiányos) lista beolvasása. */
export function parseLibraryShapes(value: unknown): LibraryShape[] {
  if (!Array.isArray(value)) return []
  const shapes: LibraryShape[] = []
  for (const raw of value.slice(0, LIBRARY_SHAPE_MAX_COUNT)) {
    if (!raw || typeof raw !== 'object') continue
    const record = raw as Record<string, unknown>
    const id = typeof record.id === 'string' ? record.id.trim().slice(0, LIBRARY_SHAPE_ID_MAX) : ''
    const label = typeof record.label === 'string' ? record.label.trim().slice(0, LIBRARY_SHAPE_LABEL_MAX) : ''
    const points = normalizeLibraryShapePoints(record.points)
    if (!id || !label || !points.length) continue
    shapes.push({
      id,
      label,
      points,
      createdAt: typeof record.createdAt === 'string' ? record.createdAt : '',
    })
  }
  return shapes
}

export function findLibraryShape(shapes: LibraryShape[], id: string | null | undefined): LibraryShape | null {
  if (!id) return null
  return shapes.find(shape => shape.id === id) ?? null
}
