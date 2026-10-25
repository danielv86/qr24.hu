import { getRouterParam, setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../../utils/api'
import { getPublicSiteUrl } from '../../../utils/config'
import { findOwnedQr, serializeUserQr } from '../../../utils/dynamic-qr'
import { enforceRateLimit } from '../../../utils/rate-limit'
import { requireUser } from '../../../utils/user-auth'

export default defineApiHandler(async (event) => {
  const user = await requireUser(event)
  await enforceRateLimit(event, {
    bucket: 'dynamic-qr-read',
    key: getClientIp(event),
    limit: 90,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const row = await findOwnedQr(getRouterParam(event, 'id') || '', user.id)
  return apiSuccess(event, serializeUserQr(row, getPublicSiteUrl(event)))
})
