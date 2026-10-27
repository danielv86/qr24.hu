import { setResponseHeader } from 'h3'
import { ApiProblem, apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { writeAudit } from '../../utils/audit'
import { enforceRateLimit } from '../../utils/rate-limit'
import { hashIdentifier } from '../../utils/security'
import { authenticateUser, createUserSession, serializeUser } from '../../utils/user-auth'
import { assertSameOrigin, readJsonBody, userLoginSchema } from '../../utils/validation'

export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  await enforceRateLimit(event, {
    bucket: 'user-login',
    key: getClientIp(event),
    limit: 20,
    windowSeconds: 15 * 60,
    message: 'Túl sok bejelentkezési kísérlet. Próbáld később.',
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const input = await readJsonBody(event, userLoginSchema)
  await enforceRateLimit(event, {
    bucket: 'user-login-email',
    key: hashIdentifier(input.email),
    limit: 8,
    windowSeconds: 15 * 60,
    message: 'Túl sok próbálkozás ehhez az e-mail-címhez. Várj 15 percet.',
  })

  const user = await authenticateUser(input.email, input.password)
  if (!user) {
    throw new ApiProblem(401, 'invalid_credentials', 'A megadott e-mail-cím vagy jelszó nem megfelelő.')
  }
  if (!user.emailVerified) {
    throw new ApiProblem(
      403,
      'email_not_verified',
      'Az e-mail-címed még nincs megerősítve. Írd be a regisztrációkor kapott 6 jegyű kódot.',
    )
  }
  await createUserSession(event, user.id)
  await writeAudit({ action: 'user.login', userId: user.id })
  return apiSuccess(event, { user: serializeUser(user) })
})
