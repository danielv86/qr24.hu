<script setup lang="ts">
import type { ApiSuccess, CustomDomainItem } from '#shared/types/api'

definePageMeta({ layout: 'fiok', middleware: 'auth' })

useSeoMeta({
  title: 'Domainek | QRKOD24.hu',
  description: 'Saját domain hozzárendelése a dinamikus QR-kódokhoz.',
  robots: 'noindex, nofollow',
})

interface DomainsPayload {
  items: CustomDomainItem[]
  available: boolean
  planLabel: string
  limit: number
}

const request = useRequestFetch()

const { data, pending, error, refresh } = await useAsyncData<DomainsPayload | null>(
  'fiok-domains',
  async () => {
    const response = await request<ApiSuccess<DomainsPayload>>('/api/domains')
    return response.data
  },
  { default: () => null },
)

const { siteUrl } = useSiteSettings()
const cnameTarget = computed(() => {
  try {
    return new URL(siteUrl.value).hostname
  } catch {
    return 'qrkod24.hu'
  }
})

const host = ref('')
const adding = ref(false)
const actionError = ref('')
const actionMessage = ref('')
const busyId = ref<number | null>(null)
const confirmDelete = ref<number | null>(null)
const copied = ref('')

async function addDomain() {
  if (adding.value) return
  adding.value = true
  actionError.value = ''
  actionMessage.value = ''
  try {
    const response = await $fetch<ApiSuccess<CustomDomainItem>>('/api/domains', {
      method: 'POST',
      body: { host: host.value.trim() },
    })
    host.value = ''
    actionMessage.value = `A(z) ${response.data.host} hozzáadva. Hozd létre a DNS TXT rekordot, majd ellenőrizd.`
    await refresh()
  } catch (err) {
    actionError.value = apiErrorMessage(err, 'A domain hozzáadása nem sikerült.')
  } finally {
    adding.value = false
  }
}

async function verify(domain: CustomDomainItem) {
  if (busyId.value) return
  busyId.value = domain.id
  actionError.value = ''
  actionMessage.value = ''
  try {
    await $fetch(`/api/domains/${domain.id}/verify`, { method: 'POST', body: {} })
    actionMessage.value = `A(z) ${domain.host} hitelesítve. A rövid linkek innentől ezen a domainen is működnek.`
    await refresh()
  } catch (err) {
    actionError.value = apiErrorMessage(err, 'A domain ellenőrzése nem sikerült.')
  } finally {
    busyId.value = null
  }
}

async function remove(id: number) {
  if (busyId.value) return
  busyId.value = id
  actionError.value = ''
  try {
    await $fetch(`/api/domains/${id}`, { method: 'DELETE' })
    confirmDelete.value = null
    actionMessage.value = 'A domain eltávolítva.'
    await refresh()
  } catch (err) {
    actionError.value = apiErrorMessage(err, 'Az eltávolítás nem sikerült.')
  } finally {
    busyId.value = null
  }
}

async function copy(value: string, key: string) {
  try {
    await navigator.clipboard.writeText(value)
    copied.value = key
    setTimeout(() => { if (copied.value === key) copied.value = '' }, 2000)
  } catch {
    actionError.value = 'A vágólap nem érhető el, jelöld ki kézzel az értéket.'
  }
}

