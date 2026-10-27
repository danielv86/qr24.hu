<script setup lang="ts">
import {
  CORNER_DOT_OPTIONS,
  CORNER_SQUARE_OPTIONS,
  DOT_STYLE_OPTIONS,
  FRAME_FONT_OPTIONS,
  FRAME_LABEL_AS_PILL,
  FRAME_LABEL_SUPPORTED,
  FRAME_OPTIONS,
  QUICK_COLORS,
  contrastRatio,
  isValidHexColor,
} from '~/lib/qr/customization'
import { BRAND_LOGO_RADIUS_PERCENT, SOCIAL_LOGOS, brandLogoDataUrl, getBrandLogoDataUrl } from '~/lib/qr/social-logos'
import type { QrBrandLogo } from '~/lib/qr/social-logos'
import type { DotStyle, FramePreset, QrFill } from '#shared/qr/types'

const {
  customization,
  hasLogo,
  logoError,
  templates,
  update,
  setColor,
  setFill,
  setLogo,
  setLogoData,
  removeLogo,
  applyTemplate,
} = useQrCustomization()

const activeTab = ref<'shapes' | 'colors' | 'logo' | 'frame'>('shapes')
const quickColorSetsBackground = ref(false)
const colorError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

/** A kijelölő keret ugyanolyan ívű, mint a márkalogó négyzete. */
const logoRadius = `${BRAND_LOGO_RADIUS_PERCENT.toFixed(2)}%`

const tabs = [
  { id: 'shapes', label: 'Forma', icon: 'lucide:qr-code' },
  { id: 'colors', label: 'Színek', icon: 'lucide:palette' },
  { id: 'logo', label: 'Logó', icon: 'lucide:image' },
  { id: 'frame', label: 'Keret', icon: 'lucide:frame' },
] as const

const shapeOptions = {
  body: DOT_STYLE_OPTIONS,
  eyeFrame: CORNER_SQUARE_OPTIONS,
  eyeBall: CORNER_DOT_OPTIONS,
}

const fillKinds: { value: QrFill['kind']; label: string }[] = [
  { value: 'solid', label: 'Tömör' },
  { value: 'linear', label: 'Lineáris' },
  { value: 'radial', label: 'Sugaras' },
]

const contrast = computed(() => {
  const foreground = customization.value.bodyFill.color
  if (!isValidHexColor(foreground) || !isValidHexColor(customization.value.bgColor)) return null
  return contrastRatio(foreground, customization.value.bgColor)
})
const contrastLabel = computed(() => {
  if (contrast.value === null) return 'Érvénytelen színkód'
  if (contrast.value >= 7) return 'Kiváló kontraszt'
  if (contrast.value >= 4.5) return 'Jó kontraszt'
  if (contrast.value >= 3) return 'Gyenge kontraszt'
  return 'Túl alacsony kontraszt'
})
const labelFrame = computed(() => FRAME_LABEL_SUPPORTED.includes(customization.value.frame))
const pillFrame = computed(
  () => FRAME_LABEL_AS_PILL.includes(customization.value.frame) || customization.value.frame === 'top-badge',
)
const needsLabel = computed(() => labelFrame.value)

type HexTarget = 'body' | 'bg' | 'frame' | 'label' | 'labelText'

function commitHex(target: HexTarget, event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.value.trim()
  if (!isValidHexColor(value)) {
    colorError.value = 'Érvénytelen színkód. Használj például #2563EB formátumot.'
    input.value = currentHex(target)
    return
  }
  colorError.value = ''
  applyHex(target, value.toUpperCase())
}

function currentHex(target: HexTarget): string {
  if (target === 'body') return customization.value.bodyFill.color
  if (target === 'bg') return customization.value.bgColor
  if (target === 'frame') return customization.value.frameColor
  if (target === 'labelText') return customization.value.labelTextColor
  return customization.value.labelColor
}

function applyHex(target: HexTarget, value: string) {
  if (target === 'body') setFill('bodyFill', { color: value })
  else if (target === 'bg') setColor('bgColor', value)
  else if (target === 'frame') setFill('frameFill', { color: value })
  else if (target === 'labelText') update('labelTextColor', value)
  else update('labelColor', value)
}

