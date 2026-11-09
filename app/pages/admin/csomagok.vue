<script setup lang="ts">
import type { ApiSuccess, PlanId, PlansConfig } from '#shared/types/api'

definePageMeta({ layout: 'admin' })

useSeoMeta({
  title: 'Csomagok | Admin',
  robots: 'noindex, nofollow',
})

const { session } = useAdminSession()

interface PlanForm {
  label: string
  maxDynamicQr: number
  analyticsDays: number
  campaigns: boolean
  expiresAt: boolean
  csvExport: boolean
  apiAccess: boolean
  customDomain: boolean
  priceMonthly: number
  priceYearly: number
  domainLimit: number
}

type PlanFeatureKey = 'campaigns' | 'expiresAt' | 'csvExport' | 'apiAccess' | 'customDomain'

const PLAN_ORDER: PlanId[] = ['free', 'pro', 'business', 'lifetime']
const PLAN_FEATURES: { key: PlanFeatureKey; label: string }[] = [
  { key: 'campaigns', label: 'Kampánycímkék' },
  { key: 'expiresAt', label: 'Lejárati dátum' },
  { key: 'csvExport', label: 'CSV-export' },
  { key: 'apiAccess', label: 'API-hozzáférés' },
  { key: 'customDomain', label: 'Saját domain' },
]

const toast = useAdminToast()
const plansLoading = ref(false)
const plansSaving = ref(false)
const plansError = ref('')
const plansMessage = ref('')
const plansForm = reactive<Record<PlanId, PlanForm>>({
  free: { label: 'Alap', maxDynamicQr: 10, analyticsDays: 30, campaigns: false, expiresAt: false, csvExport: false, apiAccess: false, customDomain: false, priceMonthly: 890, priceYearly: 8900, domainLimit: 0 },
  pro: { label: 'Pro', maxDynamicQr: 100, analyticsDays: 365, campaigns: true, expiresAt: true, csvExport: true, apiAccess: false, customDomain: true, priceMonthly: 3590, priceYearly: 35900, domainLimit: 1 },
  business: { label: 'Üzleti', maxDynamicQr: 999, analyticsDays: 1095, campaigns: true, expiresAt: true, csvExport: true, apiAccess: true, customDomain: true, priceMonthly: 6290, priceYearly: 62900, domainLimit: 5 },
  lifetime: { label: 'Élettartam', maxDynamicQr: 999, analyticsDays: 1095, campaigns: true, expiresAt: true, csvExport: true, apiAccess: true, customDomain: true, priceMonthly: 0, priceYearly: 0, domainLimit: 10 },
})

function applyPlans(data: PlansConfig) {
  for (const id of PLAN_ORDER) {
    const plan = data[id]
    if (!plan) continue
    const target = plansForm[id]
    target.label = plan.label
    target.maxDynamicQr = plan.maxDynamicQr
    target.analyticsDays = plan.analyticsDays
    target.campaigns = plan.campaigns
    target.expiresAt = plan.expiresAt
    target.csvExport = plan.csvExport
    target.apiAccess = plan.apiAccess
    target.customDomain = plan.customDomain
    target.priceMonthly = plan.priceMonthly
    target.priceYearly = plan.priceYearly
    target.domainLimit = plan.domainLimit
  }
}

async function loadPlans() {
  plansLoading.value = true
  plansError.value = ''
  try {
    const response = await $fetch<ApiSuccess<PlansConfig>>('/api/admin/plans')
    applyPlans(response.data)
  } catch (error) {
    plansError.value = apiErrorMessage(error, 'A csomagok betöltése nem sikerült.')
  } finally {
    plansLoading.value = false
  }
}

async function savePlans() {
  plansSaving.value = true
  plansError.value = ''
  plansMessage.value = ''
  try {
    const body = Object.fromEntries(
      PLAN_ORDER.map((id) => {
        const plan = plansForm[id]
        return [id, {
          label: plan.label.trim(),
          maxDynamicQr: Math.max(0, Math.trunc(Number(plan.maxDynamicQr) || 0)),
          analyticsDays: Math.max(1, Math.trunc(Number(plan.analyticsDays) || 30)),
          campaigns: plan.campaigns,
          expiresAt: plan.expiresAt,
          csvExport: plan.csvExport,
          apiAccess: plan.apiAccess,
          customDomain: plan.customDomain,
          priceMonthly: Math.max(0, Math.trunc(Number(plan.priceMonthly) || 0)),
          priceYearly: Math.max(0, Math.trunc(Number(plan.priceYearly) || 0)),
          domainLimit: Math.max(0, Math.trunc(Number(plan.domainLimit) || 0)),
        }]
      }),
    )
    const response = await $fetch<ApiSuccess<PlansConfig>>('/api/admin/plans', { method: 'PATCH', body })
    applyPlans(response.data)
    plansMessage.value = 'A csomagok mentve.'
    toast.success('Csomagok mentve')
    await refreshNuxtData('public-settings')
  } catch (error) {
    plansError.value = apiErrorMessage(error, 'A csomagok mentése nem sikerült.')
    toast.error('Mentési hiba', plansError.value)
  } finally {
    plansSaving.value = false
  }
}

