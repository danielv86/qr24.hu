import { describe, expect, it } from 'vitest'
import {
  CUSTOM_SHAPE_MAX_POINTS,
  cloneCustomShape,
  createContour,
  customFramePath,
  customShapePath,
  isValidCustomShape,
  normalizeContours,
  shapeArea,
  shapeCoverage,
  shapePathFromPoints,
  simplifyShapePoints,
} from '#shared/qr/custom-shape'
import type { CustomShape, ShapePoint } from '#shared/qr/custom-shape'
import { DEFAULT_CUSTOMIZATION, cloneCustomization, getCustomizationWarnings } from '~/lib/qr/customization'
import { buildQrContents } from '../app/utils/qr-render'
import type { QrCustomization } from '#shared/qr/types'

function circlePoints(count: number, radius = 0.5): ShapePoint[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2
    return { x: 0.5 + Math.cos(angle) * radius, y: 0.5 + Math.sin(angle) * radius }
  })
}

function shapeOf(points: ShapePoint[] = circlePoints(12), mode: 'add' | 'cut' = 'add'): CustomShape {
  return { contours: [createContour(points, 0.5, mode)] }
}

function customization(overrides: Partial<QrCustomization>): QrCustomization {
  return { ...DEFAULT_CUSTOMIZATION, ...overrides }
}

const data = 'https://qrkod24.hu'

describe('custom shape geometry', () => {
  it('normalizes every contour into the same unit box', () => {
    const normalized = normalizeContours([
      createContour([
        { x: 10, y: 20 },
        { x: 30, y: 20 },
        { x: 30, y: 25 },
        { x: 10, y: 25 },
      ]),
      createContour([
        { x: 14, y: 21 },
        { x: 16, y: 21 },
        { x: 16, y: 23 },
      ]),
    ])
    const xs = normalized[0]!.points.map(point => point.x)
    expect(Math.min(...xs)).toBeCloseTo(0, 5)
    expect(Math.max(...xs)).toBeCloseTo(1, 5)
    // A második körvonal ugyanabban a dobozban marad, nem nagyítódik külön.
    for (const point of normalized[1]!.points) {
      expect(point.x).toBeGreaterThan(0.15)
      expect(point.x).toBeLessThan(0.35)
    }
  })

  it('subtracts cut contours from the ink coverage', () => {
    const square: ShapePoint[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]
    const eye = circlePoints(16, 0.1)
    expect(shapeArea(square)).toBeCloseTo(1, 5)
    expect(shapeCoverage(shapeOf(square))).toBeCloseTo(1, 5)
    const withHole: CustomShape = {
      contours: [createContour(square, 0, 'add'), createContour(eye, 0.5, 'cut')],
    }
    expect(shapeCoverage(withHole)).toBeLessThan(0.98)
    expect(shapeCoverage(withHole)).toBeGreaterThan(0.94)
  })

  it('simplifies a dense contour to the allowed maximum', () => {
    const simplified = simplifyShapePoints(circlePoints(240), CUSTOM_SHAPE_MAX_POINTS)
    expect(simplified.length).toBeLessThanOrEqual(CUSTOM_SHAPE_MAX_POINTS)
    expect(simplified.length).toBeGreaterThanOrEqual(8)
    expect(shapeArea(simplified)).toBeGreaterThan(0.7)
  })

  it('builds closed paths, with curves when smoothing is on', () => {
    const sharp = shapePathFromPoints(circlePoints(8), 0, 0, 100, 0)
    const smooth = shapePathFromPoints(circlePoints(8), 0, 0, 100, 1)
    expect(sharp.startsWith('M')).toBe(true)
    expect(sharp.endsWith('Z')).toBe(true)
    expect(sharp).not.toContain('C')
    expect(smooth).toContain('C')
    expect(smooth).not.toContain('NaN')
  })

  it('joins several contours in one path', () => {
    const shape: CustomShape = {
      contours: [createContour(circlePoints(10, 0.4), 0.4), createContour(circlePoints(10, 0.1), 0.9, 'cut')],
    }
    const path = customShapePath(shape, 0, 0, 100)
    expect(path.match(/M/g)).toHaveLength(2)
    expect(customShapePath(null, 0, 0, 100)).toBe('')
  })

  it('cuts a hole into a custom eye frame', () => {
    const path = customFramePath(shapeOf(), 0, 0, 70)
    expect(path.match(/M/g)).toHaveLength(2)
    expect(customFramePath(null, 0, 0, 70)).toBe('')
  })

  it('validates shapes with too few points', () => {
    expect(isValidCustomShape(shapeOf(circlePoints(3)))).toBe(true)
    expect(isValidCustomShape(shapeOf(circlePoints(2)))).toBe(false)
    expect(isValidCustomShape(null)).toBe(false)
    expect(isValidCustomShape({ contours: [] })).toBe(false)
  })
})

describe('custom shape rendering', () => {
  const shape = shapeOf()

  it('replaces every module with the custom silhouette', () => {
    const svg = buildQrContents(data, customization({ dotStyle: 'custom', customBody: shape }), 512)
    expect(svg).toContain('id="qr-custom-body"')
    expect(svg).toContain('<use href="#qr-custom-body"')
    expect(svg).not.toContain('NaN')
  })

  it('draws custom eye frame and ball variants', () => {
    const svg = buildQrContents(
      data,
      customization({
        cornerSquareStyle: 'custom',
        customFrame: shape,
        cornerDotStyle: 'custom',
        customBall: shape,
      }),
      512,
    )
    expect(svg).toContain('fill-rule="evenodd"')
    expect(svg).not.toContain('undefined')
    expect(svg.length).toBeGreaterThan(500)
  })

  it('renders cut contours as holes in the module shape', () => {
    const withEyes: CustomShape = {
      contours: [createContour(circlePoints(14, 0.48), 0.6), createContour(circlePoints(10, 0.1), 0.6, 'cut')],
    }
    const svg = buildQrContents(data, customization({ dotStyle: 'custom', customBody: withEyes }), 256)
    const defs = svg.match(/<path id="qr-custom-body" d="([^"]+)"/)?.[1] ?? ''
    expect(defs.match(/M/g)).toHaveLength(2)
  })

  it('falls back to the built-in shape when the custom one is empty', () => {
    const svg = buildQrContents(data, customization({ dotStyle: 'custom', customBody: null }), 256)
    expect(svg).not.toContain('qr-custom-body')
    expect(svg).toContain('<path d="M')
  })

  it('warns when a custom body is too thin', () => {
    const thin = shapeOf(
      [
        { x: 0.45, y: 0.45 },
        { x: 0.55, y: 0.45 },
        { x: 0.55, y: 0.48 },
        { x: 0.45, y: 0.48 },
      ],
    )
    expect(getCustomizationWarnings(customization({ dotStyle: 'custom', customBody: thin }))).toContain(
      'A saját testforma túl kevés tintát használ. Vastagítsd az alakzatot, különben nem olvasható a kód.',
    )
    expect(getCustomizationWarnings(customization({ dotStyle: 'custom', customBody: shape }))).toHaveLength(0)
  })

  it('clones custom shapes deeply', () => {
    const source = customization({ customBall: shape })
    const clone = cloneCustomization(source)
    expect(clone.customBall?.contours[0]?.points).toHaveLength(12)
    expect(clone.customBall).not.toBe(source.customBall)
    const cloned = cloneCustomShape(shape)!
    cloned.contours[0]!.points[0]!.x = 0.99
    expect(shape.contours[0]!.points[0]!.x).not.toBe(0.99)
  })
})
