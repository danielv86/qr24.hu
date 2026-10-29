import { describe, expect, it } from 'vitest'
import {
  SILHOUETTE_PRESETS,
  evaluateSilhouette,
  fillLattice,
  fitSquareInside,
  pointInPolygon,
  pointsToPath,
  silhouettePoints,
} from '#shared/qr/silhouette'
import type { ShapePoint } from '#shared/qr/custom-shape'
import { buildQrContents } from '../app/utils/qr-render'
import { DEFAULT_CUSTOMIZATION } from '~/lib/qr/customization'
import type { QrCustomization } from '#shared/qr/types'

const square: ShapePoint[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
]

function customization(overrides: Partial<QrCustomization> = {}): QrCustomization {
  return { ...DEFAULT_CUSTOMIZATION, ...overrides }
}

describe('silhouette presets', () => {
  it('ships six presets, all normalized inside the unit box', () => {
    expect(SILHOUETTE_PRESETS).toHaveLength(6)
    for (const preset of SILHOUETTE_PRESETS) {
      expect(preset.points.length).toBeGreaterThanOrEqual(3)
      for (const point of preset.points) {
        expect(point.x).toBeGreaterThanOrEqual(0)
        expect(point.x).toBeLessThanOrEqual(1)
        expect(point.y).toBeGreaterThanOrEqual(0)
        expect(point.y).toBeLessThanOrEqual(1)
      }
    }
  })

  it('resolves presets and custom outlines, and nothing for "none"', () => {
    expect(silhouettePoints('none')).toBeNull()
    expect(silhouettePoints('fish')).toHaveLength(SILHOUETTE_PRESETS[0]!.points.length)
    expect(silhouettePoints('custom', square)).toEqual(square)
    expect(silhouettePoints('custom', [{ x: 0, y: 0 }])).toBeNull()
  })

  it('builds a closed path', () => {
    expect(pointsToPath(square)).toMatch(/^M0 0L1 0L1 1L0 1Z$/)
  })
})

describe('polygon geometry', () => {
  it('detects inside and outside points', () => {
    expect(pointInPolygon(0.5, 0.5, square)).toBe(true)
    expect(pointInPolygon(-0.1, 0.5, square)).toBe(false)
    expect(pointInPolygon(0.5, 1.2, square)).toBe(false)
  })

  it('finds a square that stays inside a triangle', () => {
    const triangle: ShapePoint[] = [
      { x: 0.5, y: 0.06 },
      { x: 0.95, y: 0.92 },
      { x: 0.05, y: 0.92 },
    ]
    const squareInside = fitSquareInside(triangle, 128)
    expect(squareInside.side).toBeGreaterThan(0.2)
    expect(squareInside.side).toBeLessThan(1)
    const half = squareInside.side / 2
    for (const [dx, dy] of [
      [-half, -half],
      [half, -half],
      [half, half],
      [-half, half],
    ] as const) {
      expect(pointInPolygon(squareInside.centerX + dx, squareInside.centerY + dy, triangle)).toBe(true)
    }
  })

  it('finds the whole box for a unit square', () => {
    const squareInside = fitSquareInside(square, 64)
    expect(squareInside.side).toBeGreaterThan(0.85)
    expect(squareInside.centerX).toBeCloseTo(0.5, 1)
    expect(squareInside.centerY).toBeCloseTo(0.5, 1)
  })
})

describe('fill lattice', () => {
  const field = { left: 0.35, top: 0.35, side: 0.3 }
  const cells = fillLattice({ polygon: square, field, gap: 0.02, step: 0.05 })

  it('keeps every filler module inside the shape', () => {
    expect(cells.length).toBeGreaterThan(20)
    for (const cell of cells) {
      expect(pointInPolygon(cell.x, cell.y, square)).toBe(true)
    }
  })

  it('never fills the code field or its clean band', () => {
    for (const cell of cells) {
      const insideField =
        cell.x > field.left - 0.02 &&
        cell.x < field.left + field.side + 0.02 &&
        cell.y > field.top - 0.02 &&
        cell.y < field.top + field.side + 0.02
      expect(insideField).toBe(false)
    }
  })

  it('is deterministic, so the preview and the export match', () => {
    expect(fillLattice({ polygon: square, field, gap: 0.02, step: 0.05 })).toEqual(cells)
  })
})

describe('readability evaluation', () => {
  it('reports a usable module size for a large round shape', () => {
    const result = evaluateSilhouette({
      points: SILHOUETTE_PRESETS.find(preset => preset.id === 'circle')!.points,
      moduleCount: 33,
    })
    expect(result.rating).toBe('good')
    expect(result.cellPixels).toBeGreaterThanOrEqual(9)
  })

  it('warns when the shape forces a tiny code', () => {
    const sliver: ShapePoint[] = [
      { x: 0.05, y: 0.48 },
      { x: 0.95, y: 0.45 },
      { x: 0.95, y: 0.55 },
      { x: 0.05, y: 0.52 },
    ]
    const result = evaluateSilhouette({ points: sliver, moduleCount: 33 })
    expect(result.rating).not.toBe('good')
  })
})

describe('silhouette rendering', () => {
  const data = 'https://qrkod24.hu/go/w2qN1TkCDbde'

  it('clips the modules to the shape and outlines it', () => {
    const svg = buildQrContents(data, customization({ silhouette: 'fish' }), 512)
    expect(svg).toContain('<clipPath')
    expect(svg).toContain('clip-path="url(#qr-silhouette-')
    expect(svg).toContain('fill="none" stroke="')
  })

  it('adds filler modules only when the fill is enabled', () => {
    const filled = buildQrContents(data, customization({ silhouette: 'fish', silhouetteFill: true }), 512)
    const empty = buildQrContents(data, customization({ silhouette: 'fish', silhouetteFill: false }), 512)
    expect(filled.length).toBeGreaterThan(empty.length + 500)
  })

  it('leaves a plain square code alone', () => {
    const svg = buildQrContents(data, customization(), 512)
    expect(svg).not.toContain('<clipPath')
    expect(svg).not.toContain('clip-path=')
  })

  it('uses the uploaded outline for the custom shape', () => {
    const svg = buildQrContents(
      data,
      customization({ silhouette: 'custom', silhouettePoints: square }),
      512,
    )
    expect(svg).toContain('<clipPath')
  })
})
