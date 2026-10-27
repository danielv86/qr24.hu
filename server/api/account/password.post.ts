import { setResponseHeader } from 'h3'
import { ApiProblem, apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { writeAudit } from '../../utils/audit'
import { hashPassword, verifyPassword } from '../../utils/auth'
import { getPrisma, withDb } from '../../utils/db'
import { enforceRateLimit } from '../../utils/rate-limit'
import { requireUser } from '../../utils/user-auth'
import { accountPasswordSchema, assertSameOrigin, readJsonBody } from '../../utils/validation'

export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  const session = await requireUser(event)
  await enforceRateLimit(event, {
    bucket: 'account-password',
    key: getClientIp(event),
    limit: 10,
    windowSeconds: 15 * 60,
    message: 'Túl sok jelszómódosítási kísérlet. Próbáld később.',
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const input = await readJsonBody(event, accountPasswordSchema)
  const prisma = getPrisma()
  const current = await withDb(() =>
    prisma.user.findUnique({
      where: { id: BigInt(session.id) },
      select: { id: true, passwordHash: true },
    }),
  )
  if (!current) {
    throw new ApiProblem(401, 'unauthorized', 'A munkamenet lejárt. Jelentkezz be újra.')
  }

  // Ha már van jelszó, a módosításhoz a jelenlegit is meg kell adni.
  if (current.passwordHash) {
    if (!input.currentPassword) {
      throw new ApiProblem(422, 'validation_error', 'Add meg a jelenlegi jelszót.', {
        details: { currentPassword: 'Add meg a jelenlegi jelszót.' },
      })
    }
    const valid = await verifyPassword(input.currentPassword, current.passwordHash)
    if (!valid) {
      throw new ApiProblem(422, 'invalid_password', 'A jelenlegi jelszó nem megfelelő.', {
        details: { currentPassword: 'Hibás jelszó.' },
      })
    }
  }

  const passwordHash = await hashPassword(input.newPassword)
  await withDb(() =>
    prisma.user.update({
      where: { id: current.id },
      data: { passwordHash },
    }),
  )
  await writeAudit({ action: 'user.password_changed', userId: session.id })
  return apiSuccess(event, { updated: true })
})
