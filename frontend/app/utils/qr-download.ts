import { DEFAULT_CUSTOMIZATION } from '~/lib/qr/customization'
import { rasterizeSvg, renderQrSvg } from './qr-render'

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

const SAFE_NAME = /[^a-z0-9-_]+/gi

/**
 * A dinamikus QR-kód letöltése a rövid QR24.hu címből. A statikus generátorral
 * azonos renderelőt használjuk, így a fájl pontosan úgy néz ki, mint az előnézet.
 */
export async function downloadDynamicQr(
  data: string,
  name: string,
  format: 'png' | 'svg',
): Promise<void> {
  const size = 1024
  const customization = {
    ...DEFAULT_CUSTOMIZATION,
    transparentBackground: false,
    logo: '',
    margin: 48,
    errorCorrection: 'M' as const,
  }
  const svg = await renderQrSvg(data, customization, size)
  const fileBase = (name || 'qr-kod').toLowerCase().replace(SAFE_NAME, '-').replace(/^-+|-+$/g, '') || 'qr-kod'

  if (format === 'svg') {
    triggerDownload(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${fileBase}.svg`)
    return
  }
  const canvas = await rasterizeSvg(svg)
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('A kép elkészítése nem sikerült.')
  triggerDownload(blob, `${fileBase}.png`)
}
