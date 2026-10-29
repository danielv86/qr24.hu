<script setup lang="ts">
import { customFramePath, customShapePath, isValidCustomShape } from '#shared/qr/custom-shape'
import type { CustomShape } from '#shared/qr/custom-shape'
import { bodyShapePath, eyeBallShapePath, eyeFrameShapePath } from '~/lib/qr/shapes'
import type { BodyPath, Neighbours } from '~/lib/qr/shapes'
import type { CornerDotStyle, CornerSquareStyle, DotStyle } from '#shared/qr/types'

interface ShapeOption {
  value: string
  label: string
}

const props = defineProps<{
  id: string
  label: string
  modelValue: string
  options: ShapeOption[]
  variant: 'body' | 'frame' | 'ball'
  /** A sarokbelső csempék háttere a kiválasztott sarokkeret-formát követi. */
  frameStyle?: CornerSquareStyle
  frameCustom?: CustomShape | null
  /** A sarokkeret csempéin belül a kiválasztott sarokbelső jelenik meg. */
  ballStyle?: CornerDotStyle
  ballCustom?: CustomShape | null
  /** A „Saját forma” csempéhez tartozó, felhasználó által rajzolt alakzat. */
  customShape?: CustomShape | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'edit-custom': []
  'edit-shape': [value: string]
}>()

/**
 * A készlet alapból csak két sort mutat, a többi a lista alatti „További formák”
 * hivatkozással nyílik le. Így a később hozzáadott formák sem nyújtják meg a
 * beállítási panelt.
 */
const gridRef = ref<HTMLElement | null>(null)
const expanded = ref(false)
const perRow = ref(0)

function measure() {
  if (!import.meta.client || !gridRef.value) return
  perRow.value = getComputedStyle(gridRef.value).gridTemplateColumns.split(' ').filter(Boolean).length
}

onMounted(() => {
  measure()
  const index = props.options.findIndex(option => option.value === props.modelValue)
  if (perRow.value > 0 && index >= perRow.value * 2) expanded.value = true
  window.addEventListener('resize', measure)
})

onBeforeUnmount(() => window.removeEventListener('resize', measure))

const limit = computed(() => (perRow.value > 0 ? perRow.value * 2 : props.options.length))
const hasMore = computed(() => props.options.length > limit.value)
const visibleOptions = computed(() =>
  expanded.value || !hasMore.value ? props.options : props.options.slice(0, limit.value),
)

/**
 * Mini QR-minta a csempéken: ugyanaz a 7 × 7-es modulrács, amit a referencia
 * oldal használ, így a csempék pontosan úgy néznek ki, mint ott.
 */
const SAMPLE = [
  '1110101',
  '1011110',
  '1101011',
  '0111101',
  '1010111',
  '1101100',
  '0111011',
]

const CELL = 10
const VIEW = CELL * 7

function at(row: number, column: number): boolean {
  return SAMPLE[row]?.[column] === '1'
}

function samplePaths(path: BodyPath): string {
  let d = ''
  for (let row = 0; row < SAMPLE.length; row += 1) {
    for (let column = 0; column < SAMPLE[row]!.length; column += 1) {
      if (!at(row, column)) continue
      const neighbours: Neighbours = {
        t: at(row - 1, column),
        b: at(row + 1, column),
        l: at(row, column - 1),
        r: at(row, column + 1),
        tl: at(row - 1, column - 1),
        tr: at(row - 1, column + 1),
        bl: at(row + 1, column - 1),
        br: at(row + 1, column + 1),
      }
      d += path(column * CELL, row * CELL, CELL, neighbours, row, column)
    }
  }
  return d
}

function samplePathsFromCustom(shape: CustomShape): string {
  let d = ''
  for (let row = 0; row < SAMPLE.length; row += 1) {
    for (let column = 0; column < SAMPLE[row]!.length; column += 1) {
      if (!at(row, column)) continue
      d += customShapePath(shape, column * CELL, row * CELL, CELL)
    }
  }
  return d
}

function mainPathFor(value: string): string {
  if (value === 'custom') {
    if (!isValidCustomShape(props.customShape)) return ''
    if (props.variant === 'body') return samplePathsFromCustom(props.customShape)
    if (props.variant === 'frame') return customFramePath(props.customShape, 0, 0, VIEW)
    return customShapePath(props.customShape, CELL * 2, CELL * 2, CELL * 3)
  }

  if (props.variant === 'body') return samplePaths(bodyShapePath(value as DotStyle))

  if (props.variant === 'frame') {
    const frame = eyeFrameShapePath(value as CornerSquareStyle)
    return frame(0, 0, VIEW, CELL)
  }

  const ball = eyeBallShapePath(value as CornerDotStyle)
  return ball(CELL * 2, CELL * 2, CELL * 3, CELL)
}

