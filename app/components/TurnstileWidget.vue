<script setup lang="ts">
/**
 * Cloudflare Turnstile robotellenőrzés.
 *
 * Csak akkor jelenik meg, ha a `NUXT_PUBLIC_TURNSTILE_SITE_KEY` be van állítva,
 * tehát a beállítás előtt semmi nem törik el. A token egyszer használható:
 * sikertelen beküldés után a szülőnek hívnia kell a `reset()` metódust.
 */
interface TurnstileApi {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
  reset: (widgetId?: string) => void
  remove: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const props = withDefaults(
  defineProps<{
    modelValue?: string
    action?: string
    theme?: 'auto' | 'light' | 'dark'
    language?: string
  }>(),
  { modelValue: '', action: '', theme: 'auto', language: 'hu' },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const SCRIPT_ID = 'cf-turnstile-script'
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

const siteKey = computed(() => String(useRuntimeConfig().public.turnstile?.siteKey || '').trim())
const configured = computed(() => Boolean(siteKey.value))

const container = ref<HTMLElement | null>(null)
const widgetId = ref('')

function loadScript(): Promise<void> {
  if (import.meta.server) return Promise.resolve()
  if (window.turnstile) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('turnstile_script_failed')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('turnstile_script_failed')), { once: true })
    document.head.appendChild(script)
  })
}

async function mountWidget() {
  if (!configured.value || !container.value) return
  try {
    await loadScript()
    if (!window.turnstile || !container.value) return
    widgetId.value = window.turnstile.render(container.value, {
      sitekey: siteKey.value,
      action: props.action || undefined,
      theme: props.theme,
      language: props.language,
      callback: (token: string) => emit('update:modelValue', token),
      'expired-callback': () => emit('update:modelValue', ''),
      'error-callback': () => emit('update:modelValue', ''),
    })
  } catch {
    // Ha a szkript nem töltődik be, a szerveroldali ellenőrzés ad értelmes hibát.
    emit('update:modelValue', '')
  }
}

/** Új token kérése (a régi egyszer használható). */
function reset() {
  emit('update:modelValue', '')
  if (window.turnstile && widgetId.value) window.turnstile.reset(widgetId.value)
}

onMounted(mountWidget)

onBeforeUnmount(() => {
  if (window.turnstile && widgetId.value) {
    try {
      window.turnstile.remove(widgetId.value)
    } catch {
      // A widget már eltűnt a DOM-ból.
    }
  }
})

defineExpose({ reset })
</script>

<template>
  <div v-if="siteKey" class="min-h-[65px]">
    <div ref="container" />
  </div>
</template>
