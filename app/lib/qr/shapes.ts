import type { CornerDotStyle, CornerSquareStyle, DotStyle } from '#shared/qr/types'

/**
 * A QR-kód formakészlete a qrcode-24.com motorjának geometriáját követi, hogy
 * a választható formák vizuálisan ugyanazok legyenek. Minden alak SVG path-ot
 * ad vissza egyetlen modulra (test), a 7 × 7-es keresőmintára (sarokkeret)
 * vagy a 3 × 3-as magra (sarokbelseje).
 */

export interface Neighbours {
  t: boolean
  r: boolean
  b: boolean
  l: boolean
  tl: boolean
  tr: boolean
  bl: boolean
  br: boolean
}

/** (x, y) a modul bal felső sarka, m az oldalhossz, n a szomszédok. */
export type BodyPath = (x: number, y: number, m: number, n: Neighbours, row: number, col: number) => string

/** A sarokformáknál s a teljes minta éle, m egy modul szélessége. */
export type EyePath = (x: number, y: number, s: number, m: number) => string

export interface ShapeOption<T extends string> {
  value: T
  label: string
}

export interface BodyShape extends ShapeOption<DotStyle> {
  path: BodyPath
}

export interface EyeFrameShape extends ShapeOption<CornerSquareStyle> {
  path: EyePath
}

export interface EyeBallShape extends ShapeOption<CornerDotStyle> {
  path: EyePath
}

const f = (value: number): number => Math.round(value * 100) / 100

/* ---------- geometriai segédfüggvények ---------- */

/** Óramutató járásával megegyező téglalap, sarokként külön sugárral. */
function rrect(
  x: number,
  y: number,
  w: number,
  h: number,
  tl = 0,
  tr = 0,
  br = 0,
  bl = 0,
): string {
  let p = `M${f(x + tl)} ${f(y)}H${f(x + w - tr)}`
  if (tr) p += `A${f(tr)} ${f(tr)} 0 0 1 ${f(x + w)} ${f(y + tr)}`
  p += `V${f(y + h - br)}`
  if (br) p += `A${f(br)} ${f(br)} 0 0 1 ${f(x + w - br)} ${f(y + h)}`
  p += `H${f(x + bl)}`
  if (bl) p += `A${f(bl)} ${f(bl)} 0 0 1 ${f(x)} ${f(y + h - bl)}`
  p += `V${f(y + tl)}`
  if (tl) p += `A${f(tl)} ${f(tl)} 0 0 1 ${f(x + tl)} ${f(y)}`
  return `${p}Z`
}

function rect(x: number, y: number, w: number, h: number): string {
  return `M${f(x)} ${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}Z`
}

function circle(cx: number, cy: number, r: number): string {
  return (
    `M${f(cx - r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 1 ${f(cx + r)} ${f(cy)}` +
    `A${f(r)} ${f(r)} 0 1 1 ${f(cx - r)} ${f(cy)}Z`
  )
}

/** Lapos [x0, y0, x1, y1, …] pontsor zárt sokszöge. */
function poly(points: number[]): string {
  let p = `M${f(points[0]!)} ${f(points[1]!)}`
  for (let index = 2; index < points.length; index += 2) {
    p += `L${f(points[index]!)} ${f(points[index + 1]!)}`
  }
  return `${p}Z`
}

function ngon(cx: number, cy: number, r: number, n: number, a0: number): string {
  const points: number[] = []
  for (let index = 0; index < n; index += 1) {
    const angle = a0 + (index * 2 * Math.PI) / n
    points.push(cx + r * Math.cos(angle), cy + r * Math.sin(angle))
  }
  return poly(points)
}

/** Levágott sarkú négyzet, minden sarkon c méretű vágással. */
function octagon(x: number, y: number, w: number, c: number): string {
  return poly([
    x + c, y,
    x + w - c, y,
    x + w, y + c,
    x + w, y + w - c,
    x + w - c, y + w,
    x + c, y + w,
    x, y + w - c,
    x, y + c,
  ])
}

