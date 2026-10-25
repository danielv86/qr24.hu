import { POPULAR_QR_TYPES, QR_MENU_TYPES, getQrType } from '#shared/qr/content'
import {
  COLOR_PRESETS,
  DOT_STYLE_OPTIONS,
  ERROR_LEVEL_OPTIONS,
  FRAME_OPTIONS,
} from '#shared/qr/customization'

export function useQrTemplates() {
  return {
    templates: QR_MENU_TYPES,
    popular: POPULAR_QR_TYPES,
    colorPresets: COLOR_PRESETS,
    dotStyles: DOT_STYLE_OPTIONS,
    errorLevels: ERROR_LEVEL_OPTIONS,
    frames: FRAME_OPTIONS,
    getTemplate: getQrType,
  }
}
