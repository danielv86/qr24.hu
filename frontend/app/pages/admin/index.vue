<script setup lang="ts">
import type {
  AdminQrListItem,
  AdminSession,
  AdminStats,
  ApiSuccess,
  PlanId,
  PlansConfig,
  PublicSettings,
} from '~/types/api'
import { LANDING_PAGES } from '~/lib/content/landing-pages'
import { LEGAL_PAGES } from '~/lib/content/legal-pages'

definePageMeta({ layout: 'admin' })

useSeoMeta({
  title: 'Adminisztráció',
  robots: 'noindex, nofollow',
})

const session = ref<AdminSession | null>(null)
const checkingSession = ref(true)
const authError = ref('')
const loginEmail = ref('')
const loginPassword = ref('')
const loginPending = ref(false)

const login = async () => {
  authError.value = ''
  loginPending.value = true
  try {
    const response = await $fetch<ApiSuccess<AdminSession>>('/api/admin/login', {
      method: 'POST',
      body: { email: loginEmail.value, password: loginPassword.value },
    })
    session.value = response.data
    loginPassword.value = ''
    await loadAll()
  } catch (error) {
    authError.value = apiErrorMessage(error, 'Sikertelen bejelentkezés.')
  } finally {
    loginPending.value = false
  }
}

const logout = async () => {
  try {
    await $fetch('/api/admin/logout', { method: 'POST' })
  } catch {
    // A kliensoldali állapotot akkor is töröljük.
  }
  session.value = null
  activeTab.value = 'qr'
  qrItems.value = []
}

const activeTab = ref<'qr' | 'stats' | 'plans' | 'settings' | 'seo'>('qr')
const adminTabs = [
  { id: 'qr', label: 'Dinamikus QR-kódok', icon: 'lucide:link-2' },
  { id: 'stats', label: 'Statisztika', icon: 'lucide:chart-no-axes-column' },
  { id: 'plans', label: 'Csomagok', icon: 'lucide:package' },
  { id: 'settings', label: 'Beállítások', icon: 'lucide:settings' },
  { id: 'seo', label: 'SEO metaadatok', icon: 'lucide:search-check' },
] as const

const qrItems = ref<AdminQrListItem[]>([])
const qrLoading = ref(false)
const qrError = ref('')
const qrQuery = reactive({ q: '', status: 'all', page: 1 })
const qrPagination = reactive({ page: 1, perPage: 20, total: 0, totalPages: 1 })
const actionMessage = ref('')
const actionError = ref('')
const pendingDelete = ref<number | null>(null)

const stats = ref<AdminStats | null>(null)
const statsError = ref('')

const settingsForm = reactive({
  brandName: '',
  adsense: { client: '', slots: { top: '', sidebar: '', content: '', guide: '', mobile: '' } },
  legal: {
    providerName: '',
    providerAddress: '',
    providerEmail: '',
    providerPhone: '',
    taxNumber: '',
    registryNumber: '',
    hostingProvider: '',
    hostingAddress: '',
  },
})
const settingsLoading = ref(false)
const settingsSaving = ref(false)
const settingsError = ref('')
const settingsMessage = ref('')

const seoPaths = [
  { path: '/', label: 'Főoldal' },
  ...LANDING_PAGES.map(page => ({ path: page.slug, label: page.h1 })),
  { path: '/dinamikus-qr-kod', label: 'Dinamikus QR-kód' },
  ...LEGAL_PAGES.map(page => ({ path: page.slug, label: page.h1 })),
  { path: '/kapcsolat', label: 'Kapcsolat' },
]

const seoForm = reactive<Record<string, { title: string; description: string; noindex: boolean }>>({})
for (const item of seoPaths) {
  seoForm[item.path] = { title: '', description: '', noindex: false }
}
const seoFields = seoPaths.map(item => ({ ...item, form: seoForm[item.path]! }))
const seoError = ref('')
const seoMessage = ref('')
const seoSavingPath = ref('')

/* ── Csomagok ───────────────────────────────────────────────────────── */
interface PlanForm {
  label: string
  maxDynamicQr: number
  analyticsDays: number
  campaigns: boolean
  expiresAt: boolean
  csvExport: boolean
  apiAccess: boolean
  customDomain: boolean
}

