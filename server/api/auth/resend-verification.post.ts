import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { resendVerificationCode } from '../../utils/email-verification'
import { enforceRateLimit } from '../../utils/rate-limit'
import { hashIdentifier } from '../../utils/security'
import { assertSameOrigin, emailResendSchema, readJsonBody } from '../../utils/validation'

export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  await enforceRateLimit(event, {
    bucket: 'email-resend-ip',
    key: getClientIp(event),
    limit: 10,
    windowSeconds: 15 * 60,
    message: 'Túl sok kódkérés. Próbáld később.',
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const input = await readJsonBody(event, emailResendSchema)
  await enforceRateLimit(event, {
    bucket: 'email-resend-address',
    key: hashIdentifier(input.email),
    limit: 5,
    windowSeconds: 15 * 60,
    message: 'Ehhez az e-mail-címhez túl sok kódot kértek. Próbáld később.',
  })

  const result = await resendVerificationCode(input.email)
  return apiSuccess(event, {
    sent: true,
    ...(result.devCode ? { devCode: result.devCode } : {}),
  })
})
