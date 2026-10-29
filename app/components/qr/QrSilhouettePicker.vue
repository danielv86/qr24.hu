<script setup lang="ts">
import {
  SILHOUETTE_PRESETS,
  evaluateSilhouette,
  fitSquareInside,
  pointsToPath,
  silhouetteLabel,
  silhouettePoints,
} from '#shared/qr/silhouette'
import type { SilhouetteId, SilhouettePreset } from '#shared/qr/silhouette'
import type { ShapePoint } from '#shared/qr/custom-shape'
import { ShapeImportError, importShapeFromSvg } from '~/lib/qr/shape-import'
import { buildQrMatrix } from '~/utils/qr-render'

const { customization, update } = useQrCustomization()
const { payload } = useQrGenerator()

const input = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadError = ref('')

const active = computed(() => customization.value.silhouette ?? 'none')
const polygon = computed(() => silhouettePoints(active.value, customization.value.silhouettePoints))
const fillEnabled = computed(() => customization.value.silhouetteFill !== false)

const moduleCount = computed(() => {
  if (!payload.value) return 33
  try {
    return buildQrMatrix(payload.value, customization.value.errorCorrection).length
  } catch {
    return 33
  }
})

const evaluation = computed(() =>
  polygon.value ? evaluateSilhouette({ points: polygon.value, moduleCount: moduleCount.value }) : null,
)

interface Tile {
  id: SilhouetteId
  label: string
  points: ShapePoint[] | null
}

const tiles = computed<Tile[]>(() => [
  ...SILHOUETTE_PRESETS.map((preset: SilhouettePreset) => ({
    id: preset.id as SilhouetteId,
    label: preset.label,
    points: preset.points,
  })),
  { id: 'custom', label: 'Saját SVG', points: customization.value.silhouettePoints ?? null },
])

/** A csempe előnézete: alakzat + a kód helye (a befoglalható négyzet). */
function tilePreview(points: ShapePoint[] | null) {
  if (!points) return null
  const square = fitSquareInside(points, 72)
  return {
    path: pointsToPath(points.map(point => ({ x: point.x * 100, y: point.y * 100 }))),
    field: {
      x: (square.centerX - square.side / 2) * 100,
      y: (square.centerY - square.side / 2) * 100,
      size: square.side * 100,
    },
  }
}

const previews = computed(() =>
  Object.fromEntries(tiles.value.map(tile => [tile.id, tilePreview(tile.points)])),
)

function selectTile(id: SilhouetteId) {
  if (id === 'custom' && !customization.value.silhouettePoints) {
    input.value?.click()
    return
  }
  update('silhouette', id)
  if (id !== 'none') update('frame', 'none')
}

function clearSilhouette() {
  update('silhouette', 'none')
}

async function onFileSelected(event: Event) {
  const element = event.target as HTMLInputElement
  const file = element.files?.[0]
  element.value = ''
  if (!file) return
  uploading.value = true
  uploadError.value = ''
  try {
    const points = await importShapeFromSvg(file)
    update('silhouettePoints', points)
    update('silhouette', 'custom')
    update('frame', 'none')
  } catch (error) {
    uploadError.value =
      error instanceof ShapeImportError ? error.message : 'Az SVG feldolgozása nem sikerült. Próbálj egyszerűbb formát.'
  } finally {
    uploading.value = false
  }
}

const statusClasses: Record<string, string> = {
  good: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  risky: 'border-amber-200 bg-amber-50 text-amber-800',
  unsafe: 'border-red-200 bg-red-50 text-red-700',
}
const statusIcon: Record<string, string> = {
  good: 'lucide:circle-check',
  risky: 'lucide:triangle-alert',
  unsafe: 'lucide:circle-x',
}
</script>

<template>
  <div>
    <fieldset>
      <legend class="field-label">Alakzat</legend>
      <div class="grid gap-1.5" style="grid-template-columns: repeat(7, minmax(0, 1fr))">
        <button
          v-for="tile in tiles"
          :key="tile.id"
          type="button"
          :aria-pressed="active === tile.id"
          :title="tile.label"
          :class="[
            'group relative grid aspect-square place-items-center overflow-hidden rounded-md border bg-white p-1 transition-colors',
            tile.id === 'custom' ? 'border-dashed' : '',
            active === tile.id
              ? 'border-brand-600 text-brand-700 ring-1 ring-brand-600'
              : 'border-slate-200 text-slate-700 hover:border-brand-300',
          ]"
          @click="selectTile(tile.id)"
        >
          <svg
            v-if="previews[tile.id]"
            viewBox="0 0 100 100"
            class="h-full w-full"
            aria-hidden="true"
            shape-rendering="geometricPrecision"
          >
            <path :d="previews[tile.id]!.path" fill="#E2E8F0" stroke="currentColor" stroke-width="4" stroke-linejoin="round" />
            <rect
              :x="previews[tile.id]!.field.x"
              :y="previews[tile.id]!.field.y"
              :width="previews[tile.id]!.field.size"
              :height="previews[tile.id]!.field.size"
              rx="1.5"
              fill="currentColor"
            />
          </svg>
          <Icon v-else name="lucide:file-up" class="h-4 w-4 text-brand-700" aria-hidden="true" />
        </button>
      </div>
      <p class="mt-1 truncate text-[11px] text-ink-muted">{{ silhouetteLabel(active) }}</p>
      <p class="field-help">
        A kód a legnagyobb befoglalható négyzetbe kerül, a többi részt ugyanolyan modulok töltik ki — a keret
        ilyenkor automatikusan kikapcsol.
      </p>
    </fieldset>

    <div class="mt-2 flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="btn-secondary px-3 py-1.5 text-xs"
        :disabled="uploading"
        @click="input?.click()"
      >
        <Icon name="lucide:upload" class="h-3.5 w-3.5" aria-hidden="true" />
        {{ uploading ? 'Feldolgozás…' : 'SVG feltöltés' }}
      </button>
      <button
        v-if="active !== 'none'"
        type="button"
        class="text-xs font-semibold text-brand-700 hover:underline"
        @click="clearSilhouette"
      >
        Alakzat kikapcsolása
      </button>
      <input
        ref="input"
        type="file"
        accept=".svg,image/svg+xml"
        class="hidden"
        aria-label="Alakzat feltöltése SVG fájlból"
        @change="onFileSelected"
      >
    </div>
    <p v-if="uploadError" class="field-error">{{ uploadError }}</p>

    <label v-if="active !== 'none'" class="mt-2 flex items-start gap-2 text-xs text-ink-soft">
      <input
        type="checkbox"
        class="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600/30"
        :checked="fillEnabled"
        @change="update('silhouetteFill', ($event.target as HTMLInputElement).checked)"
      >
      <span>A kódmezőn kívüli terület kitöltése ugyanolyan modulokkal</span>
    </label>

    <div
      v-if="evaluation"
      :class="['mt-2 flex items-start gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] leading-relaxed', statusClasses[evaluation.rating]]"
      role="status"
      aria-live="polite"
    >
      <Icon :name="statusIcon[evaluation.rating]!" class="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        <strong class="font-semibold">{{ evaluation.label }}</strong><br>
        {{ evaluation.detail }}
      </span>
    </div>
  </div>
</template>
