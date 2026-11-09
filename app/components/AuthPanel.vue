<script setup lang="ts">
/**
 * Bejelentkezés / regisztráció / e-mail megerősítés panel.
 * A /belepes oldal és a modális bejelentkezés is ezt használja.
 */
const props = withDefaults(
  defineProps<{
    initialMode?: 'login' | 'register'
    /** Az OAuth-visszatérés hibakódja (pl. oauth_state). */
    errorCode?: string
    /** Az elem-azonosítók előtagja, hogy egyszerre több példány is élhessen. */
    idPrefix?: string
    showLegal?: boolean
  }>(),
  { initialMode: 'login', errorCode: '', idPrefix: 'auth', showLegal: true },
)

const emit = defineEmits<{ authenticated: [] }>()

const { providers, login, refresh } = useUserSession()

const mode = ref<'login' | 'register'>(props.initialMode)
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref('')

/* ── E-mail megerősítés 8 karakteres kóddal ────────────────────────── */
const step = ref<'auth' | 'verify'>('auth')
const verifyEmail = ref('')
const verifyCode = ref('')
const devCode = ref('')
const resendSeconds = ref(0)
let resendTimer: ReturnType<typeof setInterval> | undefined

/* ── Cloudflare Turnstile (csak ha be van állítva) ──────────────────── */
const captchaToken = ref('')
const captcha = ref<{ reset: () => void } | null>(null)
const captchaRequired = computed(() => Boolean(String(useRuntimeConfig().public.turnstile?.siteKey || '').trim()))
const captchaReady = computed(() => !captchaRequired.value || Boolean(captchaToken.value))

const ids = computed(() => ({
  email: `${props.idPrefix}-email`,
  password: `${props.idPrefix}-password`,
  passwordConfirm: `${props.idPrefix}-password-confirm`,
  verify: `${props.idPrefix}-verify-code`,
}))

const deniedMessage = computed(() => {
  const code = props.errorCode
  if (code === 'oauth_not_configured') return 'Ez a bejelentkezési mód jelenleg nincs beállítva. Használd az e-mail-címes belépést.'
  if (code === 'oauth_email_missing') return 'A szolgáltató nem adott át e-mail-címet. Jelentkezz be e-mail-címmel és jelszóval.'
  if (code === 'oauth_state' || code === 'oauth_failed') return 'A külső bejelentkezés nem sikerült. Próbáld újra, vagy használd az e-mail-címes belépést.'
  return ''
})

watch(() => props.initialMode, (value) => {
  if (step.value === 'auth') mode.value = value
})

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

