<script setup lang="ts">
import type { ApiSuccess, PublicSettings } from '#shared/types/api'
import { LIBRARY_SHAPE_MAX_COUNT } from '#shared/qr/library-shape'
import type { LibraryShape } from '#shared/qr/library-shape'
import type { ShapePoint } from '#shared/qr/custom-shape'
import { fitSquareInside, pointsToPath } from '#shared/qr/silhouette'
import { ShapeImportError, importShapeFromImage, importShapeFromSvg, shapeFileKind } from '~/lib/qr/shape-import'

definePageMeta({ layout: 'admin' })

useSeoMeta({
  title: 'Alakzatok | Admin',
  robots: 'noindex, nofollow',
})

const { session } = useAdminSession()

const shapes = ref<LibraryShape[]>([])
const loading = ref(false)
const uploading = ref(false)
const error = ref('')
const message = ref('')
const label = ref('')
const input = ref<HTMLInputElement | null>(null)
const pendingDelete = ref('')

const previews = computed(() =>
  Object.fromEntries(shapes.value.map(shape => [shape.id, previewOf(shape.points)])),
)

function previewOf(points: ShapePoint[]) {
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

function applySettings(data: PublicSettings) {
  shapes.value = data.silhouetteShapes ?? []
}

async function loadShapes() {
  loading.value = true
  error.value = ''
  try {
    const response = await $fetch<ApiSuccess<PublicSettings>>('/api/admin/settings')
    applySettings(response.data)
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Az alakzatok betöltése nem sikerült.')
  } finally {
    loading.value = false
  }
}

async function onFileSelected(event: Event) {
  const element = event.target as HTMLInputElement
  const file = element.files?.[0]
  element.value = ''
  if (!file) return

  const kind = shapeFileKind(file)
  if (!kind) {
    error.value = 'Csak SVG, PNG, JPG, WebP vagy GIF tölthető fel.'
    return
  }

  uploading.value = true
  error.value = ''
  message.value = ''
  try {
    const points = kind === 'svg' ? await importShapeFromSvg(file) : await importShapeFromImage(file)
    const name = label.value.trim() || file.name.replace(/\.[^.]+$/, '').slice(0, 48)
    const response = await $fetch<ApiSuccess<PublicSettings>>('/api/admin/shapes', {
      method: 'POST',
      body: { label: name, points },
    })
    applySettings(response.data)
    label.value = ''
    message.value = 'Az alakzat feltöltve. A generátor Alakzat választójában azonnal megjelenik.'
    await refreshNuxtData('public-settings')
  } catch (caught) {
    error.value =
      caught instanceof ShapeImportError
        ? caught.message
        : apiErrorMessage(caught, 'Az alakzat feltöltése nem sikerült.')
  } finally {
    uploading.value = false
  }
}

async function removeShape(shape: LibraryShape) {
  if (pendingDelete.value !== shape.id) {
    pendingDelete.value = shape.id
    return
  }
  pendingDelete.value = ''
  error.value = ''
  message.value = ''
  try {
    const response = await $fetch<ApiSuccess<PublicSettings>>('/api/admin/shapes', {
      method: 'DELETE',
      body: { id: shape.id },
    })
    applySettings(response.data)
    message.value = `„${shape.label}” törölve.`
    await refreshNuxtData('public-settings')
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Az alakzat törlése nem sikerült.')
  }
}

watch(
  session,
  (value) => {
    if (value) loadShapes()
  },
  { immediate: true },
)
</script>

<template>
  <AdminPageLayout title="Alakzatok">
    <template #actions>
      <form class="flex flex-wrap items-center gap-2" @submit.prevent="input?.click()">
        <input
          id="shape-label"
          v-model="label"
          type="text"
          maxlength="48"
          placeholder="Alakzat neve"
          aria-label="Alakzat neve"
          class="field-input w-40 py-2 text-sm"
        >
        <button type="submit" class="btn-primary" :disabled="uploading">
          <Icon
            :name="uploading ? 'lucide:loader-circle' : 'lucide:upload'"
            :class="['h-4 w-4', { 'animate-spin': uploading }]"
            aria-hidden="true"
          />
          {{ uploading ? 'Feldolgozás…' : 'Feltöltés' }}
        </button>
        <input
          ref="input"
          type="file"
          accept=".svg,.png,.jpg,.jpeg,.webp,.gif,.bmp,image/svg+xml,image/png,image/jpeg,image/webp,image/gif,image/bmp"
          class="hidden"
          aria-label="Alakzat kiválasztása"
          @change="onFileSelected"
        >
      </form>
    </template>

    <p v-if="error" class="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300" role="alert">{{ error }}</p>
    <p v-if="message" class="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300" role="status">{{ message }}</p>

      <div class="card p-4">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-semibold text-ink">Feltöltött alakzatok</h2>
          <span class="text-[11px] text-ink-muted">{{ shapes.length }} / {{ LIBRARY_SHAPE_MAX_COUNT }}</span>
        </div>

        <p v-if="loading" class="mt-3 text-sm text-ink-muted">Betöltés…</p>
        <p v-else-if="!shapes.length" class="mt-3 rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-ink-muted">
          Még nincs feltöltött alakzat.
        </p>
        <ul v-else class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          <li v-for="shape in shapes" :key="shape.id" class="rounded-xl border border-slate-200 bg-slate-50 p-2">
            <svg viewBox="0 0 100 100" class="aspect-square w-full" aria-hidden="true" shape-rendering="geometricPrecision">
              <path
                :d="previews[shape.id]!.path"
                class="fill-slate-200 text-slate-700"
                stroke="currentColor"
                stroke-width="4"
                stroke-linejoin="round"
              />
              <rect
                :x="previews[shape.id]!.field.x"
                :y="previews[shape.id]!.field.y"
                :width="previews[shape.id]!.field.size"
                :height="previews[shape.id]!.field.size"
                fill="currentColor"
                class="text-slate-700"
              />
            </svg>
            <p class="mt-2 truncate text-xs font-medium text-ink" :title="shape.label">{{ shape.label }}</p>
            <button
              type="button"
              :class="[
                'mt-1 text-[11px] font-semibold',
                pendingDelete === shape.id ? 'text-red-700 dark:text-red-300' : 'text-ink-muted hover:text-red-700 dark:text-red-300',
              ]"
              @click="removeShape(shape)"
            >
              {{ pendingDelete === shape.id ? 'Biztosan törlöd?' : 'Törlés' }}
            </button>
          </li>
        </ul>
    </div>
  </AdminPageLayout>
</template>
