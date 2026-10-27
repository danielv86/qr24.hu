import type { CornerDotStyle, CornerSquareStyle, DotStyle } from '#shared/qr/types'

/**
 * A QR-kód formakészlete. Minden alak egyetlen modul (vagy sarokelem) helyére
 * rajzol SVG path-ot. A path-ok 1 egységes koordinátarendszerben készülnek,
 * így ugyanaz a függvény szolgálja ki az előnézetet, az exportot és a
 * választócsempéket is.
 */

export interface ShapeOption<T extends string> {
  value: T
  label: string
}

export interface ShapeDefinition<T extends string> extends ShapeOption<T> {
  /** (x, y) a forma bal felső sarka, s az oldalhossza. */
  path: (x: number, y: number, s: number) => string
}

const round = (value: number): number => Math.round(value * 100) / 100

export function circlePath(cx: number, cy: number, r: number): string {
  const radius = Math.max(0, r)
  return `M${round(cx - radius)} ${round(cy)}a${round(radius)} ${round(radius)} 0 1 0 ${round(radius * 2)} 0a${round(radius)} ${round(radius)} 0 1 0 ${round(-radius * 2)} 0Z`
}

export function polygonPath(points: [number, number][]): string {
  return `${points.map(([px, py], index) => `${index === 0 ? 'M' : 'L'}${round(px)} ${round(py)}`).join('')}Z`
}

/** Lekerekített téglalap ívmetszésekkel, sarokként külön sugárral. */
export function roundRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | [number, number, number, number],
): string {
  const limit = Math.min(width, height) / 2
  const radii = Array.isArray(radius) ? radius : [radius, radius, radius, radius]
  const clamp = (value: number | undefined) => Math.min(Math.max(value ?? 0, 0), limit)
  const tl = clamp(radii[0])
  const tr = clamp(radii[1])
  const br = clamp(radii[2])
  const bl = clamp(radii[3])
  const right = x + width
  const bottom = y + height
  const parts = [`M${round(x + tl)} ${round(y)}`, `H${round(right - tr)}`]
  if (tr > 0) parts.push(`A${round(tr)} ${round(tr)} 0 0 1 ${round(right)} ${round(y + tr)}`)
  parts.push(`V${round(bottom - br)}`)
  if (br > 0) parts.push(`A${round(br)} ${round(br)} 0 0 1 ${round(right - br)} ${round(bottom)}`)
  parts.push(`H${round(x + bl)}`)
  if (bl > 0) parts.push(`A${round(bl)} ${round(bl)} 0 0 1 ${round(x)} ${round(bottom - bl)}`)
  parts.push(`V${round(y + tl)}`)
  if (tl > 0) parts.push(`A${round(tl)} ${round(tl)} 0 0 1 ${round(x + tl)} ${round(y)}`)
  parts.push('Z')
  return parts.join('')
}

function starPath(cx: number, cy: number, outer: number, inner: number, points = 4): string {
  const coords: [number, number][] = []
  const step = Math.PI / points
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outer : inner
    const angle = -Math.PI / 2 + index * step
    coords.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius])
  }
  return polygonPath(coords)
}

function sparklePath(cx: number, cy: number, radius: number, waist: number): string {
  const x = round(cx)
  const y = round(cy)
  return [
    `M${x} ${round(cy - radius)}`,
    `Q${round(cx + waist)} ${round(cy - waist)} ${round(cx + radius)} ${y}`,
    `Q${round(cx + waist)} ${round(cy + waist)} ${x} ${round(cy + radius)}`,
    `Q${round(cx - waist)} ${round(cy + waist)} ${round(cx - radius)} ${y}`,
    `Q${round(cx - waist)} ${round(cy - waist)} ${x} ${round(cy - radius)}`,
    'Z',
  ].join('')
}

function hexagonPath(cx: number, cy: number, radius: number): string {
  const coords: [number, number][] = []
  for (let index = 0; index < 6; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI) / 3
    coords.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius])
  }
  return polygonPath(coords)
}

function trianglePath(cx: number, cy: number, radius: number): string {
  const coords: [number, number][] = []
  for (let index = 0; index < 3; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / 3
    coords.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius])
  }
  return polygonPath(coords)
}

