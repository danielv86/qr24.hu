import { isGradientFill, isValidHexColor } from '~/lib/qr/customization'
import type { FramePreset, QrCustomization, QrFill } from '~/lib/qr/types'

export interface FrameLayout {
  totalWidth: number
  totalHeight: number
  padX: number
  padY: number
  cornerRadius: number
  borderWidth: number
  /** Kártya keret alsó szövegblokkja. */
  labelHeight: number
  labelFontSize: number
  subtitleHeight: number
  subtitleFontSize: number
  pillHeight: number
  /** Alsó feliratos keret szövegsávja. */
  captionHeight: number
  captionFontSize: number
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
  }
}

export function getFrameLayout({ frame, size, hasLabel = false, hasSubtitle = false, fontScale = 1 }: FrameLayoutInput): FrameLayout {
  const scale = Math.max(0.7, Math.min(1.4, fontScale))
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
  if (frame === 'card') {
    const pad = Math.round(size * 0.07)
    const labelFontSize = Math.round(size * 0.048 * scale)
    const subtitleFontSize = Math.round(size * 0.032 * scale)
    const pillHeight = hasLabel ? Math.round(labelFontSize * 1.9) : 0
    const labelHeight = hasLabel ? pillHeight + Math.round(size * 0.025) : 0
    const subtitleHeight = hasSubtitle ? subtitleFontSize + Math.round(size * 0.02) : 0
    return {
      ...baseLayout(size),
      totalWidth: size + pad * 2,
      totalHeight: size + pad + Math.round(size * 0.04) + labelHeight + subtitleHeight + pad,
      padX: pad,
      padY: pad,
      cornerRadius: Math.round(size * 0.075),
      labelHeight,
      labelFontSize,
      subtitleHeight,
      subtitleFontSize,
      pillHeight,
    }
  }
  if (frame === 'caption') {
    const padX = Math.round(size * 0.06)
    const padTop = Math.round(size * 0.06)
    const captionFontSize = Math.round(size * 0.05 * scale)
    const captionHeight = Math.round(captionFontSize * 3.1)
    return {
      ...baseLayout(size),
      totalWidth: size + padX * 2,
      totalHeight: size + padTop + captionHeight,
      padX,
      padY: padTop,
      cornerRadius: Math.round(size * 0.04),
      borderWidth: Math.max(2, Math.round(size * 0.0025)),
      captionHeight,
      captionFontSize,
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
  return baseLayout(size)
}

export const FRAME_CAPTION_FALLBACK = 'Olvasd be telefonnal'

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

/**
 * A generált QR SVG belsejét egy nagyobb, keretezett SVG-be ágyazza.
 * A `size` a belső QR mérete pixelben (az előnézet kisebb, az export nagyobb).
 */
export function buildFramedSvg(
  innerSvg: string,
  customization: QrCustomization,
  size: number,
): string {
  const label = (customization.frameText.trim() || '').slice(0, 48)
  const subtitle = (customization.frameSubtitle.trim() || '').slice(0, 48)
  const hasLabel = customization.frame === 'card' && Boolean(label)
  const hasSubtitle = customization.frame === 'card' && Boolean(subtitle)
  const layout = getFrameLayout({
    frame: customization.frame,
    size,
    hasLabel,
    hasSubtitle,
    fontScale: customization.frameFontScale,
  })

  const font = `${customization.frameFont}, system-ui, sans-serif`
  // A keret színe mindig a frameColor mezőből jön; a frameFill csak a kitöltés
  // fajtáját és a színátmenet második színét tárolja.
  const frameFill: QrFill = { ...customization.frameFill, color: customization.frameColor }
  const cardFill = fillAttribute(frameFill, customization.frameColor, frameGradientId(0))
  const labelColor = isValidHexColor(customization.labelColor) ? customization.labelColor : '#FFFFFF'
  const labelTextColor = isValidHexColor(customization.labelTextColor) ? customization.labelTextColor : '#0F172A'
  const bgColor = isValidHexColor(customization.bgColor) ? customization.bgColor : '#FFFFFF'

  const defs = cardFill.defs ? `<defs>${cardFill.defs}</defs>` : ''
  const transform = `<g transform="translate(${layout.padX} ${layout.padY})">${innerSvg}</g>`

  const pieces: string[] = [defs]

  if (customization.frame === 'none') {
    if (!customization.transparentBackground) {
      pieces.push(`<rect x="0" y="0" width="${layout.totalWidth}" height="${layout.totalHeight}" fill="${bgColor}"/>`)
    }
  }

  if (customization.frame === 'border' || customization.frame === 'caption') {
    const inset = layout.borderWidth / 2
    pieces.push(
      `<rect x="${inset}" y="${inset}" width="${layout.totalWidth - inset * 2}" height="${layout.totalHeight - inset * 2}" rx="${layout.cornerRadius}" fill="${bgColor}" stroke="${cardFill.value}" stroke-width="${layout.borderWidth}"/>`,
    )
  }

  if (customization.frame === 'card') {
    pieces.push(
      `<rect x="0" y="0" width="${layout.totalWidth}" height="${layout.totalHeight}" rx="${layout.cornerRadius}" fill="${cardFill.value}"/>`,
    )
    pieces.push(
      `<rect x="${layout.padX}" y="${layout.padY}" width="${size}" height="${size}" rx="${Math.round(size * 0.04)}" fill="${bgColor}"/>`,
    )

    if (hasLabel) {
      const pillTop = layout.padY + size + Math.round(size * 0.025)
      const textWidth = textWidthEstimate(label, layout.labelFontSize)
      const pillWidth = Math.min(layout.totalWidth - layout.padX * 2, Math.max(size * 0.42, textWidth + layout.labelFontSize * 2.4))
      const pillX = (layout.totalWidth - pillWidth) / 2
      const pillY = pillTop
      pieces.push(
        `<rect x="${pillX.toFixed(1)}" y="${pillY.toFixed(1)}" width="${pillWidth.toFixed(1)}" height="${layout.pillHeight}" rx="${(layout.pillHeight / 2).toFixed(1)}" fill="${labelColor}"/>`,
      )
      pieces.push(
        `<text x="${(layout.totalWidth / 2).toFixed(1)}" y="${(pillTop + layout.pillHeight / 2 + layout.labelFontSize * 0.35).toFixed(1)}" text-anchor="middle" font-family="${font}" font-size="${layout.labelFontSize}" font-weight="700" fill="${labelTextColor}">${escapeXml(label)}</text>`,
      )
    }

    if (hasSubtitle) {
      const subtitleTop = layout.padY + size + Math.round(size * 0.025) + layout.labelHeight
      pieces.push(
        `<text x="${(layout.totalWidth / 2).toFixed(1)}" y="${(subtitleTop + layout.subtitleFontSize).toFixed(1)}" text-anchor="middle" font-family="${font}" font-size="${layout.subtitleFontSize}" font-weight="600" fill="${labelTextColor}" opacity="0.85">${escapeXml(subtitle)}</text>`,
      )
    }
  }

  if (customization.frame === 'caption') {
    const caption = (label || FRAME_CAPTION_FALLBACK).slice(0, 48)
    const captionY = layout.totalHeight - layout.captionHeight / 2 + layout.captionFontSize * 0.35
    pieces.push(
      `<text x="${(layout.totalWidth / 2).toFixed(1)}" y="${captionY.toFixed(1)}" text-anchor="middle" font-family="${font}" font-size="${layout.captionFontSize}" font-weight="600" fill="${labelTextColor}">${escapeXml(caption)}</text>`,
    )
  }

  if (customization.frame === 'corners') {
    if (!customization.transparentBackground) {
      pieces.push(`<rect x="0" y="0" width="${layout.totalWidth}" height="${layout.totalHeight}" fill="${bgColor}"/>`)
    }
    const bracket = Math.round(size * 0.13)
    const thickness = Math.max(3, Math.round(size * 0.018))
    const radius = Math.round(size * 0.03)
    const pad = layout.padX
    const x0 = pad
    const y0 = pad
    const x1 = layout.totalWidth - pad
    const y1 = layout.totalHeight - pad
    const corners = [
      `M${x0} ${y0 + bracket} L${x0} ${y0 + radius} Q${x0} ${y0} ${x0 + radius} ${y0} L${x0 + bracket} ${y0}`,
      `M${x1 - bracket} ${y0} L${x1 - radius} ${y0} Q${x1} ${y0} ${x1} ${y0 + radius} L${x1} ${y0 + bracket}`,
      `M${x1} ${y1 - bracket} L${x1} ${y1 - radius} Q${x1} ${y1} ${x1 - radius} ${y1} L${x1 - bracket} ${y1}`,
      `M${x0 + bracket} ${y1} L${x0 + radius} ${y1} Q${x0} ${y1} ${x0} ${y1 - radius} L${x0} ${y1 - bracket}`,
    ]
    pieces.push(
      `<path d="${corners.join(' ')}" fill="none" stroke="${cardFill.value}" stroke-width="${thickness}" stroke-linecap="round"/>`,
    )
  }

  if (customization.frame === 'circle') {
    const center = layout.totalWidth / 2
    pieces.push(`<circle cx="${center}" cy="${center}" r="${center}" fill="${cardFill.value}"/>`)
    pieces.push(
      `<rect x="${layout.padX}" y="${layout.padY}" width="${size}" height="${size}" rx="${layout.cornerRadius}" fill="${bgColor}"/>`,
    )
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.totalWidth}" height="${layout.totalHeight}" viewBox="0 0 ${layout.totalWidth} ${layout.totalHeight}" role="img" aria-label="QR-kód">`,
    ...pieces,
    transform,
    '</svg>',
  ].join('')
}
