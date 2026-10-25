import { setResponseHeader } from 'h3'
import type { UserSessionPayload } from '../../types/api'
import { apiSuccess, defineApiHandler } from '../../utils/api'
import { providerAvailability } from '../../utils/oauth'
import { getUserSession, serializeUser } from '../../utils/user-auth'

export default defineApiHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const session = await getUserSession(event)
  const payload: UserSessionPayload = {
    user: session ? serializeUser(session) : null,
    providers: providerAvailability(),
  }
  return apiSuccess(event, payload)
})
