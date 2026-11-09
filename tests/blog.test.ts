import { describe, expect, it } from 'vitest'
import {
  estimateExcerpt,
  estimateReadingMinutes,
  sanitizePostHtml,
  slugify,
  stripHtml,
} from '../server/utils/blog'

describe('blog slugs', () => {
  it('folds Hungarian accents', () => {
    expect(slugify('Így készül a QR-kód!')).toBe('igy-keszul-a-qr-kod')
    expect(slugify('Árvíztűrő tükörfúrógép')).toBe('arvizturo-tukorfurogep')
  })

  it('drops leading and trailing separators', () => {
    expect(slugify('  --Hello   World--  ')).toBe('hello-world')
  })
})

describe('blog content sanitizing', () => {
  it('keeps the editor formatting', () => {
    const html = sanitizePostHtml(
      '<h2>Cím</h2><p><strong>Félkövér</strong> és <em>dőlt</em></p><ul><li>pont</li></ul>',
    )
    expect(html).toContain('<h2>Cím</h2>')
    expect(html).toContain('<strong>Félkövér</strong>')
    expect(html).toContain('<li>pont</li>')
  })

  it('removes scripts and event handlers', () => {
    const html = sanitizePostHtml(
      '<p onclick="alert(1)">x</p><script>alert(2)</script><img src="x" onerror="alert(3)">',
    )
    expect(html).not.toContain('<script')
    expect(html).not.toContain('onclick')
    expect(html).not.toContain('onerror')
  })

  it('keeps alignment and color but drops other styles', () => {
    const html = sanitizePostHtml(
      '<p style="text-align: center; font-size: 40px">x</p><span style="color: #2563EB">y</span>',
    )
    expect(html).toMatch(/text-align:\s*center/)
    expect(html).not.toContain('font-size')
    expect(html).toMatch(/color:\s*#2563EB/i)
  })

  it('hardens links', () => {
    const html = sanitizePostHtml('<a href="https://example.com">link</a>')
    expect(html).toContain('rel="noopener noreferrer"')
  })
})

describe('reading time and excerpt', () => {
  it('counts words with a minimum of one minute', () => {
    expect(estimateReadingMinutes('<p>Rövid szöveg</p>')).toBe(1)
    expect(estimateReadingMinutes(`<p>${'szó '.repeat(650)}</p>`)).toBe(3)
  })

  it('strips tags and builds a clean excerpt', () => {
    expect(stripHtml('<p>a <strong>b</strong></p>')).toBe('a b')
    const excerpt = estimateExcerpt(`<p>${'szó '.repeat(200)}</p>`, 50)
    expect(excerpt.length).toBeLessThanOrEqual(51)
    expect(excerpt.endsWith('…')).toBe(true)
  })
})
