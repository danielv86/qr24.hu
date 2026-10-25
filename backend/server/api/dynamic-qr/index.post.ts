import { setResponseHeader } from 'h3'
import { ApiProblem, apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { writeAudit } from '../../utils/audit'
import { getPublicSiteUrl, requireDynamicQrEnabled } from '../../utils/config'
import { assertPlanCapacity, createDynamicQr } from '../../utils/dynamic-qr'
import { getPlanConfig } from '../../utils/plans'
import { enforceRateLimit } from '../../utils/rate-limit'
import { parseExpiry } from '../../utils/qr-status'
import { validateRedirectTarget } from '../../utils/security'
import { getUserSession } from '../../utils/user-auth'
import { dynamicQrCreateSchema, readJsonBody } from '../../utils/validation'

export default defineApiHandler(async (event) => {
  requireDynamicQrEnabled()
  const user = await getUserSession(event)
  await enforceRateLimit(event, {
    bucket: user ? 'dynamic-qr-create-user' : 'dynamic-qr-create',
    key: user ? String(user.id) : getClientIp(event),
    limit: user ? 40 : 8,
    windowSeconds: 10 * 60,
    message: 'Túl sok dinamikus QR-kód létrehozási kísérlet. Próbáld később.',
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const input = await readJsonBody(event, dynamicQrCreateSchema)
  const plan = await getPlanConfig(user?.plan)
  const wantsExtras = Boolean(input.description || input.category || input.campaign || input.expiresAt)
  if (!user && wantsExtras) {
    throw new ApiProblem(401, 'login_required', 'A leíráshoz, kategóriához és lejárathoz be kell jelentkezned.')
  }
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

  if (user) await assertPlanCapacity(user.id, user.plan)

  const target = await validateRedirectTarget(input.targetUrl)
  const created = await createDynamicQr({
    targetUrl: target.toString(),
    title: input.title,
    description: input.description,
    category: input.category,
    campaign: input.campaign,
    expiresAt,
    style: input.style ?? null,
    ownerId: user?.id ?? null,
    siteUrl: getPublicSiteUrl(event),
  })

  if (user) {
    await writeAudit({
      action: 'qr.created',
      userId: user.id,
      qrId: created.id,
      details: { shortCode: created.shortCode },
    })
  }
  return apiSuccess(event, created, 201)
})
