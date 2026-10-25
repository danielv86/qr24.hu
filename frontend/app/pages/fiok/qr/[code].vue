<script setup lang="ts">
import type {
  ApiSuccess,
  QrAnalytics,
  UserDynamicQrItem,
} from '#shared/types/api'
import { DYNAMIC_QR_STATUS_LABELS } from '#shared/qr/dynamic'
import { DEFAULT_CUSTOMIZATION } from '#shared/qr/customization'
import { downloadDynamicQr } from '~/utils/qr-download'

definePageMeta({ layout: 'fiok', middleware: 'auth' })

useSeoMeta({
  title: 'QR-kód részletei | QR24.hu',
  description: 'Dinamikus QR-kód szerkesztése és beolvasási statisztikái.',
  robots: 'noindex, nofollow',
})

const route = useRoute()
const request = useRequestFetch()
const code = String(route.params.code || '')

const { data: qr, error: loadError, refresh: refreshQr } = await useAsyncData<UserDynamicQrItem | null>(
  `qr-detail-${code}`,
  async () => {
    const response = await request<ApiSuccess<UserDynamicQrItem>>(`/api/dynamic-qr/${code}/detail`)
    return response.data
  },
  { default: () => null },
)

const days = ref(30)
const { data: analytics, pending: analyticsPending, refresh: refreshAnalytics } = await useAsyncData<QrAnalytics | null>(
  `qr-analytics-${code}`,
  async () => {
    const response = await request<ApiSuccess<QrAnalytics>>(`/api/dynamic-qr/${code}/analytics`, { query: { days: days.value } })
    return response.data
  },
  { watch: [days], default: () => null },
)

const form = reactive({
  name: '',
  targetUrl: '',
  description: '',
  category: '',
  campaign: '',
  expiresAt: '',
})

watchEffect(() => {
  if (!qr.value) return
  form.name = qr.value.name || ''
  form.targetUrl = qr.value.targetUrl
  form.description = qr.value.description || ''
  form.category = qr.value.category || ''
  form.campaign = qr.value.campaign || ''
  form.expiresAt = qr.value.expiresAt ? new Date(qr.value.expiresAt).toISOString().slice(0, 16) : ''
})

const saving = ref(false)
const saveMessage = ref('')
const saveError = ref('')

async function save() {
  if (saving.value || !qr.value) return
  saving.value = true
  saveError.value = ''
  saveMessage.value = ''
  try {
    await $fetch(`/api/dynamic-qr/${code}`, {
      method: 'PATCH',
      body: {
        title: form.name,
        targetUrl: form.targetUrl.trim(),
        description: form.description,
        category: form.category,
        campaign: form.campaign,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      },
    })
    saveMessage.value = 'A módosítások mentve. A rövid cím nem változott, a kinyomtatott QR-kód továbbra is működik.'
    await Promise.all([refreshQr(), refreshAnalytics()])
  } catch (error) {
    saveError.value = apiErrorMessage(error, 'A mentés nem sikerült.')
  } finally {
    saving.value = false
  }
}

const busy = ref(false)
async function changeStatus(action: 'pause' | 'activate' | 'archive') {
  busy.value = true
  saveError.value = ''
  try {
    await $fetch(`/api/dynamic-qr/${code}/${action}`, { method: 'POST', body: {} })
    saveMessage.value = action === 'pause' ? 'A QR-kód szüneteltetve.' : action === 'activate' ? 'A QR-kód aktív.' : 'A QR-kód archiválva.'
    await refreshQr()
  } catch (error) {
    saveError.value = apiErrorMessage(error, 'A művelet nem sikerült.')
  } finally {
    busy.value = false
  }
}

const copied = ref(false)
async function copyUrl() {
  if (!qr.value) return
  try {
    await navigator.clipboard.writeText(qr.value.shortUrl)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    saveError.value = 'A vágólap nem érhető el.'
  }
}

const downloading = ref('')
async function download(format: 'png' | 'svg') {
  if (!qr.value) return
  downloading.value = format
  saveError.value = ''
  try {
    await downloadDynamicQr(qr.value.shortUrl, qr.value.name || qr.value.shortCode, format)
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : 'A letöltés nem sikerült.'
  } finally {
    downloading.value = ''
  }
}

