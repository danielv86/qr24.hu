export interface ConsentRecord {
  version: number
  necessary: true
  analytics: boolean
  marketing: boolean
  decidedAt: string
}

export const CONSENT_VERSION = 1

export function useCookieConsent() {
  const requestUrl = useRequestURL()
  const record = useCookie<ConsentRecord | null>('qr_consent', {
    maxAge: 60 * 60 * 24 * 180,
    sameSite: 'lax',
    path: '/',
    secure: requestUrl.protocol === 'https:',
    default: () => null,
  })

  const preferencesOpen = useState('consent-preferences-open', () => false)

  const hasDecision = computed(
    () => Boolean(record.value && record.value.version === CONSENT_VERSION),
  )
  const analyticsAllowed = computed(() => Boolean(hasDecision.value && record.value?.analytics))
  const marketingAllowed = computed(() => Boolean(hasDecision.value && record.value?.marketing))
  const showBanner = computed(() => !hasDecision.value || preferencesOpen.value)

  function save(preferences: { analytics: boolean; marketing: boolean }) {
    record.value = {
      version: CONSENT_VERSION,
      necessary: true,
      analytics: preferences.analytics,
      marketing: preferences.marketing,
      decidedAt: new Date().toISOString(),
    }
    preferencesOpen.value = false
  }

  function acceptAll() {
    save({ analytics: true, marketing: true })
  }

  function rejectNonEssential() {
    save({ analytics: false, marketing: false })
  }

  function openPreferences() {
    preferencesOpen.value = true
  }

  function closePreferences() {
    preferencesOpen.value = false
  }

  return {
    record,
    hasDecision,
    analyticsAllowed,
    marketingAllowed,
    showBanner,
    preferencesOpen,
    save,
    acceptAll,
    rejectNonEssential,
    openPreferences,
    closePreferences,
  }
}
