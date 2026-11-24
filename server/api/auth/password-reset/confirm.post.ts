import { setResponseHeader } from 'h3'
import { ApiProblem, apiSuccess, defineApiHandler, getClientIp } from '../../../utils/api'
import { writeAudit } from '../../../utils/audit'
import { getPublicSiteUrl } from '../../../utils/config'
import { resetPasswordWithToken } from '../../../utils/password-reset'
import { enforceRateLimit } from '../../../utils/rate-limit'
import { createUserSession, findUserByEmail, serializeUser } from '../../../utils/user-auth'
import { assertSameOrigin, passwordResetConfirmSchema, readJsonBody } from '../../../utils/validation'

export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  await enforceRateLimit(event, {
    bucket: 'password-reset-confirm',
    key: getClientIp(event),
    limit: 20,
    windowSeconds: 15 * 60,
    message: 'Túl sok próbálkozás. Kérj új visszaállító hivatkozást.',
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const input = await readJsonBody(event, passwordResetConfirmSchema)
  const result = await resetPasswordWithToken(
    input.token,
    input.newPassword,
    getPublicSiteUrl(event),
  )

  // Kényelmi okból egyből be is jelentkeztetjük: az e-mail-cím birtoklását a
  // token igazolta, a régi munkameneteket pedig az imént zártuk le.
  await createUserSession(event, result.userId)
  const user = await findUserByEmail(result.email)
  if (!user) {
    throw new ApiProblem(404, 'not_found', 'A fiók nem található.')
  }
  await writeAudit({ action: 'user.password_reset', userId: result.userId })
  return apiSuccess(event, { user: serializeUser(user) })
})
