import { getHeader, type H3Event } from 'h3'
import { getPrisma, withDb } from './db'
import { logger } from './logger'

export type ScanDevice = 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown'

const BOT_PATTERN =
  /bot\b|crawler|spider|preview|facebookexternalhit|slack|discord|telegram|whatsapp|linkedinbot|twitterbot|bingbot|googlebot|yandex|baidu|duckduck|headless|python-requests|python-urllib|curl\/|wget\/|go-http-client|java\/|okhttp|axios|node-fetch|libwww|scrapy/i

export interface ParsedUserAgent {
  device: ScanDevice
  browser: string
  isBot: boolean
}

/**
 * Egyszerű, determinisztikus user-agent elemzés. Nem használ külső szolgáltatást,
 * és nem tárol teljes user-agentet, csak a kategóriákat.
 */
export function parseUserAgent(userAgent: string | null | undefined): ParsedUserAgent {
  const ua = (userAgent || '').trim()
  if (!ua) return { device: 'unknown', browser: 'unknown', isBot: false }
  if (BOT_PATTERN.test(ua)) {
    return { device: 'bot', browser: 'bot', isBot: true }
  }

  const lower = ua.toLowerCase()
  let device: ScanDevice = 'desktop'
  if (/ipad|tablet|playbook|silk/.test(lower)) device = 'tablet'
  else if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(lower)) device = 'mobile'
  else if (/android/.test(lower)) device = 'tablet'

  let browser = 'Egyéb'
  if (/edg\//.test(lower)) browser = 'Edge'
  else if (/opr\/|opera/.test(lower)) browser = 'Opera'
  else if (/firefox\//.test(lower)) browser = 'Firefox'
  else if (/samsungbrowser/.test(lower)) browser = 'Samsung Internet'
  else if (/chrome\/|crios/.test(lower)) browser = 'Chrome'
  else if (/safari\//.test(lower)) browser = 'Safari'

  return { device, browser, isBot: false }
}

/** Csak a hosztot tároljuk a hivatkozó oldalból, a teljes URL-t nem. */
export function refererHost(referer: string | null | undefined): string | null {
  if (!referer) return null
  try {
    const url = new URL(referer)
    if (!/^https?:$/.test(url.protocol)) return null
    return url.hostname.slice(0, 190) || null
  } catch {
    return null
  }
}

/** A CDN/szolgáltató országkódja, ha van ilyen fejléc; egyébként nincs földrajzi adat. */
export function readCountry(event: H3Event): string | null {
  const raw = (getHeader(event, 'cf-ipcountry') || getHeader(event, 'x-vercel-ip-country') || '').trim().toUpperCase()
  return /^[A-Z]{2}$/.test(raw) ? raw : null
}

export function startOfUtcDay(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function startOfDay(date: Date): Date {
  return startOfUtcDay(date)
}

/**
 * Egy beolvasás rögzítése: esemény + napi bontás + összesített számláló egy
 * tranzakcióban. A statisztika hibája nem akadályozhatja az átirányítást.
 */
export async function recordScan(
  qrId: bigint,
  input: { userAgent: string; referer?: string | null; country?: string | null; now?: Date },
): Promise<void> {
  const parsed = parseUserAgent(input.userAgent)
  const now = input.now || new Date()
  const day = startOfUtcDay(now)
  const prisma = getPrisma()

  try {
    await withDb(() =>
      prisma.$transaction(async (tx) => {
        const updated = await tx.dynamicQrCode.updateMany({
          where: { id: qrId, status: 'active' },
          data: { scans: { increment: 1 }, lastScanAt: now },
        })
        if (updated.count === 0) return
        await tx.dynamicQrScan.upsert({
          where: { qrId_day: { qrId, day } },
          create: { qrId, day, scans: 1 },
          update: { scans: { increment: 1 } },
        })
        await tx.scanEvent.create({
          data: {
            qrId,
            createdAt: now,
            device: parsed.device,
            browser: parsed.browser,
            country: input.country || null,
            refererHost: refererHost(input.referer),
            isBot: parsed.isBot,
          },
        })
      }),
    )
  } catch (error) {
    logger.warn('Scan recording failed', {
      error: error instanceof Error ? { name: error.name, message: error.message } : 'unknown',
    })
  }
}

/**
 * Adatmegőrzés: a részletes eseményeket N nap után töröljük, a napi összesítés
 * megmarad. A kiszolgálást ez a művelet nem akaszthatja meg, ezért hiba esetén
 * csak naplózunk.
 */
export async function cleanupOldScanEvents(retentionDays = 90): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
  try {
    const result = await withDb(() => getPrisma().scanEvent.deleteMany({ where: { createdAt: { lt: cutoff } } }))
    return result.count
  } catch (error) {
    logger.warn('Scan event cleanup failed', {
      error: error instanceof Error ? { name: error.name, message: error.message } : 'unknown',
    })
    return 0
  }
}

/** Dátumtartomány a kért napokra, UTC napokkal. */
export function buildRange(days: number, now: Date = new Date()): { from: Date; to: Date } {
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))
  const from = new Date(to.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
  from.setUTCHours(0, 0, 0, 0)
  return { from, to }
}

export { startOfDay }
