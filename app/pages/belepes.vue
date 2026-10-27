<script setup lang="ts">
const route = useRoute()
const { user, providers, login, refresh } = useUserSession()

const mode = ref<'login' | 'register'>(route.query.mode === 'register' ? 'register' : 'login')
const email = ref('')
const password = ref('')
const name = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref('')

/* ── E-mail megerősítés 6 jegyű kóddal ─────────────────────────────── */
const step = ref<'auth' | 'verify'>('auth')
const verifyEmail = ref('')
const verifyCode = ref('')
const devCode = ref('')
const resendSeconds = ref(0)
let resendTimer: ReturnType<typeof setInterval> | undefined

function startResendCooldown(seconds = 60) {
  if (resendTimer) clearInterval(resendTimer)
  resendSeconds.value = seconds
  resendTimer = setInterval(() => {
    resendSeconds.value = Math.max(0, resendSeconds.value - 1)
    if (resendSeconds.value === 0 && resendTimer) {
      clearInterval(resendTimer)
      resendTimer = undefined
    }
  }, 1000)
}

function openVerify(email: string, options: { cooldown?: number; message?: string } = {}) {
  verifyEmail.value = email
  verifyCode.value = ''
  step.value = 'verify'
  error.value = ''
  success.value = options.message || ''
  startResendCooldown(options.cooldown ?? 0)
}

function backToAuth() {
  step.value = 'auth'
  verifyCode.value = ''
  devCode.value = ''
  error.value = ''
  success.value = ''
  if (resendTimer) clearInterval(resendTimer)
  resendSeconds.value = 0
}

async function submitCode() {
  if (loading.value) return
  error.value = ''
  success.value = ''
  if (!/^\d{6}$/.test(verifyCode.value.trim())) {
    error.value = 'Írd be a 6 jegyű kódot.'
    return
  }
  loading.value = true
  try {
    await $fetch('/api/auth/verify-email', {
      method: 'POST',
      body: { email: verifyEmail.value, code: verifyCode.value.trim() },
    })
    await refresh()
    await navigateTo(redirectTo.value)
  } catch (err) {
    const data = (err as { data?: { error?: { message?: string } } }).data
    error.value = data?.error?.message || 'A kód ellenőrzése nem sikerült. Próbáld újra.'
  } finally {
    loading.value = false
  }
}

async function resendCode() {
  if (loading.value || resendSeconds.value > 0) return
  error.value = ''
  success.value = ''
  loading.value = true
  try {
    const response = await $fetch<{ success: true; data: { sent: boolean; devCode?: string } }>(
      '/api/auth/resend-verification',
      { method: 'POST', body: { email: verifyEmail.value } },
    )
    devCode.value = response.data.devCode || ''
    success.value = 'Elküldtük az új kódot. Nézd meg a postaládádat (a spam mappát is).'
    startResendCooldown(60)
  } catch (err) {
    const data = (err as { data?: { error?: { message?: string } } }).data
    error.value = data?.error?.message || 'Az új kód kérése nem sikerült.'
  } finally {
    loading.value = false
  }
}

onBeforeUnmount(() => {
  if (resendTimer) clearInterval(resendTimer)
})

const deniedMessage = computed(() => {
  const code = route.query.error
  if (code === 'oauth_not_configured') return 'Ez a bejelentkezési mód jelenleg nincs beállítva. Használd az e-mail-címes belépést.'
  if (code === 'oauth_email_missing') return 'A szolgáltató nem adott át e-mail-címet. Jelentkezz be e-mail-címmel és jelszóval.'
  if (code === 'oauth_state' || code === 'oauth_failed') return 'A külső bejelentkezés nem sikerült. Próbáld újra, vagy használd az e-mail-címes belépést.'
  return ''
})

const redirectTo = computed(() => {
  const value = route.query.redirect
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/fiok'
})

useSeoMeta({
  title: 'Bejelentkezés és regisztráció | QRKOD24.hu',
  description: 'Jelentkezz be a QRKOD24.hu fiókodba, és kezeld a dinamikus QR-kódjaidat.',
  robots: 'noindex, nofollow',
})

onMounted(async () => {
  if (!user.value) await refresh()
  if (user.value) await navigateTo(redirectTo.value)
})

function switchMode(next: 'login' | 'register') {
  mode.value = next
  error.value = ''
  success.value = ''
}