function plusPath(cx: number, cy: number, half: number, arm: number, rotation = 0): string {
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const raw: [number, number][] = [
    [-arm, -half],
    [arm, -half],
    [arm, -arm],
    [half, -arm],
    [half, arm],
    [arm, arm],
    [arm, half],
    [-arm, half],
    [-arm, arm],
    [-half, arm],
    [-half, -arm],
    [-arm, -arm],
  ]
  return polygonPath(
    raw.map(([px, py]) => [cx + px * cos - py * sin, cy + px * sin + py * cos] as [number, number]),
  )
}

function ringPath(cx: number, cy: number, outer: number, inner: number): string {
  return `${circlePath(cx, cy, outer)}${circlePath(cx, cy, inner)}`
}

function diagonalPath(x: number, y: number, s: number): string {
  const cx = x + s / 2
  const cy = y + s / 2
  const halfLength = s * 0.36
  const halfWidth = s * 0.14
  const cos = Math.SQRT1_2
  const sin = Math.SQRT1_2
  const local: [number, number][] = [
    [-halfLength, -halfWidth],
    [halfLength, -halfWidth],
    [halfLength, halfWidth],
    [-halfLength, halfWidth],
  ]
  return polygonPath(
    local.map(([px, py]) => [cx + px * cos - py * sin, cy + px * sin + py * cos] as [number, number]),
  )
}

export const BODY_SHAPES: ShapeDefinition<DotStyle>[] = [
  { value: 'square', label: 'Négyzetes', path: (x, y, s) => roundRectPath(x, y, s, s, 0) },
  { value: 'rounded', label: 'Lekerekített', path: (x, y, s) => roundRectPath(x, y, s, s, s * 0.28) },
  { value: 'extra-rounded', label: 'Extra lekerekített', path: (x, y, s) => roundRectPath(x, y, s, s, s * 0.45) },
  { value: 'dots', label: 'Pontok', path: (x, y, s) => circlePath(x + s / 2, y + s / 2, s * 0.46) },
  {
    value: 'classy',
    label: 'Elegáns',
    path: (x, y, s) => roundRectPath(x, y, s, s, [s * 0.5, 0, s * 0.5, 0]),
  },
  {
    value: 'classy-rounded',
    label: 'Elegáns, lágy',
    path: (x, y, s) => roundRectPath(x, y, s, s, [s * 0.52, s * 0.3, s * 0.52, s * 0.3]),
  },
  {
    value: 'diamond',
    label: 'Rombusz',
    path: (x, y, s) => polygonPath([
      [x + s / 2, y],
      [x + s, y + s / 2],
      [x + s / 2, y + s],
      [x, y + s / 2],
    ]),
  },
  {
    value: 'leaf',
    label: 'Levél',
    path: (x, y, s) => roundRectPath(x, y, s, s, [s * 0.55, s * 0.55, 0, s * 0.55]),
  },
  {
    value: 'star',
    label: 'Csillag',
    path: (x, y, s) => starPath(x + s / 2, y + s / 2, s * 0.5, s * 0.2),
  },
  {
    value: 'hexagon',
    label: 'Hatszög',
    path: (x, y, s) => hexagonPath(x + s / 2, y + s / 2, s * 0.5),
  },
  {
    value: 'triangle',
    label: 'Háromszög',
    path: (x, y, s) => trianglePath(x + s / 2, y + s * 0.54, s * 0.52),
  },
  {
    value: 'cross',
    label: 'Kereszt',
    path: (x, y, s) => plusPath(x + s / 2, y + s / 2, s * 0.5, s * 0.17),
  },
  {
    value: 'vertical',
    label: 'Függőleges sáv',
    path: (x, y, s) => roundRectPath(x + s * 0.24, y, s * 0.52, s, s * 0.26),
  },
  {
    value: 'horizontal',
    label: 'Vízszintes sáv',
    path: (x, y, s) => roundRectPath(x, y + s * 0.24, s, s * 0.52, s * 0.26),
  },
  { value: 'tiny', label: 'Apró pontok', path: (x, y, s) => circlePath(x + s / 2, y + s / 2, s * 0.33) },
  {
    value: 'ring',
    label: 'Gyűrű',
    // A gyűrű közepe sötét marad, különben a beolvasó világos modult látna.
    path: (x, y, s) => `${ringPath(x + s / 2, y + s / 2, s * 0.47, s * 0.26)}${circlePath(x + s / 2, y + s / 2, s * 0.16)}`,
  },
  {
    value: 'grid',
    label: 'Rács',
    // Külső keret, fehér rés és sötét mag – a modul közepe mindig sötét.
    path: (x, y, s) => `${roundRectPath(x, y, s, s, s * 0.08)}${roundRectPath(
      x + s * 0.28,
      y + s * 0.28,
      s * 0.44,
      s * 0.44,
      s * 0.06,
    )}${roundRectPath(x + s * 0.34, y + s * 0.34, s * 0.32, s * 0.32, s * 0.05)}`,
  },
  { value: 'diagonal', label: 'Átlós sáv', path: diagonalPath },
  {
    value: 'wave',
    label: 'Hullám',
    path: (x, y, s) => {
      const top = round(y + s * 0.28)
      const bottom = round(y + s * 0.56)
      return `M${round(x)} ${top}Q${round(x + s * 0.25)} ${round(y)} ${round(x + s * 0.5)} ${top}Q${round(x + s * 0.75)} ${bottom} ${round(x + s)} ${top}V${round(y + s)}H${round(x)}Z`
    },
  },
  { value: 'sparkle', label: 'Szikra', path: (x, y, s) => sparklePath(x + s / 2, y + s / 2, s * 0.5, s * 0.16) },
]

