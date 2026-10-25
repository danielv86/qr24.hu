<script setup lang="ts">
import type { QrCustomization } from '#shared/qr/types'
import { renderQrSvg } from '~/utils/qr-render'

const props = withDefaults(defineProps<{
  data: string
  customization: QrCustomization
  label?: string
  size?: number
}>(), {
  label: '',
  size: 320,
})

const holder = ref<HTMLElement | null>(null)
const failed = ref(false)
let renderToken = 0

async function render() {
  if (!import.meta.client || !holder.value) return
  const token = ++renderToken
  try {
    const svg = await renderQrSvg(props.data, props.customization, props.size)
    if (token !== renderToken || !holder.value) return
    holder.value.innerHTML = svg
    failed.value = false
  } catch {
    failed.value = true
  }
}

watch(() => [props.data, props.customization, props.size], render, { deep: true })
onMounted(render)
</script>

<template>
  <figure class="min-w-0 text-center">
    <div ref="holder" class="w-full overflow-hidden rounded-lg border border-slate-200 bg-white p-2 [&>svg]:h-auto [&>svg]:w-full" />
    <p v-if="failed" class="mt-1 text-xs text-rose-600">A kód előnézete nem sikerült.</p>
    <figcaption class="mt-1.5 truncate text-xs font-medium text-ink-soft" :title="label">
      {{ label }}
    </figcaption>
  </figure>
</template>
