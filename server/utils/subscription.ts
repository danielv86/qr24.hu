import type {
  BillingInterval,
  BillingSettings,
  PlanId,
  PlansConfig,
  SubscriptionStatus,
  SubscriptionSummary,
} from '#shared/types/api'
import { ApiProblem } from './api'
import { writeAudit } from './audit'
import { getPrisma, withDb } from './db'
import { loadPlans } from './plans'
import { loadBillingSettings } from './settings'
import type { BillingSubscribeInput } from './validation'

const DAY_MS = 24 * 60 * 60 * 1000
const PAID_PLAN_IDS: PlanId[] = ['pro', 'business']

/**
 * Az előfizetés adatbázis-sora. Csak a döntésekhez szükséges mezőket tartalmazza,
 * így a tesztekben könnyen előállítható.
 */
export interface SubscriptionRow {
  plan: string
  interval: string
  status: string
  trialEndsAt: Date | null
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  canceledAt: Date | null
  endedAt: Date | null
  /** A megvásárolt (rögzített) időszakár forintban; 0 = nincs rögzítve. */
  price?: number
  /** Az ár pénzneme (jelenleg mindig HUF). */
  currency?: string
}

function asPlanId(value: string): PlanId {
  return value === 'pro' || value === 'business' || value === 'lifetime' ? value : 'free'
}

function asInterval(value: string): BillingInterval {
  if (value === 'yearly') return 'yearly'
  if (value === 'lifetime') return 'lifetime'
  return 'monthly'
}

/**
 * Egy számlázási ciklus hozzáadása a kezdődátumhoz. Az élettartam csomagnak
 * nincs megújítása: a tárolt időszak vége 100 évvel későbbi, ami gyakorlatilag
 * soha nem jár le.
 */
export function addBillingPeriod(from: Date, interval: BillingInterval): Date {
  const next = new Date(from.getTime())
  if (interval === 'yearly') {
    next.setUTCFullYear(next.getUTCFullYear() + 1)
  } else if (interval === 'lifetime') {
    next.setUTCFullYear(next.getUTCFullYear() + 100)
  } else {
    next.setUTCMonth(next.getUTCMonth() + 1)
  }
  return next
}

/**
 * Az előfizetésből ténylegesen érvényes csomag. Próbaidő alatt a kiválasztott
 * csomag jár; az időszak végén (vagy lemondás után az időszak végén) ingyenes.
 */
export function resolveActivePlan(sub: SubscriptionRow | null, now = new Date()): PlanId | null {
  if (!sub) return null
  if (sub.status !== 'trialing' && sub.status !== 'active') return null
  const end = sub.status === 'trialing' ? (sub.trialEndsAt ?? sub.currentPeriodEnd) : sub.currentPeriodEnd
  if (!end || end.getTime() <= now.getTime()) return null
  return asPlanId(sub.plan)
}

/** A felhasználó még nem használta el a próbaidőszakot. */
export function isTrialAvailable(sub: SubscriptionRow | null): boolean {
  return !sub || !sub.trialEndsAt
}

/**
 * Admin listához a fiók előfizetésének olvasható állapota. `free`: nincs
 * előfizetés, `canceled`: lemondva, de az időszak végéig még jár.
 */
export function subscriptionState(
  sub: SubscriptionRow | null,
  now = new Date(),
): { status: 'free' | 'trialing' | 'active' | 'canceled' | 'expired'; plan: PlanId } {
  if (!sub) return { status: 'free', plan: 'free' }
  const activePlan = resolveActivePlan(sub, now)
  if (!activePlan) return { status: 'expired', plan: 'free' }
  if (sub.cancelAtPeriodEnd) return { status: 'canceled', plan: activePlan }
  return { status: sub.status === 'trialing' ? 'trialing' : 'active', plan: activePlan }
}

function effectivePrice(planId: PlanId, interval: BillingInterval, plans: PlansConfig): number {
  const plan = plans[planId]
  if (plan.manualOnly) return 0
  return interval === 'yearly' ? plan.priceYearly : plan.priceMonthly
}

export async function getSubscriptionRow(userId: number | bigint): Promise<SubscriptionRow | null> {
  return withDb(() =>
    getPrisma().subscription.findUnique({
      where: { userId: BigInt(userId) },
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
        price: true,
        currency: true,
      },
    }),
  )
}

