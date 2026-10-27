import { getRouterParam, setResponseHeader } from 'h3'
import { ApiProblem, apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { writeAudit } from '../../utils/audit'
import { removeDomain } from '../../utils/domains'
import { enforceRateLimit } from '../../utils/rate-limit'
import { requireUser } from '../../utils/user-auth'
import { assertSameOrigin } from '../../utils/validation'

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

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiProblem(404, 'not_found', 'A domain nem található.')
  }
  await removeDomain(user.id, id)
  await writeAudit({ action: 'domain.removed', userId: user.id })
  return apiSuccess(event, { deleted: true })
})
