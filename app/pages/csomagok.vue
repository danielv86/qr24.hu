<script setup lang="ts">
import type {
  ApiSuccess,
  BillingInterval,
  BillingOverview,
  PlanDefinition,
  PlanId,
  SubscriptionSummary,
} from '#shared/types/api'

useSeoMeta({
  title: 'Csomagok és árak | QRKOD24.hu',
  description:
    'Dinamikus QR-kód csomagok: Alap, Pro és Üzleti. Több kód, részletes analitika és saját domain – átlátható havi vagy éves áron.',
  ogTitle: 'Csomagok és árak | QRKOD24.hu',
  ogDescription:
    'Válaszd ki a dinamikus QR-kódjaidhoz illő csomagot: Alap, Pro vagy Üzleti. Havi és éves előfizetés, forintban.',
  robots: 'index, follow',
})

const { settings } = useSiteSettings()
const { user, refresh } = useUserSession()
const billingMode = ref<'monthly' | 'yearly'>('yearly')

const billing = computed(() => settings.value.billing ?? { plansEnabled: false, trialDays: 14 })
const trialDays = computed(() => Math.max(0, billing.value.trialDays))

const plans = computed<PlanDefinition[]>(() => {
  const config = settings.value.plans
  if (!config) return []
  return (['free', 'pro', 'business'] as PlanId[])
    .map(id => config[id])
    .filter((plan): plan is PlanDefinition => Boolean(plan))
})

const highlighted: PlanId = 'pro'

const planTagClasses: Record<PlanId, string> = {
  free: 'bg-brand-50 text-brand-700',
  pro: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
  business: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300',
  lifetime: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
}

function formatHuf(value: number): string {
  const grouped = String(Math.max(0, Math.round(value))).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')
  return `${grouped} Ft`
}

function savings(plan: PlanDefinition): number {
  const full = plan.priceMonthly * 12
  if (full <= 0 || plan.priceYearly <= 0) return 0
  return Math.max(0, Math.round((1 - plan.priceYearly / full) * 100))
}

interface PlanFeature {
  label: string
  available: boolean
}

function features(plan: PlanDefinition): PlanFeature[] {
  return [
    { label: `${plan.maxDynamicQr.toLocaleString('hu-HU')} QR-kód`, available: true },
    { label: 'Korlátlan beolvasás', available: true },
    { label: `Analitika (${plan.analyticsDays} nap)`, available: plan.analyticsDays > 0 },
    {
      label: plan.domainLimit > 0
        ? `${plan.domainLimit} saját domain`
        : 'Nincs saját domain',
      available: plan.domainLimit > 0,
    },
    { label: plan.apiAccess ? 'API-hozzáférés' : 'Nincs API-hozzáférés', available: plan.apiAccess },
    { label: plan.csvExport ? 'CSV-export' : 'Nincs CSV-export', available: plan.csvExport },
    { label: 'Hirdetésmentes fiókfelület', available: true },
  ]
}

const annualSaving = computed(() => {
  const values = plans.value.map(savings).filter(value => value > 0)
  return values.length ? Math.max(...values) : 0
})

/* ---- Előfizetés állapota ---- */

const subscription = ref<SubscriptionSummary | null>(null)
const subscriptionLoaded = ref(false)

async function loadSubscription() {
  if (!user.value) {
    subscription.value = null
    subscriptionLoaded.value = true
    return
  }
  try {
    const response = await $fetch<ApiSuccess<BillingOverview>>('/api/billing', {
      headers: { accept: 'application/json' },
    })
    subscription.value = response.data.subscription
  } catch {
    subscription.value = null
  } finally {
    subscriptionLoaded.value = true
  }
}

onMounted(loadSubscription)
watch(user, () => {
  void loadSubscription()
})

const currentPlanId = computed<PlanId>(() => {
  const sub = subscription.value
  if (sub && sub.status !== 'expired') return sub.plan
  return (user.value?.plan || 'free') as PlanId
})

const currentPlanActive = computed(() => {
  const sub = subscription.value
  if (!sub) return currentPlanId.value !== 'free'
  return sub.status === 'trialing' || sub.status === 'active'
})

/** A próbaidőszakra jogosult-e a fiók (a szerver dönt, itt csak a jelzés). */
const trialAvailable = computed(() => {
  if (!user.value) return trialDays.value > 0
  return subscription.value ? subscription.value.trialAvailable : trialDays.value > 0
})

/* ---- Vásárlás ---- */

