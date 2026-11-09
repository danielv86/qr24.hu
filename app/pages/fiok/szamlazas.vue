<script setup lang="ts">
import type { ApiSuccess, BillingOverview, DashboardSummary, PlanDefinition, PlanId } from '#shared/types/api'

definePageMeta({ layout: 'fiok', middleware: 'auth' })

useSeoMeta({
  title: 'Számlázás | QRKOD24.hu',
  description: 'Csomag, limitek és számlázási adatok.',
  robots: 'noindex, nofollow',
})

const request = useRequestFetch()

const { data: summary } = await useAsyncData<DashboardSummary | null>(
  'fiok-billing-summary',
  async () => {
    const response = await request<ApiSuccess<DashboardSummary>>('/api/dashboard/summary')
    return response.data
  },
  { default: () => null },
)

const { settings } = useSiteSettings()

/* ---- Előfizetés ---- */

const overview = ref<BillingOverview | null>(null)
const billingLoading = ref(true)
const actionBusy = ref(false)
const actionError = ref('')
const actionMessage = ref('')
const confirmingCancel = ref(false)

const subscription = computed(() => overview.value?.subscription ?? null)
const billingConfig = computed(() => overview.value?.billing ?? settings.value.billing ?? { plansEnabled: false, trialDays: 14 })

const trialDaysLeft = computed(() => {
  if (!subscription.value?.trialEndsAt) return 0
  const diff = new Date(subscription.value.trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)))
})

const renewDate = computed(() => {
  const sub = subscription.value
  if (!sub || sub.status === 'expired') return '–'
  if (sub.interval === 'lifetime') return 'nincs lejárata'
  return formatDate(sub.currentPeriodEnd)
})

const statusLabel = computed(() => {
  const sub = subscription.value
  if (!sub || sub.status === 'expired') return 'Ingyenes'
  if (sub.cancelAtPeriodEnd) return 'Lemondva'
  if (sub.status === 'trialing') return `Próbaidő (${trialDaysLeft.value} nap)`
  return 'Aktív'
})

const statusClasses = computed(() => {
  const sub = subscription.value
  if (!sub || sub.status === 'expired') return 'bg-slate-100 text-slate-600'
  if (sub.cancelAtPeriodEnd) return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
  if (sub.status === 'trialing') return 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
  return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
})

const canCancel = computed(() => {
  if (subscription.value?.interval === 'lifetime') return false
  const sub = subscription.value
  return Boolean(sub && sub.status !== 'expired' && !sub.cancelAtPeriodEnd)
})

const canResume = computed(() => Boolean(subscription.value?.cancelAtPeriodEnd))

async function loadBilling() {
  billingLoading.value = true
  actionError.value = ''
  try {
    const response = await $fetch<ApiSuccess<BillingOverview>>('/api/billing', {
      headers: { accept: 'application/json' },
    })
    overview.value = response.data
  } catch (error) {
    actionError.value = apiErrorMessage(error, 'Az előfizetés állapotát nem sikerült betölteni.')
  } finally {
    billingLoading.value = false
  }
}

async function cancelSubscription() {
  if (actionBusy.value) return
  actionBusy.value = true
  actionError.value = ''
  try {
    const response = await $fetch<ApiSuccess<BillingOverview>>('/api/billing/cancel', {
      method: 'POST',
      headers: { accept: 'application/json' },
    })
    overview.value = response.data
    confirmingCancel.value = false
    actionMessage.value = 'Az előfizetés lemondva. A csomag az időszak végéig még jár, utána a fiók az ingyenes csomagra vált.'
    await refreshNuxtData('fiok-billing-summary')
  } catch (error) {
    actionError.value = apiErrorMessage(error, 'A lemondás nem sikerült.')
  } finally {
    actionBusy.value = false
  }
}

