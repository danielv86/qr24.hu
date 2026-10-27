import { ApiProblem } from './api'
import { logger } from './logger'

export interface MailMessage {
  to: string
  subject: string
  html: string
  text: string
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

/** Be van-e állítva a valódi e-mail-küldés. */
export function mailConfigured(): boolean {
  return Boolean(serverEnv('NUXT_RESEND_API_KEY'))
}

export function mailFrom(): string {
  return serverEnv('NUXT_MAIL_FROM') || 'QRKOD24.hu <noreply@qrkod24.hu>'
}

/**
 * Tranzakcionális levél küldése a Resend HTTP API-jával. Fejlesztésben, ha nincs
 * API-kulcs, a levél nem megy ki: a hívó ilyenkor megkapja a `dev: true` jelzést,
 * hogy a kódot a helyi teszteléshez meg tudja jeleníteni.
 */
export async function sendMail(message: MailMessage): Promise<{ dev: boolean }> {
  const apiKey = serverEnv('NUXT_RESEND_API_KEY')
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new ApiProblem(
        503,
        'mail_not_configured',
        'Az e-mail-küldés jelenleg nincs beállítva, ezért a megerősítő levelet nem tudjuk elküldeni. Kérjük, próbáld később.',
      )
    }
    logger.info('Transactional email skipped in development (no NUXT_RESEND_API_KEY)', {
      subject: message.subject,
    })
    return { dev: true }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: mailFrom(),
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      logger.error('Resend API rejected the email', {
        status: response.status,
        body: body.slice(0, 500),
      })
      throw new ApiProblem(
        502,
        'mail_delivery_failed',
        'Az e-mail elküldése nem sikerült. Próbáld újra néhány perc múlva.',
      )
    }
    return { dev: false }
  } catch (error) {
    if (error instanceof ApiProblem) throw error
    logger.error('Email delivery failed', {
      error: error instanceof Error ? { name: error.name, message: error.message } : 'unknown',
    })
    throw new ApiProblem(
      502,
      'mail_delivery_failed',
      'Az e-mail elküldése nem sikerült. Próbáld újra néhány perc múlva.',
    )
  } finally {
    clearTimeout(timer)
  }
}
