<script setup lang="ts">
definePageMeta({ layout: 'admin' })

useSeoMeta({
  title: 'Általános beállítások | Admin',
  robots: 'noindex, nofollow',
})

const { form, loading, saving, error, message, runtimeInfo, save } = useAdminSettings()
</script>

<template>
  <AdminPageLayout title="Általános beállítások">
    <template #actions>
      <button type="submit" form="general-settings" class="btn-primary" :disabled="saving">
        <Icon :name="saving ? 'lucide:loader-circle' : 'lucide:save'" :class="['h-4 w-4', { 'animate-spin': saving }]" aria-hidden="true" />
        {{ saving ? 'Mentés…' : 'Mentés' }}
      </button>
    </template>

    <form id="general-settings" class="card p-5 sm:p-6" novalidate @submit.prevent="save">
      <div v-if="loading" class="text-sm text-ink-muted">Betöltés…</div>

      <template v-else>
        <div>
          <label for="admin-brand" class="field-label">Márkanév</label>
          <input id="admin-brand" v-model="form.brandName" type="text" maxlength="80" class="field-input" required>
        </div>

        <dl class="mt-5 grid gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs sm:grid-cols-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <dt class="text-ink-muted">Nyilvános webcím</dt>
            <dd class="font-medium text-ink">{{ runtimeInfo.siteUrl || '–' }}</dd>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <dt class="text-ink-muted">Dinamikus QR-kódok</dt>
            <dd class="font-medium text-ink">{{ runtimeInfo.dynamicQrEnabled ? 'engedélyezve' : 'kikapcsolva' }}</dd>
          </div>
        </dl>

        <p v-if="error" class="field-error mt-4" role="alert">{{ error }}</p>
        <p v-if="message" class="mt-3 text-sm text-emerald-700 dark:text-emerald-300" role="status">{{ message }}</p>
      </template>
    </form>
  </AdminPageLayout>
</template>
