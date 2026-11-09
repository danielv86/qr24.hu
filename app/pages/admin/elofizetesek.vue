<script setup lang="ts">
import type {
  AdminSubscriptionFilter,
  AdminSubscriptionRow,
  AdminSubscriptionsPayload,
} from '#shared/types/api'

definePageMeta({ layout: 'admin' })

useSeoMeta({
  title: 'Előfizetések | Admin',
  robots: 'noindex, nofollow',
})

const route = useRoute()
const { session } = useAdminSession()
const toast = useAdminToast()

/* A táblázat "szűrés" ikonja e-mailre előszűrve nyitja meg az oldalt. */
onMounted(() => {
  const initial = String(route.query.q ?? '').trim()
  if (initial) {
    searchInput.value = initial
    q.value = initial
  }
})

const data = ref<AdminSubscriptionsPayload | null>(null)
const loading = ref(false)
const error = ref('')

const q = ref('')
const searchInput = ref('')
const filter = ref<AdminSubscriptionFilter>('all')
const page = ref(1)
const perPage = ref(25)

const FILTERS: { value: AdminSubscriptionFilter; label: string }[] = [
  { value: 'all', label: 'Minden fiók' },
  { value: 'active', label: 'Aktív' },
  { value: 'trialing', label: 'Próbaidő' },
  { value: 'canceled', label: 'Lemondva' },
  { value: 'expired', label: 'Lejárt' },
  { value: 'free', label: 'Ingyenes' },
]

const items = computed(() => data.value?.items ?? [])
const summary = computed(() => data.value?.summary ?? null)

type SortKey = 'email' | 'createdAt' | 'periodEnd'
const sortKey = ref<SortKey>('createdAt')
const sortDir = ref<'asc' | 'desc'>('desc')

const sortedItems = computed(() => {
  const list = [...items.value]
  const direction = sortDir.value === 'asc' ? 1 : -1
  return list.sort((a, b) => {
    if (sortKey.value === 'email') return a.email.localeCompare(b.email, 'hu') * direction
    if (sortKey.value === 'periodEnd') {
      const av = a.status === 'expired' ? a.endedAt : a.currentPeriodEnd
      const bv = b.status === 'expired' ? b.endedAt : b.currentPeriodEnd
      return (new Date(av ?? 0).getTime() - new Date(bv ?? 0).getTime()) * direction
    }
    return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction
  })
})

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    return
  }
  sortKey.value = key
  sortDir.value = key === 'email' ? 'asc' : 'desc'
}

const selected = ref<Set<number>>(new Set())
const allSelected = computed(() => items.value.length > 0 && items.value.every(item => selected.value.has(item.userId)))

function toggleRow(id: number) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

function toggleAll() {
  selected.value = allSelected.value ? new Set() : new Set(items.value.map(item => item.userId))
}

async function load(options: { silent?: boolean } = {}) {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({
      status: filter.value,
      page: String(page.value),
      perPage: String(perPage.value),
    })
    if (q.value) params.set('q', q.value)
    const response = await $fetch<{ success: true; data: AdminSubscriptionsPayload }>(
      `/api/admin/subscriptions?${params.toString()}`,
      { headers: { accept: 'application/json' }, cache: 'no-store' },
    )
    data.value = response.data
    selected.value = new Set()
    if (!options.silent) toast.success('Előfizetések frissítve', `${response.data.total} fiók a szűrés szerint.`)
  } catch (cause) {
    error.value = apiErrorMessage(cause, 'Az előfizetések betöltése nem sikerült.')
    toast.error('Betöltési hiba', error.value)
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
  load({ silent: true })
}

function selectFilter(next: AdminSubscriptionFilter) {
  if (filter.value === next) return
  filter.value = next
  if (page.value !== 1) {
    page.value = 1
    return
  }
  load({ silent: true })
}

