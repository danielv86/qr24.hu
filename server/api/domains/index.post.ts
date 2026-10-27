import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { writeAudit } from '../../utils/audit'
import { addDomain } from '../../utils/domains'
import { enforceRateLimit } from '../../utils/rate-limit'
import { requireUser } from '../../utils/user-auth'
import { assertSameOrigin, domainCreateSchema, readJsonBody } from '../../utils/validation'

export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  const user = await requireUser(event)
  await enforceRateLimit(event, {
    bucket: 'domains-write',
    key: getClientIp(event),
    limit: 20,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const input = await readJsonBody(event, domainCreateSchema)
  const domain = await addDomain(user.id, user.plan, input.host)
  await writeAudit({ action: 'domain.added', userId: user.id, details: { host: domain.host } })
  return apiSuccess(event, domain, 201)
})
