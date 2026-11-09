import type { ApiSuccess, PublicSettings } from '#shared/types/api'

/**
 * Az admin beállítások űrlapja. A beállítások oldalai (általános, AdSense,
 * adatvédelem, csomagvásárlás) ugyanezt használják: a mentés mindig a teljes
 * beállításkészletet küldi, ezért bármelyik oldalról mentve nem veszik el adat.
 */
export function useAdminSettings() {
  const { session } = useAdminSession()

  const form = reactive({
    brandName: '',
    adsense: { client: '', slots: { top: '', sidebar: '', content: '', guide: '', mobile: '' } },
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
    billing: { plansEnabled: false, trialDays: 14 },
  })

  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const message = ref('')
  const loaded = ref(false)
  /** A szerveren mentett értékek (a nyilvános viselkedés ellenőrzéséhez). */
  const savedBilling = ref({ plansEnabled: false, trialDays: 14 })

  /** Oldalankénti SEO felülírások száma (a szerkesztés a SEO oldalon). */
  const seoOverrideCount = ref(0)
  const runtimeInfo = ref({ siteUrl: '', dynamicQrEnabled: true })

  function apply(data: PublicSettings) {
    form.brandName = data.brandName
    form.adsense.client = data.adsense.client
    Object.assign(form.adsense.slots, data.adsense.slots)
    Object.assign(form.legal, data.legal)
    form.billing.plansEnabled = data.billing?.plansEnabled === true
    form.billing.trialDays = data.billing?.trialDays ?? 14
    savedBilling.value = {
      plansEnabled: form.billing.plansEnabled,
      trialDays: form.billing.trialDays,
    }
    seoOverrideCount.value = Object.keys(data.seo || {}).length
    runtimeInfo.value = { siteUrl: data.siteUrl, dynamicQrEnabled: data.dynamicQrEnabled }
    loaded.value = true
  }

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const response = await $fetch<ApiSuccess<PublicSettings>>('/api/admin/settings')
      apply(response.data)
    } catch (cause) {
      error.value = apiErrorMessage(cause, 'A beállítások betöltése nem sikerült.')
    } finally {
      loading.value = false
    }
  }

  const toast = useAdminToast()

  async function save() {
    saving.value = true
    error.value = ''
    message.value = ''
    try {
      const response = await $fetch<ApiSuccess<PublicSettings>>('/api/admin/settings', {
        method: 'PATCH',
        body: {
          brandName: form.brandName,
          adsense: form.adsense,
          legal: form.legal,
          billing: form.billing,
        },
      })
      apply(response.data)
      message.value = 'A beállítások mentve.'
      toast.success('Beállítások mentve')
      await refreshNuxtData('public-settings')
    } catch (cause) {
      error.value = apiErrorMessage(cause, 'A beállítások mentése nem sikerült.')
      toast.error('Mentési hiba', error.value)
    } finally {
      saving.value = false
    }
  }

  watch(
    session,
    (value) => {
      if (value) load()
    },
    { immediate: true },
  )

  /** Igaz, ha az űrlap eltér a mentett értékektől. */
  const billingDirty = computed(() =>
    form.billing.plansEnabled !== savedBilling.value.plansEnabled
    || Number(form.billing.trialDays) !== savedBilling.value.trialDays,
  )

  return {
    form,
    loading,
    saving,
    error,
    message,
    loaded,
    savedBilling,
    billingDirty,
    seoOverrideCount,
    runtimeInfo,
    load,
    save,
  }
}
