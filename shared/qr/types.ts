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
  | 'dots'
  | 'rounded'
  | 'extra-rounded'
  | 'classy'
  | 'classy-rounded'
  | 'small-square'
  | 'tiny-dots'
  | 'vertical-lines'
  | 'horizontal-lines'
  | 'diamond'
  | 'star'
  | 'cross'
  | 'heart'
  | 'hexagon'
  | 'leaf'
  | 'leaf-inverse'
  | 'rounded-square'
  | 'mosaic'
  | 'random-dots'

export type CornerSquareStyle =
  | 'square'
  | 'extra-rounded'
  | 'dot'
  | 'rounded'
  | 'leaf'
  | 'leaf-inverse'
  | 'rounded-outer'
  | 'chamfer'
  | 'dots-ring'
  | 'dashed'
  | 'thin'
  | 'thick'
  | 'rounded-thin'
  | 'cushion'

export type CornerDotStyle =
  | 'square'
  | 'dot'
  | 'rounded'
  | 'extra-rounded'
  | 'leaf'
  | 'leaf-inverse'
  | 'dots9'
  | 'chamfer'
  | 'diamond'
  | 'star'
  | 'vertical-bars'
  | 'horizontal-bars'
  | 'flower'
  | 'squircle'
  | 'plus'
  | 'cushion'
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

/** A keret fajtája: a design sablonok ezeket használják. */
export type FramePreset =
  | 'none'
  | 'card'
  | 'label-above'
  | 'speech'
  | 'corners'
  | 'rounded-corners'
  | 'border'
  | 'rounded-box'
  | 'polaroid'
  | 'circle'
  | 'circle-label'
  | 'hexagon'
  | 'phone'
  | 'ticket'
  | 'banners'
  | 'top-badge'

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
  /**
   * A háttér kitöltése. Az első színt a bgColor adja, ez csak a színátmenet
   * fajtáját, második színét és szögét tárolja (mint a frameFill a keretnél).
   */
  bgFill: QrFill
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

export interface QrDesignTemplate {
  id: string
  name: string
  hint: string
  /** Kész márkalogó azonosítója (lásd app/lib/qr/social-logos.ts). */
  logo?: string
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
