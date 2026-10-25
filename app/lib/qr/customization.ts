import { BODY_SHAPES, EYE_BALL_SHAPES, EYE_FRAME_SHAPES } from './shapes'
import type {
  CornerDotStyle,
  CornerSquareStyle,
  DotStyle,
  ErrorCorrectionLevel,
  FramePreset,
  QrColorPreset,
  QrCustomization,
  QrFill,
} from '#shared/qr/types'

export const DEFAULT_CUSTOMIZATION: QrCustomization = {
  fgColor: '#0F172A',
  bgColor: '#FFFFFF',
  dotStyle: 'square',
  cornerSquareStyle: 'square',
  cornerDotStyle: 'square',
  cornerSquareColor: '',
  cornerDotColor: '',
  cornerSquareFill: { kind: 'solid', color: '', color2: '#2563EB', rotation: 45 },
  cornerDotFill: { kind: 'solid', color: '', color2: '#2563EB', rotation: 45 },
  bodyFill: { kind: 'solid', color: '#0F172A', color2: '#2563EB', rotation: 45 },
  transparentBackground: false,
  logo: '',
  logoName: '',
  logoSize: 0.28,
  logoMargin: 8,
  size: 1024,
  errorCorrection: 'Q',
  margin: 32,
  frame: 'none',
  frameText: '',
  frameSubtitle: '',
  frameColor: '#0F172A',
  frameFill: { kind: 'solid', color: '#0F172A', color2: '#2563EB', rotation: 45 },
  labelColor: '#FFFFFF',
  labelTextColor: '#0F172A',
  frameFont: 'Arial',
  frameFontScale: 1,
  designTemplate: 'classic',
}

export const DOT_STYLE_OPTIONS: { value: DotStyle; label: string }[] = BODY_SHAPES.map(shape => ({
  value: shape.value,
  label: shape.label,
}))

export const CORNER_SQUARE_OPTIONS: { value: CornerSquareStyle; label: string }[] = EYE_FRAME_SHAPES.map(
  shape => ({ value: shape.value, label: shape.label }),
)

export const CORNER_DOT_OPTIONS: { value: CornerDotStyle; label: string }[] = EYE_BALL_SHAPES.map(
  shape => ({ value: shape.value, label: shape.label }),
)

export const ERROR_LEVEL_OPTIONS: { value: ErrorCorrectionLevel; label: string }[] = [
  { value: 'L', label: 'L – 7% (legkisebb kód)' },
  { value: 'M', label: 'M – 15%' },
  { value: 'Q', label: 'Q – 25% (ajánlott)' },
  { value: 'H', label: 'H – 30% (logóhoz ajánlott)' },
]

export const FRAME_OPTIONS: { value: FramePreset; label: string }[] = [
  { value: 'none', label: 'Nincs keret' },
  { value: 'border', label: 'Vékony keret' },
  { value: 'card', label: 'Kártya' },
  { value: 'caption', label: 'Alsó felirattal' },
  { value: 'corners', label: 'Sarokjelölők' },
  { value: 'circle', label: 'Kör' },
]

export const FRAME_FONT_OPTIONS = [
  'Arial',
  'Helvetica',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Impact',
  'Segoe UI',
]

/** Fix, jól bevált márkaszínek a gyors színválasztáshoz. */
export const QUICK_COLORS: { name: string; value: string }[] = [
  { name: 'Fekete', value: '#0F172A' },
  { name: 'Kék', value: '#2563EB' },
  { name: 'Zöld', value: '#059669' },
  { name: 'Lila', value: '#7C3AED' },
  { name: 'Piros', value: '#DC2626' },
  { name: 'Narancs', value: '#EA580C' },
  { name: 'Türkiz', value: '#0D9488' },
  { name: 'Rózsaszín', value: '#DB2777' },
]

