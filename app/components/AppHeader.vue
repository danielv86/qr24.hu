<script setup lang="ts">
const open = ref(false)
const route = useRoute()
const { t } = useI18n()
const localePath = useLocalePath()
const { user } = useUserSession()

/** A főoldalon a fejléc a fejlécsáv képére simul, görgetés után kap hátteret. */
const scrolled = ref(false)
const overHero = computed(() => route.name === 'index' && !scrolled.value)

let stopScrollListener: (() => void) | undefined

onMounted(() => {
  const onScroll = () => {
    scrolled.value = window.scrollY > 12
  }
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('click', onDocumentClick)
  stopScrollListener = () => {
    window.removeEventListener('scroll', onScroll)
    document.removeEventListener('click', onDocumentClick)
  }
})

const mainLinks = computed(() => [
  { label: t('nav.generator'), to: localePath('/qr-kod-generator') },
  { label: t('nav.bulk'), to: localePath('/tomeges-qr-kod-generator') },
  { label: t('nav.pricing'), to: localePath('/csomagok') },
])

/** Az „App” menü: eszközök, amelyek a generátoron túl segítenek. */
const appLinks = computed(() => [
  { label: t('nav.scanner'), to: localePath('/qr-kod-olvaso'), icon: 'lucide:scan-line' },
  { label: t('nav.sizeCalculator'), to: localePath('/qr-kod-meret-kalkulator'), icon: 'lucide:ruler' },
])

/** Az „Információk” menü tartalma: típusok, útmutató és GYIK. */
const infoLinks = computed(() => [
  { label: t('nav.types'), to: localePath('/qr-kod-tipusok'), icon: 'lucide:shapes' },
  { label: t('nav.guides'), to: localePath('/qr-kod-keszites'), icon: 'lucide:book-open' },
  { label: t('nav.faq'), to: localePath('/qr-kod-generator') + '#gyik', icon: 'lucide:help-circle' },
])

const appOpen = ref(false)
const appRoot = ref<HTMLElement | null>(null)
const infoOpen = ref(false)
const infoRoot = ref<HTMLElement | null>(null)

function onDocumentClick(event: MouseEvent) {
  const target = event.target as Node
  if (infoOpen.value && infoRoot.value && !infoRoot.value.contains(target)) infoOpen.value = false
  if (appOpen.value && appRoot.value && !appRoot.value.contains(target)) appOpen.value = false
}

watch(() => route.fullPath, () => {
  open.value = false
  infoOpen.value = false
  appOpen.value = false
})

watch(open, (value) => {
  if (!import.meta.client) return
  document.documentElement.classList.toggle('overflow-hidden', value)
})

onBeforeUnmount(() => {
  stopScrollListener?.()
  if (import.meta.client) document.documentElement.classList.remove('overflow-hidden')
})
</script>

