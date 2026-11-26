import {
  QR_TYPES,
  buildQrContent,
  createDefaultValues,
  createSampleValues,
  getQrType,
  isQrTypeId,
} from '#shared/qr/content'
import type { QrFormValues, QrTypeId } from '#shared/qr/types'

export function useQrGenerator() {
  const activeType = useState<QrTypeId>('qr-active-type', () => 'url')
  const valuesByType = useState<Record<QrTypeId, QrFormValues>>('qr-values', () => {
    const initial = {} as Record<QrTypeId, QrFormValues>
    for (const type of QR_TYPES) initial[type.id] = createDefaultValues(type.id)
    return initial
  })
  const touched = useState<Record<string, boolean>>('qr-touched', () => ({}))
  const attempted = useState<boolean>('qr-attempted', () => false)
  /** Igaz, amíg a típusváltás töltő animációja látszik a panelen és az előnézeten. */
  const typeLoading = useState<boolean>('qr-type-loading', () => false)
  let typeLoadingTimer: ReturnType<typeof setTimeout> | undefined

  /**
   * A típusváltás rövid töltő animációja. Fix ideig látszik, hogy a váltás
   * érzékelhető legyen, de ne lassítsa érdemben a munkát.
   */
  function startTypeLoading(duration = 550) {
    if (!import.meta.client) return
    if (typeLoadingTimer) clearTimeout(typeLoadingTimer)
    typeLoading.value = true
    typeLoadingTimer = setTimeout(() => {
      typeLoading.value = false
      typeLoadingTimer = undefined
    }, duration)
  }

  const typeDefinition = computed(() => getQrType(activeType.value))
  const values = computed(() => valuesByType.value[activeType.value] || {})
  const result = computed(() => buildQrContent(activeType.value, values.value))
  const payload = computed(() => (result.value.ok ? result.value.data : ''))
  /**
   * Bemutató tartalom: amíg az űrlap üres, az előnézetben a típus mintaadataival
   * készült kód látszik, hogy a felhasználó lássa, mire számíthat.
   */
  const samplePayload = computed(() => {
    const sample = buildQrContent(activeType.value, createSampleValues(activeType.value))
    return sample.ok ? sample.data : ''
  })
  const previewPayload = computed(() => payload.value || samplePayload.value)
  /** Igaz, ha az előnézetben minta látszik, mert a felhasználó még nem adott meg adatot. */
  const isSamplePreview = computed(() => !payload.value && Boolean(samplePayload.value))
  const isValid = computed(() => result.value.ok)
  const errors = computed<Record<string, string>>(() => (result.value.ok ? {} : result.value.errors))
  /** Nem blokkoló üzenetek: a kód elkészül, de a mező alatt hibaüzenet látszik. */
  const notices = computed<Record<string, string>>(() => (result.value.ok ? (result.value.notices ?? {}) : {}))
  const warnings = computed(() => result.value.warnings)

  function selectType(id: string) {
    if (!isQrTypeId(id)) return
    activeType.value = id
    attempted.value = false
    touched.value = {}
  }

  function setValue(key: string, value: string | boolean) {
    const type = activeType.value
    valuesByType.value = {
      ...valuesByType.value,
      [type]: {
        ...valuesByType.value[type],
        [key]: value,
      },
    }
    touched.value = { ...touched.value, [`${type}.${key}`]: true }
  }

  function markTouched(key: string) {
    touched.value = { ...touched.value, [`${activeType.value}.${key}`]: true }
  }

  function shouldShowError(key: string): boolean {
    return Boolean(errors.value[key] && (attempted.value || touched.value[`${activeType.value}.${key}`]))
  }

  function validateNow(): boolean {
    attempted.value = true
    return result.value.ok
  }

  function resetCurrentType() {
    valuesByType.value = {
      ...valuesByType.value,
      [activeType.value]: createDefaultValues(activeType.value),
    }
    touched.value = {}
    attempted.value = false
  }

  function clearCurrentContent() {
    const cleared: QrFormValues = {}
    for (const field of typeDefinition.value.fields) {
      if (field.type === 'select') cleared[field.key] = String(field.defaultValue ?? '')
      else if (field.type === 'checkbox') cleared[field.key] = false
      else cleared[field.key] = ''
    }
    valuesByType.value = { ...valuesByType.value, [activeType.value]: cleared }
    touched.value = {}
    attempted.value = false
  }

  return {
    activeType,
    typeDefinition,
    values,
    result,
    payload,
    samplePayload,
    previewPayload,
    isSamplePreview,
    isValid,
    errors,
    notices,
    warnings,
    attempted,
    typeLoading,
    startTypeLoading,
    selectType,
    setValue,
    markTouched,
    shouldShowError,
    validateNow,
    resetCurrentType,
    clearCurrentContent,
  }
}
