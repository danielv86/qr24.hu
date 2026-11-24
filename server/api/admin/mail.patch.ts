import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { requireAdmin } from '../../utils/auth'
import { mailSettingsView, saveMailSettings } from '../../utils/mail-settings'
import { resetMailTransport } from '../../utils/mailer'
import { enforceRateLimit } from '../../utils/rate-limit'
import { assertSameOrigin, mailSettingsSchema, readJsonBody } from '../../utils/validation'

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

  const input = await readJsonBody(event, mailSettingsSchema)
  const saved = await saveMailSettings(input)
  // Az új beállításokhoz új kapcsolat kell.
  resetMailTransport()
  return apiSuccess(event, mailSettingsView(saved))
})
