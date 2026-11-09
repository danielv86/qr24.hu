<script setup lang="ts">
definePageMeta({ layout: 'admin' })

useSeoMeta({
  title: 'AdSense beállítások | Admin',
  robots: 'noindex, nofollow',
})

const { form, loading, saving, error, message, save } = useAdminSettings()
const SLOTS = ['top', 'sidebar', 'content', 'guide', 'mobile'] as const
</script>

<template>
  <AdminPageLayout title="AdSense beállítások">
    <template #actions>
      <button type="submit" form="adsense-settings" class="btn-primary" :disabled="saving">
        <Icon :name="saving ? 'lucide:loader-circle' : 'lucide:save'" :class="['h-4 w-4', { 'animate-spin': saving }]" aria-hidden="true" />
        {{ saving ? 'Mentés…' : 'Mentés' }}
      </button>
    </template>

    <form id="adsense-settings" class="card p-5 sm:p-6" novalidate @submit.prevent="save">
      <div v-if="loading" class="text-sm text-ink-muted">Betöltés…</div>

      <template v-else>
        <div>
          <label for="adsense-client" class="field-label">Kliensazonosító (ca-pub-…)</label>
          <input
            id="adsense-client"
            v-model="form.adsense.client"
            type="text"
            class="field-input font-mono text-sm"
            placeholder="ca-pub-1234567890123456"
          >
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <div v-for="slot in SLOTS" :key="slot">
            <label :for="`adsense-slot-${slot}`" class="field-label capitalize">{{ slot }} hirdetési hely</label>
            <input
              :id="`adsense-slot-${slot}`"
              v-model="form.adsense.slots[slot]"
              type="text"
              inputmode="numeric"
              class="field-input font-mono text-sm"
              placeholder="1234567890"
            >
          </div>
        </div>

        <p v-if="error" class="field-error mt-4" role="alert">{{ error }}</p>
        <p v-if="message" class="mt-3 text-sm text-emerald-700 dark:text-emerald-300" role="status">{{ message }}</p>
      </template>
    </form>
  </AdminPageLayout>
</template>
