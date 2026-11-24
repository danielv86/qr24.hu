<script setup lang="ts">
import type { ApiSuccess, MailSettingsView } from '#shared/types/api'

definePageMeta({ layout: 'admin' })

useSeoMeta({
  title: 'SMTP beállítások | Admin',
  robots: 'noindex, nofollow',
})

const { session } = useAdminSession()
const toast = useAdminToast()

const form = reactive({
  enabled: false,
  host: '',
  port: 587,
  secure: false,
  user: '',
  password: '',
  fromEmail: '',
  fromName: 'QRKOD24.hu',
})

const hasPassword = ref(false)
const loading = ref(false)
const saving = ref(false)
const error = ref('')

const testTo = ref('')
const testing = ref(false)
const testError = ref('')
const testMessage = ref('')

function apply(data: MailSettingsView) {
  form.enabled = data.enabled
  form.host = data.host
  form.port = data.port
  form.secure = data.secure
  form.user = data.user
  form.fromEmail = data.fromEmail
  form.fromName = data.fromName
  hasPassword.value = data.hasPassword
  form.password = ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await $fetch<ApiSuccess<MailSettingsView>>('/api/admin/mail')
    apply(response.data)
  } catch (cause) {
    error.value = apiErrorMessage(cause, 'Az SMTP beállítások betöltése nem sikerült.')
  } finally {
    loading.value = false
  }
}

watch(
  session,
  (value) => {
    if (value) load()
  },
  { immediate: true },
)

function payload() {
  return {
    enabled: form.enabled,
    host: form.host.trim(),
    port: Number(form.port) || 587,
    secure: form.secure,
    user: form.user.trim(),
    password: form.password,
    fromEmail: form.fromEmail.trim(),
    fromName: form.fromName.trim(),
  }
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    const response = await $fetch<ApiSuccess<MailSettingsView>>('/api/admin/mail', {
      method: 'PATCH',
      body: payload(),
    })
    apply(response.data)
    toast.success('SMTP beállítások mentve')
  } catch (cause) {
    error.value = apiErrorMessage(cause, 'Az SMTP beállítások mentése nem sikerült.')
    toast.error('Mentési hiba', error.value)
  } finally {
    saving.value = false
  }
}

