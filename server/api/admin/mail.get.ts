import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { requireAdmin } from '../../utils/auth'
import { loadMailSettings, mailSettingsView } from '../../utils/mail-settings'
import { enforceRateLimit } from '../../utils/rate-limit'

export default defineApiHandler(async (event) => {
  await enforceRateLimit(event, {
    bucket: 'admin-read',
    key: getClientIp(event),
    limit: 120,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')
  await requireAdmin(event)
  const settings = await loadMailSettings()
  return apiSuccess(event, mailSettingsView(settings))
})
