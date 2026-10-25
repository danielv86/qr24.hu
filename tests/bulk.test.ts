import { describe, expect, it } from 'vitest'
import {
  BULK_LIMIT,
  buildBulkCsv,
  bulkFileName,
  labelFromUrl,
  parseBulkInput,
  slugifyLabel,
} from '#shared/bulk'

describe('tömeges bemenet feldolgozása', () => {
  it('pontosvesszővel elválasztott nevet és címet olvas', () => {
    const result = parseBulkInput('Nyitólap;https://qr24.hu\nÁrlista;qr24.hu/arlista')
    expect(result.total).toBe(2)
    expect(result.valid).toHaveLength(2)
    expect(result.valid[0]).toMatchObject({ label: 'Nyitólap', url: 'https://qr24.hu/' })
    expect(result.valid[1]).toMatchObject({ label: 'Árlista', url: 'https://qr24.hu/arlista' })
  })

  it('tabulátorral és csak címmel is működik', () => {
    const result = parseBulkInput('Név\tpelda.hu\nhttps://masik.hu/utvonal')
    expect(result.valid).toHaveLength(2)
    expect(result.valid[0]!.label).toBe('Név')
    expect(result.valid[0]!.url).toBe('https://pelda.hu/')
    expect(result.valid[1]!.label).toBe('utvonal')
  })

  it('a vesszőt csak akkor bontja, ha a második rész webcím', () => {
    const withLabel = parseBulkInput('Bolt,https://bolt.hu/akcio')
    expect(withLabel.valid[0]).toMatchObject({ label: 'Bolt', url: 'https://bolt.hu/akcio' })

    const commaInUrl = parseBulkInput('https://pelda.hu/kereses?q=alma,korte')
    expect(commaInUrl.valid).toHaveLength(1)
    expect(commaInUrl.valid[0]!.url).toContain('q=alma,korte')
  })

  it('kihagyja a fejlécsort', () => {
    const result = parseBulkInput('Név;Cím\nNyitólap;https://qr24.hu')
    expect(result.total).toBe(1)
    expect(result.valid[0]!.label).toBe('Nyitólap')
  })

  it('elutasítja a nem http(s) címeket és az üres sorokat', () => {
    const result = parseBulkInput('javascript:alert(1)\nftp://pelda.hu\n\n;https://pelda.hu')
    expect(result.invalidCount).toBe(2)
    const messages = result.rows.filter(row => row.status === 'invalid').map(row => row.message)
    expect(messages.every(Boolean)).toBe(true)
  })

  it('jelzi a duplikált címeket (normalizálás után)', () => {
    const result = parseBulkInput('Első;https://pelda.hu\nMásodik;https://pelda.hu/')
    expect(result.valid).toHaveLength(1)
    expect(result.duplicateCount).toBe(1)
    expect(result.rows[1]!.message).toContain('1. sorban')
  })

  it('a limit feletti érvényes sorokat kihagyja', () => {
    const lines = Array.from({ length: 5 }, (_, index) => `Kód ${index + 1};https://pelda.hu/${index + 1}`)
    const result = parseBulkInput(lines.join('\n'), 3)
    expect(result.valid).toHaveLength(3)
    expect(result.truncatedCount).toBe(2)
    expect(result.invalidCount).toBe(0)
  })

  it('az alapértelmezett limit 100 kód', () => {
    expect(BULK_LIMIT).toBe(100)
    const lines = Array.from({ length: 105 }, (_, index) => `Kód;https://pelda.hu/${index}`)
    const result = parseBulkInput(lines.join('\n'))
    expect(result.valid).toHaveLength(100)
    expect(result.truncatedCount).toBe(5)
  })
})

describe('fájlnevek és riport', () => {
  it('ékezet nélküli slugot készít', () => {
    expect(slugifyLabel('Árlista 2026 / Tavasz')).toBe('arlista-2026-tavasz')
    expect(slugifyLabel('***')).toBe('')
  })

  it('a címből olvasható nevet képez', () => {
    expect(labelFromUrl('https://pelda.hu/arlista.pdf')).toBe('arlista')
    expect(labelFromUrl('https://www.pelda.hu/')).toBe('pelda.hu')
  })

  it('egyedi, sorszámozott fájlnevet ad', () => {
    const row = { line: 1, label: 'Nyitólap', url: 'https://pelda.hu/', status: 'ok' as const }
    expect(bulkFileName(row, 0)).toBe('nyitolap-001')
    expect(bulkFileName({ ...row, label: '' }, 11)).toBe('pelda-hu-012')
    expect(bulkFileName({ ...row, label: '', url: 'https://pelda.hu/arlista.pdf' }, 0)).toBe('arlista-001')
  })

  it('a CSV riport fejléces és idézőjelez, ha kell', () => {
    const rows = [
      { line: 1, label: 'Idézőjeles; név', url: 'https://pelda.hu/', status: 'ok' as const },
    ]
    const csv = buildBulkCsv(rows)
    expect(csv.split('\r\n')[0]).toBe('Nev;Cim;Fajlnev')
    expect(csv).toContain('"Idézőjeles; név"')
    expect(csv).toContain('idezojeles-nev-001')
  })
})
