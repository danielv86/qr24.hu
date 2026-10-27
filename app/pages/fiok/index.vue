<script setup lang="ts">
import type {
  ApiSuccess,
  DashboardSummary,
  PlanId,
  UserDynamicQrItem,
  UserDynamicQrList,
} from '#shared/types/api'
import { DYNAMIC_QR_STATUS_LABELS, type DynamicQrStatus } from '#shared/qr/status'
import { DEFAULT_CUSTOMIZATION } from '~/lib/qr/customization'
import { downloadDynamicQr } from '~/utils/qr-download'

definePageMeta({ layout: 'fiok', middleware: 'auth' })

useSeoMeta({
  title: 'QR-kódjaim | QRKOD24.hu',
  description: 'Dinamikus QR-kódok kezelése, cél-URL módosítása és beolvasási statisztikák.',
  robots: 'noindex, nofollow',
})

const { user } = useUserSession()
const request = useRequestFetch()
const route = useRoute()
const router = useRouter()

const { data: summary, refresh: refreshSummary } = await useAsyncData<DashboardSummary | null>(
  'fiok-summary',
  async () => {
    const response = await request<ApiSuccess<DashboardSummary>>('/api/dashboard/summary')
    return response.data
  },
  { default: () => null },
)

const page = ref(1)
const perPage = 8
const search = ref('')
const debouncedSearch = ref('')
const status = ref<'all' | DynamicQrStatus>('all')
const sort = ref<'createdAt' | 'updatedAt' | 'lastScanAt' | 'scans' | 'title'>('createdAt')
const dir = ref<'asc' | 'desc'>('desc')
let searchTimer: ReturnType<typeof setTimeout> | undefined

watch(search, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    debouncedSearch.value = value.trim()
    page.value = 1
  }, 300)
})

watch([status, sort, dir], () => {
  page.value = 1
})

const listKey = 'fiok-qr-list'
const { data: list, pending, error: listError, refresh: refreshList } = await useAsyncData<UserDynamicQrList>(
  listKey,
  async () => {
    const response = await request<ApiSuccess<UserDynamicQrList>>('/api/dynamic-qr', {
      query: {
        page: page.value,
        perPage,
        q: debouncedSearch.value,
        status: status.value,
        sort: sort.value,
        dir: dir.value,
      },
    })
    return response.data
  },
  { watch: [page, status, sort, dir, debouncedSearch], default: () => ({ items: [], total: 0, page: 1, perPage, totalPages: 1 }) },
)

const items = computed(() => list.value?.items || [])
const totalPages = computed(() => list.value?.totalPages || 1)
const total = computed(() => list.value?.total || 0)
const isEmpty = computed(() => !pending.value && items.value.length === 0)

const statusFilters: { value: 'all' | DynamicQrStatus; label: string }[] = [
  { value: 'all', label: 'Összes' },
  { value: 'active', label: 'Aktív' },
  { value: 'paused', label: 'Szünetel' },
  { value: 'expired', label: 'Lejárt' },
  { value: 'archived', label: 'Archivált' },
]

const sortOptions = [
  { value: 'createdAt', label: 'Létrehozás szerint' },
  { value: 'lastScanAt', label: 'Utolsó beolvasás' },
  { value: 'scans', label: 'Beolvasások' },
  { value: 'title', label: 'Név szerint' },
]

/* ── Új QR-kód ──────────────────────────────────────────────────────── */
const showCreate = ref(route.query.uj === '1')
const creating = ref(false)
const createError = ref('')
const created = ref<UserDynamicQrItem | null>(null)
const form = reactive({
  name: '',
  targetUrl: '',
  description: '',
  category: '',
  campaign: '',
  expiresAt: '',
})

const plan = computed(() => summary.value?.plan || user.value?.plan || 'free')
// A csomag szabályai a backend beállításaiból jönnek, hogy a felület és a
// szerveroldali ellenőrzés ugyanazt a limitet lássa.
const { settings: siteSettings } = useSiteSettings()
const planFeatures = computed(() => siteSettings.value.plans?.[plan.value as PlanId] ?? null)
const canUseExpiry = computed(() => planFeatures.value?.expiresAt === true)
const canUseCampaign = computed(() => planFeatures.value?.campaigns === true)
const canExport = computed(() => planFeatures.value?.csvExport === true)
const quotaReached = computed(() => {
  const used = summary.value?.totalQrCodes ?? 0
  const limit = summary.value?.planLimit ?? 5
  return used >= limit
})

