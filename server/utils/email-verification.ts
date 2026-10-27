import { randomInt } from 'node:crypto'
import { ApiProblem } from './api'
import { getPrisma, withDb } from './db'
import { sendMail } from './mailer'
import { hashIdentifier, safeEqual } from './security'

/** A kód ennyi percig érvényes. */
export const VERIFICATION_TTL_MINUTES = 15
/** Ennyi hibás próbálkozás után a kód érvénytelenné válik. */
export const VERIFICATION_MAX_ATTEMPTS = 5
/** Két kódkérés között ennyi másodpercet kell várni. */
export const RESEND_COOLDOWN_SECONDS = 60

function codeDigest(userId: bigint | number, code: string): string {
  return hashIdentifier(`email-verify:${userId}:${code}`)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function verificationEmail(code: string, name?: string | null) {
  const greeting = name?.trim() ? `Szia ${escapeHtml(name.trim())}!` : 'Szia!'
  const text = `${greeting}

A QRKOD24.hu fiókod megerősítő kódja: ${code}

A kód ${VERIFICATION_TTL_MINUTES} percig érvényes, és egyszer használható.
Ha nem te regisztráltál, hagyd figyelmen kívül ezt a levelet.

QRKOD24.hu – ingyenes QR-kód generátor`

  const html = `<!doctype html>
<html lang="hu">
<body style="margin:0;padding:24px;background:#f5f3ff;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #ddd6fe;border-radius:16px">
    <tr>
      <td style="padding:28px 28px 8px">
        <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6d28d9">QRKOD24.hu</p>
        <h1 style="margin:14px 0 0;font-size:22px;line-height:1.3">Erősítsd meg az e-mail-címedet</h1>
        <p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#475569">${greeting}</p>
        <p style="margin:6px 0 0;font-size:15px;line-height:1.6;color:#475569">Írd be ezt a 6 jegyű kódot a regisztrációs oldalon:</p>
      </td>
    </tr>
    <tr>
      <td style="padding:18px 28px">
        <div style="border-radius:12px;background:#f5f3ff;border:1px solid #ddd6fe;padding:18px;text-align:center">
          <span style="font-size:34px;font-weight:800;letter-spacing:.35em;color:#4c1d95">${code}</span>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:0 28px 26px">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b">
          A kód ${VERIFICATION_TTL_MINUTES} percig érvényes, és egyszer használható.
          Ha nem te regisztráltál, hagyd figyelmen kívül ezt a levelet – a fiók megerősítés nélkül nem használható.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`

  return {
    subject: `${code} – QRKOD24.hu e-mail megerősítő kód`,
    html,
    text,
  }
}

export interface IssuedVerification {
  /** Csak fejlesztői módban, amikor a levél ténylegesen nem megy ki. */
  devCode?: string
}

/**
 * Új 6 jegyű kódot generál, eltárolja a lenyomatát és kiküldi e-mailben.
 * A kód sosem kerül naplóba.
 */
export async function issueVerificationCode(
  userId: bigint | number,
  email: string,
  name?: string | null,
): Promise<IssuedVerification> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + VERIFICATION_TTL_MINUTES * 60 * 1000)

  await withDb(() =>
    getPrisma().user.update({
      where: { id: BigInt(userId) },
      data: {
        emailVerificationCodeHash: codeDigest(userId, code),
        emailVerificationExpiresAt: expiresAt,
        emailVerificationSentAt: now,
        emailVerificationAttempts: 0,
      },
    }),
  )

  const message = verificationEmail(code, name)
  const result = await sendMail({ to: email, ...message })
  return result.dev ? { devCode: code } : {}
}

export interface VerifiedEmail {
  userId: bigint
  email: string
}

/**
 * A beírt kód ellenőrzése. Hibás kódnál növeljük a próbálkozások számát, hogy
 * a 6 jegyű kód ne legyen kitalálható.
 */
export async function verifyEmailCode(email: string, code: string): Promise<VerifiedEmail> {
  const prisma = getPrisma()
  const row = await withDb(() =>
    prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        emailVerificationCodeHash: true,
        emailVerificationExpiresAt: true,
        emailVerificationAttempts: true,
      },
    }),
  )

  if (!row) {
    throw new ApiProblem(422, 'invalid_code', 'A kód nem megfelelő vagy lejárt.')
  }
  if (row.emailVerified) {
    return { userId: row.id, email: row.email }
  }
  if (!row.emailVerificationCodeHash || !row.emailVerificationExpiresAt) {
    throw new ApiProblem(422, 'invalid_code', 'Nincs aktív megerősítő kód. Kérj új kódot.')
  }
  if (row.emailVerificationExpiresAt.getTime() <= Date.now()) {
    throw new ApiProblem(422, 'code_expired', 'A kód lejárt. Kérj új kódot.')
  }
  if (row.emailVerificationAttempts >= VERIFICATION_MAX_ATTEMPTS) {
    throw new ApiProblem(
      429,
      'too_many_attempts',
      'Túl sok hibás próbálkozás. Kérj új kódot, és próbáld újra.',
    )
  }

  const valid = safeEqual(codeDigest(row.id, code), row.emailVerificationCodeHash)
  if (!valid) {
    await withDb(() =>
      prisma.user.update({
        where: { id: row.id },
        data: { emailVerificationAttempts: { increment: 1 } },
      }),
    )
    throw new ApiProblem(422, 'invalid_code', 'A kód nem megfelelő. Ellenőrizd, majd próbáld újra.')
  }

  await withDb(() =>
    prisma.user.update({
      where: { id: row.id },
      data: {
        emailVerified: true,
        emailVerificationCodeHash: null,
        emailVerificationExpiresAt: null,
        emailVerificationSentAt: null,
        emailVerificationAttempts: 0,
      },
    }),
  )

  return { userId: row.id, email: row.email }
}

export interface ResendResult extends IssuedVerification {
  sent: boolean
  retryAfter?: number
}

/**
 * Új kód kérése. Nem áruljuk el, hogy létezik-e a fiók: ismeretlen vagy már
 * megerősített címnél is ugyanazt a választ adjuk, e-mail nélkül.
 */
export async function resendVerificationCode(email: string): Promise<ResendResult> {
  const prisma = getPrisma()
  const row = await withDb(() =>
    prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        emailVerificationSentAt: true,
      },
    }),
  )

  if (!row || row.emailVerified) return { sent: true }

  if (row.emailVerificationSentAt) {
    const elapsed = Date.now() - row.emailVerificationSentAt.getTime()
    const cooldown = RESEND_COOLDOWN_SECONDS * 1000
    if (elapsed < cooldown) {
      const retryAfter = Math.ceil((cooldown - elapsed) / 1000)
      throw new ApiProblem(
        429,
        'resend_too_soon',
        `Új kódot ${retryAfter} másodperc múlva kérhetsz.`,
        { retryAfter },
      )
    }
  }

  const issued = await issueVerificationCode(row.id, row.email, row.name)
  return { sent: true, ...issued }
}