async function resumeSubscription() {
  if (actionBusy.value) return
  actionBusy.value = true
  actionError.value = ''
  try {
    const response = await $fetch<ApiSuccess<BillingOverview>>('/api/billing/resume', {
      method: 'POST',
      headers: { accept: 'application/json' },
    })
    overview.value = response.data
    actionMessage.value = 'A lemondás visszavonva, az előfizetés az időszak végéig aktív marad.'
  } catch (error) {
    actionError.value = apiErrorMessage(error, 'A visszavonás nem sikerült.')
  } finally {
    actionBusy.value = false
  }
}

onMounted(loadBilling)

const currentPlan = computed(() => {
  const sub = subscription.value
  if (sub && sub.status !== 'expired') return sub.plan
  return (summary.value?.plan || 'free') as PlanId
})
const plans = computed<{ id: PlanId; definition: PlanDefinition }[]>(() => {
  const config = settings.value.plans
  if (!config) return []
  return (['free', 'pro', 'business'] as PlanId[])
    .map(id => ({ id, definition: config[id] }))
    .filter(entry => Boolean(entry.definition))
})

const used = computed(() => summary.value?.totalQrCodes ?? 0)
const limit = computed(() => summary.value?.planLimit ?? 0)
const usagePercent = computed(() => Math.min(100, Math.round((used.value / Math.max(1, limit.value)) * 100)))

const features: { label: string; value: (plan: PlanDefinition) => string }[] = [
  { label: 'Dinamikus QR-kódok', value: plan => String(plan.maxDynamicQr) },
  { label: 'Analitika', value: plan => `${plan.analyticsDays} nap` },
  { label: 'Kampányok', value: plan => (plan.campaigns ? 'igen' : '–') },
  { label: 'Lejárati dátum', value: plan => (plan.expiresAt ? 'igen' : '–') },
  { label: 'CSV-export', value: plan => (plan.csvExport ? 'igen' : '–') },
  { label: 'API-hozzáférés', value: plan => (plan.apiAccess ? 'igen' : '–') },
  { label: 'Saját domain', value: plan => (plan.customDomain ? 'igen' : '–') },
]

const invoices: { id: string; date: string; amount: string; status: string }[] = []

const legal = computed(() => settings.value.legal)
const contactHref = computed(() => '/kapcsolat')

function planName(id: PlanId): string {
  return settings.value.plans?.[id]?.label || id
}

function formatHuf(value: number): string {
  const grouped = String(Math.max(0, Math.round(value))).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')
  return `${grouped} Ft`
}

const priceSuffix = computed(() => {
  if (!subscription.value || subscription.value.status === 'expired') return ''
  if (subscription.value.interval === 'lifetime') return ''
  return subscription.value.interval === 'yearly' ? ' / év' : ' / hó'
})

function formatDate(value: string | null | undefined): string {
  if (!value) return '–'
  return new Date(value).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
}

