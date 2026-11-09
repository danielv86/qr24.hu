import { describe, expect, it } from 'vitest'
import { normalizeLibraryShapePoints, parseLibraryShapes } from '#shared/qr/library-shape'
import type { ShapePoint } from '#shared/qr/custom-shape'
import { DEFAULT_CUSTOMIZATION, normalizeCustomization } from '~/lib/qr/customization'
import type { QrCustomization } from '#shared/qr/types'
import { buildQrContents, resolveLogoBox } from '../app/utils/qr-render'

const square: ShapePoint[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
]

function customization(overrides: Partial<QrCustomization> = {}): QrCustomization {
  return { ...DEFAULT_CUSTOMIZATION, ...overrides }
}

describe('library shapes', () => {
  it('normalizes uploaded outlines into the unit box', () => {
    const points = normalizeLibraryShapePoints([
      { x: -1, y: 2 },
      { x: 0.5, y: 0.5 },
      { x: 1.4, y: 0.5 },
    ])
    expect(points).toHaveLength(3)
    for (const point of points) {
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThanOrEqual(1)
      expect(point.y).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeLessThanOrEqual(1)
    }
  })

  it('rejects broken outlines instead of storing them', () => {
    expect(normalizeLibraryShapePoints([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toEqual([])
    expect(normalizeLibraryShapePoints([{ x: 'a', y: 1 }, { x: 0, y: 0 }, { x: 1, y: 1 }])).toEqual([])
    expect(normalizeLibraryShapePoints('nope')).toEqual([])
  })

  it('skips invalid entries when reading the stored list', () => {
    const shapes = parseLibraryShapes([
      { id: 'a', label: 'Szív', points: square, createdAt: '2026-01-01' },
      { id: '', label: 'Névtelen', points: square },
      { id: 'b', label: 'Törött', points: [{ x: 0, y: 0 }] },
      'hibás',
    ])
    expect(shapes).toHaveLength(1)
    expect(shapes[0]!.label).toBe('Szív')
  })
})

describe('logo placement', () => {
  it('centers the logo on the code field, not on the canvas', () => {
    const box = resolveLogoBox({
      left: 300,
      top: 260,
      side: 400,
      ratio: 0.2,
      margin: 0,
      canvasSize: 1024,
      moduleCount: 33,
    })
    expect(box.x + box.box / 2).toBeCloseTo(500, 5)
    expect(box.y + box.box / 2).toBeCloseTo(460, 5)
  })

  it('keeps the configured size on a regular 33-module code', () => {
    const box = resolveLogoBox({
      left: 100,
      top: 100,
      side: 824,
      ratio: 0.28,
      margin: 8,
      canvasSize: 1024,
      moduleCount: 33,
    })
    expect(box.size).toBe(Math.round(1024 * 0.28))
  })

  it('shrinks the logo so it never covers the finder patterns', () => {
    const box = resolveLogoBox({
      left: 0,
      top: 0,
      side: 300,
      ratio: 0.4,
      margin: 0,
      canvasSize: 1024,
      moduleCount: 21,
    })
    expect(box.size).toBeLessThanOrEqual(Math.round(300 * 0.24) + 1)
  })
})

describe('silhouette border width', () => {
  it('draws no outline at zero width', () => {
    const svg = buildQrContents(
      'https://example.com',
      customization({ silhouette: 'circle', silhouetteBorderWidth: 0 }),
      512,
    )
    expect(svg).not.toContain('stroke-width')
  })

  it('draws the outline by default', () => {
    const svg = buildQrContents('https://example.com', customization({ silhouette: 'circle' }), 512)
    expect(svg).toContain('fill="none" stroke=')
  })
})

describe('customization normalization', () => {
  it('falls back to square modules when the custom body is missing', () => {
    const next = normalizeCustomization(customization({ dotStyle: 'custom', customBody: null }))
    expect(next.dotStyle).toBe('square')
  })

  it('clamps numeric values into their allowed ranges', () => {
    const next = normalizeCustomization(
      customization({ logoSize: 9, silhouetteBorderWidth: -3, margin: 99, frameFontScale: 0.1 }),
    )
    expect(next.logoSize).toBe(0.4)
    expect(next.silhouetteBorderWidth).toBe(0)
    expect(next.margin).toBe(10)
    expect(next.frameFontScale).toBe(0.7)
  })

  it('drops a silhouette whose outline is invalid', () => {
    const next = normalizeCustomization(
      customization({ silhouette: 'custom', silhouettePoints: [{ x: 0, y: 0 }] }),
    )
    expect(next.silhouette).toBe('none')
  })
})
