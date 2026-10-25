import { getRouterParam, setResponseHeader } from 'h3'
import { parseExpiry } from '#shared/qr/dynamic'
import { getPlan } from '#shared/qr/plans'
import { ApiProblem, apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { writeAudit } from '../../utils/audit'
import { getPublicSiteUrl } from '../../utils/config'
import {
  assertDynamicQrAccess,
  findDynamicQrByPublicId,
  isValidPublicId,
  serializeDynamicQr,
  updateDynamicQr,
} from '../../utils/dynamic-qr'
import { enforceRateLimit } from '../../utils/rate-limit'
import { validateRedirectTarget } from '../../utils/security'
import { getUserSession } from '../../utils/user-auth'
import {
  assertSameOrigin,
  dynamicQrUpdateSchema,
  readJsonBody,
} from '../../utils/validation'

export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  await enforceRateLimit(event, {
    bucket: 'dynamic-qr-write',
    key: getClientIp(event),
    limit: 30,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const id = getRouterParam(event, 'id') || ''
  if (!isValidPublicId(id)) {
    throw new ApiProblem(404, 'not_found', 'A dinamikus QR-kód nem található.')
  }
  const row = await findDynamicQrByPublicId(id)
  if (!row) {
    throw new ApiProblem(404, 'not_found', 'A dinamikus QR-kód nem található.')
  }
  await assertDynamicQrAccess(event, row)

  const changes = await readJsonBody(event, dynamicQrUpdateSchema)
  const user = await getUserSession(event)
  const plan = getPlan(user?.plan)

  const needsAccount = changes.expiresAt !== undefined || changes.campaign !== undefined
  if (needsAccount && !user) {
    throw new ApiProblem(401, 'login_required', 'A lejárathoz és a kampánycímkékhez be kell jelentkezned.')
  }
  if (changes.expiresAt !== undefined && changes.expiresAt !== null && !plan.expiresAt) {
    throw new ApiProblem(403, 'plan_feature_locked', 'A lejárati dátum a Pro és Business csomagban érhető el.')
  }
  if (changes.campaign !== undefined && changes.campaign && !plan.campaigns) {
    throw new ApiProblem(403, 'plan_feature_locked', 'A kampánycímkék a Pro és Business csomagban érhetők el.')
  }

  let expiresAt: Date | null | undefined
  if (changes.expiresAt !== undefined) {
    if (changes.expiresAt === null || changes.expiresAt === '') {
      expiresAt = null
    } else {
      expiresAt = parseExpiry(changes.expiresAt)
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
  }

  const targetUrl = changes.targetUrl
    ? (await validateRedirectTarget(changes.targetUrl)).toString()
    : undefined

  const updated = await updateDynamicQr(row, {
    targetUrl,
    title: changes.title,
    description: changes.description,
    category: changes.category,
    campaign: changes.campaign,
    expiresAt,
    style: changes.style,
    isActive: changes.isActive,
  })

  if (user) {
    await writeAudit({
      action: 'qr.updated',
      userId: user.id,
      qrId: row.id,
      details: { fields: Object.keys(changes) },
    })
  }
  return apiSuccess(event, serializeDynamicQr(updated, getPublicSiteUrl(event)))
})
