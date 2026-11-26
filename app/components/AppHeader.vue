<script setup lang="ts">
import { QR_MENU_ORDER, getQrType } from '#shared/qr/content'
import { QR_TYPE_PATHS } from '#shared/content/type-pages'

const open = ref(false)
const route = useRoute()
const { t } = useI18n()
const localePath = useLocalePath()
const { user } = useUserSession()

/** A generátor oldalain (főoldal, /qr-kod-generator) a fejléc a fejlécsáv
 * képére simul, görgetés után kap hátteret. */
const scrolled = ref(false)
const transparentRoutes = computed(() => [localePath('/'), localePath('/qr-kod-generator')])
const overHero = computed(() => transparentRoutes.value.includes(route.path) && !scrolled.value)

let stopScrollListener: (() => void) | undefined

/**
 * A két küszöb szándékosan eltér: a fejléc összehúzódása 32 px-et mozdít a tartalmon,
 * amit a böngésző görgetés-rögzítése visszakorrigál — egyetlen küszöbnél ez folyamatos
 * oda-vissza váltást (remegést) okoz a határ körül.
 */
const COMPACT_AT = 96
const EXPAND_AT = 24

function updateScrolled() {
  const y = window.scrollY
  if (!scrolled.value && y > COMPACT_AT) scrolled.value = true
  else if (scrolled.value && y < EXPAND_AT) scrolled.value = false
}

onMounted(() => {
  updateScrolled()
  window.addEventListener('scroll', updateScrolled, { passive: true })
  document.addEventListener('click', onDocumentClick)
  stopScrollListener = () => {
    window.removeEventListener('scroll', updateScrolled)
    document.removeEventListener('click', onDocumentClick)
  }
})

const mainLinks = computed(() => [
  { label: t('nav.generator'), to: localePath('/qr-kod-generator') },
  { label: t('nav.bulk'), to: localePath('/tomeges-qr-kod-generator') },
  { label: t('nav.pricing'), to: localePath('/csomagok') },
  { label: t('nav.blog'), to: localePath('/blog') },
])

/** Az „App” menü: eszközök, amelyek a generátoron túl segítenek. */
const appLinks = computed(() => [
  { label: t('nav.shapeEditor'), to: localePath('/forma-szerkeszto'), icon: 'lucide:pen-tool' },
  { label: t('nav.scanner'), to: localePath('/qr-kod-olvaso'), icon: 'lucide:scan-line' },
  { label: t('nav.sizeCalculator'), to: localePath('/qr-kod-meret-kalkulator'), icon: 'lucide:ruler' },
])

/** Az „Információk” menü tartalma: típusok, útmutató és GYIK. */
const infoLinks = computed(() => [
  { label: t('nav.types'), to: localePath('/qr-kod-tipusok'), icon: 'lucide:shapes' },
  { label: t('nav.guides'), to: localePath('/qr-kod-keszites'), icon: 'lucide:book-open' },
  { label: t('nav.faq'), to: localePath('/qr-kod-generator') + '#gyik', icon: 'lucide:help-circle' },
])

/** A „Típus” menü: minden QR-kód típus saját oldala. */
const typeLinks = computed(() =>
  QR_MENU_ORDER.map((id) => {
    const definition = getQrType(id)
    return { label: definition.label, to: localePath(QR_TYPE_PATHS[id]), icon: definition.icon }
  }),
)

const appOpen = ref(false)
const appRoot = ref<HTMLElement | null>(null)
const infoOpen = ref(false)
const infoRoot = ref<HTMLElement | null>(null)
const typeOpen = ref(false)
const typeRoot = ref<HTMLElement | null>(null)

/**
 * A lenyíló menük hoverre is nyílnak. A zárás rövid késleltetéssel történik, hogy a
 * gomb és a panel közötti néhány pixelnyi résen átmozgatott egér ne csukja be a menüt.
 */
const CLOSE_DELAY = 160
const menuRefs = { app: appOpen, info: infoOpen, types: typeOpen }
type MenuKey = keyof typeof menuRefs
const closeTimers: Partial<Record<MenuKey, ReturnType<typeof setTimeout>>> = {}

function cancelClose(key: MenuKey) {
  const timer = closeTimers[key]
  if (timer) {
    clearTimeout(timer)
    delete closeTimers[key]
  }
}

function openMenu(key: MenuKey) {
  cancelClose(key)
  for (const other of Object.keys(menuRefs) as MenuKey[]) {
    if (other !== key) menuRefs[other].value = false
  }
  menuRefs[key].value = true
}

function toggleMenu(key: MenuKey) {
  if (menuRefs[key].value) menuRefs[key].value = false
  else openMenu(key)
}

function scheduleClose(key: MenuKey) {
  cancelClose(key)
  closeTimers[key] = setTimeout(() => {
    menuRefs[key].value = false
    delete closeTimers[key]
  }, CLOSE_DELAY)
}

function closeAllMenus() {
  for (const key of Object.keys(menuRefs) as MenuKey[]) {
    cancelClose(key)
    menuRefs[key].value = false
  }
}