type PlanFeatureKey = 'campaigns' | 'expiresAt' | 'csvExport' | 'apiAccess' | 'customDomain'

const PLAN_ORDER: PlanId[] = ['free', 'pro', 'business']
const PLAN_FEATURES: { key: PlanFeatureKey; label: string }[] = [
  { key: 'campaigns', label: 'Kampánycímkék' },
  { key: 'expiresAt', label: 'Lejárati dátum' },
  { key: 'csvExport', label: 'CSV-export' },
  { key: 'apiAccess', label: 'API-hozzáférés' },
  { key: 'customDomain', label: 'Saját domain' },
]

const plansLoading = ref(false)
const plansSaving = ref(false)
const plansError = ref('')
const plansMessage = ref('')
const plansForm = reactive<Record<PlanId, PlanForm>>({
  free: { label: 'Ingyenes', maxDynamicQr: 5, analyticsDays: 30, campaigns: false, expiresAt: false, csvExport: false, apiAccess: false, customDomain: false },
  pro: { label: 'Pro', maxDynamicQr: 100, analyticsDays: 365, campaigns: true, expiresAt: true, csvExport: true, apiAccess: false, customDomain: false },
  business: { label: 'Business', maxDynamicQr: 5000, analyticsDays: 1095, campaigns: true, expiresAt: true, csvExport: true, apiAccess: true, customDomain: true },
})

function applyPlans(data: PlansConfig) {
  for (const id of PLAN_ORDER) {
    const plan = data[id]
    if (!plan) continue
    const target = plansForm[id]
    target.label = plan.label
    target.maxDynamicQr = plan.maxDynamicQr
    target.analyticsDays = plan.analyticsDays
    target.campaigns = plan.campaigns
    target.expiresAt = plan.expiresAt
    target.csvExport = plan.csvExport
    target.apiAccess = plan.apiAccess
    target.customDomain = plan.customDomain
  }
}

async function loadPlans() {
  plansLoading.value = true
  plansError.value = ''
  try {
    const response = await $fetch<ApiSuccess<PlansConfig>>('/api/admin/plans')
    applyPlans(response.data)
  } catch (error) {
    plansError.value = apiErrorMessage(error, 'A csomagok betöltése nem sikerült.')
  } finally {
    plansLoading.value = false
  }
}

async function savePlans() {
  plansSaving.value = true
  plansError.value = ''
  plansMessage.value = ''
  try {
    const body = Object.fromEntries(
      PLAN_ORDER.map((id) => {
        const plan = plansForm[id]
        return [id, {
          label: plan.label.trim(),
          maxDynamicQr: Math.max(0, Math.trunc(Number(plan.maxDynamicQr) || 0)),
          analyticsDays: Math.max(1, Math.trunc(Number(plan.analyticsDays) || 30)),
          campaigns: plan.campaigns,
          expiresAt: plan.expiresAt,
          csvExport: plan.csvExport,
          apiAccess: plan.apiAccess,
          customDomain: plan.customDomain,
        }]
      }),
    )
    const response = await $fetch<ApiSuccess<PlansConfig>>('/api/admin/plans', { method: 'PATCH', body })
    applyPlans(response.data)
    plansMessage.value = 'A csomagok mentve. A változás legkésőbb 30 másodperc múlva mindenhol érvényes, build nem kell hozzá.'
    await refreshNuxtData('public-settings')
  } catch (error) {
    plansError.value = apiErrorMessage(error, 'A csomagok mentése nem sikerült.')
  } finally {
    plansSaving.value = false
  }
}

function applySettings(data: PublicSettings) {
  settingsForm.brandName = data.brandName
  settingsForm.adsense.client = data.adsense.client
  Object.assign(settingsForm.adsense.slots, data.adsense.slots)
  Object.assign(settingsForm.legal, data.legal)
  for (const item of seoPaths) {
    const override = data.seo[item.path]
    const target = seoForm[item.path]
    if (target) {
      target.title = override?.title || ''
      target.description = override?.description || ''
      target.noindex = override?.noindex || false
    }
  }
}