/** Szuperellipszis-jellegű squircle; k = 0.5523 kör, k = 1 négyzet. */
function squircle(x: number, y: number, w: number, h: number, k: number): string {
  const cx = x + w / 2
  const cy = y + h / 2
  const kx = (k * w) / 2
  const ky = (k * h) / 2
  return (
    `M${f(cx)} ${f(y)}` +
    `C${f(cx + kx)} ${f(y)} ${f(x + w)} ${f(cy - ky)} ${f(x + w)} ${f(cy)}` +
    `C${f(x + w)} ${f(cy + ky)} ${f(cx + kx)} ${f(y + h)} ${f(cx)} ${f(y + h)}` +
    `C${f(cx - kx)} ${f(y + h)} ${f(x)} ${f(cy + ky)} ${f(x)} ${f(cy)}` +
    `C${f(x)} ${f(cy - ky)} ${f(cx - kx)} ${f(y)} ${f(cx)} ${f(y)}Z`
  )
}

/** Párna: behúzott sarkok, kifelé domborodó élek. */
function pillow(x: number, y: number, w: number, inset: number): string {
  const c = w / 2
  return (
    `M${f(x + inset)} ${f(y + inset)}` +
    `Q${f(x + c)} ${f(y - inset)} ${f(x + w - inset)} ${f(y + inset)}` +
    `Q${f(x + w + inset)} ${f(y + c)} ${f(x + w - inset)} ${f(y + w - inset)}` +
    `Q${f(x + c)} ${f(y + w + inset)} ${f(x + inset)} ${f(y + w - inset)}` +
    `Q${f(x - inset)} ${f(y + c)} ${f(x + inset)} ${f(y + inset)}Z`
  )
}

