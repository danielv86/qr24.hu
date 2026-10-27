import { setResponseHeader } from 'h3'
import { ApiProblem, apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { writeAudit } from '../../utils/audit'
import { verifyPassword } from '../../utils/auth'
import { getPrisma, withDb } from '../../utils/db'
import { issueVerificationCode } from '../../utils/email-verification'
import { enforceRateLimit } from '../../utils/rate-limit'
import { requireUser, serializeUser } from '../../utils/user-auth'
import { accountUpdateSchema, assertSameOrigin, readJsonBody } from '../../utils/validation'

export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  const session = await requireUser(event)
  await enforceRateLimit(event, {
    bucket: 'account-update',
    key: getClientIp(event),
    limit: 20,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const input = await readJsonBody(event, accountUpdateSchema)
  const prisma = getPrisma()
  const current = await withDb(() =>
    prisma.user.findUnique({
      where: { id: BigInt(session.id) },
      select: { id: true, email: true, name: true, passwordHash: true, plan: true, createdAt: true },
    }),
  )
  if (!current) {
    throw new ApiProblem(401, 'unauthorized', 'A munkamenet lejárt. Jelentkezz be újra.')
  }

  const data: { name?: string | null; email?: string; emailVerified?: boolean } = {}
  if (input.name !== undefined) {
    data.name = input.name.trim().slice(0, 120) || null
  }

  if (input.email && input.email !== current.email) {
    if (!current.passwordHash) {
      throw new ApiProblem(
        403,
        'oauth_account',
        'Külső szolgáltatóval létrehozott fióknál az e-mail-cím itt nem módosítható.',
      )
    }
    if (!input.currentPassword) {
      throw new ApiProblem(422, 'validation_error', 'Az e-mail-cím módosításához add meg a jelenlegi jelszót.', {
        details: { currentPassword: 'Add meg a jelenlegi jelszót.' },
      })
    }
    const valid = await verifyPassword(input.currentPassword, current.passwordHash)
    if (!valid) {
      throw new ApiProblem(422, 'invalid_password', 'A jelenlegi jelszó nem megfelelő.', {
        details: { currentPassword: 'Hibás jelszó.' },
      })
    }
    const taken = await withDb(() =>
      prisma.user.findUnique({ where: { email: input.email! }, select: { id: true } }),
    )
    if (taken && taken.id !== current.id) {
      throw new ApiProblem(409, 'email_taken', 'Ezzel az e-mail-címmel már létezik fiók.')
    }
    data.email = input.email
    data.emailVerified = false
  }

  if (Object.keys(data).length === 0) {
    return apiSuccess(event, serializeUser(current))
  }

  const updated = await withDb(() =>
    prisma.user.update({
      where: { id: current.id },
      data,
      select: { id: true, email: true, name: true, passwordHash: true, plan: true, createdAt: true },
    }),
  ).catch((error: unknown) => {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ApiProblem(409, 'email_taken', 'Ezzel az e-mail-címmel már létezik fiók.')
    }
    throw error
  })

  if (data.email) {
    try {
      await issueVerificationCode(updated.id, updated.email, updated.name)
    } catch (error) {
      // Ha a megerősítő levelet nem lehet kiküldeni, ne maradjon a fiók olyan
      // címen, amit a felhasználó nem tud megerősíteni.
      await withDb(() =>
        getPrisma().user.update({
          where: { id: current.id },
          data: { email: current.email, emailVerified: true },
        }),
      ).catch(() => {})
      throw error
    }
  }

  await writeAudit({ action: 'user.updated', userId: session.id })
  return apiSuccess(event, serializeUser(updated))
})