async function loadAll() {
  await Promise.all([loadQr(1), loadStats(), loadPlans(), loadSettings()])
}

async function loadQr(page = qrQuery.page) {
  qrLoading.value = true
  qrError.value = ''
  try {
    const params = new URLSearchParams({
      page: String(page),
      perPage: '20',
      status: qrQuery.status,
    })
    if (qrQuery.q.trim()) params.set('q', qrQuery.q.trim())
    const response = await $fetch<ApiSuccess<{ items: AdminQrListItem[]; pagination: typeof qrPagination }>>(
      `/api/admin/qr?${params.toString()}`,
    )
    qrItems.value = response.data.items
    Object.assign(qrPagination, response.data.pagination)
    qrQuery.page = response.data.pagination.page
  } catch (error) {
    qrError.value = apiErrorMessage(error, 'A QR-kódok betöltése nem sikerült.')
  } finally {
    qrLoading.value = false
  }
}

async function loadStats() {
  statsError.value = ''
  try {
    const response = await $fetch<ApiSuccess<AdminStats>>('/api/admin/stats')
    stats.value = response.data
  } catch (error) {
    statsError.value = apiErrorMessage(error, 'A statisztika betöltése nem sikerült.')
  }
}

async function loadSettings() {
  settingsLoading.value = true
  settingsError.value = ''
  try {
    const response = await $fetch<ApiSuccess<PublicSettings>>('/api/admin/settings')
    applySettings(response.data)
  } catch (error) {
    settingsError.value = apiErrorMessage(error, 'A beállítások betöltése nem sikerült.')
  } finally {
    settingsLoading.value = false
  }
}

async function saveSettings() {
  settingsSaving.value = true
  settingsError.value = ''
  settingsMessage.value = ''
  try {
    const response = await $fetch<ApiSuccess<PublicSettings>>('/api/admin/settings', {
      method: 'PATCH',
      body: {
        brandName: settingsForm.brandName,
        adsense: settingsForm.adsense,
        legal: settingsForm.legal,
      },
    })
    applySettings(response.data)
    settingsMessage.value = 'A beállítások mentve.'
    await refreshNuxtData('public-settings')
  } catch (error) {
    settingsError.value = apiErrorMessage(error, 'A beállítások mentése nem sikerült.')
  } finally {
    settingsSaving.value = false
  }
}

async function saveSeo(path: string) {
  seoError.value = ''
  seoMessage.value = ''
  seoSavingPath.value = path
  try {
    const form = seoForm[path]!
    await $fetch('/api/admin/seo', {
      method: 'PATCH',
      body: {
        path,
        title: form.title.trim(),
        description: form.description.trim(),
        noindex: form.noindex,
      },
    })
    seoMessage.value = 'A SEO beállítás mentve. Üres mezők esetén az alapértelmezett cím és leírás érvényes.'
    await refreshNuxtData('public-settings')
  } catch (error) {
    seoError.value = apiErrorMessage(error, 'A SEO beállítás mentése nem sikerült.')
  } finally {
    seoSavingPath.value = ''
  }
}

async function toggleQr(item: AdminQrListItem) {
  actionMessage.value = ''
  actionError.value = ''
  try {
    const response = await $fetch<ApiSuccess<AdminQrListItem>>(`/api/dynamic-qr/${item.shortCode}`, {
      method: 'PATCH',
      body: { isActive: !item.isActive },
    })
    const index = qrItems.value.findIndex(row => row.id === item.id)
    if (index >= 0) qrItems.value[index] = { ...response.data, ownerRef: item.ownerRef }
    actionMessage.value = response.data.isActive ? 'A QR-kód aktív.' : 'A QR-kód inaktív.'
  } catch (error) {
    actionError.value = apiErrorMessage(error, 'Az állapot módosítása nem sikerült.')
  }
}

async function deleteQr(item: AdminQrListItem) {
  actionMessage.value = ''
  actionError.value = ''
  try {
    await $fetch(`/api/dynamic-qr/${item.shortCode}`, { method: 'DELETE' })
    pendingDelete.value = null
    actionMessage.value = 'A dinamikus QR-kód törölve.'
    await loadQr(qrQuery.page)
    await loadStats()
  } catch (error) {
    actionError.value = apiErrorMessage(error, 'A törlés nem sikerült.')
  }
}

