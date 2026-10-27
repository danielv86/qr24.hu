import { setResponseHeader } from 'h3'
import { ApiProblem, apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { verifyPassword } from '../../utils/auth'
import { getPrisma, withDb } from '../../utils/db'
import { enforceRateLimit } from '../../utils/rate-limit'
import { destroyUserSession, requireUser } from '../../utils/user-auth'
import { accountDeleteSchema, assertSameOrigin, readJsonBody } from '../../utils/validation'

/**
 * A fiókhoz tartozó sorok törlése külön lépésekben. Nem hagyatkozunk a
 * adatbázis ON DELETE CASCADE szabályára, mert az a helyi MyISAM táblákon nem
 * érvényesül – így minden környezetben ugyanaz marad a végeredmény.
 */
async function deleteAccountData(userId: bigint) {
  const prisma = getPrisma()
  await withDb(() =>
    prisma.$transaction([
      prisma.scanEvent.deleteMany({ where: { qr: { ownerId: userId } } }),
      prisma.dynamicQrScan.deleteMany({ where: { qr: { ownerId: userId } } }),
      prisma.auditLog.deleteMany({ where: { userId } }),
      prisma.dynamicQrCode.deleteMany({ where: { ownerId: userId } }),
      prisma.apiKey.deleteMany({ where: { userId } }),
      prisma.customDomain.deleteMany({ where: { userId } }),
      prisma.oAuthAccount.deleteMany({ where: { userId } }),
      prisma.userSession.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]),
  )
}

export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  const session = await requireUser(event)
  await enforceRateLimit(event, {
    bucket: 'account-delete',
    key: getClientIp(event),
    limit: 5,
    windowSeconds: 15 * 60,
    message: 'Túl sok törlési kísérlet. Próbáld később.',
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const input = await readJsonBody(event, accountDeleteSchema)
  if (input.confirmEmail !== session.email.toLowerCase()) {
    throw new ApiProblem(422, 'confirmation_mismatch', 'A beírt e-mail-cím nem egyezik a fiók címével.', {
      details: { confirmEmail: 'Írd be pontosan a fiók e-mail-címét.' },
    })
  }

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

  if (current.passwordHash) {
    if (!input.password) {
      throw new ApiProblem(422, 'validation_error', 'Add meg a jelszavad a törléshez.', {
        details: { password: 'Add meg a jelszavad.' },
      })
    }
    const valid = await verifyPassword(input.password, current.passwordHash)
    if (!valid) {
      throw new ApiProblem(422, 'invalid_password', 'A jelszó nem megfelelő.', {
        details: { password: 'Hibás jelszó.' },
      })
    }
  }

  await deleteAccountData(current.id)
  await destroyUserSession(event)
  return apiSuccess(event, { deleted: true })
})
