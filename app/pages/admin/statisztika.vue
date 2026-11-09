<script setup lang="ts">
import type { AdminStats, ApiSuccess } from '#shared/types/api'

definePageMeta({ layout: 'admin' })

useSeoMeta({
  title: 'Statisztika | Admin',
  robots: 'noindex, nofollow',
})

const { session } = useAdminSession()

const stats = ref<AdminStats | null>(null)
const statsLoading = ref(false)
const statsError = ref('')

async function loadStats() {
  statsLoading.value = true
  statsError.value = ''
  try {
    const response = await $fetch<ApiSuccess<AdminStats>>('/api/admin/stats')
    stats.value = response.data
  } catch (error) {
    statsError.value = apiErrorMessage(error, 'A statisztika betöltése nem sikerült.')
  } finally {
    statsLoading.value = false
  }
}

const maxDailyScans = computed(() => Math.max(1, ...(stats.value?.daily.map(point => point.scans) || [1])))

watch(
  session,
  (value) => {
    if (value) loadStats()
  },
  { immediate: true },
)
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold tracking-tight text-ink">Statisztika</h1>
    <p class="mt-1 text-sm text-ink-soft">
      Szerveroldali, összesített adatok – egyéni látogatók követése nélkül.
    </p>

    <p v-if="statsError" class="mt-4 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300" role="alert">{{ statsError }}</p>
    <p v-if="statsLoading && !stats" class="mt-4 text-sm text-ink-muted">Betöltés…</p>

    <div v-if="stats" class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="card p-4">
        <p class="text-xs text-ink-muted">Összes dinamikus kód</p>
        <p class="mt-1 text-2xl font-semibold">{{ stats.totalQrCodes }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-ink-muted">Aktív kódok</p>
        <p class="mt-1 text-2xl font-semibold">{{ stats.activeQrCodes }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-ink-muted">Összes beolvasás</p>
        <p class="mt-1 text-2xl font-semibold">{{ stats.totalScans }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-ink-muted">Utolsó 30 nap</p>
        <p class="mt-1 text-2xl font-semibold">{{ stats.scansLast30Days }}</p>
      </div>
    </div>

    <div v-if="stats" class="card mt-4 p-5">
      <h2 class="text-sm font-semibold">Napi beolvasások (30 nap)</h2>
      <div v-if="stats.daily.length" class="mt-5 flex h-40 items-end gap-1">
        <div
          v-for="point in stats.daily"
          :key="point.day"
          class="group relative flex-1 rounded-t bg-brand-200 transition-colors hover:bg-brand-500"
          :style="{ height: `${Math.max(4, (point.scans / maxDailyScans) * 100)}%` }"
          :title="`${point.day}: ${point.scans} beolvasás`"
        >
          <span class="sr-only">{{ point.day }}: {{ point.scans }} beolvasás</span>
        </div>
      </div>
      <p v-else class="mt-3 text-sm text-ink-muted">Még nincs beolvasási adat.</p>
      <p class="mt-3 text-[11px] text-ink-muted">
        A statisztika a rövid linkek beolvasásait összesíti. A robotszerű vagy ismételt kérések a
        számokat torzíthatják, ezért az adat tájékoztató jellegű.
      </p>
    </div>
  </div>
</template>
