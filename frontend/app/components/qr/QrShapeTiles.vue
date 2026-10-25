<script setup lang="ts">
import { bodyShapePath, eyeBallShapePath, eyeFrameShapePath } from '#shared/qr/shapes'
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

function previewPath(value: string): string {
  if (props.variant === 'body') {
    const path = bodyShapePath(value as DotStyle)
    return samplePaths(path)
  }
  if (props.variant === 'frame') {
    const path = eyeFrameShapePath(value as CornerSquareStyle)
    const ball = eyeBallShapePath('dot')
    const size = CELL * 7
    return `${path(0, 0, size)}${ball(CELL * 2, CELL * 2, CELL * 3)}`
  }
  const path = eyeBallShapePath(value as CornerDotStyle)
  return path(CELL, CELL, CELL * 3)
}

function optionLabel(value: string): string {
  return props.options.find(option => option.value === value)?.label || value
}
</script>

<template>
  <div>
    <p :id="`${id}-label`" class="field-label">{{ label }}</p>
    <div
      :id="id"
      class="grid grid-cols-7 gap-1"
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
          'grid aspect-square place-items-center rounded-lg border bg-white p-0.5 transition-colors',
          modelValue === option.value
            ? 'border-brand-600 text-brand-700 ring-1 ring-brand-600'
            : 'border-slate-200 text-ink hover:border-brand-300',
        ]"
        @click="emit('update:modelValue', option.value)"
      >
        <svg
          viewBox="0 0 27 27"
          class="h-full w-full"
          fill="currentColor"
          fill-rule="evenodd"
          aria-hidden="true"
        >
          <path :d="previewPath(option.value)" />
        </svg>
      </button>
    </div>
    <p class="mt-1 truncate text-[11px] text-ink-muted">{{ optionLabel(modelValue) }}</p>
  </div>
</template>
