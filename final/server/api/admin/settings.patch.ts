import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { requireAdmin } from '../../utils/auth'
import { enforceRateLimit } from '../../utils/rate-limit'
import { loadPublicSettings, saveBrandAndIntegrations } from '../../utils/settings'
import { adminSettingsSchema, assertSameOrigin, readJsonBody } from '../../utils/validation'

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

  const input = await readJsonBody(event, adminSettingsSchema)
  await saveBrandAndIntegrations(input)
  return apiSuccess(event, await loadPublicSettings({ force: true }))
})
