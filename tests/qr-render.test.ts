import { describe, expect, it } from 'vitest'
import { BODY_SHAPES, EYE_BALL_SHAPES, EYE_FRAME_SHAPES, bodyShapePath, eyeBallShapePath, eyeFrameShapePath } from '~/lib/qr/shapes'
import { buildQrContents, buildQrMatrix } from '../app/utils/qr-render'
import { DEFAULT_CUSTOMIZATION } from '~/lib/qr/customization'
import type { QrCustomization } from '#shared/qr/types'

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

  it('a sarokelem belseje kitölti a teljes 3 × 3-as mezőt', () => {
    // Korábban a mag csak 2 modul széles volt, ezért a keresőminta 1 : 1,5 : 2
    // arányú lett, és a telefonok nem találták meg a kódot.
    const bounds = (d: string) => {
      const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
      return { min: Math.min(...numbers), max: Math.max(...numbers) }
    }
    for (const value of ['square', 'dot', 'rounded', 'hexagon', 'diamond', 'leaf'] as const) {
      const shape = EYE_BALL_SHAPES.find(item => item.value === value)!
      const { max } = bounds(shape.path(0, 0, 3))
      expect(max).toBeGreaterThanOrEqual(2.9)
    }
  })

  it('a sarokelemek szabványos 7 × 7-es keresőmintát adnak', () => {
    const matrix = buildQrMatrix('https://qrkod24.hu', 'Q')
    for (let row = 0; row < 7; row += 1) {
      for (let column = 0; column < 7; column += 1) {
        const ring = row === 0 || row === 6 || column === 0 || column === 6
        const core = row >= 2 && row <= 4 && column >= 2 && column <= 4
        expect(matrix[row]![column]).toBe(ring || core)
      }
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
    const matrix = buildQrMatrix('Árvíztűrő tükörfúrógép – https://qrkod24.hu', 'M')
    expect(matrix.length).toBeGreaterThanOrEqual(21)
    expect(matrix.every(row => row.length === matrix.length)).toBe(true)
    const dark = matrix.flat().filter(Boolean).length
    expect(dark).toBeGreaterThan(matrix.length * matrix.length * 0.25)
  })

  it('keeps the three finder patterns intact', () => {
    const matrix = buildQrMatrix('https://qrkod24.hu', 'Q')
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
      'https://qrkod24.hu',
      customization({ dotStyle: 'star', cornerSquareStyle: 'brackets', cornerDotStyle: 'dots4' }),
      512,
    )
    expect(contents.match(/<path /g)).toHaveLength(3)
    expect(contents).toContain('fill-rule="evenodd"')
    expect(contents).not.toContain('NaN')
  })

  it('embeds gradients and the logo when requested', () => {
    const contents = buildQrContents(
      'https://qrkod24.hu',
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

  it('keeps the quiet zone at least as wide as the requested modules', () => {
    const minX = (contents: string) =>
      Math.min(...[...contents.matchAll(/M(-?[\d.]+) /g)].map(match => Number(match[1])))

    const count = buildQrMatrix('https://qrkod24.hu', 'Q').length
    const withMargin = buildQrContents('https://qrkod24.hu', customization({ margin: 4 }), 512)
    const withoutMargin = buildQrContents('https://qrkod24.hu', customization({ margin: 0 }), 512)

    const cell = 512 / (count + 8)
    // Az SVG-koordináták két tizedesre kerekítettek.
    expect(minX(withMargin)).toBeCloseTo(cell * 4, 2)
    expect(minX(withoutMargin)).toBeCloseTo(0, 2)
  })
})
