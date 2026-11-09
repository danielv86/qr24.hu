<script setup lang="ts">
import type { AdminQrListItem, ApiSuccess } from '#shared/types/api'

definePageMeta({ layout: 'admin' })

useSeoMeta({
  title: 'Dinamikus QR-kódok | Admin',
  robots: 'noindex, nofollow',
})

const { session } = useAdminSession()

const qrItems = ref<AdminQrListItem[]>([])
const qrLoading = ref(false)
const qrError = ref('')
const qrQuery = reactive({ q: '', status: 'all', page: 1 })
const qrPagination = reactive({ page: 1, perPage: 20, total: 0, totalPages: 1 })
const actionMessage = ref('')
const actionError = ref('')
const pendingDelete = ref<number | null>(null)

async function loadQr(page = qrQuery.page) {
  qrLoading.value = true
  qrError.value = ''
  try {
    const params = new URLSearchParams({
      page: String(page),
      perPage: '20',
      status: qrQuery.status,
    })
    if (qrQuery.q.trim()) params.set('q', qrQuery.q.trim())
    const response = await $fetch<ApiSuccess<{ items: AdminQrListItem[]; pagination: typeof qrPagination }>>(
      `/api/admin/qr?${params.toString()}`,
    )
    qrItems.value = response.data.items
    Object.assign(qrPagination, response.data.pagination)
    qrQuery.page = response.data.pagination.page
  } catch (error) {
    qrError.value = apiErrorMessage(error, 'A QR-kódok betöltése nem sikerült.')
  } finally {
    qrLoading.value = false
  }
}

async function toggleQr(item: AdminQrListItem) {
  actionMessage.value = ''
  actionError.value = ''
  try {
    const response = await $fetch<ApiSuccess<AdminQrListItem>>(`/api/dynamic-qr/${item.shortCode}`, {
      method: 'PATCH',
      body: { isActive: !item.isActive },
    })
    const index = qrItems.value.findIndex(row => row.id === item.id)
    if (index >= 0) qrItems.value[index] = { ...response.data, ownerRef: item.ownerRef }
    actionMessage.value = response.data.isActive ? 'A QR-kód aktív.' : 'A QR-kód inaktív.'
  } catch (error) {
    actionError.value = apiErrorMessage(error, 'Az állapot módosítása nem sikerült.')
  }
}

async function deleteQr(item: AdminQrListItem) {
  actionMessage.value = ''
  actionError.value = ''
  try {
    await $fetch(`/api/dynamic-qr/${item.shortCode}`, { method: 'DELETE' })
    pendingDelete.value = null
    actionMessage.value = 'A dinamikus QR-kód törölve.'
    await loadQr(qrQuery.page)
  } catch (error) {
    actionError.value = apiErrorMessage(error, 'A törlés nem sikerült.')
  }
}

