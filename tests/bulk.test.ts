import { describe, expect, it } from 'vitest'
import {
  BULK_LIMIT,
  buildBulkCsv,
  buildSequence,
  bulkColumns,
  bulkFileName,
  bulkSample,
  parseBulkInput,
  slugifyLabel,
} from '#shared/bulk'
import { QR_TYPES, getQrType } from '#shared/qr/content'

function row(line: number, label: string, payload: string) {
  return { line, label, payload, summary: payload, status: 'ok' as const }
}

describe('tömeges bemenet – webcím típus', () => {
  it('pontosvesszővel elválasztott nevet és címet olvas', () => {
    const result = parseBulkInput('Nyitólap;https://qrkod24.hu\nÁrlista;qrkod24.hu/arlista', { type: 'url' })
    expect(result.total).toBe(2)
    expect(result.valid).toHaveLength(2)
    expect(result.valid[0]).toMatchObject({ label: 'Nyitólap', payload: 'https://qrkod24.hu/' })
    expect(result.valid[1]).toMatchObject({ label: 'Árlista', payload: 'https://qrkod24.hu/arlista' })
  })

  it('tabulátorral és csak címmel is működik', () => {
    const result = parseBulkInput('Név\tqrkod24.hu\nhttps://masik.hu/utvonal', { type: 'url' })
    expect(result.valid).toHaveLength(2)
    expect(result.valid[0]!.label).toBe('Név')
    expect(result.valid[0]!.payload).toBe('https://qrkod24.hu/')
    expect(result.valid[1]!.payload).toBe('https://masik.hu/utvonal')
  })

  it('egymezejű típusnál a címben lévő vesszőt nem bontja el', () => {
    const result = parseBulkInput('https://qrkod24.hu/kereses?q=alma,korte', { type: 'url' })
    expect(result.valid).toHaveLength(1)
    expect(result.valid[0]!.payload).toContain('q=alma,korte')
  })

  it('elutasítja a nem http(s) címeket', () => {
    const result = parseBulkInput('javascript:alert(1)\nftp://qrkod24.hu', { type: 'url' })
    expect(result.invalidCount).toBe(2)
    expect(result.rows.every(entry => entry.status === 'invalid')).toBe(true)
    expect(result.rows.every(entry => Boolean(entry.message))).toBe(true)
  })

  it('jelzi a duplikált tartalmat (normalizálás után)', () => {
    const result = parseBulkInput('Első;https://qrkod24.hu\nMásodik;https://qrkod24.hu/', { type: 'url' })
    expect(result.valid).toHaveLength(1)
    expect(result.duplicateCount).toBe(1)
    expect(result.rows[1]!.message).toContain('1. sorban')
  })

  it('a limit feletti érvényes sorokat kihagyja', () => {
    const lines = Array.from({ length: 5 }, (_, index) => `Kód ${index + 1};https://qrkod24.hu/${index + 1}`)
    const result = parseBulkInput(lines.join('\n'), { type: 'url', limit: 3 })
    expect(result.valid).toHaveLength(3)
    expect(result.truncatedCount).toBe(2)
  })

  it('az alapértelmezett limit 100 kód', () => {
    expect(BULK_LIMIT).toBe(100)
    const lines = Array.from({ length: 105 }, (_, index) => `Kód;https://qrkod24.hu/${index}`)
    const result = parseBulkInput(lines.join('\n'), { type: 'url' })
    expect(result.valid).toHaveLength(100)
    expect(result.truncatedCount).toBe(5)
  })
})

