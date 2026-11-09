import { setResponseHeader } from 'h3'
import { ALL_LANDING_PAGES } from '#shared/content/landing-pages'
import { LEGAL_PAGES } from '#shared/content/legal-pages'
import { absoluteUrl } from '#shared/seo'

interface SitemapEntry {
  loc: string
  lastmod: string
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly'
  priority: number
}

/**
 * A sitemap forrása a Nuxt @nuxtjs/seo modulja számára. Az oldalak listája a
 * `shared/content` alól jön, a domain és a noindex felülírások pedig az
 * adatbázisból (admin felületen szerkeszthetők).
 */
export default defineApiHandler(async (event) => {
  const settings = await loadPublicSettings()
  const overrides = settings.seo
  const siteUrl = settings.siteUrl
  const lastmod = '2026-10-22'
  const entries: SitemapEntry[] = []

  const push = (
    path: string,
    priority: number,
    changefreq: SitemapEntry['changefreq'],
    modified: string = lastmod,
  ) => {
    if (overrides[path]?.noindex) return
    entries.push({
      loc: absoluteUrl(siteUrl, path),
      lastmod: modified,
      changefreq,
      priority,
    })
  }

  push('/', 1, 'weekly')
  push('/qr-kod-generator', 0.9, 'weekly')
  push('/qr-kod-keszites', 0.8, 'monthly')
  push('/qr-kod-tipusok', 0.8, 'monthly')
  push('/tomeges-qr-kod-generator', 0.7, 'monthly')
  push('/qr-kod-olvaso', 0.6, 'monthly')
  push('/qr-kod-meret-kalkulator', 0.6, 'monthly')
  push('/csomagok', 0.7, 'monthly')
  push('/blog', 0.7, 'weekly')

  for (const page of ALL_LANDING_PAGES) {
    push(page.slug, 0.7, 'monthly')
  }
  push('/dinamikus-qr-kod', 0.6, 'monthly')
  push('/kapcsolat', 0.4, 'yearly')
  for (const page of LEGAL_PAGES) {
    push(page.slug, 0.3, 'yearly')
  }

  // A blogbejegyzések a saját táblájukból kerülnek a sitemapba; ha az adatbázis
  // nem érhető el, a többi oldal akkor is kiszolgálható marad.
  try {
    for (const post of await listPublishedForSitemap()) {
      push(`/blog/${post.slug}`, 0.6, 'monthly', post.updatedAt.toISOString().slice(0, 10))
    }
  } catch {
    // A blog kihagyása nem akadályozhatja a sitemap kiszolgálását.
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