watch(
  session,
  (value) => {
    if (value) loadQr(1)
  },
  { immediate: true },
)
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink">Dinamikus QR-kódok</h1>
        <p class="mt-1 text-sm text-ink-soft">
          Összesen <span class="font-semibold text-ink">{{ qrPagination.total }}</span> kód. Itt kapcsolhatod ki,
          törölheted vagy keresheted a létrehozott kódokat.
        </p>
      </div>
    </div>

    <div v-if="actionMessage" class="mt-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300" role="status">
      {{ actionMessage }}
    </div>
    <div v-if="actionError" class="mt-4 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300" role="alert">
      {{ actionError }}
    </div>

    <div class="card mt-5 overflow-hidden">
      <div class="border-b border-slate-200 p-4">
        <form class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end" @submit.prevent="loadQr(1)">
          <label class="sr-only" for="admin-qr-search">Keresés</label>
          <input
            id="admin-qr-search"
            v-model="qrQuery.q"
            type="search"
            class="field-input py-2 text-sm sm:max-w-xs"
            placeholder="Keresés cím, kód vagy URL alapján"
          >
          <select v-model="qrQuery.status" class="field-input py-2 text-sm sm:max-w-[11rem]" aria-label="Állapot szűrése">
            <option value="all">Minden állapot</option>
            <option value="active">Aktív</option>
            <option value="inactive">Inaktív</option>
          </select>
          <button type="submit" class="btn-secondary py-2">Szűrés</button>
        </form>
      </div>

      <p v-if="qrError" class="p-4 text-sm text-red-600 dark:text-red-400" role="alert">{{ qrError }}</p>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[48rem] text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th class="px-4 py-2.5 font-medium">Kód / cím</th>
              <th class="px-4 py-2.5 font-medium">Cél-URL</th>
              <th class="px-4 py-2.5 font-medium">Beolvasás</th>
              <th class="px-4 py-2.5 font-medium">Állapot</th>
              <th class="px-4 py-2.5 font-medium">Műveletek</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="qrLoading">
              <td colspan="5" class="px-4 py-10 text-center text-ink-muted">Betöltés…</td>
            </tr>
            <tr v-else-if="!qrItems.length">
              <td colspan="5" class="px-4 py-10 text-center text-ink-muted">Nincs megjeleníthető dinamikus QR-kód.</td>
            </tr>
            <template v-else>
              <tr v-for="item in qrItems" :key="item.id" class="align-top">
                <td class="px-4 py-3">
                  <p class="font-mono text-xs text-ink">{{ item.shortCode }}</p>
                  <p class="mt-0.5 max-w-[14rem] truncate text-xs text-ink-muted">{{ item.title || 'Nincs megnevezés' }}</p>
                  <a :href="item.shortUrl" target="_blank" rel="noopener noreferrer" class="mt-1 inline-block text-xs text-brand-700 hover:underline">
                    Rövid link megnyitása
                  </a>
                </td>
                <td class="px-4 py-3">
                  <p class="max-w-[18rem] break-all text-xs text-ink-soft">{{ item.targetUrl }}</p>
                  <p class="mt-1 text-[11px] text-ink-muted">Létrehozva: {{ new Date(item.createdAt).toLocaleDateString('hu-HU') }}</p>
                </td>
                <td class="px-4 py-3 text-sm font-medium">{{ item.scans }}</td>
                <td class="px-4 py-3">
                  <span
                    :class="item.isActive ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 text-slate-600'"
                    class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  >
                    {{ item.isActive ? 'Aktív' : 'Inaktív' }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-1">
                    <button type="button" class="btn-ghost px-2 py-1 text-xs" @click="toggleQr(item)">
                      {{ item.isActive ? 'Kikapcsolás' : 'Aktiválás' }}
                    </button>
                    <template v-if="pendingDelete === item.id">
                      <button type="button" class="btn-ghost px-2 py-1 text-xs text-red-700 dark:text-red-300 hover:bg-red-50 dark:bg-red-950/40" @click="deleteQr(item)">
                        Törlés megerősítése
                      </button>
                      <button type="button" class="btn-ghost px-2 py-1 text-xs" @click="pendingDelete = null">Mégsem</button>
                    </template>
                    <button
                      v-else
                      type="button"
                      class="btn-ghost px-2 py-1 text-xs text-red-700 dark:text-red-300 hover:bg-red-50 dark:bg-red-950/40"
                      @click="pendingDelete = item.id"
                    >
                      Törlés
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-ink-muted">
        <span>{{ qrPagination.page }} / {{ qrPagination.totalPages }} oldal</span>
        <div class="flex gap-2">
          <button type="button" class="btn-secondary px-3 py-1.5 text-xs" :disabled="qrPagination.page <= 1" @click="loadQr(qrPagination.page - 1)">
            Előző
          </button>
          <button type="button" class="btn-secondary px-3 py-1.5 text-xs" :disabled="qrPagination.page >= qrPagination.totalPages" @click="loadQr(qrPagination.page + 1)">
            Következő
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