const authOpen = ref(false)
const authMode = ref<'login' | 'register'>('register')
const pendingPlan = ref<{ plan: PlanDefinition; interval: BillingInterval } | null>(null)
const confirmOpen = ref(false)
const selected = ref<{ plan: PlanDefinition; interval: BillingInterval } | null>(null)
const submitting = ref(false)
const purchaseError = ref('')
const purchaseMessage = ref('')

function planActionLabel(plan: PlanDefinition): string {
  if (!billing.value.plansEnabled) return 'Hamarosan'
  if (plan.id === 'free') {
    return currentPlanId.value === 'free' ? 'Jelenlegi csomag' : 'Ingyenes csomag'
  }
  if (currentPlanId.value === plan.id && currentPlanActive.value) return 'Aktív csomag'
  return currentPlanActive.value ? 'Váltás erre a csomagra' : 'Kiválasztom'
}

function planActionDisabled(plan: PlanDefinition): boolean {
  if (!billing.value.plansEnabled) return true
  if (plan.id === 'free') return true
  if (plan.priceMonthly <= 0 && plan.priceYearly <= 0) return true
  return currentPlanId.value === plan.id && currentPlanActive.value
}

function openConfirm(payload: { plan: PlanDefinition; interval: BillingInterval }) {
  selected.value = payload
  purchaseError.value = ''
  purchaseMessage.value = ''
  confirmOpen.value = true
}

function choosePlan(plan: PlanDefinition) {
  if (planActionDisabled(plan)) return
  const interval: BillingInterval = billingMode.value
  pendingPlan.value = { plan, interval }
  if (!user.value) {
    authMode.value = 'register'
    authOpen.value = true
    return
  }
  openConfirm({ plan, interval })
}

async function onAuthenticated() {
  authOpen.value = false
  await refresh()
  const pending = pendingPlan.value
  pendingPlan.value = null
  if (pending) openConfirm(pending)
}

function closeConfirm() {
  if (submitting.value) return
  confirmOpen.value = false
  selected.value = null
}

async function submitPurchase() {
  const payload = selected.value
  if (!payload || submitting.value) return
  submitting.value = true
  purchaseError.value = ''
  try {
    const response = await $fetch<ApiSuccess<BillingOverview>>('/api/billing/subscribe', {
      method: 'POST',
      body: { planId: payload.plan.id, interval: payload.interval },
      headers: { accept: 'application/json' },
    })
    subscription.value = response.data.subscription
    confirmOpen.value = false
    selected.value = null
    await refresh()
    await refreshNuxtData('fiok-billing-summary')
    purchaseMessage.value = response.data.subscription?.status === 'trialing'
      ? `Elindult a ${trialDays.value} napos próbaidőszak a(z) ${payload.plan.label} csomaggal. A fiókodban bármikor lemondhatod.`
      : `A(z) ${payload.plan.label} csomag aktív. A fiókodban bármikor módosíthatod vagy lemondhatod.`
  } catch (error) {
    purchaseError.value = apiErrorMessage(error, 'A csomag kiválasztása nem sikerült.')
  } finally {
    submitting.value = false
  }
}

const selectedPrice = computed(() => {
  if (!selected.value) return 0
  return selected.value.interval === 'yearly'
    ? selected.value.plan.priceYearly
    : selected.value.plan.priceMonthly
})

const trialEndPreview = computed(() => {
  if (trialDays.value <= 0) return ''
  const date = new Date(Date.now() + trialDays.value * 24 * 60 * 60 * 1000)
  return date.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
})
</script>

