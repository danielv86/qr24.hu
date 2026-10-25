import type { ContentFaq } from '~/lib/content/types'
import { absoluteUrl, buildStructuredData, serializeJsonLd } from '~/lib/seo'

interface ContentSeoInput {
  slug: string
  title: string
  description: string
  h1: string
  faqs?: ContentFaq[]
  isWebApp?: boolean
  updated?: string
}

export function useContentSeo(input: ContentSeoInput) {
  const { settings, brandName, siteUrl } = useSiteSettings()

  const override = computed(() => settings.value.seo[input.slug])
  const title = computed(() => override.value?.title?.trim() || input.title)
  const description = computed(() => override.value?.description?.trim() || input.description)
  const canonical = computed(() => absoluteUrl(siteUrl.value, input.slug))
  const fullTitle = computed(() =>
    title.value.includes(brandName.value) ? title.value : `${title.value} | ${brandName.value}`,
  )
  const robots = computed(() =>
    override.value?.noindex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  )
  const ogImage = computed(() => absoluteUrl(siteUrl.value, '/og-image.png'))

  useSeoMeta({
    title: () => fullTitle.value,
    description: () => description.value,
    ogTitle: () => fullTitle.value,
    ogDescription: () => description.value,
    ogType: 'website',
    ogUrl: () => canonical.value,
    ogSiteName: () => brandName.value,
    ogLocale: 'hu_HU',
    ogImage: () => ogImage.value,
    ogImageAlt: () => `${brandName.value} – ${input.h1}`,
    twitterCard: 'summary_large_image',
    twitterTitle: () => fullTitle.value,
    twitterDescription: () => description.value,
    twitterImage: () => ogImage.value,
    robots: () => robots.value,
  })

  const structuredData = computed(() =>
    buildStructuredData({
      siteUrl: siteUrl.value,
      path: input.slug,
      brandName: brandName.value,
      title: title.value,
      description: description.value,
      faqs: input.faqs,
      isWebApp: input.isWebApp,
      updated: input.updated,
    }),
  )

  useHead(() => ({
    link: [
      { rel: 'canonical', href: canonical.value },
      { rel: 'alternate', hreflang: 'hu', href: canonical.value },
      { rel: 'alternate', hreflang: 'x-default', href: canonical.value },
    ],
    script: [
      {
        type: 'application/ld+json',
        key: 'qr24-structured-data',
        innerHTML: serializeJsonLd(structuredData.value),
      },
    ],
  }))

  return { title, description, canonical, robots }
}
