import { describe, expect, it } from 'vitest'
import { DEFAULT_CUSTOMIZATION } from '~/lib/qr/customization'
import { DESIGN_TEMPLATES, applyDesignTemplate, getDesignTemplate } from '~/lib/qr/design-templates'
import { FRAME_OPTIONS } from '~/lib/qr/customization'

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

  it('a márkás sablon a saját logóját viszi a kódba, H hibajavítással', () => {
    const template = getDesignTemplate('instagram')!
    const result = applyDesignTemplate(customization, template)
    expect(result.frame).toBe('card')
    expect(result.frameText).toBe(template.frameText)
    expect(result.frameSubtitle).toBe('Instagram')
    expect(result.frameColor).toBe('#833AB4')
    expect(result.designTemplate).toBe('instagram')
    expect(result.bodyFill.color).toBe(template.fgColor)
    expect(template.logo).toBe('instagram')
    expect(result.logo).toContain('data:image/svg+xml')
    expect(result.logoName).toBe('Instagram')
    expect(result.errorCorrection).toBe('H')
    // Az exportméret nem változik a sablonnal.
    expect(result.size).toBe(customization.size)
  })

  it('a logó nélküli sablon leveszi a korábbi logót', () => {
    const result = applyDesignTemplate(customization, getDesignTemplate('restaurant-menu')!)
    expect(result.logo).toBe('')
    expect(result.logoName).toBe('')
    expect(result.errorCorrection).toBe(customization.errorCorrection)
  })

  it('a Klasszikus sablon leveszi a márkalogót is', () => {
    const result = applyDesignTemplate(customization, getDesignTemplate('classic')!)
    expect(result.logo).toBe('')
    expect(result.logoName).toBe('')
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
