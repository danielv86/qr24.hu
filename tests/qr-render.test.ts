import { describe, expect, it } from 'vitest'
import {
  BODY_SHAPES,
  EMPTY_NEIGHBOURS,
  EYE_BALL_SHAPES,
  EYE_FRAME_SHAPES,
  bodyShapePath,
  eyeBallShapePath,
  eyeFrameShapePath,
} from '~/lib/qr/shapes'
import { buildQrContents, buildQrMatrix } from '../app/utils/qr-render'
import { DEFAULT_CUSTOMIZATION } from '~/lib/qr/customization'
import type { QrCustomization } from '#shared/qr/types'

function customization(overrides: Partial<QrCustomization> = {}): QrCustomization {
  return { ...DEFAULT_CUSTOMIZATION, ...overrides }
}

const EXPECTED_MODULE_COUNT = /^[MLHVQCAZmlhvqcaz0-9.\- ,]+$/

describe('shape library', () => {
  it('offers 35 body, 35 eye frame and 35 eye ball variants', () => {
    expect(BODY_SHAPES).toHaveLength(35)
    expect(EYE_FRAME_SHAPES).toHaveLength(35)
    expect(EYE_BALL_SHAPES).toHaveLength(35)
  })

  it('has unique ids and a Hungarian label for every shape', () => {
    for (const group of [BODY_SHAPES, EYE_FRAME_SHAPES, EYE_BALL_SHAPES]) {
      expect(new Set(group.map(shape => shape.value)).size).toBe(group.length)
      for (const shape of group) expect(shape.label.length).toBeGreaterThan(2)
    }
  })

  it('a sarokelem belseje kitölti a teljes 3 × 3-as mezőt', () => {
    // A mag csak akkor marad olvasható, ha kitölti a 3 × 3-as mezőt, mert így
    // lesz a keresőminta 1 : 1 : 1 arányú.
    const bounds = (d: string) => {
      const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
      return { min: Math.min(...numbers), max: Math.max(...numbers) }
    }
    for (const value of ['square', 'dot', 'rounded', 'extra-rounded', 'diamond', 'leaf'] as const) {
      const shape = EYE_BALL_SHAPES.find(item => item.value === value)!
      const { max } = bounds(shape.path(0, 0, 3, 1))
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
    const paths = [
      ...BODY_SHAPES.map(shape => shape.path(10, 20, 30, EMPTY_NEIGHBOURS, 3, 4)),
      ...EYE_FRAME_SHAPES.map(shape => shape.path(10, 20, 70, 10)),
      ...EYE_BALL_SHAPES.map(shape => shape.path(10, 20, 30, 10)),
    ]
    for (const d of paths) {
      expect(d.length).toBeGreaterThan(10)
      expect(d.startsWith('M')).toBe(true)
      expect(d.endsWith('Z')).toBe(true)
      expect(d).toMatch(EXPECTED_MODULE_COUNT)
      expect(d).not.toContain('NaN')
      expect(d).not.toContain('undefined')
    }
  })

  it('falls back to the first variant for unknown styles', () => {
    expect(bodyShapePath('square' as never)(0, 0, 10, EMPTY_NEIGHBOURS, 0, 0)).toBe(
      BODY_SHAPES[0]!.path(0, 0, 10, EMPTY_NEIGHBOURS, 0, 0),
    )
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
      customization({ dotStyle: 'heart', cornerSquareStyle: 'dots-ring', cornerDotStyle: 'dots9' }),
      512,
    )
    // 1 test path + 3 sarokkeret + 3 sarokbelső (a két elforgatott külön csoportban).
    expect(contents.match(/<path /g)).toHaveLength(7)
    expect(contents).toContain('fill-rule="evenodd"')
    expect(contents).toContain('rotate(-90')
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
