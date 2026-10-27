<script setup lang="ts">
import type { ApiSuccess, DashboardSummary, PlanDefinition, PlanId } from '#shared/types/api'

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

const currentPlan = computed(() => (summary.value?.plan || 'free') as PlanId)
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

    <div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section class="card p-4" aria-labelledby="plan-title">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs font-medium uppercase tracking-wide text-ink-muted">Jelenlegi csomag</p>
            <h2 id="plan-title" class="mt-1 text-xl font-semibold text-ink">{{ summary?.planLabel || planName(currentPlan) }}</h2>
            <p class="mt-1 text-xs text-ink-muted">Tagság kezdete: {{ memberSince }}</p>
          </div>
          <span class="eyebrow">{{ summary?.planLabel || planName(currentPlan) }}</span>
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
            <dd class="text-right font-medium text-ink">Nincs előfizetés</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-ink-muted">Következő terhelés</dt>
            <dd class="text-right font-medium text-ink">–</dd>
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

        <NuxtLink :to="contactHref" class="btn-secondary mt-4 w-full px-3 py-2 text-xs">
          <Icon name="lucide:mail" class="h-4 w-4" aria-hidden="true" />
          Csomagváltás igénylése
        </NuxtLink>
        <p class="mt-2 text-[11px] leading-relaxed text-ink-muted">
          Az online fizetés még nem elérhető. A csomagváltást a kapcsolati űrlapon tudod kérni, a módosítás a fiókodon
          azonnal érvénybe lép.
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
