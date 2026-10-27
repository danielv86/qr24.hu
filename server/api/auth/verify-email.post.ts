import { setResponseHeader } from 'h3'
import { ApiProblem, apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { writeAudit } from '../../utils/audit'
import { verifyEmailCode } from '../../utils/email-verification'
import { enforceRateLimit } from '../../utils/rate-limit'
import { hashIdentifier } from '../../utils/security'
import { createUserSession, findUserByEmail, serializeUser } from '../../utils/user-auth'
import { assertSameOrigin, emailVerifySchema, readJsonBody } from '../../utils/validation'

export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  await enforceRateLimit(event, {
    bucket: 'email-verify-ip',
    key: getClientIp(event),
    limit: 20,
    windowSeconds: 15 * 60,
    message: 'Túl sok ellenőrzési kísérlet. Próbáld később.',
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const input = await readJsonBody(event, emailVerifySchema)
  await enforceRateLimit(event, {
    bucket: 'email-verify-address',
    key: hashIdentifier(input.email),
    limit: 10,
    windowSeconds: 15 * 60,
    message: 'Túl sok kódellenőrzés ehhez az e-mail-címhez. Kérj új kódot később.',
  })

  const verified = await verifyEmailCode(input.email, input.code)
  const user = await findUserByEmail(verified.email)
  if (!user) {
    throw new ApiProblem(404, 'not_found', 'A fiók nem található.')
  }

  await createUserSession(event, user.id)
  await writeAudit({ action: 'user.verified', userId: user.id })
  return apiSuccess(event, { user: serializeUser(user) })
})