function resetForm() {
  form.name = ''
  form.targetUrl = ''
  form.description = ''
  form.category = ''
  form.campaign = ''
  form.expiresAt = ''
  createError.value = ''
}

async function submitCreate() {
  if (creating.value) return
  creating.value = true
  createError.value = ''
  try {
    const response = await $fetch<ApiSuccess<UserDynamicQrItem & { editToken: string }>>('/api/dynamic-qr', {
      method: 'POST',
      body: {
        title: form.name,
        targetUrl: form.targetUrl.trim(),
        description: form.description || undefined,
        category: form.category || undefined,
        campaign: form.campaign || undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      },
    })
    created.value = response.data
    resetForm()
    await Promise.all([refreshList(), refreshSummary()])
  } catch (error) {
    createError.value = apiErrorMessage(error, 'A QR-kód létrehozása nem sikerült.')
  } finally {
    creating.value = false
  }
}

function closeCreated() {
  created.value = null
  if (route.query.uj) router.replace({ query: {} })
}

/* ── Műveletek ──────────────────────────────────────────────────────── */
const busyCode = ref<string | null>(null)
const actionMessage = ref('')
const actionError = ref('')
const confirmDelete = ref<UserDynamicQrItem | null>(null)
const copiedCode = ref<string | null>(null)

async function runAction(item: UserDynamicQrItem, action: 'pause' | 'activate' | 'archive') {
  busyCode.value = item.shortCode
  actionError.value = ''
  try {
    await $fetch(`/api/dynamic-qr/${item.shortCode}/${action}`, { method: 'POST', body: {} })
    actionMessage.value = action === 'pause'
      ? 'A QR-kód szüneteltetve. A beolvasók állapotoldalt látnak.'
      : action === 'activate'
        ? 'A QR-kód újra aktív.'
        : 'A QR-kód archiválva.'
    await Promise.all([refreshList(), refreshSummary()])
  } catch (error) {
    actionError.value = apiErrorMessage(error, 'A művelet nem sikerült.')
  } finally {
    busyCode.value = null
  }
}

async function removeQr() {
  const item = confirmDelete.value
  if (!item) return
  busyCode.value = item.shortCode
  try {
    await $fetch(`/api/dynamic-qr/${item.shortCode}`, { method: 'DELETE' })
    confirmDelete.value = null
    actionMessage.value = 'A QR-kód törölve.'
    await Promise.all([refreshList(), refreshSummary()])
  } catch (error) {
    actionError.value = apiErrorMessage(error, 'A törlés nem sikerült.')
  } finally {
    busyCode.value = null
  }
}

async function copyShortUrl(item: UserDynamicQrItem) {
  try {
    await navigator.clipboard.writeText(item.shortUrl)
    copiedCode.value = item.shortCode
    setTimeout(() => { if (copiedCode.value === item.shortCode) copiedCode.value = null }, 2000)
  } catch {
    actionError.value = 'A vágólap nem érhető el. Jelöld ki kézzel a címet.'
  }
}

const exporting = ref(false)