watch(page, () => load({ silent: true }))
watch(perPage, () => {
  if (page.value !== 1) page.value = 1
  else load({ silent: true })
})
watch(session, (value) => {
  if (value) load({ silent: true })
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
      return 'bg-[#193B2D] text-[#8BE9B6]'
    case 'trialing':
      return 'bg-[#1B2F52] text-[#8FC4FF]'
    case 'canceled':
      return 'bg-[#3A2E1B] text-[#F0C987]'
    case 'expired':
      return 'bg-[#3E1B28] text-[#F79BB0]'
    default:
      return 'bg-[#32355C] text-[#DCDCF0]'
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
    {
      key: 'all' as AdminSubscriptionFilter,
      label: 'Összes fiók',
      value: s.total,
      icon: 'lucide:users',
      classes: 'border-[#7C3AED]/45 bg-[linear-gradient(120deg,#7A34DF_0%,#5E27B8_45%,#4C2195_100%)]',
      iconClasses: 'bg-white/[0.14] text-white',
    },
    {
      key: 'active' as AdminSubscriptionFilter,
      label: 'Aktív fiók',
      value: s.active,
      icon: 'lucide:circle-check',
      classes: 'border-[#2BB08A]/35 bg-[linear-gradient(110deg,#0A2330_0%,#0C2E3A_55%,#0F4047_100%)]',
      iconClasses: 'bg-white/[0.12] text-[#9BF3DE]',
    },
    {
      key: 'trialing' as AdminSubscriptionFilter,
      label: 'Próbaidő',
      value: s.trialing,
      icon: 'lucide:gift',
      classes: 'border-[#C08A3E]/35 bg-[linear-gradient(110deg,#4E372D_0%,#3A2B2E_55%,#2A2131_100%)]',
      iconClasses: 'bg-white/[0.10] text-[#F7C98B]',
    },
    {
      key: 'canceled' as AdminSubscriptionFilter,
      label: 'Lemondva',
      value: s.canceled,
      icon: 'lucide:circle-pause',
      classes: 'border-[#3B6FC4]/35 bg-[linear-gradient(110deg,#1A3A78_0%,#142759_55%,#111B40_100%)]',
      iconClasses: 'bg-white/[0.12] text-[#A9C7FF]',
    },
    {
      key: 'expired' as AdminSubscriptionFilter,
      label: 'Lejárt',
      value: s.expired,
      icon: 'lucide:circle-x',
      classes: 'border-[#B4475F]/35 bg-[linear-gradient(110deg,#4A1F2C_0%,#361C29_55%,#271A2B_100%)]',
      iconClasses: 'bg-white/[0.10] text-[#F79BB0]',
    },
    {
      key: 'free' as AdminSubscriptionFilter,
      label: 'Ingyenes',
      value: s.free,
      icon: 'lucide:user-round',
      classes: 'border-[#8B5CF6]/35 bg-[linear-gradient(110deg,#45247B_0%,#351D68_55%,#2A1758_100%)]',
      iconClasses: 'bg-white/[0.12] text-[#D6C4FF]',
    },
  ]
})

const rangeStart = computed(() => (items.value.length ? (data.value!.page - 1) * data.value!.perPage + 1 : 0))
const rangeEnd = computed(() => (items.value.length ? rangeStart.value + items.value.length - 1 : 0))

const pageNumbers = computed(() => {
  const totalPages = data.value?.totalPages ?? 1
  const current = data.value?.page ?? 1
  const start = Math.max(1, Math.min(current - 2, totalPages - 4))
  const end = Math.min(totalPages, start + 4)
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index)
})

function initial(email: string): string {
  return email.trim().charAt(0).toUpperCase()
}
</script>