async function onLogoSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    await setLogo(file)
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function applySocialLogo(logo: QrBrandLogo) {
  setLogoData(brandLogoDataUrl(logo), logo.label)
}

const bgFillLabel = computed(() => {
  const kind = customization.value.bgFill.kind
  return fillKinds.find(item => item.value === kind)?.label ?? 'Tömör'
})

function applyQuickColor(color: string) {
  setFill('bodyFill', { kind: 'solid', color })
  if (quickColorSetsBackground.value) setColor('bgColor', color)
}

function framePreviewClass(frame: FramePreset): string {
  if (frame === 'circle') return 'rounded-full'
  if (frame === 'card') return 'rounded-md'
  if (frame === 'corners') return 'rounded-none'
  return 'rounded-[4px]'
}

/** Kész keretek a Keret fülön: klasszikus, Instagram, Facebook, Snapchat. */
const framePresets = computed(() => templates.slice(0, 4))

/** Alapból csak az első öt sablon látszik, egy sorban. */
const TEMPLATE_PREVIEW_LIMIT = 5
const showAllTemplates = ref(false)
const visibleTemplates = computed(() =>
  showAllTemplates.value ? templates : templates.slice(0, TEMPLATE_PREVIEW_LIMIT),
)
const activeTemplate = computed(
  () => templates.find(template => template.id === customization.value.designTemplate) ?? null,
)
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-base font-semibold text-ink">Megjelenés testreszabása</h3>
      <span class="text-xs text-ink-muted">Élő frissítés</span>
    </div>

    <div class="mt-4">
      <div class="flex items-baseline justify-between gap-2">
        <h4 class="text-sm font-semibold text-ink">Tervezési sablonok</h4>
        <span v-if="activeTemplate" class="truncate text-[11px] font-semibold text-brand-700">
          {{ activeTemplate.name }}
        </span>
      </div>
      <p class="mt-1 text-xs leading-relaxed text-ink-muted">
        Kattints egy sablonra: a keret, a színek és a formák azonnal érvényesülnek, a tartalom megmarad.
      </p>
      <div class="mt-2 grid grid-cols-5 gap-2">
        <button
          v-for="template in visibleTemplates"
          :key="`template-${template.id}`"
          type="button"
          :aria-pressed="customization.designTemplate === template.id"
          :title="`${template.name} – ${template.hint}`"
          :class="[
            'flex h-full min-w-0 flex-col rounded-xl border bg-surface p-1.5 text-center transition-colors',
            customization.designTemplate === template.id
              ? 'border-brand-600 ring-2 ring-brand-600/20'
              : 'border-slate-200 hover:border-brand-300',
          ]"
          @click="applyTemplate(template)"
        >
          <span
            :class="[
              'flex w-full flex-col items-center justify-center overflow-hidden p-1.5',
              framePreviewClass(template.frame),
            ]"
            :style="{
              backgroundColor: template.frame === 'card' || template.frame === 'circle'
                ? template.frameColor
                : '#F8FAFC',
              containerType: 'inline-size',
            }"
            aria-hidden="true"
          >
            <span class="block aspect-square w-full rounded-[4px] bg-white p-[3px]">
              <QrMiniCode
                :dot-style="template.dotStyle"
                :corner-square-style="template.cornerSquareStyle"
                :corner-dot-style="template.cornerDotStyle"
                :color="template.fgColor"
                :logo="getBrandLogoDataUrl(template.logo)"
                class="h-full w-full"
              />
            </span>
            <span
              v-if="template.frameText"
              class="mt-1 block max-w-full truncate rounded-full px-1.5 font-bold leading-[1.8]"
              :style="{
                backgroundColor: template.labelColor,
                color: template.labelTextColor,
                fontSize: 'clamp(4px, 7cqw, 9px)',
              }"
            >
              {{ template.frameText }}
            </span>
          </span>
          <span class="mt-auto block w-full truncate pt-1.5 text-[11px] font-medium leading-tight text-ink">{{ template.name }}</span>
        </button>
      </div>
      <button
        v-if="templates.length > TEMPLATE_PREVIEW_LIMIT"
        type="button"
        class="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline"
        :aria-expanded="showAllTemplates"
        @click="showAllTemplates = !showAllTemplates"
      >
        <Icon :name="showAllTemplates ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="h-3.5 w-3.5" aria-hidden="true" />
        {{ showAllTemplates ? 'Kevesebb sablon' : `További ${templates.length - TEMPLATE_PREVIEW_LIMIT} sablon` }}
      </button>
    </div>

    <div
      class="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:grid-cols-4"
      role="tablist"
      aria-label="Testreszabási kategóriák"
    >
      <button
        v-for="tab in tabs"
        :id="`custom-tab-${tab.id}`"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`custom-panel-${tab.id}`"
        :tabindex="activeTab === tab.id ? 0 : -1"
        :class="[
          'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-[13px] font-semibold transition-colors',
          activeTab === tab.id
            ? 'bg-surface text-brand-700 shadow-sm ring-1 ring-brand-200'
            : 'text-ink-muted hover:text-ink',
        ]"
        @click="activeTab = tab.id"
      >
        <Icon :name="tab.icon" class="h-4 w-4" aria-hidden="true" />
        {{ tab.label }}
      </button>
    </div>

    <!-- FORMA -->
    <div
      v-if="activeTab === 'shapes'"
      id="custom-panel-shapes"
      class="mt-4 space-y-4"
      role="tabpanel"
      aria-labelledby="custom-tab-shapes"
    >
      <QrShapeTiles
        id="qr-body-shapes"
        :model-value="customization.dotStyle"
        label="Test formája"
        :options="shapeOptions.body"
        variant="body"
        @update:model-value="update('dotStyle', $event as DotStyle)"
      />
      <QrShapeTiles
        id="qr-eye-frame-shapes"
        :model-value="customization.cornerSquareStyle"
        label="Sarokelem kerete"
        :options="shapeOptions.eyeFrame"
        variant="frame"
        @update:model-value="update('cornerSquareStyle', $event as typeof customization.cornerSquareStyle)"
      />
      <QrShapeTiles
        id="qr-eye-ball-shapes"
        :model-value="customization.cornerDotStyle"
        label="Sarokelem belseje"
        :options="shapeOptions.eyeBall"
        variant="ball"
        :frame-style="customization.cornerSquareStyle"
        @update:model-value="update('cornerDotStyle', $event as typeof customization.cornerDotStyle)"
      />

      <div>
        <label for="qr-margin" class="field-label">Csendes zóna: {{ customization.margin }} modul</label>
        <input
          id="qr-margin"
          type="range"
          class="w-full accent-brand-600"
          min="2"
          max="10"
          step="1"
          :value="customization.margin"
          @input="update('margin', Number(($event.target as HTMLInputElement).value))"
        >
        <p class="field-help">
          A kód körüli üres sáv. A QR-szabvány 4 modult ír elő – ennél kevesebbel a telefonok
          nehezebben ismerik fel a kódot.
        </p>
      </div>

    </div>

    <!-- SZÍNEK -->
    <div
      v-else-if="activeTab === 'colors'"
      id="custom-panel-colors"
      class="mt-4"
      role="tabpanel"
      aria-labelledby="custom-tab-colors"
    >
      <div>
        <p class="field-label">Gyors egyszínű</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="color in QUICK_COLORS"
            :key="`quick-${color.value}`"
            type="button"
            class="h-8 w-8 rounded-full border border-slate-300 transition-transform hover:scale-110"
            :style="{ backgroundColor: color.value }"
            :title="color.name"
            :aria-label="`${color.name} szín`"
            :aria-pressed="customization.bodyFill.color === color.value"
            @click="applyQuickColor(color.value)"
          />
        </div>
        <label class="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-ink-soft">
          <input
            v-model="quickColorSetsBackground"
            type="checkbox"
            class="h-3.5 w-3.5 rounded border-slate-300 accent-brand-600"
          >
          A háttérre is alkalmazzam
        </label>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label for="qr-fg-color" class="field-label">Test színe</label>
          <div class="flex gap-2">
            <input
              id="qr-fg-color-picker"
              type="color"
              :value="isValidHexColor(customization.bodyFill.color) ? customization.bodyFill.color : '#0F172A'"
              class="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-surface p-1"
              aria-label="Test színének kiválasztása"
              @input="setFill('bodyFill', { color: ($event.target as HTMLInputElement).value.toUpperCase() })"
            >
            <input
              id="qr-fg-color"
              type="text"
              class="field-input font-mono uppercase"
              :value="customization.bodyFill.color"
              maxlength="7"
              spellcheck="false"
              @change="commitHex('body', $event)"
            >
          </div>
        </div>

        <div>
          <label for="qr-bg-color" class="field-label">Háttér színe</label>
          <div class="flex gap-2">
            <input
              id="qr-bg-color-picker"
              type="color"
              :value="isValidHexColor(customization.bgColor) ? customization.bgColor : '#FFFFFF'"
              class="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-surface p-1"
              aria-label="Háttér színének kiválasztása"
              @input="setColor('bgColor', ($event.target as HTMLInputElement).value.toUpperCase())"
            >
            <input
              id="qr-bg-color"
              type="text"
              class="field-input font-mono uppercase"
              :value="customization.bgColor"
              maxlength="7"
              spellcheck="false"
              @change="commitHex('bg', $event)"
            >
          </div>
        </div>
      </div>

      <div class="mt-4 rounded-xl border border-slate-200 bg-surface p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="field-label mb-0">Háttér kitöltése</p>
          <span class="text-[11px] font-medium text-ink-muted">{{ bgFillLabel }}</span>
        </div>
        <div class="mt-2 inline-flex rounded-xl border border-slate-200 bg-surface p-1">
          <button
            v-for="kind in fillKinds"
            :key="`bg-fill-${kind.value}`"
            type="button"
            :aria-pressed="customization.bgFill.kind === kind.value"
            :class="[
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              customization.bgFill.kind === kind.value
                ? 'bg-brand-600 text-white'
                : 'text-ink-soft hover:bg-slate-100',
            ]"
            @click="setFill('bgFill', { kind: kind.value })"
          >
            {{ kind.label }}
          </button>
        </div>
        <div v-if="customization.bgFill.kind !== 'solid'" class="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label for="qr-bg-color2" class="field-label">Háttér második színe</label>
            <div class="flex gap-2">
              <input
                id="qr-bg-color2-picker"
                type="color"
                :value="customization.bgFill.color2"
                class="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-surface p-1"
                aria-label="Háttér második színének kiválasztása"
                @input="setFill('bgFill', { color2: ($event.target as HTMLInputElement).value.toUpperCase() })"
              >
              <input
                id="qr-bg-color2"
                type="text"
                class="field-input font-mono uppercase"
                :value="customization.bgFill.color2"
                maxlength="7"
                spellcheck="false"
                @change="setFill('bgFill', { color2: ($event.target as HTMLInputElement).value.toUpperCase() })"
              >
            </div>
          </div>
          <div v-if="customization.bgFill.kind === 'linear'">
            <label for="qr-bg-rotation" class="field-label">
              Háttér szöge: {{ customization.bgFill.rotation }}°
            </label>
            <input
              id="qr-bg-rotation"
              type="range"
              class="w-full"
              min="0"
              max="360"
              step="15"
              :value="customization.bgFill.rotation"
              @input="setFill('bgFill', { rotation: Number(($event.target as HTMLInputElement).value) })"
            >
          </div>
        </div>
      </div>

      <div class="mt-4">
        <p class="field-label">Test kitöltése</p>
        <div class="inline-flex rounded-xl border border-slate-200 bg-surface p-1">
          <button
            v-for="kind in fillKinds"
            :key="`fill-${kind.value}`"
            type="button"
            :aria-pressed="customization.bodyFill.kind === kind.value"
            :class="[
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              customization.bodyFill.kind === kind.value
                ? 'bg-brand-600 text-white'
                : 'text-ink-soft hover:bg-slate-100',
            ]"
            @click="setFill('bodyFill', { kind: kind.value })"
          >
            {{ kind.label }}
          </button>
        </div>

        <div v-if="customization.bodyFill.kind !== 'solid'" class="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label for="qr-fill-color2" class="field-label">Második szín</label>
            <div class="flex gap-2">
              <input
                id="qr-fill-color2-picker"
                type="color"
                :value="customization.bodyFill.color2"
                class="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-surface p-1"
                aria-label="Második szín kiválasztása"
                @input="setFill('bodyFill', { color2: ($event.target as HTMLInputElement).value.toUpperCase() })"
              >
              <input
                id="qr-fill-color2"
                type="text"
                class="field-input font-mono uppercase"
                :value="customization.bodyFill.color2"
                maxlength="7"
                spellcheck="false"
                @change="setFill('bodyFill', { color2: ($event.target as HTMLInputElement).value.toUpperCase() })"
              >
            </div>
          </div>
          <div v-if="customization.bodyFill.kind === 'linear'">
            <label for="qr-fill-rotation" class="field-label">
              Színátmenet szöge: {{ customization.bodyFill.rotation }}°
            </label>
            <input
              id="qr-fill-rotation"
              type="range"
              class="w-full"
              min="0"
              max="360"
              step="15"
              :value="customization.bodyFill.rotation"
              @input="setFill('bodyFill', { rotation: Number(($event.target as HTMLInputElement).value) })"
            >
          </div>
        </div>
      </div>

      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label for="qr-eye-frame-color" class="field-label">Sarokelem színe</label>
          <div class="flex gap-2">
            <input
              id="qr-eye-frame-color"
              type="color"
              :value="isValidHexColor(customization.cornerSquareColor) ? customization.cornerSquareColor : customization.bodyFill.color"
              class="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-surface p-1"
              aria-label="Sarokelem színének kiválasztása"
              @input="update('cornerSquareColor', ($event.target as HTMLInputElement).value.toUpperCase())"
            >
            <button
              type="button"
              class="btn-ghost flex-1 justify-start px-2 text-xs"
              @click="update('cornerSquareColor', '')"
            >
              {{ customization.cornerSquareColor ? 'Vissza a test színére' : 'A test színét használja' }}
            </button>
          </div>
          <div class="mt-2 flex gap-2">
            <select
              class="field-input"
              aria-label="Sarokelem kitöltése"
              :value="customization.cornerSquareFill.kind"
              @change="setFill('cornerSquareFill', { kind: ($event.target as HTMLSelectElement).value as QrFill['kind'] })"
            >
              <option v-for="kind in fillKinds" :key="`ef-${kind.value}`" :value="kind.value">{{ kind.label }}</option>
            </select>
            <input
              v-if="customization.cornerSquareFill.kind !== 'solid'"
              type="color"
              :value="customization.cornerSquareFill.color2"
              class="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-surface p-1"
              aria-label="Sarokelem második színe"
              @input="setFill('cornerSquareFill', { color2: ($event.target as HTMLInputElement).value.toUpperCase() })"
            >
          </div>
        </div>
        <div>
          <label for="qr-eye-ball-color" class="field-label">Sarokelem belsejének színe</label>
          <div class="flex gap-2">
            <input
              id="qr-eye-ball-color"
              type="color"
              :value="isValidHexColor(customization.cornerDotColor) ? customization.cornerDotColor : customization.bodyFill.color"
              class="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-surface p-1"
              aria-label="Sarokelem belsejének színkiválasztása"
              @input="update('cornerDotColor', ($event.target as HTMLInputElement).value.toUpperCase())"
            >
            <button
              type="button"
              class="btn-ghost flex-1 justify-start px-2 text-xs"
              @click="update('cornerDotColor', '')"
            >
              {{ customization.cornerDotColor ? 'Vissza a test színére' : 'A test színét használja' }}
            </button>
          </div>
          <div class="mt-2 flex gap-2">
            <select
              class="field-input"
              aria-label="Sarokelem belsejének kitöltése"
              :value="customization.cornerDotFill.kind"
              @change="setFill('cornerDotFill', { kind: ($event.target as HTMLSelectElement).value as QrFill['kind'] })"
            >
              <option v-for="kind in fillKinds" :key="`eb-${kind.value}`" :value="kind.value">{{ kind.label }}</option>
            </select>
            <input
              v-if="customization.cornerDotFill.kind !== 'solid'"
              type="color"
              :value="customization.cornerDotFill.color2"
              class="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-surface p-1"
              aria-label="Sarokelem belsejének második színe"
              @input="setFill('cornerDotFill', { color2: ($event.target as HTMLInputElement).value.toUpperCase() })"
            >
          </div>
        </div>
      </div>

      <label class="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-surface p-3">
        <input
          type="checkbox"
          class="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-600"
          :checked="customization.transparentBackground"
          @change="update('transparentBackground', ($event.target as HTMLInputElement).checked)"
        >
        <span>
          <span class="block text-sm font-medium text-ink">Átlátszó háttér</span>
          <span class="mt-0.5 block text-xs text-ink-muted">
            PNG, WebP és SVG exportnál a háttér átlátszó lesz. JPG és PDF mindig fehér hátteret kap.
          </span>
        </span>
      </label>

      <p v-if="colorError" class="field-error" role="alert">{{ colorError }}</p>
      <p v-if="contrast !== null" class="mt-2 text-xs">
        <span
          :class="contrast >= 4.5 ? 'text-emerald-700' : contrast >= 3 ? 'text-amber-700' : 'text-red-600'"
          class="font-medium"
        >
          Kontraszt: {{ contrast.toFixed(1) }}:1 – {{ contrastLabel }}
        </span>
      </p>

      <div class="mt-4">
        <label for="qr-export-size" class="field-label">Export méret: {{ customization.size }} × {{ customization.size }} px</label>
        <input
          id="qr-export-size"
          type="range"
          class="w-full"
          min="256"
          max="2048"
          step="128"
          :value="customization.size"
          @input="update('size', Number(($event.target as HTMLInputElement).value))"
        >
        <p class="field-help">Nyomtatáshoz 1024 px vagy nagyobb ajánlott.</p>
      </div>

    </div>

    <!-- LOGÓ -->
    <div
      v-else-if="activeTab === 'logo'"
      id="custom-panel-logo"
      class="mt-4"
      role="tabpanel"
      aria-labelledby="custom-tab-logo"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:h-[5.5rem] sm:w-[5.5rem]">
          <img
            v-if="hasLogo"
            :src="customization.logo"
            alt="Feltöltött logó előnézete"
            class="max-h-[86%] max-w-[86%] object-contain"
          >
          <Icon v-else name="lucide:image-plus" class="h-7 w-7 text-slate-400" aria-hidden="true" />
        </div>
        <div class="min-w-0 sm:self-center">
          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn-secondary" :disabled="uploading" @click="fileInput?.click()">
              <Icon name="lucide:upload" class="h-4 w-4" aria-hidden="true" />
              {{ uploading ? 'Feltöltés…' : hasLogo ? 'Logó cseréje' : 'Logó feltöltése' }}
            </button>
            <button v-if="hasLogo" type="button" class="btn-ghost text-red-600 hover:bg-red-50" @click="removeLogo">
              <Icon name="lucide:trash-2" class="h-4 w-4" aria-hidden="true" />
              Eltávolítás
            </button>
          </div>
          <input
            ref="fileInput"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
            class="sr-only"
            aria-label="Logó kiválasztása"
            @change="onLogoSelected"
          >
          <p class="mt-2 text-xs text-ink-muted">PNG, JPG, WebP, SVG vagy GIF, legfeljebb 1,5 MB.</p>
          <p v-if="logoError" class="field-error" role="alert">{{ logoError }}</p>
          <p class="mt-1 min-h-4 truncate text-xs text-ink-muted">{{ customization.logoName || '\u00A0' }}</p>
        </div>
      </div>

      <div class="mt-4">
        <div class="flex items-baseline justify-between gap-2">
          <p class="field-label mb-0">Kész logók</p>
          <span class="text-[11px] text-ink-muted">Egy kattintás, feltöltés nélkül</span>
        </div>
        <div class="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-[repeat(15,minmax(0,1fr))]">
          <button
            type="button"
            class="grid aspect-square place-items-center border border-slate-200 bg-surface text-ink-muted transition-colors hover:border-brand-300"
            :class="!hasLogo ? 'ring-2 ring-brand-600' : ''"
            :style="{ borderRadius: logoRadius }"
            title="Nincs logó"
            aria-label="Nincs logó"
            :aria-pressed="!hasLogo"
            @click="removeLogo"
          >
            <Icon name="lucide:ban" class="h-[58%] w-[58%]" aria-hidden="true" />
          </button>
          <button
            v-for="logo in SOCIAL_LOGOS"
            :key="`social-${logo.id}`"
            type="button"
            class="grid aspect-square place-items-center overflow-hidden"
            :class="customization.logoName === logo.label ? 'ring-2 ring-brand-600' : ''"
            :style="{ borderRadius: logoRadius }"
            :title="`${logo.label} – ${logo.description}`"
            :aria-label="`${logo.label} logó használata`"
            @click="applySocialLogo(logo)"
          >
            <img :src="brandLogoDataUrl(logo)" :alt="logo.label" class="h-full w-full">
          </button>
        </div>
        <p class="field-help">
          Válassz kész logót, vagy töltsd fel a sajátod – a feltöltött kép felülírja a kész logót.
          A logó a kód közepére kerül, ezért a hibajavítási szint automatikusan H-ra áll.
        </p>
      </div>

      <div v-if="hasLogo" class="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label for="qr-logo-size" class="field-label">
            Logó mérete: {{ Math.round(customization.logoSize * 100) }}%
          </label>
          <input
            id="qr-logo-size"
            type="range"
            class="w-full"
            min="0.1"
            max="0.4"
            step="0.01"
            :value="customization.logoSize"
            @input="update('logoSize', Number(($event.target as HTMLInputElement).value))"
          >
          <p class="field-help">20–30% között marad a legtöbb kód jól olvasható.</p>
        </div>
        <div>
          <label for="qr-logo-margin" class="field-label">Logó margója: {{ customization.logoMargin }} px</label>
          <input
            id="qr-logo-margin"
            type="range"
            class="w-full"
            min="0"
            max="40"
            step="2"
            :value="customization.logoMargin"
            @input="update('logoMargin', Number(($event.target as HTMLInputElement).value))"
          >
          <p class="field-help">A logó körüli üres sáv; nagyobb érték tisztább képet ad.</p>
        </div>
      </div>
    </div>

    <!-- KERET -->
    <div
      v-else
      id="custom-panel-frame"
      class="mt-4"
      role="tabpanel"
      aria-labelledby="custom-tab-frame"
    >
      <div>
        <p class="field-label">Kész keretek</p>
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="preset in framePresets"
            :key="`frame-preset-${preset.id}`"
            type="button"
            :aria-pressed="customization.designTemplate === preset.id"
            :class="[
              'min-w-0 rounded-xl border bg-surface p-1.5 text-center transition-colors',
              customization.designTemplate === preset.id
                ? 'border-brand-600 ring-2 ring-brand-600/20'
                : 'border-slate-200 hover:border-brand-300',
            ]"
            @click="applyTemplate(preset)"
          >
            <span
              :class="[
                'flex w-full flex-col items-center justify-center overflow-hidden p-1.5',
                framePreviewClass(preset.frame),
              ]"
              :style="{
                backgroundColor: preset.frame === 'card' || preset.frame === 'circle'
                  ? preset.frameColor
                  : '#F8FAFC',
              }"
              aria-hidden="true"
            >
              <span class="block aspect-square w-full rounded-[4px] bg-white p-[3px]">
                <QrMiniCode
                  :dot-style="preset.dotStyle"
                  :corner-square-style="preset.cornerSquareStyle"
                  :corner-dot-style="preset.cornerDotStyle"
                  :color="preset.fgColor"
                  :logo="getBrandLogoDataUrl(preset.logo)"
                  class="h-full w-full"
                />
              </span>
              <span
                v-if="preset.frameText"
                class="mt-1 block max-w-full truncate rounded-full px-1.5 text-[8px] font-bold leading-[1.8]"
                :style="{ backgroundColor: preset.labelColor, color: preset.labelTextColor }"
              >
                {{ preset.frameText }}
              </span>
            </span>
            <span class="mt-1.5 block truncate text-[11px] font-medium text-ink">{{ preset.name }}</span>
          </button>
        </div>
        <p class="field-help">
          Kattints egy kész keretre: a keret, a színek és a formák együtt érvényesülnek.
        </p>
      </div>

      <fieldset class="mt-4">
        <legend class="field-label">Keret típusa</legend>
        <div class="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
          <button
            v-for="frame in FRAME_OPTIONS"
            :key="frame.value"
            type="button"
            :aria-pressed="customization.frame === frame.value"
            :class="[
              'rounded-lg border bg-surface p-1 text-center transition-colors',
              customization.frame === frame.value
                ? 'border-brand-600 ring-1 ring-brand-600'
                : 'border-slate-200 hover:border-brand-300',
            ]"
            :title="frame.label"
            @click="update('frame', frame.value)"
          >
            <span class="mx-auto flex h-11 items-center justify-center" aria-hidden="true">
              <QrFrameTile :frame="frame.value" />
            </span>
            <span class="block truncate text-[10px] font-medium leading-tight text-ink-soft">{{ frame.label }}</span>
          </button>
        </div>
      </fieldset>

      <template v-if="needsLabel">
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label for="qr-frame-text" class="field-label">
              {{ pillFrame ? 'Gomb felirata' : 'Felirat a kereten' }}
            </label>
            <input
              id="qr-frame-text"
              type="text"
              class="field-input"
              maxlength="48"
              placeholder="Olvasd be telefonnal"
              :value="customization.frameText"
              @input="update('frameText', ($event.target as HTMLInputElement).value)"
            >
          </div>
          <div v-if="customization.frame === 'card'">
            <label for="qr-frame-subtitle" class="field-label">Alsó kiegészítő szöveg</label>
            <input
              id="qr-frame-subtitle"
              type="text"
              class="field-input"
              maxlength="48"
              placeholder="Instagram"
              :value="customization.frameSubtitle"
              @input="update('frameSubtitle', ($event.target as HTMLInputElement).value)"
            >
          </div>
        </div>

        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label for="qr-frame-font" class="field-label">Betűtípus</label>
            <select
              id="qr-frame-font"
              class="field-input"
              :value="customization.frameFont"
              @change="update('frameFont', ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="font in FRAME_FONT_OPTIONS" :key="font" :value="font">{{ font }}</option>
            </select>
          </div>
          <div>
            <label for="qr-frame-font-scale" class="field-label">
              Szövegméret: {{ Math.round(customization.frameFontScale * 100) }}%
            </label>
            <input
              id="qr-frame-font-scale"
              type="range"
              class="w-full"
              min="0.7"
              max="1.4"
              step="0.05"
              :value="customization.frameFontScale"
              @input="update('frameFontScale', Number(($event.target as HTMLInputElement).value))"
            >
          </div>
        </div>
      </template>

      <div v-if="customization.frame !== 'none'" class="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label for="qr-frame-color" class="field-label">Keret színe</label>
          <div class="flex gap-2">
            <input
              id="qr-frame-color"
              type="color"
              :value="isValidHexColor(customization.frameColor) ? customization.frameColor : '#0F172A'"
              class="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-surface p-1"
              aria-label="Keret színének kiválasztása"
              @input="setFill('frameFill', { color: ($event.target as HTMLInputElement).value.toUpperCase() })"
            >
            <input
              type="text"
              class="field-input font-mono uppercase"
              :value="customization.frameColor"
              maxlength="7"
              spellcheck="false"
              @change="commitHex('frame', $event)"
            >
          </div>
        </div>
        <div v-if="pillFrame">
          <label for="qr-label-color" class="field-label">Gomb színe</label>
          <div class="flex gap-2">
            <input
              id="qr-label-color"
              type="color"
              :value="isValidHexColor(customization.labelColor) ? customization.labelColor : '#FFFFFF'"
              class="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-surface p-1"
              aria-label="Gomb színének kiválasztása"
              @input="update('labelColor', ($event.target as HTMLInputElement).value.toUpperCase())"
            >
            <input
              type="text"
              class="field-input font-mono uppercase"
              :value="customization.labelColor"
              maxlength="7"
              spellcheck="false"
              @change="commitHex('label', $event)"
            >
          </div>
        </div>
      </div>

      <div v-if="labelFrame" class="mt-3">
        <label for="qr-label-text-color" class="field-label">Szöveg színe</label>
        <div class="flex gap-2">
          <input
            id="qr-label-text-color"
            type="color"
            :value="isValidHexColor(customization.labelTextColor) ? customization.labelTextColor : '#0F172A'"
            class="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-surface p-1"
            aria-label="Szöveg színének kiválasztása"
            @input="update('labelTextColor', ($event.target as HTMLInputElement).value.toUpperCase())"
          >
          <input
            type="text"
            class="field-input font-mono uppercase"
            :value="customization.labelTextColor"
            maxlength="7"
            spellcheck="false"
            @change="commitHex('labelText', $event)"
          >
        </div>
      </div>

      <p class="mt-3 text-xs leading-relaxed text-ink-muted">
        A keret az előnézetben és minden exportban (PNG, JPG, WebP, SVG, PDF) ugyanúgy jelenik meg.
      </p>
    </div>
  </div>
</template>
