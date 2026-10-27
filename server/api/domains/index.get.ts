import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { listDomains } from '../../utils/domains'
import { getPlanConfig } from '../../utils/plans'
import { enforceRateLimit } from '../../utils/rate-limit'
import { requireUser } from '../../utils/user-auth'

export default defineApiHandler(async (event) => {
  const user = await requireUser(event)
  await enforceRateLimit(event, {
    bucket: 'domains-list',
    key: getClientIp(event),
    limit: 90,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const [items, plan] = await Promise.all([listDomains(user.id), getPlanConfig(user.plan)])
  return apiSuccess(event, {
    items,
    available: plan.customDomain && plan.domainLimit > 0,
    planLabel: plan.label,
    limit: plan.customDomain ? plan.domainLimit : 0,
  })
})
