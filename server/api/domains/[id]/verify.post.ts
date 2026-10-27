import { getRouterParam, setResponseHeader } from 'h3'
import { ApiProblem, apiSuccess, defineApiHandler, getClientIp } from '../../../utils/api'
import { writeAudit } from '../../../utils/audit'
import { verifyDomain } from '../../../utils/domains'
import { enforceRateLimit } from '../../../utils/rate-limit'
import { requireUser } from '../../../utils/user-auth'
import { assertSameOrigin } from '../../../utils/validation'

export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  const user = await requireUser(event)
  await enforceRateLimit(event, {
    bucket: 'domains-verify',
    key: getClientIp(event),
    limit: 10,
    windowSeconds: 60,
    message: 'Túl sok ellenőrzés. Várj egy percet, majd próbáld újra.',
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiProblem(404, 'not_found', 'A domain nem található.')
  }
  const domain = await verifyDomain(user.id, id)
  await writeAudit({ action: 'domain.verified', userId: user.id, details: { host: domain.host } })
  return apiSuccess(event, domain)
})
