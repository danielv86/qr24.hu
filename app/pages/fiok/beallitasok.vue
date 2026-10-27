<script setup lang="ts">
import type { ApiSuccess, PlanId, UserProfile } from '#shared/types/api'

definePageMeta({ layout: 'fiok', middleware: 'auth' })

useSeoMeta({
  title: 'Fiók beállításai | QRKOD24.hu',
  description: 'Profil, jelszó és fiókbeállítások.',
  robots: 'noindex, nofollow',
})

const { user, refresh } = useUserSession()
const { settings } = useSiteSettings()
const request = useRequestFetch()

const planLabel = computed(() => {
  const plan = (user.value?.plan || 'free') as PlanId
  return settings.value.plans?.[plan]?.label || 'Ingyenes'
})

const profile = reactive({
  name: user.value?.name || '',
  email: user.value?.email || '',
  currentPassword: '',
})

const savingProfile = ref(false)
const profileMessage = ref('')
const profileError = ref('')

const emailChanged = computed(() => profile.email.trim().toLowerCase() !== (user.value?.email || '').toLowerCase())

async function saveProfile() {
  if (savingProfile.value) return
  savingProfile.value = true
  profileMessage.value = ''
  profileError.value = ''
  const changedEmail = emailChanged.value
  try {
    const body: Record<string, string> = { name: profile.name.trim() }
    if (changedEmail) {
      body.email = profile.email.trim().toLowerCase()
      body.currentPassword = profile.currentPassword
    }
    const response = await $fetch<ApiSuccess<UserProfile>>('/api/account', { method: 'PATCH', body })
    await refresh()
    profile.email = response.data.email
    profile.currentPassword = ''
    profileMessage.value = changedEmail
      ? 'A módosítások mentve. Az új e-mail-címet a következő bejelentkezéskor használd.'
      : 'A módosítások mentve.'
  } catch (error) {
    profileError.value = apiErrorMessage(error, 'A mentés nem sikerült.')
  } finally {
    savingProfile.value = false
  }
}

const password = reactive({ currentPassword: '', newPassword: '', confirm: '' })
const savingPassword = ref(false)
const passwordMessage = ref('')
const passwordError = ref('')

async function savePassword() {
  if (savingPassword.value) return
  passwordMessage.value = ''
  passwordError.value = ''
  if (password.newPassword !== password.confirm) {
    passwordError.value = 'A két jelszó nem egyezik.'
    return
  }
  if (password.newPassword.length < 10) {
    passwordError.value = 'A jelszó legalább 10 karakter legyen.'
    return
  }
  savingPassword.value = true
  try {
    await $fetch('/api/account/password', {
      method: 'POST',
      body: {
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      },
    })
    password.currentPassword = ''
    password.newPassword = ''
    password.confirm = ''
    passwordMessage.value = 'A jelszó frissítve.'
  } catch (error) {
    passwordError.value = apiErrorMessage(error, 'A jelszó módosítása nem sikerült.')
  } finally {
    savingPassword.value = false
  }
}

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const deletion = reactive({ email: '', password: '' })

function openDelete() {
  deletion.email = ''
  deletion.password = ''
  deleteError.value = ''
  deleteOpen.value = true
}

async function deleteAccount() {
  if (deleting.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await $fetch('/api/account/delete', {
      method: 'POST',
      body: { confirmEmail: deletion.email.trim(), password: deletion.password },
    })
    deleteOpen.value = false
    await refresh()
    await navigateTo('/')
  } catch (error) {
    deleteError.value = apiErrorMessage(error, 'A fiók törlése nem sikerült.')
  } finally {
    deleting.value = false
  }
}

const activity = await useAsyncData('fiok-settings-summary', async () => {
  const response = await request<ApiSuccess<{ totalQrCodes: number }>>('/api/dashboard/summary')
  return response.data
}, { default: () => null })

const totalQrCodes = computed(() => activity.data.value?.totalQrCodes ?? 0)

