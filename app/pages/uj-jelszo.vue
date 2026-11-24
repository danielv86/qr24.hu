<script setup lang="ts">
const route = useRoute()
const { refresh } = useUserSession()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const password = ref('')
const passwordConfirm = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const done = ref(false)

useSeoMeta({
  title: 'Új jelszó megadása | QRKOD24.hu',
  description: 'Állíts be új jelszót a QRKOD24.hu fiókodhoz.',
  robots: 'noindex, nofollow',
})

async function submit() {
  if (loading.value || done.value) return
  error.value = ''
  if (password.value.length < 8) {
    error.value = 'A jelszó legalább 8 karakter legyen.'
    return
  }
  if (!/[a-zA-Z]/.test(password.value) || !/\d/.test(password.value)) {
    error.value = 'A jelszó tartalmazzon betűt és számot.'
    return
  }
  if (password.value !== passwordConfirm.value) {
    error.value = 'A két jelszó nem egyezik.'
    return
  }
  loading.value = true
  try {
    await $fetch('/api/auth/password-reset/confirm', {
      method: 'POST',
      body: { token: token.value, newPassword: password.value },
    })
    await refresh()
    done.value = true
    setTimeout(() => {
      void navigateTo('/fiok')
    }, 900)
  } catch (cause) {
    error.value = apiErrorMessage(cause, 'A jelszó módosítása nem sikerült. Kérj új hivatkozást.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="bg-slate-50">
    <div class="container-page flex min-h-[calc(100vh-9rem)] items-center justify-center py-12">
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-surface p-5 shadow-card sm:p-7">
        <template v-if="!token">
          <span class="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-700">
            <Icon name="lucide:link-2-off" class="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 class="mt-4 text-2xl font-bold tracking-tight text-ink">Hiányzó hivatkozás</h1>
          <p class="mt-2 text-sm leading-relaxed text-ink-soft">
            Ez az oldal csak a jelszó-visszaállító e-mailben kapott hivatkozással használható.
            Kérj új hivatkozást, és nyisd meg a levélben kapott címet.
          </p>
          <NuxtLink to="/jelszo-emlekezteto" class="btn-primary mt-5 w-full py-2.5">
            <Icon name="lucide:key-round" class="h-4 w-4" aria-hidden="true" />
            Új hivatkozás kérése
          </NuxtLink>
        </template>

        <template v-else-if="done">
          <span class="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Icon name="lucide:check" class="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 class="mt-4 text-2xl font-bold tracking-tight text-ink">Jelszó frissítve</h1>
          <p class="mt-2 text-sm leading-relaxed text-ink-soft">
            Bejelentkeztettünk az új jelszóval, és a többi eszközön lezártuk a munkamenetet.
            Átirányítunk a fiókodba…
          </p>
        </template>

        <template v-else>
          <span class="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <Icon name="lucide:shield-check" class="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 class="mt-4 text-2xl font-bold tracking-tight text-ink">Új jelszó megadása</h1>
          <p class="mt-2 text-sm leading-relaxed text-ink-soft">
            Adj meg egy új jelszót a fiókodhoz. A hivatkozás egyszer használható.
          </p>

          <form class="mt-5 space-y-4" novalidate @submit.prevent="submit">
            <div>
              <label for="new-password" class="field-label">Új jelszó</label>
              <div class="relative">
                <input
                  id="new-password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  class="field-input pr-10"
                  autocomplete="new-password"
                  minlength="8"
                  required
                >
                <button
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted hover:text-ink"
                  :aria-label="showPassword ? 'Jelszó elrejtése' : 'Jelszó megjelenítése'"
                  @click="showPassword = !showPassword"
                >
                  <Icon :name="showPassword ? 'lucide:eye-off' : 'lucide:eye'" class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <p class="field-help">Legalább 8 karakter, betűvel és számmal.</p>
            </div>

            <div>
              <label for="new-password-confirm" class="field-label">Új jelszó mégegyszer</label>
              <input
                id="new-password-confirm"
                v-model="passwordConfirm"
                :type="showPassword ? 'text' : 'password'"
                class="field-input"
                autocomplete="new-password"
                minlength="8"
                required
              >
            </div>

            <p v-if="error" class="field-error" role="alert">{{ error }}</p>

            <button type="submit" class="btn-primary w-full py-2.5" :disabled="loading">
              <Icon
                :name="loading ? 'lucide:loader-circle' : 'lucide:save'"
                :class="['h-4 w-4', { 'animate-spin': loading }]"
                aria-hidden="true"
              />
              {{ loading ? 'Mentés…' : 'Új jelszó mentése' }}
            </button>
          </form>

          <p class="mt-4 text-center text-xs text-ink-muted">
            Lejárt vagy hibás a hivatkozás?
            <NuxtLink to="/jelszo-emlekezteto" class="font-semibold text-brand-700 hover:underline">
              Kérj újat
            </NuxtLink>
          </p>
        </template>
      </div>
    </div>
  </div>
</template>
