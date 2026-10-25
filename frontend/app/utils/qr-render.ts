import qrcode from 'qrcode-generator'
import { fillColor, isGradientFill } from '#shared/qr/customization'
import { bodyShapePath, eyeBallShapePath, eyeFrameShapePath } from '#shared/qr/shapes'
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
export function buildQrContents(data: string, customization: QrCustomization, size: number): string {
  const matrix = buildQrMatrix(data, customization.errorCorrection)
  const count = matrix.length
  const margin = Math.max(0, Math.min(Math.round((customization.margin / 1024) * size), Math.floor(size * 0.2)))
  const cell = (size - margin * 2) / count

  const bodyColor = fillColor(customization.bodyFill)
  const bodyPaint = buildPaint(customization.bodyFill, bodyColor)
  const eyeFrameColor = customization.cornerSquareColor || bodyColor
  const eyeBallColor = customization.cornerDotColor || bodyColor
  const eyeFramePaint = buildPaint(customization.cornerSquareFill, eyeFrameColor)
  const eyeBallPaint = buildPaint(customization.cornerDotFill, eyeBallColor)

  const bodyPathShape = bodyShapePath(customization.dotStyle)
  const modules: string[] = []
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (!matrix[row]![column]) continue
      if (isEyeModule(row, column, count)) continue
      modules.push(bodyPathShape(margin + column * cell, margin + row * cell, cell))
    }
  }

  const eyeFramePath = eyeFrameShapePath(customization.cornerSquareStyle)
  const eyeBallPath = eyeBallShapePath(customization.cornerDotStyle)
  const eyeOrigins: [number, number][] = [
    [0, 0],
    [0, count - 7],
    [count - 7, 0],
  ]

  const frames = eyeOrigins
    .map(([row, column]) => eyeFramePath(margin + column * cell, margin + row * cell, cell * 7))
    .join('')
  const balls = eyeOrigins
    .map(([row, column]) => eyeBallPath(margin + (column + 2) * cell, margin + (row + 2) * cell, cell * 3))
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

  const defs = `${bodyPaint.defs}${eyeFramePaint.defs}${eyeBallPaint.defs}`

  return [
    defs ? `<defs>${defs}</defs>` : '',
    `<g fill="${bodyPaint.fill}" fill-rule="evenodd" shape-rendering="geometricPrecision"><path d="${modules.join('')}"/></g>`,
    `<g fill="${eyeFramePaint.fill}" fill-rule="evenodd"><path d="${frames}"/></g>`,
    `<g fill="${eyeBallPaint.fill}" fill-rule="evenodd"><path d="${balls}"/></g>`,
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
