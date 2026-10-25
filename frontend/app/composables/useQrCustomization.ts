import {
  COLOR_PRESETS,
  DEFAULT_CUSTOMIZATION,
  cloneCustomization,
  getCustomizationWarnings,
  isValidHexColor,
  normalizeHexColor,
} from '#shared/qr/customization'
import { DESIGN_TEMPLATES, applyDesignTemplate } from '#shared/qr/design-templates'
import type { QrColorPreset, QrCustomization, QrDesignTemplate, QrFill } from '#shared/qr/types'

const MAX_LOGO_BYTES = 1_500_000
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']

const DESIGN_KEYS: (keyof QrCustomization)[] = [
  'fgColor',
  'bgColor',
  'dotStyle',
  'cornerSquareStyle',
  'cornerDotStyle',
  'bodyFill',
  'cornerSquareFill',
  'cornerDotFill',
  'transparentBackground',
  'frame',
  'frameText',
  'frameSubtitle',
  'frameColor',
  'frameFill',
  'labelColor',
  'labelTextColor',
  'frameFont',
  'frameFontScale',
]

export function useQrCustomization() {
  const customization = useState<QrCustomization>('qr-customization', () => ({ ...DEFAULT_CUSTOMIZATION }))
  const logoError = ref('')

  const warnings = computed(() => getCustomizationWarnings(customization.value))
  const hasLogo = computed(() => Boolean(customization.value.logo))

  function update<K extends keyof QrCustomization>(key: K, value: QrCustomization[K]) {
    const next: QrCustomization = { ...customization.value, [key]: value }
    if (DESIGN_KEYS.includes(key)) next.designTemplate = ''
    customization.value = next
  }

  function setColor(role: 'fgColor' | 'bgColor', value: string) {
    const normalized = value.startsWith('#') ? value : `#${value}`
    const color = isValidHexColor(normalized) ? normalizeHexColor(normalized) : normalized.toUpperCase()
    const next: QrCustomization = { ...customization.value, [role]: color, designTemplate: '' }
    if (role === 'fgColor' && customization.value.bodyFill.kind === 'solid') {
      next.bodyFill = { ...customization.value.bodyFill, color }
    }
    customization.value = next
  }

  function setFill(key: 'bodyFill' | 'frameFill' | 'cornerSquareFill' | 'cornerDotFill', patch: Partial<QrFill>) {
    const fill: QrFill = { ...customization.value[key], ...patch }
    const next: QrCustomization = { ...customization.value, [key]: fill, designTemplate: '' }
    if (key === 'bodyFill' && fill.kind === 'solid') {
      next.fgColor = fill.color
      next.cornerSquareColor = ''
      next.cornerDotColor = ''
    }
    if (key === 'frameFill' && fill.kind === 'solid') {
      next.frameColor = fill.color
    }
    customization.value = next
  }

  function applyPreset(preset: QrColorPreset) {
    customization.value = {
      ...customization.value,
      designTemplate: '',
      fgColor: preset.fgColor,
      bgColor: preset.bgColor,
      bodyFill: { kind: 'solid', color: preset.fgColor, color2: preset.fgColor, rotation: 45 },
      dotStyle: preset.dotStyle,
      cornerSquareStyle: preset.cornerSquareStyle,
      cornerDotStyle: preset.cornerDotStyle,
      cornerSquareColor: '',
      cornerDotColor: '',
      cornerSquareFill: { kind: 'solid', color: '', color2: preset.fgColor, rotation: 45 },
      cornerDotFill: { kind: 'solid', color: '', color2: preset.fgColor, rotation: 45 },
    }
  }

  function applyTemplate(template: QrDesignTemplate) {
    customization.value = applyDesignTemplate(customization.value, template)
  }

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('A fájl beolvasása nem sikerült.'))
      reader.readAsDataURL(file)
    })
  }

  async function verifyImage(dataUrl: string): Promise<boolean> {
    if (typeof window === 'undefined') return true
    return await new Promise((resolve) => {
      const image = new Image()
      image.onload = () => resolve(image.naturalWidth >= 32 && image.naturalHeight >= 32)
      image.onerror = () => resolve(false)
      image.src = dataUrl
    })
  }

  async function setLogo(file: File): Promise<boolean> {
    logoError.value = ''
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      logoError.value = 'Csak PNG, JPG, WebP, SVG vagy GIF képet tölthetsz fel.'
      return false
    }
    if (file.size > MAX_LOGO_BYTES) {
      logoError.value = 'A logó legfeljebb 1,5 MB lehet.'
      return false
    }
    try {
      const dataUrl = await readFileAsDataUrl(file)
      if (!(await verifyImage(dataUrl))) {
        logoError.value = 'A kép nem tölthető be, vagy kisebb, mint 32 × 32 pixel.'
        return false
      }
      customization.value = {
        ...customization.value,
        logo: dataUrl,
        logoName: file.name,
        errorCorrection: customization.value.errorCorrection === 'L' ? 'H' : customization.value.errorCorrection,
      }
      return true
    } catch {
      logoError.value = 'A kép feltöltése nem sikerült. Próbáld újra.'
      return false
    }
  }

  function removeLogo() {
    customization.value = { ...customization.value, logo: '', logoName: '' }
    logoError.value = ''
  }

  function resetCustomization() {
    customization.value = cloneCustomization(DEFAULT_CUSTOMIZATION)
    logoError.value = ''
  }

  return {
    customization,
    warnings,
    hasLogo,
    logoError,
    presets: COLOR_PRESETS,
    templates: DESIGN_TEMPLATES,
    update,
    setColor,
    setFill,
    setLogo,
    removeLogo,
    applyPreset,
    applyTemplate,
    resetCustomization,
  }
}
