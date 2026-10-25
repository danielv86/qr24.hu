<script setup lang="ts">
import type { ApiSuccess, DynamicQrCreated, DynamicQrListItem } from '~/types/api'
import type { ContentFaq } from '~/lib/content/types'
import { DEFAULT_CUSTOMIZATION } from '~/lib/qr/customization'
import { parseHttpUrl } from '~/lib/qr/content'

const { dynamicQrEnabled } = useSiteSettings()
const { downloadQr, isDownloading, downloadError } = useQrDownload()

const FAQS: ContentFaq[] = [
  {
    question: 'Mi a különbség a statikus és a dinamikus QR-kód között?',
    answer:
      'A statikus QR-kód tartalma magában a képben van, ezért utólag nem módosítható. A dinamikus QR-kód egy rövid, saját címre mutat, és a mögötte lévő cél-URL szerveroldalon módosítható anélkül, hogy új kódot kellene nyomtatni.',
  },
  {
    question: 'Mire való a szerkesztői token?',
    answer:
      'A dinamikus QR-kód létrehozásakor kapsz egy egyszer megjelenő szerkesztői tokent. Ezzel tudod később módosítani a célt, kikapcsolni vagy törölni a kódot. A token nem kerül a böngésző tárolójába, ezért őrizd biztonságos helyen.',
  },
  {
    question: 'Milyen URL-eket fogad el a rendszer?',
    answer:
      'Csak nyilvános http:// vagy https:// címeket. A rendszer ellenőrzi a hosztnevet és a DNS-feloldást, és biztonsági okból elutasítja a helyi, belső hálózati vagy nem nyilvános címeket.',
  },
  {
    question: 'Kell fizetni a dinamikus QR-kódokért?',
    answer:
      'Ezen a telepítésen a dinamikus QR-kódok használata díjmentes, de az adatbázis beállítását igényli. A jövőben az üzemeltető prémium funkciókat vezethet be; erről külön tájékoztatást adna.',
  },
]

useContentSeo({
  slug: '/dinamikus-qr-kod',
  title: 'Dinamikus QR-kód – módosítható cél és rövid link',
  description:
    'Készíts dinamikus QR-kódot, amely saját rövid linkre mutat. A cél utólag módosítható, a kód kikapcsolható. Biztonságos URL-ellenőrzés és tokenes kezelés.',
  h1: 'Dinamikus QR-kód',
  faqs: FAQS,
})

const createForm = reactive({ targetUrl: '', title: '' })
const createError = ref('')
const fieldError = ref('')
const creating = ref(false)
const created = ref<DynamicQrCreated | null>(null)
const copyMessage = ref('')

const manage = reactive({ code: '', token: '' })
const manageError = ref('')
const manageLoading = ref(false)
const managed = ref<DynamicQrListItem | null>(null)
const editForm = reactive({ targetUrl: '', title: '', isActive: true })
const saving = ref(false)
const saveError = ref('')
const saveMessage = ref('')
const confirmDelete = ref(false)
const deleting = ref(false)

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    copyMessage.value = `${label} a vágólapra másolva.`
  } catch {
    copyMessage.value = 'A másolás nem sikerült. Jelöld ki kézzel a szöveget.'
  }
  window.setTimeout(() => {
    copyMessage.value = ''
  }, 4000)
}

async function createDynamic() {
  createError.value = ''
  fieldError.value = ''
  if (!parseHttpUrl(createForm.targetUrl)) {
    fieldError.value = 'Érvényes, nyilvános http:// vagy https:// címet adj meg.'
    return
  }
  creating.value = true
  try {
    const response = await $fetch<ApiSuccess<DynamicQrCreated>>('/api/dynamic-qr', {
      method: 'POST',
      body: {
        targetUrl: createForm.targetUrl.trim(),
        title: createForm.title.trim(),
      },
    })
    created.value = response.data
    manage.code = response.data.shortCode
    manage.token = response.data.editToken
    managed.value = response.data
    editForm.targetUrl = response.data.targetUrl
    editForm.title = response.data.title || ''
    editForm.isActive = response.data.isActive
    createForm.targetUrl = ''
    createForm.title = ''
  } catch (error) {
    createError.value = apiErrorMessage(error, 'A dinamikus QR-kód létrehozása nem sikerült.')
  } finally {
    creating.value = false
  }
}

