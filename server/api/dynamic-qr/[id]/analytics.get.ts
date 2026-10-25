import { getRouterParam, setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../../utils/api'
import { findOwnedQr, getUserAnalytics } from '../../../utils/dynamic-qr'
import { enforceRateLimit } from '../../../utils/rate-limit'
import { requireUser } from '../../../utils/user-auth'
import { analyticsQuerySchema, parseQuery } from '../../../utils/validation'

export default defineApiHandler(async (event) => {
  const user = await requireUser(event)
  await enforceRateLimit(event, {
    bucket: 'qr-analytics',
    key: getClientIp(event),
    limit: 90,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const row = await findOwnedQr(getRouterParam(event, 'id') || '', user.id)
  const query = parseQuery(event, analyticsQuerySchema)
  const analytics = await getUserAnalytics(row, { days: query.days, plan: user.plan })
  return apiSuccess(event, analytics)
})
