import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { writeAudit } from '../../utils/audit'
import { requireAdmin } from '../../utils/auth'
import { plansPatchSchema, savePlans } from '../../utils/plans'
import { enforceRateLimit } from '../../utils/rate-limit'
import { assertSameOrigin, readJsonBody } from '../../utils/validation'

/**
 * Csomagbeállítás módosítása. Az érték a settings táblába kerül, ezért a
 * limitek és funkciók build és újraindítás nélkül állíthatók (30 mp-es cache).
 */
export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  await enforceRateLimit(event, {
    bucket: 'admin-write',
    key: getClientIp(event),
    limit: 30,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')
  await requireAdmin(event)

  const changes = await readJsonBody(event, plansPatchSchema)
  const plans = await savePlans(changes)
  await writeAudit({ action: 'plans.updated', details: { plans: changes } })
  return apiSuccess(event, plans)
})
