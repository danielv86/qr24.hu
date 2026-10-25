import { describe, expect, it } from 'vitest'
import { DEFAULT_CUSTOMIZATION } from '../shared/qr/customization'
import { DESIGN_TEMPLATES, applyDesignTemplate, getDesignTemplate } from '../shared/qr/design-templates'
import { FRAME_OPTIONS } from '../shared/qr/customization'

const customization = {
  ...DEFAULT_CUSTOMIZATION,
  bodyFill: { ...DEFAULT_CUSTOMIZATION.bodyFill },
  frameFill: { ...DEFAULT_CUSTOMIZATION.frameFill },
  logo: 'data:image/png;base64,AAA',
  logoName: 'logo.png',
  designTemplate: '',
}

describe('tervezési sablonok', () => {
  it('tartalmazza a referencia összes sablonját', () => {
    const ids = DESIGN_TEMPLATES.map(template => template.id)
    expect(DESIGN_TEMPLATES).toHaveLength(16)
    expect(new Set(ids).size).toBe(16)
    expect(ids).toEqual(expect.arrayContaining([
      'classic',
      'instagram',
      'facebook',
      'snapchat',
      'tiktok',
      'spotify',
      'pdf',
      'whatsapp',
      'join',
      'x',
      'youtube',
      'linkedin',
      'telegram',
      'download-circle',
      'scan-corners',
      'restaurant-menu',
    ]))
  })

  it('minden sablon érvényes keretet és színeket használ', () => {
    const frames = FRAME_OPTIONS.map(option => option.value)
    for (const template of DESIGN_TEMPLATES) {
      expect(frames).toContain(template.frame)
      expect(template.fgColor).toMatch(/^#[0-9A-F]{6}$/)
      expect(template.bgColor).toMatch(/^#[0-9A-F]{6}$/)
      expect(template.frameColor).toMatch(/^#[0-9A-F]{6}$/)
      expect(template.labelColor).toMatch(/^#[0-9A-F]{6}$/)
      expect(template.labelTextColor).toMatch(/^#[0-9A-F]{6}$/)
      expect(template.name.length).toBeGreaterThan(2)
    }
  })

  it('a sablon csak a megjelenést írja felül', () => {
    const template = getDesignTemplate('instagram')!
    const result = applyDesignTemplate(customization, template)
    expect(result.frame).toBe('card')
    expect(result.frameText).toBe(template.frameText)
    expect(result.frameSubtitle).toBe('Instagram')
    expect(result.frameColor).toBe('#833AB4')
    expect(result.designTemplate).toBe('instagram')
    expect(result.bodyFill.color).toBe(template.fgColor)
    // A tartalom, a logó és az exportméret változatlan.
    expect(result.logo).toBe(customization.logo)
    expect(result.logoName).toBe('logo.png')
    expect(result.size).toBe(customization.size)
    expect(result.errorCorrection).toBe(customization.errorCorrection)
  })

  it('a keret nélküli sablon törli a keret szövegét', () => {
    const result = applyDesignTemplate(
      { ...customization, frame: 'card', frameText: 'Régi' },
      getDesignTemplate('classic')!,
    )
    expect(result.frame).toBe('none')
    expect(result.frameText).toBe('')
    expect(result.frameSubtitle).toBe('')
  })
})
