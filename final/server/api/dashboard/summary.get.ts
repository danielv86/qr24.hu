import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { getDashboardSummary } from '../../utils/dynamic-qr'
import { enforceRateLimit } from '../../utils/rate-limit'
import { requireUser } from '../../utils/user-auth'

export default defineApiHandler(async (event) => {
  const user = await requireUser(event)
  await enforceRateLimit(event, {
    bucket: 'dashboard-summary',
    key: getClientIp(event),
    limit: 90,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const summary = await getDashboardSummary(user.id, user.plan)
  return apiSuccess(event, summary)
})
