<script setup lang="ts">
import type { AdminUserDetail } from '#shared/types/api'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const { session } = useAdminSession()

const detail = ref<AdminUserDetail | null>(null)
const loading = ref(false)
const error = ref('')

const toast = useAdminToast()
const planBusy = ref(false)
const pendingPlan = ref<'lifetime' | 'free' | null>(null)

/** Élettartam csomag kiosztása vagy visszavonása. */
async function changePlan(plan: 'lifetime' | 'free') {
  planBusy.value = true
  try {
    await $fetch(`/api/admin/users/${encodeURIComponent(userId.value)}/plan`, {
      method: 'POST',
      body: { plan },
      headers: { accept: 'application/json' },
    })
    pendingPlan.value = null
    toast.success(
      plan === 'lifetime' ? 'Élettartam csomag kiosztva' : 'Csomag visszavonva',
      plan === 'lifetime' ? 'A fiók élettartam csomagra váltott.' : 'A fiók visszaállt ingyenesre.',
    )
    await load()
  } catch (cause) {
    toast.error('A csomag módosítása nem sikerült', apiErrorMessage(cause, 'Próbáld újra később.'))
  } finally {
    planBusy.value = false
  }
}

const userId = computed(() => String(route.params.id ?? ''))

useSeoMeta({
  title: () => `${detail.value?.email ?? 'Felhasználó'} | Admin`,
  robots: 'noindex, nofollow',
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await $fetch<{ success: true; data: AdminUserDetail }>(
      `/api/admin/users/${encodeURIComponent(userId.value)}`,
      { headers: { accept: 'application/json' }, cache: 'no-store' },
    )
    detail.value = response.data
  } catch (cause) {
    detail.value = null
    error.value = apiErrorMessage(cause, 'A felhasználó adatlapja nem tölthető be.')
  } finally {
    loading.value = false
  }
}

watch([session, userId], ([value]) => {
  if (value) load()
}, { immediate: true })

const STATUS_LABELS: Record<'trialing' | 'active' | 'canceled' | 'expired' | 'free', string> = {
  trialing: 'Próbaidő',
  active: 'Aktív',
  canceled: 'Lemondva',
  expired: 'Lejárt',
  free: 'Ingyenes',
}

function statusClasses(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    case 'trialing':
      return 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
    case 'canceled':
      return 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '–'
  return new Date(value).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '–'
  return new Date(value).toLocaleString('hu-HU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncate(value: string, max = 60): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

const statusLabel = computed(() => {
  const status = detail.value?.subscription?.status
  return status ? STATUS_LABELS[status] : 'Ingyenes'
})

function intervalLabel(interval: string): string {
  if (interval === 'lifetime') return 'Élettartam'
  return interval === 'yearly' ? 'Éves' : 'Havi'
}

function qrStatusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'Aktív'
    case 'paused':
      return 'Szüneteltetett'
    case 'expired':
      return 'Lejárt'
    default:
      return status
  }
}
</script>

