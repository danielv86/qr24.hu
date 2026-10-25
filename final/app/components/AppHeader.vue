<script setup lang="ts">
const open = ref(false)
const route = useRoute()
const { t } = useI18n()
const localePath = useLocalePath()

const links = computed(() => [
  { label: t('nav.generator'), to: localePath('/qr-kod-generator') },
  { label: t('nav.types'), to: localePath('/qr-kod-tipusok') },
  { label: t('nav.guides'), to: localePath('/qr-kod-keszites') },
  { label: t('nav.faq'), to: localePath('/qr-kod-generator') + '#gyik' },
])

watch(() => route.fullPath, () => {
  open.value = false
})

watch(open, (value) => {
  if (!import.meta.client) return
  document.documentElement.classList.toggle('overflow-hidden', value)
})

onBeforeUnmount(() => {
  if (import.meta.client) document.documentElement.classList.remove('overflow-hidden')
})
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-slate-200/80 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
    <div class="container-page flex h-24 items-center gap-3 lg:gap-6">
      <AppLogo class="shrink-0" />

      <nav class="hidden items-center gap-1 lg:flex" :aria-label="t('nav.mainLabel')">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-800"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <div class="ml-auto flex items-center gap-2">
        <LanguageSwitcher />

        <NuxtLink
          :to="localePath('/belepes')"
          class="btn-secondary hidden h-10 px-3.5 sm:inline-flex"
        >
          <Icon name="lucide:log-in" class="h-4 w-4" aria-hidden="true" />
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
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="rounded-xl px-3 py-3 text-base font-medium text-ink-soft hover:bg-brand-50 hover:text-brand-800"
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
          :to="localePath('/belepes')"
          class="btn-secondary mt-2 justify-center"
        >
          <Icon name="lucide:log-in" class="h-4 w-4" aria-hidden="true" />
          {{ t('actions.signIn') }}
        </NuxtLink>
      </div>
    </nav>
  </header>
</template>
