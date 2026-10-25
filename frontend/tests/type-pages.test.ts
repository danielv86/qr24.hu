import { describe, expect, it } from 'vitest'
import { ALL_LANDING_PAGES, getLandingPage } from '~/lib/content/landing-pages'
import { QR_TYPE_PATHS } from '~/lib/content/type-pages'
import { QR_TYPES } from '~/lib/qr/content'

describe('típusonkénti SEO-oldalak', () => {
  it('minden QR-típushoz tartozik saját aloldal', () => {
    for (const type of QR_TYPES) {
      const path = QR_TYPE_PATHS[type.id]
      expect(path, `hiányzó útvonal: ${type.id}`).toMatch(/^\/[a-z0-9-]+$/)
      const page = getLandingPage(path)
      expect(page, `hiányzó oldal: ${path}`).toBeDefined()
    }
  })

  it('az aloldalak a saját generátor-típusukat nyitják meg', () => {
    for (const type of QR_TYPES) {
      const page = getLandingPage(QR_TYPE_PATHS[type.id])
      expect(page?.qrType, `${type.id} oldal típusa`).toBe(type.id)
    }
  })

  it('az útvonalak egyediek és keresőbarátok', () => {
    const paths = Object.values(QR_TYPE_PATHS)
    expect(new Set(paths).size).toBe(paths.length)
    expect(paths.every(path => /^\/[a-z0-9]+(-[a-z0-9]+)*$/.test(path))).toBe(true)
  })

  it('minden oldal rendelkezik címmel, leírással és gyakori kérdésekkel', () => {
    for (const type of QR_TYPES) {
      const page = getLandingPage(QR_TYPE_PATHS[type.id])!
      expect(page.title.length).toBeGreaterThan(20)
      expect(page.description.length).toBeGreaterThan(60)
      expect(page.h1.length).toBeGreaterThan(5)
      expect(page.sections.length).toBeGreaterThanOrEqual(2)
      expect(page.faqs.length).toBeGreaterThanOrEqual(1)
      expect(page.related.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('a típusoldalak nem ütköznek a kézzel írt oldalakkal', () => {
    const slugs = ALL_LANDING_PAGES.map(page => page.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})