/** Determinisztikus 0..1 érték a (sor, oszlop) párból. */
function hash(row: number, col: number, salt: number): number {
  let h = Math.imul(row + 1, 374761393) ^ Math.imul(col + 1, 668265263) ^ Math.imul(salt + 1, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return ((h >>> 0) % 10000) / 10000
}

/* ---------- test (adatmodul) formák ---------- */

/** Homorú ívek, amelyek kitöltik az átlósan szomszédos modulok közötti rést. */
function fillets(x: number, y: number, m: number, n: Neighbours, r: number): string {
  let p = ''
  if (n.t && n.l && !n.tl) p += `M${f(x)} ${f(y)}H${f(x - r)}A${f(r)} ${f(r)} 0 0 0 ${f(x)} ${f(y - r)}Z`
  if (n.t && n.r && !n.tr) {
    const X = x + m
    p += `M${f(X)} ${f(y)}V${f(y - r)}A${f(r)} ${f(r)} 0 0 0 ${f(X + r)} ${f(y)}Z`
  }
  if (n.b && n.r && !n.br) {
    const X = x + m
    const Y = y + m
    p += `M${f(X)} ${f(Y)}H${f(X + r)}A${f(r)} ${f(r)} 0 0 0 ${f(X)} ${f(Y + r)}Z`
  }
  if (n.b && n.l && !n.bl) {
    const Y = y + m
    p += `M${f(x)} ${f(Y)}V${f(Y + r)}A${f(r)} ${f(r)} 0 0 0 ${f(x - r)} ${f(Y)}Z`
  }
  return p
}

/** Sarok csak akkor kerekedik, ha mindkét szomszédos oldal szabad. */
function runs(x: number, y: number, m: number, n: Neighbours, rr: number): string {
  return rrect(
    x,
    y,
    m,
    m,
    !n.t && !n.l ? rr : 0,
    !n.t && !n.r ? rr : 0,
    !n.b && !n.r ? rr : 0,
    !n.b && !n.l ? rr : 0,
  )
}

export const BODY_SHAPES: BodyShape[] = [
  { value: 'square', label: 'Négyzet', path: (x, y, m) => rect(x, y, m, m) },
  { value: 'dots', label: 'Pontok', path: (x, y, m) => circle(x + m / 2, y + m / 2, m / 2) },
  { value: 'rounded', label: 'Lekerekített', path: (x, y, m, n) => runs(x, y, m, n, m / 2) },
  {
    value: 'extra-rounded',
    label: 'Erősen lekerekített',
    path: (x, y, m, n) => runs(x, y, m, n, m / 2) + fillets(x, y, m, n, m / 2),
  },
  {
    value: 'classy',
    label: 'Elegáns',
    path: (x, y, m, n) =>
      rrect(x, y, m, m, !n.t && !n.l ? m / 2 : 0, 0, !n.b && !n.r ? m / 2 : 0, 0),
  },
  {
    value: 'classy-rounded',
    label: 'Elegáns, lágy',
    path: (x, y, m, n) => {
      const rr = m / 2
      const rs = m * 0.2
      return rrect(
        x,
        y,
        m,
        m,
        !n.t && !n.l ? rr : 0,
        !n.t && !n.r ? rs : 0,
        !n.b && !n.r ? rr : 0,
        !n.b && !n.l ? rs : 0,
      )
    },
  },
  {
    value: 'small-square',
    label: 'Kis négyzetek',
    path: (x, y, m) => {
      const s = m * 0.72
      const o = (m - s) / 2
      return rect(x + o, y + o, s, s)
    },
  },
  { value: 'tiny-dots', label: 'Apró pontok', path: (x, y, m) => circle(x + m / 2, y + m / 2, m * 0.4) },
  {
    value: 'vertical-lines',
    label: 'Függőleges vonalak',
    path: (x, y, m, n) => {
      const w = m * 0.8
      const rr = w / 2
      return rrect(
        x + (m - w) / 2,
        y,
        w,
        m,
        n.t ? 0 : rr,
        n.t ? 0 : rr,
        n.b ? 0 : rr,
        n.b ? 0 : rr,
      )
    },
  },
  {
    value: 'horizontal-lines',
    label: 'Vízszintes vonalak',
    path: (x, y, m, n) => {
      const h = m * 0.8
      const rr = h / 2
      return rrect(
        x,
        y + (m - h) / 2,
        m,
        h,
        n.l ? 0 : rr,
        n.r ? 0 : rr,
        n.r ? 0 : rr,
        n.l ? 0 : rr,
      )
    },
  },
  {
    value: 'diamond',
    label: 'Rombusz',
    path: (x, y, m) => {
      const cx = x + m / 2
      const cy = y + m / 2
      const h = m * 0.56
      return poly([cx, cy - h, cx + h, cy, cx, cy + h, cx - h, cy])
    },
  },
  {
    value: 'star',
    label: 'Csillag',
    path: (x, y, m) => {
      const cx = x + m / 2
      const cy = y + m / 2
      const outer = m * 0.6
      const inner = outer * 0.5
      const points: number[] = []
      for (let index = 0; index < 10; index += 1) {
        const angle = -Math.PI / 2 + (index * Math.PI) / 5
        const radius = index % 2 ? inner : outer
        points.push(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle))
      }
      return poly(points)
    },
  },
  {
    value: 'cross',
    label: 'Kereszt',
    path: (x, y, m) => {
      const a = m * 0.05
      const b = m * 0.3
      const c = m * 0.7
      const d = m * 0.95
      return poly([
        x + b, y + a, x + c, y + a, x + c, y + b, x + d, y + b, x + d, y + c,
        x + c, y + c, x + c, y + d, x + b, y + d, x + b, y + c, x + a, y + c,
        x + a, y + b, x + b, y + b,
      ])
    },
  },
  {
    value: 'heart',
    label: 'Szív',
    path: (x, y, m) => {
      const s = m
      const P = (u: number, v: number) => `${f(x + u * s)} ${f(y + 0.02 * m + v * s * 0.96)}`
      return (
        `M${P(0.5, 1)}` +
        `C${P(0.15, 0.72)} ${P(0, 0.52)} ${P(0, 0.3)}` +
        `C${P(0, 0.12)} ${P(0.13, 0)} ${P(0.27, 0)}` +
        `C${P(0.38, 0)} ${P(0.46, 0.06)} ${P(0.5, 0.16)}` +
        `C${P(0.54, 0.06)} ${P(0.62, 0)} ${P(0.73, 0)}` +
        `C${P(0.87, 0)} ${P(1, 0.12)} ${P(1, 0.3)}` +
        `C${P(1, 0.52)} ${P(0.85, 0.72)} ${P(0.5, 1)}Z`
      )
    },
  },
  {
    value: 'hexagon',
    label: 'Hatszög',
    path: (x, y, m) => ngon(x + m / 2, y + m / 2, m * 0.54, 6, -Math.PI / 2),
  },
  {
    value: 'leaf',
    label: 'Levél',
    path: (x, y, m) => {
      const s = m * 0.94
      const o = (m - s) / 2
      return rrect(x + o, y + o, s, s, s * 0.5, 0, s * 0.5, 0)
    },
  },
  {
    value: 'leaf-inverse',
    label: 'Levél (fordított)',
    path: (x, y, m) => {
      const s = m * 0.94
      const o = (m - s) / 2
      return rrect(x + o, y + o, s, s, 0, s * 0.5, 0, s * 0.5)
    },
  },
  {
    value: 'rounded-square',
    label: 'Lekerekített négyzet',
    path: (x, y, m) => {
      const s = m * 0.84
      const o = (m - s) / 2
      return rrect(x + o, y + o, s, s, s * 0.26, s * 0.26, s * 0.26, s * 0.26)
    },
  },
  {
    value: 'mosaic',
    label: 'Mozaik',
    path: (x, y, m, _n, row, col) => {
      const s = m * (0.74 + 0.06 * Math.floor(hash(row, col, 1) * 5))
      const ox = (m - s) * hash(row, col, 2)
      const oy = (m - s) * hash(row, col, 3)
      return rect(x + ox, y + oy, s, s)
    },
  },
  {
    value: 'random-dots',
    label: 'Véletlen pontok',
    path: (x, y, m, _n, row, col) => circle(x + m / 2, y + m / 2, m * (0.4 + 0.1 * hash(row, col, 7))),
  },
]

