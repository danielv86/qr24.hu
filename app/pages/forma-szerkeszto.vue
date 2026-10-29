<script setup lang="ts">
import { customShapePath, isValidCustomShape } from '#shared/qr/custom-shape'
import type { CustomShape } from '#shared/qr/custom-shape'
import { EMPTY_NEIGHBOURS, bodyShapePath, eyeBallShapePath, eyeFrameShapePath } from '~/lib/qr/shapes'
import type { CornerDotStyle, CornerSquareStyle, DotStyle } from '#shared/qr/types'
import { buildQrContents } from '~/utils/qr-render'

useSeoMeta({
  title: 'QR forma szerkesztő – saját minta rajzolása',
  description:
    'Rajzolj saját QR-formát: szerkeszd a modulok alakját, a sarokelem keretét és belsejét, tölts be SVG-t vagy képet, és mentsd el a formát.',
})

const { customization, update } = useQrCustomization()

const kinds = [
  { id: 'body', label: 'Test formája', icon: 'lucide:qr-code' },
  { id: 'frame', label: 'Sarokelem kerete', icon: 'lucide:square-dashed' },
  { id: 'ball', label: 'Sarokelem belseje', icon: 'lucide:circle-dot' },
] as const

const activeKind = ref<'body' | 'frame' | 'ball'>('body')

const activeShape = computed<CustomShape | null>(() => {
  if (activeKind.value === 'frame') return customization.value.customFrame ?? null
  if (activeKind.value === 'ball') return customization.value.customBall ?? null
  return customization.value.customBody ?? null
})

const activeStyle = computed(() => {
  if (activeKind.value === 'frame') return customization.value.cornerSquareStyle
  if (activeKind.value === 'ball') return customization.value.cornerDotStyle
  return customization.value.dotStyle
})

/** A jelenleg kiválasztott beépített forma, amiből a szerkesztés indul. */
const seedPath = computed(() => {
  if (activeStyle.value === 'custom') return ''
  if (activeKind.value === 'frame') {
    return eyeFrameShapePath(activeStyle.value as CornerSquareStyle)(0, 0, 100, 100 / 7)
  }
  if (activeKind.value === 'ball') {
    return eyeBallShapePath(activeStyle.value as CornerDotStyle)(0, 0, 100, 100 / 3)
  }
  return bodyShapePath(activeStyle.value as DotStyle)(0, 0, 100, EMPTY_NEIGHBOURS, 1, 1)
})

const savedMessage = ref('')

function saveShape(shape: CustomShape) {
  if (activeKind.value === 'frame') {
    update('customFrame', shape)
    update('cornerSquareStyle', 'custom')
  } else if (activeKind.value === 'ball') {
    update('customBall', shape)
    update('cornerDotStyle', 'custom')
  } else {
    update('customBody', shape)
    update('dotStyle', 'custom')
  }
  savedMessage.value = 'A forma elmentve, és a generátorban is ezt használjuk.'
  window.setTimeout(() => {
    savedMessage.value = ''
  }, 4000)
}

const previewContent = computed(() =>
  buildQrContents('https://qrkod24.hu', customization.value, 512),
)

const hasAnyShape = computed(
  () =>
    isValidCustomShape(customization.value.customBody) ||
    isValidCustomShape(customization.value.customFrame) ||
    isValidCustomShape(customization.value.customBall),
)

const miniPreview = computed(() => customShapePath(activeShape.value, 0, 0, 100))
</script>

<template>
  <div class="container-page py-10">
    <div class="max-w-3xl">
      <p class="eyebrow">App</p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">QR forma szerkesztő</h1>
      <p class="mt-3 text-base leading-relaxed text-ink-muted">
        Rajzolj saját formát a kódhoz: húzd a csomópontokat, adj hozzá több alakzatot (például két
        kört a szemeknek), tölts be SVG-t vagy képet, és mentsd el. A kész forma a generátorban is
        kiválasztható.
      </p>
    </div>

    <div class="mt-6 flex flex-wrap items-center gap-2">
      <button
        v-for="kind in kinds"
        :key="kind.id"
        type="button"
        :aria-pressed="activeKind === kind.id"
        :class="[
          'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors',
          activeKind === kind.id
            ? 'border-brand-600 bg-brand-50 text-brand-800'
            : 'border-slate-200 bg-surface text-ink-soft hover:border-brand-300',
        ]"
        @click="activeKind = kind.id"
      >
        <Icon :name="kind.icon" class="h-4 w-4" aria-hidden="true" />
        {{ kind.label }}
        <span
          v-if="kind.id === 'body' ? customization.customBody : kind.id === 'frame' ? customization.customFrame : customization.customBall"
          class="rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white"
        >
          saját
        </span>
      </button>
      <NuxtLink to="/qr-kod-generator" class="ml-auto text-sm font-semibold text-brand-700 hover:underline">
        Vissza a generátorhoz
      </NuxtLink>
    </div>

    <p v-if="savedMessage" class="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700">
      <Icon name="lucide:check-circle-2" class="h-4 w-4" aria-hidden="true" />
      {{ savedMessage }}
    </p>

    <div class="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <QrShapeEditor
        embedded
        :open="false"
        :kind="activeKind"
        :shape="activeShape"
        :seed-path="seedPath"
        @save="saveShape"
        @close="() => {}"
      />

      <aside class="grid gap-4 lg:sticky lg:top-[calc(var(--header-height)+1rem)]">
        <div class="card p-4">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-ink">Élő QR-előnézet</h2>
            <span class="text-[11px] text-ink-muted">512 × 512</span>
          </div>
          <div class="mt-3 rounded-xl border border-slate-200 p-3" :style="{ backgroundColor: customization.bgColor }">
            <svg viewBox="0 0 512 512" class="h-full w-full" aria-label="QR-kód előnézet" v-html="previewContent" />
          </div>
          <p class="mt-3 text-xs leading-relaxed text-ink-muted">
            A minta a jelenlegi színekkel és formákkal készül. A mentett saját forma a generátorban is
            megjelenik, és a letöltések is ezt használják.
          </p>
        </div>

        <div class="card p-4">
          <h2 class="text-sm font-semibold text-ink">Aktív alakzat</h2>
          <div class="mt-2 flex items-center gap-3">
            <div class="w-16 rounded-lg border border-slate-200 bg-white p-1.5">
              <svg viewBox="0 0 100 100" class="h-full w-full" fill="#0F172A" aria-hidden="true">
                <path v-if="miniPreview" :d="miniPreview" />
                <circle v-else cx="50" cy="50" r="18" fill="none" stroke="#CBD5E1" stroke-width="6" stroke-dasharray="8 6" />
              </svg>
            </div>
            <p class="text-xs leading-relaxed text-ink-muted">
              <template v-if="hasAnyShape">
                A saját formák a fiókodhoz tartozó beállításban tárolódnak. A szerkesztő minden
                megnyitáskor a mentett formából indul.
              </template>
              <template v-else>
                Még nincs saját forma. Válassz egy alakzatot, szerkeszd, majd mentsd el.
              </template>
            </p>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
