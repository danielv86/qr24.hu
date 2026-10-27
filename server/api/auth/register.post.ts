import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { writeAudit } from '../../utils/audit'
import { getPrisma, withDb } from '../../utils/db'
import { issueVerificationCode } from '../../utils/email-verification'
import { enforceRateLimit } from '../../utils/rate-limit'
import { registerUser } from '../../utils/user-auth'
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

  try {
    const issued = await issueVerificationCode(user.id, user.email, user.name)
    await writeAudit({ action: 'user.registered', userId: user.id })
    return apiSuccess(
      event,
      {
        email: user.email,
        verificationRequired: true,
        /** Csak fejlesztői módban, ha nincs beállítva e-mail-küldés. */
        ...issued,
      },
      201,
    )
  } catch (error) {
    // Ha a levél nem megy ki, ne maradjon olyan fiók, amit nem lehet megerősíteni.
    await withDb(() => getPrisma().user.delete({ where: { id: BigInt(user.id) } })).catch(() => {})
    throw error
  }
})
