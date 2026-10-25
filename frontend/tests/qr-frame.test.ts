import { describe, expect, it } from 'vitest'
import { buildFramedSvg, escapeXml, getFrameLayout } from '../app/utils/qr-frame'
import { DEFAULT_CUSTOMIZATION } from '~/lib/qr/customization'
import type { QrCustomization } from '~/lib/qr/types'

function customization(overrides: Partial<QrCustomization> = {}): QrCustomization {
  return {
    ...DEFAULT_CUSTOMIZATION,
    bodyFill: { ...DEFAULT_CUSTOMIZATION.bodyFill },
    frameFill: { ...DEFAULT_CUSTOMIZATION.frameFill },
    ...overrides,
  }
}

describe('keret elrendezés', () => {
  it('keret nélkül a kért méretet adja vissza', () => {
    const layout = getFrameLayout({ frame: 'none', size: 1024 })
    expect(layout.totalWidth).toBe(1024)
    expect(layout.totalHeight).toBe(1024)
    expect(layout.padX).toBe(0)
  })

  it('a vékony keret körbeveszi a kódot, nem vágja le', () => {
    const layout = getFrameLayout({ frame: 'border', size: 1024 })
    expect(layout.padX).toBeGreaterThan(0)
    expect(layout.totalWidth).toBe(1024 + layout.padX * 2)
    expect(layout.totalHeight).toBe(layout.totalWidth)
  })

  it('a kártya alatt helyet hagy a gombnak és a kiegészítő szövegnek', () => {
    const withoutText = getFrameLayout({ frame: 'card', size: 1024 })
    const withText = getFrameLayout({ frame: 'card', size: 1024, hasLabel: true, hasSubtitle: true })
    expect(withText.totalHeight).toBeGreaterThan(withoutText.totalHeight)
    expect(withText.pillHeight).toBeGreaterThan(0)
    expect(withText.labelHeight).toBeGreaterThan(withText.pillHeight)
  })

  it('az alsó felirat külön sávot kap', () => {
    const layout = getFrameLayout({ frame: 'caption', size: 1024 })
    expect(layout.captionHeight).toBeGreaterThan(0)
    expect(layout.totalHeight).toBeGreaterThan(layout.totalWidth)
    expect(layout.padY + 1024 + layout.captionHeight).toBe(layout.totalHeight)
  })

  it('a kör alakú keret nagyobb vásznat használ', () => {
    const layout = getFrameLayout({ frame: 'circle', size: 1024 })
    expect(layout.totalWidth).toBeGreaterThan(1024)
    expect(layout.totalWidth).toBe(layout.totalHeight)
    expect(layout.padX * 2 + 1024).toBe(layout.totalWidth)
  })
})

describe('keretezett SVG', () => {
  it('eltolja a QR-t és megtartja a viewBoxot', () => {
    const options = customization({ frame: 'border' })
    const layout = getFrameLayout({ frame: options.frame, size: 1024 })
    const svg = buildFramedSvg('<rect width="1024" height="1024" fill="#fff"/>', options, 1024)
    expect(svg).toContain(`viewBox="0 0 ${layout.totalWidth} ${layout.totalHeight}"`)
    expect(svg).toContain(`translate(${layout.padX} ${layout.padY})`)
    expect(svg).toContain('<rect width="1024" height="1024" fill="#fff"/>')
  })

  it('a kártya keret gombot és kiegészítő szöveget rajzol', () => {
    const svg = buildFramedSvg(
      '<rect/>',
      customization({
        frame: 'card',
        frameText: 'Kövess minket',
        frameSubtitle: 'Instagram',
        frameColor: '#833AB4',
        labelColor: '#C13584',
        labelTextColor: '#FFFFFF',
      }),
      1024,
    )
    expect(svg).toContain('fill="#833AB4"')
    expect(svg).toContain('fill="#C13584"')
    expect(svg).toContain('>Kövess minket<')
    expect(svg).toContain('>Instagram<')
    expect(svg).toContain('font-weight="700"')
  })

  it('a színátmenetes keret definíciót ír az SVG-be', () => {
    const svg = buildFramedSvg(
      '<rect/>',
      customization({
        frame: 'card',
        frameFill: { kind: 'linear', color: '#833AB4', color2: '#C13584', rotation: 45 },
      }),
      1024,
    )
    expect(svg).toContain('<linearGradient id="qr-frame-fill-0"')
    expect(svg).toContain('url(#qr-frame-fill-0)')
  })

  it('a sarokjelölős keret négy sarkot rajzol', () => {
    const svg = buildFramedSvg('<rect/>', customization({ frame: 'corners', frameColor: '#2563EB' }), 1024)
    expect(svg).toContain('stroke="#2563EB"')
    expect(svg).toContain('stroke-linecap="round"')
  })

  it('a kör alakú keret kört rajzol a QR köré', () => {
    const svg = buildFramedSvg('<rect/>', customization({ frame: 'circle', frameColor: '#0F172A' }), 1024)
    expect(svg).toContain('<circle')
    expect(svg).toContain('fill="#0F172A"')
  })

  it('átlátszó háttérnél nem rajzol háttér téglalapot', () => {
    const svg = buildFramedSvg('<rect/>', customization({ frame: 'none', transparentBackground: true }), 512)
    expect(svg).not.toContain('width="512" height="512" fill="#FFFFFF"')
  })

  it('kimenti a speciális karaktereket', () => {
    const svg = buildFramedSvg('<svg/>', customization({ frame: 'caption', frameText: '<Café & Társa>' }), 512)
    expect(svg).toContain('&lt;Café &amp; Társa&gt;')
    expect(svg).not.toContain('<Café')
    expect(svg).toContain('<text')
  })

  it('az XML speciális karaktereit escape-eli', () => {
    expect(escapeXml(`<&>"'`)).toBe('&lt;&amp;&gt;&quot;&apos;')
  })
})
