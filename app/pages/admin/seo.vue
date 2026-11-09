<script setup lang="ts">
import type { ApiSuccess, PublicSettings } from '#shared/types/api'
import { LANDING_PAGES } from '#shared/content/landing-pages'
import { LEGAL_PAGES } from '#shared/content/legal-pages'

definePageMeta({ layout: 'admin' })

useSeoMeta({
  title: 'SEO metaadatok | Admin',
  robots: 'noindex, nofollow',
})

const { session } = useAdminSession()

const seoPaths = [
  { path: '/', label: 'Főoldal' },
  ...LANDING_PAGES.map(page => ({ path: page.slug, label: page.h1 })),
  { path: '/dinamikus-qr-kod', label: 'Dinamikus QR-kód' },
  ...LEGAL_PAGES.map(page => ({ path: page.slug, label: page.h1 })),
  { path: '/kapcsolat', label: 'Kapcsolat' },
]

const seoForm = reactive<Record<string, { title: string; description: string; noindex: boolean }>>({})
for (const item of seoPaths) {
  seoForm[item.path] = { title: '', description: '', noindex: false }
}
const seoFields = seoPaths.map(item => ({ ...item, form: seoForm[item.path]! }))
const seoLoading = ref(false)
const seoError = ref('')
const seoMessage = ref('')
const seoSavingPath = ref('')

async function loadSeo() {
  seoLoading.value = true
  seoError.value = ''
  try {
    const response = await $fetch<ApiSuccess<PublicSettings>>('/api/admin/settings')
    for (const item of seoPaths) {
      const override = response.data.seo[item.path]
      const target = seoForm[item.path]
      if (!target) continue
      target.title = override?.title || ''
      target.description = override?.description || ''
      target.noindex = override?.noindex || false
    }
  } catch (error) {
    seoError.value = apiErrorMessage(error, 'A SEO beállítások betöltése nem sikerült.')
  } finally {
    seoLoading.value = false
  }
}

async function saveSeo(path: string) {
  seoError.value = ''
  seoMessage.value = ''
  seoSavingPath.value = path
  try {
    const form = seoForm[path]!
    await $fetch('/api/admin/seo', {
      method: 'PATCH',
      body: {
        path,
        title: form.title.trim(),
        description: form.description.trim(),
        noindex: form.noindex,
      },
    })
    seoMessage.value = 'A SEO beállítás mentve. Üres mezők esetén az alapértelmezett cím és leírás érvényes.'
    await refreshNuxtData('public-settings')
  } catch (error) {
    seoError.value = apiErrorMessage(error, 'A SEO beállítás mentése nem sikerült.')
  } finally {
    seoSavingPath.value = ''
  }
}

const seoPreview = (path: string) => {
  const form = seoForm[path]
  return form?.title?.trim() || 'Az oldal alapértelmezett címe érvényes'
}

watch(
  session,
  (value) => {
    if (value) loadSeo()
  },
  { immediate: true },
)
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold tracking-tight text-ink">SEO metaadatok</h1>
    <p class="mt-1 max-w-3xl text-sm text-ink-soft">
      Egyedi cím és leírás oldalanként. Az üres cím/leírás esetén az alapértelmezett érték érvényes.
    </p>

    <p v-if="seoError" class="mt-4 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300" role="alert">{{ seoError }}</p>
    <p v-if="seoMessage" class="mt-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300" role="status">{{ seoMessage }}</p>
    <p v-if="seoLoading" class="mt-4 text-sm text-ink-muted">Betöltés…</p>

    <div class="mt-4 space-y-3">
      <details v-for="item in seoFields" :key="item.path" class="card overflow-hidden">
        <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span>
            <span class="block text-sm font-medium text-ink">{{ item.label }}</span>
            <span class="block text-xs text-ink-muted">{{ item.path }} – {{ seoPreview(item.path) }}</span>
          </span>
          <Icon name="lucide:chevron-down" class="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
        </summary>
        <div class="border-t border-slate-200 bg-slate-50/60 p-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label :for="`seo-title-${item.path}`" class="field-label">Cím (max. 70 karakter)</label>
              <input
                :id="`seo-title-${item.path}`"
                v-model="item.form.title"
                type="text"
                maxlength="70"
                class="field-input"
              >
              <p class="field-help">{{ item.form.title.length }}/70</p>
            </div>
            <div>
              <label :for="`seo-description-${item.path}`" class="field-label">Leírás (max. 180 karakter)</label>
              <textarea
                :id="`seo-description-${item.path}`"
                v-model="item.form.description"
                rows="2"
                maxlength="180"
                class="field-input"
              />
              <p class="field-help">{{ item.form.description.length }}/180</p>
            </div>
          </div>
          <label class="mt-3 flex items-center gap-2 text-xs text-ink-soft">
            <input v-model="item.form.noindex" type="checkbox" class="h-4 w-4 accent-brand-600">
            noindex – ne indexelje a kereső
          </label>
          <button
            type="button"
            class="btn-primary mt-3 px-4 py-2 text-xs"
            :disabled="seoSavingPath === item.path"
            @click="saveSeo(item.path)"
          >
            {{ seoSavingPath === item.path ? 'Mentés…' : 'Mentés' }}
          </button>
        </div>
      </details>
    </div>
  </div>
</template>
