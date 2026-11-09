<script setup lang="ts">
const route = useRoute()
const { user, refresh } = useUserSession()

const redirectTo = computed(() => {
  const value = route.query.redirect
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/fiok'
})

const initialMode = computed<'login' | 'register'>(() => (route.query.mode === 'register' ? 'register' : 'login'))
const errorCode = computed(() => (typeof route.query.error === 'string' ? route.query.error : ''))

useSeoMeta({
  title: 'Bejelentkezés és regisztráció | QRKOD24.hu',
  description: 'Jelentkezz be a QRKOD24.hu fiókodba, és kezeld a dinamikus QR-kódjaidat.',
  robots: 'noindex, nofollow',
})

onMounted(async () => {
  if (!user.value) await refresh()
  if (user.value) await navigateTo(redirectTo.value)
})

function onAuthenticated() {
  void navigateTo(redirectTo.value)
}
</script>

<template>
  <div class="bg-slate-50">
    <div class="container-page grid min-h-[calc(100vh-9rem)] items-center gap-10 py-10 lg:grid-cols-2 lg:gap-16">
      <section class="order-2 lg:order-1">
        <p class="eyebrow">QRKOD24.hu fiók</p>
        <h1 class="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Üdv újra!</h1>
        <p class="mt-3 max-w-md text-[1.02rem] leading-relaxed text-ink-soft">
          Kezeld egy helyen a dinamikus QR-kódjaidat, és nézd meg, honnan és mennyien olvassák be őket.
        </p>

        <ul class="mt-6 space-y-3 text-sm text-ink-soft">
          <li class="flex items-start gap-2.5">
            <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
              <Icon name="lucide:check" class="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            10 dinamikus QR-kód ingyen, bankkártya nélkül
          </li>
          <li class="flex items-start gap-2.5">
            <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
              <Icon name="lucide:check" class="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            Módosítsd, hová mutat a kód, akár nyomtatás után is
          </li>
          <li class="flex items-start gap-2.5">
            <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
              <Icon name="lucide:check" class="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            Beolvasási statisztika eszköz és böngésző szerint
          </li>
          <li class="flex items-start gap-2.5">
            <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
              <Icon name="lucide:check" class="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            A statikus QR-generátor bejelentkezés nélkül is használható marad
          </li>
        </ul>

        <p class="mt-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          Bankkártya nem szükséges
        </p>
      </section>

      <section class="order-1 w-full lg:order-2">
        <div class="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-surface p-5 shadow-card sm:p-7">
          <AuthPanel
            id-prefix="page-auth"
            :initial-mode="initialMode"
            :error-code="errorCode"
            @authenticated="onAuthenticated"
          />
        </div>

        <p class="mt-4 text-center text-xs text-ink-muted">
          Csak statikus QR-kódot szeretnél?
          <NuxtLink to="/qr-kod-generator" class="font-medium text-brand-700 hover:underline">Regisztráció nélkül is elkészítheted</NuxtLink>.
        </p>
      </section>
    </div>
  </div>
</template>
