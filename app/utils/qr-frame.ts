import { isGradientFill, isValidHexColor } from '~/lib/qr/customization'
import type { FramePreset, QrCustomization, QrFill } from '#shared/qr/types'

export interface FrameLayout {
  totalWidth: number
  totalHeight: number
  /** A QR-kód bal felső sarka a keret koordinátáiban. */
  padX: number
  padY: number
  cornerRadius: number
  borderWidth: number
  /** Gomb (pirula) vagy sáv magassága a címkéhez. */
  labelHeight: number
  labelFontSize: number
  subtitleHeight: number
  subtitleFontSize: number
  pillHeight: number
  /** Az egyszerű szöveges címke sávjának magassága. */
  captionHeight: number
  captionFontSize: number
  /** A címke felső éle a keret koordinátáiban. */
  labelTop: number
}

interface FrameLayoutInput {
  frame: FramePreset
  size: number
  hasLabel?: boolean
  hasSubtitle?: boolean
  fontScale?: number
}

function baseLayout(size: number): FrameLayout {
  return {
    totalWidth: size,
    totalHeight: size,
    padX: 0,
    padY: 0,
    cornerRadius: 0,
    borderWidth: 0,
    labelHeight: 0,
    labelFontSize: 0,
    subtitleHeight: 0,
    subtitleFontSize: 0,
    pillHeight: 0,
    captionHeight: 0,
    captionFontSize: 0,
    labelTop: 0,
  }
}