function selectOption(value: string) {
  // Üres saját forma esetén előbb a szerkesztő nyílik meg, a már kiválasztott
  // csempére kattintva pedig a meglévő forma szerkeszthető tovább.
  if (value === 'custom' && (!isValidCustomShape(props.customShape) || props.modelValue === 'custom')) {
    emit('edit-custom')
    return
  }
  emit('update:modelValue', value)
}

const isCustomOption = (value: string) => value === 'custom'

function framePreviewPath(): string {
  if (props.frameStyle === 'custom' && isValidCustomShape(props.frameCustom)) {
    return customFramePath(props.frameCustom, 0, 0, VIEW)
  }
  const style = (props.frameStyle ?? 'square') as CornerSquareStyle
  return eyeFrameShapePath(style)(0, 0, VIEW, CELL)
}

function ballPreviewPath(): string {
  if (props.ballStyle === 'custom' && isValidCustomShape(props.ballCustom)) {
    return customShapePath(props.ballCustom, CELL * 2, CELL * 2, CELL * 3)
  }
  const style = (props.ballStyle ?? 'dot') as CornerDotStyle
  return eyeBallShapePath(style)(CELL * 2, CELL * 2, CELL * 3, CELL)
}

/**
 * A csempék szürke háttere: a sarokbelsőnél a kiválasztott keret, a keretnél
 * a kiválasztott belső. Így a két választó egymást követi, ugyanazzal a szürkével.
 */
const backdropPath = computed(() => {
  if (props.variant === 'ball') return framePreviewPath()
  if (props.variant === 'frame') return ballPreviewPath()
  return ''
})

function optionLabel(value: string): string {
  return props.options.find(option => option.value === value)?.label || value
}
</script>

<template>
  <div>
    <p :id="`${id}-label`" class="mb-1.5 block text-[0.9rem] font-semibold text-ink-soft">{{ label }}</p>
    <div
      :id="id"
      ref="gridRef"
      class="qr-shape-grid"
      role="radiogroup"
      :aria-labelledby="`${id}-label`"
    >
      <button
        v-for="option in visibleOptions"
        :key="option.value"
        type="button"
        role="radio"
        :aria-checked="modelValue === option.value"
        :tabindex="modelValue === option.value ? 0 : -1"
        :title="option.label"
        :aria-label="option.label"
        :class="[
          'relative grid aspect-square place-items-center overflow-hidden rounded-md border bg-white p-[2px] text-slate-900 transition-colors',
          isCustomOption(option.value) ? 'border-dashed' : '',
          modelValue === option.value
            ? 'border-brand-600 text-brand-700 ring-1 ring-brand-600'
            : 'border-slate-200 hover:border-brand-300',
        ]"
        @click="selectOption(option.value)"
      >
        <Icon
          v-if="isCustomOption(option.value) && !isValidCustomShape(customShape)"
          name="lucide:pen-tool"
          class="h-4 w-4 text-brand-600"
          aria-hidden="true"
        />
        <svg
          v-if="!(isCustomOption(option.value) && !isValidCustomShape(customShape))"
          :viewBox="`0 0 ${VIEW} ${VIEW}`"
          fill="currentColor"
          shape-rendering="geometricPrecision"
          aria-hidden="true"
        >
          <!-- A keretek gyűrűk, ezért evenodd kell; a test és a mag formái viszont
               átfedhetik egymást, ahol a nonzero szabály ad helyes uniót. -->
          <path v-if="backdropPath" :d="backdropPath" fill="#E2E8F0" fill-rule="evenodd" />
          <path :d="mainPathFor(option.value)" :fill-rule="props.variant === 'frame' ? 'evenodd' : 'nonzero'" />
        </svg>
        <span
          v-if="(isCustomOption(option.value) && isValidCustomShape(customShape)) || modelValue === option.value"
          class="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded bg-white/95 text-brand-700 ring-1 ring-brand-200"
          title="Forma szerkesztése"
          @click.stop.prevent="isCustomOption(option.value) ? emit('edit-custom') : emit('edit-shape', option.value)"
        >
          <Icon name="lucide:pencil" class="h-2.5 w-2.5" aria-hidden="true" />
        </span>
      </button>
    </div>
    <p class="mt-1 truncate text-[11px] text-ink-muted">{{ optionLabel(modelValue) }}</p>

    <a
      v-if="hasMore"
      :href="`#${id}`"
      class="mt-1 inline-flex items-center gap-1 px-1 text-xs font-medium text-brand-700 hover:underline"
      :aria-expanded="expanded"
      @click.prevent="expanded = !expanded"
    >
      {{ expanded ? 'Kevesebb forma' : 'További formák' }}
      <Icon :name="expanded ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  </div>
</template>
