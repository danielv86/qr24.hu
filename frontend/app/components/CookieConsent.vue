<script setup lang="ts">
const consent = useCookieConsent()
const { ensureConsentMode, updateConsent } = useAdsense()
const analytics = ref(false)
const marketing = ref(false)
const panel = ref<HTMLElement | null>(null)

function syncFromRecord() {
  analytics.value = Boolean(consent.record.value?.analytics)
  marketing.value = Boolean(consent.record.value?.marketing)
}

onMounted(() => {
  ensureConsentMode()
  syncFromRecord()
  updateConsent({ analytics: analytics.value, marketing: marketing.value })
})

watch(consent.showBanner, (visible) => {
  if (visible) syncFromRecord()
})

watch(consent.preferencesOpen, async (open) => {
  if (open && import.meta.client) {
    await nextTick()
    panel.value?.focus()
  }
})

function savePreferences() {
  consent.save({ analytics: analytics.value, marketing: marketing.value })
  updateConsent({ analytics: analytics.value, marketing: marketing.value })
}

function acceptAll() {
  consent.acceptAll()
  analytics.value = true
  marketing.value = true
  updateConsent({ analytics: true, marketing: true })
}

function rejectAll() {
  consent.rejectNonEssential()
  analytics.value = false
  marketing.value = false
  updateConsent({ analytics: false, marketing: false })
}

function closePreferences() {
  if (consent.hasDecision.value) consent.closePreferences()
}
</script>

<template>
  <section
    v-if="consent.showBanner.value"
    ref="panel"
    role="dialog"
    aria-modal="false"
    aria-labelledby="consent-title"
    class="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-surface/98 p-0 shadow-[0_-12px_40px_-24px_rgba(15,23,42,0.35)] backdrop-blur"
    tabindex="-1"
    @keydown.esc="closePreferences"
  >
    <div class="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="max-w-2xl">
          <div class="flex items-start gap-2">
            <Icon name="lucide:cookie" class="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
            <div>
              <h2 id="consent-title" class="text-base font-semibold text-ink">A te döntésed a sütikről</h2>
              <p class="mt-1 text-sm leading-relaxed text-ink-soft">
                A működéshez szükséges sütiket mindig használjuk. A statisztikai és hirdetési sütik
                csak a hozzájárulásoddal aktiválódnak. A döntést bármikor módosíthatod.
                <NuxtLink
                  to="/cookie-tajekoztato"
                  class="font-medium text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
                >
                  Cookie-tájékoztató
                </NuxtLink>
              </p>
            </div>
          </div>
        </div>

        <div class="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          <button type="button" class="btn-primary whitespace-nowrap px-4 py-2.5" @click="acceptAll">
            Elfogadom
          </button>
          <button type="button" class="btn-secondary whitespace-nowrap" @click="rejectAll">
            Csak a szükségesek
          </button>
          <button
            v-if="!consent.preferencesOpen.value"
            type="button"
            class="btn-ghost whitespace-nowrap"
            :aria-expanded="consent.preferencesOpen.value"
            aria-controls="consent-preferences"
            @click="consent.openPreferences"
          >
            Beállítások
          </button>
        </div>
      </div>

      <div
        v-if="consent.preferencesOpen.value"
        id="consent-preferences"
        class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
      >
        <div class="grid gap-3 sm:grid-cols-3">
          <label class="flex gap-3 rounded-lg bg-surface p-3 ring-1 ring-slate-200">
            <input type="checkbox" checked disabled class="mt-0.5 h-4 w-4 accent-brand-600" />
            <span>
              <span class="block text-sm font-medium text-ink">Szükséges</span>
              <span class="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                Biztonságos működés, consent állapot, admin munkamenet. Nem kapcsolható ki.
              </span>
            </span>
          </label>

          <label class="flex gap-3 rounded-lg bg-surface p-3 ring-1 ring-slate-200">
            <input v-model="analytics" type="checkbox" class="mt-0.5 h-4 w-4 accent-brand-600" />
            <span>
              <span class="block text-sm font-medium text-ink">Statisztika</span>
              <span class="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                Névtelen, összesített látogatottsági mérések engedélyezése.
              </span>
            </span>
          </label>

          <label class="flex gap-3 rounded-lg bg-surface p-3 ring-1 ring-slate-200">
            <input v-model="marketing" type="checkbox" class="mt-0.5 h-4 w-4 accent-brand-600" />
            <span>
              <span class="block text-sm font-medium text-ink">Hirdetések</span>
              <span class="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                Google AdSense hirdetések és személyre szabott hirdetési technológiák engedélyezése.
              </span>
            </span>
          </label>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" class="btn-primary px-4 py-2.5" @click="savePreferences">
            Beállítások mentése
          </button>
          <button type="button" class="btn-ghost" @click="acceptAll">Mindent elfogadok</button>
          <button v-if="consent.hasDecision.value" type="button" class="btn-ghost ml-auto" @click="closePreferences">
            Bezárás
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
