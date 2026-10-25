import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../../utils/api'
import { requireAdmin } from '../../../utils/auth'
import { enforceRateLimit } from '../../../utils/rate-limit'
import { cleanupOldScanEvents } from '../../../utils/scan-events'

/**
 * Kézi adatmegőrzési takarítás: a beolvasási eseményekből csak az utolsó 90 nap
 * marad meg, a napi összesítés (dynamic_qr_scans) érintetlen. Ütemezett futtatás
 * híján ez a végpont indítható cronból vagy az admin felületről.
 */
export default defineApiHandler(async (event) => {
  await enforceRateLimit(event, {
    bucket: 'admin-maintenance',
    key: getClientIp(event),
    limit: 10,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')
  await requireAdmin(event)

  const deleted = await cleanupOldScanEvents(90)
  return apiSuccess(event, { deleted, retentionDays: 90 })
})
