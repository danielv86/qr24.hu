export type QrTypeId =
  | 'url'
  | 'contact'
  | 'social'
  | 'wifi'
  | 'bank'
  | 'text'
  | 'email'
  | 'phone'
  | 'sms'
  | 'map'
  | 'whatsapp'
  | 'event'
  | 'google-review'
  | 'paypal'
  | 'pdf'
  | 'app'
  | 'vcard'
  | 'event-page'
  | 'menu'
  | 'coupon'
  | 'business'
  | 'feedback'
  | 'form'
  | 'files'
  | 'audio'
  | 'gallery'
  | 'video'

export type QrFieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'url'
  | 'textarea'
  | 'select'
  | 'date'
  | 'time'
  | 'checkbox'
  | 'number'

export interface QrFieldOption {
  value: string
  label: string
}

export interface QrFieldDefinition {
  key: string
  label: string
  type: QrFieldType
  placeholder?: string
  help?: string
  required?: boolean
  autocomplete?: string
  inputmode?: 'text' | 'email' | 'tel' | 'url' | 'numeric' | 'decimal'
  options?: QrFieldOption[]
  rows?: number
  min?: number
  max?: number
  step?: number
  half?: boolean
  defaultValue?: string | boolean
}

export interface QrTypeDefinition {
  id: QrTypeId
  label: string
  shortLabel: string
  icon: string
  description: string
  examples: string
  seoPath?: string
  fields: QrFieldDefinition[]
}

export type QrFormValues = Record<string, string | boolean | undefined>

export interface QrBuildSuccess {
  ok: true
  data: string
  warnings: string[]
}

export interface QrBuildFailure {
  ok: false
  errors: Record<string, string>
  warnings: string[]
}

export type QrBuildResult = QrBuildSuccess | QrBuildFailure

export type DotStyle =
  | 'square'
  | 'rounded'
  | 'extra-rounded'
  | 'dots'
  | 'classy'
  | 'classy-rounded'
  | 'diamond'
  | 'leaf'
  | 'star'
  | 'hexagon'
  | 'triangle'
  | 'cross'
  | 'vertical'
  | 'horizontal'
  | 'tiny'
  | 'ring'
  | 'grid'
  | 'diagonal'
  | 'wave'
  | 'sparkle'

export type CornerSquareStyle =
  | 'square'
  | 'extra-rounded'
  | 'dot'
  | 'squircle'
  | 'leaf'
  | 'cut'
  | 'diamond'
  | 'thin'
  | 'thick'
  | 'brackets'
  | 'dots'
  | 'pill'
  | 'hexagon'
  | 'sparkle'

export type CornerDotStyle =
  | 'square'
  | 'dot'
  | 'circle-small'
  | 'rounded'
  | 'leaf'
  | 'diamond'
  | 'star'
  | 'cross'
  | 'plus'
  | 'hexagon'
  | 'triangle'
  | 'ring'
  | 'bars-h'
  | 'bars-v'
  | 'dots4'
  | 'sparkle'
  | 'half'
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

/** A keret fajtája: a design sablonok ezeket használják. */
export type FramePreset = 'none' | 'border' | 'card' | 'caption' | 'corners' | 'circle'

export type FillKind = 'solid' | 'linear' | 'radial'

export interface QrFill {
  kind: FillKind
  color: string
  color2: string
  rotation: number
}

export interface QrCustomization {
  fgColor: string
  bgColor: string
  dotStyle: DotStyle
  cornerSquareStyle: CornerSquareStyle
  cornerDotStyle: CornerDotStyle
  /** Külön szín a sarokelemeknek és a belső szemeknek; üresen a test színét öröklik. */
  cornerSquareColor: string
  cornerDotColor: string
  cornerSquareFill: QrFill
  cornerDotFill: QrFill
  /** A test kitöltése: tömör vagy színátmenetes. */
  bodyFill: QrFill
  /** Átlátszó háttér (csak PNG/WebP/SVG exportban érvényesül). */
  transparentBackground: boolean
  logo: string
  logoName: string
  logoSize: number
  logoMargin: number
  size: number
  errorCorrection: ErrorCorrectionLevel
  margin: number
  frame: FramePreset
  frameText: string
  frameSubtitle: string
  frameColor: string
  frameFill: QrFill
  labelColor: string
  labelTextColor: string
  frameFont: string
  frameFontScale: number
  designTemplate: string
}

export interface QrColorPreset {
  id: string
  name: string
  fgColor: string
  bgColor: string
  dotStyle: DotStyle
  cornerSquareStyle: CornerSquareStyle
  cornerDotStyle: CornerDotStyle
}

export interface QrDesignTemplate {
  id: string
  name: string
  hint: string
  frame: FramePreset
  frameText: string
  frameSubtitle: string
  frameColor: string
  labelColor: string
  labelTextColor: string
  fgColor: string
  bgColor: string
  dotStyle: DotStyle
  cornerSquareStyle: CornerSquareStyle
  cornerDotStyle: CornerDotStyle
}
