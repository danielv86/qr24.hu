import { setResponseHeader } from 'h3'
import { sendAccountNotification, subscriptionCanceledEmail } from '../../utils/account-emails'
import { apiSuccess, defineApiHandler } from '../../utils/api'
import { getPublicSiteUrl } from '../../utils/config'
import { buildSubscriptionSummary, cancelUserSubscription } from '../../utils/subscription'
import { enforceRateLimit } from '../../utils/rate-limit'
import { loadBillingSettings } from '../../utils/settings'
import { loadPlans } from '../../utils/plans'
import { assertSameOrigin } from '../../utils/validation'
import { requireUser } from '../../utils/user-auth'

/** Előfizetés lemondása: az időszak végéig a csomag még jár. */
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

  const subscription = await cancelUserSubscription(user.id)
  const [billing, plans] = await Promise.all([loadBillingSettings({ force: true }), loadPlans()])
  const summary = buildSubscriptionSummary(subscription, plans)
  await sendAccountNotification({
    to: user.email,
    kind: 'billing.canceled',
    userId: user.id,
    email: subscriptionCanceledEmail({
      name: user.name,
      summary,
      siteUrl: getPublicSiteUrl(event),
    }),
  })

  return apiSuccess(event, {
    billing,
    plans,
    subscription: summary,
  })
})