const accountCreated = useUserSession().user
const memberSince = computed(() => formatDate(accountCreated.value?.createdAt))
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold tracking-tight text-ink">Számlázás</h1>
    <p class="mt-1 text-sm text-ink-soft">
      A csomagod, a limitek és a számlázási adatok egy helyen.
    </p>

    <p v-if="actionError" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">{{ actionError }}</p>
    <p v-if="actionMessage" class="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" role="status">{{ actionMessage }}</p>

    <div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section class="card p-4" aria-labelledby="plan-title">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs font-medium uppercase tracking-wide text-ink-muted">Jelenlegi csomag</p>
            <h2 id="plan-title" class="mt-1 text-xl font-semibold text-ink">{{ subscription?.planLabel || summary?.planLabel || planName(currentPlan) }}</h2>
            <p class="mt-1 text-xs text-ink-muted">Tagság kezdete: {{ memberSince }}</p>
          </div>
          <span :class="['inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', statusClasses]">{{ statusLabel }}</span>
        </div>

        <div v-if="billingLoading" class="mt-3 text-xs text-ink-muted">Előfizetés betöltése…</div>
        <div v-else class="mt-3 space-y-1.5 text-xs">
          <template v-if="subscription && subscription.status !== 'expired'">
            <p v-if="subscription.cancelAtPeriodEnd" class="flex items-start gap-2 text-amber-700 dark:text-amber-300">
              <Icon name="lucide:calendar-x" class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>A lemondás rögzítve. A csomag {{ renewDate }}-ig még jár, utána a fiók az ingyenes csomagra vált.</span>
            </p>
            <p v-else-if="subscription.status === 'trialing'" class="flex items-start gap-2 text-sky-700 dark:text-sky-300">
              <Icon name="lucide:gift" class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>A próbaidő {{ renewDate }}-ig tart ({{ trialDaysLeft }} nap). Utána a fiók az ingyenes csomagra vált, ha nem választasz csomagot.</span>
            </p>
            <p v-else class="flex items-start gap-2 text-ink-soft">
              <Icon name="lucide:calendar-check" class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>Az aktuális időszak {{ renewDate }}-ig tart. Automatikus megújítás nincs, a bankkártyás fizetés még nem aktív.</span>
            </p>
          </template>
          <p v-else class="flex items-start gap-2 text-ink-soft">
            <Icon name="lucide:info" class="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <span v-if="billingConfig.plansEnabled">Jelenleg nincs fizetős előfizetésed. A csomagok a Csomagok oldalon választhatók ki.</span>
            <span v-else>Jelenleg nincs fizetős előfizetésed, és a csomagvásárlás átmenetileg szünetel.</span>
          </p>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <NuxtLink
            :to="billingConfig.plansEnabled ? '/csomagok' : '/kapcsolat'"
            class="btn-secondary px-3 py-2 text-xs"
          >
            <Icon name="lucide:repeat" class="h-4 w-4" aria-hidden="true" />
            {{ billingConfig.plansEnabled
              ? (canCancel || canResume ? 'Csomagváltás' : 'Csomagok megtekintése')
              : 'Csomagváltás igénylése' }}
          </NuxtLink>
          <button
            v-if="canCancel"
            type="button"
            class="btn-secondary px-3 py-2 text-xs"
            :disabled="actionBusy"
            @click="confirmingCancel = true"
          >
            <Icon name="lucide:x-circle" class="h-4 w-4" aria-hidden="true" />
            Előfizetés lemondása
          </button>
          <button
            v-if="canResume"
            type="button"
            class="btn-primary px-3 py-2 text-xs"
            :disabled="actionBusy"
            @click="resumeSubscription"
          >
            <Icon name="lucide:rotate-ccw" class="h-4 w-4" aria-hidden="true" />
            Lemondás visszavonása
          </button>
        </div>

        <div v-if="confirmingCancel" class="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200" role="alertdialog">
          <p class="font-semibold">Biztosan lemondod az előfizetést?</p>
          <p class="mt-1 leading-relaxed">
            A csomag az aktuális időszak végéig jár, azt követően a fiók az ingyenes csomagra vált. A QR-kódjaid megmaradnak,
            csak a prémium funkciók és a limit szűkül.
          </p>
          <div class="mt-2 flex flex-wrap gap-2">
            <button type="button" class="btn-primary px-3 py-1.5 text-xs" :disabled="actionBusy" @click="cancelSubscription">
              {{ actionBusy ? 'Lemondás…' : 'Igen, lemondom' }}
            </button>
            <button type="button" class="btn-secondary px-3 py-1.5 text-xs" :disabled="actionBusy" @click="confirmingCancel = false">
              Mégse
            </button>
          </div>
        </div>

        <div class="mt-4">
          <div class="flex items-center justify-between text-xs text-ink-muted">
            <span>Dinamikus QR-kódok</span>
            <span class="font-semibold text-ink">{{ used }} / {{ limit }}</span>
          </div>
          <div class="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div class="h-full rounded-full bg-brand-600" :style="{ width: `${usagePercent}%` }" />
          </div>
          <p class="mt-1.5 text-[11px] text-ink-muted">{{ usagePercent }}% felhasználva</p>
        </div>

        <dl class="mt-4 grid gap-3 sm:grid-cols-3">
          <div class="rounded-lg bg-slate-50 p-3">
            <dt class="text-[11px] text-ink-muted">Összes beolvasás</dt>
            <dd class="mt-0.5 text-lg font-semibold text-ink">{{ summary?.totalScans ?? 0 }}</dd>
          </div>
          <div class="rounded-lg bg-slate-50 p-3">
            <dt class="text-[11px] text-ink-muted">Beolvasás (30 nap)</dt>
            <dd class="mt-0.5 text-lg font-semibold text-ink">{{ summary?.scansLast30Days ?? 0 }}</dd>
          </div>
          <div class="rounded-lg bg-slate-50 p-3">
            <dt class="text-[11px] text-ink-muted">Aktív kódok</dt>
            <dd class="mt-0.5 text-lg font-semibold text-ink">{{ summary?.activeQrCodes ?? 0 }}</dd>
          </div>
        </dl>
      </section>

      <section class="card p-4" aria-labelledby="billing-title">
        <h2 id="billing-title" class="text-sm font-semibold text-ink">Számlázási adatok</h2>
        <dl class="mt-3 space-y-2 text-xs">
          <div class="flex justify-between gap-3">
            <dt class="text-ink-muted">Számlázási mód</dt>
            <dd class="text-right font-medium text-ink">
              {{ subscription && subscription.status !== 'expired'
                ? (subscription.interval === 'lifetime'
                  ? 'Élettartam csomag'
                  : subscription.interval === 'yearly' ? 'Éves előfizetés' : 'Havi előfizetés')
                : 'Nincs előfizetés' }}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-ink-muted">Időszak vége</dt>
            <dd class="text-right font-medium text-ink">{{ renewDate }}</dd>
          </div>
          <template v-if="subscription && subscription.status !== 'expired'">
            <div class="flex justify-between gap-3">
              <dt class="text-ink-muted">Aktuális időszak ára</dt>
              <dd class="text-right font-medium text-ink">
                <template v-if="subscription.interval === 'lifetime'">Nincs díj</template>
                <template v-else>{{ formatHuf(subscription.price) }}{{ priceSuffix }}</template>
              </dd>
            </div>
            <div v-if="subscription.interval !== 'lifetime'" class="flex justify-between gap-3">
              <dt class="text-ink-muted">Következő időszak ára</dt>
              <dd class="text-right font-medium text-ink">
                <template v-if="subscription.nextPrice > 0">{{ formatHuf(subscription.nextPrice) }}{{ priceSuffix }}</template>
                <template v-else>–</template>
              </dd>
            </div>
            <p
              v-if="subscription.priceChanged && subscription.interval !== 'lifetime'"
              class="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <Icon name="lucide:info" class="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                A csomag ára azóta változott. A jelenlegi időszak ára változatlan, az új ár a következő
                időszaktól érvényes.
              </span>
            </p>
          </template>
          <div class="flex justify-between gap-3">
            <dt class="text-ink-muted">Következő terhelés</dt>
            <dd class="text-right font-medium text-ink">nincs automatikus terhelés</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-ink-muted">Fizetési mód</dt>
            <dd class="text-right font-medium text-ink">–</dd>
          </div>
        </dl>

        <div class="mt-4 border-t border-slate-200 pt-3">
          <p class="text-xs font-semibold text-ink">Szolgáltató</p>
          <p class="mt-1 text-xs leading-relaxed text-ink-soft">
            <template v-if="legal.providerName">
              {{ legal.providerName }}<br>
              <span v-if="legal.providerAddress">{{ legal.providerAddress }}<br></span>
              <span v-if="legal.taxNumber">Adószám: {{ legal.taxNumber }}<br></span>
              <span v-if="legal.providerEmail">E-mail: {{ legal.providerEmail }}</span>
            </template>
            <template v-else>
              A számlázási adatok az admin felületen adhatók meg.
            </template>
          </p>
        </div>

        <NuxtLink :to="billingConfig.plansEnabled ? '/csomagok' : contactHref" class="btn-secondary mt-4 w-full px-3 py-2 text-xs">
          <Icon :name="billingConfig.plansEnabled ? 'lucide:repeat' : 'lucide:mail'" class="h-4 w-4" aria-hidden="true" />
          {{ billingConfig.plansEnabled ? 'Csomagok és árak' : 'Csomagváltás igénylése' }}
        </NuxtLink>
        <p class="mt-2 text-[11px] leading-relaxed text-ink-muted">
          <template v-if="billingConfig.plansEnabled">
            A bankkártyás fizetés még nem aktív: a csomagvásárlás fizetés nélküli aktiválást jelent, automatikus
            terhelés nélkül.
          </template>
          <template v-else>
            A csomagvásárlás átmenetileg nem elérhető. Csomagváltást a kapcsolati űrlapon tudsz kérni.
          </template>
        </p>
      </section>
    </div>

    <section class="card mt-4 p-4" aria-labelledby="plans-title">
      <h2 id="plans-title" class="text-sm font-semibold text-ink">Csomagok és limitek</h2>
      <div class="mt-3 overflow-x-auto">
        <table class="w-full min-w-[34rem] text-left text-xs">
          <thead>
            <tr class="text-ink-muted">
              <th class="pb-2 pr-3 font-medium">Funkció</th>
              <th
                v-for="plan in plans"
                :key="plan.id"
                :class="[
                  'pb-2 pr-3 font-medium',
                  plan.id === currentPlan ? 'text-brand-700' : '',
                ]"
              >
                {{ plan.definition.label }}
                <span v-if="plan.id === currentPlan" class="ml-1 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase">Aktív</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="feature in features" :key="feature.label">
              <th class="py-2 pr-3 text-left font-medium text-ink-soft">{{ feature.label }}</th>
              <td
                v-for="plan in plans"
                :key="plan.id"
                :class="['py-2 pr-3', plan.id === currentPlan ? 'font-semibold text-ink' : 'text-ink-soft']"
              >
                {{ feature.value(plan.definition) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mt-3 text-[11px] text-ink-muted">
        A limitek az admin felületen állíthatók, ezért a fenti táblázat a szerver aktuális beállításait mutatja.
      </p>
    </section>

    <section class="card mt-4 p-4" aria-labelledby="invoices-title">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 id="invoices-title" class="text-sm font-semibold text-ink">Számlák</h2>
        <span class="text-[11px] text-ink-muted">{{ invoices.length }} számla</span>
      </div>
      <p v-if="!invoices.length" class="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-ink-muted">
        Még nincs kiállított számlád. Az ingyenes csomag nem jár számlázással; díjfizetés esetén a számlák itt jelennek meg.
      </p>
      <div v-else class="mt-3 overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="text-ink-muted">
            <tr>
              <th class="pb-2 pr-3 font-medium">Számlaszám</th>
              <th class="pb-2 pr-3 font-medium">Dátum</th>
              <th class="pb-2 pr-3 font-medium">Összeg</th>
              <th class="pb-2 font-medium">Állapot</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="invoice in invoices" :key="invoice.id">
              <td class="py-2 pr-3 text-ink">{{ invoice.id }}</td>
              <td class="py-2 pr-3 text-ink-soft">{{ invoice.date }}</td>
              <td class="py-2 pr-3 text-ink-soft">{{ invoice.amount }}</td>
              <td class="py-2 text-ink-soft">{{ invoice.status }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