export const EYE_FRAME_SHAPES: ShapeDefinition<CornerSquareStyle>[] = [
  {
    value: 'square',
    label: 'Négyzetes',
    path: (x, y, s) => `${roundRectPath(x, y, s, s, 0)}${roundRectPath(x + s / 7, y + s / 7, s * 5 / 7, s * 5 / 7, 0)}`,
  },
  {
    value: 'extra-rounded',
    label: 'Lekerekített',
    path: (x, y, s) => {
      const u = s / 7
      return `${roundRectPath(x, y, s, s, u * 1.7)}${roundRectPath(x + u, y + u, u * 5, u * 5, u * 1.15)}`
    },
  },
  {
    value: 'dot',
    label: 'Kör',
    path: (x, y, s) => {
      const u = s / 7
      return `${circlePath(x + s / 2, y + s / 2, u * 3.5)}${circlePath(x + s / 2, y + s / 2, u * 2.5)}`
    },
  },
  {
    value: 'squircle',
    label: 'Kerekedő',
    path: (x, y, s) => {
      const u = s / 7
      return `${roundRectPath(x, y, s, s, u * 2.7)}${roundRectPath(x + u, y + u, u * 5, u * 5, u * 1.9)}`
    },
  },
  {
    value: 'leaf',
    label: 'Levél',
    path: (x, y, s) => {
      const u = s / 7
      return `${roundRectPath(x, y, s, s, [u * 2.6, u * 0.7, u * 2.6, u * 2.6])}${roundRectPath(x + u, y + u, u * 5, u * 5, [u * 2.1, u * 0.3, u * 2.1, u * 2.1])}`
    },
  },
  {
    value: 'cut',
    label: 'Vágott sarkú',
    path: (x, y, s) => {
      const u = s / 7
      const chamfer = u * 1.5
      const inner = u
      return `${octagonPath(x, y, s, chamfer)}${octagonPath(x + inner, y + inner, s - inner * 2, u * 1.1)}`
    },
  },
  {
    value: 'diamond',
    label: 'Rombusz',
    path: (x, y, s) => {
      const cx = x + s / 2
      const cy = y + s / 2
      return `${polygonPath([
        [cx, y],
        [x + s, cy],
        [cx, y + s],
        [x, cy],
      ])}${polygonPath([
        [cx, y + s / 7],
        [x + s * 6 / 7, cy],
        [cx, y + s * 6 / 7],
        [x + s / 7, cy],
      ])}`
    },
  },
  {
    value: 'thin',
    label: 'Vékony',
    path: (x, y, s) => {
      const u = s / 7
      return `${roundRectPath(x, y, s, s, u * 0.9)}${roundRectPath(x + u * 0.62, y + u * 0.62, s - u * 1.24, s - u * 1.24, u * 0.7)}`
    },
  },
  {
    value: 'thick',
    label: 'Vastag',
    path: (x, y, s) => {
      const u = s / 7
      return `${roundRectPath(x, y, s, s, u * 1.2)}${roundRectPath(x + u * 1.4, y + u * 1.4, s - u * 2.8, s - u * 2.8, u * 0.9)}`
    },
  },
  {
    value: 'brackets',
    label: 'Sarokjelölők',
    path: (x, y, s) => {
      const u = s / 7
      const thickness = u * 1.15
      const length = u * 2.7
      const radius = u * 0.5
      const r = x + s
      const b = y + s
      return [
        roundRectPath(x, y, length, thickness, radius),
        roundRectPath(x, y, thickness, length, radius),
        roundRectPath(r - length, y, length, thickness, radius),
        roundRectPath(r - thickness, y, thickness, length, radius),
        roundRectPath(x, b - thickness, length, thickness, radius),
        roundRectPath(x, b - length, thickness, length, radius),
        roundRectPath(r - length, b - thickness, length, thickness, radius),
        roundRectPath(r - thickness, b - length, thickness, length, radius),
      ].join('')
    },
  },
  {
    value: 'dots',
    label: 'Pontsor',
    path: (x, y, s) => {
      const cx = x + s / 2
      const cy = y + s / 2
      const radius = s * 0.44
      const dot = s * 0.062
      let d = ''
      for (let index = 0; index < 16; index += 1) {
        const angle = (index * Math.PI * 2) / 16
        d += circlePath(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, dot)
      }
      return d
    },
  },
  {
    value: 'pill',
    label: 'Kapszula',
    path: (x, y, s) => {
      const u = s / 7
      return `${roundRectPath(x, y + u * 0.5, s, s - u, u * 3)}${roundRectPath(x + u, y + u * 1.5, u * 5, u * 4, u * 1.9)}`
    },
  },
  {
    value: 'hexagon',
    label: 'Hatszög',
    path: (x, y, s) => {
      const cx = x + s / 2
      const cy = y + s / 2
      return `${hexagonPath(cx, cy, s / 2)}${hexagonPath(cx, cy, s * 5 / 14)}`
    },
  },
  {
    value: 'sparkle',
    label: 'Szikra',
    path: (x, y, s) => {
      const cx = x + s / 2
      const cy = y + s / 2
      return `${starPath(cx, cy, s / 2, s * 0.16)}${circlePath(cx, cy, s * 0.24)}`
    },
  },
]