function openVerify(emailValue: string, options: { cooldown?: number; message?: string } = {}) {
  verifyEmail.value = emailValue
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

function switchMode(next: 'login' | 'register') {
  mode.value = next
  error.value = ''
  success.value = ''
  passwordConfirm.value = ''
}

async function submitCode() {
  if (loading.value) return
  error.value = ''
  success.value = ''
  if (!/^[A-Za-z0-9]{8}$/.test(verifyCode.value.trim())) {
    error.value = 'Írd be a kapott 8 karakteres kódot (betűk és számok).'
    return
  }
  loading.value = true
  try {
    await $fetch('/api/auth/verify-email', {
      method: 'POST',
      body: { email: verifyEmail.value, code: verifyCode.value.trim() },
    })
    await refresh()
    emit('authenticated')
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

async function submit() {
  if (loading.value) return
  error.value = ''
  success.value = ''
  if (mode.value === 'register') {
    if (password.value.length < 8) {
      error.value = 'A jelszó legalább 8 karakter legyen.'
      return
    }
    if (password.value !== passwordConfirm.value) {
      error.value = 'A két jelszó nem egyezik.'
      return
    }
  }
  if (captchaRequired.value && !captchaReady.value) {
    error.value = 'Előbb fejezd be a robotellenőrzést.'
    return
  }
  loading.value = true
  try {
    if (mode.value === 'login') {
      try {
        await login(email.value.trim(), password.value, captchaToken.value || undefined)
        emit('authenticated')
      } catch (err) {
        const errorCode = (err as { data?: { error?: { code?: string } } }).data?.error?.code
        if (errorCode === 'email_not_verified') {
          openVerify(email.value.trim(), {
            message: 'Az e-mail-címed megerősítésre vár. Írd be a 8 karakteres kódot, vagy kérj újat.',
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
        body: {
          email: email.value.trim(),
          password: password.value,
          captchaToken: captchaToken.value,
        },
      })
      devCode.value = response.data.devCode || ''
      openVerify(response.data.email, { cooldown: 60 })
    }
  } catch (err) {
    const data = (err as { data?: { error?: { message?: string; details?: Record<string, string> } } }).data
    const details = data?.error?.details
    error.value = (details && Object.values(details)[0]) || data?.error?.message || 'A művelet nem sikerült. Próbáld újra.'
  } finally {
    loading.value = false
    // A Turnstile token egyszer használható, ezért minden kísérlet után újat kérünk.
    if (captchaRequired.value) captcha.value?.reset()
  }
}

onBeforeUnmount(() => {
  if (resendTimer) clearInterval(resendTimer)
})

defineExpose({ switchMode })
</script>

<template>
  <div>
    <template v-if="step === 'auth'">
      <div class="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Bejelentkezés vagy regisztráció">
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'register'"
          :class="['rounded-lg px-3 py-2 text-sm font-semibold transition-colors', mode === 'register' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink']"
          @click="switchMode('register')"
        >
          Regisztráció
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'login'"
          :class="['rounded-lg px-3 py-2 text-sm font-semibold transition-colors', mode === 'login' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink']"
          @click="switchMode('login')"
        >
          Bejelentkezés
        </button>
      </div>

      <p v-if="deniedMessage" class="mt-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-900 dark:text-amber-200" role="alert">
        {{ deniedMessage }}
      </p>

      <div v-if="providers.google || providers.apple" class="mt-4 space-y-2">
        <a
          v-if="providers.google"
          href="/api/auth/oauth/google"
          class="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-slate-50"
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
        <div>
          <label :for="ids.email" class="field-label">E-mail-cím</label>
          <input
            :id="ids.email"
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
          <label :for="ids.password" class="field-label">Jelszó</label>
          <div class="relative">
            <input
              :id="ids.password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="field-input pr-10"
              :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
              :minlength="mode === 'register' ? 8 : 1"
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
          <p v-if="mode === 'register'" class="field-help">Legalább 8 karakter, betűvel és számmal.</p>
        </div>

        <div v-if="mode === 'register'">
          <label :for="ids.passwordConfirm" class="field-label">Jelszó újra</label>
          <input
            :id="ids.passwordConfirm"
            v-model="passwordConfirm"
            :type="showPassword ? 'text' : 'password'"
            class="field-input"
            autocomplete="new-password"
            minlength="8"
            required
          >
        </div>

        <TurnstileWidget v-if="captchaRequired" ref="captcha" v-model="captchaToken" />

        <p v-if="error" class="field-error" role="alert">{{ error }}</p>
        <p v-if="success" class="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300" role="status">{{ success }}</p>

        <button type="submit" class="btn-primary w-full py-2.5" :disabled="loading || !captchaReady">
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

      <p v-if="showLegal" class="mt-4 text-center text-[11px] leading-relaxed text-ink-muted">
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
          Elküldtük a 8 karakteres kódot ide: <strong class="text-ink">{{ verifyEmail }}</strong>.
          A kód 15 percig érvényes.
        </p>
      </div>

      <p v-if="devCode" class="mt-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:text-amber-200" role="status">
        Fejlesztői mód: e-mail-küldés nincs beállítva, ezért a kód itt látszik –
        <strong class="tracking-[0.2em]">{{ devCode }}</strong>
      </p>

      <form class="mt-4 space-y-3.5" @submit.prevent="submitCode">
        <div>
          <label :for="ids.verify" class="field-label">8 karakteres kód</label>
          <input
            :id="ids.verify"
            v-model="verifyCode"
            class="field-input text-center text-lg font-semibold uppercase tracking-[0.3em]"
            inputmode="text"
            autocapitalize="characters"
            autocomplete="one-time-code"
            pattern="[A-Za-z0-9]{8}"
            maxlength="8"
            placeholder="ABCD2345"
            required
            autofocus
          >
          <p class="field-help">A levélben kapott 8 karakteres kód (betűk és számok).</p>
        </div>

        <p v-if="error" class="field-error" role="alert">{{ error }}</p>
        <p v-if="success" class="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300" role="status">{{ success }}</p>

        <button type="submit" class="btn-primary w-full py-2.5" :disabled="loading || verifyCode.trim().length !== 8">
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
</template>
