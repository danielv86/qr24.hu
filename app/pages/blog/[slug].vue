<script setup lang="ts">
import type { ApiResponse } from '#shared/types/api'
import type { BlogPostDetail } from '#shared/types/blog'
import { absoluteUrl, serializeJsonLd } from '#shared/seo'

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))

const { data, error } = await useFetch<ApiResponse<BlogPostDetail>>(() => `/api/blog/${slug.value}`)

const post = computed<BlogPostDetail | null>(() => (data.value?.success ? data.value.data : null))

if (!post.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'A bejegyzés nem található.',
    fatal: true,
  })
}

const { siteUrl, brandName } = useSiteSettings()

const canonical = computed(() => absoluteUrl(siteUrl.value, `/blog/${slug.value}`))
const ogImage = computed(() =>
  post.value?.coverImage
    ? absoluteUrl(siteUrl.value, post.value.coverImage)
    : absoluteUrl(siteUrl.value, '/og-image.png'),
)

useSeoMeta({
  title: () => `${post.value?.title ?? 'Blog'} | ${brandName.value}`,
  description: () => post.value?.excerpt ?? '',
  ogTitle: () => `${post.value?.title ?? 'Blog'} | ${brandName.value}`,
  ogDescription: () => post.value?.excerpt ?? '',
  ogType: 'article',
  ogUrl: () => canonical.value,
  ogSiteName: () => brandName.value,
  ogImage: () => ogImage.value,
  ogImageAlt: () => post.value?.title ?? '',
  ogLocale: 'hu_HU',
  articlePublishedTime: () => post.value?.publishedAt ?? undefined,
  articleModifiedTime: () => post.value?.updatedAt,
  twitterCard: 'summary_large_image',
  robots: 'index, follow, max-image-preview:large, max-snippet:-1',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: [
    {
      type: 'application/ld+json',
      key: 'blog-post-jsonld',
      innerHTML: serializeJsonLd({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.value?.title ?? '',
        description: post.value?.excerpt ?? '',
        image: ogImage.value,
        datePublished: post.value?.publishedAt ?? undefined,
        dateModified: post.value?.updatedAt,
        inLanguage: 'hu',
        author: { '@type': 'Organization', name: brandName.value },
        publisher: { '@type': 'Organization', name: brandName.value, url: siteUrl.value },
        mainEntityOfPage: canonical.value,
        url: canonical.value,
      }),
    },
  ],
}))

function formatDate(value: string | null): string {
  if (!value) return ''
  return new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value))
}
</script>

<template>
  <article v-if="post" class="container-page py-8 sm:py-12">
    <NuxtLink to="/blog" class="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-brand-700">
      <Icon name="lucide:arrow-left" class="h-4 w-4" aria-hidden="true" />
      Vissza a bloghoz
    </NuxtLink>

    <header class="mx-auto mt-4 max-w-3xl">
      <div class="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
        <span v-if="post.category">{{ post.category }}</span>
        <span v-if="post.category" class="text-ink-muted" aria-hidden="true">·</span>
        <time v-if="post.publishedAt" :datetime="post.publishedAt" class="text-ink-muted">{{ formatDate(post.publishedAt) }}</time>
        <span class="text-ink-muted" aria-hidden="true">·</span>
        <span class="text-ink-muted">{{ post.readingMinutes }} perc olvasás</span>
      </div>
      <h1 class="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{{ post.title }}</h1>
      <p v-if="post.excerpt" class="mt-3 text-lg leading-relaxed text-ink-soft">{{ post.excerpt }}</p>
    </header>

    <img
      v-if="post.coverImage"
      :src="post.coverImage"
      :alt="post.title"
      class="mx-auto mt-6 aspect-[16/9] w-full max-w-4xl rounded-2xl border border-slate-200 object-cover"
    >

    <div class="mx-auto mt-8 max-w-3xl">
      <div class="blog-content" v-html="post.content" />

      <div v-if="post.tags.length" class="mt-8 flex flex-wrap gap-2 border-t border-slate-200 pt-5">
        <span
          v-for="tag in post.tags"
          :key="tag"
          class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-ink-soft"
        >
          #{{ tag }}
        </span>
      </div>

      <aside class="mt-10 rounded-2xl border border-brand-200 bg-brand-50/60 p-5">
        <h2 class="text-lg font-semibold text-ink">Készítenél saját QR-kódot?</h2>
        <p class="mt-1 text-sm text-ink-soft">
          Ingyenes generátorunkkal néhány másodperc alatt összeállíthatod a kódot – logóval, saját színekkel,
          akár dinamikus cél-URL-lel.
        </p>
        <NuxtLink to="/qr-kod-generator" class="btn-primary mt-3">
          QR-kód készítése
          <Icon name="lucide:arrow-right" class="h-4 w-4" aria-hidden="true" />
        </NuxtLink>
      </aside>
    </div>
  </article>
</template>
