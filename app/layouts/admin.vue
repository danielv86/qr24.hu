<script setup lang="ts">
const route = useRoute()
const { session, status, email, password, error, pending, refresh, login, logout } = useAdminSession()
const { isDark, cycle: cycleTheme } = useTheme()
const toast = useAdminToast()

/* Cloudflare Turnstile – csak ha be van állítva. */
const captchaToken = ref('')
const captcha = ref<{ reset: () => void } | null>(null)
const captchaRequired = computed(() => Boolean(String(useRuntimeConfig().public.turnstile?.siteKey || '').trim()))
const captchaReady = computed(() => !captchaRequired.value || Boolean(captchaToken.value))

async function submitLogin() {
  await login(captchaToken.value || undefined)
  if (captchaRequired.value) captcha.value?.reset()
}

interface AdminNavChild {
  to: string
  label: string
  icon: string
}

interface AdminNavItem {
  to: string
  label: string
  icon: string
  /** Csak pontos egyezésnél aktív (a /admin a többi útvonal előtagja). */
  exact?: boolean
  /** Ha van, a menüpont lenyíló almenüt kap. */
  children?: AdminNavChild[]
}

const nav: AdminNavItem[] = [
  { to: '/admin', label: 'Dinamikus QR-kódok', icon: 'lucide:link-2', exact: true },
  { to: '/admin/alakzatok', label: 'Alakzatok', icon: 'lucide:shapes' },
  { to: '/admin/blog', label: 'Blog', icon: 'lucide:newspaper' },
  { to: '/admin/statisztika', label: 'Statisztika', icon: 'lucide:chart-no-axes-column' },
  { to: '/admin/csomagok', label: 'Csomagok', icon: 'lucide:package' },
  { to: '/admin/felhasznalok', label: 'Felhasználók', icon: 'lucide:users' },
  { to: '/admin/elofizetesek', label: 'Előfizetések', icon: 'lucide:receipt' },
  {
    to: '/admin/beallitasok',
    label: 'Beállítások',
    icon: 'lucide:settings',
    children: [
      { to: '/admin/beallitasok', label: 'Általános', icon: 'lucide:sliders-horizontal' },
      { to: '/admin/beallitasok/adsense', label: 'AdSense', icon: 'lucide:badge-dollar-sign' },
      { to: '/admin/beallitasok/adatvedelem', label: 'Adatvédelem és jogi', icon: 'lucide:scale' },
      { to: '/admin/beallitasok/csomagvasarlas', label: 'Csomagvásárlás', icon: 'lucide:credit-card' },
      { to: '/admin/seo', label: 'SEO metaadatok', icon: 'lucide:search' },
    ],
  },
]

function isActive(item: AdminNavItem): boolean {
  if (item.children) return item.children.some(child => route.path === child.to)
  if (item.exact) return route.path === item.to || route.path === `${item.to}/`
  return route.path === item.to || route.path.startsWith(`${item.to}/`)
}

const activeChild = computed(() =>
  nav.flatMap(item => item.children ?? []).find(child => route.path === child.to) ?? null,
)
const activeLabel = computed(() => activeChild.value?.label ?? nav.find(item => isActive(item))?.label ?? 'Admin')

/* Lenyíló almenük (jelenleg a Beállítások), az aktív útvonalhoz automatikusan kinyitva. */
const openGroups = ref<Record<string, boolean>>({})

function isGroupOpen(item: AdminNavItem): boolean {
  return openGroups.value[item.to] === true
}

function toggleGroup(item: AdminNavItem) {
  openGroups.value[item.to] = !isGroupOpen(item)
}

watch(
  () => route.path,
  (path) => {
    for (const item of nav) {
      if (!item.children) continue
      if (item.children.some(child => path === child.to)) openGroups.value[item.to] = true
    }
  },
  { immediate: true },
)

/* Oldalsáv összecsukása: csak ikonok maradnak, az állapot megjegyződik. */
const COLLAPSE_KEY = 'admin-sidebar-collapsed'
const collapsed = ref(false)

onMounted(() => {
  collapsed.value = localStorage.getItem(COLLAPSE_KEY) === '1'
})

watch(collapsed, (value) => {
  if (import.meta.client) localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0')
})

