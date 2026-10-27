<script setup lang="ts">
import type { AccountAnalytics, ApiSuccess, PlanId } from '#shared/types/api'

definePageMeta({ layout: 'fiok', middleware: 'auth' })

useSeoMeta({
  title: 'Analitika | QRKOD24.hu',
  description: 'Az összes dinamikus QR-kódod beolvasási statisztikái egy helyen.',
  robots: 'noindex, nofollow',
})

const request = useRequestFetch()
const days = ref(30)

const { data, pending, error, refresh } = await useAsyncData<AccountAnalytics | null>(
  'fiok-analytics',
  async () => {
    const response = await request<ApiSuccess<AccountAnalytics>>('/api/analytics/overview', {
      query: { days: days.value },
    })
    return response.data
  },
  { watch: [days], default: () => null },
)

const { settings: siteSettings } = useSiteSettings()
const { user } = useUserSession()
const planLabel = computed(() => {
  const plan = (user.value?.plan || 'free') as PlanId
  return siteSettings.value.plans?.[plan]?.label || 'Ingyenes'
})

const planDays = computed(() => data.value?.planAnalyticsDays ?? 30)
const rangeOptions = computed(() =>
  [
    { value: 7, label: '7 nap' },
    { value: 30, label: '30 nap' },
    { value: 90, label: '90 nap' },
    { value: 365, label: '365 nap' },
  ].filter(option => option.value <= planDays.value || option.value === 7),
)

const maxDaily = computed(() => Math.max(1, ...(data.value?.daily.map(point => point.scans) || [1])))
const hasScans = computed(() => (data.value?.total || 0) > 0)

const COUNTRY_NAMES: Record<string, string> = {
  HU: 'Magyarország',
  AT: 'Ausztria',
  DE: 'Németország',
  RO: 'Románia',
  SK: 'Szlovákia',
  RS: 'Szerbia',
  HR: 'Horvátország',
  SI: 'Szlovénia',
  UA: 'Ukrajna',
  PL: 'Lengyelország',
  CZ: 'Csehország',
  US: 'Egyesült Államok',
  GB: 'Egyesült Királyság',
  FR: 'Franciaország',
  IT: 'Olaszország',
  NL: 'Hollandia',
  ES: 'Spanyolország',
}

function countryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] || code
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '–'
  return new Date(value).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('hu-HU', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink">Analitika</h1>
        <p class="mt-1 text-sm text-ink-soft">
          Az összes dinamikus QR-kódod beolvasásai egy idővonalon.
        </p>
      </div>
      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Időtartomány">
        <button
          v-for="option in rangeOptions"
          :key="option.value"
          type="button"
          :class="[
            'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
            days === option.value ? 'bg-brand-600 text-white' : 'bg-white text-ink-soft ring-1 ring-slate-200 hover:ring-brand-300',
          ]"
          @click="days = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <p class="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-800">
      {{ planLabel }} csomag · a részletes analitika {{ planDays }} napra visszamenőleg érhető el.
    </p>

    <p v-if="error" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
      Az analitika betöltése nem sikerült.
      <button type="button" class="ml-1 font-semibold underline" @click="refresh()">Újrapróbálás</button>
    </p>

    <template v-else>
      <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="card p-4">
          <p class="text-xs font-medium text-ink-muted">Összes beolvasás</p>
          <p class="mt-1 text-2xl font-semibold text-ink">{{ data?.total ?? 0 }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs font-medium text-ink-muted">Emberi látogató</p>
          <p class="mt-1 text-2xl font-semibold text-emerald-600">{{ data?.humanTotal ?? 0 }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs font-medium text-ink-muted">Bot / előnézet</p>
          <p class="mt-1 text-2xl font-semibold text-ink-muted">{{ data?.botTotal ?? 0 }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs font-medium text-ink-muted">Időszak</p>
          <p class="mt-1 text-sm font-semibold text-ink">{{ formatDate(data?.from) }} – {{ formatDate(data?.to) }}</p>
          <p class="mt-1 text-[11px] text-ink-muted">{{ data?.days ?? days }} nap</p>
        </div>
      </div>

      <section class="card mt-4 p-4" aria-labelledby="daily-title">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 id="daily-title" class="text-sm font-semibold text-ink">Napi beolvasások</h2>
          <p v-if="pending" class="text-xs text-ink-muted">Betöltés…</p>
        </div>

        <div v-if="hasScans" class="mt-4">
          <div class="flex h-40 items-end gap-[2px]" role="img" :aria-label="`Napi beolvasások, ${days} nap`">
            <span
              v-for="point in data?.daily || []"
              :key="point.day"
              class="flex-1 rounded-t bg-brand-500/80 transition-colors hover:bg-brand-600"
              :style="{ height: `${Math.max(2, Math.round((point.scans / maxDaily) * 100))}%` }"
              :title="`${point.day}: ${point.scans} beolvasás`"
            />
          </div>
          <div class="mt-1 flex justify-between text-[10px] text-ink-muted">
            <span>{{ data?.from }}</span>
            <span>{{ data?.to }}</span>
          </div>
        </div>
        <p v-else class="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-ink-muted">
          Ebben az időszakban még nincs beolvasás. Amint valaki beolvassa egy kódodat, itt jelennek meg az adatok.
        </p>
      </section>

      <div class="mt-4 grid gap-4 lg:grid-cols-2">
        <section class="card p-4" aria-labelledby="top-title">
          <h2 id="top-title" class="text-sm font-semibold text-ink">Legtöbbet beolvasott kódok</h2>
          <ul v-if="data?.topQrCodes?.length" class="mt-3 space-y-2">
            <li v-for="code in data.topQrCodes" :key="code.shortCode" class="flex items-center gap-3">
              <NuxtLink
                :to="`/fiok/qr/${code.shortCode}`"
                class="min-w-0 flex-1 truncate text-sm text-ink hover:text-brand-700"
              >
                {{ code.name || code.shortCode }}
              </NuxtLink>
              <span class="text-xs font-semibold text-ink-soft">{{ code.scans }}</span>
            </li>
          </ul>
          <p v-else class="mt-3 text-xs text-ink-muted">Még nincs beolvasás.</p>
        </section>

        <section class="card p-4" aria-labelledby="device-title">
          <h2 id="device-title" class="text-sm font-semibold text-ink">Eszközök</h2>
          <ul v-if="data?.devices?.length" class="mt-3 space-y-1.5 text-sm">
            <li v-for="item in data.devices" :key="item.label" class="flex justify-between gap-2">
              <span class="text-ink-soft">{{ item.label }}</span>
              <span class="font-medium text-ink">{{ item.count }}</span>
            </li>
          </ul>
          <p v-else class="mt-3 text-xs text-ink-muted">Nincs adat.</p>
        </section>

        <section class="card p-4" aria-labelledby="browser-title">
          <h2 id="browser-title" class="text-sm font-semibold text-ink">Böngészők</h2>
          <ul v-if="data?.browsers?.length" class="mt-3 space-y-1.5 text-sm">
            <li v-for="item in data.browsers" :key="item.label" class="flex justify-between gap-2">
              <span class="text-ink-soft">{{ item.label }}</span>
              <span class="font-medium text-ink">{{ item.count }}</span>
            </li>
          </ul>
          <p v-else class="mt-3 text-xs text-ink-muted">Nincs adat.</p>
        </section>

        <section class="card p-4" aria-labelledby="country-title">
          <h2 id="country-title" class="text-sm font-semibold text-ink">Országok</h2>
          <ul v-if="data?.countries?.length" class="mt-3 space-y-1.5 text-sm">
            <li v-for="item in data.countries" :key="item.label" class="flex justify-between gap-2">
              <span class="text-ink-soft">{{ countryName(item.label) }}</span>
              <span class="font-medium text-ink">{{ item.count }}</span>
            </li>
          </ul>
          <p v-else class="mt-3 text-xs text-ink-muted">Nincs adat.</p>
        </section>
      </div>

      <section class="card mt-4 p-4" aria-labelledby="recent-title">
        <h2 id="recent-title" class="text-sm font-semibold text-ink">Legutóbbi beolvasások</h2>
        <div v-if="data?.recentScans?.length" class="mt-3 overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="text-ink-muted">
              <tr>
                <th class="pb-2 pr-3 font-medium">Időpont</th>
                <th class="pb-2 pr-3 font-medium">QR-kód</th>
                <th class="pb-2 pr-3 font-medium">Eszköz</th>
                <th class="pb-2 pr-3 font-medium">Böngésző</th>
                <th class="pb-2 font-medium">Ország</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="scan in data.recentScans" :key="`${scan.shortCode}-${scan.createdAt}`">
                <td class="py-2 pr-3 whitespace-nowrap text-ink-soft">{{ formatDateTime(scan.createdAt) }}</td>
                <td class="py-2 pr-3">
                  <NuxtLink :to="`/fiok/qr/${scan.shortCode}`" class="font-medium text-ink hover:text-brand-700">
                    {{ scan.name || scan.shortCode }}
                  </NuxtLink>
                </td>
                <td class="py-2 pr-3 text-ink-soft">{{ scan.device }}</td>
                <td class="py-2 pr-3 text-ink-soft">{{ scan.browser }}</td>
                <td class="py-2 text-ink-soft">{{ scan.country ? countryName(scan.country) : '–' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="mt-3 text-xs text-ink-muted">Még nincs rögzített beolvasás ebben az időszakban.</p>
        <p class="mt-3 text-[10px] leading-relaxed text-ink-muted">
          A statisztika beolvasási eseményeket számol, nem egyedi személyeket. IP-címet és teljes user-agentet nem tárolunk.
        </p>
      </section>
    </template>
  </div>
</template>
