<script setup lang="ts">
import type { PlanDefinition, PlanId } from '#shared/types/api'

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
const billing = ref<'monthly' | 'yearly'>('yearly')

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
  pro: 'bg-rose-50 text-rose-600',
  business: 'bg-sky-50 text-sky-700',
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
        <p class="flex items-start gap-2 text-ink-soft">
          <Icon name="lucide:gift" class="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          <span>Az online csomagvásárlás hamarosan indul – addig a fiókod a jelenlegi csomagján marad.</span>
        </p>
        <p class="flex items-start gap-2 text-center text-xs text-ink-muted">
          <Icon name="lucide:shield-check" class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <span>A QR-kódjaid nem járnak le: a csomag módosítása csak a prémium funkciókat érinti.</span>
        </p>
      </div>

      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <div class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1" role="group" aria-label="Számlázási időszak">
          <button
            type="button"
            :class="[
              'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
              billing === 'monthly' ? 'bg-brand-600 text-white' : 'text-ink-soft hover:text-ink',
            ]"
            :aria-pressed="billing === 'monthly'"
            @click="billing = 'monthly'"
          >
            Havi
          </button>
          <button
            type="button"
            :class="[
              'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
              billing === 'yearly' ? 'bg-brand-600 text-white' : 'text-ink-soft hover:text-ink',
            ]"
            :aria-pressed="billing === 'yearly'"
            @click="billing = 'yearly'"
          >
            Éves
          </button>
        </div>

        <span v-if="annualSaving > 0" class="rounded-full bg-fuchsia-50 px-3 py-1.5 text-xs font-semibold text-fuchsia-700">
          Akár {{ annualSaving }}% megtakarítás
        </span>

        <span class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-soft">
          <Icon name="lucide:banknote" class="h-4 w-4" aria-hidden="true" />
          Pénznem: HUF Ft
        </span>
      </div>

      <p v-if="!plans.length" class="mt-10 rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-ink-muted">
        A csomagok betöltése folyamatban van. Frissítsd az oldalt.
      </p>

      <div v-else class="mt-8 grid gap-4 md:grid-cols-3 md:items-start">
        <article
          v-for="plan in plans"
          :key="plan.id"
          :class="[
            'relative flex h-full flex-col rounded-2xl border bg-white p-5 shadow-sm',
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
            <span>{{ billing === 'yearly' ? `${formatHuf(plan.priceYearly)} / év` : `Éves előfizetéssel ${formatHuf(plan.priceYearly)}` }}</span>
            <span
              v-if="savings(plan) > 0"
              class="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700"
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
                  feature.available ? 'text-emerald-600' : 'text-red-500',
                ]"
                aria-hidden="true"
              />
              <span :class="feature.available ? 'text-ink-soft' : 'text-ink-muted'">{{ feature.label }}</span>
            </li>
          </ul>

          <button
            type="button"
            disabled
            :class="[
              'mt-6 w-full cursor-not-allowed rounded-xl px-4 py-3 text-sm font-semibold',
              plan.id === highlighted
                ? 'bg-brand-600 text-white opacity-90'
                : 'bg-brand-50 text-brand-700',
            ]"
            title="Az online csomagvásárlás hamarosan indul."
          >
            Hamarosan
          </button>
        </article>
      </div>

      <div class="mx-auto mt-8 max-w-2xl space-y-2 text-center text-xs leading-relaxed text-ink-muted">
        <p>Az árak az áfát tartalmazzák. Az áfát vállalkozásként visszaigényelheted, ha erre jogosult vagy.</p>
        <p>
          Az online bankkártyás fizetés bevezetéséig a csomagok nem vásárolhatók meg a felületen. A limitek és a
          funkciók a szerver beállításaiból származnak, ezért a fiókodban mindig a tényleges értékeket látod.
        </p>
        <p>
          Kérdésed van? <NuxtLink to="/kapcsolat" class="font-semibold text-brand-700 hover:underline">Írj nekünk</NuxtLink>.
        </p>
      </div>
    </div>
  </div>
</template>
