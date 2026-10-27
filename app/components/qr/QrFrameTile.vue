<script setup lang="ts">
import { DEFAULT_CUSTOMIZATION } from '~/lib/qr/customization'
import { buildFramedSvg } from '~/utils/qr-frame'
import { buildQrContents } from '~/utils/qr-render'
import type { FramePreset } from '#shared/qr/types'

const props = defineProps<{
  frame: FramePreset
  caption?: string
}>()

const SIZE = 96

/**
 * A keretválasztó csempe: ugyanaz a renderelő rajzolja, mint az előnézetet,
 * így a csempe mindig a valódi keretformát mutatja.
 */
const svg = computed(() => {
  const options = {
    ...DEFAULT_CUSTOMIZATION,
    frame: props.frame,
    margin: 0,
    errorCorrection: 'L' as const,
    bgColor: '#FFFFFF',
    transparentBackground: false,
    logo: '',
    logoName: '',
    frameText: props.caption ?? 'Címke',
    frameSubtitle: '',
    frameColor: '#0F172A',
    frameFill: { ...DEFAULT_CUSTOMIZATION.frameFill, color: '#0F172A' },
    labelColor: '#0F172A',
    labelTextColor: '#FFFFFF',
    frameFontScale: 1.15,
  }
  const inner = buildQrContents('https://qrkod24.hu', options, SIZE)
  return buildFramedSvg(inner, options, SIZE)
})
</script>

<template>
  <span class="block h-full w-full [&>svg]:mx-auto [&>svg]:h-full [&>svg]:w-auto" aria-hidden="true" v-html="svg" />
</template>
