import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { listUserQrCodes } from '../../utils/dynamic-qr'
import { enforceRateLimit } from '../../utils/rate-limit'
import { requireUser } from '../../utils/user-auth'
import { dynamicQrListQuerySchema, parseQuery } from '../../utils/validation'

export default defineApiHandler(async (event) => {
  const user = await requireUser(event)
  await enforceRateLimit(event, {
    bucket: 'dynamic-qr-list',
    key: getClientIp(event),
    limit: 120,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const query = parseQuery(event, dynamicQrListQuerySchema)
  const result = await listUserQrCodes(user.id, {
    page: query.page,
    perPage: query.perPage,
    q: query.q,
    status: query.status,
    category: query.category,
    sort: query.sort,
    dir: query.dir,
  })
  return apiSuccess(event, result)
})