/**
 * A sarokelem belseje. A `s` mindig a 3 × 3 modulnyi belső négyzet, ezért a
 * formák ennek a teljes területét kitöltik: így marad a szabványos 1 : 1 : 1
 * arány a hétsoros sötét gyűrű, a fehér gyűrű és a belső mag között.
 */
export const EYE_BALL_SHAPES: ShapeDefinition<CornerDotStyle>[] = [
  {
    value: 'square',
    label: 'Négyzetes',
    path: (x, y, s) => roundRectPath(x, y, s, s, 0),
  },
  {
    value: 'dot',
    label: 'Kör',
    path: (x, y, s) => circlePath(x + s / 2, y + s / 2, s / 2),
  },
  {
    value: 'circle-small',
    label: 'Kis kör',
    path: (x, y, s) => circlePath(x + s / 2, y + s / 2, s * 0.34),
  },
  {
    value: 'rounded',
    label: 'Lekerekített',
    path: (x, y, s) => roundRectPath(x, y, s, s, s * 0.3),
  },
  {
    value: 'leaf',
    label: 'Levél',
    path: (x, y, s) => roundRectPath(x, y, s, s, [s * 0.5, s * 0.06, s * 0.5, s * 0.5]),
  },
  {
    value: 'diamond',
    label: 'Rombusz',
    path: (x, y, s) => {
      const cx = x + s / 2
      const cy = y + s / 2
      const r = s / 2
      return polygonPath([
        [cx, cy - r],
        [cx + r, cy],
        [cx, cy + r],
        [cx - r, cy],
      ])
    },
  },
  {
    value: 'star',
    label: 'Csillag',
    path: (x, y, s) => starPath(x + s / 2, y + s / 2, s * 0.5, s * 0.2),
  },
  {
    value: 'cross',
    label: 'Kereszt',
    path: (x, y, s) => plusPath(x + s / 2, y + s / 2, s / 2, s * 0.16, Math.PI / 4),
  },
  {
    value: 'plus',
    label: 'Plusz',
    path: (x, y, s) => plusPath(x + s / 2, y + s / 2, s / 2, s * 0.15),
  },
  {
    value: 'hexagon',
    label: 'Hatszög',
    path: (x, y, s) => hexagonPath(x + s / 2, y + s / 2, s / 2),
  },
  {
    value: 'triangle',
    label: 'Háromszög',
    path: (x, y, s) => trianglePath(x + s / 2, y + s * 0.52, s * 0.54),
  },
  {
    value: 'ring',
    label: 'Gyűrű',
    path: (x, y, s) => ringPath(x + s / 2, y + s / 2, s / 2, s * 0.22),
  },
  {
    value: 'bars-h',
    label: 'Vízszintes sávok',
    path: (x, y, s) => {
      const barHeight = s * 0.22
      return [0, 1, 2]
        .map(index => roundRectPath(x + s * 0.06, y + s * 0.14 + index * s * 0.26, s * 0.88, barHeight, barHeight / 2))
        .join('')
    },
  },
  {
    value: 'bars-v',
    label: 'Függőleges sávok',
    path: (x, y, s) => {
      const barWidth = s * 0.22
      return [0, 1, 2]
        .map(index => roundRectPath(x + s * 0.14 + index * s * 0.26, y + s * 0.06, barWidth, s * 0.88, barWidth / 2))
        .join('')
    },
  },
  {
    value: 'dots4',
    label: 'Négy pont',
    path: (x, y, s) => {
      const dot = s * 0.16
      const offsets: [number, number][] = [
        [0.25, 0.25],
        [0.75, 0.25],
        [0.25, 0.75],
        [0.75, 0.75],
      ]
      return offsets.map(([ox, oy]) => circlePath(x + s * ox, y + s * oy, dot)).join('')
    },
  },
  {
    value: 'sparkle',
    label: 'Szikra',
    path: (x, y, s) => sparklePath(x + s / 2, y + s / 2, s * 0.52, s * 0.16),
  },
  {
    value: 'half',
    label: 'Félhold',
    path: (x, y, s) => {
      const cx = x + s / 2
      const r = s * 0.5
      const cy = y + s * 0.5
      return `M${round(cx - r)} ${round(cy)}a${round(r)} ${round(r)} 0 0 1 ${round(r * 2)} 0Z`
    },
  },
]