async function sendTest() {
  if (testing.value) return
  testError.value = ''
  testMessage.value = ''
  if (!testTo.value.trim()) {
    testError.value = 'Add meg, hová küldjük a teszt levelet.'
    return
  }
  testing.value = true
  try {
    await $fetch('/api/admin/mail-test', {
      method: 'POST',
      // A még nem mentett űrlapértékekkel is tesztelhető.
      body: { to: testTo.value.trim(), settings: payload() },
    })
    testMessage.value = `A teszt levél elküldve ide: ${testTo.value.trim()}.`
    toast.success('Teszt e-mail elküldve')
  } catch (cause) {
    testError.value = apiErrorMessage(cause, 'A teszt levél elküldése nem sikerült.')
    toast.error('Küldési hiba', testError.value)
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <AdminPageLayout
    title="SMTP beállítások"
    description="A rendszer ezen a szerveren keresztül küldi a megerősítő, jelszó-visszaállító és értesítő leveleket."
  >
    <template #actions>
      <button type="submit" form="smtp-settings" class="btn-primary" :disabled="saving || loading">
        <Icon :name="saving ? 'lucide:loader-circle' : 'lucide:save'" :class="['h-4 w-4', { 'animate-spin': saving }]" aria-hidden="true" />
        {{ saving ? 'Mentés…' : 'Mentés' }}
      </button>
    </template>

    <div v-if="loading" class="card p-5 text-sm text-ink-muted">Betöltés…</div>

    <template v-else>
      <form id="smtp-settings" class="card p-5 sm:p-6" novalidate @submit.prevent="save">
        <label class="flex items-start gap-2.5">
          <input v-model="form.enabled" type="checkbox" class="mt-0.5 h-4 w-4 accent-brand-600">
          <span>
            <span class="block font-semibold text-ink">E-mail küldés bekapcsolva</span>
            <span class="mt-0.5 block text-xs text-ink-muted">
              Kikapcsolva a rendszer nem küld levelet (fejlesztésben a kódok a felületen látszanak).
            </span>
          </span>
        </label>

        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label for="smtp-host" class="field-label">SMTP szerver</label>
            <input
              id="smtp-host"
              v-model="form.host"
              type="text"
              class="field-input font-mono text-sm"
              placeholder="localhost"
              autocomplete="off"
            >
            <p class="field-help">Helyi levelezőszervernél jellemzően <code class="rounded bg-slate-100 px-1">localhost</code>.</p>
          </div>

          <div>
            <label for="smtp-port" class="field-label">Port</label>
            <input
              id="smtp-port"
              v-model.number="form.port"
              type="number"
              min="1"
              max="65535"
              class="field-input font-mono text-sm"
              placeholder="587"
            >
            <p class="field-help">587 (STARTTLS), 465 (SSL) vagy a helyi szerver portja (pl. 1025).</p>
          </div>

          <div class="flex items-start pt-6">
            <label class="flex items-start gap-2.5">
              <input v-model="form.secure" type="checkbox" class="mt-0.5 h-4 w-4 accent-brand-600">
              <span>
                <span class="block font-semibold text-ink">SSL/TLS</span>
                <span class="mt-0.5 block text-xs text-ink-muted">Azonnali titkosítás (jellemzően 465-ös port).</span>
              </span>
            </label>
          </div>

          <div>
            <label for="smtp-user" class="field-label">Felhasználónév</label>
            <input
              id="smtp-user"
              v-model="form.user"
              type="text"
              class="field-input text-sm"
              autocomplete="off"
              placeholder="Ha a szerver nem kér bejelentkezést, hagyd üresen"
            >
          </div>

          <div>
            <label for="smtp-password" class="field-label">Jelszó</label>
            <input
              id="smtp-password"
              v-model="form.password"
              type="password"
              class="field-input text-sm"
              autocomplete="new-password"
              :placeholder="hasPassword ? '•••••• (mentett jelszó, üresen hagyva nem változik)' : 'Jelszó'"
            >
          </div>

          <div>
            <label for="smtp-from-name" class="field-label">Feladó neve</label>
            <input
              id="smtp-from-name"
              v-model="form.fromName"
              type="text"
              class="field-input text-sm"
              placeholder="QRKOD24.hu"
            >
          </div>

          <div>
            <label for="smtp-from-email" class="field-label">Feladó e-mail-címe</label>
            <input
              id="smtp-from-email"
              v-model="form.fromEmail"
              type="email"
              class="field-input text-sm"
              placeholder="noreply@qrkod24.hu"
            >
          </div>
        </div>

        <p v-if="error" class="field-error mt-4" role="alert">{{ error }}</p>
      </form>

      <section class="card mt-4 p-5 sm:p-6">
        <h2 class="text-base font-semibold text-ink">Teszt e-mail</h2>
        <p class="mt-1 text-sm text-ink-soft">
          A gomb a fenti értékekkel küld egy levelet, mentés nélkül is – így a beállításokat
          mentés előtt kipróbálhatod.
        </p>

        <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div class="flex-1">
            <label for="smtp-test-to" class="field-label">Címzett</label>
            <input
              id="smtp-test-to"
              v-model="testTo"
              type="email"
              class="field-input text-sm"
              placeholder="sajat@email.hu"
              autocomplete="email"
            >
          </div>
          <button type="button" class="btn-secondary px-4 py-2.5 text-sm" :disabled="testing" @click="sendTest">
            <Icon :name="testing ? 'lucide:loader-circle' : 'lucide:send'" :class="['h-4 w-4', { 'animate-spin': testing }]" aria-hidden="true" />
            {{ testing ? 'Küldés…' : 'Teszt e-mail küldése' }}
          </button>
        </div>

        <p v-if="testError" class="field-error mt-3" role="alert">{{ testError }}</p>
        <p v-if="testMessage" class="mt-3 text-sm text-emerald-700 dark:text-emerald-300" role="status">{{ testMessage }}</p>
      </section>
    </template>
  </AdminPageLayout>
</template>
