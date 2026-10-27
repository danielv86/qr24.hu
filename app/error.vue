<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const title = computed(() =>
  props.error.statusCode === 404 ? 'Az oldal nem található' : 'Váratlan hiba történt',
)

useSeoMeta({
  title: () => `${title.value} – QRKOD24.hu`,
  robots: 'noindex, nofollow',
})

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-canvas">
    <header class="border-b border-slate-200 bg-surface">
      <div class="container-page flex h-[4.25rem] items-center">
        <AppLogo />
      </div>
    </header>

    <main class="container-page flex flex-1 items-center py-16">
      <div class="card mx-auto w-full max-w-xl p-8 text-center">
        <span class="eyebrow">Hiba {{ error.statusCode }}</span>
        <h1 class="mt-4 text-3xl">{{ title }}</h1>
        <p class="mt-3 text-ink-soft">
          <template v-if="error.statusCode === 404">
            A megadott cím nem létezik, vagy az oldal elköltözött. Innen visszatalálsz a generátorhoz.
          </template>
          <template v-else>
            Kérjük, próbáld újra később. A hiba naplózva lett, a többi oldal zavartalanul használható.
          </template>
        </p>
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" class="btn-primary" @click="goHome">Vissza a főoldalra</button>
          <NuxtLink to="/qr-kod-generator" class="btn-secondary">QR-kód generátor</NuxtLink>
        </div>
      </div>
    </main>

    <footer class="border-t border-slate-200 bg-surface py-6">
      <div class="container-page text-center text-xs text-ink-muted">
        QRKOD24.hu – ingyenes QR-kód generátor
      </div>
    </footer>
  </div>
</template>
