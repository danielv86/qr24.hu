import { setResponseHeader } from 'h3'
import { sendAccountNotification, subscriptionResumedEmail } from '../../utils/account-emails'
import { apiSuccess, defineApiHandler } from '../../utils/api'
import { getPublicSiteUrl } from '../../utils/config'
import { buildSubscriptionSummary, resumeUserSubscription } from '../../utils/subscription'
import { enforceRateLimit } from '../../utils/rate-limit'
import { loadBillingSettings } from '../../utils/settings'
import { loadPlans } from '../../utils/plans'
import { assertSameOrigin } from '../../utils/validation'
import { requireUser } from '../../utils/user-auth'

/** Lemondás visszavonása az időszak vége előtt. */
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

  const subscription = await resumeUserSubscription(user.id)
  const [billing, plans] = await Promise.all([loadBillingSettings({ force: true }), loadPlans()])
  const summary = buildSubscriptionSummary(subscription, plans)
  await sendAccountNotification({
    to: user.email,
    kind: 'billing.resumed',
    userId: user.id,
    email: subscriptionResumedEmail({
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
