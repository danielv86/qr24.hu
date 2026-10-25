import {
  defineEventHandler,
  getHeader,
  getRouterParam,
  send,
  sendRedirect,
  setResponseHeader,
  setResponseStatus,
  type H3Event,
} from 'h3'
import { effectiveStatus, type DynamicQrStatus } from '../../utils/qr-status'
import { ApiProblem, getClientIp } from '../../utils/api'
import { getPrisma, isDbConfigured } from '../../utils/db'
import { findDynamicQrByPublicId, isValidPublicId } from '../../utils/dynamic-qr'
import { logger } from '../../utils/logger'
import { enforceRateLimit } from '../../utils/rate-limit'
import { recordScan, readCountry } from '../../utils/scan-events'
import { isObviouslyUnsafeUrl } from '../../utils/security'

function pageShell(title: string, heading: string, body: string, accent = '#2563eb'): string {
  return `<!doctype html>
<html lang="hu">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${title} – QR24.hu</title>
</head>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;color:#0f172a;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px">
  <main style="max-width:34rem;padding:2rem;background:#fff;border:1px solid #e2e8f0;border-radius:1rem;text-align:center">
    <h1 style="font-size:1.35rem;margin:0 0 .5rem">${heading}</h1>
    <p style="color:#475569;line-height:1.6;margin:0 0 1.25rem">${body}</p>
    <a href="/" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;padding:.7rem 1.1rem;border-radius:.65rem;font-weight:600">QR24.hu nyitólapja</a>
  </main>
</body>
</html>`
}

function notFoundHtml(): string {
  return pageShell(
    'A QR-kód nem található',
    'Ez a QR-kód nem található',
    'A hivatkozás lejárt, törölték, vagy soha nem létezett.',
  )
}

function statusHtml(status: DynamicQrStatus): string {
  if (status === 'paused') {
    return pageShell(
      'A QR-kód átmenetileg szünetel',
      'Ez a QR-kód átmenetileg szünetel',
      'A kód készítője egyelőre kikapcsolta az átirányítást. Ha ez a saját kódod, a QR24.hu fiókodban bármikor újraaktiválhatod.',
      '#d97706',
    )
  }
  if (status === 'expired') {
    return pageShell(
      'A QR-kód lejárt',
      'Ennek a QR-kódnak lejárt az ideje',
      'A kód érvényességi ideje véget ért, ezért már nem irányít tovább. Ha ez a saját kódod, a fiókodban új lejárati dátumot adhatsz meg.',
      '#dc2626',
    )
  }
  return pageShell(
    'A QR-kód archiválva van',
    'Ezt a QR-kódot archiválták',
    'A kód készítője archiválta ezt a hivatkozást, ezért már nem irányít tovább.',
  )
}

function limitedHtml(): string {
  return pageShell(
    'Túl sok kérés',
    'Túl sok kérés érkezett',
    'Kérjük, várj egy percet, majd próbáld újra.',
  )
}

function respondHtml(event: H3Event, status: number, html: string, retryAfter?: number) {
  setResponseStatus(event, status)
  setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  setResponseHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
  if (retryAfter) setResponseHeader(event, 'Retry-After', retryAfter)
  return send(event, html, 'text/html; charset=utf-8')
}

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code') || ''
  if (!isValidPublicId(code)) {
    return respondHtml(event, 404, notFoundHtml())
  }

  try {
    await enforceRateLimit(event, {
      bucket: 'dynamic-qr-scan',
      key: getClientIp(event),
      limit: 240,
      windowSeconds: 60,
      message: 'Túl sok átirányítási kérés.',
    })
  } catch (error) {
    if (error instanceof ApiProblem && error.statusCode === 429) {
      return respondHtml(event, 429, limitedHtml(), error.retryAfter || 60)
    }
    throw error
  }

  if (!isDbConfigured()) {
    return respondHtml(event, 404, notFoundHtml())
  }

  try {
    const row = await findDynamicQrByPublicId(code)
    if (!row) return respondHtml(event, 404, notFoundHtml())

    const status = effectiveStatus(row)
    if (status !== 'active') {
      // A lejárt állapotot alkalomadtán tartósítjuk, hogy a lista is pontos legyen.
      if (status === 'expired' && row.status === 'active') {
        getPrisma()
          .dynamicQrCode.updateMany({ where: { id: row.id, status: 'active' }, data: { status: 'expired', isActive: false } })
          .catch(() => {})
      }
      setResponseHeader(event, 'Cache-Control', 'no-store')
      const httpStatus = status === 'paused' ? 200 : 410
      return respondHtml(event, httpStatus, statusHtml(status))
    }

    let target: URL
    try {
      target = new URL(row.targetUrl)
    } catch {
      return respondHtml(event, 404, notFoundHtml())
    }
    if (isObviouslyUnsafeUrl(target)) {
      logger.warn('Unsafe stored redirect blocked', { qrId: row.id })
      return respondHtml(event, 404, notFoundHtml())
    }

    await recordScan(row.id, {
      userAgent: getHeader(event, 'user-agent') || '',
      referer: getHeader(event, 'referer'),
      country: readCountry(event),
    })

    setResponseHeader(event, 'Cache-Control', 'no-store')
    setResponseHeader(event, 'Referrer-Policy', 'no-referrer')
    setResponseHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
    return sendRedirect(event, target.toString(), 302)
  } catch (error) {
    logger.error('Dynamic QR redirect failed', {
      error: error instanceof Error ? { name: error.name, message: error.message } : 'unknown',
    })
    setResponseStatus(event, 503)
    setResponseHeader(event, 'Retry-After', 30)
    return respondHtml(event, 503, notFoundHtml())
  }
})
