<script setup lang="ts">
import type { AdsenseSlots } from '~/types/api'

const props = withDefaults(
  defineProps<{
    placement: keyof AdsenseSlots
    format?: string
    minHeight?: number
  }>(),
  {
    format: 'auto',
    minHeight: 0,
  },
)

const { adsense } = useSiteSettings()
const consent = useCookieConsent()
const { ensureConsentMode, updateConsent, loadScript, scriptState } = useAdsense()

const ins = ref<HTMLElement | null>(null)
const pushed = ref(false)
const isDev = import.meta.dev

const clientId = computed(() => adsense.value.client.trim())
const slotId = computed(() => adsense.value.slots[props.placement]?.trim() || '')
const configured = computed(() => Boolean(clientId.value && slotId.value))
const canShow = computed(
  () => consent.hasDecision.value && consent.marketingAllowed.value && configured.value && scriptState.value !== 'error',
)

const dimensionLabel = computed(() => {
  const map: Record<keyof AdsenseSlots, string> = {
    top: '728 × 90 / responsive',
    sidebar: '300 × 600',
    content: '336 × 280 / responsive',
    guide: '728 × 90 / responsive',
    mobile: '320 × 100 / responsive',
  }
  return map[props.placement]
})

function pushAd() {
  if (!import.meta.client || pushed.value || !ins.value) return
  try {
    const ads = (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle || []
    ;(window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle = ads
    ads.push({})
    pushed.value = true
  } catch {
    // Ad blocker vagy a script hiánya nem törheti meg az oldalt.
  }
}

async function prepare() {
  if (!consent.hasDecision.value) return
  ensureConsentMode()
  updateConsent({
    analytics: consent.analyticsAllowed.value,
    marketing: consent.marketingAllowed.value,
  })
  if (!consent.marketingAllowed.value || !configured.value) return
  await loadScript(clientId.value)
  await nextTick()
  pushAd()
}

onMounted(() => {
  prepare()
})

watch(
  () => [consent.hasDecision.value, consent.marketingAllowed.value, configured.value],
  () => {
    prepare()
  },
)
</script>

<template>
  <aside
    v-if="!configured && isDev"
    class="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-3 py-4 text-center"
    :style="minHeight ? { minHeight: `${minHeight}px` } : undefined"
    aria-label="Hirdetési hely előnézete fejlesztői módban"
    data-ad-placeholder
  >
    <span class="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Hirdetés</span>
    <span class="mt-1 text-xs font-medium text-slate-500">Hirdetési hely – {{ placement }}</span>
    <span class="mt-0.5 text-[11px] text-slate-400">{{ dimensionLabel }}</span>
  </aside>

  <aside
    v-else-if="configured && canShow"
    class="ad-container"
    aria-label="Hirdetés"
  >
    <span class="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">Hirdetés</span>
    <ins
      ref="ins"
      class="adsbygoogle block w-full"
      :style="{ display: 'block', minHeight: minHeight ? `${minHeight}px` : undefined }"
      :data-ad-client="clientId"
      :data-ad-slot="slotId"
      :data-ad-format="format"
      data-full-width-responsive="true"
    />
  </aside>

  <div
    v-else-if="configured && !consent.marketingAllowed.value && isDev"
    class="rounded-xl border border-dashed border-slate-200 bg-surface/60 px-3 py-3 text-center text-[11px] text-slate-400"
    :style="minHeight ? { minHeight: `${minHeight}px` } : undefined"
  >
    A hirdetés a marketing-hozzájárulás után jelenik meg.
  </div>
</template>
