import { describe, expect, it } from 'vitest'
import { BODY_SHAPES, EYE_BALL_SHAPES, EYE_FRAME_SHAPES, bodyShapePath, eyeBallShapePath, eyeFrameShapePath } from '~/lib/qr/shapes'
import { buildQrContents, buildQrMatrix } from '../app/utils/qr-render'
import { DEFAULT_CUSTOMIZATION } from '~/lib/qr/customization'
import type { QrCustomization } from '~/lib/qr/types'

function customization(overrides: Partial<QrCustomization> = {}): QrCustomization {
  return { ...DEFAULT_CUSTOMIZATION, ...overrides }
}

const EXPECTED_MODULE_COUNT = /^[MLHVQAZmlhvqaz0-9.\- ,]+$/

describe('shape library', () => {
  it('offers 20 body, 14 eye frame and 17 eye ball variants', () => {
    expect(BODY_SHAPES).toHaveLength(20)
    expect(EYE_FRAME_SHAPES).toHaveLength(14)
    expect(EYE_BALL_SHAPES).toHaveLength(17)
  })

  it('has unique ids and a Hungarian label for every shape', () => {
    for (const group of [BODY_SHAPES, EYE_FRAME_SHAPES, EYE_BALL_SHAPES]) {
      expect(new Set(group.map(shape => shape.value)).size).toBe(group.length)
      for (const shape of group) expect(shape.label.length).toBeGreaterThan(2)
    }
  })

  it('draws every variant with a closed SVG path', () => {
    for (const shape of [...BODY_SHAPES, ...EYE_FRAME_SHAPES, ...EYE_BALL_SHAPES]) {
      const d = shape.path(10, 20, 30)
      expect(d.length).toBeGreaterThan(10)
      expect(d.startsWith('M')).toBe(true)
      expect(d.endsWith('Z')).toBe(true)
      expect(d).toMatch(EXPECTED_MODULE_COUNT)
      expect(d).not.toContain('NaN')
      expect(d).not.toContain('undefined')
    }
  })

  it('falls back to the first variant for unknown styles', () => {
    expect(bodyShapePath('square' as never)(0, 0, 10)).toBe(BODY_SHAPES[0]!.path(0, 0, 10))
    expect(() => eyeFrameShapePath('unknown' as never)).not.toThrow()
    expect(() => eyeBallShapePath('unknown' as never)).not.toThrow()
  })
})

describe('QR matrix', () => {
  it('builds a square matrix for UTF-8 content', () => {
    const matrix = buildQrMatrix('Árvíztűrő tükörfúrógép – https://qr24.hu', 'M')
    expect(matrix.length).toBeGreaterThanOrEqual(21)
    expect(matrix.every(row => row.length === matrix.length)).toBe(true)
    const dark = matrix.flat().filter(Boolean).length
    expect(dark).toBeGreaterThan(matrix.length * matrix.length * 0.25)
  })

  it('keeps the three finder patterns intact', () => {
    const matrix = buildQrMatrix('https://qr24.hu', 'Q')
    expect(matrix[0]![0]).toBe(true)
    expect(matrix[0]![matrix.length - 1]).toBe(true)
    expect(matrix[matrix.length - 1]![0]).toBe(true)
    expect(matrix[3]![3]).toBe(true)
    expect(matrix[5]![5]).toBe(false)
  })
})

describe('custom renderer', () => {
  it('renders body, eye frame and eye ball paths for the selected shapes', () => {
    const contents = buildQrContents(
      'https://qr24.hu',
      customization({ dotStyle: 'star', cornerSquareStyle: 'brackets', cornerDotStyle: 'dots4' }),
      512,
    )
    expect(contents.match(/<path /g)).toHaveLength(3)
    expect(contents).toContain('fill-rule="evenodd"')
    expect(contents).not.toContain('NaN')
  })

  it('embeds gradients and the logo when requested', () => {
    const contents = buildQrContents(
      'https://qr24.hu',
      customization({
        bodyFill: { kind: 'linear', color: '#2563EB', color2: '#0F172A', rotation: 45 },
        logo: 'data:image/png;base64,AAAA',
        logoName: 'logo.png',
      }),
      256,
    )
    expect(contents).toContain('<linearGradient')
    expect(contents).toContain('url(#qr-grad-')
    expect(contents).toContain('<image')
    expect(contents).toContain('data:image/png;base64,AAAA')
  })

  it('scales the quiet zone with the requested size', () => {
    const minX = (contents: string) =>
      Math.min(...[...contents.matchAll(/M(-?[\d.]+) /g)].map(match => Number(match[1])))

    const withMargin = buildQrContents('https://qr24.hu', customization({ margin: 64 }), 512)
    const withoutMargin = buildQrContents('https://qr24.hu', customization({ margin: 0 }), 512)

    // 64 px a 1024 px-es referenciamérethez van arányosítva, 512 px-en 32 px.
    expect(minX(withMargin)).toBeCloseTo(32, 0)
    expect(minX(withoutMargin)).toBeCloseTo(0, 0)
  })
})
