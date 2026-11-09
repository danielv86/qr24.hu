import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { enforceRateLimit } from '../../utils/rate-limit'
import { getBillingOverview } from '../../utils/subscription'
import { requireUser } from '../../utils/user-auth'

/** A fiók előfizetése, a csomagok és a vásárlás kapcsolóinak állapota. */
export default defineApiHandler(async (event) => {
  const user = await requireUser(event)
  await enforceRateLimit(event, {
    bucket: 'billing-read',
    key: `user:${user.id}`,
    limit: 90,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return apiSuccess(event, await getBillingOverview(user.id))
})
