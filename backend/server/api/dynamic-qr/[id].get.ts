import { getRouterParam, setResponseHeader } from 'h3'
import { ApiProblem, apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { getPublicSiteUrl } from '../../utils/config'
import {
  assertDynamicQrAccess,
  findDynamicQrByPublicId,
  isValidPublicId,
  serializeDynamicQr,
} from '../../utils/dynamic-qr'
import { enforceRateLimit } from '../../utils/rate-limit'

export default defineApiHandler(async (event) => {
  await enforceRateLimit(event, {
    bucket: 'dynamic-qr-read',
    key: getClientIp(event),
    limit: 60,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const id = getRouterParam(event, 'id') || ''
  if (!isValidPublicId(id)) {
    throw new ApiProblem(404, 'not_found', 'A dinamikus QR-kód nem található.')
  }
  const row = await findDynamicQrByPublicId(id)
  if (!row) {
    throw new ApiProblem(404, 'not_found', 'A dinamikus QR-kód nem található.')
  }
  await assertDynamicQrAccess(event, row)
  return apiSuccess(event, serializeDynamicQr(row, getPublicSiteUrl(event)))
})
