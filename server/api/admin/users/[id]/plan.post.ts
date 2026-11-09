import { getRouterParam, setResponseHeader, type H3Event } from 'h3'
import { z } from 'zod'
import { ApiProblem, apiSuccess, defineApiHandler, getClientIp } from '../../../../utils/api'
import { writeAudit } from '../../../../utils/audit'
import { requireAdmin } from '../../../../utils/auth'
import { getPrisma, withDb } from '../../../../utils/db'
import { enforceRateLimit } from '../../../../utils/rate-limit'
import { addBillingPeriod } from '../../../../utils/subscription'
import { assertSameOrigin, readJsonBody } from '../../../../utils/validation'

const bodySchema = z.object({
  plan: z.enum(['lifetime', 'free'], { error: 'Érvénytelen csomag.' }),
})

function parseUserId(event: H3Event): number {
  const id = Number(getRouterParam(event, 'id') ?? '')
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiProblem(400, 'invalid_user_id', 'Érvénytelen felhasználó-azonosító.')
  }
  return id
}

/**
 * Csomag kézi kiosztása az admin felületről.
 *
 * `lifetime`: élettartam csomag, lejárat nélkül (100 év múlva jár le a tárolt
 * időszak, de nincs megújítás és nincs fizetés). `free`: az élettartam csomag
 * visszavonása, a fiók visszaáll ingyenesre.
 */
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

  const userId = parseUserId(event)
  const body = await readJsonBody(event, bodySchema)
  const prisma = getPrisma()
  const now = new Date()

  const user = await withDb(() =>
    prisma.user.findUnique({ where: { id: BigInt(userId) }, select: { id: true } }),
  )
  if (!user) {
    throw new ApiProblem(404, 'user_not_found', 'A felhasználó nem található.')
  }

  if (body.plan === 'lifetime') {
    const periodEnd = addBillingPeriod(now, 'lifetime')
    await withDb(() =>
      prisma.$transaction(async (tx) => {
        await tx.subscription.upsert({
          where: { userId: BigInt(userId) },
          create: {
            userId: BigInt(userId),
            plan: 'lifetime',
            interval: 'lifetime',
            price: 0,
            currency: 'HUF',
            status: 'active',
            trialEndsAt: null,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
          },
          update: {
            plan: 'lifetime',
            interval: 'lifetime',
            price: 0,
            currency: 'HUF',
            status: 'active',
            trialEndsAt: null,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
            canceledAt: null,
            endedAt: null,
          },
        })
        await tx.user.update({ where: { id: BigInt(userId) }, data: { plan: 'lifetime' } })
      }),
    )
    await writeAudit({ action: 'admin.plan.lifetime', userId, details: { plan: 'lifetime' } })
    return apiSuccess(event, { plan: 'lifetime', status: 'active' })
  }

  // Visszavonás: a meglévő előfizetés lezárul, a fiók ingyenesre vált.
  await withDb(() =>
    prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: { userId: BigInt(userId) },
        data: {
          status: 'expired',
          cancelAtPeriodEnd: false,
          canceledAt: null,
          endedAt: now,
        },
      })
      await tx.user.update({ where: { id: BigInt(userId) }, data: { plan: 'free' } })
    }),
  )
  await writeAudit({ action: 'admin.plan.revoked', userId, details: { plan: 'free' } })
  return apiSuccess(event, { plan: 'free', status: 'expired' })
})
