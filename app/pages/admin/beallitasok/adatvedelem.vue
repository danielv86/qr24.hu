<script setup lang="ts">
definePageMeta({ layout: 'admin' })

useSeoMeta({
  title: 'Adatvédelem és jogi adatok | Admin',
  robots: 'noindex, nofollow',
})

const { form, loading, saving, error, message, save } = useAdminSettings()
</script>

<template>
  <AdminPageLayout title="Adatvédelem és jogi adatok">
    <template #actions>
      <button type="submit" form="legal-settings" class="btn-primary" :disabled="saving">
        <Icon :name="saving ? 'lucide:loader-circle' : 'lucide:save'" :class="['h-4 w-4', { 'animate-spin': saving }]" aria-hidden="true" />
        {{ saving ? 'Mentés…' : 'Mentés' }}
      </button>
    </template>

    <form id="legal-settings" class="card p-5 sm:p-6" novalidate @submit.prevent="save">
      <div v-if="loading" class="text-sm text-ink-muted">Betöltés…</div>

      <template v-else>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label for="legal-provider" class="field-label">Szolgáltató neve</label>
            <input id="legal-provider" v-model="form.legal.providerName" type="text" maxlength="160" class="field-input">
          </div>
          <div class="sm:col-span-2">
            <label for="legal-address" class="field-label">Székhely</label>
            <input id="legal-address" v-model="form.legal.providerAddress" type="text" maxlength="240" class="field-input">
          </div>
          <div>
            <label for="legal-email" class="field-label">Kapcsolattartó e-mail</label>
            <input id="legal-email" v-model="form.legal.providerEmail" type="email" class="field-input">
          </div>
          <div>
            <label for="legal-phone" class="field-label">Telefon</label>
            <input id="legal-phone" v-model="form.legal.providerPhone" type="text" maxlength="60" class="field-input">
          </div>
          <div>
            <label for="legal-tax" class="field-label">Adószám</label>
            <input id="legal-tax" v-model="form.legal.taxNumber" type="text" maxlength="40" class="field-input">
          </div>
          <div>
            <label for="legal-registry" class="field-label">Cégjegyzékszám</label>
            <input id="legal-registry" v-model="form.legal.registryNumber" type="text" maxlength="40" class="field-input">
          </div>
          <div>
            <label for="legal-hosting" class="field-label">Tárhelyszolgáltató</label>
            <input id="legal-hosting" v-model="form.legal.hostingProvider" type="text" maxlength="160" class="field-input">
          </div>
          <div>
            <label for="legal-hosting-address" class="field-label">Tárhelyszolgáltató címe</label>
            <input id="legal-hosting-address" v-model="form.legal.hostingAddress" type="text" maxlength="240" class="field-input">
          </div>
        </div>

        <p v-if="error" class="field-error mt-4" role="alert">{{ error }}</p>
        <p v-if="message" class="mt-3 text-sm text-emerald-700 dark:text-emerald-300" role="status">{{ message }}</p>
      </template>
    </form>
  </AdminPageLayout>
</template>
