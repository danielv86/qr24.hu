<script setup lang="ts">
const email = ref('')
const loading = ref(false)
const error = ref('')
const sent = ref(false)
const devToken = ref('')

useSeoMeta({
  title: 'Elfelejtett jelszó | QRKOD24.hu',
  description: 'Kérj e-mailben jelszó-visszaállító hivatkozást a QRKOD24.hu fiókodhoz.',
  robots: 'noindex, nofollow',
})

async function submit() {
  if (loading.value) return
  error.value = ''
  loading.value = true
  try {
    const response = await $fetch<{ success: true; data: { sent: boolean; devToken?: string } }>(
      '/api/auth/password-reset/request',
      { method: 'POST', body: { email: email.value.trim() } },
    )
    devToken.value = response.data.devToken || ''
    sent.value = true
  } catch (cause) {
    error.value = apiErrorMessage(cause, 'A kérés elküldése nem sikerült. Próbáld újra.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="bg-slate-50">
    <div class="container-page flex min-h-[calc(100vh-9rem)] items-center justify-center py-12">
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-surface p-5 shadow-card sm:p-7">
        <template v-if="!sent">
          <span class="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <Icon name="lucide:key-round" class="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 class="mt-4 text-2xl font-bold tracking-tight text-ink">Elfelejtetted a jelszavad?</h1>
          <p class="mt-2 text-sm leading-relaxed text-ink-soft">
            Írd be a fiókod e-mail-címét, és küldünk egy hivatkozást, amivel új jelszót adhatsz meg.
            A hivatkozás 60 percig érvényes.
          </p>

          <form class="mt-5 space-y-4" novalidate @submit.prevent="submit">
            <div>
              <label for="reset-email" class="field-label">E-mail-cím</label>
              <input
                id="reset-email"
                v-model="email"
                type="email"
                class="field-input"
                autocomplete="email"
                inputmode="email"
                required
                placeholder="pelda@email.hu"
              >
            </div>

            <p v-if="error" class="field-error" role="alert">{{ error }}</p>

            <button type="submit" class="btn-primary w-full py-2.5" :disabled="loading">
              <Icon
                :name="loading ? 'lucide:loader-circle' : 'lucide:send'"
                :class="['h-4 w-4', { 'animate-spin': loading }]"
                aria-hidden="true"
              />
              {{ loading ? 'Küldés…' : 'Visszaállító hivatkozás kérése' }}
            </button>
          </form>
        </template>

        <template v-else>
          <span class="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Icon name="lucide:mail-check" class="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 class="mt-4 text-2xl font-bold tracking-tight text-ink">Nézd meg a postaládádat</h1>
          <p class="mt-2 text-sm leading-relaxed text-ink-soft">
            Ha létezik fiók a <strong class="text-ink">{{ email }}</strong> címmel, elküldtük a
            jelszó-visszaállító hivatkozást. A levél néhány perc alatt megérkezik; a spam mappát is
            érdemes megnézni.
          </p>

          <p v-if="devToken" class="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/40 dark:text-amber-200" role="status">
            Fejlesztői mód: e-mail-küldés nincs beállítva, ezért a hivatkozás itt látszik –
            <NuxtLink :to="{ path: '/uj-jelszo', query: { token: devToken } }" class="font-semibold underline underline-offset-2">
              új jelszó megadása
            </NuxtLink>
          </p>

          <div class="mt-5 flex flex-col gap-2 text-sm">
            <button type="button" class="font-semibold text-brand-700 hover:underline" @click="sent = false">
              Másik e-mail-címmel próbálom
            </button>
            <NuxtLink to="/belepes" class="text-ink-muted hover:text-ink">Vissza a bejelentkezéshez</NuxtLink>
          </div>
        </template>

        <p v-if="!sent" class="mt-5 text-center text-xs text-ink-muted">
          <NuxtLink to="/belepes" class="font-semibold text-brand-700 hover:underline">Vissza a bejelentkezéshez</NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>
