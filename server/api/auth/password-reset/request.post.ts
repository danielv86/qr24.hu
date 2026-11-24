import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../../utils/api'
import { getPublicSiteUrl } from '../../../utils/config'
import { cleanupPasswordResetTokens, requestPasswordReset } from '../../../utils/password-reset'
import { enforceRateLimit } from '../../../utils/rate-limit'
import { hashIdentifier } from '../../../utils/security'
import { assertSameOrigin, passwordResetRequestSchema, readJsonBody } from '../../../utils/validation'

export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  await enforceRateLimit(event, {
    bucket: 'password-reset-ip',
    key: getClientIp(event),
    limit: 10,
    windowSeconds: 15 * 60,
    message: 'Túl sok jelszó-visszaállítási kérés. Próbáld később.',
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const input = await readJsonBody(event, passwordResetRequestSchema)
  await enforceRateLimit(event, {
    bucket: 'password-reset-address',
    key: hashIdentifier(input.email),
    limit: 5,
    windowSeconds: 15 * 60,
    message: 'Ehhez az e-mail-címhez túl sok kérést indítottak. Próbáld később.',
  })

  await cleanupPasswordResetTokens()
  const result = await requestPasswordReset(input.email, getPublicSiteUrl(event))
  return apiSuccess(event, {
    sent: true,
    ...(result.devToken ? { devToken: result.devToken } : {}),
  })
})