/** Mobilon a lenyíló menüpontok gyerekei egy sorba kerülnek. */
const mobileNav = computed(() =>
  nav.flatMap((item) => {
    if (!item.children) return [item]
    return [
      { to: item.to, label: item.label, icon: item.icon, exact: true },
      ...item.children
        .filter(child => child.to !== item.to)
        .map(child => ({ to: child.to, label: child.label, icon: child.icon, exact: true })),
    ]
  }),
)
const initials = computed(() => (session.value?.email || '?').trim().charAt(0).toUpperCase())

/* Fiókmenü a fejlécben. */
const accountOpen = ref(false)

function closeAccount() {
  accountOpen.value = false
}

onMounted(() => {
  if (status.value !== 'ready') refresh()
  const onPointerDown = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    if (!target?.closest('[data-admin-account]')) accountOpen.value = false
  }
  document.addEventListener('pointerdown', onPointerDown)
  onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown))
})

function notifyBell() {
  toast.info('Nincs új értesítés', 'Az admin értesítések itt fognak megjelenni.')
}
</script>

<template>
  <div class="min-h-screen bg-canvas">
    <div v-if="status !== 'ready'" class="flex min-h-screen items-center justify-center text-sm text-ink-muted">
      <Icon name="lucide:loader-circle" class="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
      Munkamenet ellenőrzése…
    </div>

    <section v-else-if="!session" class="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <div class="card p-6 sm:p-8">
        <div class="flex items-center gap-3">
          <span class="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-white">
            <Icon name="lucide:lock-keyhole" class="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 class="text-xl">Adminisztráció</h1>
            <p class="text-xs text-ink-muted">Csak a beállított adminisztrátor férhet hozzá.</p>
          </div>
          <ThemeToggle class="ml-auto" />
        </div>

        <form class="mt-6 space-y-4" novalidate @submit.prevent="submitLogin">
          <div>
            <label for="admin-email" class="field-label">E-mail-cím</label>
            <input
              id="admin-email"
              v-model="email"
              type="email"
              class="field-input"
              autocomplete="username"
              required
              placeholder="admin@qrkod24.hu"
            >
          </div>
          <div>
            <label for="admin-password" class="field-label">Jelszó</label>
            <input
              id="admin-password"
              v-model="password"
              type="password"
              class="field-input"
              autocomplete="current-password"
              required
            >
          </div>
          <TurnstileWidget v-if="captchaRequired" ref="captcha" v-model="captchaToken" />

          <p v-if="error" class="field-error" role="alert">{{ error }}</p>
          <button type="submit" class="btn-primary w-full" :disabled="pending || !captchaReady">
            <Icon
              :name="pending ? 'lucide:loader-circle' : 'lucide:log-in'"
              :class="['h-4 w-4', { 'animate-spin': pending }]"
              aria-hidden="true"
            />
            {{ pending ? 'Bejelentkezés…' : 'Bejelentkezés' }}
          </button>
        </form>

        <p class="mt-5 text-xs leading-relaxed text-ink-muted">
          Az admin fiókot a telepítés során a <code class="rounded bg-slate-100 px-1 py-0.5">db:setup</code>
          szkript hozza létre. A jelszóemlékeztető nem elérhető; elfelejtett jelszó esetén a szkripttel
          állítható új jelszó.
        </p>
      </div>
    </section>

    <div v-else class="dark flex min-h-screen bg-[#0A0D1D] text-slate-100">
      <aside
        :class="[
          'sticky top-0 z-40 hidden h-screen shrink-0 flex-col border-r border-white/[0.07] bg-[linear-gradient(180deg,#0B0A20_0%,#141033_42%,#1D1547_78%,#241A50_100%)] transition-[width] duration-200 lg:flex',
          collapsed ? 'w-[84px]' : 'w-[250px]',
        ]"
      >
        <div class="flex items-center gap-2 px-5 pb-4 pt-5" :class="collapsed ? 'flex-col justify-center px-2' : ''">
          <NuxtLink
            to="/"
            class="inline-flex min-w-0 items-center rounded-xl p-1 focus-visible:ring-2 focus-visible:ring-violet-500"
            aria-label="Főoldal"
          >
            <img
              src="/img/logo/qrkod24.hu-logo.png"
              alt="QRKOD24.hu"
              width="1024"
              height="404"
              :class="['w-auto brightness-0 invert', collapsed ? 'h-6' : 'h-12']"
              decoding="async"
            >
          </NuxtLink>

          <button
            v-if="!collapsed"
            type="button"
            class="ml-auto grid h-8 w-8 place-items-center rounded-lg text-violet-200/40 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Oldalsáv összecsukása"
            @click="collapsed = true"
          >
            <Icon name="lucide:panel-left-close" class="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            v-else
            type="button"
            class="grid h-8 w-8 place-items-center rounded-lg text-violet-200/40 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Oldalsáv kinyitása"
            @click="collapsed = false"
          >
            <Icon name="lucide:panel-left-open" class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav class="flex-1 space-y-1 overflow-y-auto px-3.5 pb-4" aria-label="Admin menü">
          <template v-for="item in nav" :key="item.to">
            <NuxtLink
              v-if="!item.children"
              :to="item.to"
              :title="collapsed ? item.label : undefined"
              :aria-current="isActive(item) ? 'page' : undefined"
              :class="[
                'group flex items-center rounded-xl py-3 text-[13.5px] font-medium transition-all',
                collapsed ? 'justify-center px-0' : 'gap-3.5 px-3.5',
                isActive(item)
                  ? 'bg-[linear-gradient(90deg,#6D3ABF_0%,#7A46CC_45%,#5A30A8_100%)] text-white shadow-[0_14px_30px_-16px_rgba(110,62,176,0.95)] ring-1 ring-inset ring-white/10'
                  : 'text-[#CFC9EA]/75 hover:bg-white/[0.05] hover:text-white',
              ]"
            >
              <Icon :name="item.icon" class="h-[19px] w-[19px] shrink-0" aria-hidden="true" />
              <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
            </NuxtLink>

            <template v-else>
              <NuxtLink
                v-if="collapsed"
                :to="item.to"
                :title="item.label"
                :aria-current="isActive(item) ? 'page' : undefined"
                :class="[
                  'flex items-center justify-center rounded-xl py-3 transition-colors',
                  isActive(item)
                    ? 'bg-[linear-gradient(90deg,#6D3ABF_0%,#7A46CC_45%,#5A30A8_100%)] text-white ring-1 ring-inset ring-white/10'
                    : 'text-[#CFC9EA]/75 hover:bg-white/[0.05] hover:text-white',
                ]"
              >
                <Icon :name="item.icon" class="h-[19px] w-[19px]" aria-hidden="true" />
              </NuxtLink>

              <div v-else>
                <button
                  type="button"
                  :aria-expanded="isGroupOpen(item)"
                  :aria-controls="`admin-nav-group-${item.to.split('/').pop()}`"
                  :class="[
                    'flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-left text-[13.5px] font-medium transition-colors',
                    isActive(item) ? 'text-white' : 'text-[#CFC9EA]/75 hover:bg-white/[0.05] hover:text-white',
                  ]"
                  @click="toggleGroup(item)"
                >
                  <Icon :name="item.icon" class="h-[19px] w-[19px] shrink-0" aria-hidden="true" />
                  <span class="flex-1 truncate">{{ item.label }}</span>
                  <Icon
                    name="lucide:chevron-down"
                    :class="['h-4 w-4 shrink-0 transition-transform', isGroupOpen(item) ? 'rotate-180' : '']"
                    aria-hidden="true"
                  />
                </button>

                <ul
                  v-show="isGroupOpen(item)"
                  :id="`admin-nav-group-${item.to.split('/').pop()}`"
                  class="mt-1 space-y-0.5"
                >
                  <li v-for="child in item.children" :key="child.to">
                    <NuxtLink
                      :to="child.to"
                      :aria-current="route.path === child.to ? 'page' : undefined"
                      :class="[
                        'flex items-center gap-3 rounded-lg py-2 pl-[3.1rem] pr-2 text-[12.5px] transition-colors',
                        route.path === child.to
                          ? 'font-semibold text-[#D47EFF]'
                          : 'text-[#CFC9EA]/60 hover:text-white',
                      ]"
                    >
                      <Icon :name="child.icon" class="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span class="truncate">{{ child.label }}</span>
                    </NuxtLink>
                  </li>
                </ul>
              </div>
            </template>
          </template>
        </nav>
      </aside>

      <div class="relative flex min-w-0 flex-1 flex-col">
        <header class="sticky top-0 z-30 border-b border-white/[0.07] bg-[#0A0D1D]/85 backdrop-blur">
          <div class="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <div class="flex min-w-0 items-center gap-2 lg:hidden">
              <AppLogo />
            </div>

            <nav class="hidden min-w-0 items-center gap-2.5 text-[13px] lg:flex" aria-label="Útvonal">
              <NuxtLink
                to="/"
                class="grid h-8 w-8 place-items-center rounded-lg text-[#B7B1D4] transition-colors hover:bg-white/5 hover:text-white"
                title="Főoldal"
              >
                <Icon name="lucide:house" class="h-[18px] w-[18px]" aria-hidden="true" />
              </NuxtLink>
              <NuxtLink to="/admin" class="text-[#B7B1D4] transition-colors hover:text-white">Admin</NuxtLink>
              <Icon name="lucide:chevron-right" class="h-4 w-4 text-[#B7B1D4]/45" aria-hidden="true" />
              <span class="truncate font-semibold text-white">{{ activeLabel }}</span>
            </nav>

            <div class="ml-auto flex items-center gap-1">
              <button
                type="button"
                class="grid h-9 w-9 place-items-center rounded-lg text-[#B7B1D4] transition-colors hover:bg-white/5 hover:text-white"
                :aria-label="`Téma: ${isDark ? 'sötét' : 'világos'}`"
                title="Téma váltása"
                @click="cycleTheme"
              >
                <Icon :name="isDark ? 'lucide:moon' : 'lucide:sun'" class="h-[18px] w-[18px]" aria-hidden="true" />
              </button>

              <button
                type="button"
                class="relative grid h-9 w-9 place-items-center rounded-lg text-[#B7B1D4] transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Értesítések"
                title="Értesítések"
                @click="notifyBell"
              >
                <Icon name="lucide:bell" class="h-[18px] w-[18px]" aria-hidden="true" />
                <span class="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#A868FC]" aria-hidden="true" />
              </button>

              <div class="ml-2 border-l border-white/10 pl-2">
                <div class="relative" data-admin-account>
                  <button
                    type="button"
                    class="flex items-center gap-2.5 rounded-xl px-1.5 py-1 transition-colors hover:bg-white/5"
                    :aria-expanded="accountOpen"
                    aria-haspopup="menu"
                    @click="accountOpen = !accountOpen"
                  >
                    <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#8B4CF0,#6D3ABF)] text-sm font-semibold text-white">
                      {{ initials }}
                    </span>
                    <span class="hidden min-w-0 text-left sm:block">
                      <span class="block text-xs font-semibold leading-tight text-white">Adminisztrátor</span>
                      <span class="block max-w-[180px] truncate text-[11px] leading-tight text-[#B7B1D4]">{{ session.email }}</span>
                    </span>
                    <Icon name="lucide:chevron-down" class="hidden h-4 w-4 text-[#B7B1D4] sm:block" aria-hidden="true" />
                  </button>

                  <div
                    v-if="accountOpen"
                    class="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#160F36] p-1.5 shadow-2xl"
                    role="menu"
                  >
                    <NuxtLink
                      to="/"
                      class="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-violet-100 transition-colors hover:bg-white/5"
                      role="menuitem"
                      @click="closeAccount"
                    >
                      <Icon name="lucide:arrow-up-right" class="h-4 w-4" aria-hidden="true" />
                      Vissza az oldalra
                    </NuxtLink>
                    <button
                      type="button"
                      class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-red-300 transition-colors hover:bg-red-500/10"
                      role="menuitem"
                      @click="closeAccount(); logout()"
                    >
                      <Icon name="lucide:log-out" class="h-4 w-4" aria-hidden="true" />
                      Kijelentkezés
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <nav class="flex gap-1 overflow-x-auto border-t border-white/[0.06] px-3 py-2 lg:hidden" aria-label="Admin menü">
            <NuxtLink
              v-for="item in mobileNav"
              :key="`mobile-${item.to}`"
              :to="item.to"
              :aria-current="isActive(item) ? 'page' : undefined"
              :class="[
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                isActive(item)
                  ? 'bg-[#6D3ABF]/35 font-semibold text-white'
                  : 'text-[#CFC9EA]/70 hover:bg-white/5 hover:text-white',
              ]"
            >
              <Icon :name="item.icon" class="h-3.5 w-3.5" aria-hidden="true" />
              {{ item.label }}
            </NuxtLink>
          </nav>
        </header>

        <main
          class="relative flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-7"
          style="background-image: radial-gradient(900px 460px at 0% 100%, rgba(92, 34, 150, 0.18), transparent 62%), radial-gradient(760px 400px at 92% -8%, rgba(70, 28, 118, 0.14), transparent 60%);"
        >
          <slot />
        </main>
      </div>
    </div>

    <AdminToastViewport v-if="session" />
  </div>
</template>
