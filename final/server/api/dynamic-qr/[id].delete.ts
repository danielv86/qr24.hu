import { getRouterParam, setResponseHeader } from 'h3'
import { ApiProblem, apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { writeAudit } from '../../utils/audit'
import {
  assertDynamicQrAccess,
  deleteDynamicQr,
  findDynamicQrByPublicId,
  isValidPublicId,
} from '../../utils/dynamic-qr'
import { enforceRateLimit } from '../../utils/rate-limit'
import { getUserSession } from '../../utils/user-auth'
import { assertSameOrigin } from '../../utils/validation'

export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  await enforceRateLimit(event, {
    bucket: 'dynamic-qr-write',
    key: getClientIp(event),
    limit: 30,
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

  const user = await getUserSession(event)
  await deleteDynamicQr(row)
  await writeAudit({
    action: 'qr.deleted',
    userId: user?.id ?? null,
    details: { shortCode: row.publicId, targetUrl: row.targetUrl },
  })
  return apiSuccess(event, { deleted: true, shortCode: row.publicId })
})
