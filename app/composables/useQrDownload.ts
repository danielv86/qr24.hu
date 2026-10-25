import { ref } from 'vue'
import type { QrCustomization } from '#shared/qr/types'
import { rasterizeSvg, renderQrSvg } from '../utils/qr-render'

export type QrDownloadFormat = 'png' | 'jpg' | 'webp' | 'svg' | 'pdf'

export const QR_DOWNLOAD_FORMATS: { id: QrDownloadFormat; label: string; icon: string; hint: string }[] = [
  { id: 'png', label: 'PNG', icon: 'lucide:image', hint: 'Éles kép, átlátszó háttérrel is' },
  { id: 'jpg', label: 'JPG', icon: 'lucide:file-image', hint: 'Kis fájl, fehér háttérrel' },
  { id: 'webp', label: 'WebP', icon: 'lucide:images', hint: 'Modern, kompakt képformátum' },
  { id: 'svg', label: 'SVG', icon: 'lucide:file-code-2', hint: 'Vektoros, nyomdára' },
  { id: 'pdf', label: 'PDF', icon: 'lucide:file-text', hint: 'A4-es oldal, középre igazítva' },
]

const PDF_PAGE_WIDTH = 595.28
const PDF_PAGE_HEIGHT = 841.89
const PDF_MAX_IMAGE = 500

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

async function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('A képfájl létrehozása nem sikerült.'))
    }, type, quality)
  })
}

/** JPG-hez és PDF-hez fehér háttér kell, mert ezek nem támogatják az átlátszóságot. */
function withOpaqueBackground(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const opaque = document.createElement('canvas')
  opaque.width = canvas.width
  opaque.height = canvas.height
  const context = opaque.getContext('2d')
  if (!context) throw new Error('A böngésző nem támogatja a vászon exportot.')
  context.fillStyle = '#FFFFFF'
  context.fillRect(0, 0, opaque.width, opaque.height)
  context.drawImage(canvas, 0, 0)
  return opaque
}

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer())
}

/**
 * Minimalista, egyoldalas PDF a JPEG-ként kódolt QR-kóddal (A4, középre igazítva).
 * Nincs hozzá külső könyvtár: a PDF 1.4 fájlszerkezetet közvetlenül írjuk össze.
 */
export async function buildPdf(imageBlob: Blob, imageWidth: number, imageHeight: number): Promise<Blob> {
  const imageBytes = await blobToBytes(imageBlob)
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  let length = 0
  const push = (data: string | Uint8Array) => {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data
    chunks.push(bytes)
    length += bytes.length
    return length
  }

  const scale = Math.min(PDF_MAX_IMAGE / imageWidth, PDF_MAX_IMAGE / imageHeight, 1)
  const drawWidth = imageWidth * scale
  const drawHeight = imageHeight * scale
  const x = (PDF_PAGE_WIDTH - drawWidth) / 2
  const y = (PDF_PAGE_HEIGHT - drawHeight) / 2

  const offsets: number[] = []
  push('%PDF-1.4\n')
  offsets[1] = length
  push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  offsets[2] = length
  push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox [0 0 595.28 841.89] >>\nendobj\n')
  offsets[3] = length
  push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] '
    + '/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
  )
  offsets[4] = length
  push(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} `
    + `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`,
  )
  push(imageBytes)
  push('\nendstream\nendobj\n')

  const content = `q ${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q\n`
  offsets[5] = length
  push(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`)

  const xrefOffset = length
  push('xref\n0 6\n0000000000 65535 f \n')
  for (let index = 1; index <= 5; index += 1) {
    push(`${String(offsets[index]).padStart(10, '0')} 00000 n \n`)
  }
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`)

  return new Blob(chunks as unknown as BlobPart[], { type: 'application/pdf' })
}

function formatDateForFile(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function useQrDownload() {
  const isDownloading = ref(false)
  const downloadingFormat = ref<QrDownloadFormat | null>(null)
  const downloadError = ref('')

  async function downloadQr(
    format: QrDownloadFormat,
    data: string,
    customization: QrCustomization,
    slug = 'qr-kod',
  ): Promise<boolean> {
    downloadError.value = ''
    if (!data) {
      downloadError.value = 'Előbb töltsd ki az űrlapot érvényes adatokkal.'
      return false
    }
    if (typeof window === 'undefined') return false
    isDownloading.value = true
    downloadingFormat.value = format
    try {
      let blob: Blob
      if (format === 'svg') {
        const svg = await renderQrSvg(data, customization, customization.size)
        blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      } else {
        const svg = await renderQrSvg(data, customization, customization.size)
        const canvas = await rasterizeSvg(svg)
        if (format === 'png') {
          blob = await canvasToBlob(canvas)
        } else if (format === 'webp') {
          blob = await canvasToBlob(withOpaqueBackground(canvas), 'image/webp', 0.95)
        } else if (format === 'jpg') {
          blob = await canvasToBlob(withOpaqueBackground(canvas), 'image/jpeg', 0.95)
        } else {
          const opaque = withOpaqueBackground(canvas)
          const jpeg = await canvasToBlob(opaque, 'image/jpeg', 0.95)
          blob = await buildPdf(jpeg, opaque.width, opaque.height)
        }
      }
      const safeSlug = slug.replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'qr-kod'
      triggerBlobDownload(blob, `${safeSlug}-${formatDateForFile()}.${format}`)
      return true
    } catch (error) {
      downloadError.value =
        error instanceof Error
          ? `A letöltés nem sikerült: ${error.message}`
          : 'A letöltés nem sikerült. Próbáld újra.'
      return false
    } finally {
      isDownloading.value = false
      downloadingFormat.value = null
    }
  }

  return { downloadQr, isDownloading, downloadingFormat, downloadError }
}
