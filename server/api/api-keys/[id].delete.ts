import { getRouterParam, setResponseHeader } from 'h3'
import { ApiProblem, apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { revokeApiKey } from '../../utils/api-keys'
import { writeAudit } from '../../utils/audit'
import { enforceRateLimit } from '../../utils/rate-limit'
import { requireUser } from '../../utils/user-auth'
import { assertSameOrigin } from '../../utils/validation'

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

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiProblem(404, 'not_found', 'Az API-kulcs nem található.')
  }
  await revokeApiKey(user.id, id)
  await writeAudit({ action: 'api_key.revoked', userId: user.id })
  return apiSuccess(event, { revoked: true })
})
