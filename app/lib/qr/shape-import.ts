import {
  CUSTOM_SHAPE_MAX_POINTS,
  CUSTOM_SHAPE_MIN_POINTS,
  normalizeShapePoints,
  shapeBounds,
  simplifyShapePoints,
} from '#shared/qr/custom-shape'
import type { ShapePoint } from '#shared/qr/custom-shape'

/**
 * Feltöltött SVG vagy kép átalakítása saját QR-formává.
 *
 * Mindkét útvonal ugyanazt a láncot használja: a fájlból 160 × 160-as
 * fekete-fehér maszk készül, arról a legnagyobb összefüggő alakzat körvonalát
 * követjük, majd egyszerűsítjük csomópontokká. Így az eredmény mindig néhány
 * tucat szám, nem pixelhalmaz, és bármelyik modulméretnél éles marad.
 */

export const SHAPE_UPLOAD_MAX_BYTES = 2_000_000
const GRID_SIZE = 160
const MIN_POINTS = 3

/** A feltöltés hibái magyarul, hogy közvetlenül megjeleníthetők legyenek. */
export class ShapeImportError extends Error {}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'sync'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new ShapeImportError('A fájlt nem sikerült beolvasni.'))
    image.src = source
  })
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new ShapeImportError('A fájl beolvasása nem sikerült.'))
    reader.readAsDataURL(file)
  })
}

/**
 * Az SVG-ből csak a rajzoláshoz szükséges részt tartjuk meg: eltávolítjuk a
 * szkripteket, eseménykezelőket és a külső hivatkozásokat, majd a viewBox
 * alapján adunk neki konkrét méretet, hogy vászonra rajzolható legyen.
 */
export function sanitizeSvg(source: string): string | null {
  if (typeof window === 'undefined') return null
  const document_ = new DOMParser().parseFromString(source, 'image/svg+xml')
  const root = document_.documentElement
  if (!root || root.nodeName.toLowerCase() !== 'svg') return null
  if (document_.querySelector('parsererror')) return null

  for (const element of Array.from(root.querySelectorAll('script, foreignObject, style, link, meta'))) {
    element.remove()
  }
  for (const element of [root, ...Array.from(root.querySelectorAll('*'))]) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase()
      if (name.startsWith('on')) element.removeAttribute(attribute.name)
      if ((name === 'href' || name === 'xlink:href') && !attribute.value.startsWith('#')) {
        element.removeAttribute(attribute.name)
      }
    }
  }

  const viewBox = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number)
  const hasViewBox = viewBox.length === 4 && viewBox.every(value => Number.isFinite(value)) && viewBox[2]! > 0 && viewBox[3]! > 0
  if (!root.getAttribute('width') || !root.getAttribute('height')) {
    if (hasViewBox) {
      root.setAttribute('width', String(viewBox[2]))
      root.setAttribute('height', String(viewBox[3]))
    } else {
      root.setAttribute('width', String(GRID_SIZE))
      root.setAttribute('height', String(GRID_SIZE))
    }
  }
  root.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  return new XMLSerializer().serializeToString(root)
}

interface Mask {
  data: Uint8Array
  size: number
}

