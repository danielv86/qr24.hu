import { setResponseHeader } from 'h3'
import { apiKeyCreatedEmail, sendAccountNotification } from '../../utils/account-emails'
import { apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { createApiKey } from '../../utils/api-keys'
import { writeAudit } from '../../utils/audit'
import { getPublicSiteUrl } from '../../utils/config'
import { enforceRateLimit } from '../../utils/rate-limit'
import { requireUser } from '../../utils/user-auth'
import { apiKeyCreateSchema, assertSameOrigin, readJsonBody } from '../../utils/validation'

export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  const user = await requireUser(event)
  await enforceRateLimit(event, {
    bucket: 'api-keys-write',
    key: getClientIp(event),
    limit: 15,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const input = await readJsonBody(event, apiKeyCreateSchema)
  const key = await createApiKey(user.id, user.plan, input.name)
  await writeAudit({ action: 'api_key.created', userId: user.id })

  await sendAccountNotification({
    to: user.email,
    kind: 'account.api_key_created',
    userId: user.id,
    email: apiKeyCreatedEmail({
      name: user.name,
      keyName: key.name,
      when: new Date(),
      siteUrl: getPublicSiteUrl(event),
    }),
  })

  return apiSuccess(event, key, 201)
})
