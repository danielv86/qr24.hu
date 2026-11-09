import { setResponseHeader } from 'h3'
import { z } from 'zod'
import type {
  AdminUserFilter,
  AdminUserRow,
  AdminUsersPayload,
  AdminUsersSummary,
} from '#shared/types/api'
import type { Prisma } from '../../generated/prisma/client'
import { apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { requireAdmin } from '../../utils/auth'
import { getPrisma, withDb } from '../../utils/db'
import { loadPlans } from '../../utils/plans'
import { enforceRateLimit } from '../../utils/rate-limit'
import { parseQuery } from '../../utils/validation'
import { subscriptionState, type SubscriptionRow } from '../../utils/subscription'

const PER_PAGE = 25
const FILTERS = ['all', 'verified', 'unverified', 'subscribers', 'withQr'] as const

const querySchema = z.object({
  q: z.string().trim().max(190).optional(),
  status: z.enum(FILTERS).optional(),
  page: z.coerce.number().int().min(1).max(1_000_000).optional(),
})

/** Szűrő → adatbázis-feltétel. */
function filterWhere(filter: AdminUserFilter): Prisma.UserWhereInput {
  switch (filter) {
    case 'verified':
      return { emailVerified: true }
    case 'unverified':
      return { emailVerified: false }
    case 'subscribers':
      return { subscription: { isNot: null } }
    case 'withQr':
      return { qrCodes: { some: {} } }
    default:
      return {}
  }
}

export default defineApiHandler(async (event) => {
  await enforceRateLimit(event, {
    bucket: 'admin-read',
    key: getClientIp(event),
    limit: 120,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')
  await requireAdmin(event)

  const query = parseQuery(event, querySchema)
  const filter: AdminUserFilter = query.status ?? 'all'
  const page = query.page ?? 1
  const search = query.q?.toLowerCase() ?? ''
  const now = new Date()

  const baseWhere: Prisma.UserWhereInput = search
    ? {
        OR: [
          { email: { contains: search } },
          { name: { contains: search } },
        ],
      }
    : {}
  const where: Prisma.UserWhereInput = { ...baseWhere, ...filterWhere(filter) }
  const prisma = getPrisma()

  const [rows, total, allCount, verifiedCount, unverifiedCount, subscribersCount, withQrCount, plans] =
    await withDb(() =>
      Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * PER_PAGE,
          take: PER_PAGE,
          select: {
            id: true,
            email: true,
            name: true,
            emailVerified: true,
            createdAt: true,
            lastLoginAt: true,
            _count: { select: { qrCodes: true } },
            subscription: {
              select: {
                plan: true,
                interval: true,
                status: true,
                trialEndsAt: true,
                currentPeriodStart: true,
                currentPeriodEnd: true,
                cancelAtPeriodEnd: true,
                canceledAt: true,
                endedAt: true,
              },
            },
          },
        }),
        prisma.user.count({ where }),
        prisma.user.count({ where: baseWhere }),
        prisma.user.count({ where: { ...baseWhere, ...filterWhere('verified') } }),
        prisma.user.count({ where: { ...baseWhere, ...filterWhere('unverified') } }),
        prisma.user.count({ where: { ...baseWhere, ...filterWhere('subscribers') } }),
        prisma.user.count({ where: { ...baseWhere, ...filterWhere('withQr') } }),
        loadPlans(),
      ]),
    )

  const items: AdminUserRow[] = rows.map((user) => {
    const state = subscriptionState(user.subscription as SubscriptionRow | null, now)
    return {
      id: Number(user.id),
      email: user.email,
      name: user.name,
      plan: state.plan,
      planLabel: plans[state.plan].label,
      status: state.status,
      emailVerified: user.emailVerified,
      qrCount: user._count.qrCodes,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    }
  })

  const summary: AdminUsersSummary = {
    total: allCount,
    verified: verifiedCount,
    unverified: unverifiedCount,
    subscribers: subscribersCount,
    withQr: withQrCount,
  }

  const payload: AdminUsersPayload = {
    items,
    summary,
    page,
    perPage: PER_PAGE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PER_PAGE)),
  }
  return apiSuccess(event, payload)
})