/* ---------- sarokelem keretek ---------- */

/** Gyűrű: külső és belső körvonal, a belső egy modul vastagsággal beljebb. */
function rrRing(
  x: number,
  y: number,
  s: number,
  m: number,
  ro: number,
  ri: number,
  t: number,
  corners: [number, number, number, number] = [1, 1, 1, 1],
): string {
  const q = s - 2 * t
  return (
    rrect(x, y, s, s, ro * corners[0], ro * corners[1], ro * corners[2], ro * corners[3]) +
    rrect(x + t, y + t, q, q, ri * corners[0], ri * corners[1], ri * corners[2], ri * corners[3])
  )
}

export const EYE_FRAME_SHAPES: EyeFrameShape[] = [
  {
    value: 'square',
    label: 'Négyzet',
    path: (x, y, s, m) => rrRing(x, y, s, m, 0, 0, m),
  },
  {
    value: 'extra-rounded',
    label: 'Erősen lekerekített',
    path: (x, y, s, m) => rrRing(x, y, s, m, 2.6 * m, 1.6 * m, m),
  },
  {
    value: 'dot',
    label: 'Kör',
    path: (x, y, s, m) => {
      const c = s / 2
      return circle(x + c, y + c, s / 2) + circle(x + c, y + c, s / 2 - m)
    },
  },
  {
    value: 'rounded',
    label: 'Lekerekített',
    path: (x, y, s, m) => rrRing(x, y, s, m, 1.5 * m, 0.55 * m, m),
  },
  {
    value: 'leaf',
    label: 'Levél',
    path: (x, y, s, m) => rrRing(x, y, s, m, 3 * m, 2 * m, m, [1, 0, 1, 0]),
  },
  {
    value: 'leaf-inverse',
    label: 'Levél (fordított)',
    path: (x, y, s, m) => rrRing(x, y, s, m, 3 * m, 2 * m, m, [0, 1, 0, 1]),
  },
  {
    value: 'rounded-outer',
    label: 'Kívül kerek',
    path: (x, y, s, m) =>
      rrect(x, y, s, s, 2.6 * m, 2.6 * m, 2.6 * m, 2.6 * m) + rect(x + m, y + m, s - 2 * m, s - 2 * m),
  },
  {
    value: 'chamfer',
    label: 'Levágott sarkú',
    path: (x, y, s, m) => {
      const c = 1.7 * m
      return octagon(x, y, s, c) + octagon(x + m, y + m, s - 2 * m, c - (2 - Math.SQRT2) * m)
    },
  },
  {
    value: 'dots-ring',
    label: 'Pontgyűrű',
    path: (x, y, s, m) => {
      let p = ''
      const r = m / 2
      for (let index = 0; index < 7; index += 1) {
        p += circle(x + (index + 0.5) * m, y + 0.5 * m, r) + circle(x + (index + 0.5) * m, y + 6.5 * m, r)
      }
      for (let index = 1; index < 6; index += 1) {
        p += circle(x + 0.5 * m, y + (index + 0.5) * m, r) + circle(x + 6.5 * m, y + (index + 0.5) * m, r)
      }
      return p
    },
  },
  {
    value: 'dashed',
    label: 'Szaggatott',
    path: (x, y, s, m) => {
      const a = 2.1 * m
      const t = m
      const d0 = 2.6 * m
      const d1 = 4.4 * m
      let p = ''
      p += poly([x, y, x + a, y, x + a, y + t, x + t, y + t, x + t, y + a, x, y + a])
      p += poly([x + s - a, y, x + s, y, x + s, y + a, x + s - t, y + a, x + s - t, y + t, x + s - a, y + t])
      p += poly([x + s, y + s - a, x + s, y + s, x + s - a, y + s, x + s - a, y + s - t, x + s - t, y + s - t, x + s - t, y + s - a])
      p += poly([x + a, y + s - t, x + a, y + s, x, y + s, x, y + s - a, x + t, y + s - a, x + t, y + s - t])
      p += rect(x + d0, y, d1 - d0, t) + rect(x + d0, y + s - t, d1 - d0, t)
      p += rect(x, y + d0, t, d1 - d0) + rect(x + s - t, y + d0, t, d1 - d0)
      return p
    },
  },
  {
    value: 'thin',
    label: 'Vékony',
    path: (x, y, s, m) => rrRing(x, y, s, m, 0, 0, 0.62 * m),
  },
  {
    value: 'thick',
    label: 'Vastag',
    path: (x, y, s, m) => rrRing(x, y, s, m, 0, 0, 1.3 * m),
  },
  {
    value: 'rounded-thin',
    label: 'Vékony, kerek',
    path: (x, y, s, m) => rrRing(x, y, s, m, 2 * m, 1.4 * m, 0.62 * m),
  },
  {
    value: 'cushion',
    label: 'Párna',
    path: (x, y, s, m) => pillow(x, y, s, 0.55 * m) + pillow(x + m, y + m, s - 2 * m, 0.4 * m),
  },
]