<template>
  <div class="space-y-4">
    <!-- Oldal fejléc -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex items-center gap-3.5">
        <span class="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,#8B4CF0,#6D3ABF)] text-white shadow-[0_14px_30px_-14px_rgba(110,62,176,0.9)]">
          <Icon name="lucide:receipt" class="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h1 class="text-[28px] font-bold leading-tight tracking-tight text-white">Előfizetések</h1>
          <p class="mt-0.5 text-[13px] text-[#B7B1D4]">Fiókok csomagjai, próbaidői és lemondásai.</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#15132F] px-4 py-2.5 text-[13px] font-medium text-[#E4E1F5] transition-colors hover:border-[#8B5CF6]/45 hover:bg-[#1B1840] disabled:opacity-60"
          :disabled="loading"
          @click="load()"
        >
          <Icon
            :name="loading ? 'lucide:loader-circle' : 'lucide:rotate-cw'"
            :class="['h-4 w-4', { 'animate-spin': loading }]"
            aria-hidden="true"
          />
          {{ loading ? 'Betöltés…' : 'Frissítés' }}
        </button>
        <NuxtLink
          to="/admin/felhasznalok"
          class="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(90deg,#AE6DFC,#8B3FE8)] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_14px_30px_-16px_rgba(139,63,232,0.95)] transition-opacity hover:opacity-90"
        >
          <Icon name="lucide:users" class="h-4 w-4" aria-hidden="true" />
          Felhasználók
        </NuxtLink>
      </div>
    </div>

    <!-- Összesítő kártyák -->
    <div v-if="summary" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <button
        v-for="card in summaryCards"
        :key="card.key"
        type="button"
        :class="[
          'group relative overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all',
          card.classes,
          filter === card.key ? 'ring-2 ring-[#C9A7FF]/70' : 'hover:border-white/25',
        ]"
        :aria-pressed="filter === card.key"
        @click="selectFilter(card.key)"
      >
        <span class="pointer-events-none absolute -bottom-8 -right-6 h-24 w-24 rounded-full bg-white/[0.035]" aria-hidden="true" />
        <span class="pointer-events-none absolute -bottom-10 right-6 h-16 w-16 rounded-full bg-white/[0.03]" aria-hidden="true" />
        <span class="relative flex items-center gap-3">
          <span :class="['grid h-11 w-11 shrink-0 place-items-center rounded-full', card.iconClasses]">
            <Icon :name="card.icon" class="h-[22px] w-[22px]" aria-hidden="true" />
          </span>
          <span class="min-w-0">
            <span class="block truncate text-[12px] text-white/70">{{ card.label }}</span>
            <span class="block text-[28px] font-bold leading-tight text-white">{{ card.value }}</span>
          </span>
        </span>
      </button>
    </div>

    <p v-if="error" class="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">{{ error }}</p>

    <!-- Keresés és szűrő -->
    <div class="flex flex-wrap items-center gap-2.5">
      <form class="relative min-w-[12rem] flex-1" @submit.prevent="applySearch">
        <label for="admin-sub-search" class="sr-only">Keresés névre, e-mailre, csomagra vagy állapotra</label>
        <Icon name="lucide:search" class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9F97C4]" aria-hidden="true" />
        <input
          id="admin-sub-search"
          v-model="searchInput"
          type="search"
          class="w-full rounded-xl border border-[#6D4AB8]/45 bg-[#161536] py-2.5 pl-10 pr-3 text-[13px] text-white placeholder:text-[#9F97C4] focus:border-[#8B5CF6]/70 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/25"
          placeholder="Keresés e-mailre, névre, csomagra vagy állapotra…"
          autocomplete="off"
        >
      </form>

      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(90deg,#AE6DFC,#8B3FE8)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_12px_26px_-16px_rgba(139,63,232,0.95)] transition-opacity hover:opacity-90"
        @click="applySearch"
      >
        <Icon name="lucide:search" class="h-4 w-4" aria-hidden="true" />
        Keresés
      </button>

      <div class="flex items-center gap-2">
        <span class="hidden text-[12px] text-[#B7B1D4] sm:inline">Szűrő:</span>
        <div class="relative">
          <label for="admin-sub-filter" class="sr-only">Szűrő</label>
          <Icon name="lucide:funnel" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B7B1D4]" aria-hidden="true" />
          <select
            id="admin-sub-filter"
            :value="filter"
            class="appearance-none rounded-xl border border-white/10 bg-[#131730] py-2.5 pl-9 pr-9 text-[13px] text-white focus:border-[#8B5CF6]/60 focus:outline-none"
            @change="selectFilter(($event.target as HTMLSelectElement).value as AdminSubscriptionFilter)"
          >
            <option v-for="option in FILTERS" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
          <Icon name="lucide:chevron-down" class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B7B1D4]" aria-hidden="true" />
        </div>
      </div>
    </div>

    <!-- Kiválasztás sáv -->
    <div v-if="selected.size" class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#8B5CF6]/35 bg-[#6D3ABF]/20 px-3.5 py-2 text-[12px] text-[#E7E2FA]">
      <span>{{ selected.size }} fiók kiválasztva</span>
      <button type="button" class="rounded-lg px-2 py-1 text-[#C9C2E4] transition-colors hover:bg-white/5 hover:text-white" @click="selected = new Set()">
        Kijelölés törlése
      </button>
    </div>

    <!-- Táblázat -->
    <div class="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#10132A]">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[64rem] text-left text-[13px]">
          <thead>
            <tr class="border-b border-white/[0.06] bg-[#1E1F43] text-[12px] font-semibold text-white">
              <th class="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  class="h-4 w-4 cursor-pointer rounded border-white/25 bg-white/10 accent-[#9147FD]"
                  :checked="allSelected"
                  aria-label="Minden sor kijelölése"
                  @change="toggleAll"
                >
              </th>
              <th class="px-3 py-3">
                <button type="button" class="inline-flex items-center gap-1.5 transition-colors hover:text-violet-100" @click="toggleSort('email')">
                  Felhasználó
                  <Icon :name="sortKey === 'email' ? (sortDir === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down') : 'lucide:arrow-up-down'" class="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </th>
              <th class="px-3 py-3">Csomag</th>
              <th class="px-3 py-3">Állapot</th>
              <th class="px-3 py-3">Próbaidő vége</th>
              <th class="px-3 py-3">
                <button type="button" class="inline-flex items-center gap-1.5 transition-colors hover:text-violet-100" @click="toggleSort('periodEnd')">
                  Időszak vége
                  <Icon :name="sortKey === 'periodEnd' ? (sortDir === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down') : 'lucide:arrow-up-down'" class="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </th>
              <th class="px-3 py-3">Lemondva</th>
              <th class="px-3 py-3">
                <button type="button" class="inline-flex items-center gap-1.5 transition-colors hover:text-violet-100" @click="toggleSort('createdAt')">
                  Regisztrált
                  <Icon :name="sortKey === 'createdAt' ? (sortDir === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down') : 'lucide:arrow-up-down'" class="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </th>
              <th class="px-4 py-3 text-right">Műveletek</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.05]">
            <tr
              v-for="item in sortedItems"
              :key="item.userId"
              :class="['transition-colors odd:bg-[#121529] even:bg-[#101328] hover:bg-[#181C3A]', selected.has(item.userId) ? '!bg-[#6D3ABF]/25' : '']"
            >
              <td class="px-4 py-3">
                <input
                  type="checkbox"
                  class="h-4 w-4 cursor-pointer rounded border-white/25 bg-white/10 accent-[#9147FD]"
                  :checked="selected.has(item.userId)"
                  :aria-label="`${item.email} kijelölése`"
                  @change="toggleRow(item.userId)"
                >
              </td>
              <td class="px-3 py-3">
                <div class="flex items-center gap-3">
                  <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#8B4CF0,#6D3ABF)] text-[12px] font-semibold text-white">
                    {{ initial(item.email) }}
                  </span>
                  <span class="min-w-0">
                    <NuxtLink
                      :to="`/admin/felhasznalok/${item.userId}`"
                      class="block truncate font-medium text-white hover:text-[#C9A7FF]"
                    >
                      {{ item.email }}
                    </NuxtLink>
                    <span v-if="item.name" class="block truncate text-[11.5px] text-[#9F97C4]">{{ item.name }}</span>
                  </span>
                </div>
              </td>
              <td class="px-3 py-3">
                <span class="text-[#E7E2FA]">{{ item.planLabel }}</span>
                <span
                  v-if="item.interval && item.status !== 'free' && item.status !== 'expired'"
                  class="mt-0.5 block text-[11px] text-[#9F97C4]"
                >
                  {{ item.interval === 'yearly' ? 'éves' : item.interval === 'lifetime' ? 'élettartam' : 'havi' }}
                </span>
              </td>
              <td class="px-3 py-3">
                <span :class="['inline-flex items-center rounded-md px-2 py-0.5 text-[11.5px] font-semibold', statusClasses(item.status)]">
                  {{ STATUS_LABELS[item.status] }}
                </span>
              </td>
              <td class="px-3 py-3 text-[#B7B1D4]">{{ formatDate(item.trialEndsAt) }}</td>
              <td class="px-3 py-3 text-[#B7B1D4]">
                {{ formatDate(item.status === 'expired' ? item.endedAt : item.currentPeriodEnd) }}
              </td>
              <td class="px-3 py-3 text-[#B7B1D4]">{{ formatDate(item.canceledAt) }}</td>
              <td class="px-3 py-3 text-[#9F97C4]">{{ formatDate(item.createdAt) }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1.5">
                  <NuxtLink
                    :to="`/admin/felhasznalok/${item.userId}`"
                    class="grid h-8 w-8 place-items-center rounded-lg bg-[#6D3ABF]/30 text-[#C9A7FF] transition-colors hover:bg-[#6D3ABF]/55 hover:text-white"
                    :aria-label="`${item.email} adatlapja`"
                    title="Adatlap megnyitása"
                  >
                    <Icon name="lucide:eye" class="h-4 w-4" aria-hidden="true" />
                  </NuxtLink>
                  <NuxtLink
                    :to="`/admin/felhasznalok/${item.userId}`"
                    class="grid h-8 w-8 place-items-center rounded-lg bg-[#2A3D6B] text-[#A9C7FF] transition-colors hover:bg-[#35507F] hover:text-white"
                    :aria-label="`${item.email} szerkesztése`"
                    title="Fiók szerkesztése"
                  >
                    <Icon name="lucide:pencil" class="h-4 w-4" aria-hidden="true" />
                  </NuxtLink>
                  <NuxtLink
                    :to="`/admin/elofizetesek?q=${encodeURIComponent(item.email)}`"
                    class="grid h-8 w-8 place-items-center rounded-lg bg-[#641B34] text-[#F79BB0] transition-colors hover:bg-[#7A2440] hover:text-white"
                    :aria-label="`${item.email} előfizetésének szűrése`"
                    title="Csak ennek a fióknak az előfizetése"
                  >
                    <Icon name="lucide:list-filter" class="h-4 w-4" aria-hidden="true" />
                  </NuxtLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="loading && !items.length" class="px-4 py-10 text-center text-sm text-[#9F97C4]">Betöltés…</p>
      <p v-else-if="!items.length" class="px-4 py-10 text-center text-sm text-[#9F97C4]">
        Nincs a szűrésnek megfelelő fiók.
      </p>
    </div>

    <!-- Lábléc -->
    <div class="flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#B7B1D4]">
      <p>Megjelenítve: {{ rangeStart }} – {{ rangeEnd }} / {{ data?.total ?? 0 }}</p>

      <div class="flex flex-wrap items-center gap-4">
        <label class="flex items-center gap-2">
          <span>Sorok oldalanként:</span>
          <span class="relative">
            <select
              v-model.number="perPage"
              class="appearance-none rounded-lg border border-white/10 bg-[#131730] py-1.5 pl-3 pr-8 text-[12px] text-white focus:border-[#8B5CF6]/60 focus:outline-none"
            >
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
            </select>
            <Icon name="lucide:chevron-down" class="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-violet-200/40" aria-hidden="true" />
          </span>
        </label>

        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-[#15132F] text-[#E7E2FA] transition-colors hover:bg-[#1B1840] disabled:opacity-40"
            :disabled="page <= 1 || loading"
            aria-label="Előző oldal"
            @click="page -= 1"
          >
            <Icon name="lucide:chevron-left" class="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            v-for="number in pageNumbers"
            :key="number"
            type="button"
            :class="[
              'grid h-8 min-w-8 place-items-center rounded-lg px-2 text-[12px] font-medium transition-colors',
              number === (data?.page ?? 1)
                ? 'bg-[#9147FD] text-white shadow-[0_12px_24px_-16px_rgba(145,71,253,0.9)]'
                : 'border border-white/10 bg-[#15132F] text-[#E7E2FA] hover:bg-[#1B1840]',
            ]"
            @click="page = number"
          >
            {{ number }}
          </button>
          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-[#15132F] text-[#E7E2FA] transition-colors hover:bg-[#1B1840] disabled:opacity-40"
            :disabled="page >= (data?.totalPages ?? 1) || loading"
            aria-label="Következő oldal"
            @click="page += 1"
          >
            <Icon name="lucide:chevron-right" class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
