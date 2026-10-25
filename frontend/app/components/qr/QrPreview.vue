<script setup lang="ts">
import { isValidHexColor } from '~/lib/qr/customization'
import { renderQrSvg } from '~/utils/qr-render'
import { QR_DOWNLOAD_FORMATS } from '~/composables/useQrDownload'
import type { QrDownloadFormat } from '~/composables/useQrDownload'

const {
  activeType,
  payload,
  isValid,
  validateNow,
  resetCurrentType,
  clearCurrentContent,
} = useQrGenerator()
const { customization, warnings, resetCustomization } = useQrCustomization()
const { downloadQr, isDownloading, downloadingFormat, downloadError } = useQrDownload()

const container = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const rendering = ref(false)
const renderError = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | undefined
let renderToken = 0

const PREVIEW_SIZE = 512

const colorsValid = computed(
  () => isValidHexColor(customization.value.bodyFill.color) && isValidHexColor(customization.value.bgColor),
)
const canDownload = computed(() => isValid.value && colorsValid.value && !isDownloading.value)

const formats = QR_DOWNLOAD_FORMATS
const primaryFormat = formats[0]!
const quickFormats = formats.filter(format => format.id !== 'png')

async function renderPreview() {
  if (!import.meta.client) return
  const token = ++renderToken
  if (!payload.value || !container.value) {
    if (container.value) container.value.innerHTML = ''
    return
  }
  rendering.value = true
  renderError.value = ''
  try {
    const svg = await renderQrSvg(payload.value, customization.value, PREVIEW_SIZE)
    if (token !== renderToken || !container.value) return
    container.value.innerHTML = svg
  } catch {
    renderError.value = 'Az előnézet frissítése nem sikerült. Próbáld újra.'
  } finally {
    if (token === renderToken) rendering.value = false
  }
}

function scheduleRender() {
  if (!import.meta.client) return
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(renderPreview, 140)
}

function onDocumentClick(event: MouseEvent) {
  if (!menuOpen.value) return
  if (panel.value && !panel.value.contains(event.target as Node)) menuOpen.value = false
}

onMounted(() => {
  renderPreview()
  document.addEventListener('click', onDocumentClick)
})

watch(
  [payload, customization],
  () => scheduleRender(),
  { deep: true },
)

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  document.removeEventListener('click', onDocumentClick)
})

async function handleDownload(format: QrDownloadFormat) {
  menuOpen.value = false
  if (!validateNow()) return
  await downloadQr(format, payload.value, customization.value, `qr-${activeType.value}`)
}

function startNewQr() {
  resetCurrentType()
  resetCustomization()
}

function resetAppearance() {
  resetCustomization()
}
</script>