<template>
  <header
    :class="[
      'sticky top-0 z-40 border-b transition-colors',
      overHero
        ? 'border-transparent bg-transparent'
        : 'border-slate-200/80 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80',
    ]"
  >
    <div class="container-page flex h-24 items-center gap-3 lg:gap-6">
      <AppLogo class="shrink-0" />

      <nav class="hidden items-center gap-1 lg:flex" :aria-label="t('nav.mainLabel')">
        <NuxtLink
          v-for="link in mainLinks"
          :key="link.to"
          :to="link.to"
          class="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-800"
        >
          {{ link.label }}
        </NuxtLink>

        <div ref="appRoot" class="relative">
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-800"
            aria-haspopup="menu"
            :aria-expanded="appOpen"
            aria-controls="header-app-menu"
            @click="appOpen = !appOpen"
            @keydown.esc="appOpen = false"
          >
            {{ t('nav.app') }}
            <Icon name="lucide:chevron-down" class="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <div
            v-if="appOpen"
            id="header-app-menu"
            role="menu"
            :aria-label="t('nav.app')"
            class="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-xl border border-slate-200 bg-surface py-1 shadow-lift"
          >
            <NuxtLink
              v-for="link in appLinks"
              :key="link.to"
              :to="link.to"
              role="menuitem"
              class="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink-soft hover:bg-slate-50 hover:text-brand-800"
              @click="appOpen = false"
            >
              <Icon :name="link.icon" class="h-4 w-4 text-brand-600" aria-hidden="true" />
              {{ link.label }}
            </NuxtLink>
          </div>
        </div>

        <div ref="infoRoot" class="relative">
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-800"
            aria-haspopup="menu"
            :aria-expanded="infoOpen"
            aria-controls="header-info-menu"
            @click="infoOpen = !infoOpen"
            @keydown.esc="infoOpen = false"
          >
            {{ t('nav.info') }}
            <Icon name="lucide:chevron-down" class="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <div
            v-if="infoOpen"
            id="header-info-menu"
            role="menu"
            :aria-label="t('nav.info')"
            class="absolute left-0 top-full z-50 mt-1 w-60 overflow-hidden rounded-xl border border-slate-200 bg-surface py-1 shadow-lift"
          >
            <NuxtLink
              v-for="link in infoLinks"
              :key="link.to"
              :to="link.to"
              role="menuitem"
              class="flex items-center gap-2 px-3.5 py-2.5 text-sm text-ink-soft hover:bg-slate-50 hover:text-brand-800"
              @click="infoOpen = false"
            >
              {{ link.label }}
            </NuxtLink>
          </div>
        </div>
      </nav>

      <div class="ml-auto flex items-center gap-2">
        <LanguageSwitcher />

        <NuxtLink
          v-if="user"
          :to="localePath('/fiok')"
          class="btn-primary hidden h-10 px-4 text-sm sm:inline-flex"
        >
          {{ t('actions.myAccount') }}
        </NuxtLink>
        <NuxtLink
          v-else
          :to="localePath('/belepes')"
          class="btn-secondary hidden h-10 px-3.5 sm:inline-flex"
        >
          {{ t('actions.signIn') }}
        </NuxtLink>

        <ThemeToggle />

        <button
          type="button"
          class="btn-ghost h-10 w-10 p-0 lg:hidden"
          :aria-expanded="open"
          aria-controls="mobile-navigation"
          :aria-label="open ? t('actions.closeMenu') : t('actions.openMenu')"
          @click="open = !open"
        >
          <Icon :name="open ? 'lucide:x' : 'lucide:menu'" class="h-5 w-5" />
        </button>
      </div>
    </div>

    <nav
      v-if="open"
      id="mobile-navigation"
      class="border-t border-slate-200 bg-surface lg:hidden"
      :aria-label="t('nav.mobileLabel')"
      @keydown.esc="open = false"
    >
      <div class="container-page flex flex-col py-3">
        <NuxtLink
          v-for="link in mainLinks"
          :key="link.to"
          :to="link.to"
          class="rounded-xl px-3 py-3 text-base font-medium text-ink-soft hover:bg-brand-50 hover:text-brand-800"
        >
          {{ link.label }}
        </NuxtLink>

        <p class="mt-2 px-3 pt-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {{ t('nav.app') }}
        </p>
        <NuxtLink
          v-for="link in appLinks"
          :key="`app-${link.to}`"
          :to="link.to"
          class="flex items-center gap-2 rounded-xl px-3 py-2.5 text-base font-medium text-ink-soft hover:bg-brand-50 hover:text-brand-800"
        >
          <Icon :name="link.icon" class="h-4 w-4 text-brand-600" aria-hidden="true" />
          {{ link.label }}
        </NuxtLink>

        <p class="mt-2 px-3 pt-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {{ t('nav.info') }}
        </p>
        <NuxtLink
          v-for="link in infoLinks"
          :key="`info-${link.to}`"
          :to="link.to"
          class="rounded-xl px-3 py-2.5 text-base font-medium text-ink-soft hover:bg-brand-50 hover:text-brand-800"
        >
          {{ link.label }}
        </NuxtLink>
        <NuxtLink
          :to="localePath('/dinamikus-qr-kod')"
          class="mt-2 rounded-xl bg-brand-50 px-3 py-3 text-base font-semibold text-brand-800"
        >
          {{ t('nav.dynamic') }}
        </NuxtLink>
        <NuxtLink
          v-if="user"
          :to="localePath('/fiok')"
          class="btn-primary mt-2 justify-center"
        >
          {{ t('actions.myAccount') }}
        </NuxtLink>
        <NuxtLink
          v-else
          :to="localePath('/belepes')"
          class="btn-secondary mt-2 justify-center"
        >
          {{ t('actions.signIn') }}
        </NuxtLink>
      </div>
    </nav>
  </header>
</template>
