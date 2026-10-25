import { setResponseHeader } from 'h3'
import { ALL_LANDING_PAGES } from '../../../app/lib/content/landing-pages'
import { LEGAL_PAGES } from '../../../app/lib/content/legal-pages'
import { absoluteUrl } from '../../../app/lib/seo'

interface SitemapEntry {
  loc: string
  lastmod: string
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly'
  priority: number
}

interface PublicSettingsPayload {
  siteUrl?: string
  seo?: Record<string, { noindex?: boolean }>
}

/**
 * A sitemap forrása a Nuxt `@nuxtjs/seo` modulja számára. A oldalak listája
 * helyben, a tartalmi fájlokból jön; a domain és a noindex felülírások a
 * backend nyilvános beállításaiból, hogy egy helyen legyenek kezelhetők.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const backendUrl = String(config.backendUrl || '').replace(/\/$/, '')

  let settings: PublicSettingsPayload = {}
  if (backendUrl) {
    try {
      const response = await $fetch<{ data?: PublicSettingsPayload }>(`${backendUrl}/api/settings/public`, {
        headers: { accept: 'application/json' },
        timeout: 3000,
      })
      settings = response?.data || {}
    } catch {
      // Ha a backend nem érhető el, a beállított nyilvános címre esünk vissza.
    }
  }

  const siteUrl = String(settings.siteUrl || config.public.siteUrl || 'http://localhost:3000')
  const overrides = settings.seo || {}
  const lastmod = '2026-10-22'
  const entries: SitemapEntry[] = []

  const push = (path: string, priority: number, changefreq: SitemapEntry['changefreq']) => {
    if (overrides[path]?.noindex) return
    entries.push({ loc: absoluteUrl(siteUrl, path), lastmod, changefreq, priority })
  }

  push('/', 1, 'weekly')
  push('/qr-kod-generator', 0.9, 'weekly')
  push('/qr-kod-keszites', 0.8, 'monthly')
  push('/qr-kod-tipusok', 0.8, 'monthly')

  for (const page of ALL_LANDING_PAGES) {
    push(page.slug, 0.7, 'monthly')
  }
  push('/dinamikus-qr-kod', 0.6, 'monthly')
  push('/kapcsolat', 0.4, 'yearly')
  for (const page of LEGAL_PAGES) {
    push(page.slug, 0.3, 'yearly')
  }

  const seen = new Set<string>()
  const unique = entries.filter((entry) => {
    if (seen.has(entry.loc)) return false
    seen.add(entry.loc)
    return true
  })

  setResponseHeader(event, 'Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600')
  return unique
})
