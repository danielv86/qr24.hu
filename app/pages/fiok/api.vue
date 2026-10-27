<script setup lang="ts">
import type { ApiKeyCreated, ApiKeyItem, ApiSuccess } from '#shared/types/api'

definePageMeta({ layout: 'fiok', middleware: 'auth' })

useSeoMeta({
  title: 'API | QRKOD24.hu',
  description: 'API-kulcsok kezelése és a dinamikus QR-kód API dokumentációja.',
  robots: 'noindex, nofollow',
})

interface ApiKeysPayload {
  items: ApiKeyItem[]
  available: boolean
  planLabel: string
}

const request = useRequestFetch()

const { data, pending, error, refresh } = await useAsyncData<ApiKeysPayload | null>(
  'fiok-api-keys',
  async () => {
    const response = await request<ApiSuccess<ApiKeysPayload>>('/api/api-keys')
    return response.data
  },
  { default: () => null },
)

const { siteUrl } = useSiteSettings()
const apiBase = computed(() => `${siteUrl.value.replace(/\/$/, '')}/api/v1`)

const name = ref('')
const creating = ref(false)
const created = ref<ApiKeyCreated | null>(null)
const actionError = ref('')
const actionMessage = ref('')
const busyId = ref<number | null>(null)
const confirmRevoke = ref<number | null>(null)
const copied = ref('')

async function createKey() {
  if (creating.value) return
  creating.value = true
  actionError.value = ''
  actionMessage.value = ''
  try {
    const response = await $fetch<ApiSuccess<ApiKeyCreated>>('/api/api-keys', {
      method: 'POST',
      body: { name: name.value.trim() },
    })
    created.value = response.data
    name.value = ''
    await refresh()
  } catch (err) {
    actionError.value = apiErrorMessage(err, 'Az API-kulcs létrehozása nem sikerült.')
  } finally {
    creating.value = false
  }
}

async function revoke(id: number) {
  if (busyId.value) return
  busyId.value = id
  actionError.value = ''
  try {
    await $fetch(`/api/api-keys/${id}`, { method: 'DELETE' })
    confirmRevoke.value = null
    actionMessage.value = 'Az API-kulcs visszavonva. A kulccsal indított kérések innentől elutasításra kerülnek.'
    await refresh()
  } catch (err) {
    actionError.value = apiErrorMessage(err, 'A visszavonás nem sikerült.')
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
    actionError.value = 'A vágólap nem érhető el, jelöld ki kézzel a kulcsot.'
  }
}