watch(
  session,
  (value) => {
    if (value) loadPlans()
  },
  { immediate: true },
)
</script>

<template>
  <AdminPageLayout title="Csomagok">
    <template #actions>
      <button type="submit" form="plans-form" class="btn-primary" :disabled="plansSaving">
        <Icon :name="plansSaving ? 'lucide:loader-circle' : 'lucide:save'" :class="['h-4 w-4', { 'animate-spin': plansSaving }]" aria-hidden="true" />
        {{ plansSaving ? 'Mentés…' : 'Mentés' }}
      </button>
    </template>

    <p v-if="plansError" class="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300" role="alert">{{ plansError }}</p>
    <p v-if="plansMessage" class="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300" role="status">{{ plansMessage }}</p>

    <p v-if="plansLoading" class="text-sm text-ink-muted">Betöltés…</p>

    <form v-else id="plans-form" class="space-y-4" novalidate @submit.prevent="savePlans">
      <div class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        <fieldset v-for="id in PLAN_ORDER" :key="id" class="card p-4">
          <legend class="sr-only">{{ plansForm[id].label }}</legend>
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-semibold text-ink">{{ plansForm[id].label }}</h2>
            <span class="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {{ id }}
            </span>
          </div>
          <p v-if="id === 'lifetime'" class="mt-1 text-[11px] text-ink-muted">
            Kézi kiosztás a felhasználó adatlapján – a vásárlási oldalon nem jelenik meg.
          </p>

          <div class="mt-3 space-y-3">
            <div>
              <label :for="`plan-label-${id}`" class="field-label">Megjelenő név</label>
              <input
                :id="`plan-label-${id}`"
                v-model="plansForm[id].label"
                type="text"
                maxlength="40"
                class="field-input py-2 text-sm"
                required
              >
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label :for="`plan-max-${id}`" class="field-label">Kódlimit</label>
                <input
                  :id="`plan-max-${id}`"
                  v-model.number="plansForm[id].maxDynamicQr"
                  type="number"
                  min="0"
                  step="1"
                  class="field-input py-2 text-sm"
                >
                <p class="field-help">Aktív kódokra</p>
              </div>
              <div>
                <label :for="`plan-days-${id}`" class="field-label">Analitika (nap)</label>
                <input
                  :id="`plan-days-${id}`"
                  v-model.number="plansForm[id].analyticsDays"
                  type="number"
                  min="1"
                  max="3650"
                  step="1"
                  class="field-input py-2 text-sm"
                >
                <p class="field-help">Visszamenőleg</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label :for="`plan-price-monthly-${id}`" class="field-label">Havi ár (Ft)</label>
                <input
                  :id="`plan-price-monthly-${id}`"
                  v-model.number="plansForm[id].priceMonthly"
                  type="number"
                  min="0"
                  step="10"
                  class="field-input py-2 text-sm"
                >
                <p class="field-help">0 = ingyenes</p>
              </div>
              <div>
                <label :for="`plan-price-yearly-${id}`" class="field-label">Éves ár (Ft)</label>
                <input
                  :id="`plan-price-yearly-${id}`"
                  v-model.number="plansForm[id].priceYearly"
                  type="number"
                  min="0"
                  step="100"
                  class="field-input py-2 text-sm"
                >
                <p class="field-help">A teljes évre</p>
              </div>
            </div>

            <div>
              <label :for="`plan-domains-${id}`" class="field-label">Saját domain limit</label>
              <input
                :id="`plan-domains-${id}`"
                v-model.number="plansForm[id].domainLimit"
                type="number"
                min="0"
                max="100"
                step="1"
                class="field-input py-2 text-sm"
              >
              <p class="field-help">0 = nem rendelhető domain a csomagban</p>
            </div>

            <div class="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
              <label
                v-for="feature in PLAN_FEATURES"
                :key="feature.key"
                class="flex items-center gap-2 text-xs text-ink-soft"
              >
                <input
                  v-model="plansForm[id][feature.key]"
                  type="checkbox"
                  class="h-4 w-4 accent-brand-600"
                >
                {{ feature.label }}
              </label>
            </div>
          </div>
        </fieldset>
      </div>

    </form>
  </AdminPageLayout>
</template>
