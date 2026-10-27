<script setup lang="ts">
import { ERROR_LEVEL_OPTIONS, isValidHexColor } from '~/lib/qr/customization'
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
const { customization, warnings, resetCustomization, update } = useQrCustomization()
const { downloadQr, isDownloading, downloadingFormat, downloadError } = useQrDownload()

const container = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const rendering = ref(false)
const renderError = ref('')
const showLarge = ref(false)
const largeImage = ref('')
const largeButton = ref<HTMLButtonElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
let debounceTimer: ReturnType<typeof setTimeout> | undefined
let renderToken = 0

const PREVIEW_SIZE = 512

const colorsValid = computed(() => {
  const { bgColor, bodyFill } = customization.value
  return (
    isValidHexColor(bodyFill.color)
    && isValidHexColor(bgColor)
    && (bodyFill.kind === 'solid' || isValidHexColor(bodyFill.color2))
  )
})
const canDownload = computed(() => isValid.value && colorsValid.value && !isDownloading.value)

const formats = QR_DOWNLOAD_FORMATS
const quickFormats = formats.filter(format => format.id !== 'png')

/** Hibajavítási szint csúszkához (L / M / Q / H). */
const errorIndex = computed(() => {
  const index = ERROR_LEVEL_OPTIONS.findIndex(option => option.value === customization.value.errorCorrection)
  return index < 0 ? 0 : index
})
const errorLabel = computed(() => ERROR_LEVEL_OPTIONS[errorIndex.value]?.label.split(' (')[0] ?? '')

function setErrorLevel(index: number) {
  const option = ERROR_LEVEL_OPTIONS[index]
  if (option) update('errorCorrection', option.value)
}

async function renderPreview() {
  if (!import.meta.client) return
  const token = ++renderToken
  if (!payload.value) {
    if (container.value) container.value.innerHTML = ''
    return
  }
  // A QR-tároló csak érvényes tartalomnál létezik, ezért a DOM-frissítésre várunk.
  await nextTick()
  if (!container.value) return
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

/** A kis előnézet SVG-jét nagyítja fel a modálban – vektor, ezért éles marad. */
function openLarge() {
  if (!isValid.value || !container.value) return
  largeImage.value = container.value.innerHTML
  showLarge.value = true
}

function closeLarge() {
  showLarge.value = false
  largeButton.value?.focus()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && showLarge.value) closeLarge()
}

watch(showLarge, async (open) => {
  if (!import.meta.client) return
  document.documentElement.classList.toggle('overflow-hidden', open)
  if (open) {
    await nextTick()
    closeButton.value?.focus()
  }
})

onMounted(() => {
  renderPreview()
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

watch(
  [payload, customization],
  () => scheduleRender(),
  { deep: true, flush: 'post' },
)

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
  document.documentElement.classList.remove('overflow-hidden')
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
        <button
          ref="largeButton"
          type="button"
          class="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-surface text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="QR-kód megnyitása nagyban"
          title="QR-kód megnyitása nagyban"
          :disabled="!isValid"
          @click="openLarge"
        >
          <Icon name="lucide:eye" class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div class="relative mt-3 flex justify-center rounded-xl border border-slate-200 bg-white p-3">
        <div class="relative flex w-full max-w-[300px] items-center justify-center">
          <div
            v-if="isValid"
            ref="container"
            class="w-full [&>svg]:h-auto [&>svg]:w-full"
            aria-hidden="true"
          />

          <div v-else class="grid min-h-[232px] place-items-center px-2 py-4 text-center">
            <div>
              <span class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <Icon name="lucide:qr-code" class="h-7 w-7" aria-hidden="true" />
              </span>
              <p class="mt-3 text-sm font-medium text-slate-700">Töltsd ki az űrlapot</p>
              <p class="mt-1 text-xs leading-relaxed text-slate-500">
                A QR-kód az első érvényes adat megadása után azonnal megjelenik.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="rendering && isValid" class="sr-only" aria-live="polite">Előnézet frissítése…</div>
      <p v-if="renderError" class="field-error justify-center" role="alert">{{ renderError }}</p>

      <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <div class="flex items-center justify-between gap-2">
          <span class="flex items-center gap-1.5">
            <label for="qr-error-level" class="text-xs font-semibold text-ink">Hibajavítási szint</label>
            <span class="group relative inline-flex">
              <button
                type="button"
                class="grid h-4 w-4 place-items-center rounded-full text-ink-muted transition-colors hover:text-brand-700"
                aria-label="Mit jelent a hibajavítási szint?"
              >
                <Icon name="lucide:info" class="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <span
                role="tooltip"
                class="pointer-events-none absolute left-1/2 top-6 z-30 w-56 -translate-x-1/2 rounded-lg bg-ink px-2.5 py-2 text-[11px] font-normal leading-relaxed text-white opacity-0 shadow-lift transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
              >
                Logóhoz a H szint a biztonságos, mert a kép takarja a kód egy részét. A magasabb
                szint több hibát javít, de sűrűbb kódot eredményez.
              </span>
            </span>
          </span>
          <span class="text-[11px] font-semibold text-brand-700">{{ errorLabel }}</span>
        </div>
        <input
          id="qr-error-level"
          type="range"
          class="mt-2 w-full accent-brand-600"
          min="0"
          :max="ERROR_LEVEL_OPTIONS.length - 1"
          step="1"
          :value="errorIndex"
          :aria-valuetext="errorLabel"
          @input="setErrorLevel(Number(($event.target as HTMLInputElement).value))"
        >
        <div class="mt-0.5 flex justify-between text-[10px] font-medium text-ink-muted" aria-hidden="true">
          <span v-for="option in ERROR_LEVEL_OPTIONS" :key="`level-${option.value}`">{{ option.value }}</span>
        </div>
      </div>

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

    <Teleport to="body">
      <div
        v-if="showLarge"
        class="fixed inset-0 z-50 flex items-center justify-center bg-ink/75 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="QR-kód előnézete nagyban"
        @click.self="closeLarge"
      >
        <div class="relative w-full max-w-lg rounded-2xl bg-white p-4 shadow-lift">
          <button
            ref="closeButton"
            type="button"
            class="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Bezárás"
            @click="closeLarge"
          >
            <Icon name="lucide:x" class="h-5 w-5" aria-hidden="true" />
          </button>
          <div class="px-6 pb-1 pt-8 [&>svg]:mx-auto [&>svg]:h-auto [&>svg]:w-full" v-html="largeImage" />
          <p class="mt-2 text-center text-xs leading-relaxed text-slate-500">
            Olvasd be a telefon kamerájával – a kód nagy méretben, élesen látszik.
          </p>
        </div>
      </div>
    </Teleport>
  </div>
</template>