function octagonPath(x: number, y: number, s: number, chamfer: number): string {
  const c = Math.min(chamfer, s / 2)
  return polygonPath([
    [x + c, y],
    [x + s - c, y],
    [x + s, y + c],
    [x + s, y + s - c],
    [x + s - c, y + s],
    [x + c, y + s],
    [x, y + s - c],
    [x, y + c],
  ])
}

const bodyIndex = new Map(BODY_SHAPES.map(shape => [shape.value, shape]))
const eyeFrameIndex = new Map(EYE_FRAME_SHAPES.map(shape => [shape.value, shape]))
const eyeBallIndex = new Map(EYE_BALL_SHAPES.map(shape => [shape.value, shape]))

export function bodyShapePath(style: DotStyle): ShapeDefinition<DotStyle>['path'] {
  return (bodyIndex.get(style) ?? BODY_SHAPES[0]!).path
}

export function eyeFrameShapePath(style: CornerSquareStyle): ShapeDefinition<CornerSquareStyle>['path'] {
  return (eyeFrameIndex.get(style) ?? EYE_FRAME_SHAPES[0]!).path
}

export function eyeBallShapePath(style: CornerDotStyle): ShapeDefinition<CornerDotStyle>['path'] {
  return (eyeBallIndex.get(style) ?? EYE_BALL_SHAPES[0]!).path
}