const maxDaily = computed(() => Math.max(1, ...(analytics.value?.daily.map(point => point.scans) || [1])))
const hasAnalytics = computed(() => (analytics.value?.total || 0) > 0)
const styles = {
  dotStyle: DEFAULT_CUSTOMIZATION.dotStyle,
  cornerSquareStyle: DEFAULT_CUSTOMIZATION.cornerSquareStyle,
  cornerDotStyle: DEFAULT_CUSTOMIZATION.cornerDotStyle,
  color: DEFAULT_CUSTOMIZATION.bodyFill.color,
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '–'
  return new Date(value).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div>
    <NuxtLink to="/fiok" class="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-brand-700">
      <Icon name="lucide:arrow-left" class="h-4 w-4" aria-hidden="true" />
      Vissza a QR-kódjaimhoz
    </NuxtLink>

    <p v-if="loadError || !qr" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
      A QR-kód nem található, vagy nem a te fiókodhoz tartozik.
    </p>

    <template v-else>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <h1 class="text-2xl font-bold tracking-tight text-ink">{{ qr.name || 'Névtelen QR-kód' }}</h1>
        <span
          :class="[
            'rounded-full px-2.5 py-1 text-xs font-semibold',
            qr.status === 'active' ? 'bg-emerald-50 text-emerald-700'
            : qr.status === 'paused' ? 'bg-amber-50 text-amber-700'
            : qr.status === 'expired' ? 'bg-red-50 text-red-700'
            : 'bg-slate-100 text-slate-600',
          ]"
        >
          {{ DYNAMIC_QR_STATUS_LABELS[qr.status] }}
        </span>
      </div>

      <p v-if="saveMessage" class="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{{ saveMessage }}</p>
      <p v-if="saveError" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ saveError }}</p>

      <div class="mt-4 grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div class="space-y-4">
          <div class="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <div class="mx-auto w-44 rounded-lg border border-slate-200 p-2">
              <QrMiniCode
                :dot-style="styles.dotStyle"
                :corner-square-style="styles.cornerSquareStyle"
                :corner-dot-style="styles.cornerDotStyle"
                :color="styles.color"
                :data="qr.shortUrl"
                class="h-full w-full"
              />
            </div>
            <p class="mt-3 break-all text-xs text-ink-soft">{{ qr.shortUrl }}</p>
            <div class="mt-3 flex flex-wrap justify-center gap-2">
              <button type="button" class="btn-secondary px-2.5 py-1.5 text-xs" @click="copyUrl">
                <Icon :name="copied ? 'lucide:check' : 'lucide:copy'" class="h-3.5 w-3.5" aria-hidden="true" />
                {{ copied ? 'Másolva' : 'Cím másolása' }}
              </button>
              <button type="button" class="btn-secondary px-2.5 py-1.5 text-xs" :disabled="downloading === 'png'" @click="download('png')">
                <Icon name="lucide:download" class="h-3.5 w-3.5" aria-hidden="true" />
                PNG
              </button>
              <button type="button" class="btn-secondary px-2.5 py-1.5 text-xs" :disabled="downloading === 'svg'" @click="download('svg')">
                <Icon name="lucide:file-code-2" class="h-3.5 w-3.5" aria-hidden="true" />
                SVG
              </button>
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <h2 class="text-sm font-semibold text-ink">Állapot</h2>
            <p class="mt-1 text-xs leading-relaxed text-ink-muted">
              Szüneteltetéskor és archiváláskor a beolvasó állapotoldalt lát, nem a régi célt. A rövid cím és a nyomtatott kód nem változik.
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <button v-if="qr.status === 'active'" type="button" class="btn-secondary px-2.5 py-1.5 text-xs" :disabled="busy" @click="changeStatus('pause')">
                <Icon name="lucide:pause" class="h-3.5 w-3.5" aria-hidden="true" /> Szüneteltetés
              </button>
              <button v-else-if="qr.status !== 'archived'" type="button" class="btn-primary px-2.5 py-1.5 text-xs" :disabled="busy" @click="changeStatus('activate')">
                <Icon name="lucide:play" class="h-3.5 w-3.5" aria-hidden="true" /> Újraaktiválás
              </button>
              <button v-if="qr.status !== 'archived'" type="button" class="btn-ghost px-2.5 py-1.5 text-xs" :disabled="busy" @click="changeStatus('archive')">
                <Icon name="lucide:archive" class="h-3.5 w-3.5" aria-hidden="true" /> Archiválás
              </button>
            </div>
            <dl class="mt-4 space-y-1.5 text-xs text-ink-muted">
              <div class="flex justify-between gap-2"><dt>Rövid kód</dt><dd class="font-medium text-ink">{{ qr.shortCode }}</dd></div>
              <div class="flex justify-between gap-2"><dt>Létrehozva</dt><dd>{{ formatDate(qr.createdAt) }}</dd></div>
              <div class="flex justify-between gap-2"><dt>Lejár</dt><dd>{{ formatDate(qr.expiresAt) }}</dd></div>
              <div class="flex justify-between gap-2"><dt>Utolsó beolvasás</dt><dd>{{ formatDate(qr.lastScanAt) }}</dd></div>
            </dl>
          </div>
        </div>

        <div class="space-y-4">
          <form class="rounded-xl border border-slate-200 bg-white p-4" @submit.prevent="save">
            <h2 class="text-base font-semibold text-ink">Cél-URL módosítása</h2>
            <p class="mt-1 text-xs text-ink-muted">A QR-kód ugyanaz marad, csak az irányítás célja változik. A módosítás naplóba kerül.</p>

            <div class="mt-3 space-y-3">
              <div>
                <label for="edit-name" class="field-label">Név</label>
                <input id="edit-name" v-model="form.name" class="field-input" maxlength="120">
              </div>
              <div>
                <label for="edit-target" class="field-label">Cél-URL</label>
                <input id="edit-target" v-model="form.targetUrl" class="field-input" type="url" required>
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                <div>
                  <label for="edit-category" class="field-label">Kategória</label>
                  <input id="edit-category" v-model="form.category" class="field-input" maxlength="60">
                </div>
                <div>
                  <label for="edit-campaign" class="field-label">Kampány</label>
                  <input id="edit-campaign" v-model="form.campaign" class="field-input" maxlength="60">
                </div>
              </div>
              <div>
                <label for="edit-description" class="field-label">Leírás</label>
                <textarea id="edit-description" v-model="form.description" class="field-input" rows="2" maxlength="500" />
              </div>
              <div>
                <label for="edit-expiry" class="field-label">Lejárat</label>
                <input id="edit-expiry" v-model="form.expiresAt" class="field-input" type="datetime-local">
              </div>
            </div>

            <div class="mt-4 flex justify-end">
              <button type="submit" class="btn-primary" :disabled="saving">
                <Icon :name="saving ? 'lucide:loader-circle' : 'lucide:save'" :class="['h-4 w-4', { 'animate-spin': saving }]" aria-hidden="true" />
                {{ saving ? 'Mentés…' : 'Módosítások mentése' }}
              </button>
            </div>
          </form>

          <section class="rounded-xl border border-slate-200 bg-white p-4" aria-labelledby="analytics-title">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 id="analytics-title" class="text-base font-semibold text-ink">Beolvasási statisztikák</h2>
              <div class="flex gap-1" role="group" aria-label="Időtartomány">
                <button
                  v-for="option in [{ v: 7, l: '7 nap' }, { v: 30, l: '30 nap' }, { v: 90, l: '90 nap' }]"
                  :key="option.v"
                  type="button"
                  :class="['rounded-full px-2.5 py-1 text-xs font-medium', days === option.v ? 'bg-brand-600 text-white' : 'bg-slate-100 text-ink-soft']"
                  @click="days = option.v"
                >
                  {{ option.l }}
                </button>
              </div>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="text-[11px] text-ink-muted">Összes</p>
                <p class="text-xl font-semibold text-ink">{{ analytics?.total ?? 0 }}</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="text-[11px] text-ink-muted">Emberi</p>
                <p class="text-xl font-semibold text-emerald-600">{{ analytics?.humanTotal ?? 0 }}</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="text-[11px] text-ink-muted">Bot / előnézet</p>
                <p class="text-xl font-semibold text-ink-muted">{{ analytics?.botTotal ?? 0 }}</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="text-[11px] text-ink-muted">Utolsó beolvasás</p>
                <p class="text-xs font-medium text-ink">{{ formatDate(qr.lastScanAt) }}</p>
              </div>
            </div>

            <p v-if="analyticsPending" class="mt-4 text-xs text-ink-muted">Betöltés…</p>
            <div v-else-if="hasAnalytics" class="mt-4">
              <div class="flex h-32 items-end gap-[2px]" role="img" :aria-label="`Napi beolvasások, ${days} nap`">
                <span
                  v-for="point in analytics?.daily || []"
                  :key="point.day"
                  class="flex-1 rounded-t bg-brand-500/80"
                  :style="{ height: `${Math.max(3, Math.round((point.scans / maxDaily) * 100))}%` }"
                  :title="`${point.day}: ${point.scans}`"
                />
              </div>
              <p class="mt-1 text-[10px] text-ink-muted">Napi beolvasások · a magasság a legforgalmasabb naphoz igazodik</p>

              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <h3 class="text-xs font-semibold text-ink">Eszközök</h3>
                  <ul class="mt-1.5 space-y-1 text-xs text-ink-soft">
                    <li v-for="device in analytics?.devices || []" :key="device.label" class="flex justify-between gap-2">
                      <span>{{ device.label }}</span><span class="font-medium text-ink">{{ device.count }}</span>
                    </li>
                    <li v-if="!(analytics?.devices || []).length" class="text-ink-muted">Nincs adat</li>
                  </ul>
                </div>
                <div>
                  <h3 class="text-xs font-semibold text-ink">Böngészők</h3>
                  <ul class="mt-1.5 space-y-1 text-xs text-ink-soft">
                    <li v-for="browser in analytics?.browsers || []" :key="browser.label" class="flex justify-between gap-2">
                      <span>{{ browser.label }}</span><span class="font-medium text-ink">{{ browser.count }}</span>
                    </li>
                    <li v-if="!(analytics?.browsers || []).length" class="text-ink-muted">Nincs adat</li>
                  </ul>
                </div>
              </div>
              <p class="mt-3 text-[10px] leading-relaxed text-ink-muted">
                A statisztika beolvasási eseményeket számol, nem egyedi személyeket. IP-címet és teljes user-agentet nem tárolunk; a botokat a user-agent alapján szűrjük.
              </p>
            </div>
            <p v-else class="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-ink-muted">
              Ebben az időszakban még nincs beolvasás. Oszd meg a kódot, vagy nyomtasd ki – az első beolvasás után itt jelennek meg az adatok.
            </p>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>
