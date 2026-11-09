<script setup lang="ts">
import type { ApiResponse } from '#shared/types/api'
import type { BlogPostPublicList } from '#shared/types/blog'

const route = useRoute()
const router = useRouter()

const page = computed(() => Math.max(1, Number(route.query.page) || 1))
const category = computed(() => String(route.query.kategoria || ''))

const { data, status } = await useFetch<ApiResponse<BlogPostPublicList>>('/api/blog/posts', {
  query: { page, category, perPage: 15 },
  watch: [page, category],
})

const list = computed<BlogPostPublicList>(() =>
  data.value?.success
    ? data.value.data
    : { items: [], total: 0, page: 1, perPage: 15, categories: [] },
)
const totalPages = computed(() => Math.max(1, Math.ceil(list.value.total / list.value.perPage)))

useContentSeo({
  slug: '/blog',
  title: 'QR-kód blog – útmutatók, tippek és ötletek',
  description:
    'Gyakorlati útmutatók a QR-kódok világából: hogyan készíts tartós, jól beolvasható kódot, mire figyelj a méretezésnél, és hogyan használd a kódot marketingben.',
  h1: 'Blog',
})

function formatDate(value: string | null): string {
  if (!value) return ''
  return new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value))
}

function selectCategory(name: string) {
  router.push({ query: name ? { kategoria: name } : {} })
}

function goToPage(next: number) {
  if (next < 1 || next > totalPages.value) return
  router.push({ query: { ...route.query, page: next > 1 ? String(next) : undefined } })
}
</script>

<template>
  <div>
    <section class="border-b border-slate-200 bg-gradient-to-b from-brand-50/70 to-canvas">
      <div class="container-page py-12 sm:py-16">
        <p class="text-xs font-semibold uppercase tracking-wide text-brand-700">QRKOD24.hu blog</p>
        <h1 class="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          QR-kódok gyakorlottan: útmutatók, tippek és ötletek
        </h1>
        <p class="mt-3 max-w-2xl text-base text-ink-soft">
          Hogyan készül egy jól beolvasható kód, mire figyelj a méretezésnél, és hogyan használd a QR-t
          marketingben, éttermekben vagy eseményeken – magyarul, gyakorlatiasan.
        </p>
      </div>
    </section>

    <section class="container-page py-8 sm:py-10">
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          :class="[
            'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
            !category ? 'bg-brand-600 text-white' : 'bg-slate-100 text-ink-soft hover:bg-slate-200',
          ]"
          @click="selectCategory('')"
        >
          Mind
        </button>
        <button
          v-for="item in list.categories"
          :key="item.name"
          type="button"
          :class="[
            'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
            category === item.name ? 'bg-brand-600 text-white' : 'bg-slate-100 text-ink-soft hover:bg-slate-200',
          ]"
          @click="selectCategory(item.name)"
        >
          {{ item.name }} ({{ item.count }})
        </button>
      </div>

      <p v-if="status === 'pending'" class="mt-8 text-sm text-ink-muted">Bejegyzések betöltése…</p>

      <p
        v-else-if="!list.items.length"
        class="mt-8 rounded-2xl border border-dashed border-slate-300 bg-surface px-4 py-16 text-center text-sm text-ink-muted"
      >
        Ebben a kategóriában még nincs bejegyzés.
        <NuxtLink to="/qr-kod-generator" class="font-semibold text-brand-700 hover:underline">Addig is készíts egy QR-kódot →</NuxtLink>
      </p>

      <div v-else class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="post in list.items"
          :key="post.id"
          :to="`/blog/${post.slug}`"
          class="card group flex flex-col overflow-hidden transition-shadow hover:shadow-lift"
        >
          <div class="aspect-[16/9] overflow-hidden bg-slate-100">
            <img
              v-if="post.coverImage"
              :src="post.coverImage"
              :alt="post.title"
              class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            >
            <div v-else class="grid h-full place-items-center bg-gradient-to-br from-brand-100 to-brand-50">
              <Icon name="lucide:newspaper" class="h-10 w-10 text-brand-500/70" aria-hidden="true" />
            </div>
          </div>
          <div class="flex flex-1 flex-col p-4">
            <div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
              <span v-if="post.category">{{ post.category }}</span>
              <span v-else class="text-ink-muted">Blog</span>
            </div>
            <h2 class="mt-1.5 text-lg font-semibold leading-snug text-ink group-hover:text-brand-800">
              {{ post.title }}
            </h2>
            <p v-if="post.excerpt" class="mt-2 line-clamp-3 text-sm text-ink-soft">{{ post.excerpt }}</p>
            <div class="mt-auto flex items-center gap-2 pt-4 text-xs text-ink-muted">
              <time v-if="post.publishedAt" :datetime="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
              <span aria-hidden="true">·</span>
              <span>{{ post.readingMinutes }} perc olvasás</span>
            </div>
          </div>
        </NuxtLink>
      </div>

      <div v-if="totalPages > 1" class="mt-8 flex items-center justify-center gap-2">
        <button type="button" class="btn-secondary px-4 py-2 text-sm" :disabled="page <= 1" @click="goToPage(page - 1)">
          Előző
        </button>
        <span class="text-xs text-ink-muted">{{ page }} / {{ totalPages }}</span>
        <button
          type="button"
          class="btn-secondary px-4 py-2 text-sm"
          :disabled="page >= totalPages"
          @click="goToPage(page + 1)"
        >
          Következő
        </button>
      </div>
    </section>
  </div>
</template>
