import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { getAccountAnalytics } from '../../utils/dynamic-qr'
import { enforceRateLimit } from '../../utils/rate-limit'
import { requireUser } from '../../utils/user-auth'
import { analyticsQuerySchema, parseQuery } from '../../utils/validation'

export default defineApiHandler(async (event) => {
  const user = await requireUser(event)
  await enforceRateLimit(event, {
    bucket: 'account-analytics',
    key: getClientIp(event),
    limit: 90,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const query = parseQuery(event, analyticsQuerySchema)
  const analytics = await getAccountAnalytics(user.id, user.plan, query.days)
  return apiSuccess(event, analytics)
})