/* ---------- sarokelem belseje ---------- */

export const EYE_BALL_SHAPES: EyeBallShape[] = [
  { value: 'square', label: 'Négyzet', path: (x, y, s) => rect(x, y, s, s) },
  { value: 'dot', label: 'Pont', path: (x, y, s) => circle(x + s / 2, y + s / 2, s / 2) },
  {
    value: 'rounded',
    label: 'Lekerekített',
    path: (x, y, s, m) => rrect(x, y, s, s, 0.7 * m, 0.7 * m, 0.7 * m, 0.7 * m),
  },
  {
    value: 'extra-rounded',
    label: 'Erősen lekerekített',
    path: (x, y, s, m) => rrect(x, y, s, s, 1.2 * m, 1.2 * m, 1.2 * m, 1.2 * m),
  },
  {
    value: 'leaf',
    label: 'Levél',
    path: (x, y, s) => rrect(x, y, s, s, s / 2, 0, s / 2, 0),
  },
  {
    value: 'leaf-inverse',
    label: 'Levél (fordított)',
    path: (x, y, s) => rrect(x, y, s, s, 0, s / 2, 0, s / 2),
  },
  {
    value: 'dots9',
    label: 'Kilenc pont',
    path: (x, y, s, m) => {
      let p = ''
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          p += circle(x + (col + 0.5) * m, y + (row + 0.5) * m, 0.54 * m)
        }
      }
      return p
    },
  },
  {
    value: 'chamfer',
    label: 'Levágott sarkú',
    path: (x, y, s, m) => octagon(x, y, s, 0.75 * m),
  },
  {
    value: 'diamond',
    label: 'Rombusz',
    path: (x, y, s, m) => {
      const cx = x + s / 2
      const cy = y + s / 2
      const h = 1.8 * m
      return poly([cx, cy - h, cx + h, cy, cx, cy + h, cx - h, cy])
    },
  },
  {
    value: 'star',
    label: 'Csillag',
    path: (x, y, s, m) => {
      const cx = x + s / 2
      const R = 1.95 * m
      const cy = y + s / 2 + 0.15 * R
      const inner = R * 0.5
      const points: number[] = []
      for (let index = 0; index < 10; index += 1) {
        const angle = -Math.PI / 2 + (index * Math.PI) / 5
        const radius = index % 2 ? inner : R
        points.push(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle))
      }
      return poly(points)
    },
  },
  {
    value: 'vertical-bars',
    label: 'Függőleges sávok',
    path: (x, y, s, m) => {
      let p = ''
      const w = 0.8 * m
      for (let index = 0; index < 3; index += 1) {
        p += rrect(x + index * m + (m - w) / 2, y, w, s, w / 2, w / 2, w / 2, w / 2)
      }
      return p + rect(x + (m - w) / 2, y + 1.2 * m, s - (m - w), 0.6 * m)
    },
  },
  {
    value: 'horizontal-bars',
    label: 'Vízszintes sávok',
    path: (x, y, s, m) => {
      let p = ''
      const h = 0.8 * m
      for (let index = 0; index < 3; index += 1) {
        p += rrect(x, y + index * m + (m - h) / 2, s, h, h / 2, h / 2, h / 2, h / 2)
      }
      return p + rect(x + 1.2 * m, y + (m - h) / 2, 0.6 * m, s - (m - h))
    },
  },
  {
    value: 'flower',
    label: 'Virág',
    path: (x, y, s, m) => {
      const cx = x + s / 2
      const cy = y + s / 2
      const d = 0.78 * m
      const r = 0.72 * m
      return (
        circle(cx, cy - d, r) +
        circle(cx + d, cy, r) +
        circle(cx, cy + d, r) +
        circle(cx - d, cy, r) +
        circle(cx, cy, m)
      )
    },
  },
  { value: 'squircle', label: 'Squircle', path: (x, y, s) => squircle(x, y, s, s, 0.8) },
  {
    value: 'plus',
    label: 'Plusz',
    path: (x, y, s, m) => {
      const a = m
      const b = 2 * m
      return poly([
        x + a, y, x + b, y, x + b, y + a, x + s, y + a, x + s, y + b, x + b, y + b,
        x + b, y + s, x + a, y + s, x + a, y + b, x, y + b, x, y + a, x + a, y + a,
      ])
    },
  },
  {
    value: 'cushion',
    label: 'Párna',
    path: (x, y, s, m) => pillow(x, y, s, 0.3 * m),
  },
]

const bodyIndex = new Map(BODY_SHAPES.map(shape => [shape.value, shape]))
const eyeFrameIndex = new Map(EYE_FRAME_SHAPES.map(shape => [shape.value, shape]))
const eyeBallIndex = new Map(EYE_BALL_SHAPES.map(shape => [shape.value, shape]))

/** Üres szomszédság, ha a hívó nem adja át a rácsot (pl. csempeminta). */
export const EMPTY_NEIGHBOURS: Neighbours = {
  t: false,
  r: false,
  b: false,
  l: false,
  tl: false,
  tr: false,
  bl: false,
  br: false,
}

export function bodyShapePath(style: DotStyle): BodyPath {
  return (bodyIndex.get(style) ?? BODY_SHAPES[0]!).path
}

export function eyeFrameShapePath(style: CornerSquareStyle): EyePath {
  return (eyeFrameIndex.get(style) ?? EYE_FRAME_SHAPES[0]!).path
}

export function eyeBallShapePath(style: CornerDotStyle): EyePath {
  return (eyeBallIndex.get(style) ?? EYE_BALL_SHAPES[0]!).path
}
