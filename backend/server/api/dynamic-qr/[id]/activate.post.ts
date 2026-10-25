import { getRouterParam, setResponseHeader } from 'h3'
import { ApiProblem, apiSuccess, defineApiHandler, getClientIp } from '../../../utils/api'
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
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    throw new ApiProblem(
      409,
      'qr_expired',
      'A QR-kód lejárt; előbb módosítsd a lejárati dátumot, majd aktiváld újra.',
    )
  }
  const updated = await setDynamicQrStatus(row, 'active')
  await writeAudit({ action: 'qr.activated', userId: user.id, qrId: row.id })
  return apiSuccess(event, serializeUserQr(updated, getPublicSiteUrl(event)))
})