const memberSince = computed(() => {
  const value = user.value?.createdAt
  if (!value) return '–'
  return new Date(value).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold tracking-tight text-ink">Fiók</h1>
    <p class="mt-1 text-sm text-ink-soft">A profilod, a jelszavad és a fiókhoz tartozó beállítások.</p>

    <div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div class="space-y-4">
        <section class="card p-4" aria-labelledby="profile-title">
          <h2 id="profile-title" class="text-base font-semibold text-ink">Profil</h2>
          <p class="mt-1 text-xs text-ink-muted">A név és az e-mail-cím a fiókodhoz tartozik.</p>

          <p v-if="profileMessage" class="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
            {{ profileMessage }}
          </p>
          <p v-if="profileError" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {{ profileError }}
          </p>

          <form class="mt-4 space-y-3" @submit.prevent="saveProfile">
            <div>
              <label for="profile-name" class="field-label">Név</label>
              <input id="profile-name" v-model="profile.name" class="field-input" maxlength="120" autocomplete="name">
            </div>
            <div>
              <label for="profile-email" class="field-label">E-mail-cím</label>
              <input
                id="profile-email"
                v-model="profile.email"
                class="field-input"
                type="email"
                autocomplete="email"
                required
              >
              <p class="field-help">Az e-mail-cím módosításához a jelenlegi jelszót is meg kell adnod.</p>
            </div>
            <div v-if="emailChanged">
              <label for="profile-password" class="field-label">Jelenlegi jelszó</label>
              <input
                id="profile-password"
                v-model="profile.currentPassword"
                class="field-input"
                type="password"
                autocomplete="current-password"
                required
              >
            </div>

            <div class="flex justify-end">
              <button type="submit" class="btn-primary px-4 py-2.5 text-sm" :disabled="savingProfile">
                <Icon :name="savingProfile ? 'lucide:loader-circle' : 'lucide:save'" :class="['h-4 w-4', { 'animate-spin': savingProfile }]" aria-hidden="true" />
                {{ savingProfile ? 'Mentés…' : 'Módosítások mentése' }}
              </button>
            </div>
          </form>
        </section>

        <section class="card p-4" aria-labelledby="password-title">
          <h2 id="password-title" class="text-base font-semibold text-ink">Jelszó</h2>
          <p class="mt-1 text-xs text-ink-muted">
            Legalább 10 karakter, betűvel és számmal. Ha külső szolgáltatóval jelentkezel be, itt adhatsz meg jelszót a fiókodhoz.
          </p>

          <p v-if="passwordMessage" class="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
            {{ passwordMessage }}
          </p>
          <p v-if="passwordError" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {{ passwordError }}
          </p>

          <form class="mt-4 space-y-3" @submit.prevent="savePassword">
            <div>
              <label for="current-password" class="field-label">Jelenlegi jelszó</label>
              <input
                id="current-password"
                v-model="password.currentPassword"
                class="field-input"
                type="password"
                autocomplete="current-password"
                placeholder="Ha még nincs jelszavad, hagyd üresen"
              >
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label for="new-password" class="field-label">Új jelszó</label>
                <input
                  id="new-password"
                  v-model="password.newPassword"
                  class="field-input"
                  type="password"
                  autocomplete="new-password"
                  minlength="10"
                  required
                >
              </div>
              <div>
                <label for="confirm-password" class="field-label">Új jelszó mégegyszer</label>
                <input
                  id="confirm-password"
                  v-model="password.confirm"
                  class="field-input"
                  type="password"
                  autocomplete="new-password"
                  minlength="10"
                  required
                >
              </div>
            </div>

            <div class="flex justify-end">
              <button type="submit" class="btn-primary px-4 py-2.5 text-sm" :disabled="savingPassword">
                <Icon :name="savingPassword ? 'lucide:loader-circle' : 'lucide:key-round'" :class="['h-4 w-4', { 'animate-spin': savingPassword }]" aria-hidden="true" />
                {{ savingPassword ? 'Mentés…' : 'Jelszó módosítása' }}
              </button>
            </div>
          </form>
        </section>

        <section class="card p-4" aria-labelledby="language-title">
          <h2 id="language-title" class="text-base font-semibold text-ink">Nyelv</h2>
          <p class="mt-1 text-xs text-ink-muted">A felület nyelve. A magyar tartalom minden nyelven elérhető.</p>
          <div class="mt-3">
            <LanguageSwitcher />
          </div>
        </section>

        <section class="rounded-2xl border border-red-200 bg-white p-4" aria-labelledby="danger-title">
          <h2 id="danger-title" class="text-base font-semibold text-red-700">Fiók törlése</h2>
          <p class="mt-1 text-xs leading-relaxed text-ink-muted">
            A törléssel megszűnik a hozzáférésed, a dinamikus QR-kódjaid átirányítása leáll, és a statisztikáid
            véglegesen elvész. A művelet nem visszavonható.
          </p>
          <button type="button" class="btn-secondary mt-3 border-red-300 px-3 py-2 text-xs text-red-700 hover:bg-red-50" @click="openDelete">
            <Icon name="lucide:trash-2" class="h-4 w-4" aria-hidden="true" />
            Fiók törlése
          </button>
        </section>
      </div>

      <aside class="space-y-4">
        <section class="card p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-ink-muted">Csomag</p>
          <p class="mt-1 text-lg font-semibold text-ink">{{ planLabel }}</p>
          <p class="mt-1 text-xs text-ink-muted">
            {{ totalQrCodes }} dinamikus QR-kód a fiókban.
          </p>
          <NuxtLink to="/fiok/szamlazas" class="btn-secondary mt-3 w-full px-3 py-2 text-xs">
            <Icon name="lucide:credit-card" class="h-4 w-4" aria-hidden="true" />
            Számlázás és limitek
          </NuxtLink>
        </section>

        <section class="card p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-ink-muted">Fiók adatai</p>
          <dl class="mt-2 space-y-1.5 text-xs">
            <div class="flex justify-between gap-2">
              <dt class="text-ink-muted">E-mail</dt>
              <dd class="truncate text-right font-medium text-ink">{{ user?.email }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-ink-muted">Tagság kezdete</dt>
              <dd class="text-right text-ink">{{ memberSince }}</dd>
            </div>
          </dl>
        </section>
      </aside>
    </div>

    <div v-if="deleteOpen" class="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
      <div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title">
        <h2 id="delete-account-title" class="text-lg font-semibold text-ink">Fiók végleges törlése</h2>
        <p class="mt-2 text-sm text-ink-soft">
          Ez a művelet nem visszavonható. A megerősítéshez írd be a fiókod e-mail-címét
          (<strong>{{ user?.email }}</strong>), és add meg a jelszavad.
        </p>

        <p v-if="deleteError" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {{ deleteError }}
        </p>

        <form class="mt-4 space-y-3" @submit.prevent="deleteAccount">
          <div>
            <label for="delete-email" class="field-label">E-mail-cím</label>
            <input id="delete-email" v-model="deletion.email" class="field-input" type="email" autocomplete="off" required>
          </div>
          <div>
            <label for="delete-password" class="field-label">Jelszó</label>
            <input id="delete-password" v-model="deletion.password" class="field-input" type="password" autocomplete="current-password">
          </div>

          <div class="flex justify-end gap-2 pt-1">
            <button type="button" class="btn-secondary px-3 py-2 text-sm" @click="deleteOpen = false">Mégse</button>
            <button
              type="submit"
              class="btn-primary bg-red-600 px-3 py-2 text-sm hover:bg-red-700"
              :disabled="deleting || !deletion.email"
            >
              {{ deleting ? 'Törlés…' : 'Fiók törlése' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
