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
  /** A töltő réteg beúszása, majd a váltás utáni rövid kitartás (ms). */
  const TYPE_LOADING_IN = 220
  const TYPE_LOADING_HOLD = 240
  let typeLoadingToken = 0

  /**
   * Típusváltás töltő animációval: előbb a glassmorphism réteg jelenik meg a régi
   * tartalom fölött, csak utána vált a tartalom, végül a réteg eltűnik. Így a
   * felhasználó nem a réteg alatt átvillanó adatot látja.
   */
  async function withTypeLoading(change: () => void): Promise<void> {
    if (!import.meta.client) {
      change()
      return
    }
    const token = ++typeLoadingToken
    typeLoading.value = true
    await new Promise(resolve => setTimeout(resolve, TYPE_LOADING_IN))
    // Közben másik típusra kattintottak: az újabb hívás viszi tovább a folyamatot.
    if (token !== typeLoadingToken) return
    change()
    await new Promise(resolve => setTimeout(resolve, TYPE_LOADING_HOLD))
    if (token !== typeLoadingToken) return
    typeLoading.value = false
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
    withTypeLoading,
    selectType,
    setValue,
    markTouched,
    shouldShowError,
    validateNow,
    resetCurrentType,
    clearCurrentContent,
  }
}
