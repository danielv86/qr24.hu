interface GtagConsentState {
  ad_storage: 'granted' | 'denied'
  ad_user_data: 'granted' | 'denied'
  ad_personalization: 'granted' | 'denied'
  analytics_storage: 'granted' | 'denied'
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

const SCRIPT_ID = 'adsbygoogle-loader'

export function useAdsense() {
  const scriptState = useState<'idle' | 'loading' | 'ready' | 'error'>('adsense-script-state', () => 'idle')
  const consentModeReady = useState('adsense-consent-ready', () => false)

  function ensureConsentMode() {
    if (!import.meta.client || consentModeReady.value) return
    window.dataLayer = window.dataLayer || []
    // A gtag függvény a hivatalos Google snippet mintáját követi.
    window.gtag = window.gtag || function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments)
    }
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500,
    })
    consentModeReady.value = true
  }

  function updateConsent(preferences: { analytics: boolean; marketing: boolean }) {
    if (!import.meta.client) return
    ensureConsentMode()
    const state: GtagConsentState = {
      ad_storage: preferences.marketing ? 'granted' : 'denied',
      ad_user_data: preferences.marketing ? 'granted' : 'denied',
      ad_personalization: preferences.marketing ? 'granted' : 'denied',
      analytics_storage: preferences.analytics ? 'granted' : 'denied',
    }
    window.gtag?.('consent', 'update', state)
  }

  function loadScript(clientId: string): Promise<void> {
    if (!import.meta.client || !clientId) return Promise.resolve()
    if (scriptState.value === 'ready') return Promise.resolve()
    if (scriptState.value === 'loading') {
      return new Promise((resolve) => {
        const check = window.setInterval(() => {
          if (scriptState.value === 'ready' || scriptState.value === 'error') {
            window.clearInterval(check)
            resolve()
          }
        }, 100)
      })
    }
    scriptState.value = 'loading'
    return new Promise((resolve) => {
      const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
      if (existing) {
        scriptState.value = 'ready'
        resolve()
        return
      }
      const script = document.createElement('script')
      script.id = SCRIPT_ID
      script.async = true
      script.crossOrigin = 'anonymous'
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`
      script.onload = () => {
        scriptState.value = 'ready'
        resolve()
      }
      script.onerror = () => {
        scriptState.value = 'error'
        resolve()
      }
      document.head.appendChild(script)
    })
  }

  return {
    scriptState,
    ensureConsentMode,
    updateConsent,
    loadScript,
  }
}
