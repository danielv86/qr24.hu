<script setup lang="ts">
import type { ApiSuccess, PublicSettings } from '#shared/types/api'

definePageMeta({ layout: 'admin' })

useSeoMeta({
  title: 'Csomagvásárlás beállításai | Admin',
  robots: 'noindex, nofollow',
})

const { form, loading, saving, error, message, savedBilling, billingDirty, save } = useAdminSettings()

/** A nyilvános beállítás-végpontról visszaolvasott, ténylegesen érvényes állapot. */
const publicState = ref<{ plansEnabled: boolean; trialDays: number } | null>(null)
const checking = ref(false)
const checkedAt = ref('')
const checkError = ref('')

async function refreshPublicState() {
  checking.value = true
  checkError.value = ''
  try {
    // A nyilvános végpont 30 mp-ig cache-elhető, ezért ellenőrzéskor cache-busting.
    const response = await $fetch<ApiSuccess<PublicSettings>>(`/api/settings/public?verify=${Date.now()}`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
    publicState.value = {
      plansEnabled: response.data.billing?.plansEnabled === true,
      trialDays: response.data.billing?.trialDays ?? 0,
    }
    checkedAt.value = new Date().toLocaleTimeString('hu-HU')
  } catch (cause) {
    checkError.value = apiErrorMessage(cause, 'A nyilvános állapot lekérdezése nem sikerült.')
  } finally {
    checking.value = false
  }
}

onMounted(refreshPublicState)

async function saveAndVerify() {
  await save()
  if (!error.value) await refreshPublicState()
}

const trialEndText = computed(() => {
  const days = Number(form.billing.trialDays) || 0
  if (days <= 0) return 'Nincs próbaidő'
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  return `${days} nap – ${date.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}`
})

const savedTrialEndText = computed(() => {
  const days = savedBilling.value.trialDays
  if (days <= 0) return 'Nincs próbaidő'
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  return `${days} nap – ${date.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}`
})

function stateBadge(enabled: boolean): string {
  return enabled
    ? 'inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    : 'inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600'
}

const publicMismatch = computed(() => Boolean(
  publicState.value && publicState.value.plansEnabled !== savedBilling.value.plansEnabled,
))
</script>

<template>
  <AdminPageLayout title="Csomagvásárlás">
    <template #actions>
      <button type="submit" form="billing-settings" class="btn-primary" :disabled="saving">
        <Icon :name="saving ? 'lucide:loader-circle' : 'lucide:save'" :class="['h-4 w-4', { 'animate-spin': saving }]" aria-hidden="true" />
        {{ saving ? 'Mentés…' : 'Mentés' }}
      </button>
      <NuxtLink to="/admin/csomagok" class="btn-secondary px-3 py-2 text-xs">
        <Icon name="lucide:package" class="h-4 w-4" aria-hidden="true" />
        Csomagok és árak
      </NuxtLink>
    </template>

    <form id="billing-settings" class="card p-5 sm:p-6" novalidate @submit.prevent="saveAndVerify">
      <div v-if="loading" class="text-sm text-ink-muted">Betöltés…</div>

      <template v-else>
        <label class="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-sm text-ink-soft">
          <input v-model="form.billing.plansEnabled" type="checkbox" class="mt-0.5 h-4 w-4 accent-brand-600">
          <span class="font-semibold text-ink">Csomagok vásárolhatók</span>
        </label>

        <div class="mt-4 max-w-xs">
          <label for="billing-trial-days" class="field-label">Próbaidő hossza (nap)</label>
          <input
            id="billing-trial-days"
            v-model.number="form.billing.trialDays"
            type="number"
            min="0"
            max="90"
            step="1"
            class="field-input py-2 text-sm"
          >
          <div class="mt-2 flex gap-2">
            <button type="button" class="btn-secondary px-3 py-1.5 text-xs" @click="form.billing.trialDays = 14">14 nap</button>
            <button type="button" class="btn-secondary px-3 py-1.5 text-xs" @click="form.billing.trialDays = 30">30 nap</button>
            <button type="button" class="btn-secondary px-3 py-1.5 text-xs" @click="form.billing.trialDays = 0">Nincs</button>
          </div>
        </div>

        <p v-if="error" class="field-error mt-4" role="alert">{{ error }}</p>
        <p v-if="message" class="mt-3 text-sm text-emerald-700 dark:text-emerald-300" role="status">{{ message }}</p>
      </template>
    </form>

    <section class="card mt-4 p-4" aria-labelledby="billing-state-title">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 id="billing-state-title" class="text-sm font-semibold text-ink">Kapcsoló állapota</h2>
        <button type="button" class="btn-secondary px-3 py-1.5 text-xs" :disabled="checking" @click="refreshPublicState">
          <Icon
            :name="checking ? 'lucide:loader-circle' : 'lucide:refresh-cw'"
            :class="['h-3.5 w-3.5', { 'animate-spin': checking }]"
            aria-hidden="true"
          />
          {{ checking ? 'Ellenőrzés…' : 'Ellenőrzés' }}
        </button>
      </div>

      <dl class="mt-3 grid gap-3 text-xs sm:grid-cols-3">
        <div class="rounded-lg bg-slate-50 p-3">
          <dt class="text-ink-muted">Mentett beállítás</dt>
          <dd class="mt-1">
            <span :class="stateBadge(savedBilling.plansEnabled)">
              <Icon :name="savedBilling.plansEnabled ? 'lucide:check' : 'lucide:x'" class="h-3 w-3" aria-hidden="true" />
              {{ savedBilling.plansEnabled ? 'vásárolható' : 'kikapcsolva' }}
            </span>
          </dd>
          <dd class="mt-1.5 text-[11px] text-ink-muted">Próbaidő: {{ savedBilling.trialDays }} nap</dd>
        </div>

        <div class="rounded-lg bg-slate-50 p-3">
          <dt class="text-ink-muted">Nyilvános oldal</dt>
          <dd class="mt-1">
            <span v-if="publicState" :class="stateBadge(publicState.plansEnabled)">
              <Icon :name="publicState.plansEnabled ? 'lucide:check' : 'lucide:x'" class="h-3 w-3" aria-hidden="true" />
              {{ publicState.plansEnabled ? 'vásárolható' : 'kikapcsolva' }}
            </span>
            <span v-else class="text-ink-muted">{{ checking ? 'ellenőrzés…' : 'nincs adat' }}</span>
          </dd>
          <dd class="mt-1.5 text-[11px] text-ink-muted">
            {{ checkedAt ? `Ellenőrizve: ${checkedAt}` : 'Még nincs ellenőrizve' }}
          </dd>
        </div>

        <div class="rounded-lg bg-slate-50 p-3">
          <dt class="text-ink-muted">Új előfizetés próbaideje</dt>
          <dd class="mt-1 font-medium text-ink">{{ trialEndText }}</dd>
          <dd v-if="billingDirty" class="mt-1.5 text-[11px] text-amber-700 dark:text-amber-300">
            Mentett érték: {{ savedTrialEndText }}
          </dd>
        </div>
      </dl>

      <p v-if="billingDirty" class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200" role="status">
        Nem mentett módosítás – a nyilvános oldal még a mentett értéket használja.
      </p>
      <p v-if="publicMismatch" class="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:bg-sky-950/40 dark:text-sky-200" role="status">
        A nyilvános oldal még a korábbi állapotot mutatja. Nyomd meg az „Ellenőrzés” gombot néhány másodperc múlva.
      </p>
      <p v-if="checkError" class="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
        {{ checkError }}
      </p>

      <NuxtLink to="/csomagok" target="_blank" rel="noopener" class="btn-secondary mt-3 px-3 py-2 text-xs">
        <Icon name="lucide:external-link" class="h-4 w-4" aria-hidden="true" />
        Csomagok oldal megnyitása
      </NuxtLink>
    </section>
  </AdminPageLayout>
</template>