async function loadManaged() {
  manageError.value = ''
  saveMessage.value = ''
  saveError.value = ''
  managed.value = null
  confirmDelete.value = false
  if (!/^[A-Za-z0-9_-]{6,16}$/.test(manage.code.trim())) {
    manageError.value = 'A rövid kód 6–16 karakter hosszú betűkből, számokból, kötőjelből és aláhúzásból állhat.'
    return
  }
  if (manage.token.trim().length < 20) {
    manageError.value = 'Add meg a létrehozáskor kapott szerkesztői tokent.'
    return
  }
  manageLoading.value = true
  try {
    const response = await $fetch<ApiSuccess<DynamicQrListItem>>(
      `/api/dynamic-qr/${encodeURIComponent(manage.code.trim())}`,
      { headers: { 'x-edit-token': manage.token.trim() } },
    )
    managed.value = response.data
    editForm.targetUrl = response.data.targetUrl
    editForm.title = response.data.title || ''
    editForm.isActive = response.data.isActive
  } catch (error) {
    manageError.value = apiErrorMessage(error, 'A dinamikus QR-kód betöltése nem sikerült.')
  } finally {
    manageLoading.value = false
  }
}

async function saveManaged() {
  if (!managed.value) return
  saveError.value = ''
  saveMessage.value = ''
  if (!parseHttpUrl(editForm.targetUrl)) {
    saveError.value = 'Érvényes, nyilvános http:// vagy https:// címet adj meg.'
    return
  }
  saving.value = true
  try {
    const response = await $fetch<ApiSuccess<DynamicQrListItem>>(
      `/api/dynamic-qr/${encodeURIComponent(manage.code.trim())}`,
      {
        method: 'PATCH',
        headers: { 'x-edit-token': manage.token.trim() },
        body: {
          targetUrl: editForm.targetUrl.trim(),
          title: editForm.title.trim(),
          isActive: editForm.isActive,
        },
      },
    )
    managed.value = response.data
    saveMessage.value = 'A módosítások mentve. A rövid link ugyanaz maradt.'
  } catch (error) {
    saveError.value = apiErrorMessage(error, 'A módosítás nem sikerült.')
  } finally {
    saving.value = false
  }
}

async function deleteManaged() {
  if (!managed.value) return
  deleting.value = true
  saveError.value = ''
  saveMessage.value = ''
  try {
    await $fetch(`/api/dynamic-qr/${encodeURIComponent(manage.code.trim())}`, {
      method: 'DELETE',
      headers: { 'x-edit-token': manage.token.trim() },
    })
    managed.value = null
    created.value = null
    saveMessage.value = 'A dinamikus QR-kód törölve lett.'
    confirmDelete.value = false
  } catch (error) {
    saveError.value = apiErrorMessage(error, 'A törlés nem sikerült.')
  } finally {
    deleting.value = false
  }
}

async function downloadDynamicQr() {
  if (!created.value) return
  await downloadQr('png', created.value.shortUrl, { ...DEFAULT_CUSTOMIZATION, size: 1024 }, 'dinamikus-qr')
}

function copyToken() {
  if (created.value) copyText(created.value.editToken, 'A szerkesztői token')
}
</script>