/**
 * Lejárt előfizetés lezárása: a státusz `expired`, a fiók visszaáll ingyenesre.
 * A sort nem töröljük, mert a felhasznált próbaidő tényét meg kell őrizni.
 */
export async function syncSubscription(userId: number | bigint): Promise<SubscriptionRow | null> {
  const row = await getSubscriptionRow(userId)
  if (!row) return null
  if (resolveActivePlan(row)) return row
  if (row.status === 'expired') return row

  const endedAt = row.currentPeriodEnd.getTime() <= Date.now()
    ? row.currentPeriodEnd
    : (row.trialEndsAt ?? row.currentPeriodEnd)
  const prisma = getPrisma()
  const updated = await withDb(() =>
    prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.update({
        where: { userId: BigInt(userId) },
        data: {
          status: 'expired',
          cancelAtPeriodEnd: false,
          endedAt,
        },
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
          price: true,
          currency: true,
        },
      })
      await tx.user.update({ where: { id: BigInt(userId) }, data: { plan: 'free' } })
      return subscription
    }),
  )
  await writeAudit({
    action: 'billing.expired',
    userId,
    details: { plan: row.plan, interval: row.interval },
  })
  return updated
}

export function buildSubscriptionSummary(
  sub: SubscriptionRow,
  plans: PlansConfig,
): SubscriptionSummary {
  const plan = asPlanId(sub.plan)
  const interval = asInterval(sub.interval)
  const status: SubscriptionStatus = sub.status === 'trialing' || sub.status === 'active'
    ? sub.status
    : 'expired'
  const definition = plans[plan]
  const listPrice = effectivePrice(plan, interval, plans)
  // A rögzített ár védi a vásárlót: az időszak végéig a vásárláskori ár él,
  // a listaár csak a megújuló időszakra vonatkozik. Régi soroknál (0) a listaár.
  const lockedPrice = typeof sub.price === 'number' && sub.price > 0 ? sub.price : listPrice
  return {
    plan,
    planLabel: definition.label,
    status,
    interval,
    trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: status === 'expired' ? null : sub.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    trialAvailable: isTrialAvailable(sub),
    price: lockedPrice,
    nextPrice: listPrice,
    priceChanged: lockedPrice !== listPrice,
    currency: sub.currency ?? 'HUF',
  }
}

export interface BillingOverviewPayload {
  billing: BillingSettings
  plans: PlansConfig
  subscription: SubscriptionSummary | null
}

/** A fiók összes csomagadatának friss állapota a felületnek. */
export async function getBillingOverview(userId: number | bigint): Promise<BillingOverviewPayload> {
  const [billing, plans, sub] = await Promise.all([
    loadBillingSettings(),
    loadPlans(),
    syncSubscription(userId),
  ])
  return {
    billing,
    plans,
    subscription: sub ? buildSubscriptionSummary(sub, plans) : null,
  }
}

/**
 * Előfizetés indítása vagy csomagváltás.
 *
 * Fizetési szolgáltató nélkül a vásárlás fizetés nélküli aktiválás: a próbaidő
 * letelte (vagy az első időszak vége) után a fiók automatikusan ingyenesre vált,
 * nincs automatikus megújítás és nincs terhelés. A fizetési szolgáltató
 * bekötésekor csak ez a függvény váltandó le.
 */
