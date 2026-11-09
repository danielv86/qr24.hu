<script setup lang="ts">
import type {
  AdminSubscriptionRow,
  AdminUserFilter,
  AdminUsersPayload,
} from '#shared/types/api'

definePageMeta({ layout: 'admin' })

useSeoMeta({
  title: 'Felhasználók | Admin',
  robots: 'noindex, nofollow',
})

const { session } = useAdminSession()

const data = ref<AdminUsersPayload | null>(null)
const loading = ref(false)
const error = ref('')

const q = ref('')
const searchInput = ref('')
const filter = ref<AdminUserFilter>('all')
const page = ref(1)

const FILTERS: { value: AdminUserFilter; label: string }[] = [
  { value: 'all', label: 'Minden felhasználó' },
  { value: 'verified', label: 'Ellenőrzött e-mail' },
  { value: 'unverified', label: 'Nem ellenőrzött e-mail' },
  { value: 'subscribers', label: 'Volt előfizetése' },
  { value: 'withQr', label: 'Van dinamikus QR-kódja' },
]

const items = computed(() => data.value?.items ?? [])
const summary = computed(() => data.value?.summary ?? null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ status: filter.value, page: String(page.value) })
    if (q.value) params.set('q', q.value)
    const response = await $fetch<{ success: true; data: AdminUsersPayload }>(
      `/api/admin/users?${params.toString()}`,
      { headers: { accept: 'application/json' }, cache: 'no-store' },
    )
    data.value = response.data
  } catch (cause) {
    error.value = apiErrorMessage(cause, 'A felhasználók betöltése nem sikerült.')
  } finally {
    loading.value = false
  }
}

function applySearch() {
  q.value = searchInput.value.trim()
  if (page.value !== 1) {
    page.value = 1
    return
  }
  load()
}

function selectFilter(next: AdminUserFilter) {
  if (filter.value === next) return
  filter.value = next
  if (page.value !== 1) {
    page.value = 1
    return
  }
  load()
}

watch(page, () => load())
watch(session, (value) => {
  if (value) load()
}, { immediate: true })

const STATUS_LABELS: Record<AdminSubscriptionRow['status'], string> = {
  trialing: 'Próbaidő',
  active: 'Aktív',
  canceled: 'Lemondva',
  expired: 'Lejárt',
  free: 'Ingyenes',
}

function statusClasses(status: AdminSubscriptionRow['status']): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    case 'trialing':
      return 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
    case 'canceled':
      return 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '–'
  return new Date(value).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '–'
  return new Date(value).toLocaleString('hu-HU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const summaryCards = computed(() => {
  const s = summary.value
  if (!s) return []
  return [
    { key: 'all' as AdminUserFilter, label: 'Összes felhasználó', value: s.total },
    { key: 'verified' as AdminUserFilter, label: 'Ellenőrzött', value: s.verified },
    { key: 'unverified' as AdminUserFilter, label: 'Nem ellenőrzött', value: s.unverified },
    { key: 'subscribers' as AdminUserFilter, label: 'Előfizetéses', value: s.subscribers },
    { key: 'withQr' as AdminUserFilter, label: 'Dinamikus QR-rel', value: s.withQr },
  ]
})
</script>

