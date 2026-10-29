import qrcode from 'qrcode-generator'
import { customFramePath, customShapePath, isValidCustomShape } from '#shared/qr/custom-shape'
import type { ShapePoint } from '#shared/qr/custom-shape'
import {
  fillLattice,
  fitSquareInside,
  pointsToPath,
  polygonBounds,
  silhouettePoints,
} from '#shared/qr/silhouette'
import { fillColor, isGradientFill } from '~/lib/qr/customization'
import { EMPTY_NEIGHBOURS, bodyShapePath, eyeBallShapePath, eyeFrameShapePath } from '~/lib/qr/shapes'
import type { Neighbours } from '~/lib/qr/shapes'
import type { ErrorCorrectionLevel, QrCustomization, QrFill } from '#shared/qr/types'
import { buildFramedSvg, escapeXml } from './qr-frame'

// A magyar ékezetek és az emojik UTF-8 kódolással kerülnek a QR-kódba.
qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'] ?? qrcode.stringToBytes

interface Paint {
  fill: string
  defs: string
}

let gradientCounter = 0

/**
 * A kitöltésből SVG fill értéket és (színátmenet esetén) a hozzá tartozó
 * defs blokkot állítja elő.
 */
function buildPaint(fill: QrFill, fallback: string): Paint {
  if (!isGradientFill(fill)) return { fill: fallback, defs: '' }
  const id = `qr-grad-${++gradientCounter}`
  const stops = [
    `<stop offset="0%" stop-color="${fill.color}"/>`,
    `<stop offset="100%" stop-color="${fill.color2}"/>`,
  ].join('')
  if (fill.kind === 'radial') {
    return {
      fill: `url(#${id})`,
      defs: `<radialGradient id="${id}" cx="50%" cy="50%" r="50%">${stops}</radialGradient>`,
    }
  }
  const angle = (Math.max(0, Math.min(360, fill.rotation)) * Math.PI) / 180
  const x1 = (50 - Math.cos(angle) * 50).toFixed(2)
  const y1 = (50 - Math.sin(angle) * 50).toFixed(2)
  const x2 = (50 + Math.cos(angle) * 50).toFixed(2)
  const y2 = (50 + Math.sin(angle) * 50).toFixed(2)
  return {
    fill: `url(#${id})`,
    defs: `<linearGradient id="${id}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">${stops}</linearGradient>`,
  }
}

export function buildQrMatrix(data: string, level: ErrorCorrectionLevel): boolean[][] {
  const qr = qrcode(0, level)
  qr.addData(data)
  qr.make()
  const count = qr.getModuleCount()
  const matrix: boolean[][] = []
  for (let row = 0; row < count; row += 1) {
    const line: boolean[] = []
    for (let column = 0; column < count; column += 1) line.push(qr.isDark(row, column))
    matrix.push(line)
  }
  return matrix
}

function isEyeModule(row: number, column: number, count: number): boolean {
  const inTop = row < 7
  const inBottom = row >= count - 7
  const inLeft = column < 7
  const inRight = column >= count - 7
  return (inTop && inLeft) || (inTop && inRight) || (inBottom && inLeft)
}

/**
 * A QR-kód belső SVG tartalmát rajzolja ki a kiválasztott formákkal.
 * A keretet a buildFramedSvg teszi köré, ezért itt háttér nélkül dolgozunk.
 */
/** A 0..1-es térben tárolt alakzatot a vászonra nagyítja, megtartva az arányokat. */
function fitPolygon(points: ShapePoint[], size: number, pad: number): ShapePoint[] {
  const bounds = polygonBounds(points)
  const inner = size - pad * 2
  const scale = inner / Math.max(bounds.width, bounds.height)
  const offsetX = pad + (inner - bounds.width * scale) / 2 - bounds.minX * scale
  const offsetY = pad + (inner - bounds.height * scale) / 2 - bounds.minY * scale
  return points.map(point => ({ x: offsetX + point.x * scale, y: offsetY + point.y * scale }))
}

