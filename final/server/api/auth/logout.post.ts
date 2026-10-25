import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { writeAudit } from '../../utils/audit'
import { enforceRateLimit } from '../../utils/rate-limit'
import { destroyUserSession, getUserSession } from '../../utils/user-auth'
import { assertSameOrigin } from '../../utils/validation'

export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  await enforceRateLimit(event, {
    bucket: 'user-logout',
    key: getClientIp(event),
    limit: 60,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const session = await getUserSession(event)
  await destroyUserSession(event)
  if (session) await writeAudit({ action: 'user.logout', userId: session.id })
  return apiSuccess(event, { loggedOut: true })
})
