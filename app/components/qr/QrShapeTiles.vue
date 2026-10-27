<script setup lang="ts">
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
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

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

function mainPathFor(value: string): string {
  if (props.variant === 'body') return samplePaths(bodyShapePath(value as DotStyle))

  if (props.variant === 'frame') {
    const frame = eyeFrameShapePath(value as CornerSquareStyle)
    const ball = eyeBallShapePath('dot')
    return `${frame(0, 0, VIEW, CELL)}${ball(CELL * 2, CELL * 2, CELL * 3, CELL)}`
  }

  const ball = eyeBallShapePath(value as CornerDotStyle)
  return ball(CELL * 2, CELL * 2, CELL * 3, CELL)
}

/** A sarokbelső csempék szürke kerete – mindig az aktuális sarokkeret-forma. */
const backdropPath = computed(() => {
  if (props.variant !== 'ball') return ''
  const frame = eyeFrameShapePath((props.frameStyle ?? 'square') as CornerSquareStyle)
  return frame(0, 0, VIEW, CELL)
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
          'grid aspect-square place-items-center overflow-hidden rounded-md border bg-white p-[2px] text-slate-900 transition-colors',
          modelValue === option.value
            ? 'border-brand-600 text-brand-700 ring-1 ring-brand-600'
            : 'border-slate-200 hover:border-brand-300',
        ]"
        @click="emit('update:modelValue', option.value)"
      >
        <svg
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
