import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type { MailSettings, MailSettingsView } from '#shared/types/api'
import { ApiProblem } from './api'
import { getSessionSecret } from './config'
import { getPrisma, isDbConfigured, withDb } from './db'
import { logger } from './logger'

/**
 * A kimenő levelek SMTP-beállításai a `settings` táblában élnek, hogy az
 * adminban (SMTP beállítások menü) lehessen őket szerkeszteni, ne .env-ben.
 * A jelszót AES-256-GCM-mel titkosítjuk, a kulcsot a munkamenet-titokból
 * származtatjuk, így adatbázis-dumpból sem olvasható ki nyíltan.
 */
const MAIL_KEY = 'mail'
const CIPHER_PREFIX = 'enc1'

export const DEFAULT_MAIL_SETTINGS: MailSettings = {
  enabled: false,
  host: '',
  port: 587,
  secure: false,
  user: '',
  password: '',
  fromEmail: '',
  fromName: 'QRKOD24.hu',
}

interface StoredMailSettings {
  enabled?: unknown
  host?: unknown
  port?: unknown
  secure?: unknown
  user?: unknown
  password?: unknown
  fromEmail?: unknown
  fromName?: unknown
}

function text(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function encryptionKey(): Buffer {
  return createHash('sha256').update(`smtp-settings:${getSessionSecret()}`).digest()
}

function encryptSecret(value: string): string {
  if (!value) return ''
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    CIPHER_PREFIX,
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

function decryptSecret(value: string): string {
  if (!value) return ''
  // Régi, titkosítás előtti érték: változatlanul használjuk.
  if (!value.startsWith(`${CIPHER_PREFIX}:`)) return value
  const [, ivPart, tagPart, dataPart] = value.split(':')
  if (!ivPart || !tagPart || !dataPart) return ''
  try {
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivPart, 'base64'))
    decipher.setAuthTag(Buffer.from(tagPart, 'base64'))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataPart, 'base64')),
      decipher.final(),
    ])
    return decrypted.toString('utf8')
  } catch {
    // Ha a munkamenet-titok megváltozott, a korábbi jelszó nem fejthető vissza.
    logger.warn('SMTP password could not be decrypted; set it again in the admin')
    return ''
  }
}

function normalizePort(value: unknown): number {
  const port = Math.trunc(Number(value))
  if (!Number.isFinite(port) || port < 1 || port > 65_535) return DEFAULT_MAIL_SETTINGS.port
  return port
}

function parseSettings(raw: string | null | undefined): MailSettings {
  if (!raw) return { ...DEFAULT_MAIL_SETTINGS }
  let parsed: StoredMailSettings
  try {
    parsed = JSON.parse(raw) as StoredMailSettings
  } catch {
    return { ...DEFAULT_MAIL_SETTINGS }
  }
  return {
    enabled: parsed.enabled === true,
    host: text(parsed.host),
    port: normalizePort(parsed.port),
    secure: parsed.secure === true,
    user: text(parsed.user),
    password: decryptSecret(typeof parsed.password === 'string' ? parsed.password : ''),
    fromEmail: text(parsed.fromEmail),
    fromName: text(parsed.fromName, 120) || DEFAULT_MAIL_SETTINGS.fromName,
  }
}

/** A mentett SMTP-beállítások (minden hívás friss adatot ad). */
export async function loadMailSettings(): Promise<MailSettings> {
  if (!isDbConfigured()) return { ...DEFAULT_MAIL_SETTINGS }
  try {
    const row = await withDb(() =>
      getPrisma().setting.findUnique({
        where: { key: MAIL_KEY },
        select: { value: true },
      }),
    )
    return parseSettings(row?.value)
  } catch (error) {
    logger.warn('SMTP settings could not be loaded from database', {
      error: error instanceof Error ? { name: error.name, message: error.message } : 'unknown',
    })
    return { ...DEFAULT_MAIL_SETTINGS }
  }
}

export interface MailSettingsInput {
  enabled: boolean
  host: string
  port: number
  secure: boolean
  user: string
  /** Üresen hagyva a korábbi jelszó marad érvényben. */
  password?: string
  fromEmail: string
  fromName: string
}

/**
 * Beállítások mentése. A jelszó csak akkor íródik felül, ha nem üres értéket
 * kapunk, így a felületen nem kell minden mentésnél újra beírni.
 */
export async function saveMailSettings(input: MailSettingsInput): Promise<MailSettings> {
  const current = await loadMailSettings()
  const password = input.password?.length ? input.password : current.password
  const next: MailSettings = {
    enabled: input.enabled === true,
    host: text(input.host),
    port: normalizePort(input.port),
    secure: input.secure === true,
    user: text(input.user),
    password,
    fromEmail: text(input.fromEmail),
    fromName: text(input.fromName, 120) || DEFAULT_MAIL_SETTINGS.fromName,
  }
  if (next.enabled && !mailSettingsUsable(next)) {
    throw new ApiProblem(
      422,
      'mail_incomplete',
      'A küldés bekapcsolásához add meg az SMTP szervert és a feladó e-mail-címét.',
    )
  }
  const value = JSON.stringify({ ...next, password: encryptSecret(next.password) })
  const prisma = getPrisma()
  await withDb(() =>
    prisma.setting.upsert({
      where: { key: MAIL_KEY },
      create: { key: MAIL_KEY, value },
      update: { value },
    }),
  )
  return next
}

/** A felületnek átadott nézet: a jelszó sosem hagyja el a szervert. */
export function mailSettingsView(settings: MailSettings): MailSettingsView {
  return {
    enabled: settings.enabled,
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    user: settings.user,
    fromEmail: settings.fromEmail,
    fromName: settings.fromName,
    hasPassword: Boolean(settings.password),
  }
}

/** Igaz, ha a beállítások alapján a levelek ténylegesen kiküldhetők. */
export function mailSettingsUsable(settings: MailSettings): boolean {
  return Boolean(settings.host && (settings.fromEmail || settings.user))
}