/** A képet négyzetes vászonra rajzolja, majd fekete-fehér maszkká alakítja. */
function imageToMask(image: HTMLImageElement): Mask | null {
  const size = GRID_SIZE
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new ShapeImportError('A böngésző nem támogatja a kép feldolgozását.')
  context.clearRect(0, 0, size, size)
  context.drawImage(image, 0, 0, size, size)
  const pixels = context.getImageData(0, 0, size, size).data

  const luminance = new Float32Array(size * size)
  const opaque = new Uint8Array(size * size)
  const histogram = new Array<number>(256).fill(0)
  let opaqueCount = 0
  for (let index = 0; index < size * size; index += 1) {
    const alpha = pixels[index * 4 + 3]!
    const value = 0.299 * pixels[index * 4]! + 0.587 * pixels[index * 4 + 1]! + 0.114 * pixels[index * 4 + 2]!
    luminance[index] = value
    if (alpha > 24) {
      opaque[index] = 1
      opaqueCount += 1
      histogram[Math.max(0, Math.min(255, Math.round(value)))]! += 1
    }
  }
  if (!opaqueCount) return null

  // Otsu-küszöb: a kép saját fényviszonyaihoz igazodik, nem kell kézzel állítani.
  let threshold = 128
  let best = -1
  let totalSum = 0
  for (let value = 0; value < 256; value += 1) totalSum += value * histogram[value]!
  let backgroundWeight = 0
  let backgroundSum = 0
  for (let value = 0; value < 256; value += 1) {
    backgroundWeight += histogram[value]!
    if (!backgroundWeight) continue
    const foregroundWeight = opaqueCount - backgroundWeight
    if (!foregroundWeight) break
    backgroundSum += value * histogram[value]!
    const backgroundMean = backgroundSum / backgroundWeight
    const foregroundMean = (totalSum - backgroundSum) / foregroundWeight
    const variance = backgroundWeight * foregroundWeight * (backgroundMean - foregroundMean) ** 2
    if (variance > best) {
      best = variance
      threshold = value
    }
  }

  const data = new Uint8Array(size * size)
  for (let index = 0; index < size * size; index += 1) {
    if (!opaque[index]) continue
    data[index] = luminance[index]! <= threshold ? 1 : 0
  }

  // Ha a kép széle sötét, akkor világos alakzat van sötét alapon: fordítsuk meg.
  let borderDark = 0
  let borderTotal = 0
  for (let position = 0; position < size; position += 1) {
    for (const index of [position, (size - 1) * size + position, position * size, position * size + size - 1]) {
      borderTotal += 1
      if (data[index]) borderDark += 1
    }
  }
  if (borderTotal && borderDark / borderTotal > 0.5) {
    for (let index = 0; index < data.length; index += 1) {
      data[index] = opaque[index] ? (data[index] ? 0 : 1) : 0
    }
  }

  let dark = 0
  for (let index = 0; index < data.length; index += 1) dark += data[index]!
  if (dark < size * 2) return null

  return { data, size }
}

/** Moore-szomszéd követés: a legnagyobb alakzat külső körvonala. */
function traceLargestContour(mask: Mask): ShapePoint[] {
  const { data, size } = mask
  const at = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < size && y < size && data[y * size + x] === 1

  let best: ShapePoint[] = []
  let bestArea = 0
  const seen = new Uint8Array(size * size)

  // 8 szomszéd óramutató járása szerint (a képernyőn lefelé mutató y tengellyel).
  const neighbours: [number, number][] = [
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
  ]

  for (let startIndex = 0; startIndex < size * size; startIndex += 1) {
    if (!data[startIndex] || seen[startIndex]) continue
    const startX = startIndex % size
    const startY = Math.floor(startIndex / size)
    const contour: ShapePoint[] = [{ x: startX, y: startY }]
    let currentX = startX
    let currentY = startY
    let back = 6 // balról érkeztünk
    const limit = size * size * 4

    for (let step = 0; step < limit; step += 1) {
      let found = -1
      for (let offset = 1; offset <= 8; offset += 1) {
        const direction = (back + offset) % 8
        const nextX = currentX + neighbours[direction]![0]
        const nextY = currentY + neighbours[direction]![1]
        if (at(nextX, nextY)) {
          found = direction
          break
        }
      }
      if (found < 0) break
      currentX += neighbours[found]![0]
      currentY += neighbours[found]![1]
      back = (found + 4) % 8
      seen[currentY * size + currentX] = 1
      if (currentX === startX && currentY === startY) break
      contour.push({ x: currentX, y: currentY })
    }

    // Csak a nagy foltok érdekesek; az apró szemetet eldobjuk.
    const area = Math.abs(
      contour.reduce((sum, point, index) => {
        const next = contour[(index + 1) % contour.length]!
        return sum + point.x * next.y - next.x * point.y
      }, 0) / 2,
    )
    if (contour.length > 8 && area > bestArea) {
      best = contour
      bestArea = area
    }
  }

  return best
}

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Meglévő (beépített) forma SVG-útvonalából csomópontok: így a kész formák is
 * továbbszerkeszthetők a vásznon.
 */