<template>
  <AdminPageLayout title="Felhasználók">
    <template #actions>
      <button type="button" class="btn-secondary px-3 py-2 text-xs" :disabled="loading" @click="load">
        <Icon :name="loading ? 'lucide:loader-circle' : 'lucide:refresh-cw'" :class="['h-4 w-4', { 'animate-spin': loading }]" aria-hidden="true" />
        {{ loading ? 'Betöltés…' : 'Frissítés' }}
      </button>
      <NuxtLink to="/admin/elofizetesek" class="btn-secondary px-3 py-2 text-xs">
        <Icon name="lucide:receipt" class="h-4 w-4" aria-hidden="true" />
        Előfizetések
      </NuxtLink>
    </template>

    <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">{{ error }}</p>

    <div v-if="summary" class="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
      <button
        v-for="card in summaryCards"
        :key="card.key"
        type="button"
        :class="[
          'rounded-xl border px-3 py-2 text-left transition-colors',
          filter === card.key
            ? 'border-brand-500 bg-brand-50/50'
            : 'border-slate-200 bg-surface hover:border-brand-300',
        ]"
        @click="selectFilter(card.key)"
      >
        <span class="block text-[11px] text-ink-muted">{{ card.label }}</span>
        <span class="mt-0.5 block text-lg font-semibold text-ink">{{ card.value }}</span>
      </button>
    </div>

    <div class="mt-4 flex flex-wrap items-end gap-2">
      <form class="flex min-w-0 flex-1 flex-wrap items-end gap-2" @submit.prevent="applySearch">
        <div class="min-w-[12rem] flex-1">
          <label for="admin-user-search" class="field-label">Keresés e-mailre vagy névre</label>
          <input
            id="admin-user-search"
            v-model="searchInput"
            type="search"
            class="field-input py-2 text-sm"
            placeholder="pelda@example.com"
            autocomplete="off"
          >
        </div>
        <button type="submit" class="btn-secondary px-3 py-2 text-xs">
          <Icon name="lucide:search" class="h-4 w-4" aria-hidden="true" />
          Keresés
        </button>
      </form>

      <div class="min-w-[12rem]">
        <label for="admin-user-filter" class="field-label">Szűrő</label>
        <select
          id="admin-user-filter"
          :value="filter"
          class="field-input py-2 text-sm"
          @change="selectFilter(($event.target as HTMLSelectElement).value as AdminUserFilter)"
        >
          <option v-for="option in FILTERS" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </div>
    </div>

    <div class="card mt-4 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[56rem] text-left text-xs">
          <thead class="bg-slate-50 text-ink-muted">
            <tr>
              <th class="px-3 py-2 font-medium">Felhasználó</th>
              <th class="px-3 py-2 font-medium">Csomag</th>
              <th class="px-3 py-2 font-medium">Állapot</th>
              <th class="px-3 py-2 font-medium">E-mail</th>
              <th class="px-3 py-2 font-medium">QR-kódok</th>
              <th class="px-3 py-2 font-medium">Regisztrált</th>
              <th class="px-3 py-2 font-medium">Utolsó belépés</th>
              <th class="px-3 py-2 font-medium sr-only">Adatlap</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="item in items" :key="item.id" class="align-top hover:bg-slate-50/70">
              <td class="px-3 py-2">
                <NuxtLink :to="`/admin/felhasznalok/${item.id}`" class="font-medium text-ink hover:text-brand-600">
                  {{ item.email }}
                </NuxtLink>
                <span v-if="item.name" class="block text-[11px] text-ink-muted">{{ item.name }}</span>
              </td>
              <td class="px-3 py-2 text-ink-soft">{{ item.planLabel }}</td>
              <td class="px-3 py-2">
                <span :class="['inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold', statusClasses(item.status)]">
                  {{ STATUS_LABELS[item.status] }}
                </span>
              </td>
              <td class="px-3 py-2">
                <span :class="item.emailVerified ? 'text-emerald-700 dark:text-emerald-300' : 'text-ink-muted'">
                  {{ item.emailVerified ? 'Ellenőrzött' : 'Nem ellenőrzött' }}
                </span>
              </td>
              <td class="px-3 py-2 text-ink-soft">{{ item.qrCount }}</td>
              <td class="px-3 py-2 text-ink-muted">{{ formatDate(item.createdAt) }}</td>
              <td class="px-3 py-2 text-ink-muted">{{ formatDateTime(item.lastLoginAt) }}</td>
              <td class="px-3 py-2 text-right">
                <NuxtLink :to="`/admin/felhasznalok/${item.id}`" class="inline-flex items-center gap-1 text-brand-600 hover:underline">
                  Adatlap
                  <Icon name="lucide:chevron-right" class="h-3.5 w-3.5" aria-hidden="true" />
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="loading && !items.length" class="px-3 py-6 text-center text-sm text-ink-muted">Betöltés…</p>
      <p v-else-if="!items.length" class="px-3 py-6 text-center text-sm text-ink-muted">
        Nincs a szűrésnek megfelelő felhasználó.
      </p>
    </div>

    <div v-if="data && data.totalPages > 1" class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
      <p class="text-ink-muted">
        {{ data.total }} felhasználó – {{ data.page }} / {{ data.totalPages }}. oldal
      </p>
      <div class="flex gap-2">
        <button type="button" class="btn-secondary px-3 py-1.5 text-xs" :disabled="page <= 1 || loading" @click="page -= 1">
          Előző
        </button>
        <button type="button" class="btn-secondary px-3 py-1.5 text-xs" :disabled="page >= data.totalPages || loading" @click="page += 1">
          Következő
        </button>
      </div>
    </div>
  </AdminPageLayout>
</template>