async function submit() {
  if (loading.value) return
  error.value = ''
  success.value = ''
  loading.value = true
  try {
    if (mode.value === 'login') {
      try {
        await login(email.value.trim(), password.value)
        await navigateTo(redirectTo.value)
      } catch (err) {
        const errorCode = (err as { data?: { error?: { code?: string } } }).data?.error?.code
        if (errorCode === 'email_not_verified') {
          openVerify(email.value.trim(), {
            message: 'Az e-mail-címed megerősítésre vár. Írd be a 6 jegyű kódot, vagy kérj újat.',
          })
          return
        }
        throw err
      }
    } else {
      const response = await $fetch<{
        success: true
        data: { email: string; verificationRequired: boolean; devCode?: string }
      }>('/api/auth/register', {
        method: 'POST',
        body: { email: email.value.trim(), password: password.value, name: name.value.trim() },
      })
      devCode.value = response.data.devCode || ''
      openVerify(response.data.email, { cooldown: 60 })
    }
  } catch (err) {
    const data = (err as { data?: { error?: { message?: string, details?: Record<string, string> } } }).data
    const details = data?.error?.details
    error.value = (details && Object.values(details)[0]) || data?.error?.message || 'A művelet nem sikerült. Próbáld újra.'
  } finally {
    loading.value = false
  }
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

        <p class="mt-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          Bankkártya nem szükséges
        </p>
      </section>

      <section class="order-1 w-full lg:order-2">
        <div class="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
          <template v-if="step === 'auth'">
          <div class="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Bejelentkezés vagy regisztráció">
            <button
              type="button"
              role="tab"
              :aria-selected="mode === 'register'"
              :class="['rounded-lg px-3 py-2 text-sm font-semibold transition-colors', mode === 'register' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink']"
              @click="switchMode('register')"
            >
              Regisztráció
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="mode === 'login'"
              :class="['rounded-lg px-3 py-2 text-sm font-semibold transition-colors', mode === 'login' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink']"
              @click="switchMode('login')"
            >
              Bejelentkezés
            </button>
          </div>

          <p v-if="deniedMessage" class="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
            {{ deniedMessage }}
          </p>

          <div v-if="providers.google || providers.apple" class="mt-4 space-y-2">
            <a
              v-if="providers.google"
              href="/api/auth/oauth/google"
              class="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-slate-50"
            >
              <svg class="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5Z" />
                <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.4-4.7 7l7.6 5.9c4.4-4.1 6.8-10.1 6.8-17.3Z" />
                <path fill="#FBBC05" d="M10.4 28.7a14.6 14.6 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1Z" />
                <path fill="#34A853" d="M24 48c6.2 0 11.5-2 15.3-5.5l-7.6-5.9c-2.1 1.4-4.7 2.3-7.7 2.3-6.4 0-11.7-3.7-13.6-9l-7.8 6.1C6.5 42.6 14.6 48 24 48Z" />
              </svg>
              Folytatás a Google-lel
            </a>
            <a
              v-if="providers.apple"
              href="/api/auth/oauth/apple"
              class="flex w-full items-center justify-center gap-2.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M16.4 12.9c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.6.9-.7 0-1.9-.9-3.1-.8-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.3 1.2 9.7.8 1.2 1.8 2.5 3.1 2.4 1.2 0 1.7-.8 3.2-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.8 1.3-2.9-.1 0-2.9-1.1-2.9-4.3ZM14 5.6c.7-.8 1.1-1.9 1-3-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.5Z" />
              </svg>
              Folytatás az Apple-lel
            </a>
            <div class="flex items-center gap-3 py-1">
              <span class="h-px flex-1 bg-slate-200" />
              <span class="text-[11px] uppercase tracking-wide text-ink-muted">Vagy e-mail-címmel</span>
              <span class="h-px flex-1 bg-slate-200" />
            </div>
          </div>

          <form class="mt-3 space-y-3.5" @submit.prevent="submit">
            <div v-if="mode === 'register'">
              <label for="auth-name" class="field-label">Név (nem kötelező)</label>
              <input id="auth-name" v-model="name" class="field-input" autocomplete="name" maxlength="120" placeholder="Kovács Anna">
            </div>

            <div>
              <label for="auth-email" class="field-label">E-mail-cím</label>
              <input
                id="auth-email"
                v-model="email"
                type="email"
                class="field-input"
                autocomplete="email"
                inputmode="email"
                required
                placeholder="pelda@email.hu"
              >
            </div>

            <div>
              <label for="auth-password" class="field-label">Jelszó</label>
              <div class="relative">
                <input
                  id="auth-password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  class="field-input pr-10"
                  :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
                  :minlength="mode === 'register' ? 10 : 1"
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
              <p v-if="mode === 'register'" class="field-help">Legalább 10 karakter, betűvel és számmal.</p>
            </div>

            <p v-if="error" class="field-error" role="alert">{{ error }}</p>
            <p v-if="success" class="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{{ success }}</p>

            <button type="submit" class="btn-primary w-full py-2.5" :disabled="loading">
              <Icon :name="loading ? 'lucide:loader-circle' : 'lucide:arrow-right'" :class="['h-4 w-4', { 'animate-spin': loading }]" aria-hidden="true" />
              {{ loading ? 'Feldolgozás…' : mode === 'login' ? 'Bejelentkezés' : 'Fiók létrehozása' }}
            </button>
          </form>

          <p class="mt-3 text-center text-xs text-ink-muted">
            <template v-if="mode === 'login'">
              Még nincs fiókod?
              <button type="button" class="font-semibold text-brand-700 hover:underline" @click="switchMode('register')">Regisztrálj</button>
            </template>
            <template v-else>
              Már van fiókod?
              <button type="button" class="font-semibold text-brand-700 hover:underline" @click="switchMode('login')">Jelentkezz be</button>
            </template>
          </p>

          <p class="mt-4 text-center text-[11px] leading-relaxed text-ink-muted">
            A folytatással elfogadod a
            <NuxtLink to="/felhasznalasi-feltetelek" class="underline underline-offset-2">felhasználási feltételeket</NuxtLink>
            és az
            <NuxtLink to="/adatvedelmi-tajekoztato" class="underline underline-offset-2">adatvédelmi tájékoztatót</NuxtLink>.
          </p>
          </template>

          <template v-else>
            <div class="text-center">
              <span class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                <Icon name="lucide:mail-check" class="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 class="mt-3 text-lg font-semibold text-ink">Erősítsd meg az e-mail-címedet</h2>
              <p class="mt-1 text-sm leading-relaxed text-ink-soft">
                Elküldtük a 6 jegyű kódot ide: <strong class="text-ink">{{ verifyEmail }}</strong>.
                A kód 15 percig érvényes.
              </p>
            </div>

            <p v-if="devCode" class="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900" role="status">
              Fejlesztői mód: e-mail-küldés nincs beállítva, ezért a kód itt látszik –
              <strong class="tracking-[0.2em]">{{ devCode }}</strong>
            </p>

            <form class="mt-4 space-y-3.5" @submit.prevent="submitCode">
              <div>
                <label for="verify-code" class="field-label">6 jegyű kód</label>
                <input
                  id="verify-code"
                  v-model="verifyCode"
                  class="field-input text-center text-xl font-semibold tracking-[0.45em]"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxlength="6"
                  placeholder="000000"
                  required
                  autofocus
                >
              </div>

              <p v-if="error" class="field-error" role="alert">{{ error }}</p>
              <p v-if="success" class="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{{ success }}</p>

              <button type="submit" class="btn-primary w-full py-2.5" :disabled="loading || verifyCode.trim().length !== 6">
                <Icon :name="loading ? 'lucide:loader-circle' : 'lucide:shield-check'" :class="['h-4 w-4', { 'animate-spin': loading }]" aria-hidden="true" />
                {{ loading ? 'Ellenőrzés…' : 'E-mail megerősítése' }}
              </button>
            </form>

            <div class="mt-3 flex flex-col items-center gap-2 text-xs">
              <button
                type="button"
                class="font-semibold text-brand-700 hover:underline disabled:text-ink-muted disabled:no-underline"
                :disabled="loading || resendSeconds > 0"
                @click="resendCode"
              >
                {{ resendSeconds > 0 ? `Új kód kérése (${resendSeconds} mp)` : 'Nem kaptad meg? Új kód kérése' }}
              </button>
              <button type="button" class="text-ink-muted hover:text-ink" @click="backToAuth">
                Vissza a bejelentkezéshez
              </button>
            </div>

            <p class="mt-4 text-center text-[11px] leading-relaxed text-ink-muted">
              Ha nem találod a levelet, nézd meg a spam vagy promóciós mappát is. A feladó: QRKOD24.hu.
            </p>
          </template>
        </div>

        <p class="mt-4 text-center text-xs text-ink-muted">
          Csak statikus QR-kódot szeretnél?
          <NuxtLink to="/qr-kod-generator" class="font-medium text-brand-700 hover:underline">Regisztráció nélkül is elkészítheted</NuxtLink>.
        </p>
      </section>
    </div>
  </div>
</template>