export function getFrameLayout({ frame, size, hasLabel = false, hasSubtitle = false, fontScale = 1 }: FrameLayoutInput): FrameLayout {
  const scale = Math.max(0.7, Math.min(1.4, fontScale))
  const pillFontSize = Math.round(size * 0.048 * scale)
  const subtitleFontSize = Math.round(size * 0.032 * scale)
  const pillHeight = hasLabel ? Math.round(pillFontSize * 1.9) : 0
  const labelBlock = hasLabel ? pillHeight + Math.round(size * 0.025) : 0
  const subtitleBlock = hasSubtitle ? subtitleFontSize + Math.round(size * 0.02) : 0

  if (frame === 'border') {
    const pad = Math.round(size * 0.06)
    return {
      ...baseLayout(size),
      totalWidth: size + pad * 2,
      totalHeight: size + pad * 2,
      padX: pad,
      padY: pad,
      cornerRadius: Math.round(size * 0.04),
      borderWidth: Math.max(2, Math.round(size * 0.006)),
    }
  }

  if (frame === 'rounded-box') {
    const pad = Math.round(size * 0.075)
    return {
      ...baseLayout(size),
      totalWidth: size + pad * 2,
      totalHeight: size + pad * 2,
      padX: pad,
      padY: pad,
      cornerRadius: Math.round(size * 0.13),
      borderWidth: Math.max(3, Math.round(size * 0.012)),
    }
  }

  if (frame === 'card') {
    const pad = Math.round(size * 0.07)
    return {
      ...baseLayout(size),
      totalWidth: size + pad * 2,
      totalHeight: pad + size + Math.round(size * 0.04) + labelBlock + subtitleBlock + pad,
      padX: pad,
      padY: pad,
      cornerRadius: Math.round(size * 0.075),
      labelHeight: labelBlock,
      labelFontSize: pillFontSize,
      subtitleHeight: subtitleBlock,
      subtitleFontSize,
      pillHeight,
      labelTop: pad + size + Math.round(size * 0.025),
    }
  }

  if (frame === 'label-above') {
    const pad = Math.round(size * 0.07)
    return {
      ...baseLayout(size),
      totalWidth: size + pad * 2,
      totalHeight: pad + labelBlock + size + subtitleBlock + pad,
      padX: pad,
      padY: pad + labelBlock,
      cornerRadius: Math.round(size * 0.075),
      labelHeight: labelBlock,
      labelFontSize: pillFontSize,
      subtitleHeight: subtitleBlock,
      subtitleFontSize,
      pillHeight,
      labelTop: pad,
    }
  }

  if (frame === 'speech') {
    const pad = Math.round(size * 0.07)
    const tail = Math.round(size * 0.08)
    const captionFontSize = Math.round(size * 0.05 * scale)
    const captionHeight = hasLabel ? Math.round(captionFontSize * 2.6) : 0
    return {
      ...baseLayout(size),
      totalWidth: size + pad * 2,
      totalHeight: pad + size + captionHeight + pad + tail,
      padX: pad,
      padY: pad,
      cornerRadius: Math.round(size * 0.1),
      captionHeight,
      captionFontSize,
      labelTop: pad + size + Math.round(captionHeight * 0.2),
    }
  }

  if (frame === 'polaroid') {
    const pad = Math.round(size * 0.06)
    const captionFontSize = Math.round(size * 0.055 * scale)
    const captionHeight = Math.round(captionFontSize * 3)
    return {
      ...baseLayout(size),
      totalWidth: size + pad * 2,
      totalHeight: pad + size + captionHeight + Math.round(pad * 0.6),
      padX: pad,
      padY: pad,
      cornerRadius: Math.round(size * 0.02),
      borderWidth: Math.max(2, Math.round(size * 0.004)),
      captionHeight,
      captionFontSize,
      labelTop: pad + size + Math.round(captionHeight * 0.4),
    }
  }

  if (frame === 'corners') {
    const pad = Math.round(size * 0.09)
    return {
      ...baseLayout(size),
      totalWidth: size + pad * 2,
      totalHeight: size + pad * 2,
      padX: pad,
      padY: pad,
    }
  }

  if (frame === 'rounded-corners') {
    const pad = Math.round(size * 0.1)
    return {
      ...baseLayout(size),
      totalWidth: size + pad * 2,
      totalHeight: size + pad * 2,
      padX: pad,
      padY: pad,
      cornerRadius: Math.round(size * 0.18),
    }
  }

  if (frame === 'circle') {
    const diamond = Math.round(size * 1.18)
    const pad = Math.round((diamond - size) / 2)
    return {
      ...baseLayout(size),
      totalWidth: diamond,
      totalHeight: diamond,
      padX: pad,
      padY: pad,
      cornerRadius: Math.round(size * 0.14),
    }
  }

  if (frame === 'circle-label') {
    const diameter = Math.round(size * 1.18)
    const pad = Math.round((diameter - size) / 2)
    const band = hasLabel ? Math.round(pillHeight + size * 0.05) : Math.round(size * 0.08)
    return {
      ...baseLayout(size),
      totalWidth: diameter,
      totalHeight: diameter + band,
      padX: pad,
      padY: pad,
      cornerRadius: Math.round(size * 0.14),
      labelHeight: labelBlock,
      labelFontSize: pillFontSize,
      pillHeight,
      labelTop: diameter - Math.round(size * 0.03),
    }
  }

  if (frame === 'hexagon') {
    const pad = Math.round(size * 0.08)
    const captionFontSize = Math.round(size * 0.05 * scale)
    const band = hasLabel ? Math.round(captionFontSize * 2.9) : Math.round(size * 0.06)
    return {
      ...baseLayout(size),
      totalWidth: size + pad * 2,
      totalHeight: size + pad * 2 + band,
      padX: pad,
      padY: pad,
      captionHeight: band,
      captionFontSize,
      labelTop: size + pad * 2,
    }
  }

  if (frame === 'phone') {
    const pad = Math.round(size * 0.07)
    const top = Math.round(size * 0.13)
    const bottom = Math.round(size * 0.08)
    const captionFontSize = Math.round(size * 0.045 * scale)
    return {
      ...baseLayout(size),
      totalWidth: size + pad * 2,
      totalHeight: top + size + bottom,
      padX: pad,
      padY: top,
      cornerRadius: Math.round(size * 0.13),
      captionHeight: bottom,
      captionFontSize,
      labelTop: top + size + Math.round(bottom * 0.15),
    }
  }

  if (frame === 'ticket') {
    const pad = Math.round(size * 0.06)
    const captionFontSize = Math.round(size * 0.05 * scale)
    const band = hasLabel ? Math.round(captionFontSize * 2.7) : Math.round(size * 0.08)
    return {
      ...baseLayout(size),
      totalWidth: size + pad * 2,
      totalHeight: pad + size + band + pad,
      padX: pad,
      padY: pad,
      cornerRadius: Math.round(size * 0.05),
      captionHeight: band,
      captionFontSize,
      labelTop: pad + size + Math.round(band * 0.2),
    }
  }

  if (frame === 'banners') {
    const pad = Math.round(size * 0.05)
    const top = Math.round(size * 0.15)
    const bottom = Math.round(size * 0.09)
    const captionFontSize = Math.round(size * 0.055 * scale)
    return {
      ...baseLayout(size),
      totalWidth: size + pad * 2,
      totalHeight: top + size + bottom,
      padX: pad,
      padY: top,
      captionFontSize,
      captionHeight: top,
      labelTop: 0,
    }
  }

  if (frame === 'top-badge') {
    const pad = Math.round(size * 0.06)
    const badge = Math.round(size * 0.16)
    const captionFontSize = Math.round(size * 0.06 * scale)
    return {
      ...baseLayout(size),
      totalWidth: size + pad * 2,
      totalHeight: Math.round(badge * 0.5) + pad + size + pad,
      padX: pad,
      padY: Math.round(badge * 0.5) + pad,
      cornerRadius: Math.round(size * 0.06),
      labelHeight: badge,
      captionHeight: badge,
      captionFontSize,
      labelTop: 0,
    }
  }

  return baseLayout(size)
}