/** A szűrt lista összes sorát CSV-be menti, 50-esével lapozva. */
async function exportCsv() {
  if (exporting.value || !canExport.value) return
  exporting.value = true
  actionError.value = ''
  try {
    const rows: UserDynamicQrItem[] = []
    const maxRows = 2000
    let currentPage = 1
    let pages = 1
    do {
      const response = await $fetch<ApiSuccess<UserDynamicQrList>>('/api/dynamic-qr', {
        query: {
          page: currentPage,
          perPage: 50,
          q: debouncedSearch.value,
          status: status.value,
          sort: sort.value,
          dir: dir.value,
        },
      })
      rows.push(...response.data.items)
      pages = response.data.totalPages
      currentPage += 1
    } while (currentPage <= pages && rows.length < maxRows)

    const header = ['Név', 'Rövid kód', 'Rövid cím', 'Cél-URL', 'Állapot', 'Kategória', 'Kampány', 'Beolvasások', 'Létrehozva', 'Utolsó beolvasás']
    const lines = [header, ...rows.map(item => [
      item.name || '',
      item.shortCode,
      item.shortUrl,
      item.targetUrl,
      DYNAMIC_QR_STATUS_LABELS[item.status],
      item.category || '',
      item.campaign || '',
      String(item.scans),
      item.createdAt,
      item.lastScanAt || '',
    ])]
    const csv = lines.map(line => line.map(csvCell).join(';')).join('\r\n')

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `qr24-qr-kodok-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    actionMessage.value = `${rows.length} QR-kód exportálva CSV-fájlba.`
  } catch (error) {
    actionError.value = apiErrorMessage(error, 'Az exportálás nem sikerült.')
  } finally {
    exporting.value = false
  }
}

function csvCell(value: string): string {
  const text = String(value ?? '')
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const downloading = ref<string | null>(null)
async function download(item: UserDynamicQrItem, format: 'png' | 'svg') {
  downloading.value = `${item.shortCode}:${format}`
  actionError.value = ''
  try {
    await downloadDynamicQr(item.shortUrl, item.name || item.shortCode, format)
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : 'A letöltés nem sikerült.'
  } finally {
    downloading.value = null
  }
}

/* A kártyák előnézete a rövid címből készül, ugyanazzal a renderelővel. */
const previewStyles = {
  dotStyle: DEFAULT_CUSTOMIZATION.dotStyle,
  cornerSquareStyle: DEFAULT_CUSTOMIZATION.cornerSquareStyle,
  cornerDotStyle: DEFAULT_CUSTOMIZATION.cornerDotStyle,
  color: DEFAULT_CUSTOMIZATION.bodyFill.color,
}

function formatDate(value: string | null): string {
  if (!value) return '–'
  return new Date(value).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })
}

function toggleStatus(item: UserDynamicQrItem) {
  if (busyCode.value) return
  return runAction(item, item.status === 'active' ? 'pause' : 'activate')
}

function statusClass(value: DynamicQrStatus): string {
  if (value === 'active') return 'bg-emerald-50 text-emerald-700'
  if (value === 'paused') return 'bg-amber-50 text-amber-700'
  if (value === 'expired') return 'bg-red-50 text-red-700'
  return 'bg-slate-100 text-slate-600'
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink">QR-kódjaid</h1>
        <p class="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          <span class="font-semibold text-ink">{{ summary?.totalQrCodes ?? 0 }}</span>
          / {{ summary?.planLimit ?? 5 }} felhasználva
          <span class="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
            {{ summary?.planLabel || 'Ingyenes' }} csomag
          </span>
        </p>
      </div>
    </div>

    <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div class="card p-4">
        <p class="text-xs font-medium text-ink-muted">QR-kódok</p>
        <p class="mt-1 text-2xl font-semibold text-ink">{{ summary?.totalQrCodes ?? 0 }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs font-medium text-ink-muted">Aktív</p>
        <p class="mt-1 text-2xl font-semibold text-emerald-600">{{ summary?.activeQrCodes ?? 0 }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs font-medium text-ink-muted">Összes beolvasás</p>
        <p class="mt-1 text-2xl font-semibold text-ink">{{ summary?.totalScans ?? 0 }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs font-medium text-ink-muted">Beolvasás (30 nap)</p>
        <p class="mt-1 text-2xl font-semibold text-brand-700">{{ summary?.scansLast30Days ?? 0 }}</p>
      </div>
    </div>

    <p v-if="actionMessage" class="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
      {{ actionMessage }}
    </p>
    <p v-if="actionError" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {{ actionError }}
    </p>

    <div class="mt-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <Icon name="lucide:search" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
        <input
          v-model="search"
          type="search"
          class="field-input pl-9"
          placeholder="Keresés név, cél-URL vagy rövid kód szerint"
          aria-label="Keresés a QR-kódok között"
        >
      </div>
      <label class="flex items-center gap-2 text-xs text-ink-muted">
        <span class="sr-only">Rendezés</span>
        <select v-model="sort" class="field-input w-auto py-2 text-sm">
          <option v-for="option in sortOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <button
          type="button"
          class="btn-ghost px-2 py-1.5"
          :aria-label="dir === 'desc' ? 'Növekvő sorrend' : 'Csökkenő sorrend'"
          @click="dir = dir === 'desc' ? 'asc' : 'desc'"
        >
          <Icon :name="dir === 'desc' ? 'lucide:arrow-down-wide-narrow' : 'lucide:arrow-up-narrow-wide'" class="h-4 w-4" aria-hidden="true" />
        </button>
      </label>
      <div class="flex items-center gap-2 border-slate-200 sm:border-l sm:pl-3">
        <button
          type="button"
          class="btn-ghost px-2.5 py-2 text-xs"
          :disabled="exporting || !canExport"
          :title="canExport ? 'A szűrt lista exportálása CSV-be' : 'A CSV-export a Pro csomagtól elérhető.'"
          @click="exportCsv"
        >
          <Icon :name="exporting ? 'lucide:loader-circle' : 'lucide:download'" :class="['h-4 w-4', { 'animate-spin': exporting }]" aria-hidden="true" />
          <span class="hidden sm:inline">Exportálás</span>
        </button>
        <button type="button" class="btn-primary px-4 py-2.5 text-xs" @click="showCreate = true">
          <Icon name="lucide:plus" class="h-4 w-4" aria-hidden="true" />
          Új
        </button>
      </div>
    </div>

    <div class="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Állapot szerinti szűrés">
      <button
        v-for="filter in statusFilters"
        :key="filter.value"
        type="button"
        role="tab"
        :aria-selected="status === filter.value"
        :class="[
          'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
          status === filter.value ? 'bg-brand-600 text-white' : 'bg-white text-ink-soft ring-1 ring-slate-200 hover:ring-brand-300',
        ]"
        @click="status = filter.value"
      >
        {{ filter.label }}
      </button>
    </div>

    <div class="mt-4 space-y-3">
      <p v-if="pending" class="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-ink-muted">
        Betöltés…
      </p>
      <p v-else-if="listError" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
        A QR-kódok betöltése nem sikerült. Frissítsd az oldalt.
      </p>

      <article
        v-for="item in items"
        :key="item.id"
        class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4"
      >
        <div class="flex flex-wrap items-center gap-4 sm:flex-nowrap sm:gap-6">
          <div class="shrink-0 rounded-xl bg-slate-50 p-2">
            <QrMiniCode
              :dot-style="previewStyles.dotStyle"
              :corner-square-style="previewStyles.cornerSquareStyle"
              :corner-dot-style="previewStyles.cornerDotStyle"
              :color="previewStyles.color"
              :data="item.shortUrl"
              class="h-[72px] w-[72px] sm:h-[92px] sm:w-[92px]"
            />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="truncate text-base font-semibold text-ink sm:text-lg">{{ item.name || 'Névtelen QR-kód' }}</h2>
              <span :class="['inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', statusClass(item.status)]">
                <span class="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                {{ DYNAMIC_QR_STATUS_LABELS[item.status] }}
              </span>
            </div>

            <p class="mt-1 truncate text-xs text-ink-muted sm:text-sm">
              {{ item.category || 'Dinamikus QR-kód' }}
              <span aria-hidden="true"> · </span>{{ item.scans }} beolvasás
            </p>

            <p class="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-ink-muted">
              <Icon name="lucide:link" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <a
                :href="item.shortUrl"
                target="_blank"
                rel="noopener"
                class="truncate underline-offset-2 hover:text-brand-700 hover:underline"
                :title="item.shortUrl"
              >
                {{ item.shortUrl }}
              </a>
              <button
                type="button"
                class="btn-ghost shrink-0 px-1.5 py-1 text-[11px]"
                :aria-label="copiedCode === item.shortCode ? 'Másolva' : 'Rövid link másolása'"
                :title="copiedCode === item.shortCode ? 'Másolva' : 'Rövid link másolása'"
                @click="copyShortUrl(item)"
              >
                <Icon :name="copiedCode === item.shortCode ? 'lucide:check' : 'lucide:copy'" class="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </p>
          </div>

          <div class="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
            <button
              v-if="item.status !== 'archived'"
              type="button"
              role="switch"
              :aria-checked="item.status === 'active'"
              :aria-label="item.status === 'active' ? 'Szüneteltetés' : 'Újraaktiválás'"
              :title="item.status === 'active' ? 'Szüneteltetés' : 'Újraaktiválás'"
              :disabled="busyCode === item.shortCode"
              :class="[
                'relative mr-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
                item.status === 'active' ? 'bg-brand-600' : 'bg-slate-300',
              ]"
              @click="toggleStatus(item)"
            >
              <span
                :class="[
                  'inline-block transform rounded-full bg-white shadow transition-transform',
                  item.status === 'active' ? 'translate-x-[22px]' : 'translate-x-[4px]',
                ]"
                style="height: 18px; width: 18px"
              />
            </button>
            <NuxtLink
              :to="`/fiok/qr/${item.shortCode}#analytics-title`"
              class="btn-ghost h-9 w-9 p-0 text-ink-soft"
              title="Statisztikák"
              aria-label="Statisztikák"
            >
              <Icon name="lucide:chart-no-axes-column" class="h-[18px] w-[18px]" aria-hidden="true" />
            </NuxtLink>
            <NuxtLink
              :to="`/fiok/qr/${item.shortCode}`"
              class="btn-ghost h-9 w-9 p-0 text-ink-soft"
              title="Szerkesztés"
              aria-label="Szerkesztés"
            >
              <Icon name="lucide:pencil" class="h-[18px] w-[18px]" aria-hidden="true" />
            </NuxtLink>
            <button
              type="button"
              class="btn-ghost h-9 w-9 p-0 text-ink-soft hover:text-red-600"
              title="Törlés"
              aria-label="Törlés"
              @click="confirmDelete = item"
            >
              <Icon name="lucide:trash-2" class="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="btn-ghost h-9 w-9 p-0 text-ink-soft"
              title="PNG letöltés"
              aria-label="PNG letöltés"
              :disabled="downloading === `${item.shortCode}:png`"
              @click="download(item, 'png')"
            >
              <Icon
                :name="downloading === `${item.shortCode}:png` ? 'lucide:loader-circle' : 'lucide:download'"
                :class="['h-[18px] w-[18px]', { 'animate-spin': downloading === `${item.shortCode}:png` }]"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </article>

      <div v-if="isEmpty" class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <span class="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <Icon name="lucide:qr-code" class="h-6 w-6" aria-hidden="true" />
        </span>
        <p class="mt-3 text-sm font-semibold text-ink">Még nincs dinamikus QR-kódod</p>
        <p class="mx-auto mt-1 max-w-md text-sm text-ink-soft">
          A dinamikus kód címe sosem változik, a cél-URL-t viszont bármikor átírhatod – a kinyomtatott kód továbbra is működik.
        </p>
        <button type="button" class="btn-primary mt-4" @click="showCreate = true">
          <Icon name="lucide:plus" class="h-4 w-4" aria-hidden="true" />
          Első QR-kód létrehozása
        </button>
      </div>
    </div>

    <div v-if="totalPages > 1" class="mt-4 flex items-center justify-between text-sm">
      <p class="text-xs text-ink-muted">{{ total }} találat · {{ page }} / {{ totalPages }} oldal</p>
      <div class="flex gap-2">
        <button type="button" class="btn-secondary px-3 py-1.5 text-xs" :disabled="page <= 1" @click="page -= 1">Előző</button>
        <button type="button" class="btn-secondary px-3 py-1.5 text-xs" :disabled="page >= totalPages" @click="page += 1">Következő</button>
      </div>
    </div>

    <div v-if="summary?.recentActivity?.length" class="mt-8">
      <h2 class="text-sm font-semibold text-ink">Legutóbbi aktivitás</h2>
      <ul class="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        <li v-for="activity in summary.recentActivity" :key="activity.id" class="flex flex-wrap items-center gap-2 px-4 py-2.5 text-xs">
          <span class="font-medium text-ink">{{ activity.label }}</span>
          <span v-if="activity.qrName" class="truncate text-ink-soft">{{ activity.qrName }}</span>
          <span class="ml-auto text-ink-muted">{{ formatDate(activity.createdAt) }}</span>
        </li>
      </ul>
    </div>

    <!-- Létrehozás -->
    <div v-if="showCreate" class="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4" @click.self="showCreate = false">
      <div class="mt-10 w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="create-qr-title">
        <div class="flex items-start justify-between gap-2">
          <h2 id="create-qr-title" class="text-lg font-semibold text-ink">Új dinamikus QR-kód</h2>
          <button type="button" class="btn-ghost px-2 py-1" aria-label="Bezárás" @click="showCreate = false">
            <Icon name="lucide:x" class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p v-if="quotaReached" class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
          Elérted a(z) {{ summary?.planLabel || 'Ingyenes' }} csomag limitjét ({{ summary?.planLimit }} kód). Archiválj egy kódot, vagy válts nagyobb csomagra.
        </p>

        <form class="mt-4 space-y-3" @submit.prevent="submitCreate">
          <div>
            <label for="qr-name" class="field-label">QR-kód neve</label>
            <input id="qr-name" v-model="form.name" class="field-input" maxlength="120" placeholder="Például: Tavaszi kampány" required>
          </div>
          <div>
            <label for="qr-target" class="field-label">Cél-URL</label>
            <input id="qr-target" v-model="form.targetUrl" class="field-input" type="url" inputmode="url" placeholder="https://qrkod24.hu/ajanlat" required>
            <p class="field-help">Csak nyilvános http:// vagy https:// cím adható meg.</p>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label for="qr-category" class="field-label">Kategória</label>
              <input id="qr-category" v-model="form.category" class="field-input" maxlength="60" placeholder="például: webshop">
            </div>
            <div>
              <label for="qr-campaign" class="field-label">Kampány</label>
              <input id="qr-campaign" v-model="form.campaign" class="field-input" maxlength="60" :disabled="!canUseCampaign" placeholder="például: nyar-2026">
              <p v-if="!canUseCampaign" class="field-help">Pro csomagtól elérhető.</p>
            </div>
          </div>
          <div>
            <label for="qr-description" class="field-label">Leírás (nem nyilvános)</label>
            <textarea id="qr-description" v-model="form.description" class="field-input" rows="2" maxlength="500" />
          </div>
          <div>
            <label for="qr-expiry" class="field-label">Lejárat</label>
            <input id="qr-expiry" v-model="form.expiresAt" class="field-input" type="datetime-local" :disabled="!canUseExpiry">
            <p v-if="!canUseExpiry" class="field-help">A lejárati dátum Pro csomagtól elérhető.</p>
          </div>

          <p v-if="createError" class="field-error" role="alert">{{ createError }}</p>

          <div class="flex justify-end gap-2 pt-1">
            <button type="button" class="btn-secondary" @click="showCreate = false">Mégse</button>
            <button type="submit" class="btn-primary" :disabled="creating || quotaReached">
              <Icon :name="creating ? 'lucide:loader-circle' : 'lucide:plus'" :class="['h-4 w-4', { 'animate-spin': creating }]" aria-hidden="true" />
              {{ creating ? 'Létrehozás…' : 'Létrehozás' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Sikeres létrehozás -->
    <div v-if="created" class="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
      <div class="w-full max-w-md rounded-2xl bg-white p-5 text-center shadow-xl" role="dialog" aria-modal="true" aria-labelledby="created-title">
        <h2 id="created-title" class="text-lg font-semibold text-ink">Elkészült a QR-kód</h2>
        <div class="mx-auto mt-4 w-48 rounded-xl border border-slate-200 bg-white p-2">
          <QrMiniCode
            :dot-style="previewStyles.dotStyle"
            :corner-square-style="previewStyles.cornerSquareStyle"
            :corner-dot-style="previewStyles.cornerDotStyle"
            :color="previewStyles.color"
            :data="created.shortUrl"
            class="h-full w-full"
          />
        </div>
        <p class="mt-3 break-all text-xs text-ink-soft">{{ created.shortUrl }}</p>
        <div class="mt-4 flex flex-wrap justify-center gap-2">
          <button type="button" class="btn-primary" @click="download(created, 'png')">
            <Icon name="lucide:download" class="h-4 w-4" aria-hidden="true" />
            PNG
          </button>
          <button type="button" class="btn-secondary" @click="download(created, 'svg')">
            <Icon name="lucide:file-code-2" class="h-4 w-4" aria-hidden="true" />
            SVG
          </button>
          <NuxtLink :to="`/fiok/qr/${created.shortCode}`" class="btn-secondary" @click="closeCreated">
            Részletek
          </NuxtLink>
        </div>
        <button type="button" class="btn-ghost mt-3 w-full text-xs" @click="closeCreated">Bezárás</button>
      </div>
    </div>

    <!-- Törlés megerősítése -->
    <div v-if="confirmDelete" class="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
      <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
        <h2 id="delete-title" class="text-lg font-semibold text-ink">QR-kód törlése</h2>
        <p class="mt-2 text-sm text-ink-soft">
          Biztosan törlöd a(z) <strong>{{ confirmDelete.name || confirmDelete.shortCode }}</strong> kódot? A kinyomtatott QR-kód a törlés után már nem működik, és a statisztikái is elvésznek.
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="btn-secondary" @click="confirmDelete = null">Mégse</button>
          <button type="button" class="btn-primary bg-red-600 hover:bg-red-700" :disabled="busyCode === confirmDelete.shortCode" @click="removeQr">
            Törlés
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
