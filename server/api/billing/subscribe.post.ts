import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler } from '../../utils/api'
import { buildSubscriptionSummary, subscribeUser } from '../../utils/subscription'
import { enforceRateLimit } from '../../utils/rate-limit'
import { loadBillingSettings } from '../../utils/settings'
import { loadPlans } from '../../utils/plans'
import { billingSubscribeSchema, assertSameOrigin, readJsonBody } from '../../utils/validation'
import { requireUser } from '../../utils/user-auth'

/**
 * Csomag kiválasztása. Fizetési szolgáltató nélkül ez fizetés nélküli
 * aktiválás: a próbaidő vagy az első időszak végéig szól, automatikus
 * megújítás nincs.
 */
export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  const user = await requireUser(event)
  await enforceRateLimit(event, {
    bucket: 'billing-write',
    key: `user:${user.id}`,
    limit: 20,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const input = await readJsonBody(event, billingSubscribeSchema)
  const [subscription, billing, plans] = await Promise.all([
    subscribeUser(user.id, input),
    loadBillingSettings({ force: true }),
    loadPlans(),
  ])
  return apiSuccess(event, {
    billing,
    plans,
    subscription: buildSubscriptionSummary(subscription, plans),
  })
})
