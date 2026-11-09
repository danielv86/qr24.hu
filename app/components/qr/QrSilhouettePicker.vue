<script setup lang="ts">
import {
  SILHOUETTE_PRESETS,
  evaluateSilhouette,
  fitSquareInside,
  pointsToPath,
  silhouetteLabel,
  silhouettePoints,
} from '#shared/qr/silhouette'
import type { SilhouetteId } from '#shared/qr/silhouette'
import type { ShapePoint } from '#shared/qr/custom-shape'
import { findLibraryShape } from '#shared/qr/library-shape'
import { ShapeImportError, importShapeFromImage, importShapeFromSvg, shapeFileKind } from '~/lib/qr/shape-import'
import { buildQrMatrix } from '~/utils/qr-render'

const { customization, update, patch } = useQrCustomization()
const { payload } = useQrGenerator()
const { settings } = useSiteSettings()

const input = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadError = ref('')

const active = computed(() => customization.value.silhouette ?? 'none')
const polygon = computed(() => silhouettePoints(active.value, customization.value.silhouettePoints))
const fillEnabled = computed(() => customization.value.silhouetteFill !== false)
const borderWidth = computed(() => customization.value.silhouetteBorderWidth ?? 0.9)
const libraryShapes = computed(() => settings.value.silhouetteShapes ?? [])
const libraryShape = computed(() => findLibraryShape(libraryShapes.value, customization.value.silhouetteId))

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
  key: string
  label: string
  points: ShapePoint[] | null
  silhouette: SilhouetteId
  libraryId?: string
}

const tiles = computed<Tile[]>(() => [
  ...SILHOUETTE_PRESETS.map(preset => ({
    key: `preset:${preset.id}`,
    label: preset.label,
    points: preset.points,
    silhouette: preset.id as SilhouetteId,
  })),
  ...libraryShapes.value.map(shape => ({
    key: `library:${shape.id}`,
    label: shape.label,
    points: shape.points,
    silhouette: 'custom' as SilhouetteId,
    libraryId: shape.id,
  })),
  { key: 'custom', label: 'Saját SVG', points: customization.value.silhouettePoints ?? null, silhouette: 'custom' as SilhouetteId },
])

const activeKey = computed(() => {
  if (active.value === 'none') return ''
  if (libraryShape.value) return `library:${libraryShape.value.id}`
  return active.value === 'custom' ? 'custom' : `preset:${active.value}`
})

const activeLabel = computed(() => libraryShape.value?.label ?? silhouetteLabel(active.value))

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
  Object.fromEntries(tiles.value.map(tile => [tile.key, tilePreview(tile.points)])),
)

function selectTile(tile: Tile) {
  if (tile.key === 'custom' && !tile.points) {
    input.value?.click()
    return
  }
  patch({
    silhouette: tile.silhouette,
    silhouettePoints: tile.points,
    silhouetteId: tile.libraryId ?? '',
  })
}

function clearSilhouette() {
  patch({ silhouette: 'none', silhouetteId: '' })
}

async function onFileSelected(event: Event) {
  const element = event.target as HTMLInputElement
  const file = element.files?.[0]
  element.value = ''
  if (!file) return
  const kind = shapeFileKind(file)
  if (!kind) {
    uploadError.value = 'Csak SVG, PNG, JPG, WebP vagy GIF tölthető fel.'
    return
  }
  uploading.value = true
  uploadError.value = ''
  try {
    const points = kind === 'svg' ? await importShapeFromSvg(file) : await importShapeFromImage(file)
    patch({ silhouette: 'custom', silhouettePoints: points, silhouetteId: '' })
  } catch (error) {
    uploadError.value =
      error instanceof ShapeImportError ? error.message : 'A fájl feldolgozása nem sikerült. Próbálj egyszerűbb formát.'
  } finally {
    uploading.value = false
  }
}

const statusClasses: Record<string, string> = {
  good: 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300',
  risky: 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300',
  unsafe: 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300',
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
          :key="tile.key"
          type="button"
          :aria-pressed="activeKey === tile.key"
          :aria-label="tile.label"
          :title="tile.label"
          :class="[
            'group relative grid aspect-square place-items-center overflow-hidden rounded-md border bg-slate-50 p-1 transition-colors',
            tile.key === 'custom' ? 'border-dashed' : '',
            activeKey === tile.key
              ? 'border-brand-600 text-brand-700 ring-1 ring-brand-600'
              : 'border-slate-200 text-slate-700 hover:border-brand-300',
          ]"
          @click="selectTile(tile)"
        >
          <svg
            v-if="previews[tile.key]"
            viewBox="0 0 100 100"
            class="h-full w-full"
            aria-hidden="true"
            shape-rendering="geometricPrecision"
          >
            <path :d="previews[tile.key]!.path" class="fill-slate-200" stroke="currentColor" stroke-width="4" stroke-linejoin="round" />
            <rect
              :x="previews[tile.key]!.field.x"
              :y="previews[tile.key]!.field.y"
              :width="previews[tile.key]!.field.size"
              :height="previews[tile.key]!.field.size"
              rx="1.5"
              fill="currentColor"
            />
          </svg>
          <Icon v-else name="lucide:file-up" class="h-4 w-4 text-brand-700" aria-hidden="true" />
        </button>
      </div>
      <p class="mt-1 truncate text-[11px] text-ink-muted">{{ activeLabel }}</p>
      <p class="field-help">
        A kód a legnagyobb befoglalható négyzetbe kerül, a többi részt ugyanolyan modulok töltik ki — a keret
        ilyenkor automatikusan kikapcsol.
      </p>
      <p v-if="!libraryShapes.length" class="field-help">
        Az admin «Alakzatok» oldalán feltöltött formák itt is megjelennek.
      </p>
    </fieldset>

    <div v-if="active !== 'none'" class="mt-3">
      <label for="qr-silhouette-border" class="field-label">
        Körvonal vastagsága: {{ borderWidth.toFixed(1) }} modul
      </label>
      <input
        id="qr-silhouette-border"
        type="range"
        min="0"
        max="3"
        step="0.1"
        class="w-full accent-brand-600"
        :value="borderWidth"
        @input="update('silhouetteBorderWidth', Number(($event.target as HTMLInputElement).value))"
      >
      <p class="field-help">0 esetén nincs körvonal; a vastagabb él hangsúlyosabb kontúrt ad az alakzatnak.</p>
    </div>

    <div class="mt-2 flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="btn-secondary px-3 py-1.5 text-xs"
        :disabled="uploading"
        @click="input?.click()"
      >
        <Icon name="lucide:upload" class="h-3.5 w-3.5" aria-hidden="true" />
        {{ uploading ? 'Feldolgozás…' : 'Alakzat feltöltése' }}
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
        accept=".svg,.png,.jpg,.jpeg,.webp,.gif,.bmp,image/svg+xml,image/png,image/jpeg,image/webp,image/gif,image/bmp"
        class="hidden"
        aria-label="Alakzat feltöltése képfájlból"
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
