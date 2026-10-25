import { ref } from 'vue'
import { strToU8, zipSync } from 'fflate'
import type { QrCustomization } from '#shared/qr/types'
import { buildBulkCsv, bulkFileName, type BulkRow } from '#shared/bulk'
import { rasterizeSvg, renderQrSvg } from '../utils/qr-render'

export type BulkZipFormat = 'png' | 'svg'

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('A képfájl létrehozása nem sikerült.'))
    }, 'image/png')
  })
}

function dateStamp(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Kis szünet, hogy a böngésző kirajzolhassa a folyamatjelzőt. */
function nextFrame(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

export function useBulkDownload() {
  const isWorking = ref(false)
  const progress = ref(0)
  const error = ref('')

  async function downloadZip(
    rows: BulkRow[],
    customization: QrCustomization,
    format: BulkZipFormat,
    size = 512,
  ): Promise<boolean> {
    if (typeof window === 'undefined') return false
    error.value = ''
    if (!rows.length) {
      error.value = 'Előbb adj meg legalább egy érvényes webcímet.'
      return false
    }

    isWorking.value = true
    progress.value = 0
    try {
      const files: Record<string, Uint8Array> = {}
      for (const [index, row] of rows.entries()) {
        const svg = await renderQrSvg(row.url, customization, size)
        const name = bulkFileName(row, index)
        if (format === 'svg') {
          files[`${name}.svg`] = strToU8(svg)
        } else {
          const canvas = await rasterizeSvg(svg)
          const bytes = new Uint8Array(await (await canvasToBlob(canvas)).arrayBuffer())
          files[`${name}.png`] = bytes
        }
        progress.value = (index + 1) / rows.length
        if (index % 3 === 0) await nextFrame()
      }

      // A CSV riport a ZIP-be is bekerül, hogy a fájlnevek visszakövethetők legyenek.
      files['riport.csv'] = strToU8(`\uFEFF${buildBulkCsv(rows)}`)
      const zipped = zipSync(files, { level: 0 })
      triggerBlobDownload(
        new Blob([zipped as unknown as BlobPart], { type: 'application/zip' }),
        `qr24-tomeges-${format}-${dateStamp()}.zip`,
      )
      return true
    } catch (cause) {
      error.value = cause instanceof Error
        ? `A ZIP elkészítése nem sikerült: ${cause.message}`
        : 'A ZIP elkészítése nem sikerült. Próbáld újra.'
      return false
    } finally {
      isWorking.value = false
      progress.value = 0
    }
  }

  function downloadCsv(rows: BulkRow[]): boolean {
    if (!rows.length) {
      error.value = 'Előbb adj meg legalább egy érvényes webcímet.'
      return false
    }
    triggerBlobDownload(
      new Blob([`\uFEFF${buildBulkCsv(rows)}`], { type: 'text/csv;charset=utf-8' }),
      `qr24-tomeges-riport-${dateStamp()}.csv`,
    )
    return true
  }

  /**
   * Nyomtatható A4-es ív: 3 oszlop, oldalanként 12 kód, felirattal és vágásvonallal.
   * A böngésző Nyomtatás → PDF funkciója adja a nyomdai PDF-et, így nincs szükség
   * külön PDF-íróra, és a kódok vektorosak maradnak.
   */
  async function printSheet(rows: BulkRow[], customization: QrCustomization): Promise<boolean> {
    if (typeof window === 'undefined') return false
    error.value = ''
    if (!rows.length) {
      error.value = 'Előbb adj meg legalább egy érvényes webcímet.'
      return false
    }

    isWorking.value = true
    progress.value = 0
    try {
      const cards: string[] = []
      for (const [index, row] of rows.entries()) {
        const svg = await renderQrSvg(row.url, customization, 512)
        cards.push(`
          <figure class="card">
            <div class="code">${svg}</div>
            <figcaption>
              <strong>${escapeHtml(row.label || `QR-kód ${index + 1}`)}</strong>
              <span>${escapeHtml(row.url)}</span>
            </figcaption>
          </figure>`)
        progress.value = (index + 1) / rows.length
        if (index % 3 === 0) await nextFrame()
      }

      const sheet = `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="utf-8">
  <title>QR24.hu – tömeges QR-kódok</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; color: #0f172a; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
    .card { margin: 0; border: 1px dashed #cbd5e1; border-radius: 3mm; padding: 3mm; text-align: center; break-inside: avoid; page-break-inside: avoid; }
    .code svg { width: 100%; height: auto; display: block; }
    figcaption { margin-top: 2mm; font-size: 8pt; line-height: 1.3; }
    figcaption strong { display: block; font-size: 9pt; }
    figcaption span { color: #475569; word-break: break-all; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="grid">${cards.join('')}</div>
  <script>window.addEventListener('load', function () { setTimeout(function () { window.print() }, 250) })</script>
</body>
</html>`

      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        error.value = 'A böngésző blokkolta a nyomtatási ablakot. Engedélyezd a felugró ablakot, és próbáld újra.'
        return false
      }
      printWindow.document.open()
      printWindow.document.write(sheet)
      printWindow.document.close()
      return true
    } catch (cause) {
      error.value = cause instanceof Error
        ? `A nyomtatóív elkészítése nem sikerült: ${cause.message}`
        : 'A nyomtatóív elkészítése nem sikerült. Próbáld újra.'
      return false
    } finally {
      isWorking.value = false
      progress.value = 0
    }
  }

  return { isWorking, progress, error, downloadZip, downloadCsv, printSheet }
}