export const FRAME_CAPTION_FALLBACK = 'Olvasd be telefonnal'

/** Keretek, amelyeknél van hely a feliratnak. */
const LABEL_FRAMES: FramePreset[] = [
  'card',
  'label-above',
  'speech',
  'polaroid',
  'circle-label',
  'hexagon',
  'phone',
  'ticket',
  'banners',
  'top-badge',
]

let gradientCounter = 0

function frameGradientId(index: number): string {
  return `qr-frame-fill-${index}`
}

function gradientDefinition(fill: QrFill, id: string): string {
  if (!isGradientFill(fill)) return ''
  if (fill.kind === 'radial') {
    return `<radialGradient id="${id}" cx="50%" cy="50%" r="75%"><stop offset="0" stop-color="${fill.color}"/><stop offset="1" stop-color="${fill.color2}"/></radialGradient>`
  }
  const angle = (Math.max(0, Math.min(360, fill.rotation)) * Math.PI) / 180
  const x1 = 0.5 - Math.cos(angle) / 2
  const y1 = 0.5 - Math.sin(angle) / 2
  const x2 = 0.5 + Math.cos(angle) / 2
  const y2 = 0.5 + Math.sin(angle) / 2
  return `<linearGradient id="${id}" x1="${x1.toFixed(3)}" y1="${y1.toFixed(3)}" x2="${x2.toFixed(3)}" y2="${y2.toFixed(3)}"><stop offset="0" stop-color="${fill.color}"/><stop offset="1" stop-color="${fill.color2}"/></linearGradient>`
}

