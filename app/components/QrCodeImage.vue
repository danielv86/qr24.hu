<script setup lang="ts">
interface QrInstance {
  update: (options: unknown) => void
  append: (element: HTMLElement) => void
}

const props = withDefaults(
  defineProps<{
    data: string
    size?: number
    alt?: string
  }>(),
  {
    size: 320,
    alt: 'QR-kód',
  },
)

const container = ref<HTMLElement | null>(null)
const failed = ref(false)
let instance: QrInstance | null = null
let token = 0

function options(data: string) {
  return {
    type: 'svg' as const,
    width: props.size,
    height: props.size,
    margin: Math.round(props.size * 0.04),
    data,
    qrOptions: { errorCorrectionLevel: 'Q' as const },
    dotsOptions: { type: 'rounded' as const, color: '#0F172A' },
    cornersSquareOptions: { type: 'extra-rounded' as const, color: '#0F172A' },
    cornersDotOptions: { type: 'dot' as const, color: '#0F172A' },
    backgroundOptions: { color: '#FFFFFF' },
  }
}

async function render() {
  if (!import.meta.client || !props.data || !container.value) return
  const currentToken = ++token
  failed.value = false
  try {
    if (!instance) {
      const { default: QRCodeStyling } = await import('qr-code-styling')
      if (currentToken !== token || !container.value) return
      instance = new QRCodeStyling(options(props.data)) as unknown as QrInstance
      container.value.innerHTML = ''
      instance.append(container.value)
    } else {
      instance.update(options(props.data))
    }
  } catch {
    failed.value = true
  }
}

onMounted(render)
watch(() => [props.data, props.size], render)
</script>

<template>
  <div
    class="mx-auto flex aspect-square w-full max-w-[20rem] items-center justify-center rounded-xl border border-slate-200 bg-surface p-2"
    role="img"
    :aria-label="alt"
  >
    <div ref="container" class="w-full [&>svg]:h-auto [&>svg]:w-full" aria-hidden="true" />
    <p v-if="failed" class="text-sm text-red-600">A QR-kód előnézete nem tölthető be.</p>
  </div>
</template>