export function pointsFromPathData(
  d: string,
  samples = 160,
  maxPoints = CUSTOM_SHAPE_MAX_POINTS,
): ShapePoint[] {
  if (typeof document === 'undefined' || !d.trim()) return []
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0;overflow:hidden;pointer-events:none'
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', d)
  svg.appendChild(path)
  document.body.appendChild(svg)

  try {
    const total = path.getTotalLength()
    if (!Number.isFinite(total) || total <= 0) return []
    const raw: ShapePoint[] = []
    for (let index = 0; index < samples; index += 1) {
      const point = path.getPointAtLength((index / samples) * total)
      raw.push({ x: point.x, y: point.y })
    }

    // A több részvonalból álló útvonalakat (pl. sarokkeret gyűrűje) a minták
    // közötti ugrások alapján választjuk szét, és a legnagyobbat tartjuk meg.
    const bounds = shapeBounds(raw)
    const threshold = Math.max(bounds.width, bounds.height) * 0.12
    const chunks: ShapePoint[][] = []
    let current: ShapePoint[] = [raw[0]!]
    for (let index = 1; index < raw.length; index += 1) {
      const previous = raw[index - 1]!
      const point = raw[index]!
      if (Math.hypot(point.x - previous.x, point.y - previous.y) > threshold) {
        chunks.push(current)
        current = [point]
      } else {
        current.push(point)
      }
    }
    chunks.push(current)

    let best: ShapePoint[] = []
    let bestArea = 0
    for (const chunk of chunks) {
      if (chunk.length < CUSTOM_SHAPE_MIN_POINTS) continue
      const area = Math.abs(
        chunk.reduce((sum, point, index) => {
          const next = chunk[(index + 1) % chunk.length]!
          return sum + point.x * next.y - next.x * point.y
        }, 0) / 2,
      )
      if (area > bestArea) {
        bestArea = area
        best = chunk
      }
    }
    if (best.length < CUSTOM_SHAPE_MIN_POINTS) return []
    const simplified = simplifyShapePoints(normalizeShapePoints(best), maxPoints)
    return simplified.length >= CUSTOM_SHAPE_MIN_POINTS ? normalizeShapePoints(simplified) : []
  } finally {
    svg.remove()
  }
}

function toShapePoints(contour: ShapePoint[]): ShapePoint[] {
  if (contour.length < MIN_POINTS) return []
  // Előbb a 0..1-es dobozba normálunk, hogy az egyszerűsítés tűrése
  // független legyen a feldolgozó rács felbontásától.
  const simplified = simplifyShapePoints(normalizeShapePoints(contour), CUSTOM_SHAPE_MAX_POINTS)
  if (simplified.length < MIN_POINTS) return []
  return normalizeShapePoints(simplified)
}

function validateFile(file: File) {
  if (file.size > SHAPE_UPLOAD_MAX_BYTES) {
    throw new ShapeImportError('A fájl legfeljebb 2 MB lehet.')
  }
}

/** SVG feltöltés: tisztítás után raszterizáljuk, majd kontúrt követünk. */
export async function importShapeFromSvg(file: File): Promise<ShapePoint[]> {
  validateFile(file)
  const source = await file.text()
  const sanitized = sanitizeSvg(source)
  if (!sanitized) throw new ShapeImportError('Az SVG nem olvasható. Próbálj egy egyszerűbb fájlt.')
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(sanitized)}`)
  const mask = imageToMask(image)
  if (!mask) throw new ShapeImportError('Az SVG-ben nem találtam kitöltött alakzatot.')
  const points = toShapePoints(traceLargestContour(mask))
  if (points.length < MIN_POINTS) throw new ShapeImportError('Az SVG alakzata túl kicsi a feldolgozáshoz.')
  return points
}

/** Kép feltöltés: küszöbölés után a körvonalból lesz vektoros forma. */
export async function importShapeFromImage(file: File): Promise<ShapePoint[]> {
  validateFile(file)
  const dataUrl = await readAsDataUrl(file)
  const image = await loadImage(dataUrl)
  if (image.naturalWidth < 8 || image.naturalHeight < 8) {
    throw new ShapeImportError('A kép legalább 8 × 8 pixel legyen.')
  }
  const mask = imageToMask(image)
  if (!mask) throw new ShapeImportError('A képen nem találtam alakzatot.')
  const points = toShapePoints(traceLargestContour(mask))
  if (points.length < MIN_POINTS) throw new ShapeImportError('A kép alakzata túl kicsi a feldolgozáshoz.')
  return points
}

/** Az SVG-fájl típusának és a képfájloknak az ellenőrzése a feltöltés előtt. */
export function shapeFileKind(file: File): 'svg' | 'image' | null {
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) return 'svg'
  if (['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp'].includes(file.type)) return 'image'
  return null
}