/** A keret kitöltése: színátmenetnél a definíció id-ját adja vissza. */
function fillAttribute(fill: QrFill, fallback: string, gradientId: string): { defs: string; value: string } {
  if (isGradientFill(fill)) {
    return { defs: gradientDefinition(fill, gradientId), value: `url(#${gradientId})` }
  }
  return { defs: '', value: isValidHexColor(fill.color) ? fill.color : fallback }
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function textWidthEstimate(text: string, fontSize: number): number {
  return text.length * fontSize * 0.58
}

function num(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

/** Lekerekített téglalap útvonal (a sarokelemek ívével). */
function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2))
  if (!radius) return `M${num(x)} ${num(y)} H${num(x + w)} V${num(y + h)} H${num(x)} Z`
  return [
    `M${num(x + radius)} ${num(y)}`,
    `H${num(x + w - radius)}`,
    `A${num(radius)} ${num(radius)} 0 0 1 ${num(x + w)} ${num(y + radius)}`,
    `V${num(y + h - radius)}`,
    `A${num(radius)} ${num(radius)} 0 0 1 ${num(x + w - radius)} ${num(y + h)}`,
    `H${num(x + radius)}`,
    `A${num(radius)} ${num(radius)} 0 0 1 ${num(x)} ${num(y + h - radius)}`,
    `V${num(y + radius)}`,
    `A${num(radius)} ${num(radius)} 0 0 1 ${num(x + radius)} ${num(y)}`,
    'Z',
  ].join(' ')
}

function circlePath(cx: number, cy: number, r: number): string {
  return `M${num(cx - r)} ${num(cy)} a${num(r)} ${num(r)} 0 1 0 ${num(r * 2)} 0 a${num(r)} ${num(r)} 0 1 0 ${num(-r * 2)} 0 Z`
}

/**
 * A generált QR SVG belsejét egy nagyobb, keretezett SVG-be ágyazza.
 * A `size` a belső QR mérete pixelben (az előnézet kisebb, az export nagyobb).
 */
