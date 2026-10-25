import { getRouterParam, setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../../utils/api'
import { writeAudit } from '../../../utils/audit'
import { getPublicSiteUrl } from '../../../utils/config'
import { findOwnedQr, serializeUserQr, setDynamicQrStatus } from '../../../utils/dynamic-qr'
import { enforceRateLimit } from '../../../utils/rate-limit'
import { requireUser } from '../../../utils/user-auth'
import { assertSameOrigin } from '../../../utils/validation'

export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  const user = await requireUser(event)
  await enforceRateLimit(event, {
    bucket: 'qr-status',
    key: getClientIp(event),
    limit: 60,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const row = await findOwnedQr(getRouterParam(event, 'id') || '', user.id)
  const updated = await setDynamicQrStatus(row, 'archived')
  await writeAudit({ action: 'qr.archived', userId: user.id, qrId: row.id })
  return apiSuccess(event, serializeUserQr(updated, getPublicSiteUrl(event)))
})
