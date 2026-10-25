<script setup lang="ts">
import type { ApiSuccess, DashboardSummary } from '#shared/types/api'

const { user, logout } = useUserSession()
const request = useRequestFetch()

const { data: summary } = await useAsyncData<DashboardSummary | null>(
  'fiok-shell-summary',
  async () => {
    try {
      const response = await request<ApiSuccess<DashboardSummary>>('/api/dashboard/summary')
      return response.data
    } catch {
      return null
    }
  },
  { default: () => null },
)

const used = computed(() => summary.value?.totalQrCodes ?? 0)
const limit = computed(() => summary.value?.planLimit ?? 5)
const planLabel = computed(() => summary.value?.planLabel || 'Ingyenes')
const quotaPercent = computed(() => Math.min(100, Math.round((used.value / Math.max(1, limit.value)) * 100)))
const initials = computed(() => (user.value?.name || user.value?.email || '?').trim().charAt(0).toUpperCase())

interface NavItem {
  label: string
  icon: string
  to?: string
  badge?: string
  hint?: string
}

/**
 * Csak azt a menüpontot lehet megnyitni, ami mögött tényleg van oldal. A többit
 * néma, jelölt sorokként jelenítjük meg, hogy ne legyen látszólag működő gomb.
 */
const nav: NavItem[] = [
  { label: 'QR-kódjaim', icon: 'lucide:qr-code', to: '/fiok' },
  { label: 'Analitika', icon: 'lucide:chart-no-axes-column', badge: 'Hamarosan' },
  { label: 'Domainek', icon: 'lucide:globe', badge: 'Business', hint: 'Saját domain a Business csomagban lesz elérhető.' },
  { label: 'API', icon: 'lucide:code-xml', badge: 'Business', hint: 'Az API-hozzáférés a Business csomagban lesz elérhető.' },
  { label: 'Számlázás', icon: 'lucide:credit-card', badge: 'Hamarosan' },
  { label: 'Fiók', icon: 'lucide:settings', badge: 'Hamarosan' },
]
</script>

<template>
  <div class="min-h-screen bg-canvas">
    <div class="mx-auto flex w-full max-w-[1500px]">
      <aside class="hidden w-[264px] shrink-0 flex-col border-r border-slate-200 bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div class="px-5 py-6">
          <AppLogo />
        </div>

        <nav class="flex-1 space-y-1 px-3" aria-label="Fiók menü">
          <template v-for="item in nav" :key="item.label">
            <NuxtLink
              v-if="item.to"
              :to="item.to"
              class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700"
              exact-active-class="bg-brand-50 text-brand-700"
            >
              <Icon :name="item.icon" class="h-[18px] w-[18px]" aria-hidden="true" />
              {{ item.label }}
            </NuxtLink>

            <span
              v-else
              class="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted"
              :title="item.hint || 'Hamarosan elérhető'"
              aria-disabled="true"
            >
              <Icon :name="item.icon" class="h-[18px] w-[18px]" aria-hidden="true" />
              {{ item.label }}
              <span class="ml-auto rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {{ item.badge }}
              </span>
            </span>
          </template>
        </nav>

        <div class="m-3 rounded-2xl border border-slate-200 bg-canvas p-4">
          <p class="text-xs font-semibold text-ink">
            {{ limit }} {{ planLabel.toLowerCase() }} dinamikus QR-kód
          </p>
          <div class="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div class="h-full rounded-full bg-brand-600" :style="{ width: `${quotaPercent}%` }" />
          </div>
          <p class="mt-1.5 text-[11px] text-ink-muted">{{ used }} / {{ limit }} felhasználva</p>
          <button
            type="button"
            class="btn-primary mt-3 w-full px-4 py-2 text-xs"
            disabled
            title="A csomagváltás hamarosan elérhető – addig a fiók beállításaiban kérhető."
          >
            Csomagváltás
          </button>
        </div>

        <div class="px-3">
          <NuxtLink
            to="/dinamikus-qr-kod"
            class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-slate-100 hover:text-ink"
          >
            <Icon name="lucide:book-open" class="h-4 w-4" aria-hidden="true" />
            Dokumentáció
            <Icon name="lucide:arrow-up-right" class="ml-auto h-3.5 w-3.5" aria-hidden="true" />
          </NuxtLink>
        </div>

        <div class="mt-3 border-t border-slate-200 p-3">
          <div class="flex items-center gap-2.5 px-1 py-1.5">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {{ initials }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-ink">{{ user?.name || 'Fiókom' }}</span>
              <span class="block truncate text-xs text-ink-muted">{{ user?.email }}</span>
            </span>
          </div>
          <button type="button" class="btn-ghost mt-1 w-full justify-start px-2 py-1.5 text-xs" @click="logout">
            <Icon name="lucide:log-out" class="h-3.5 w-3.5" aria-hidden="true" />
            Kijelentkezés
          </button>
        </div>
      </aside>

      <div class="min-w-0 flex-1">
        <header class="flex items-center justify-between gap-3 border-b border-slate-200 bg-surface px-4 py-3 lg:hidden">
          <AppLogo />
          <div class="flex items-center gap-2">
            <NuxtLink to="/fiok" class="text-xs font-medium text-ink-muted">QR-kódjaim</NuxtLink>
            <NuxtLink to="/dinamikus-qr-kod" class="text-xs font-medium text-ink-muted">Súgó</NuxtLink>
            <button type="button" class="btn-ghost px-2 py-1.5 text-xs" aria-label="Kijelentkezés" @click="logout">
              <Icon name="lucide:log-out" class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <main class="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>