function formatDate(value: string | null): string {
  if (!value) return '–'
  return new Date(value).toLocaleString('hu-HU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const sampleCreate = computed(() =>
  `curl -X POST ${apiBase.value}/qr \\
  -H "Authorization: Bearer <kulcs>" \\
  -H "Content-Type: application/json" \\
  -d '{"targetUrl":"https://pelda.hu/kampany","title":"Nyári kampány"}'`,
)
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink">API</h1>
        <p class="mt-1 text-sm text-ink-soft">
          Kezeld a dinamikus QR-kódjaidat saját rendszereidből, kulccsal hitelesítve.
        </p>
      </div>
      <span class="rounded-md bg-brand-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
        {{ data?.planLabel || 'Ingyenes' }} csomag
      </span>
    </div>

    <div v-if="data && !data.available" class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p class="text-sm font-semibold text-amber-900">Az API-hozzáférés az Üzleti csomag része</p>
      <p class="mt-1 text-sm text-amber-900/80">
        A csomagodban jelenleg nincs API-hozzáférés, ezért új kulcsot nem tudsz létrehozni. A csomagokat a Számlázás oldalon nézheted meg.
      </p>
      <NuxtLink to="/fiok/szamlazas" class="btn-secondary mt-3 px-3 py-2 text-xs">Csomagok megtekintése</NuxtLink>
    </div>

    <p v-if="actionMessage" class="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
      {{ actionMessage }}
    </p>
    <p v-if="actionError" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {{ actionError }}
    </p>

    <div v-if="created" class="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p class="text-sm font-semibold text-brand-900">Az új kulcs elkészült</p>
          <p class="mt-1 text-xs text-brand-900/80">
            Másold ki most – a teljes kulcsot később már nem tudjuk megmutatni, csak a visszavonás lehetőségét.
          </p>
        </div>
        <button type="button" class="btn-ghost px-2 py-1 text-xs" aria-label="Bezárás" @click="created = null">
          <Icon name="lucide:x" class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-white p-3">
        <code class="min-w-0 flex-1 break-all text-xs text-ink">{{ created.token }}</code>
        <button type="button" class="btn-secondary px-2.5 py-1.5 text-xs" @click="copy(created.token, 'new-token')">
          <Icon :name="copied === 'new-token' ? 'lucide:check' : 'lucide:copy'" class="h-3.5 w-3.5" aria-hidden="true" />
          {{ copied === 'new-token' ? 'Másolva' : 'Másolás' }}
        </button>
      </div>
    </div>

    <form
      v-if="data?.available"
      class="card mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-end"
      @submit.prevent="createKey"
    >
      <div class="flex-1">
        <label for="api-key-name" class="field-label">Új API-kulcs neve</label>
        <input
          id="api-key-name"
          v-model="name"
          class="field-input"
          maxlength="80"
          placeholder="például: webshop-integráció"
          required
        >
        <p class="field-help">Csak a saját felismerésedet segíti, a működést nem befolyásolja.</p>
      </div>
      <button type="submit" class="btn-primary px-4 py-2.5 text-sm" :disabled="creating || !name.trim()">
        <Icon :name="creating ? 'lucide:loader-circle' : 'lucide:key-round'" :class="['h-4 w-4', { 'animate-spin': creating }]" aria-hidden="true" />
        {{ creating ? 'Létrehozás…' : 'Kulcs létrehozása' }}
      </button>
    </form>

    <section class="mt-6" aria-labelledby="keys-title">
      <h2 id="keys-title" class="text-sm font-semibold text-ink">Kulcsaid</h2>

      <p v-if="pending" class="mt-3 rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-ink-muted">
        Betöltés…
      </p>
      <p v-else-if="error" class="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
        Az API-kulcsok betöltése nem sikerült.
      </p>

      <ul v-else-if="data?.items?.length" class="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        <li v-for="key in data.items" :key="key.id" class="flex flex-wrap items-center gap-3 px-4 py-3">
          <div class="min-w-0 flex-1">
            <p class="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
              {{ key.name }}
              <span
                v-if="key.revokedAt"
                class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
              >
                Visszavonva
              </span>
            </p>
            <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
              <code class="rounded bg-slate-100 px-1.5 py-0.5 text-ink-soft">{{ key.prefix }}…</code>
              <span>Létrehozva: {{ formatDate(key.createdAt) }}</span>
              <span>Utolsó használat: {{ formatDate(key.lastUsedAt) }}</span>
            </p>
          </div>

          <div v-if="!key.revokedAt" class="flex items-center gap-1">
            <template v-if="confirmRevoke === key.id">
              <button type="button" class="btn-secondary px-2.5 py-1.5 text-xs" @click="confirmRevoke = null">Mégse</button>
              <button
                type="button"
                class="btn-primary bg-red-600 px-2.5 py-1.5 text-xs hover:bg-red-700"
                :disabled="busyId === key.id"
                @click="revoke(key.id)"
              >
                Biztos visszavonás
              </button>
            </template>
            <button
              v-else
              type="button"
              class="btn-ghost px-2.5 py-1.5 text-xs text-red-600"
              @click="confirmRevoke = key.id"
            >
              <Icon name="lucide:trash-2" class="h-4 w-4" aria-hidden="true" />
              Visszavonás
            </button>
          </div>
        </li>
      </ul>

      <p v-else-if="data" class="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-ink-muted">
        Még nincs API-kulcsod.
      </p>
    </section>

    <section class="card mt-6 p-4" aria-labelledby="api-docs-title">
      <h2 id="api-docs-title" class="text-base font-semibold text-ink">API dokumentáció</h2>
      <p class="mt-1 text-xs text-ink-muted">
        A kéréseket a <code class="text-ink">Authorization: Bearer &lt;kulcs&gt;</code> fejléccel hitelesítjük.
        Válasz mindig JSON: <code class="text-ink">{ "success": true, "data": … }</code> vagy hiba esetén
        <code class="text-ink">{ "success": false, "error": { "code": …, "message": … } }</code>.
      </p>

      <div class="mt-4 space-y-3">
        <div class="rounded-lg border border-slate-200 p-3">
          <p class="text-xs font-semibold text-ink">
            <span class="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-emerald-700">GET</span>
            {{ apiBase }}/qr
          </p>
          <p class="mt-1 text-xs text-ink-soft">
            A fiókhoz tartozó dinamikus QR-kódok lapozott listája. Paraméterek: <code>page</code>, <code>perPage</code> (max. 50).
          </p>
        </div>

        <div class="rounded-lg border border-slate-200 p-3">
          <p class="text-xs font-semibold text-ink">
            <span class="rounded bg-brand-50 px-1.5 py-0.5 font-mono text-brand-700">POST</span>
            {{ apiBase }}/qr
          </p>
          <p class="mt-1 text-xs text-ink-soft">
            Új dinamikus QR-kód létrehozása. Kötelező mező: <code>targetUrl</code>; opcionális: <code>title</code>.
            A cél-URL csak nyilvános http(s) cím lehet, és a csomag limitjét a szerver ellenőrzi.
          </p>
          <pre class="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100"><code>{{ sampleCreate }}</code></pre>
        </div>

        <div class="rounded-lg border border-slate-200 p-3">
          <p class="text-xs font-semibold text-ink">Gyakori hibakódok</p>
          <ul class="mt-1.5 space-y-1 text-xs text-ink-soft">
            <li><code class="text-ink">401 unauthorized</code> – hiányzó, érvénytelen vagy visszavont kulcs.</li>
            <li><code class="text-ink">403 plan_feature_required</code> – a csomag nem tartalmaz API-hozzáférést.</li>
            <li><code class="text-ink">403 plan_limit_reached</code> – betelt a csomag dinamikus QR-kód limitje.</li>
            <li><code class="text-ink">422 validation_error</code> – hiányos vagy érvénytelen mezők.</li>
            <li><code class="text-ink">429 rate_limited</code> – túl sok kérés; a válasz <code>Retry-After</code> fejlécet is tartalmaz.</li>
          </ul>
        </div>
      </div>
    </section>

    <p class="mt-4 text-[11px] leading-relaxed text-ink-muted">
      A kulcsok csak hash formában vannak tárolva. Ha egy kulcs kiszivárgott, vonj vissza, és hozz létre újat.
      Egy fiókhoz legfeljebb 10 aktív kulcs tartozhat.
    </p>
  </div>
</template>
