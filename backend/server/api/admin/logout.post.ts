import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler } from '../../utils/api'
import { destroyAdminSession } from '../../utils/auth'
import { assertSameOrigin } from '../../utils/validation'

export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  await destroyAdminSession(event)
  return apiSuccess(event, { loggedOut: true })
})