export function buildFramedSvg(
  innerSvg: string,
  customization: QrCustomization,
  size: number,
): string {
  const frame = customization.frame
  const label = (customization.frameText.trim() || '').slice(0, 48)
  const subtitle = (customization.frameSubtitle.trim() || '').slice(0, 48)
  const labelFrame = LABEL_FRAMES.includes(frame)
  const hasLabel = labelFrame && Boolean(label)
  const hasSubtitle = frame === 'card' && Boolean(subtitle)
  const layout = getFrameLayout({
    frame,
    size,
    hasLabel,
    hasSubtitle,
    fontScale: customization.frameFontScale,
  })

  const font = `${customization.frameFont}, system-ui, sans-serif`
  // A keret színe mindig a frameColor mezőből jön; a frameFill csak a kitöltés
  // fajtáját és a színátmenet második színét tárolja.
  const frameFill: QrFill = { ...customization.frameFill, color: customization.frameColor }
  const plate = fillAttribute(frameFill, customization.frameColor, frameGradientId(0))
  const labelColor = isValidHexColor(customization.labelColor) ? customization.labelColor : '#FFFFFF'
  const labelTextColor = isValidHexColor(customization.labelTextColor) ? customization.labelTextColor : '#0F172A'
  // A háttér első színe mindig a bgColor; a bgFill csak a színátmenetet írja le.
  const bgFallback = isValidHexColor(customization.bgColor) ? customization.bgColor : '#FFFFFF'
  const bgPaint = fillAttribute(
    { ...customization.bgFill, color: customization.bgColor },
    bgFallback,
    `qr-bg-fill-${++gradientCounter}`,
  )
  const bgColor = bgPaint.value
  const transparent = customization.transparentBackground

  const defsMarkup = `${bgPaint.defs}${plate.defs}`
  const defs = defsMarkup ? `<defs>${defsMarkup}</defs>` : ''
  const transform = `<g transform="translate(${layout.padX} ${layout.padY})">${innerSvg}</g>`

  const pieces: string[] = [defs]
  const width = layout.totalWidth
  const height = layout.totalHeight

  const qrBackdrop = (x = layout.padX, y = layout.padY, radius = Math.round(size * 0.04)): string => {
    if (transparent) return ''
    return `<rect x="${num(x)}" y="${num(y)}" width="${num(size)}" height="${num(size)}" rx="${num(radius)}" fill="${bgColor}"/>`
  }

  /** Szöveges címke a sáv közepén. */
  const captionText = (text: string, color: string, weight = 700): string => {
    const y = layout.labelTop + layout.captionHeight / 2 + layout.captionFontSize * 0.35
    return `<text x="${num(width / 2)}" y="${num(y)}" text-anchor="middle" font-family="${font}" font-size="${layout.captionFontSize}" font-weight="${weight}" fill="${color}">${escapeXml(text)}</text>`
  }

  /** Gomb (pirula) felirat a keret alján vagy tetején. */
  const pill = (text: string): string => {
    if (!text || !layout.pillHeight) return ''
    const textWidth = textWidthEstimate(text, layout.labelFontSize)
    const pillWidth = Math.min(
      width - layout.padX,
      Math.max(size * 0.42, textWidth + layout.labelFontSize * 2.4),
    )
    const x = (width - pillWidth) / 2
    const y = layout.labelTop
    return [
      `<rect x="${num(x)}" y="${num(y)}" width="${num(pillWidth)}" height="${num(layout.pillHeight)}" rx="${num(layout.pillHeight / 2)}" fill="${labelColor}"/>`,
      `<text x="${num(width / 2)}" y="${num(y + layout.pillHeight / 2 + layout.labelFontSize * 0.35)}" text-anchor="middle" font-family="${font}" font-size="${layout.labelFontSize}" font-weight="700" fill="${labelTextColor}">${escapeXml(text)}</text>`,
    ].join('')
  }

  if (frame === 'none') {
    if (!transparent) {
      pieces.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="${bgColor}"/>`)
    }
  }

  if (frame === 'border' || frame === 'rounded-box') {
    const inset = layout.borderWidth / 2
    pieces.push(
      `<rect x="${num(inset)}" y="${num(inset)}" width="${num(width - inset * 2)}" height="${num(height - inset * 2)}" rx="${num(layout.cornerRadius)}" fill="${transparent ? 'none' : bgColor}" stroke="${plate.value}" stroke-width="${num(layout.borderWidth)}"/>`,
    )
  }

  if (frame === 'card' || frame === 'label-above') {
    pieces.push(`<path d="${roundedRectPath(0, 0, width, height, layout.cornerRadius)}" fill="${plate.value}"/>`)
    pieces.push(qrBackdrop())
    if (hasLabel) pieces.push(pill(label))
    if (subtitle) {
      const y = frame === 'label-above'
        ? layout.padY + size + Math.round(size * 0.03) + layout.subtitleFontSize * 0.9
        : layout.labelTop + layout.labelHeight + layout.subtitleFontSize
      pieces.push(
        `<text x="${num(width / 2)}" y="${num(y)}" text-anchor="middle" font-family="${font}" font-size="${layout.subtitleFontSize}" font-weight="600" fill="${labelTextColor}" opacity="0.85">${escapeXml(subtitle)}</text>`,
      )
    }
  }

  if (frame === 'speech') {
    const bodyHeight = height - Math.round(size * 0.08)
    const tailWidth = Math.round(size * 0.16)
    const tailLeft = width / 2 - tailWidth / 2
    const tailPath = [
      `M${num(tailLeft)} ${num(bodyHeight - 1)}`,
      `L${num(width / 2)} ${num(height - Math.round(size * 0.01))}`,
      `L${num(tailLeft + tailWidth)} ${num(bodyHeight - 1)}`,
      'Z',
    ].join(' ')
    pieces.push(`<path d="${roundedRectPath(0, 0, width, bodyHeight, layout.cornerRadius)}" fill="${plate.value}"/>`)
    pieces.push(`<path d="${tailPath}" fill="${plate.value}"/>`)
    pieces.push(qrBackdrop())
    if (hasLabel) pieces.push(captionText(label, labelTextColor))
  }

  if (frame === 'polaroid') {
    pieces.push(`<rect x="0" y="0" width="${num(width)}" height="${num(height)}" rx="${num(layout.cornerRadius)}" fill="${bgColor}" stroke="${plate.value}" stroke-width="${num(layout.borderWidth)}"/>`)
    pieces.push(qrBackdrop(undefined, undefined, 0))
    if (hasLabel) pieces.push(captionText(label, labelTextColor, 600))
  }

  if (frame === 'circle') {
    const center = width / 2
    pieces.push(`<circle cx="${num(center)}" cy="${num(center)}" r="${num(center)}" fill="${plate.value}"/>`)
    pieces.push(qrBackdrop(undefined, undefined, layout.cornerRadius))
  }

  if (frame === 'circle-label') {
    const center = width / 2
    const radius = width / 2
    pieces.push(`<circle cx="${num(center)}" cy="${num(center)}" r="${num(radius)}" fill="${plate.value}"/>`)
    pieces.push(qrBackdrop(undefined, undefined, layout.cornerRadius))
    if (hasLabel) pieces.push(pill(label))
  }

  if (frame === 'hexagon') {
    const plateHeight = height - layout.captionHeight
    const cut = Math.round(width * 0.12)
    const hexPath = [
      `M${num(cut)} 0`,
      `H${num(width - cut)}`,
      `L${num(width)} ${num(plateHeight / 2)}`,
      `L${num(width - cut)} ${num(plateHeight)}`,
      `H${num(cut)}`,
      `L0 ${num(plateHeight / 2)}`,
      'Z',
    ].join(' ')
    pieces.push(`<path d="${hexPath}" fill="${plate.value}"/>`)
    pieces.push(qrBackdrop())
    const bandHeight = layout.captionHeight
    if (bandHeight > 0) {
      pieces.push(
        `<path d="${roundedRectPath(width * 0.12, plateHeight - Math.round(size * 0.02), width * 0.76, bandHeight, Math.round(bandHeight * 0.28))}" fill="${plate.value}"/>`,
      )
      if (hasLabel) pieces.push(captionText(label, labelTextColor))
    }
  }

  if (frame === 'phone') {
    pieces.push(`<path d="${roundedRectPath(0, 0, width, height, layout.cornerRadius)}" fill="${plate.value}"/>`)
    pieces.push(qrBackdrop())
    const speakerWidth = Math.round(size * 0.16)
    const speakerY = Math.round(size * 0.05)
    pieces.push(
      `<rect x="${num(width / 2 - speakerWidth / 2)}" y="${num(speakerY)}" width="${num(speakerWidth)}" height="${num(Math.max(3, Math.round(size * 0.018)))}" rx="${num(Math.max(2, Math.round(size * 0.009)))}" fill="${bgColor}" opacity="0.75"/>`,
    )
    const indicatorWidth = Math.round(size * 0.2)
    const indicatorY = height - Math.round(size * 0.045)
    pieces.push(
      `<rect x="${num(width / 2 - indicatorWidth / 2)}" y="${num(indicatorY)}" width="${num(indicatorWidth)}" height="${num(Math.max(3, Math.round(size * 0.014)))}" rx="${num(Math.max(2, Math.round(size * 0.007)))}" fill="${bgColor}" opacity="0.6"/>`,
    )
    if (hasLabel) pieces.push(captionText(label, labelTextColor))
  }

  if (frame === 'ticket') {
    const notchRadius = Math.round(size * 0.035)
    const notchY = layout.padY + size / 2
    const bodyPath = [
      roundedRectPath(0, 0, width, height, layout.cornerRadius),
      circlePath(0, notchY, notchRadius),
      circlePath(width, notchY, notchRadius),
    ].join(' ')
    pieces.push(`<path d="${bodyPath}" fill="${plate.value}" fill-rule="evenodd"/>`)
    pieces.push(qrBackdrop())
    if (hasLabel) pieces.push(captionText(label, labelTextColor))
  }

  if (frame === 'banners') {
    const pad = layout.padX
    const topHeight = layout.padY
    const bottomHeight = height - layout.padY - size
    const round = Math.round(size * 0.02)
    pieces.push(`<path d="${roundedRectPath(0, 0, width, topHeight, round)}" fill="${plate.value}"/>`)
    pieces.push(`<path d="${roundedRectPath(0, height - bottomHeight, width, bottomHeight, round)}" fill="${plate.value}"/>`)
    pieces.push(qrBackdrop(pad, layout.padY, round))
    if (hasLabel) {
      const y = topHeight / 2 + layout.captionFontSize * 0.35
      pieces.push(
        `<text x="${num(width / 2)}" y="${num(y)}" text-anchor="middle" font-family="${font}" font-size="${layout.captionFontSize}" font-weight="700" fill="${labelTextColor}">${escapeXml(label)}</text>`,
      )
    }
  }

  if (frame === 'top-badge') {
    const badgeHeight = Math.round(size * 0.16)
    pieces.push(`<path d="${roundedRectPath(0, badgeHeight * 0.5, width, height - badgeHeight * 0.5, layout.cornerRadius)}" fill="${plate.value}"/>`)
    pieces.push(qrBackdrop())
    const badgeText = label || 'QRKOD24.hu'
    const badgeFont = Math.min(layout.captionFontSize, Math.round(badgeHeight * 0.62))
    const badgeWidth = Math.min(
      width,
      Math.max(size * 0.4, textWidthEstimate(badgeText, badgeFont) + badgeFont * 2.6),
    )
    const badgeX = (width - badgeWidth) / 2
    pieces.push(
      `<path d="${roundedRectPath(badgeX, 0, badgeWidth, badgeHeight, Math.round(badgeHeight * 0.3))}" fill="${labelColor}"/>`,
    )
    pieces.push(
      `<text x="${num(width / 2)}" y="${num(badgeHeight / 2 + badgeFont * 0.35)}" text-anchor="middle" font-family="${font}" font-size="${badgeFont}" font-weight="700" fill="${labelTextColor}">${escapeXml(badgeText)}</text>`,
    )
  }

  if (frame === 'corners' || frame === 'rounded-corners') {
    if (!transparent) {
      pieces.push(`<rect x="0" y="0" width="${num(width)}" height="${num(height)}" fill="${bgColor}"/>`)
    }
    const bracket = Math.round(size * 0.13)
    const thickness = Math.max(3, Math.round(size * 0.018))
    const radius = frame === 'rounded-corners' ? Math.round(size * 0.1) : 0
    const x0 = layout.padX
    const y0 = layout.padY
    const x1 = width - layout.padX
    const y1 = height - layout.padY
    const corner = (x: number, y: number, dx: number, dy: number) => {
      // dx/dy: a sarokból kifelé mutató irány.
      const startX = x + dx * bracket
      const startY = y + dy * bracket
      if (!radius) return `M${num(startX)} ${num(y)} L${num(x)} ${num(y)} L${num(x)} ${num(startY)}`
      return [
        `M${num(startX)} ${num(y)}`,
        `L${num(x + dx * radius)} ${num(y)}`,
        `Q${num(x)} ${num(y)} ${num(x)} ${num(y + dy * radius)}`,
        `L${num(x)} ${num(startY)}`,
      ].join(' ')
    }
    const paths = [
      corner(x0, y0, 1, 1),
      corner(x1, y0, -1, 1),
      corner(x1, y1, -1, -1),
      corner(x0, y1, 1, -1),
    ]
    pieces.push(
      `<path d="${paths.join(' ')}" fill="none" stroke="${plate.value}" stroke-width="${num(thickness)}" stroke-linecap="round"/>`,
    )
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(width)}" height="${num(height)}" viewBox="0 0 ${num(width)} ${num(height)}" role="img" aria-label="QR-kód">`,
    ...pieces,
    transform,
    '</svg>',
  ].join('')
}
