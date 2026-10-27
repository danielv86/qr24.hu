import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler } from '../../../utils/api'
import { authenticateApiKey } from '../../../utils/api-keys'
import { listUserQrCodes } from '../../../utils/dynamic-qr'
import { enforceRateLimit } from '../../../utils/rate-limit'
import { apiQrListQuerySchema, parseQuery } from '../../../utils/validation'

export default defineApiHandler(async (event) => {
  const key = await authenticateApiKey(event)
  await enforceRateLimit(event, {
    bucket: 'api-v1-qr-list',
    key: key.keyId.toString(),
    limit: 120,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const query = parseQuery(event, apiQrListQuerySchema)
  const result = await listUserQrCodes(key.userId, {
    page: query.page,
    perPage: query.perPage,
    q: '',
    status: 'all',
    sort: 'createdAt',
    dir: 'desc',
  })
  return apiSuccess(event, result)
})
