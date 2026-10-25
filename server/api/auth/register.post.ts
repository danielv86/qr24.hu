import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { writeAudit } from '../../utils/audit'
import { enforceRateLimit } from '../../utils/rate-limit'
import { createUserSession, registerUser, serializeUser } from '../../utils/user-auth'
import { assertSameOrigin, readJsonBody, userRegisterSchema } from '../../utils/validation'

export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  await enforceRateLimit(event, {
    bucket: 'user-register',
    key: getClientIp(event),
    limit: 5,
    windowSeconds: 15 * 60,
    message: 'Túl sok regisztrációs kísérlet. Próbáld később.',
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const input = await readJsonBody(event, userRegisterSchema)
  const user = await registerUser({
    email: input.email,
    password: input.password,
    name: input.name,
  })
  await createUserSession(event, user.id)
  await writeAudit({ action: 'user.registered', userId: user.id })
  return apiSuccess(event, { user: serializeUser(user) }, 201)
})
