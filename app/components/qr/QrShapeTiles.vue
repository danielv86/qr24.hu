<script setup lang="ts">
import { bodyShapePath, eyeBallShapePath, eyeFrameShapePath } from '~/lib/qr/shapes'
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

/** Mini QR-minta a csempékhez: sötét modulok 9 × 9-es rácson. */
const SAMPLE = [
  '111001111',
  '101001001',
  '111001111',
  '000110000',
  '101101101',
  '011010010',
  '111001111',
  '100101001',
  '111001111',
]

const CELL = 3
const VIEW = CELL * 9

/** A kirajzolt alakot a 27 × 27-es nézet közepére igazítja. */
function centered(size: number): number {
  return (VIEW - size) / 2
}

function samplePaths(path: (x: number, y: number, s: number) => string): string {
  let d = ''
  SAMPLE.forEach((row, rowIndex) => {
    row.split('').forEach((bit, columnIndex) => {
      if (bit !== '1') return
      d += path(columnIndex * CELL, rowIndex * CELL, CELL)
    })
  })
  return d
}

function mainPathFor(value: string): string {
  if (props.variant === 'body') return samplePaths(bodyShapePath(value as DotStyle))

  if (props.variant === 'frame') {
    const frame = eyeFrameShapePath(value as CornerSquareStyle)
    const ball = eyeBallShapePath('dot')
    const size = CELL * 7
    const offset = centered(size)
    return `${frame(offset, offset, size)}${ball(offset + CELL * 2, offset + CELL * 2, CELL * 3)}`
  }

  const ball = eyeBallShapePath(value as CornerDotStyle)
  const size = CELL * 3
  const offset = centered(size)
  return ball(offset, offset, size)
}

/** A sarokbelső csempék szürke kerete – mindig az aktuális sarokkeret-forma. */
const backdropPath = computed(() => {
  if (props.variant !== 'ball') return ''
  const frame = eyeFrameShapePath((props.frameStyle ?? 'square') as CornerSquareStyle)
  return frame(0, 0, VIEW)
})

function optionLabel(value: string): string {
  return props.options.find(option => option.value === value)?.label || value
}
</script>

<template>
  <div>
    <p :id="`${id}-label`" class="field-label">{{ label }}</p>
    <div
      :id="id"
      class="qr-shape-grid"
      role="radiogroup"
      :aria-labelledby="`${id}-label`"
    >
      <button
        v-for="option in props.options"
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
          fill-rule="evenodd"
          shape-rendering="geometricPrecision"
          aria-hidden="true"
        >
          <path v-if="backdropPath" :d="backdropPath" fill="#E2E8F0" />
          <path :d="mainPathFor(option.value)" />
        </svg>
      </button>
    </div>
    <p class="mt-1 truncate text-[11px] text-ink-muted">{{ optionLabel(modelValue) }}</p>
  </div>
</template>
