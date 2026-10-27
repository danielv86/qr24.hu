import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler } from '../../../utils/api'
import { authenticateApiKey } from '../../../utils/api-keys'
import { writeAudit } from '../../../utils/audit'
import { assertPlanCapacity, createDynamicQr } from '../../../utils/dynamic-qr'
import { enforceRateLimit } from '../../../utils/rate-limit'
import { validateRedirectTarget } from '../../../utils/security'
import { apiQrCreateSchema, readJsonBody } from '../../../utils/validation'

export default defineApiHandler(async (event) => {
  const key = await authenticateApiKey(event)
  await enforceRateLimit(event, {
    bucket: 'api-v1-qr-create',
    key: key.keyId.toString(),
    limit: 30,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const input = await readJsonBody(event, apiQrCreateSchema)
  const target = await validateRedirectTarget(input.targetUrl)
  await assertPlanCapacity(key.userId, key.plan)

  const siteUrl = String(useRuntimeConfig().public.siteUrl || '').replace(/\/$/, '')
  const created = await createDynamicQr({
    targetUrl: target.toString(),
    title: input.title,
    ownerId: key.userId,
    siteUrl,
  })
  await writeAudit({ action: 'qr.created', userId: key.userId, qrId: created.id, details: { source: 'api' } })

  const { editToken: _editToken, ...item } = created
  return apiSuccess(event, item, 201)
})
