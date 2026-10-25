import type { ApiResponse, PublicSettings } from '~/types/api'

export function useSiteSettings() {
  const config = useRuntimeConfig()

  const fallback = computed<PublicSettings>(() => ({
    brandName: config.public.brandName,
    siteUrl: config.public.siteUrl,
    dynamicQrEnabled: config.public.dynamicQrEnabled,
    adsense: {
      client: config.public.adsense.client,
      slots: { ...config.public.adsense.slots },
    },
    legal: {
      providerName: '',
      providerAddress: '',
      providerEmail: '',
      providerPhone: '',
      taxNumber: '',
      registryNumber: '',
      hostingProvider: '',
      hostingAddress: '',
    },
    seo: {},
  }))

  const { data } = useFetch<ApiResponse<PublicSettings>>('/api/settings/public', {
    key: 'public-settings',
    headers: { accept: 'application/json' },
  })

  const settings = computed<PublicSettings>(() => {
    const value = data.value
    if (value?.success) {
      return { ...fallback.value, ...value.data }
    }
    return fallback.value
  })

  const brandName = computed(() => settings.value.brandName)
  const siteUrl = computed(() => settings.value.siteUrl.replace(/\/$/, ''))

  return {
    settings,
    brandName,
    siteUrl,
    adsense: computed(() => settings.value.adsense),
    legal: computed(() => settings.value.legal),
    dynamicQrEnabled: computed(() => settings.value.dynamicQrEnabled),
    refresh: () => refreshNuxtData('public-settings'),
  }
}
