<script setup lang="ts">
import { getBrandLogoDataUrl } from '~/lib/qr/social-logos'
import type { QrDesignTemplate } from '#shared/qr/types'

const props = defineProps<{ template: QrDesignTemplate; active: boolean }>()
const emit = defineEmits<{ select: [template: QrDesignTemplate] }>()

function framePreviewClass(frame: QrDesignTemplate['frame']): string {
  if (frame === 'circle') return 'rounded-full'
  if (frame === 'card') return 'rounded-md'
  if (frame === 'corners') return 'rounded-none'
  return 'rounded-[4px]'
}
</script>

<template>
  <button
    type="button"
    :aria-pressed="props.active"
    :title="`${props.template.name} – ${props.template.hint}`"
    :class="[
      'flex h-full min-w-0 flex-col rounded-xl border bg-surface p-1.5 text-center transition-colors',
      props.active ? 'border-brand-600 ring-2 ring-brand-600/20' : 'border-slate-200 hover:border-brand-300',
    ]"
    @click="emit('select', props.template)"
  >
    <span
      :class="[
        'flex w-full flex-col items-center justify-center overflow-hidden p-1.5',
        framePreviewClass(props.template.frame),
      ]"
      :style="{
        backgroundColor:
          props.template.frame === 'card' || props.template.frame === 'circle'
            ? props.template.frameColor
            : '#F8FAFC',
        containerType: 'inline-size',
      }"
      aria-hidden="true"
    >
      <span class="block aspect-square w-full rounded-[4px] bg-white p-[3px]">
        <QrMiniCode
          :dot-style="props.template.dotStyle"
          :corner-square-style="props.template.cornerSquareStyle"
          :corner-dot-style="props.template.cornerDotStyle"
          :color="props.template.fgColor"
          :logo="getBrandLogoDataUrl(props.template.logo)"
          class="h-full w-full"
        />
      </span>
      <span
        v-if="props.template.frameText"
        class="mt-1 block max-w-full truncate rounded-full px-1.5 font-bold leading-[1.8]"
        :style="{
          backgroundColor: props.template.labelColor,
          color: props.template.labelTextColor,
          fontSize: 'clamp(4px, 7cqw, 9px)',
        }"
      >
        {{ props.template.frameText }}
      </span>
    </span>
    <span class="mt-auto block w-full truncate pt-1.5 text-[11px] font-medium leading-tight text-ink">
      {{ props.template.name }}
    </span>
  </button>
</template>
