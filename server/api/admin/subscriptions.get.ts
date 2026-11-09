import { setResponseHeader } from 'h3'
import { z } from 'zod'
import type {
  AdminSubscriptionFilter,
  AdminSubscriptionRow,
  AdminSubscriptionsPayload,
  AdminSubscriptionsSummary,
} from '#shared/types/api'
import type { Prisma } from '../../generated/prisma/client'
import { apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { requireAdmin } from '../../utils/auth'
import { getPrisma, withDb } from '../../utils/db'
import { loadPlans, PLAN_IDS } from '../../utils/plans'
import { enforceRateLimit } from '../../utils/rate-limit'
import { parseQuery } from '../../utils/validation'
import { subscriptionState, type SubscriptionRow } from '../../utils/subscription'

const DEFAULT_PER_PAGE = 25
const PER_PAGE_OPTIONS = [10, 25, 50] as const
const FILTERS = ['all', 'active', 'trialing', 'canceled', 'expired', 'free'] as const

const querySchema = z.object({
  q: z.string().trim().max(190).optional(),
  status: z.enum(FILTERS).optional(),
  page: z.coerce.number().int().min(1).max(1_000_000).optional(),
  perPage: z.coerce.number().int().refine(value => (PER_PAGE_OPTIONS as readonly number[]).includes(value), {
    message: 'Érvénytelen oldalméret.',
  }).optional(),
})

/** Kereséskor a csomag- és állapotnevek magyar és angol alakjai is találjanak. */
const PLAN_SYNONYMS: Record<string, string[]> = {
  free: ['ingyenes', 'alap'],
  pro: ['pro', 'profi'],
  business: ['business', 'uzleti', 'mega'],
  lifetime: ['lifetime', 'elettartam', 'orokos', 'veglen'],
}

const STATUS_KEYWORDS: { status: AdminSubscriptionFilter; words: string[] }[] = [
  { status: 'active', words: ['aktiv'] },
  { status: 'trialing', words: ['proba', 'trial'] },
  { status: 'canceled', words: ['lemond'] },
  { status: 'expired', words: ['lejart', 'expired'] },
  { status: 'free', words: ['ingyenes', 'nincs elofizetes'] },
]

/** Ékezet nélküli, kisbetűs alak a kereséshez. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const SUBSCRIPTION_SELECT = {
  plan: true,
  interval: true,
  status: true,
  trialEndsAt: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  cancelAtPeriodEnd: true,
  canceledAt: true,
  endedAt: true,
} as const

/** Szűrő → adatbázis-feltétel. A státuszok a megjelenítéssel egyeznek. */
function statusWhere(filter: AdminSubscriptionFilter, now: Date): Prisma.UserWhereInput {
  switch (filter) {
    case 'free':
      return { subscription: null }
    case 'active':
      return {
        subscription: {
          is: { status: 'active', currentPeriodEnd: { gt: now }, cancelAtPeriodEnd: false },
        },
      }
    case 'trialing':
      return {
        subscription: {
          is: { status: 'trialing', trialEndsAt: { gt: now }, cancelAtPeriodEnd: false },
        },
      }
    case 'canceled':
      return {
        subscription: {
          is: {
            cancelAtPeriodEnd: true,
            OR: [
              { status: 'trialing', trialEndsAt: { gt: now } },
              { status: 'active', currentPeriodEnd: { gt: now } },
            ],
          },
        },
      }
    case 'expired':
      // Van előfizetés, de már nincs hozzá élő időszak.
      return {
        NOT: {
          OR: [
            { subscription: null },
            { subscription: { is: { status: 'active', currentPeriodEnd: { gt: now } } } },
            { subscription: { is: { status: 'trialing', trialEndsAt: { gt: now } } } },
          ],
        },
      }
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
  const filter: AdminSubscriptionFilter = query.status ?? 'all'
  const page = query.page ?? 1
  const perPage = query.perPage ?? DEFAULT_PER_PAGE
  const now = new Date()
  const search = query.q?.toLowerCase() ?? ''

  const plans = await loadPlans()

  // Szöveges keresés: e-mail, név, csomagnév és állapot is találatot adhat.
  const normalized = normalize(search)
  const matchedPlans = new Set<string>()
  const matchedStatuses = new Set<AdminSubscriptionFilter>()
  if (normalized.length >= 2) {
    for (const id of PLAN_IDS) {
      const words = [normalize(id), normalize(plans[id].label), ...(PLAN_SYNONYMS[id] ?? [])]
      if (words.some((word) => word.includes(normalized))) matchedPlans.add(id)
    }
    for (const entry of STATUS_KEYWORDS) {
      if (entry.words.some((word) => word.includes(normalized))) matchedStatuses.add(entry.status)
    }
  }

  const searchConditions: Prisma.UserWhereInput[] = []
  if (search) {
    searchConditions.push({ email: { contains: search } }, { name: { contains: search } })
    if (matchedPlans.size) {
      searchConditions.push({ subscription: { is: { plan: { in: [...matchedPlans] } } } })
    }
    for (const status of matchedStatuses) searchConditions.push(statusWhere(status, now))
  }

  const baseWhere: Prisma.UserWhereInput = search ? { OR: searchConditions } : {}
  const where: Prisma.UserWhereInput = {
    ...baseWhere,
    ...statusWhere(filter, now),
  }
  const prisma = getPrisma()

  const [rows, total, allCount, activeCount, trialingCount, canceledCount, expiredCount, freeCount] =
    await withDb(() =>
      Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * perPage,
          take: perPage,
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            subscription: { select: SUBSCRIPTION_SELECT },
          },
        }),
        prisma.user.count({ where }),
        prisma.user.count({ where: baseWhere }),
        prisma.user.count({ where: { ...baseWhere, ...statusWhere('active', now) } }),
        prisma.user.count({ where: { ...baseWhere, ...statusWhere('trialing', now) } }),
        prisma.user.count({ where: { ...baseWhere, ...statusWhere('canceled', now) } }),
        prisma.user.count({ where: { ...baseWhere, ...statusWhere('expired', now) } }),
        prisma.user.count({ where: { ...baseWhere, ...statusWhere('free', now) } }),
      ]),
    )

  const items: AdminSubscriptionRow[] = rows.map((user) => {
    const sub = user.subscription as SubscriptionRow | null
    const state = subscriptionState(sub, now)
    return {
      userId: Number(user.id),
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      plan: state.plan,
      planLabel: plans[state.plan].label,
      status: state.status,
      interval: sub
        ? sub.interval === 'yearly'
          ? 'yearly'
          : sub.interval === 'lifetime'
            ? 'lifetime'
            : 'monthly'
        : null,
      trialEndsAt: sub?.trialEndsAt?.toISOString() ?? null,
      currentPeriodEnd: sub && state.status !== 'expired' && state.status !== 'free'
        ? sub.currentPeriodEnd.toISOString()
        : null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd === true,
      canceledAt: sub?.canceledAt?.toISOString() ?? null,
      endedAt: sub?.endedAt?.toISOString() ?? null,
    }
  })

  const summary: AdminSubscriptionsSummary = {
    total: allCount,
    active: activeCount,
    trialing: trialingCount,
    canceled: canceledCount,
    expired: expiredCount,
    free: freeCount,
  }

  const payload: AdminSubscriptionsPayload = {
    items,
    summary,
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
  return apiSuccess(event, payload)
})
