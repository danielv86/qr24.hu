<script setup lang="ts">
import type { ApiSuccess, DashboardSummary } from '#shared/types/api'

const { user, logout } = useUserSession()
const request = useRequestFetch()

const { data: summary } = await useAsyncData<DashboardSummary | null>(
  'fiok-summary',
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
const quotaPercent = computed(() => Math.min(100, Math.round((used.value / Math.max(1, limit.value)) * 100)))
const initials = computed(() => (user.value?.name || user.value?.email || '?').trim().charAt(0).toUpperCase())

const nav = [
  { label: 'QR-kódjaim', icon: 'lucide:qr-code', to: '/fiok' },
  { label: 'Új QR-kód', icon: 'lucide:plus', to: '/fiok?uj=1' },
  { label: 'Hogyan működik?', icon: 'lucide:book-open', to: '/dinamikus-qr-kod' },
]
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <div class="mx-auto flex w-full max-w-[1500px]">
      <aside class="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex lg:min-h-screen">
        <div class="px-5 py-5">
          <AppLogo />
        </div>

        <nav class="flex-1 space-y-1 px-3" aria-label="Fiók menü">
          <NuxtLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700"
            active-class="bg-brand-50 text-brand-700"
          >
            <Icon :name="item.icon" class="h-[18px] w-[18px]" aria-hidden="true" />
            {{ item.label }}
          </NuxtLink>
        </nav>

        <div class="m-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <p class="text-xs font-semibold text-ink">Dinamikus QR-kód csomagod</p>
          <p class="mt-0.5 text-xs text-ink-muted">
            {{ summary?.planLabel || 'Ingyenes' }} · {{ used }} / {{ limit }}
          </p>
          <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div class="h-full rounded-full bg-brand-600" :style="{ width: `${quotaPercent}%` }" />
          </div>
          <p class="mt-2 text-[11px] leading-relaxed text-ink-muted">
            Az archivált kódok nem számítanak bele a limitbe.
          </p>
        </div>

        <div class="border-t border-slate-200 p-3">
          <div class="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
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
        <header class="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <AppLogo />
          <div class="flex items-center gap-2">
            <NuxtLink to="/fiok" class="text-xs font-medium text-ink-muted">QR-kódjaim</NuxtLink>
            <button type="button" class="btn-ghost px-2 py-1.5 text-xs" @click="logout">
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
