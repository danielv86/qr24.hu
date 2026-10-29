import { cloneCustomShape, isValidCustomShape, shapeCoverage } from '#shared/qr/custom-shape'
import { BODY_SHAPES, EYE_BALL_SHAPES, EYE_FRAME_SHAPES } from './shapes'
import type {
  CornerDotStyle,
  CornerSquareStyle,
  DotStyle,
  ErrorCorrectionLevel,
  FramePreset,
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
  bgFill: { kind: 'solid', color: '#FFFFFF', color2: '#E2E8F0', rotation: 45 },
  transparentBackground: false,
  logo: '',
  logoName: '',
  logoSize: 0.28,
  logoMargin: 8,
  size: 1024,
  errorCorrection: 'Q',
  margin: 4,
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
  customBody: null,
  customFrame: null,
  customBall: null,
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

/** A keretek a referencia készletének sorrendjét követik. */
export const FRAME_OPTIONS: { value: FramePreset; label: string }[] = [
  { value: 'none', label: 'Nincs keret' },
  { value: 'card', label: 'Alsó címke' },
  { value: 'label-above', label: 'Felső címke' },
  { value: 'speech', label: 'Szövegbuborék' },
  { value: 'corners', label: 'Sarkok' },
  { value: 'rounded-corners', label: 'Kerek sarkok' },
  { value: 'border', label: 'Doboz' },
  { value: 'rounded-box', label: 'Kerek doboz' },
  { value: 'polaroid', label: 'Polaroid' },
  { value: 'circle', label: 'Kör' },
  { value: 'circle-label', label: 'Kör címkével' },
  { value: 'hexagon', label: 'Hatszög' },
  { value: 'phone', label: 'Telefon' },
  { value: 'ticket', label: 'Jegy' },
  { value: 'banners', label: 'Felső és alsó sáv' },
  { value: 'top-badge', label: 'Felső jelvény' },
]

/** Keretek, amelyeknél van felirat. */
export const FRAME_LABEL_SUPPORTED: FramePreset[] = [
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

/** Keretek, ahol a felirat gombban (pirulában) jelenik meg. */
export const FRAME_LABEL_AS_PILL: FramePreset[] = ['card', 'label-above', 'circle-label']

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
  if (margin < 4) {
    warnings.push('A csendes zóna a szabvány szerinti 4 modul alatt van, ezért a telefonok nehezebben találják meg a kódot.')
  }

  // Saját formáknál a tinta fedettsége dönti el, hogy a modulok elég nagyok-e
  // a beolvasáshoz: a túl vékony minta a legtöbb telefonon olvashatatlan.
  if (customization.dotStyle === 'custom' && isValidCustomShape(customization.customBody)) {
    const coverage = shapeCoverage(customization.customBody)
    if (coverage < 0.22) {
      warnings.push('A saját testforma túl kevés tintát használ. Vastagítsd az alakzatot, különben nem olvasható a kód.')
    }
  }
  if (customization.cornerSquareStyle === 'custom' && isValidCustomShape(customization.customFrame)) {
    const outer = shapeCoverage(customization.customFrame)
    const ring = outer - outer * (5 / 7) ** 2
    if (ring < 0.16) {
      warnings.push('A saját sarokkeret gyűrűje túl vékony, ezért a keresőminta nehezen ismerhető fel.')
    }
  }
  if (customization.cornerDotStyle === 'custom' && isValidCustomShape(customization.customBall)) {
    if (shapeCoverage(customization.customBall) < 0.28) {
      warnings.push('A saját sarokbelső túl kicsi a 3 × 3-as maghoz, ezért a kód nehezen ismerhető fel.')
    }
  }

  return warnings
}

export function cloneCustomization(customization: QrCustomization): QrCustomization {
  return {
    ...customization,
    bodyFill: { ...customization.bodyFill },
    bgFill: { ...customization.bgFill },
    frameFill: { ...customization.frameFill },
    cornerSquareFill: { ...customization.cornerSquareFill },
    cornerDotFill: { ...customization.cornerDotFill },
    customBody: cloneCustomShape(customization.customBody),
    customFrame: cloneCustomShape(customization.customFrame),
    customBall: cloneCustomShape(customization.customBall),
  }
}