<template>
  <AdminPageLayout :title="detail?.email ?? 'Felhasználó'" :description="detail?.name ?? ''">
    <template #actions>
      <button type="button" class="btn-secondary px-3 py-2 text-xs" :disabled="loading" @click="load">
        <Icon :name="loading ? 'lucide:loader-circle' : 'lucide:refresh-cw'" :class="['h-4 w-4', { 'animate-spin': loading }]" aria-hidden="true" />
        {{ loading ? 'Betöltés…' : 'Frissítés' }}
      </button>
      <NuxtLink to="/admin/felhasznalok" class="btn-secondary px-3 py-2 text-xs">
        <Icon name="lucide:arrow-left" class="h-4 w-4" aria-hidden="true" />
        Vissza a listához
      </NuxtLink>
      <NuxtLink to="/admin/elofizetesek" class="btn-secondary px-3 py-2 text-xs">
        <Icon name="lucide:receipt" class="h-4 w-4" aria-hidden="true" />
        Előfizetések
      </NuxtLink>
    </template>

    <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">{{ error }}</p>
    <p v-else-if="loading && !detail" class="text-sm text-ink-muted">Betöltés…</p>

    <div v-if="detail" class="space-y-4">
      <div class="grid gap-4 xl:grid-cols-2">
        <section class="card p-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-sm font-semibold text-ink">Fiók</h2>
            <div class="flex flex-wrap items-center gap-1.5">
              <span :class="['inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold', statusClasses(detail.subscription?.status ?? 'free')]">
                {{ detail.planLabel }} · {{ statusLabel }}
              </span>
              <span
                :class="[
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  detail.emailVerified
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-600',
                ]"
              >
                {{ detail.emailVerified ? 'E-mail ellenőrizve' : 'E-mail nincs ellenőrizve' }}
              </span>
            </div>
          </div>

          <dl class="mt-3 grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
            <div>
              <dt class="text-ink-muted">Azonosító</dt>
              <dd class="font-medium text-ink">#{{ detail.id }}</dd>
            </div>
            <div>
              <dt class="text-ink-muted">Név</dt>
              <dd class="font-medium text-ink">{{ detail.name ?? '–' }}</dd>
            </div>
            <div>
              <dt class="text-ink-muted">E-mail</dt>
              <dd class="font-medium text-ink break-all">{{ detail.email }}</dd>
            </div>
            <div>
              <dt class="text-ink-muted">Tárolt csomag a fiókon</dt>
              <dd class="font-medium text-ink">{{ detail.storedPlan }} → érvényes: {{ detail.plan }}</dd>
            </div>
            <div>
              <dt class="text-ink-muted">Regisztrált</dt>
              <dd class="font-medium text-ink">{{ formatDateTime(detail.createdAt) }}</dd>
            </div>
            <div>
              <dt class="text-ink-muted">Utolsó módosítás</dt>
              <dd class="font-medium text-ink">{{ formatDateTime(detail.updatedAt) }}</dd>
            </div>
            <div>
              <dt class="text-ink-muted">Utolsó belépés</dt>
              <dd class="font-medium text-ink">{{ formatDateTime(detail.lastLoginAt) }}</dd>
            </div>
            <div>
              <dt class="text-ink-muted">Munkamenetek</dt>
              <dd class="font-medium text-ink">{{ detail.sessions.active }} aktív / {{ detail.sessions.total }} összes</dd>
            </div>
          </dl>
        </section>

        <section class="card p-4">
          <h2 class="text-sm font-semibold text-ink">Előfizetés</h2>

          <template v-if="detail.subscription">
            <dl class="mt-3 grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
              <div>
                <dt class="text-ink-muted">Csomag</dt>
                <dd class="font-medium text-ink">{{ detail.subscription.planLabel }} ({{ detail.subscription.plan }})</dd>
              </div>
              <div>
                <dt class="text-ink-muted">Számlázás</dt>
                <dd class="font-medium text-ink">{{ intervalLabel(detail.subscription.interval) }}</dd>
              </div>
              <div>
                <dt class="text-ink-muted">Állapot</dt>
                <dd class="font-medium text-ink">{{ STATUS_LABELS[detail.subscription.status] }}</dd>
              </div>
              <div>
                <dt class="text-ink-muted">Lemondva</dt>
                <dd class="font-medium text-ink">{{ detail.subscription.cancelAtPeriodEnd ? 'Igen (időszak végéig él)' : 'Nem' }}</dd>
              </div>
              <div>
                <dt class="text-ink-muted">Próbaidő vége</dt>
                <dd class="font-medium text-ink">{{ formatDate(detail.subscription.trialEndsAt) }}</dd>
              </div>
              <div>
                <dt class="text-ink-muted">Próbaidő elérhető még</dt>
                <dd class="font-medium text-ink">{{ detail.subscription.trialAvailable ? 'Igen' : 'Nem' }}</dd>
              </div>
              <div>
                <dt class="text-ink-muted">Időszak kezdete</dt>
                <dd class="font-medium text-ink">{{ formatDate(detail.subscription.currentPeriodStart) }}</dd>
              </div>
              <div>
                <dt class="text-ink-muted">Időszak vége</dt>
                <dd class="font-medium text-ink">
                  {{ detail.subscription.interval === 'lifetime' ? 'Nincs lejárat' : formatDate(detail.subscription.currentPeriodEnd) }}
                </dd>
              </div>
              <div>
                <dt class="text-ink-muted">Lemondás dátuma</dt>
                <dd class="font-medium text-ink">{{ formatDateTime(detail.subscription.canceledAt) }}</dd>
              </div>
              <div>
                <dt class="text-ink-muted">Lezárult</dt>
                <dd class="font-medium text-ink">{{ formatDateTime(detail.subscription.endedAt) }}</dd>
              </div>
            </dl>
          </template>
          <p v-else class="mt-3 text-sm text-ink-muted">A fióknak nincs előfizetése (ingyenes csomag).</p>

          <div class="mt-4 border-t border-slate-100 pt-3">
            <div v-if="pendingPlan" class="flex flex-wrap items-center gap-2 text-xs">
              <span class="text-ink-soft">
                {{ pendingPlan === 'lifetime' ? 'Élettartam csomag kiosztása a fióknak?' : 'Visszavonod az élettartam csomagot?' }}
              </span>
              <button type="button" class="btn-primary px-3 py-1.5 text-xs" :disabled="planBusy" @click="changePlan(pendingPlan)">
                {{ planBusy ? 'Mentés…' : 'Igen' }}
              </button>
              <button type="button" class="btn-secondary px-3 py-1.5 text-xs" :disabled="planBusy" @click="pendingPlan = null">
                Mégse
              </button>
            </div>
            <div v-else class="flex flex-wrap gap-2">
              <button
                v-if="detail.subscription?.interval !== 'lifetime'"
                type="button"
                class="btn-secondary px-3 py-1.5 text-xs"
                :disabled="planBusy"
                @click="pendingPlan = 'lifetime'"
              >
                <Icon name="lucide:infinity" class="h-4 w-4" aria-hidden="true" />
                Élettartam csomag kiosztása
              </button>
              <button
                v-else
                type="button"
                class="btn-secondary px-3 py-1.5 text-xs text-red-600"
                :disabled="planBusy"
                @click="pendingPlan = 'free'"
              >
                <Icon name="lucide:x" class="h-4 w-4" aria-hidden="true" />
                Élettartam visszavonása
              </button>
            </div>
          </div>
        </section>
      </div>

      <section class="card p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-sm font-semibold text-ink">Dinamikus QR-kódok</h2>
          <p class="text-[11px] text-ink-muted">
            {{ detail.qrCodes.length }} kód · {{ detail.qrTotalScans }} beolvasás
          </p>
        </div>

        <div v-if="detail.qrCodes.length" class="mt-3 overflow-x-auto">
          <table class="w-full min-w-[52rem] text-left text-xs">
            <thead class="bg-slate-50 text-ink-muted">
              <tr>
                <th class="px-3 py-2 font-medium">Kód</th>
                <th class="px-3 py-2 font-medium">Cél</th>
                <th class="px-3 py-2 font-medium">Állapot</th>
                <th class="px-3 py-2 font-medium">Beolvasás</th>
                <th class="px-3 py-2 font-medium">Utolsó beolvasás</th>
                <th class="px-3 py-2 font-medium">Létrehozva</th>
                <th class="px-3 py-2 font-medium">Lejárat</th>
                <th class="px-3 py-2 font-medium sr-only">Megnyitás</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="qr in detail.qrCodes" :key="qr.id" class="align-top">
                <td class="px-3 py-2">
                  <span class="block font-medium text-ink">{{ qr.title || qr.publicId }}</span>
                  <span class="block text-[11px] text-ink-muted">{{ qr.publicId }} · {{ qr.category || 'nincs kategória' }}</span>
                </td>
                <td class="px-3 py-2 text-ink-soft">
                  <a :href="qr.targetUrl" target="_blank" rel="noopener noreferrer" class="hover:text-brand-600">
                    {{ truncate(qr.targetUrl) }}
                  </a>
                </td>
                <td class="px-3 py-2">
                  <span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {{ qrStatusLabel(qr.status) }}{{ qr.isActive ? '' : ' · inaktív' }}
                  </span>
                </td>
                <td class="px-3 py-2 text-ink-soft">{{ qr.scans }}</td>
                <td class="px-3 py-2 text-ink-muted">{{ formatDateTime(qr.lastScanAt) }}</td>
                <td class="px-3 py-2 text-ink-muted">{{ formatDate(qr.createdAt) }}</td>
                <td class="px-3 py-2 text-ink-muted">{{ formatDate(qr.expiresAt) }}</td>
                <td class="px-3 py-2 text-right">
                  <a :href="qr.shortUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-brand-600 hover:underline">
                    /go link
                    <Icon name="lucide:external-link" class="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="mt-3 rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-ink-muted">
          A felhasználónak még nincs dinamikus QR-kódja.
        </p>
      </section>

      <div class="grid gap-4 xl:grid-cols-2">
        <section class="card p-4">
          <h2 class="text-sm font-semibold text-ink">Bejelentkezés és biztonság</h2>
          <dl class="mt-3 grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
            <div>
              <dt class="text-ink-muted">Jelszó</dt>
              <dd class="font-medium text-ink">{{ detail.hasPassword ? 'Beállítva' : 'Nincs (csak OAuth)' }}</dd>
            </div>
            <div>
              <dt class="text-ink-muted">OAuth fiókok</dt>
              <dd class="font-medium text-ink">{{ detail.oauthProviders.length ? detail.oauthProviders.join(', ') : '–' }}</dd>
            </div>
            <div>
              <dt class="text-ink-muted">Aktív munkamenetek</dt>
              <dd class="font-medium text-ink">{{ detail.sessions.active }}</dd>
            </div>
            <div>
              <dt class="text-ink-muted">Legkésőbbi lejárat</dt>
              <dd class="font-medium text-ink">{{ formatDateTime(detail.sessions.latestExpiresAt) }}</dd>
            </div>
            <div>
              <dt class="text-ink-muted">Ellenőrző kód kiküldve</dt>
              <dd class="font-medium text-ink">{{ formatDateTime(detail.emailVerification.sentAt) }}</dd>
            </div>
            <div>
              <dt class="text-ink-muted">Kód lejár</dt>
              <dd class="font-medium text-ink">{{ formatDateTime(detail.emailVerification.expiresAt) }}</dd>
            </div>
            <div>
              <dt class="text-ink-muted">Kód próbálkozások</dt>
              <dd class="font-medium text-ink">{{ detail.emailVerification.attempts }}</dd>
            </div>
            <div>
              <dt class="text-ink-muted">Függő kód</dt>
              <dd class="font-medium text-ink">{{ detail.emailVerification.pending ? 'Igen' : 'Nem' }}</dd>
            </div>
          </dl>
        </section>

        <section class="card p-4">
          <h2 class="text-sm font-semibold text-ink">Saját domainek</h2>
          <ul v-if="detail.customDomains.length" class="mt-3 space-y-2 text-xs">
            <li v-for="domain in detail.customDomains" :key="domain.id" class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
              <span class="font-medium text-ink">{{ domain.host }}</span>
              <span :class="domain.verifiedAt ? 'text-emerald-700 dark:text-emerald-300' : 'text-ink-muted'">
                {{ domain.verifiedAt ? `Ellenőrizve: ${formatDate(domain.verifiedAt)}` : 'Nincs ellenőrizve' }}
              </span>
            </li>
          </ul>
          <p v-else class="mt-3 text-sm text-ink-muted">Nincs saját domain.</p>

          <h2 class="mt-4 text-sm font-semibold text-ink">API-kulcsok</h2>
          <ul v-if="detail.apiKeys.length" class="mt-3 space-y-2 text-xs">
            <li v-for="key in detail.apiKeys" :key="key.id" class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
              <span class="font-medium text-ink">{{ key.name }} <span class="font-mono text-[11px] text-ink-muted">{{ key.prefix }}…</span></span>
              <span :class="key.revokedAt ? 'text-red-600' : 'text-ink-muted'">
                {{ key.revokedAt ? `Visszavonva: ${formatDate(key.revokedAt)}` : `Utolsó használat: ${formatDateTime(key.lastUsedAt)}` }}
              </span>
            </li>
          </ul>
          <p v-else class="mt-3 text-sm text-ink-muted">Nincs API-kulcs.</p>
        </section>
      </div>

      <section class="card p-4">
        <h2 class="text-sm font-semibold text-ink">Legutóbbi naplóbejegyzések</h2>
        <ul v-if="detail.auditLogs.length" class="mt-3 space-y-1.5 text-xs">
          <li v-for="log in detail.auditLogs" :key="log.id" class="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
            <span class="font-mono text-[11px] font-medium text-ink">{{ log.action }}</span>
            <span class="text-ink-muted">{{ formatDateTime(log.createdAt) }}</span>
            <span v-if="log.details" class="w-full truncate text-[11px] text-ink-muted" :title="log.details">{{ truncate(log.details, 140) }}</span>
          </li>
        </ul>
        <p v-else class="mt-3 text-sm text-ink-muted">Nincs naplóbejegyzés.</p>
      </section>
    </div>
  </AdminPageLayout>
</template>