<template>
  <div ref="panel" class="lg:sticky lg:top-24">
    <div class="rounded-2xl border border-slate-200 bg-surface p-4 shadow-card">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-semibold text-ink">Előnézet</h2>
        <span
          v-if="isValid"
          class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          Élő
        </span>
      </div>

      <div class="relative mx-auto mt-3 flex w-full max-w-[320px] items-center justify-center">
        <div
          ref="container"
          class="w-full [&>svg]:h-auto [&>svg]:w-full"
          :class="{ 'opacity-0': !isValid }"
          aria-hidden="true"
        />

        <div v-if="!isValid" class="absolute inset-0 grid place-items-center p-6 text-center">
          <div>
            <span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
              <Icon name="lucide:qr-code" class="h-8 w-8" aria-hidden="true" />
            </span>
            <p class="mt-3 text-sm font-medium text-ink-soft">Töltsd ki az űrlapot</p>
            <p class="mt-1 text-xs leading-relaxed text-ink-muted">
              A QR-kód az első érvényes adat megadása után azonnal megjelenik.
            </p>
          </div>
        </div>
      </div>

      <div v-if="rendering && isValid" class="sr-only" aria-live="polite">Előnézet frissítése…</div>
      <p v-if="renderError" class="field-error justify-center" role="alert">{{ renderError }}</p>

      <div class="relative mt-4">
        <div class="flex">
          <button
            type="button"
            class="btn-primary flex-1 rounded-r-none px-4 py-3"
            :disabled="!canDownload"
            @click="handleDownload('png')"
          >
            <Icon
              :name="isDownloading && downloadingFormat === 'png' ? 'lucide:loader-circle' : 'lucide:download'"
              :class="['h-4 w-4', { 'animate-spin': isDownloading && downloadingFormat === 'png' }]"
              aria-hidden="true"
            />
            {{ isDownloading && downloadingFormat === 'png' ? 'Letöltés…' : 'Letöltés (PNG)' }}
          </button>
          <button
            type="button"
            class="btn-primary w-11 rounded-l-none border-l border-white/30 px-0"
            aria-label="További letöltési formátumok"
            aria-haspopup="menu"
            :aria-expanded="menuOpen"
            :disabled="!canDownload"
            @click="menuOpen = !menuOpen"
          >
            <Icon name="lucide:chevron-down" :class="['h-4 w-4 transition-transform', { 'rotate-180': menuOpen }]" aria-hidden="true" />
          </button>
        </div>

        <div
          v-if="menuOpen"
          class="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-surface py-1 shadow-lift"
          role="menu"
        >
          <button
            v-for="format in formats"
            :key="`menu-format-${format.id}`"
            type="button"
            role="menuitem"
            class="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-slate-50"
            @click="handleDownload(format.id)"
          >
            <Icon :name="format.icon" class="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <span>
              <span class="block text-sm font-medium text-ink">Letöltés {{ format.label }} formátumban</span>
              <span class="block text-[11px] text-ink-muted">{{ format.hint }}</span>
            </span>
          </button>
        </div>
      </div>

      <div class="mt-2 grid grid-cols-4 gap-2">
        <button
          v-for="format in quickFormats"
          :key="`quick-${format.id}`"
          type="button"
          class="btn-secondary justify-center px-1.5 py-2 text-xs"
          :title="format.hint"
          :disabled="!canDownload"
          @click="handleDownload(format.id)"
        >
          <Icon
            :name="isDownloading && downloadingFormat === format.id ? 'lucide:loader-circle' : format.icon"
            :class="['h-3.5 w-3.5', { 'animate-spin': isDownloading && downloadingFormat === format.id }]"
            aria-hidden="true"
          />
          {{ format.label }}
        </button>
      </div>

      <p v-if="!colorsValid" class="field-error" role="alert">
        A letöltéshez érvényes #RRGGBB színkódokat adj meg.
      </p>
      <p v-if="downloadError" class="field-error" role="alert">{{ downloadError }}</p>

      <p class="mt-3 text-center text-[11px] leading-relaxed text-ink-muted">
        A fájl a böngésződben készül, az adatok nem hagyják el az eszközödet.
      </p>
    </div>

    <div
      v-if="warnings.length"
      class="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3"
      role="status"
    >
      <p class="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
        <Icon name="lucide:triangle-alert" class="h-4 w-4" aria-hidden="true" />
        A beolvashatóság ellenőrzése
      </p>
      <ul class="mt-1.5 space-y-1 text-xs leading-relaxed text-amber-900">
        <li v-for="warning in warnings" :key="warning" class="flex gap-1.5">
          <span aria-hidden="true">•</span>
          <span>{{ warning }}</span>
        </li>
      </ul>
    </div>

    <div class="mt-3 flex flex-wrap justify-center gap-1">
      <button type="button" class="btn-ghost px-2.5 py-1.5 text-xs" @click="startNewQr">
        <Icon name="lucide:rotate-ccw" class="h-3.5 w-3.5" aria-hidden="true" />
        Új QR-kód
      </button>
      <button type="button" class="btn-ghost px-2.5 py-1.5 text-xs" @click="clearCurrentContent">
        <Icon name="lucide:eraser" class="h-3.5 w-3.5" aria-hidden="true" />
        Tartalom törlése
      </button>
      <button type="button" class="btn-ghost px-2.5 py-1.5 text-xs" @click="resetAppearance">
        <Icon name="lucide:sparkles" class="h-3.5 w-3.5" aria-hidden="true" />
        Minta visszaállítása
      </button>
    </div>
  </div>
</template>