export async function subscribeUser(
  userId: number | bigint,
  input: BillingSubscribeInput,
): Promise<SubscriptionRow> {
  const [billing, plans] = await Promise.all([loadBillingSettings(), loadPlans()])
  if (!billing.plansEnabled) {
    throw new ApiProblem(403, 'billing_disabled', 'A csomagvásárlás jelenleg nem elérhető.')
  }
  if (!PAID_PLAN_IDS.includes(input.planId)) {
    throw new ApiProblem(422, 'plan_not_purchasable', 'Az ingyenes csomag nem vásárolható meg.')
  }
  const definition = plans[input.planId]
  // A vásárlás pillanatában érvényes ár rögzítődik az előfizetésen, így a
  // későbbi árváltozás az aktuális időszakot nem érinti.
  const purchasePrice = effectivePrice(input.planId, input.interval, plans)
  if (purchasePrice <= 0) {
    throw new ApiProblem(422, 'plan_not_purchasable', 'Ehhez a csomaghoz nincs beállított ár.')
  }

  const current = await syncSubscription(userId)
  const now = new Date()
  const activePlan = resolveActivePlan(current, now)
  const prisma = getPrisma()

  const select = {
    plan: true,
    interval: true,
    status: true,
    trialEndsAt: true,
    currentPeriodStart: true,
    currentPeriodEnd: true,
    cancelAtPeriodEnd: true,
    canceledAt: true,
    endedAt: true,
    price: true,
    currency: true,
  } as const

  // Aktív előfizetésnél a váltás azonnal érvénybe lép, a kifizetett időszak vége nem változik.\n  // Az új csomag ára a váltás pillanatában rögzítődik (a hátralévő idő az új csomagra szól).
  if (current && activePlan) {
    if (activePlan === input.planId && asInterval(current.interval) === input.interval) {
      throw new ApiProblem(409, 'already_subscribed', 'Ez a csomag már aktív a fiókodon.')
    }
    const updated = await withDb(() =>
      prisma.$transaction(async (tx) => {
        const subscription = await tx.subscription.update({
          where: { userId: BigInt(userId) },
          data: {
            plan: input.planId,
            interval: input.interval,
            cancelAtPeriodEnd: false,
            canceledAt: null,
            price: purchasePrice,
            currency: 'HUF',
          },
          select,
        })
        await tx.user.update({ where: { id: BigInt(userId) }, data: { plan: input.planId } })
        return subscription
      }),
    )
    await writeAudit({
      action: 'billing.plan_changed',
      userId,
      details: {
        from: activePlan,
        to: input.planId,
        fromInterval: current.interval,
        toInterval: input.interval,
      },
    })
    return updated
  }

  const useTrial = billing.trialDays > 0 && isTrialAvailable(current)
  const periodStart = now
  const periodEnd = useTrial
    ? new Date(now.getTime() + billing.trialDays * DAY_MS)
    : addBillingPeriod(now, input.interval)

  const data = {
    plan: input.planId,
    interval: input.interval,
    price: purchasePrice,
    currency: 'HUF',
    status: useTrial ? 'trialing' : 'active',
    trialEndsAt: useTrial ? periodEnd : (current?.trialEndsAt ?? null),
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    endedAt: null,
  }

  const updated = await withDb(() =>
    prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.upsert({
        where: { userId: BigInt(userId) },
        create: { userId: BigInt(userId), ...data },
        update: data,
        select,
      })
      await tx.user.update({ where: { id: BigInt(userId) }, data: { plan: input.planId } })
      return subscription
    }),
  )

  await writeAudit({
    action: 'billing.subscribed',
    userId,
    details: {
      plan: input.planId,
      interval: input.interval,
      trial: useTrial,
      price: purchasePrice,
      planLabel: definition.label,
    },
  })
  return updated
}

/** Lemondás: az időszak végéig a csomag még jár, utána ingyenesre vált. */
export async function cancelUserSubscription(userId: number | bigint): Promise<SubscriptionRow> {
  const sub = await syncSubscription(userId)
  if (!sub || !resolveActivePlan(sub)) {
    throw new ApiProblem(409, 'no_active_subscription', 'Nincs lemondható előfizetés.')
  }
  if (sub.cancelAtPeriodEnd) return sub

  const updated = await withDb(() =>
    getPrisma().subscription.update({
      where: { userId: BigInt(userId) },
      data: { cancelAtPeriodEnd: true, canceledAt: new Date() },
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
        price: true,
        currency: true,
      },
    }),
  )
  await writeAudit({
    action: 'billing.canceled',
    userId,
    details: { plan: sub.plan, interval: sub.interval, periodEnd: sub.currentPeriodEnd.toISOString() },
  })
  return updated
}

/** A lemondás visszavonása az időszak vége előtt. */
export async function resumeUserSubscription(userId: number | bigint): Promise<SubscriptionRow> {
  const sub = await syncSubscription(userId)
  if (!sub || !resolveActivePlan(sub)) {
    throw new ApiProblem(409, 'no_active_subscription', 'Nincs folytatható előfizetés.')
  }
  if (!sub.cancelAtPeriodEnd) return sub

  const updated = await withDb(() =>
    getPrisma().subscription.update({
      where: { userId: BigInt(userId) },
      data: { cancelAtPeriodEnd: false, canceledAt: null },
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
        price: true,
        currency: true,
      },
    }),
  )
  await writeAudit({ action: 'billing.resumed', userId, details: { plan: sub.plan } })
  return updated
}
