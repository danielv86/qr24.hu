import { createHash } from 'node:crypto'
import nodemailer, { type Transporter } from 'nodemailer'
import type { MailSettings } from '#shared/types/api'
import { ApiProblem } from './api'
import { logger } from './logger'
import { loadMailSettings, mailSettingsUsable } from './mail-settings'

export interface MailMessage {
  to: string
  subject: string
  html: string
  text: string
}

export interface SendMailOptions {
  /** A mentett beállítások helyett ezekkel küldjön (admin tesztküldés). */
  settings?: MailSettings
  /** Tesztküldésnél akkor is menjen ki a levél, ha a küldés ki van kapcsolva. */
  force?: boolean
}

interface CachedTransport {
  key: string
  transporter: Transporter
}

let cached: CachedTransport | null = null

function transportKey(settings: MailSettings): string {
  return createHash('sha256')
    .update(
      [
        settings.host,
        String(settings.port),
        settings.secure ? '1' : '0',
        settings.user,
        settings.password,
        settings.fromEmail,
      ].join('\u0000'),
    )
    .digest('hex')
}

function createTransport(settings: MailSettings): Transporter {
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    ...(settings.user
      ? { auth: { user: settings.user, pass: settings.password } }
      : {}),
    // Ne akadjon el a kérés, ha a szerver nem válaszol.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })
}

function transporterFor(settings: MailSettings): Transporter {
  const key = transportKey(settings)
  if (cached && cached.key === key) return cached.transporter
  const transporter = createTransport(settings)
  cached = { key, transporter }
  return transporter
}

export function mailFrom(settings: MailSettings): string {
  const address = settings.fromEmail || settings.user
  return settings.fromName ? `${settings.fromName} <${address}>` : address
}

/** A hiba okát emberi nyelvre fordítja, hogy az adminban látszódjon. */
function describeError(error: unknown): string {
  const code = (error as { code?: string }).code || ''
  const response = (error as { response?: string }).response || ''
  const message = error instanceof Error ? error.message : ''
  // A nodemailer gyakran ESOCKET-tel csomagolja a kapcsolódási hibákat, ezért
  // az üzenetből is felismerjük a valódi okot.
  if (/ECONNREFUSED/i.test(message)) return 'a szerver elutasította a kapcsolatot (host vagy port)'
  if (/ENOTFOUND|EAI_AGAIN/i.test(message)) return 'a szerver címe nem oldható fel'
  if (/ETIMEDOUT|timed? ?out/i.test(message)) return 'a szerver nem válaszolt időben'
  if (/self[- ]signed|certificate/i.test(message)) return 'a szerver tanúsítványa nem érvényes (SSL/TLS)'
  if (code === 'EAUTH') return 'a szerver elutasította a bejelentkezést (felhasználónév vagy jelszó)'
  if (code === 'ECONNECTION' || code === 'ECONNREFUSED') return 'nem sikerült csatlakozni a szerverhez (host vagy port)'
  if (code === 'ETIMEDOUT' || code === 'ECONNRESET') return 'a szerver nem válaszolt időben'
  if (code === 'ESOCKET') return 'a titkosított kapcsolat nem jött létre (SSL/TLS beállítás)'
  if (code === 'EDNS') return 'a szerver címe nem oldható fel'
  if (response) return response.slice(0, 200)
  if (message) return message.slice(0, 200)
  return 'ismeretlen hiba'
}

/**
 * Tranzakcionális levél küldése a beállított SMTP szerveren keresztül.
 * Ha a küldés nincs beállítva vagy ki van kapcsolva, fejlesztésben nem megy ki
 * levél (a hívó `dev: true` jelzést kap), élesben pedig hibát adunk.
 */
export async function sendMail(
  message: MailMessage,
  options: SendMailOptions = {},
): Promise<{ dev: boolean }> {
  const settings = options.settings ?? (await loadMailSettings())
  const usable = mailSettingsUsable(settings)
  const allowed = options.force === true || (usable && settings.enabled)

  if (!allowed) {
    if (process.env.NODE_ENV === 'production') {
      throw new ApiProblem(
        503,
        'mail_not_configured',
        'Az e-mail-küldés nincs beállítva, ezért nem tudunk levelet küldeni. Próbáld később.',
      )
    }
    logger.info('Transactional email skipped in development (SMTP is not configured or disabled)', {
      subject: message.subject,
      host: settings.host || null,
    })
    return { dev: true }
  }

  try {
    await transporterFor(settings).sendMail({
      from: mailFrom(settings),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    })
    return { dev: false }
  } catch (error) {
    logger.error('SMTP delivery failed', {
      host: settings.host,
      port: settings.port,
      code: (error as { code?: string }).code || null,
      error: error instanceof Error ? { name: error.name, message: error.message } : 'unknown',
    })
    throw new ApiProblem(
      502,
      'mail_delivery_failed',
      `Az e-mail elküldése nem sikerült: ${describeError(error)}.`,
    )
  }
}

/** Kapcsolat- és bejelentkezés-ellenőrzés a beállítások oldalához. */
export async function verifyMailConnection(settings: MailSettings): Promise<void> {
  if (!mailSettingsUsable(settings)) {
    throw new ApiProblem(
      422,
      'mail_incomplete',
      'Add meg az SMTP szervert és a feladó e-mail-címét.',
    )
  }
  try {
    // A verify() nem küld levelet, csak kapcsolódik és bejelentkezik.
    await transporterFor(settings).verify()
  } catch (error) {
    logger.warn('SMTP connection check failed', {
      host: settings.host,
      port: settings.port,
      code: (error as { code?: string }).code || null,
    })
    throw new ApiProblem(
      502,
      'mail_connection_failed',
      `A kapcsolódás nem sikerült: ${describeError(error)}.`,
    )
  }
}

/** A beállítások változásakor eldobjuk a gyorsítótárazott kapcsolatot. */
export function resetMailTransport() {
  cached = null
}