const maxDailyScans = computed(() => Math.max(1, ...(stats.value?.daily.map(point => point.scans) || [1])))

const seoPreview = (path: string) => {
  const form = seoForm[path]
  return form?.title?.trim() || 'Az oldal alapértelmezett címe érvényes'
}

onMounted(async () => {
  try {
    const response = await $fetch<ApiSuccess<AdminSession>>('/api/admin/session')
    session.value = response.data
    await loadAll()
  } catch {
    session.value = null
  } finally {
    checkingSession.value = false
  }
})
</script>

<template>
  <div>
    <div v-if="checkingSession" class="flex items-center justify-center py-20 text-sm text-ink-muted">
      <Icon name="lucide:loader-circle" class="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
      Munkamenet ellenőrzése…
    </div>

    <section v-else-if="!session" class="mx-auto max-w-md">
      <div class="card p-6 sm:p-8">
        <div class="flex items-center gap-3">
          <span class="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-white">
            <Icon name="lucide:lock-keyhole" class="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 class="text-xl">Adminisztráció</h1>
            <p class="text-xs text-ink-muted">Csak a beállított adminisztrátor férhet hozzá.</p>
          </div>
        </div>

        <form class="mt-6 space-y-4" novalidate @submit.prevent="login">
          <div>
            <label for="admin-email" class="field-label">E-mail-cím</label>
            <input
              id="admin-email"
              v-model="loginEmail"
              type="email"
              class="field-input"
              autocomplete="username"
              required
              placeholder="admin@pelda.hu"
            >
          </div>
          <div>
            <label for="admin-password" class="field-label">Jelszó</label>
            <input
              id="admin-password"
              v-model="loginPassword"
              type="password"
              class="field-input"
              autocomplete="current-password"
              required
            >
          </div>
          <p v-if="authError" class="field-error" role="alert">{{ authError }}</p>
          <button type="submit" class="btn-primary w-full" :disabled="loginPending">
            <Icon
              :name="loginPending ? 'lucide:loader-circle' : 'lucide:log-in'"
              :class="['h-4 w-4', { 'animate-spin': loginPending }]"
              aria-hidden="true"
            />
            {{ loginPending ? 'Bejelentkezés…' : 'Bejelentkezés' }}
          </button>
        </form>

        <p class="mt-5 text-xs leading-relaxed text-ink-muted">
          Az admin fiókot a telepítés során a <code class="rounded bg-slate-100 px-1 py-0.5">db:setup</code>
          szkript hozza létre. A jelszóemlékeztető nem elérhető; elfelejtett jelszó esetén a szkripttel
          állítható új jelszó.
        </p>
      </div>
    </section>

    <div v-else>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl">Adminisztráció</h1>
          <p class="mt-1 text-sm text-ink-muted">
            Bejelentkezve: <span class="font-medium text-ink-soft">{{ session.email }}</span>
          </p>
        </div>
        <button type="button" class="btn-secondary self-start" @click="logout">
          <Icon name="lucide:log-out" class="h-4 w-4" aria-hidden="true" />
          Kijelentkezés
        </button>
      </div>

      <div class="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Admin szekciók">
        <button
          v-for="tab in adminTabs"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.id"
          :tabindex="activeTab === tab.id ? 0 : -1"
          :class="[
            'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors',
            activeTab === tab.id
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-ink-muted hover:text-ink',
          ]"
          @click="activeTab = tab.id"
        >
          <Icon :name="tab.icon" class="h-4 w-4" aria-hidden="true" />
          {{ tab.label }}
        </button>
      </div>

      <div v-if="actionMessage" class="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
        {{ actionMessage }}
      </div>
      <div v-if="actionError" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
        {{ actionError }}
      </div>

      <section v-if="activeTab === 'qr'" class="mt-5" aria-labelledby="admin-qr-heading">
        <div class="card overflow-hidden">
          <div class="border-b border-slate-200 p-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="admin-qr-heading" class="text-lg">Dinamikus QR-kódok</h2>
                <p class="text-xs text-ink-muted">Összesen {{ qrPagination.total }} kód.</p>
              </div>
              <form class="flex flex-col gap-2 sm:flex-row" @submit.prevent="loadQr(1)">
                <label class="sr-only" for="admin-qr-search">Keresés</label>
                <input id="admin-qr-search" v-model="qrQuery.q" type="search" class="field-input py-2 text-sm" placeholder="Keresés cím, kód vagy URL alapján">
                <select v-model="qrQuery.status" class="field-input py-2 text-sm" aria-label="Állapot szűrése">
                  <option value="all">Minden állapot</option>
                  <option value="active">Aktív</option>
                  <option value="inactive">Inaktív</option>
                </select>
                <button type="submit" class="btn-secondary py-2">Szűrés</button>
              </form>
            </div>
          </div>

          <p v-if="qrError" class="p-4 text-sm text-red-600" role="alert">{{ qrError }}</p>

          <div class="overflow-x-auto">
            <table class="w-full min-w-[48rem] text-left text-sm">
              <thead class="bg-slate-50 text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th class="px-4 py-2.5 font-medium">Kód / cím</th>
                  <th class="px-4 py-2.5 font-medium">Cél-URL</th>
                  <th class="px-4 py-2.5 font-medium">Beolvasás</th>
                  <th class="px-4 py-2.5 font-medium">Állapot</th>
                  <th class="px-4 py-2.5 font-medium">Műveletek</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-if="qrLoading">
                  <td colspan="5" class="px-4 py-10 text-center text-ink-muted">Betöltés…</td>
                </tr>
                <tr v-else-if="!qrItems.length">
                  <td colspan="5" class="px-4 py-10 text-center text-ink-muted">Nincs megjeleníthető dinamikus QR-kód.</td>
                </tr>
                <template v-else>
                <tr v-for="item in qrItems" :key="item.id" class="align-top">
                  <td class="px-4 py-3">
                    <p class="font-mono text-xs text-ink">{{ item.shortCode }}</p>
                    <p class="mt-0.5 max-w-[14rem] truncate text-xs text-ink-muted">{{ item.title || 'Nincs megnevezés' }}</p>
                    <a :href="item.shortUrl" target="_blank" rel="noopener noreferrer" class="mt-1 inline-block text-xs text-brand-700 hover:underline">
                      Rövid link megnyitása
                    </a>
                  </td>
                  <td class="px-4 py-3">
                    <p class="max-w-[18rem] break-all text-xs text-ink-soft">{{ item.targetUrl }}</p>
                    <p class="mt-1 text-[11px] text-ink-muted">Létrehozva: {{ new Date(item.createdAt).toLocaleDateString('hu-HU') }}</p>
                  </td>
                  <td class="px-4 py-3 text-sm font-medium">{{ item.scans }}</td>
                  <td class="px-4 py-3">
                    <span
                      :class="item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'"
                      class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    >
                      {{ item.isActive ? 'Aktív' : 'Inaktív' }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex flex-wrap gap-1">
                      <button type="button" class="btn-ghost px-2 py-1 text-xs" @click="toggleQr(item)">
                        {{ item.isActive ? 'Kikapcsolás' : 'Aktiválás' }}
                      </button>
                      <template v-if="pendingDelete === item.id">
                        <button type="button" class="btn-ghost px-2 py-1 text-xs text-red-700 hover:bg-red-50" @click="deleteQr(item)">
                          Törlés megerősítése
                        </button>
                        <button type="button" class="btn-ghost px-2 py-1 text-xs" @click="pendingDelete = null">Mégsem</button>
                      </template>
                      <button
                        v-else
                        type="button"
                        class="btn-ghost px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                        @click="pendingDelete = item.id"
                      >
                        Törlés
                      </button>
                    </div>
                  </td>
                </tr>
                </template>
              </tbody>
            </table>
          </div>

          <div class="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-ink-muted">
            <span>{{ qrPagination.page }} / {{ qrPagination.totalPages }} oldal</span>
            <div class="flex gap-2">
              <button type="button" class="btn-secondary px-3 py-1.5 text-xs" :disabled="qrPagination.page <= 1" @click="loadQr(qrPagination.page - 1)">
                Előző
              </button>
              <button type="button" class="btn-secondary px-3 py-1.5 text-xs" :disabled="qrPagination.page >= qrPagination.totalPages" @click="loadQr(qrPagination.page + 1)">
                Következő
              </button>
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="activeTab === 'stats'" class="mt-5" aria-labelledby="admin-stats-heading">
        <h2 id="admin-stats-heading" class="text-lg">Statisztika</h2>
        <p class="mt-1 text-xs text-ink-muted">Szerveroldali, összesített adatok – egyéni látogatók követése nélkül.</p>

        <p v-if="statsError" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ statsError }}</p>

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
          <h3 class="text-sm font-semibold">Napi beolvasások (30 nap)</h3>
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
      </section>

      <section v-else-if="activeTab === 'plans'" class="mt-5" aria-labelledby="admin-plans-heading">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="admin-plans-heading" class="text-lg">Csomagok</h2>
            <p class="mt-1 text-xs text-ink-muted">
              A limitek és funkciókapcsolók a <code class="rounded bg-slate-100 px-1 py-0.5">settings</code> táblába kerülnek,
              ezért build és újraindítás nélkül érvényesek. A backend és a fiókfelület ugyanezt az értéket használja.
            </p>
          </div>
        </div>

        <p v-if="plansError" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ plansError }}</p>
        <p v-if="plansMessage" class="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{{ plansMessage }}</p>

        <p v-if="plansLoading" class="mt-4 text-sm text-ink-muted">Betöltés…</p>

        <form v-else class="mt-4 space-y-4" novalidate @submit.prevent="savePlans">
          <div class="grid gap-4 lg:grid-cols-3">
            <fieldset v-for="id in PLAN_ORDER" :key="id" class="card p-4">
              <legend class="sr-only">{{ plansForm[id].label }}</legend>
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-sm font-semibold text-ink">{{ plansForm[id].label }}</h3>
                <span class="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {{ id }}
                </span>
              </div>

              <div class="mt-3 space-y-3">
                <div>
                  <label :for="`plan-label-${id}`" class="field-label">Megjelenő név</label>
                  <input
                    :id="`plan-label-${id}`"
                    v-model="plansForm[id].label"
                    type="text"
                    maxlength="40"
                    class="field-input py-2 text-sm"
                    required
                  >
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label :for="`plan-max-${id}`" class="field-label">Kódlimit</label>
                    <input
                      :id="`plan-max-${id}`"
                      v-model.number="plansForm[id].maxDynamicQr"
                      type="number"
                      min="0"
                      step="1"
                      class="field-input py-2 text-sm"
                    >
                    <p class="field-help">Aktív kódokra</p>
                  </div>
                  <div>
                    <label :for="`plan-days-${id}`" class="field-label">Analitika (nap)</label>
                    <input
                      :id="`plan-days-${id}`"
                      v-model.number="plansForm[id].analyticsDays"
                      type="number"
                      min="1"
                      max="3650"
                      step="1"
                      class="field-input py-2 text-sm"
                    >
                    <p class="field-help">Visszamenőleg</p>
                  </div>
                </div>

                <div class="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                  <label
                    v-for="feature in PLAN_FEATURES"
                    :key="feature.key"
                    class="flex items-center gap-2 text-xs text-ink-soft"
                  >
                    <input
                      v-model="plansForm[id][feature.key]"
                      type="checkbox"
                      class="h-4 w-4 accent-brand-600"
                    >
                    {{ feature.label }}
                  </label>
                </div>
              </div>
            </fieldset>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button type="submit" class="btn-primary" :disabled="plansSaving">
              <Icon :name="plansSaving ? 'lucide:loader-circle' : 'lucide:save'" :class="['h-4 w-4', { 'animate-spin': plansSaving }]" aria-hidden="true" />
              {{ plansSaving ? 'Mentés…' : 'Csomagok mentése' }}
            </button>
            <p class="text-xs text-ink-muted">
              A módosítás a következő 30 másodpercben mindenhol érvényes; a felület a nyilvános beállításokból kapja.
            </p>
          </div>
        </form>
      </section>

      <section v-else-if="activeTab === 'settings'" class="mt-5" aria-labelledby="admin-settings-heading">
        <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <form class="card p-5 sm:p-6" novalidate @submit.prevent="saveSettings">
            <h2 id="admin-settings-heading" class="text-lg">Webhely beállításai</h2>
            <p class="mt-1 text-xs text-ink-muted">
              A nyilvános beállítások azonnal megjelennek az oldalon; a titkok nem itt, hanem a .env fájlban tárolódnak.
            </p>

            <div v-if="settingsLoading" class="mt-5 text-sm text-ink-muted">Betöltés…</div>

            <template v-else>
              <div class="mt-5">
                <label for="admin-brand" class="field-label">Márkanév</label>
                <input id="admin-brand" v-model="settingsForm.brandName" type="text" maxlength="80" class="field-input" required>
              </div>

              <fieldset class="mt-6">
                <legend class="text-sm font-semibold">Google AdSense</legend>
                <p class="mt-1 text-xs text-ink-muted">
                  A hirdetések csak marketing-hozzájárulás után töltődnek be. Üres azonosító esetén éles környezetben nem jelenik meg hirdetés.
                </p>
                <div class="mt-3">
                  <label for="adsense-client" class="field-label">Kliensazonosító (ca-pub-…)</label>
                  <input id="adsense-client" v-model="settingsForm.adsense.client" type="text" class="field-input font-mono text-sm" placeholder="ca-pub-1234567890123456">
                </div>
                <div class="mt-3 grid gap-3 sm:grid-cols-2">
                  <div v-for="slot in (['top', 'sidebar', 'content', 'guide', 'mobile'] as const)" :key="slot">
                    <label :for="`adsense-slot-${slot}`" class="field-label capitalize">{{ slot }} hirdetési hely</label>
                    <input
                      :id="`adsense-slot-${slot}`"
                      v-model="settingsForm.adsense.slots[slot]"
                      type="text"
                      inputmode="numeric"
                      class="field-input font-mono text-sm"
                      placeholder="1234567890"
                    >
                  </div>
                </div>
              </fieldset>

              <fieldset class="mt-6">
                <legend class="text-sm font-semibold">Jogi és szolgáltatói adatok</legend>
                <p class="mt-1 text-xs text-ink-muted">
                  Ezek az adatok jelennek meg az impresszumban, az adatvédelmi tájékoztatóban és a kapcsolat oldalon. Valós adatot adj meg.
                </p>
                <div class="mt-3 grid gap-3 sm:grid-cols-2">
                  <div class="sm:col-span-2">
                    <label for="legal-provider" class="field-label">Szolgáltató neve</label>
                    <input id="legal-provider" v-model="settingsForm.legal.providerName" type="text" maxlength="160" class="field-input">
                  </div>
                  <div class="sm:col-span-2">
                    <label for="legal-address" class="field-label">Székhely</label>
                    <input id="legal-address" v-model="settingsForm.legal.providerAddress" type="text" maxlength="240" class="field-input">
                  </div>
                  <div>
                    <label for="legal-email" class="field-label">Kapcsolattartó e-mail</label>
                    <input id="legal-email" v-model="settingsForm.legal.providerEmail" type="email" class="field-input">
                  </div>
                  <div>
                    <label for="legal-phone" class="field-label">Telefon</label>
                    <input id="legal-phone" v-model="settingsForm.legal.providerPhone" type="text" maxlength="60" class="field-input">
                  </div>
                  <div>
                    <label for="legal-tax" class="field-label">Adószám</label>
                    <input id="legal-tax" v-model="settingsForm.legal.taxNumber" type="text" maxlength="40" class="field-input">
                  </div>
                  <div>
                    <label for="legal-registry" class="field-label">Cégjegyzékszám</label>
                    <input id="legal-registry" v-model="settingsForm.legal.registryNumber" type="text" maxlength="40" class="field-input">
                  </div>
                  <div>
                    <label for="legal-hosting" class="field-label">Tárhelyszolgáltató</label>
                    <input id="legal-hosting" v-model="settingsForm.legal.hostingProvider" type="text" maxlength="160" class="field-input">
                  </div>
                  <div>
                    <label for="legal-hosting-address" class="field-label">Tárhelyszolgáltató címe</label>
                    <input id="legal-hosting-address" v-model="settingsForm.legal.hostingAddress" type="text" maxlength="240" class="field-input">
                  </div>
                </div>
              </fieldset>

              <p v-if="settingsError" class="field-error" role="alert">{{ settingsError }}</p>
              <p v-if="settingsMessage" class="mt-3 text-sm text-emerald-700" role="status">{{ settingsMessage }}</p>

              <button type="submit" class="btn-primary mt-5" :disabled="settingsSaving">
                {{ settingsSaving ? 'Mentés…' : 'Beállítások mentése' }}
              </button>
            </template>
          </form>

          <aside class="space-y-4">
            <div class="card p-5">
              <h2 class="text-sm font-semibold">Tartalomkezelés</h2>
              <p class="mt-2 text-xs leading-relaxed text-ink-soft">
                A jogi oldalak jelenleg sablonból és a fenti szolgáltatói adatokból épülnek fel. A
                beállítások mentésével az impresszum, az adatvédelmi tájékoztató és a kapcsolat oldal
                azonnal frissül.
              </p>
              <p class="mt-2 text-xs leading-relaxed text-ink-muted">
                A teljes szövegszerkesztős CMS külön fejlesztési kör; a statikus SEO-oldalak tartalma
                a projektben, verziókezelten szerkeszthető.
              </p>
            </div>
            <div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p class="text-xs font-semibold text-amber-900">Biztonsági emlékeztető</p>
              <p class="mt-1 text-xs leading-relaxed text-amber-900">
                Az AdSense- és admin titkokat soha ne írd a beállításokba vagy a forráskódba. A
                szerveroldali titkok a .env fájlban maradnak.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section v-else class="mt-5" aria-labelledby="admin-seo-heading">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="admin-seo-heading" class="text-lg">SEO metaadatok</h2>
            <p class="mt-1 text-xs text-ink-muted">
              Egyedi cím és leírás oldalanként. Az üres cím/leírás esetén az alapértelmezett érték érvényes.
            </p>
          </div>
        </div>

        <p v-if="seoError" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ seoError }}</p>
        <p v-if="seoMessage" class="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{{ seoMessage }}</p>

        <div class="mt-4 space-y-3">
          <details v-for="item in seoFields" :key="item.path" class="card overflow-hidden">
            <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span>
                <span class="block text-sm font-medium text-ink">{{ item.label }}</span>
                <span class="block text-xs text-ink-muted">{{ item.path }} – {{ seoPreview(item.path) }}</span>
              </span>
              <Icon name="lucide:chevron-down" class="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
            </summary>
            <div class="border-t border-slate-200 bg-slate-50/60 p-4">
              <div class="grid gap-3 sm:grid-cols-2">
                <div>
                  <label :for="`seo-title-${item.path}`" class="field-label">Cím (max. 70 karakter)</label>
                  <input
                    :id="`seo-title-${item.path}`"
                    v-model="item.form.title"
                    type="text"
                    maxlength="70"
                    class="field-input"
                  >
                  <p class="field-help">{{ item.form.title.length }}/70</p>
                </div>
                <div>
                  <label :for="`seo-description-${item.path}`" class="field-label">Leírás (max. 180 karakter)</label>
                  <textarea
                    :id="`seo-description-${item.path}`"
                    v-model="item.form.description"
                    rows="2"
                    maxlength="180"
                    class="field-input"
                  />
                  <p class="field-help">{{ item.form.description.length }}/180</p>
                </div>
              </div>
              <label class="mt-3 flex items-center gap-2 text-xs text-ink-soft">
                <input v-model="item.form.noindex" type="checkbox" class="h-4 w-4 accent-brand-600">
                noindex – ne indexelje a kereső
              </label>
              <button
                type="button"
                class="btn-primary mt-3 px-4 py-2 text-xs"
                :disabled="seoSavingPath === item.path"
                @click="saveSeo(item.path)"
              >
                {{ seoSavingPath === item.path ? 'Mentés…' : 'Mentés' }}
              </button>
            </div>
          </details>
        </div>
      </section>
    </div>
  </div>
</template>