describe('tömeges bemenet – több mezős típusok', () => {
  it('fejlécsor nélkül a mezők sorrendjében olvas (Wi-Fi)', () => {
    const input = 'Iroda;QR24-Iroda;WPA;titok123;0\nVendég;QR24-Vendeg;nopass;;0'
    const result = parseBulkInput(input, { type: 'wifi' })
    expect(result.valid).toHaveLength(2)
    expect(result.valid[0]!.label).toBe('Iroda')
    expect(result.valid[0]!.payload).toContain('WIFI:T:WPA;S:QR24-Iroda;P:titok123')
    expect(result.valid[1]!.payload).toContain('S:QR24-Vendeg')
  })

  it('fejlécsorral az oszlopsorrend nem számít', () => {
    const input = 'password;ssid;security\nrejtett;QR24-Wifi;WPA'
    const result = parseBulkInput(input, { type: 'wifi' })
    expect(result.valid).toHaveLength(1)
    expect(result.valid[0]!.payload).toContain('S:QR24-Wifi')
    expect(result.valid[0]!.payload).toContain('P:rejtett')
  })

  it('a hiányzó kötelező mezőt soronként jelzi', () => {
    const result = parseBulkInput('name;url\nNyár;https://qrkod24.hu', { type: 'coupon' })
    expect(result.valid).toHaveLength(0)
    expect(result.invalidCount).toBe(1)
    expect(result.rows[0]!.message).toBeTruthy()
  })

  it('a kupon típus kódot és URL-t is kezel', () => {
    const result = parseBulkInput('name;code;url\nNyár;NYAR2026;https://qrkod24.hu', { type: 'coupon' })
    expect(result.valid).toHaveLength(1)
    expect(result.valid[0]!.payload).toContain('NYAR2026')
    expect(result.valid[0]!.payload).toContain('https://qrkod24.hu')
  })

  it('a szöveg típus a teljes sort tartalomnak veszi', () => {
    const result = parseBulkInput('Asztal 1\nAsztal 2', { type: 'text' })
    expect(result.valid.map(entry => entry.payload)).toEqual(['Asztal 1', 'Asztal 2'])
  })
})

describe('mintaadatok', () => {
  it('minden típushoz olyan mintát ad, ami érvényes sort eredményez', () => {
    for (const type of QR_TYPES) {
      const sample = bulkSample(type.id)
      const result = parseBulkInput(sample, { type: type.id })
      expect(result.valid, `${type.id}: ${sample}`).toHaveLength(1)
      expect(result.invalidCount, `${type.id}: ${sample}`).toBe(0)
    }
  })

  it('az oszlopnevek a típus mezőiből jönnek', () => {
    expect(bulkColumns('url')).toEqual(['name', 'url'])
    const wifi = getQrType('wifi')
    expect(bulkColumns('wifi')).toEqual(['name', ...wifi.fields.map(field => field.key)])
  })
})

describe('sorszám-sorozat', () => {
  it('előtaggal, nullázással és lépéssel dolgozik', () => {
    const values = buildSequence({ start: 1, end: 5, step: 2, pad: 3, prefix: 'kupon-', suffix: '' })
    expect(values).toEqual(['kupon-001', 'kupon-003', 'kupon-005'])
  })

  it('nullázás nélkül a nyers számot adja', () => {
    expect(buildSequence({ start: 8, end: 9, step: 1, pad: 0, prefix: '', suffix: 'X' }))
      .toEqual(['8X', '9X'])
  })

  it('a limitet betartja és a fordított tartományt üresen hagyja', () => {
    expect(buildSequence({ start: 1, end: 500, step: 1, pad: 0, prefix: '', suffix: '', limit: 10 }))
      .toHaveLength(10)
    expect(buildSequence({ start: 10, end: 1, step: 1, pad: 0, prefix: '', suffix: '' })).toEqual([])
  })
})

describe('fájlnevek és riport', () => {
  it('ékezet nélküli slugot készít', () => {
    expect(slugifyLabel('Árlista 2026 / Tavasz')).toBe('arlista-2026-tavasz')
    expect(slugifyLabel('***')).toBe('')
  })

  it('egyedi, sorszámozott fájlnevet ad', () => {
    expect(bulkFileName(row(1, 'Nyitólap', 'https://qrkod24.hu/'), 0)).toBe('nyitolap-001')
    expect(bulkFileName(row(2, '', 'x'), 11)).toBe('qr-kod-012')
  })

  it('a CSV riport fejléces, típussal és idézőjelezéssel', () => {
    const csv = buildBulkCsv([row(1, 'Idézőjeles; név', 'WIFI:T:WPA;S:Iroda;P:titok')], 'Wi-Fi')
    expect(csv.split('\r\n')[0]).toBe('Nev;Tipus;Tartalom;Fajlnev')
    expect(csv).toContain('"Idézőjeles; név"')
    expect(csv).toContain('Wi-Fi')
    expect(csv).toContain('idezojeles-nev-001')
  })
})