export function buildQrContents(data: string, customization: QrCustomization, size: number): string {
  const matrix = buildQrMatrix(data, customization.errorCorrection)
  const count = matrix.length
  // A csendes zónát modulban mérjük: a szabvány 4 modult ír elő, ennél
  // kevesebb fehér sáv miatt a telefonok nehezen találják meg a kódot.
  const quietModules = Math.max(0, Math.min(10, Math.round(customization.margin)))

  // Alakzat: a kód a legnagyobb befoglalható négyzetbe kerül, a maradékot
  // ugyanolyan modulok töltik ki. Ilyenkor a csendes zónát az alakzat és a
  // kódmező közötti sáv adja, nem a margin érték.
  const polygon = silhouettePoints(customization.silhouette ?? 'none', customization.silhouettePoints)
  const polygonAbs = polygon ? fitPolygon(polygon, size, size * 0.03) : null
  const square = polygonAbs ? fitSquareInside(polygonAbs, 128) : null
  const baseCell = square ? square.side / (count + 2.2) : size / (count + quietModules * 2)
  const gap = square ? baseCell * 1.1 : 0
  const cell = square ? (square.side - gap * 2) / count : baseCell
  const originX = square ? square.centerX - square.side / 2 + gap : cell * quietModules
  const originY = square ? square.centerY - square.side / 2 + gap : cell * quietModules

  const bodyColor = fillColor(customization.bodyFill)
  const bodyPaint = buildPaint(customization.bodyFill, bodyColor)
  const eyeFrameColor = customization.cornerSquareColor || bodyColor
  const eyeBallColor = customization.cornerDotColor || bodyColor
  const eyeFramePaint = buildPaint(customization.cornerSquareFill, eyeFrameColor)
  const eyeBallPaint = buildPaint(customization.cornerDotFill, eyeBallColor)

  // A három keresőminta helyét kivesszük a rácsból, hogy a testformák
  // szomszédszámítása ugyanazt lássa, mint a referencia motor.
  const grid: boolean[][] = matrix.map((line, row) =>
    line.map((dark, column) => dark && !isEyeModule(row, column, count)),
  )
  const at = (row: number, column: number): boolean =>
    row >= 0 && column >= 0 && row < count && column < count ? Boolean(grid[row]![column]) : false

  // Saját forma esetén a szerkesztő csomópontjaiból készül az útvonal; a testet
  // egyszer definiáljuk, és minden modulra `use`-bal hivatkozunk, így a kód
  // maradék mérete nem nő a modulok számával.
  const customBody = customization.dotStyle === 'custom' ? customization.customBody : null
  const bodyPathShape = customBody && isValidCustomShape(customBody) ? null : bodyShapePath(customization.dotStyle)
  const modules: string[] = []
  const customModules: string[] = []
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (!grid[row]![column]) continue
      const x = originX + column * cell
      const y = originY + row * cell
      if (!bodyPathShape) {
        customModules.push(
          `<use href="#qr-custom-body" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${cell.toFixed(3)})"/>`,
        )
        continue
      }
      const neighbours: Neighbours = {
        t: at(row - 1, column),
        b: at(row + 1, column),
        l: at(row, column - 1),
        r: at(row, column + 1),
        tl: at(row - 1, column - 1),
        tr: at(row - 1, column + 1),
        bl: at(row + 1, column - 1),
        br: at(row + 1, column + 1),
      }
      modules.push(bodyPathShape(x, y, cell, neighbours, row, column))
    }
  }
  const customBodyDefs =
    !bodyPathShape && customBody ? `<path id="qr-custom-body" d="${customShapePath(customBody, 0, 0, 1)}"/>` : ''

  // Kitöltő modulok: pontosan ugyanaz a rajzoló, ugyanazokkal a színekkel és
  // formákkal, mint a kód moduljai — így a kitöltés egynek látszik a kóddal.
  const fillerModules: string[] = []
  const fillerCustom: string[] = []
  if (polygonAbs && customization.silhouetteFill !== false) {
    const cells = fillLattice({
      polygon: polygonAbs,
      field: { left: originX, top: originY, side: cell * count },
      gap,
      step: cell,
    })
    for (const point of cells) {
      const x = point.x - cell / 2
      const y = point.y - cell / 2
      if (!bodyPathShape) {
        fillerCustom.push(
          `<use href="#qr-custom-body" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${cell.toFixed(3)})"/>`,
        )
        continue
      }
      fillerModules.push(bodyPathShape(x, y, cell, EMPTY_NEIGHBOURS, 0, 0))
    }
  }

  const customFrame = customization.cornerSquareStyle === 'custom' ? customization.customFrame : null
  const customBall = customization.cornerDotStyle === 'custom' ? customization.customBall : null
  const eyeFramePath = isValidCustomShape(customFrame) ? null : eyeFrameShapePath(customization.cornerSquareStyle)
  const eyeBallPath = isValidCustomShape(customBall) ? null : eyeBallShapePath(customization.cornerDotStyle)
  const framePathFor = (x: number, y: number, size: number) =>
    eyeFramePath ? eyeFramePath(x, y, size, cell) : customFramePath(customFrame, x, y, size)
  const ballPathFor = (x: number, y: number, size: number) =>
    eyeBallPath ? eyeBallPath(x, y, size, cell) : customShapePath(customBall, x, y, size)
  // A forma a bal felső szemre készül; a másik kettőt a motor 90°-kal elforgatja.
  const eyes: { row: number; column: number; angle: number }[] = [
    { row: 0, column: 0, angle: 0 },
    { row: 0, column: count - 7, angle: -90 },
    { row: count - 7, column: 0, angle: 90 },
  ]
  const rotated = (element: string, x: number, y: number, size: number, angle: number): string => {
    if (!angle) return element
    const cx = (x + size / 2).toFixed(2)
    const cy = (y + size / 2).toFixed(2)
    return `<g transform="rotate(${angle} ${cx} ${cy})">${element}</g>`
  }

  const frames = eyes
    .map(({ row, column, angle }) => {
      const x = originX + column * cell
      const y = originY + row * cell
      return rotated(`<path d="${framePathFor(x, y, cell * 7)}"/>`, x, y, cell * 7, angle)
    })
    .join('')
  const balls = eyes
    .map(({ row, column, angle }) => {
      const x = originX + (column + 2) * cell
      const y = originY + (row + 2) * cell
      return rotated(`<path d="${ballPathFor(x, y, cell * 3)}"/>`, x, y, cell * 3, angle)
    })
    .join('')

  const logo = customization.logo
  let logoElement = ''
  if (logo) {
    const ratio = Math.min(0.4, Math.max(0.1, customization.logoSize))
    const logoSize = Math.round(size * ratio)
    const pad = Math.round((customization.logoMargin / 1024) * size)
    const box = logoSize + pad * 2
    const x = (size - box) / 2
    const y = (size - box) / 2
    const plate = customization.transparentBackground ? '#FFFFFF' : customization.bgColor
    logoElement = [
      `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${box}" height="${box}" rx="${Math.round(box * 0.14)}" fill="${plate}"/>`,
      `<image x="${(x + pad).toFixed(2)}" y="${(y + pad).toFixed(2)}" width="${logoSize}" height="${logoSize}" href="${escapeXml(logo)}" preserveAspectRatio="xMidYMid meet"/>`,
    ].join('')
  }

  // Az alakzat körvonala: a modulokat ráragozzuk, így a szél nem lesz lépcsős.
  const silhouettePath = polygonAbs ? pointsToPath(polygonAbs) : ''
  const clipId = polygonAbs ? `qr-silhouette-${++gradientCounter}` : ''
  const outline = polygonAbs
    ? `<path d="${silhouettePath}" fill="none" stroke="${bodyPaint.fill}" stroke-width="${Math.max(1, cell * 0.9).toFixed(2)}" stroke-linejoin="round"/>`
    : ''

  const defs = `${bodyPaint.defs}${eyeFramePaint.defs}${eyeBallPaint.defs}${customBodyDefs}${
    clipId ? `<clipPath id="${clipId}"><path d="${silhouettePath}"/></clipPath>` : ''
  }`

  const bodyElement = bodyPathShape
    ? `<path d="${modules.join('')}${fillerModules.join('')}"/>`
    : `<g>${customModules.join('')}${fillerCustom.join('')}</g>`

  const content = [
    `<g fill="${bodyPaint.fill}" shape-rendering="geometricPrecision">${bodyElement}</g>`,
    `<g fill="${eyeFramePaint.fill}" fill-rule="evenodd">${frames}</g>`,
    `<g fill="${eyeBallPaint.fill}">${balls}</g>`,
  ].join('')

  return [
    defs ? `<defs>${defs}</defs>` : '',
    clipId ? `<g clip-path="url(#${clipId})">${content}</g>` : content,
    outline,
    logoElement,
  ].join('')
}

/**
 * A QR-kódot SVG-ként rajzolja ki a kiválasztott méretben, a kerettel együtt.
 * Ugyanez a függvény szolgálja ki az előnézetet és a letöltéseket, így a
 * felület és az export mindig pixelre ugyanazt mutatja.
 */
export async function renderQrSvg(data: string, customization: QrCustomization, size: number): Promise<string> {
  return buildFramedSvg(buildQrContents(data, customization, size), customization, size)
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** A kész SVG-t vászonra rajzolja, hogy raszteres formátumban is menthető legyen. */
export async function rasterizeSvg(svg: string): Promise<HTMLCanvasElement> {
  const image = new Image()
  image.decoding = 'sync'
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('A kép feldolgozása nem sikerült.'))
    image.src = svgToDataUrl(svg)
  })
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('A böngésző nem támogatja a vászon exportot.')
  context.drawImage(image, 0, 0, width, height)
  return canvas
}