<template>
  <div class="bg-canvas">
    <div class="container-page py-10 lg:py-16">
      <div class="mx-auto max-w-2xl text-center">
        <span class="eyebrow">
          <Icon name="lucide:package" class="h-4 w-4" aria-hidden="true" />
          Csomagok
        </span>
        <h1 class="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Válaszd ki a hozzád illő csomagot
        </h1>
        <p class="mt-3 text-base leading-relaxed text-ink-soft">
          A dinamikus QR-kódokhoz több kód, részletes analitika és saját domain jár.
          Az árak forintban, az áfát tartalmazzák.
        </p>
      </div>

      <div class="mx-auto mt-7 flex max-w-3xl flex-col items-center gap-3 text-sm">
        <p v-if="!billing.plansEnabled" class="flex items-start gap-2 text-ink-soft">
          <Icon name="lucide:gift" class="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          <span>Az online csomagvásárlás hamarosan indul – addig a fiókod a jelenlegi csomagján marad.</span>
        </p>
        <p v-else class="flex items-start gap-2 text-ink-soft">
          <Icon name="lucide:credit-card" class="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          <span>
            A bankkártyás fizetés még nem aktív: a csomag most fizetés nélkül aktiválódik
            <template v-if="trialDays > 0">, először {{ trialDays }} napos próbaidővel</template>.
          </span>
        </p>
        <p v-if="purchaseMessage" class="w-full rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" role="status">
          {{ purchaseMessage }}
          <NuxtLink to="/fiok/szamlazas" class="ml-1 font-semibold underline">Ugrás a számlázáshoz</NuxtLink>
        </p>
        <p class="flex items-start gap-2 text-center text-xs text-ink-muted">
          <Icon name="lucide:shield-check" class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>A QR-kódjaid nem járnak le: a csomag módosítása csak a prémium funkciókat érinti.</span>
        </p>
      </div>

      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <div class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-surface p-1" role="group" aria-label="Számlázási időszak">
          <button
            type="button"
            :class="[
              'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
              billingMode === 'monthly' ? 'bg-brand-600 text-white' : 'text-ink-soft hover:text-ink',
            ]"
            :aria-pressed="billingMode === 'monthly'"
            @click="billingMode = 'monthly'"
          >
            Havi
          </button>
          <button
            type="button"
            :class="[
              'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
              billingMode === 'yearly' ? 'bg-brand-600 text-white' : 'text-ink-soft hover:text-ink',
            ]"
            :aria-pressed="billingMode === 'yearly'"
            @click="billingMode = 'yearly'"
          >
            Éves
          </button>
        </div>

        <span v-if="annualSaving > 0" class="rounded-full bg-fuchsia-50 px-3 py-1.5 text-xs font-semibold text-fuchsia-700">
          Akár {{ annualSaving }}% megtakarítás
        </span>

        <span v-if="billing.plansEnabled && trialDays > 0" class="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {{ trialDays }} napos próbaidő
        </span>

        <span class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft">
          <Icon name="lucide:banknote" class="h-4 w-4" aria-hidden="true" />
          Pénznem: HUF Ft
        </span>
      </div>

      <p v-if="!plans.length" class="mt-10 rounded-xl border border-slate-200 bg-surface p-6 text-center text-sm text-ink-muted">
        A csomagok betöltése folyamatban van. Frissítsd az oldalt.
      </p>

      <div v-else class="mt-8 grid gap-4 md:grid-cols-3 md:items-start">
        <article
          v-for="plan in plans"
          :key="plan.id"
          :class="[
            'relative flex h-full flex-col rounded-2xl border bg-surface p-5 shadow-sm',
            plan.id === highlighted ? 'border-2 border-brand-500 shadow-lift md:-mt-3 md:pb-7' : 'border-slate-200',
          ]"
        >
          <span
            v-if="plan.id === highlighted"
            class="absolute -top-3 right-4 inline-flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow"
          >
            <Icon name="lucide:star" class="h-3 w-3" aria-hidden="true" />
            Legnépszerűbb
          </span>

          <span :class="['inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide', planTagClasses[plan.id]]">
            {{ plan.label }}
          </span>

          <div class="mt-4 flex items-end gap-2">
            <span class="text-4xl font-extrabold tracking-tight text-ink">{{ formatHuf(plan.priceMonthly) }}</span>
            <span class="pb-1 text-sm text-ink-muted">/ hó</span>
          </div>

          <p class="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <span>{{ billingMode === 'yearly' ? `${formatHuf(plan.priceYearly)} / év` : `Éves előfizetéssel ${formatHuf(plan.priceYearly)}` }}</span>
            <span
              v-if="savings(plan) > 0"
              class="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300"
            >
              {{ savings(plan) }}% megtakarítás
            </span>
          </p>

          <ul class="mt-5 flex-1 space-y-2.5 text-sm">
            <li v-for="feature in features(plan)" :key="feature.label" class="flex items-start gap-2">
              <Icon
                :name="feature.available ? 'lucide:check-circle-2' : 'lucide:x-circle'"
                :class="[
                  'mt-0.5 h-[18px] w-[18px] shrink-0',
                  feature.available ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500',
                ]"
                aria-hidden="true"
              />
              <span :class="feature.available ? 'text-ink-soft' : 'text-ink-muted'">{{ feature.label }}</span>
            </li>
          </ul>

          <button
            type="button"
            :disabled="planActionDisabled(plan)"
            :class="[
              'mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors',
              planActionDisabled(plan) ? 'cursor-not-allowed' : 'hover:brightness-105',
              plan.id === highlighted ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700',
              planActionDisabled(plan) ? 'opacity-70' : '',
            ]"
            :title="planActionDisabled(plan) ? (billing.plansEnabled ? planActionLabel(plan) : 'Az online csomagvásárlás jelenleg nem elérhető.') : undefined"
            @click="choosePlan(plan)"
          >
            {{ planActionLabel(plan) }}
          </button>

          <p v-if="billing.plansEnabled && plan.id !== 'free' && trialAvailable && trialDays > 0" class="mt-2 text-center text-[11px] text-ink-muted">
            {{ trialDays }} napig díjmentesen kipróbálható
          </p>
        </article>
      </div>

      <div class="mx-auto mt-8 max-w-2xl space-y-2 text-center text-xs leading-relaxed text-ink-muted">
        <p>Az árak az áfát tartalmazzák. Az áfát vállalkozásként visszaigényelheted, ha erre jogosult vagy.</p>
        <p>
          Az előfizetést a fiókodban bármikor módosíthatod vagy lemondhatod; lemondás után a csomag az időszak végéig jár,
          utána automatikusan az ingyenes csomagra vált. A QR-kódjaid megmaradnak.
        </p>
        <p>
          Kérdésed van? <NuxtLink to="/kapcsolat" class="font-semibold text-brand-700 hover:underline">Írj nekünk</NuxtLink>.
        </p>
      </div>
    </div>

    <AuthModal
      v-model:open="authOpen"
      :initial-mode="authMode"
      title="Csomag kiválasztása fiókkal"
      @authenticated="onAuthenticated"
    />

    <Teleport to="body">
      <div v-if="confirmOpen && selected" class="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
        <div class="auth-modal-backdrop absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="closeConfirm" />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="plan-confirm-title"
          class="auth-modal-panel relative z-10 my-auto w-full max-w-md rounded-2xl border border-slate-200 bg-surface p-5 shadow-2xl sm:p-6"
        >
          <div class="flex items-start justify-between gap-3">
            <h2 id="plan-confirm-title" class="text-lg font-semibold text-ink">
              {{ subscription && subscription.status !== 'expired' ? 'Csomagváltás' : 'Csomag kiválasztása' }}
            </h2>
            <button
              type="button"
              class="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink"
              aria-label="Bezárás"
              @click="closeConfirm"
            >
              <Icon name="lucide:x" class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div class="flex items-baseline justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-ink">{{ selected.plan.label }}</p>
                <p class="mt-0.5 text-xs text-ink-muted">
                  {{ selected.interval === 'yearly' ? 'Éves számlázás' : 'Havi számlázás' }}
                </p>
              </div>
              <p class="text-right text-lg font-bold text-ink">
                {{ formatHuf(selectedPrice) }}
                <span class="block text-[11px] font-medium text-ink-muted">{{ selected.interval === 'yearly' ? '/ év' : '/ hó' }}</span>
              </p>
            </div>
          </div>

          <ul class="mt-4 space-y-2 text-xs leading-relaxed text-ink-soft">
            <li v-if="trialAvailable && trialDays > 0" class="flex gap-2">
              <Icon name="lucide:gift" class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>A csomag {{ trialDays }} napos próbaidővel indul, a próbaidő vége: {{ trialEndPreview }}</span>
            </li>
            <li v-else class="flex gap-2">
              <Icon name="lucide:calendar-check" class="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              <span>A csomag az első számlázási időszakra aktiválódik.</span>
            </li>
            <li class="flex gap-2">
              <Icon name="lucide:info" class="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <span>
                A bankkártyás fizetés még nem aktív, ezért most nem terhelünk semmit. Az időszak végén a fiók
                automatikusan visszavált az ingyenes csomagra, kivéve, ha közben újra kiválasztasz egy csomagot.
              </span>
            </li>
            <li class="flex gap-2">
              <Icon name="lucide:undo-2" class="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <span>Lemondás a fiók „Számlázás” oldalán, az időszak végéig a csomag jár.</span>
            </li>
          </ul>

          <p v-if="purchaseError" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
            {{ purchaseError }}
          </p>

          <div class="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
            <button type="button" class="btn-primary w-full sm:w-auto" :disabled="submitting" @click="submitPurchase">
              {{ submitting ? 'Aktiválás…' : 'Megerősítem' }}
            </button>
            <button type="button" class="btn-secondary w-full sm:w-auto" :disabled="submitting" @click="closeConfirm">
              Mégse
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.auth-modal-backdrop {
  animation: auth-backdrop-in 200ms ease-out both;
}

.auth-modal-panel {
  animation: auth-panel-in 200ms ease-out both;
}

@keyframes auth-backdrop-in {
  from {
    background-color: rgb(15 23 42 / 0);
    backdrop-filter: blur(0);
  }
  to {
    background-color: rgb(15 23 42 / 0.5);
    backdrop-filter: blur(4px);
  }
}

@keyframes auth-panel-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-modal-backdrop,
  .auth-modal-panel {
    animation: none;
  }
}
</style>
