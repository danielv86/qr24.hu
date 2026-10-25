import type { ContentFaq } from './content/types'

export interface StructuredDataInput {
  siteUrl: string
  path: string
  brandName: string
  title: string
  description: string
  faqs?: ContentFaq[]
  isWebApp?: boolean
  updated?: string
}

export interface BreadcrumbEntry {
  name: string
  path: string
}

export function absoluteUrl(siteUrl: string, path: string): string {
  const base = siteUrl.replace(/\/$/, '')
  if (path === '/' || !path) return `${base}/`
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export function buildBreadcrumbs(siteUrl: string, items: BreadcrumbEntry[]) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${absoluteUrl(siteUrl, items[items.length - 1]?.path || '/')}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(siteUrl, item.path),
    })),
  }
}

export function buildStructuredData(input: StructuredDataInput) {
  const url = absoluteUrl(input.siteUrl, input.path)
  const websiteId = `${input.siteUrl.replace(/\/$/, '')}/#website`
  const webPageId = `${url}#webpage`
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebSite',
      '@id': websiteId,
      url: absoluteUrl(input.siteUrl, '/'),
      name: input.brandName,
      inLanguage: 'hu-HU',
    },
    {
      '@type': 'WebPage',
      '@id': webPageId,
      url,
      name: input.title,
      description: input.description,
      isPartOf: { '@id': websiteId },
      inLanguage: 'hu-HU',
      ...(input.updated ? { dateModified: input.updated } : {}),
    },
  ]

  if (input.faqs && input.faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: input.faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    })
  }

  if (input.isWebApp) {
    graph.push({
      '@type': 'WebApplication',
      '@id': `${absoluteUrl(input.siteUrl, '/qr-kod-generator')}#application`,
      name: `${input.brandName} QR-kód generátor`,
      url: absoluteUrl(input.siteUrl, '/qr-kod-generator'),
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Modern, JavaScriptet támogató böngésző',
      isAccessibleForFree: true,
      inLanguage: 'hu-HU',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'HUF',
      },
    })
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
