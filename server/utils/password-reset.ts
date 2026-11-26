import { randomBytes } from 'node:crypto'
import { greetingFor, passwordChangedEmail, renderEmail } from './account-emails'
import { ApiProblem } from './api'
import { hashPassword } from './auth'
import { getPrisma, withDb } from './db'
import { logger } from './logger'
import { sendMail } from './mailer'
import { hashIdentifier } from './security'

/** A visszaállító hivatkozás ennyi percig érvényes. */
export const RESET_TTL_MINUTES = 60
/** Két kérés között ennyi másodpercet kell várni. */
export const RESET_COOLDOWN_SECONDS = 60
/** A token hossza bájtban (base64url-ben 43 karakter). */
const TOKEN_BYTES = 32

function tokenHash(token: string): string {
  return hashIdentifier(`password-reset:${token}`)
}

function resetEmail(link: string, name?: string | null) {
  return {
    subject: 'QRKOD24.hu – jelszó-visszaállítás',
    ...renderEmail({
      title: 'Jelszó-visszaállítás',
      greeting: greetingFor(name),
      paragraphs: [
        'Jelszó-visszaállítást kértél a fiókodhoz. Kattints az alábbi gombra, és adj meg egy új jelszót.',
      ],
      cta: { label: 'Új jelszó megadása', url: link },
      footnote: `A hivatkozás ${RESET_TTL_MINUTES} percig érvényes, és csak egyszer használható. Ha nem te kérted, hagyd figyelmen kívül ezt a levelet – a jelenlegi jelszavad változatlan marad.`,
    }),
  }
}

export interface RequestResetResult {
  /** A válasz mindig ugyanaz, hogy ne lehessen fiókokat kémlelni. */
  sent: true
  /** Csak fejlesztői módban, ha a levél ténylegesen nem ment ki. */
  devToken?: string
  retryAfter?: number
}

/**
 * Visszaállító hivatkozás kérése. Ismeretlen címnél is ugyanazt válaszoljuk,
 * levél nélkül. A token csak a levélben létezik, az adatbázisban a lenyomata.
 */
export async function requestPasswordReset(
  email: string,
  siteUrl: string,
): Promise<RequestResetResult> {
  const prisma = getPrisma()
  const row = await withDb(() =>
    prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, email: true, name: true },
    }),
  )
  if (!row) return { sent: true }

  // Egyszerre csak egy érvényes hivatkozás éljen, és ne lehessen spammelni.
  const last = await withDb(() =>
    prisma.passwordResetToken.findFirst({
      where: { userId: row.id, usedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  )
  if (last) {
    const elapsed = Date.now() - last.createdAt.getTime()
    const cooldown = RESET_COOLDOWN_SECONDS * 1000
    if (elapsed < cooldown) {
      const retryAfter = Math.ceil((cooldown - elapsed) / 1000)
      throw new ApiProblem(
        429,
        'reset_too_soon',
        `Új hivatkozást ${retryAfter} másodperc múlva kérhetsz.`,
        { retryAfter },
      )
    }
  }

  const token = randomBytes(TOKEN_BYTES).toString('base64url')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + RESET_TTL_MINUTES * 60 * 1000)

  await withDb(async () => {
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: row.id,
        OR: [{ usedAt: { not: null } }, { expiresAt: { lt: now } }],
      },
    })
    // A korábbi, még élő hivatkozások érvénytelenné válnak.
    await prisma.passwordResetToken.updateMany({
      where: { userId: row.id, usedAt: null },
      data: { usedAt: now },
    })
    await prisma.passwordResetToken.create({
      data: { userId: row.id, tokenHash: tokenHash(token), expiresAt },
    })
  })

  const link = `${siteUrl.replace(/\/$/, '')}/uj-jelszo?token=${encodeURIComponent(token)}`
  const result = await sendMail({ to: row.email, ...resetEmail(link, row.name) })
  return result.dev ? { sent: true, devToken: token } : { sent: true }
}

export interface ResetPasswordResult {
  userId: bigint
  email: string
}

/**
 * A token beváltása: új jelszó mentése, a token elhasználása és a meglévő
 * munkamenetek lezárása (egy ellopott süti ne maradjon érvényben).
 */
export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
  siteUrl: string,
): Promise<ResetPasswordResult> {
  const prisma = getPrisma()
  const now = new Date()
  const row = await withDb(() =>
    prisma.passwordResetToken.findUnique({
      where: { tokenHash: tokenHash(token) },
      select: {
        id: true,
        usedAt: true,
        expiresAt: true,
        user: { select: { id: true, email: true, name: true } },
      },
    }),
  )

  if (!row || row.usedAt || row.expiresAt.getTime() <= now.getTime()) {
    throw new ApiProblem(
      422,
      'invalid_token',
      'A visszaállító hivatkozás érvénytelen vagy lejárt. Kérj újat.',
    )
  }

  const passwordHash = await hashPassword(newPassword)
  await withDb(async () => {
    await prisma.user.update({ where: { id: row.user.id }, data: { passwordHash } })
    await prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: now },
    })
    await prisma.userSession.deleteMany({ where: { userId: row.user.id } })
    await prisma.passwordResetToken.updateMany({
      where: { userId: row.user.id, usedAt: null },
      data: { usedAt: now },
    })
  })

  logger.info('Password reset completed', { userId: Number(row.user.id) })

  // Biztonsági visszajelzés. Ha a levél nem megy ki, a jelszó attól még
  // megváltozott, ezért itt nem hibázunk el.
  try {
    await sendMail({
      to: row.user.email,
      ...passwordChangedEmail({ name: row.user.name, siteUrl }),
    })
  } catch (error) {
    logger.warn('Password change notification could not be sent', {
      userId: Number(row.user.id),
      error: error instanceof Error ? { name: error.name, message: error.message } : 'unknown',
    })
  }

  return { userId: row.user.id, email: row.user.email }
}

/** Lejárt vagy elhasznált tokenek takarítása (kérésnél, olcsón). */
export async function cleanupPasswordResetTokens(): Promise<void> {
  await withDb(() =>
    getPrisma().passwordResetToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }] },
    }),
  ).catch(() => {})
}
