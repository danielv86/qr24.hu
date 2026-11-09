import { setResponseHeader } from 'h3'
import { ApiProblem, apiSuccess, defineApiHandler } from '../../utils/api'
import { writeAudit } from '../../utils/audit'
import { getPublicSiteUrl, requireDynamicQrEnabled } from '../../utils/config'
import { assertPlanCapacity, createDynamicQr } from '../../utils/dynamic-qr'
import { getPlanConfig } from '../../utils/plans'
import { enforceRateLimit } from '../../utils/rate-limit'
import { parseExpiry } from '#shared/qr/status'
import { validateRedirectTarget } from '../../utils/security'
import { requireUser } from '../../utils/user-auth'
import { dynamicQrCreateSchema, readJsonBody } from '../../utils/validation'

export default defineApiHandler(async (event) => {
  requireDynamicQrEnabled()
  // A dinamikus kód szerveroldali átirányítás, ezért csak fiókkal hozható létre.
  const user = await requireUser(event)
  await enforceRateLimit(event, {
    bucket: 'dynamic-qr-create-user',
    key: String(user.id),
    limit: 40,
    windowSeconds: 10 * 60,
    message: 'Túl sok dinamikus QR-kód létrehozási kísérlet. Próbáld később.',
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const input = await readJsonBody(event, dynamicQrCreateSchema)
  const plan = await getPlanConfig(user.plan)
  if (input.expiresAt && !plan.expiresAt) {
    throw new ApiProblem(403, 'plan_feature_locked', 'A lejárati dátum a Pro és Business csomagban érhető el.')
  }
  if (input.campaign && !plan.campaigns) {
    throw new ApiProblem(403, 'plan_feature_locked', 'A kampánycímkék a Pro és Business csomagban érhetők el.')
  }

  let expiresAt: Date | null = null
  if (input.expiresAt) {
    expiresAt = parseExpiry(input.expiresAt)
    if (!expiresAt) {
      throw new ApiProblem(422, 'validation_error', 'Érvénytelen lejárati dátum.', {
        details: { expiresAt: 'Használj ISO 8601 formátumú dátumot.' },
      })
    }
    if (expiresAt.getTime() <= Date.now()) {
      throw new ApiProblem(422, 'validation_error', 'A lejárati dátumnak a jövőben kell lennie.', {
        details: { expiresAt: 'A lejárat nem lehet a múltban.' },
      })
    }
  }

  await assertPlanCapacity(user.id, user.plan)

  const target = await validateRedirectTarget(input.targetUrl)
  const created = await createDynamicQr({
    targetUrl: target.toString(),
    title: input.title,
    description: input.description,
    category: input.category,
    campaign: input.campaign,
    expiresAt,
    style: input.style ?? null,
    ownerId: user.id,
    siteUrl: getPublicSiteUrl(event),
  })

  await writeAudit({
    action: 'qr.created',
    userId: user.id,
    qrId: created.id,
    details: { shortCode: created.shortCode },
  })
  return apiSuccess(event, created, 201)
})