export const COLOR_PRESETS: QrColorPreset[] = [
  {
    id: 'classic',
    name: 'Klasszikus',
    fgColor: '#0F172A',
    bgColor: '#FFFFFF',
    dotStyle: 'square',
    cornerSquareStyle: 'square',
    cornerDotStyle: 'square',
  },
  {
    id: 'cobalt',
    name: 'Kék',
    fgColor: '#1D4ED8',
    bgColor: '#FFFFFF',
    dotStyle: 'rounded',
    cornerSquareStyle: 'extra-rounded',
    cornerDotStyle: 'dot',
  },
  {
    id: 'navy',
    name: 'Sötétkék',
    fgColor: '#1E3A8A',
    bgColor: '#EFF6FF',
    dotStyle: 'extra-rounded',
    cornerSquareStyle: 'extra-rounded',
    cornerDotStyle: 'dot',
  },
  {
    id: 'forest',
    name: 'Zöld',
    fgColor: '#047857',
    bgColor: '#ECFDF5',
    dotStyle: 'rounded',
    cornerSquareStyle: 'square',
    cornerDotStyle: 'square',
  },
  {
    id: 'violet',
    name: 'Lila',
    fgColor: '#6D28D9',
    bgColor: '#F5F3FF',
    dotStyle: 'classy-rounded',
    cornerSquareStyle: 'extra-rounded',
    cornerDotStyle: 'dot',
  },
  {
    id: 'amber',
    name: 'Borostyán',
    fgColor: '#92400E',
    bgColor: '#FFFBEB',
    dotStyle: 'dots',
    cornerSquareStyle: 'extra-rounded',
    cornerDotStyle: 'dot',
  },
]

export function isValidHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value) || /^#[0-9a-f]{3}$/i.test(value)
}

export function normalizeHexColor(value: string): string {
  const trimmed = value.trim()
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toUpperCase()
  }
  return trimmed.toUpperCase()
}

/** A kitöltés aktuális első színe (a test színe). */
export function fillColor(fill: QrFill): string {
  return isValidHexColor(fill.color) ? fill.color : '#0F172A'
}

export function isGradientFill(fill: QrFill): boolean {
  return fill.kind !== 'solid' && isValidHexColor(fill.color) && isValidHexColor(fill.color2)
}

function hexToRgb(hex: string): [number, number, number] {
  const value = normalizeHexColor(hex).slice(1)
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ]
}

function channelLuminance(channel: number): number {
  const value = channel / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
}

export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground)
  const l2 = relativeLuminance(background)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/** A csendes zóna arányos átméretezése exportáláshoz. */
/**
 * Figyelmeztetések a beolvashatóság veszélyeire. Nem tiltják le a letöltést,
 * de a felületnek jól láthatóan meg kell jelenítenie őket.
 */
export function getCustomizationWarnings(customization: QrCustomization): string[] {
  const warnings: string[] = []
  const { fgColor, bgColor, logo, logoSize, errorCorrection, margin } = customization
  if (!isValidHexColor(fgColor) || !isValidHexColor(bgColor)) {
    return ['Érvénytelen színkód. Használj #RRGGBB formátumot.']
  }
  const ratio = contrastRatio(fgColor, bgColor)
  if (ratio < 3) {
    warnings.push(
      'Az előtér- és háttérszín kontrasztja nagyon alacsony. A kódot sok telefon nem tudja beolvasni.',
    )
  } else if (ratio < 4.5) {
    warnings.push('A színek kontrasztja közepes. Érdemes sötétebb előteret vagy világosabb hátteret választani.')
  }
  if (relativeLuminance(fgColor) > relativeLuminance(bgColor)) {
    warnings.push('Világos mintát sötét háttéren nem minden beolvasó ismer fel. A sötét minta világos háttéren a legbiztonságosabb.')
  }
  if (logo && errorCorrection !== 'H') {
    warnings.push('Logó használatakor válaszd a H (30%) hibajavítási szintet, hogy a kód a kép ellenére is olvasható maradjon.')
  }
  if (logo && logoSize > 0.3) {
    warnings.push('A logó a kód területének több mint 30%-át fedi. Csökkentsd a méretét a megbízható beolvasás érdekében.')
  }
  if (margin < 16) {
    warnings.push('A csendes zóna nagyon kicsi vagy hiányzik. Hagyj legalább 16 px margót a kód körül.')
  }
  return warnings
}

export function cloneCustomization(customization: QrCustomization): QrCustomization {
  return {
    ...customization,
    bodyFill: { ...customization.bodyFill },
    frameFill: { ...customization.frameFill },
    cornerSquareFill: { ...customization.cornerSquareFill },
    cornerDotFill: { ...customization.cornerDotFill },
  }
}