<template>
  <div>
    <section class="border-b border-slate-200/80 bg-surface">
      <div class="container-page pb-9 pt-5">
        <ContentBreadcrumbs :items="[{ label: 'Főoldal', to: '/' }, { label: 'Dinamikus QR-kód' }]" />
        <div class="mt-6 max-w-3xl">
          <span class="eyebrow">Módosítható cél</span>
          <h1 class="mt-3 text-3xl leading-tight sm:text-4xl">Dinamikus QR-kód</h1>
          <p class="mt-4 text-[1.02rem] leading-relaxed text-ink-soft">
            A dinamikus QR-kód egy saját rövid linkre mutat, amely mögött a cél-URL később is
            módosítható. Így nem kell újranyomtatnod a kódot, ha megváltozik az ajánlat, az étlap
            vagy a kampányoldal címe.
          </p>
          <p class="mt-3 text-sm leading-relaxed text-ink-muted">
            A statikus generátor továbbra is adatbázis nélkül működik. Ez az oldal a külön,
            szerveroldali dinamikus modult mutatja be.
          </p>
        </div>
      </div>
    </section>

    <div class="container-page py-8">
      <div
        v-if="!dynamicQrEnabled"
        class="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        role="status"
      >
        A dinamikus QR-kód modul ezen a telepítésen jelenleg ki van kapcsolva. A statikus generátor
        változatlanul használható.
        <NuxtLink to="/qr-kod-generator" class="font-semibold underline underline-offset-2">
          Ugrás a statikus generátorhoz
        </NuxtLink>.
      </div>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section class="card p-5 sm:p-6" aria-labelledby="create-heading">
          <h2 id="create-heading" class="text-xl">Új dinamikus QR-kód létrehozása</h2>
          <p class="mt-1.5 text-sm text-ink-muted">
            A létrehozás után a szerver ellenőrzi a célt. A rövid linkhez azonnal QR-kódot kapsz.
          </p>

          <form class="mt-5 space-y-4" novalidate @submit.prevent="createDynamic">
            <div>
              <label for="dynamic-target" class="field-label">Cél-URL <span class="text-brand-600">*</span></label>
              <input
                id="dynamic-target"
                v-model="createForm.targetUrl"
                type="url"
                class="field-input"
                placeholder="https://pelda.hu/ajanlat"
                required
                autocomplete="url"
                inputmode="url"
                :aria-invalid="fieldError ? 'true' : undefined"
                aria-describedby="dynamic-target-help"
              >
              <p id="dynamic-target-help" class="field-help">
                Nyilvános http:// vagy https:// cím. Belső hálózati címeket biztonsági okból elutasítunk.
              </p>
              <p v-if="fieldError" class="field-error" role="alert">{{ fieldError }}</p>
            </div>

            <div>
              <label for="dynamic-title" class="field-label">Megnevezés (opcionális)</label>
              <input
                id="dynamic-title"
                v-model="createForm.title"
                type="text"
                class="field-input"
                maxlength="120"
                placeholder="Például: Tavaszi kampány"
              >
              <p class="field-help">Csak a saját nyilvántartásodhoz; a nyilvános linken nem jelenik meg.</p>
            </div>

            <p v-if="createError" class="field-error" role="alert">{{ createError }}</p>

            <button type="submit" class="btn-primary w-full" :disabled="creating || !dynamicQrEnabled">
              <Icon
                :name="creating ? 'lucide:loader-circle' : 'lucide:link-2'"
                :class="['h-4 w-4', { 'animate-spin': creating }]"
                aria-hidden="true"
              />
              {{ creating ? 'Létrehozás…' : 'Dinamikus QR-kód létrehozása' }}
            </button>
          </form>

          <div v-if="created" class="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p class="flex items-center gap-1.5 text-sm font-semibold text-emerald-900">
              <Icon name="lucide:check-circle-2" class="h-4 w-4" aria-hidden="true" />
              A dinamikus QR-kód elkészült
            </p>

            <div class="mt-3">
              <label for="created-short-url" class="field-label text-emerald-900">Rövid link</label>
              <div class="flex gap-2">
                <input
                  id="created-short-url"
                  :value="created.shortUrl"
                  readonly
                  class="field-input bg-surface font-mono text-xs"
                  @focus="($event.target as HTMLInputElement).select()"
                >
                <button type="button" class="btn-secondary shrink-0 px-3" @click="copyText(created.shortUrl, 'A rövid link')">
                  <Icon name="lucide:copy" class="h-4 w-4" aria-hidden="true" />
                  <span class="sr-only">Rövid link másolása</span>
                </button>
              </div>
            </div>

            <div class="mt-3">
              <label for="created-token" class="field-label text-emerald-900">Szerkesztői token – csak egyszer látható</label>
              <div class="flex gap-2">
                <input
                  id="created-token"
                  :value="created.editToken"
                  readonly
                  class="field-input bg-surface font-mono text-xs"
                  @focus="($event.target as HTMLInputElement).select()"
                >
                <button type="button" class="btn-secondary shrink-0 px-3" @click="copyToken">
                  <Icon name="lucide:copy" class="h-4 w-4" aria-hidden="true" />
                  <span class="sr-only">Szerkesztői token másolása</span>
                </button>
              </div>
              <p class="mt-1.5 text-xs leading-relaxed text-emerald-900">
                Őrizd meg biztonságos helyen. Új oldalbetöltés után már nem jelenik meg, és a token
                nélkül a kódot nem tudod szerkeszteni.
              </p>
            </div>

            <div class="mt-4 flex justify-center">
              <QrCodeImage :data="created.shortUrl" :size="320" alt="A dinamikus QR-kód képként" />
            </div>

            <button type="button" class="btn-secondary mt-3 w-full" :disabled="isDownloading" @click="downloadDynamicQr">
              <Icon name="lucide:download" class="h-4 w-4" aria-hidden="true" />
              QR-kód letöltése PNG-ben
            </button>
            <p v-if="downloadError" class="field-error" role="alert">{{ downloadError }}</p>
          </div>

          <p v-if="copyMessage" class="mt-3 text-xs font-medium text-brand-700" role="status">{{ copyMessage }}</p>
        </section>

        <section class="card p-5 sm:p-6" aria-labelledby="manage-heading">
          <h2 id="manage-heading" class="text-xl">Meglévő kód kezelése</h2>
          <p class="mt-1.5 text-sm text-ink-muted">
            Add meg a rövid kódot és a létrehozáskor kapott szerkesztői tokent.
          </p>

          <form class="mt-5 space-y-4" novalidate @submit.prevent="loadManaged">
            <div>
              <label for="manage-code" class="field-label">Rövid kód</label>
              <input
                id="manage-code"
                v-model="manage.code"
                type="text"
                class="field-input font-mono"
                autocomplete="off"
                spellcheck="false"
                maxlength="16"
                placeholder="például: aB3dE7xK9mQ2"
              >
            </div>
            <div>
              <label for="manage-token" class="field-label">Szerkesztői token</label>
              <input
                id="manage-token"
                v-model="manage.token"
                type="password"
                class="field-input font-mono"
                autocomplete="off"
                spellcheck="false"
                placeholder="A létrehozáskor megkapott token"
              >
            </div>

            <p v-if="manageError" class="field-error" role="alert">{{ manageError }}</p>

            <button type="submit" class="btn-secondary w-full" :disabled="manageLoading || !dynamicQrEnabled">
              <Icon
                :name="manageLoading ? 'lucide:loader-circle' : 'lucide:search'"
                :class="['h-4 w-4', { 'animate-spin': manageLoading }]"
                aria-hidden="true"
              />
              {{ manageLoading ? 'Betöltés…' : 'Kód betöltése' }}
            </button>
          </form>

          <div v-if="managed" class="mt-5 border-t border-slate-200 pt-5">
            <dl class="grid grid-cols-2 gap-3 text-xs">
              <div class="col-span-2">
                <dt class="text-ink-muted">Rövid link</dt>
                <dd class="mt-0.5 break-all font-mono text-[11px] text-ink">{{ managed.shortUrl }}</dd>
              </div>
              <div>
                <dt class="text-ink-muted">Állapot</dt>
                <dd class="mt-0.5 font-medium" :class="managed.isActive ? 'text-emerald-700' : 'text-red-600'">
                  {{ managed.isActive ? 'Aktív' : 'Inaktív' }}
                </dd>
              </div>
              <div>
                <dt class="text-ink-muted">Beolvasások</dt>
                <dd class="mt-0.5 font-medium text-ink">{{ managed.scans }}</dd>
              </div>
            </dl>

            <form class="mt-4 space-y-3" novalidate @submit.prevent="saveManaged">
              <div>
                <label for="edit-target" class="field-label">Cél-URL</label>
                <input id="edit-target" v-model="editForm.targetUrl" type="url" class="field-input" required>
              </div>
              <div>
                <label for="edit-title" class="field-label">Megnevezés</label>
                <input id="edit-title" v-model="editForm.title" type="text" maxlength="120" class="field-input">
              </div>
              <label class="flex items-center gap-2 text-sm text-ink-soft">
                <input v-model="editForm.isActive" type="checkbox" class="h-4 w-4 accent-brand-600">
                Aktív (inaktív állapotban a rövid link nem irányít át)
              </label>

              <p v-if="saveError" class="field-error" role="alert">{{ saveError }}</p>
              <p v-if="saveMessage" class="text-xs font-medium text-emerald-700" role="status">{{ saveMessage }}</p>

              <button type="submit" class="btn-primary w-full" :disabled="saving">
                {{ saving ? 'Mentés…' : 'Módosítások mentése' }}
              </button>
            </form>

            <div class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
              <p class="text-xs font-semibold text-red-800">A kód törlése végleges</p>
              <p class="mt-0.5 text-xs text-red-700">A rövid link és a hozzá tartozó statisztika is törlődik.</p>
              <button
                v-if="!confirmDelete"
                type="button"
                class="btn-ghost mt-2 px-0 text-xs text-red-700 hover:bg-transparent hover:text-red-800"
                @click="confirmDelete = true"
              >
                Törlés indítása
              </button>
              <div v-else class="mt-2 flex flex-wrap gap-2">
                <button type="button" class="btn-secondary border-red-300 text-red-700" :disabled="deleting" @click="deleteManaged">
                  {{ deleting ? 'Törlés…' : 'Igen, törlöm' }}
                </button>
                <button type="button" class="btn-ghost" @click="confirmDelete = false">Mégsem</button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section class="mt-10 grid gap-4 lg:grid-cols-3" aria-label="További információ">
        <div class="card p-5">
          <h2 class="text-base font-semibold">Hogyan működik?</h2>
          <p class="mt-2 text-sm leading-relaxed text-ink-soft">
            A rövid link a saját domainre mutat, a szerver pedig a tárolt cél-URL-re irányít. A
            beolvasásokról összesített számláló készül, IP-cím nélkül.
          </p>
        </div>
        <div class="card p-5">
          <h2 class="text-base font-semibold">Biztonsági ellenőrzés</h2>
          <p class="mt-2 text-sm leading-relaxed text-ink-soft">
            A cél-URL csak http(s) lehet. A rendszer a DNS-feloldást is ellenőrzi, és elutasítja a
            belső, helyi vagy nem nyilvános hálózati címeket.
          </p>
        </div>
        <div class="card p-5">
          <h2 class="text-base font-semibold">Adatvédelem</h2>
          <p class="mt-2 text-sm leading-relaxed text-ink-soft">
            A dinamikus kódokhoz a cél-URL és az opcionális megnevezés kerül az adatbázisba. A
            statisztika napi összesítés, nem egyéni látogatókövetés.
          </p>
        </div>
      </section>

      <ContentFaqAccordion :faqs="FAQS" id="gyik" class="mt-10" />

      <p class="mt-8 text-xs leading-relaxed text-ink-muted">
        A dinamikus modul működéséhez MySQL adatbázis és beállított szerveroldali titkok szükségesek.
        Ha ezek hiányoznak, a statikus QR-kód generátor továbbra is teljes funkcionalitással működik.
      </p>
    </div>
  </div>
</template>