function formatDate(value: string | null): string {
  if (!value) return '–'
  return new Date(value).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink">Domainek</h1>
        <p class="mt-1 text-sm text-ink-soft">
          Rendeld a saját domained a dinamikus QR-kódjaidhoz, hogy a rövid linkek saját címen is működjenek.
        </p>
      </div>
      <span class="rounded-md bg-brand-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
        {{ data?.planLabel || 'Ingyenes' }} csomag
      </span>
    </div>

    <div v-if="data && !data.available" class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p class="text-sm font-semibold text-amber-900">A saját domain az Üzleti csomag része</p>
      <p class="mt-1 text-sm text-amber-900/80">
        A csomagodban jelenleg nincs domain-hozzáférés. A csomagok és a limitek a Számlázás oldalon láthatók.
      </p>
      <NuxtLink to="/fiok/szamlazas" class="btn-secondary mt-3 px-3 py-2 text-xs">Csomagok megtekintése</NuxtLink>
    </div>

    <p v-if="actionMessage" class="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
      {{ actionMessage }}
    </p>
    <p v-if="actionError" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {{ actionError }}
    </p>

    <form
      v-if="data?.available"
      class="card mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-end"
      @submit.prevent="addDomain"
    >
      <div class="flex-1">
        <label for="domain-host" class="field-label">Új domain</label>
        <input
          id="domain-host"
          v-model="host"
          class="field-input"
          placeholder="peldaul: go.sajatbrand.hu"
          autocomplete="off"
          required
        >
        <p class="field-help">Csak a domain nevét add meg, protokoll és elérési út nélkül.</p>
      </div>
      <button type="submit" class="btn-primary px-4 py-2.5 text-sm" :disabled="adding || !host.trim()">
        <Icon :name="adding ? 'lucide:loader-circle' : 'lucide:plus'" :class="['h-4 w-4', { 'animate-spin': adding }]" aria-hidden="true" />
        {{ adding ? 'Hozzáadás…' : 'Hozzáadás' }}
      </button>
    </form>

    <p v-if="pending" class="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-ink-muted">
      Betöltés…
    </p>
    <p v-else-if="error" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
      A domainek betöltése nem sikerült.
    </p>

    <div v-else-if="data?.items?.length" class="mt-4 space-y-3">
      <article v-for="domain in data.items" :key="domain.id" class="card p-4">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="min-w-0">
            <h2 class="flex flex-wrap items-center gap-2 text-base font-semibold text-ink">
              {{ domain.host }}
              <span
                :class="[
                  'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  domain.status === 'verified' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
                ]"
              >
                {{ domain.status === 'verified' ? 'Hitelesítve' : 'Hitelesítésre vár' }}
              </span>
            </h2>
            <p class="mt-1 text-xs text-ink-muted">
              Hozzáadva: {{ formatDate(domain.createdAt) }}
              <template v-if="domain.verifiedAt"> · Hitelesítve: {{ formatDate(domain.verifiedAt) }}</template>
            </p>
          </div>

          <div v-if="confirmDelete === domain.id" class="flex items-center gap-1">
            <button type="button" class="btn-secondary px-2.5 py-1.5 text-xs" @click="confirmDelete = null">Mégse</button>
            <button
              type="button"
              class="btn-primary bg-red-600 px-2.5 py-1.5 text-xs hover:bg-red-700"
              :disabled="busyId === domain.id"
              @click="remove(domain.id)"
            >
              Biztos törlés
            </button>
          </div>
          <button
            v-else
            type="button"
            class="btn-ghost px-2 py-1.5 text-xs text-red-600"
            title="Domain eltávolítása"
            @click="confirmDelete = domain.id"
          >
            <Icon name="lucide:trash-2" class="h-4 w-4" aria-hidden="true" />
            <span class="sr-only">Törlés</span>
          </button>
        </div>

        <div v-if="domain.status === 'verified'" class="mt-3 rounded-lg bg-slate-50 p-3">
          <p class="text-xs font-medium text-ink">Rövid linkek ezen a domainen</p>
          <div class="mt-1 flex flex-wrap items-center gap-2">
            <code class="break-all text-xs text-ink-soft">{{ domain.shortUrlBase }}</code>
            <button type="button" class="btn-ghost px-1.5 py-1 text-[11px]" @click="copy(domain.shortUrlBase, `base-${domain.id}`)">
              <Icon :name="copied === `base-${domain.id}` ? 'lucide:check' : 'lucide:copy'" class="h-3.5 w-3.5" aria-hidden="true" />
              {{ copied === `base-${domain.id}` ? 'Másolva' : 'Másolás' }}
            </button>
          </div>
        </div>

        <div v-else class="mt-3 space-y-3">
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p class="text-xs font-semibold text-ink">1. TXT rekord a tulajdonjog igazolásához</p>
            <dl class="mt-2 grid gap-2 text-xs sm:grid-cols-[8rem_minmax(0,1fr)]">
              <dt class="text-ink-muted">Név</dt>
              <dd class="flex flex-wrap items-center gap-2">
                <code class="break-all text-ink">{{ domain.verificationName }}</code>
                <button type="button" class="btn-ghost px-1.5 py-1 text-[11px]" @click="copy(domain.verificationName, `name-${domain.id}`)">
                  <Icon :name="copied === `name-${domain.id}` ? 'lucide:check' : 'lucide:copy'" class="h-3.5 w-3.5" aria-hidden="true" />
                  <span class="sr-only">Név másolása</span>
                </button>
              </dd>
              <dt class="text-ink-muted">Típus</dt>
              <dd><code class="text-ink">TXT</code></dd>
              <dt class="text-ink-muted">Érték</dt>
              <dd class="flex flex-wrap items-center gap-2">
                <code class="break-all text-ink">{{ domain.verificationValue }}</code>
                <button type="button" class="btn-ghost px-1.5 py-1 text-[11px]" @click="copy(domain.verificationValue, `value-${domain.id}`)">
                  <Icon :name="copied === `value-${domain.id}` ? 'lucide:check' : 'lucide:copy'" class="h-3.5 w-3.5" aria-hidden="true" />
                  <span class="sr-only">Érték másolása</span>
                </button>
              </dd>
            </dl>
          </div>

          <div class="rounded-lg border border-slate-200 bg-white p-3">
            <p class="text-xs font-semibold text-ink">2. A domain irányítása a szolgáltatásra</p>
            <p class="mt-1 text-xs text-ink-soft">
              Vegyél fel egy <code class="text-ink">CNAME</code> rekordot a domainre, amely a
              <code class="text-ink">{{ cnameTarget }}</code> címre mutat. Ha gyökérdomaint használsz, a szolgáltatód
              A/ALIAS rekordját állítsd be ugyanerre a célra.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button type="button" class="btn-primary px-3 py-2 text-xs" :disabled="busyId === domain.id" @click="verify(domain)">
              <Icon
                :name="busyId === domain.id ? 'lucide:loader-circle' : 'lucide:shield-check'"
                :class="['h-4 w-4', { 'animate-spin': busyId === domain.id }]"
                aria-hidden="true"
              />
              {{ busyId === domain.id ? 'Ellenőrzés…' : 'Hitelesítés ellenőrzése' }}
            </button>
            <span class="text-[11px] text-ink-muted">
              Utolsó ellenőrzés: {{ formatDate(domain.lastCheckedAt) }}
            </span>
          </div>
        </div>
      </article>
    </div>

    <div v-else-if="data" class="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <span class="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
        <Icon name="lucide:globe" class="h-6 w-6" aria-hidden="true" />
      </span>
      <p class="mt-3 text-sm font-semibold text-ink">Még nincs saját domained</p>
      <p class="mx-auto mt-1 max-w-md text-sm text-ink-soft">
        A saját domain erősebb márkajelenést ad: a rövid linkjeid a te címeden lesznek, például
        <code class="text-ink">https://link.sajatbrand.hu/go/abc123</code>.
      </p>
    </div>

    <p class="mt-4 text-[11px] leading-relaxed text-ink-muted">
      A domain hitelesítése egy TXT rekorddal történik, ezért a domain DNS-kezeléséhez nem kell hozzáférést adnod.
      A bejegyzések érvényesülése a névszerverek beállításaitól függően akár néhány órát is igénybe vehet.
      Legfeljebb {{ data?.limit ?? 10 }} domain rendelhető egy fiókhoz.
    </p>
  </div>
</template>
