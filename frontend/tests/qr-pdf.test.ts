import { describe, expect, it } from 'vitest'
import { buildPdf } from '../app/composables/useQrDownload'

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9])

async function readPdf(): Promise<{ text: string; bytes: Uint8Array }> {
  const pdf = await buildPdf(new Blob([JPEG_BYTES], { type: 'image/jpeg' }), 1024, 1024)
  const bytes = new Uint8Array(await pdf.arrayBuffer())
  const text = new TextDecoder('latin1').decode(bytes)
  return { text, bytes }
}

describe('PDF export', () => {
  it('writes a single-page PDF that embeds the JPEG image', async () => {
    const { text } = await readPdf()
    expect(text.startsWith('%PDF-1.4')).toBe(true)
    expect(text).toContain('/Subtype /Image')
    expect(text).toContain('/Filter /DCTDecode')
    expect(text).toContain('/Width 1024 /Height 1024')
    expect(text).toContain(`/Length ${JPEG_BYTES.length}`)
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true)
  })

  it('centres the image inside an A4 page', async () => {
    const { text } = await readPdf()
    expect(text).toContain('/MediaBox [0 0 595.28 841.89]')
    expect(text).toContain('cm /Im0 Do Q')
  })

  it('points every cross-reference offset at its object', async () => {
    const { text } = await readPdf()
    const xrefStart = text.indexOf('xref\n')
    expect(xrefStart).toBeGreaterThan(0)
    const entries = text.slice(xrefStart).split('\n').filter(line => /^\d{10} \d{5} n $/.test(line))
    expect(entries).toHaveLength(5)
    entries.forEach((entry, index) => {
      const offset = Number.parseInt(entry.slice(0, 10), 10)
      expect(text.slice(offset, offset + `${index + 1} 0 obj`.length)).toBe(`${index + 1} 0 obj`)
    })
  })
})