function onDocumentClick(event: MouseEvent) {
  const target = event.target as Node
  if (infoOpen.value && infoRoot.value && !infoRoot.value.contains(target)) infoOpen.value = false
  if (appOpen.value && appRoot.value && !appRoot.value.contains(target)) appOpen.value = false
  if (typeOpen.value && typeRoot.value && !typeRoot.value.contains(target)) typeOpen.value = false
}

watch(() => route.fullPath, () => {
  open.value = false
  closeAllMenus()
})

watch(open, (value) => {
  if (!import.meta.client) return
  document.documentElement.classList.toggle('overflow-hidden', value)
})

onBeforeUnmount(() => {
  stopScrollListener?.()
  for (const key of Object.keys(menuRefs) as MenuKey[]) cancelClose(key)
  if (import.meta.client) document.documentElement.classList.remove('overflow-hidden')
})
</script>

<template>
  <header
    :class="[
      'sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300 ease-out',
      overHero
        ? 'border-transparent bg-transparent'
        : 'border-slate-200/80 bg-surface/95 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.6)] backdrop-blur supports-[backdrop-filter]:bg-surface/80',
    ]"
  >
    <div
      :class="[
        'container-page flex items-center gap-3 transition-[height] duration-300 ease-out motion-reduce:transition-none lg:gap-6',
        scrolled ? 'h-16' : 'h-24',
      ]"
    >
      <AppLogo
        class="shrink-0 origin-left transition-transform duration-300 ease-out motion-reduce:transition-none"
        :class="scrolled ? 'scale-90' : 'scale-100'"
      />

      <nav class="hidden items-center gap-1 lg:flex" :aria-label="t('nav.mainLabel')">
        <NuxtLink
          v-for="link in mainLinks"
          :key="link.to"
          :to="link.to"
          class="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-800"
        >
          {{ link.label }}
        </NuxtLink>

        <div
          ref="appRoot"
          class="relative flex"
          @mouseenter="openMenu('app')"
          @mouseleave="scheduleClose('app')"
        >
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-800"
            aria-haspopup="menu"
            :aria-expanded="appOpen"
            aria-controls="header-app-menu"
            @click="toggleMenu('app')"
            @focus="openMenu('app')"
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

        <div
          ref="typeRoot"
          class="relative flex"
          @mouseenter="openMenu('types')"
          @mouseleave="scheduleClose('types')"
        >
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-800"
            aria-haspopup="menu"
            :aria-expanded="typeOpen"
            aria-controls="header-type-menu"
            @click="toggleMenu('types')"
            @focus="openMenu('types')"
            @keydown.esc="typeOpen = false"
          >
            {{ t('nav.typeMenu') }}
            <Icon name="lucide:chevron-down" class="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <div
            v-if="typeOpen"
            id="header-type-menu"
            role="menu"
            :aria-label="t('nav.typeMenuLabel')"
            class="absolute left-1/2 top-full z-50 mt-1 max-h-[70vh] w-[46rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-y-auto rounded-xl border border-slate-200 bg-surface p-1.5 shadow-lift"
          >
            <div class="grid grid-cols-3 gap-0.5">
              <NuxtLink
                v-for="link in typeLinks"
                :key="link.to"
                :to="link.to"
                role="menuitem"
                class="flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-soft hover:bg-slate-50 hover:text-brand-800"
                @click="typeOpen = false"
              >
                <Icon :name="link.icon" class="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                <span class="truncate">{{ link.label }}</span>
              </NuxtLink>
            </div>
            <NuxtLink
              :to="localePath('/qr-kod-tipusok')"
              role="menuitem"
              class="mt-1 flex items-center gap-2 rounded-lg border-t border-slate-100 px-2.5 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50"
              @click="typeOpen = false"
            >
              <Icon name="lucide:shapes" class="h-4 w-4 shrink-0" aria-hidden="true" />
              {{ t('nav.types') }}
            </NuxtLink>
          </div>
        </div>

        <div
          ref="infoRoot"
          class="relative flex"
          @mouseenter="openMenu('info')"
          @mouseleave="scheduleClose('info')"
        >
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-800"
            aria-haspopup="menu"
            :aria-expanded="infoOpen"
            aria-controls="header-info-menu"
            @click="toggleMenu('info')"
            @focus="openMenu('info')"
            @keydown.esc="infoOpen = false"
          >
            {{ t('nav.info') }}
            <Icon name="lucide:chevron-down" class="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <div
            v-if="infoOpen"
            id="header-info-menu"
            role="menu"
            :aria-label="t('nav.infoMenuLabel')"
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
          class="btn-primary hidden h-10 px-4 text-sm font-medium sm:inline-flex"
        >
          {{ t('actions.myAccount') }}
        </NuxtLink>
        <NuxtLink
          v-else
          :to="localePath('/belepes')"
          class="btn-primary hidden h-10 px-4 text-sm font-medium sm:inline-flex"
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
          class="btn-primary mt-2 justify-center font-medium"
        >
          {{ t('actions.myAccount') }}
        </NuxtLink>
        <NuxtLink
          v-else
          :to="localePath('/belepes')"
          class="btn-primary mt-2 justify-center font-medium"
        >
          {{ t('actions.signIn') }}
        </NuxtLink>
      </div>
    </nav>
  </header>
</template>
