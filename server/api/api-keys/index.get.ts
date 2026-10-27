import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { listApiKeys } from '../../utils/api-keys'
import { getPlanConfig } from '../../utils/plans'
import { enforceRateLimit } from '../../utils/rate-limit'
import { requireUser } from '../../utils/user-auth'

export default defineApiHandler(async (event) => {
  const user = await requireUser(event)
  await enforceRateLimit(event, {
    bucket: 'api-keys-list',
    key: getClientIp(event),
    limit: 90,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const [items, plan] = await Promise.all([listApiKeys(user.id), getPlanConfig(user.plan)])
  return apiSuccess(event, {
    items,
    available: plan.apiAccess,
    planLabel: plan.label,
  })
})
