<script setup lang="ts">
import { DEFAULT_CUSTOMIZATION } from '~/lib/qr/customization'
import type { CornerDotStyle, CornerSquareStyle, DotStyle } from '#shared/qr/types'
import { buildQrContents } from '~/utils/qr-render'

const props = defineProps<{
  dotStyle: DotStyle
  cornerSquareStyle: CornerSquareStyle
  cornerDotStyle: CornerDotStyle
  color: string
  data?: string
  /** Kész márkalogó adat-URL-je, ha a kártyán is látszania kell. */
  logo?: string
}>()

const SIZE = 160

/**
 * Valódi, kicsinyített QR-kód a sablonkártyákhoz: ugyanaz a renderelő rajzolja,
 * mint az előnézetet, így a kártyán látható minta a választott formákat mutatja.
 */
const svg = computed(() => {
  const contents = buildQrContents(
    props.data || 'https://qrkod24.hu',
    {
      ...DEFAULT_CUSTOMIZATION,
      margin: 0,
      errorCorrection: 'L',
      bgColor: '#FFFFFF',
      transparentBackground: false,
      logo: '',
      dotStyle: props.dotStyle,
      cornerSquareStyle: props.cornerSquareStyle,
      cornerDotStyle: props.cornerDotStyle,
      cornerSquareColor: props.color,
      cornerDotColor: props.color,
      bodyFill: { ...DEFAULT_CUSTOMIZATION.bodyFill, kind: 'solid', color: props.color },
    },
    SIZE,
  )
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" class="h-full w-full"><rect width="${SIZE}" height="${SIZE}" fill="#FFFFFF"/>${contents}</svg>`
})
</script>

<template>
  <span class="relative block h-full w-full" aria-hidden="true">
    <span class="block h-full w-full" v-html="svg" />
    <img
      v-if="logo"
      :src="logo"
      alt=""
      class="absolute left-1/2 top-1/2 w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-[22%]"
    >
  </span>
</template>
