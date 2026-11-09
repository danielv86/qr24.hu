import { describe, expect, it } from 'vitest'
import { DEFAULT_PLANS } from '../server/utils/plans'
import {
  addBillingPeriod,
  buildSubscriptionSummary,
  isTrialAvailable,
  resolveActivePlan,
  subscriptionState,
  type SubscriptionRow,
} from '../server/utils/subscription'

const NOW = new Date('2026-11-09T12:00:00.000Z')

function row(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    plan: 'pro',
    interval: 'monthly',
    status: 'active',
    trialEndsAt: null,
    currentPeriodStart: new Date('2026-11-01T12:00:00.000Z'),
    currentPeriodEnd: new Date('2026-12-01T12:00:00.000Z'),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    endedAt: null,
    ...overrides,
  }
}

describe('resolveActivePlan', () => {
  it('aktív előfizetésnél a csomagot adja', () => {
    expect(resolveActivePlan(row(), NOW)).toBe('pro')
  })

  it('lejárt időszaknál ingyenesre vált', () => {
    const expired = row({ currentPeriodEnd: new Date('2026-11-08T12:00:00.000Z') })
    expect(resolveActivePlan(expired, NOW)).toBeNull()
  })

  it('próbaidő alatt a kiválasztott csomag jár', () => {
    const trial = row({
      status: 'trialing',
      plan: 'business',
      trialEndsAt: new Date('2026-11-20T12:00:00.000Z'),
      currentPeriodEnd: new Date('2026-11-20T12:00:00.000Z'),
    })
    expect(resolveActivePlan(trial, NOW)).toBe('business')
  })

  it('lejárt próbaidő után ingyenes', () => {
    const trial = row({
      status: 'trialing',
      trialEndsAt: new Date('2026-11-09T11:00:00.000Z'),
      currentPeriodEnd: new Date('2026-11-09T11:00:00.000Z'),
    })
    expect(resolveActivePlan(trial, NOW)).toBeNull()
  })

  it('lemondásnál az időszak végéig még jár', () => {
    expect(resolveActivePlan(row({ cancelAtPeriodEnd: true }), NOW)).toBe('pro')
  })

  it('expired státusznál és előfizetés nélkül nincs csomag', () => {
    expect(resolveActivePlan(row({ status: 'expired' }), NOW)).toBeNull()
    expect(resolveActivePlan(null, NOW)).toBeNull()
  })

  it('az élettartam csomag nem jár le a tárolt időszak végéig', () => {
    const lifetime = row({
      plan: 'lifetime',
      interval: 'lifetime',
      currentPeriodEnd: addBillingPeriod(NOW, 'lifetime'),
    })
    expect(resolveActivePlan(lifetime, NOW)).toBe('lifetime')
    expect(resolveActivePlan(lifetime, new Date('2120-01-01T00:00:00.000Z'))).toBe('lifetime')
    expect(subscriptionState(lifetime, NOW)).toEqual({ status: 'active', plan: 'lifetime' })
  })
})

describe('isTrialAvailable', () => {
  it('előfizetés nélkül és próbaidő nélkül igaz', () => {
    expect(isTrialAvailable(null)).toBe(true)
    expect(isTrialAvailable(row())).toBe(true)
  })

  it('felhasznált próbaidő után hamis, lejárt előfizetésnél is', () => {
    const used = new Date('2026-11-20T12:00:00.000Z')
    expect(isTrialAvailable(row({ trialEndsAt: used }))).toBe(false)
    expect(isTrialAvailable(row({ status: 'expired', trialEndsAt: used }))).toBe(false)
  })
})

describe('addBillingPeriod', () => {
  it('havi és éves ciklust ad hozzá', () => {
    expect(addBillingPeriod(NOW, 'monthly').toISOString()).toBe('2026-12-09T12:00:00.000Z')
    expect(addBillingPeriod(NOW, 'yearly').toISOString()).toBe('2027-11-09T12:00:00.000Z')
  })

  it('az élettartam csomag 100 év múlva jár le', () => {
    expect(addBillingPeriod(NOW, 'lifetime').toISOString()).toBe('2126-11-09T12:00:00.000Z')
  })

  it('nem módosítja az eredeti dátumot', () => {
    const before = NOW.toISOString()
    addBillingPeriod(NOW, 'yearly')
    expect(NOW.toISOString()).toBe(before)
  })
})

describe('subscriptionState', () => {
  it('előfizetés nélkül ingyenes', () => {
    expect(subscriptionState(null, NOW)).toEqual({ status: 'free', plan: 'free' })
  })

  it('aktív, próbaidős és lemondott állapotot megkülönbözteti', () => {
    expect(subscriptionState(row(), NOW)).toEqual({ status: 'active', plan: 'pro' })
    expect(subscriptionState(row({ status: 'trialing', trialEndsAt: new Date('2026-11-20T12:00:00.000Z') }), NOW))
      .toEqual({ status: 'trialing', plan: 'pro' })
    expect(subscriptionState(row({ cancelAtPeriodEnd: true }), NOW)).toEqual({ status: 'canceled', plan: 'pro' })
  })

  it('lejárt előfizetésnél ingyenes csomag', () => {
    const expired = row({ status: 'expired', currentPeriodEnd: new Date('2026-11-01T12:00:00.000Z') })
    expect(subscriptionState(expired, NOW)).toEqual({ status: 'expired', plan: 'free' })
  })
})

describe('buildSubscriptionSummary', () => {
  it('a próbaidő adatait és az árat adja vissza', () => {
    const trial = row({
      status: 'trialing',
      interval: 'yearly',
      trialEndsAt: new Date('2026-11-23T12:00:00.000Z'),
      currentPeriodEnd: new Date('2026-11-23T12:00:00.000Z'),
      cancelAtPeriodEnd: true,
    })
    const summary = buildSubscriptionSummary(trial, DEFAULT_PLANS)
    expect(summary.plan).toBe('pro')
    expect(summary.planLabel).toBe(DEFAULT_PLANS.pro.label)
    expect(summary.status).toBe('trialing')
    expect(summary.interval).toBe('yearly')
    expect(summary.price).toBe(DEFAULT_PLANS.pro.priceYearly)
    expect(summary.trialEndsAt).toBe('2026-11-23T12:00:00.000Z')
    expect(summary.cancelAtPeriodEnd).toBe(true)
    expect(summary.trialAvailable).toBe(false)
  })

  it('a megvásárolt ár rögzítve marad, a listaár csak a következő időszakra vonatkozik', () => {
    const paid = row({
      interval: 'yearly',
      price: 35_900,
      currentPeriodEnd: new Date('2027-11-09T12:00:00.000Z'),
    })
    const raised = { ...DEFAULT_PLANS, pro: { ...DEFAULT_PLANS.pro, priceYearly: 49_900 } }
    const summary = buildSubscriptionSummary(paid, raised)
    expect(summary.price).toBe(35_900)
    expect(summary.nextPrice).toBe(49_900)
    expect(summary.priceChanged).toBe(true)
    expect(summary.currency).toBe('HUF')
  })

  it('változatlan listaárnál nincs árváltozás jelölés', () => {
    const paid = row({ price: DEFAULT_PLANS.pro.priceMonthly })
    const summary = buildSubscriptionSummary(paid, DEFAULT_PLANS)
    expect(summary.price).toBe(DEFAULT_PLANS.pro.priceMonthly)
    expect(summary.nextPrice).toBe(DEFAULT_PLANS.pro.priceMonthly)
    expect(summary.priceChanged).toBe(false)
  })

  it('rögzített ár nélküli régi sornál a listaár érvényes', () => {
    const summary = buildSubscriptionSummary(row(), DEFAULT_PLANS)
    expect(summary.price).toBe(DEFAULT_PLANS.pro.priceMonthly)
    expect(summary.priceChanged).toBe(false)
  })

  it('az élettartam csomag ára 0 és az időszak típusa lifetime', () => {
    const lifetime = row({
      plan: 'lifetime',
      interval: 'lifetime',
      currentPeriodEnd: addBillingPeriod(NOW, 'lifetime'),
    })
    const summary = buildSubscriptionSummary(lifetime, DEFAULT_PLANS)
    expect(summary.plan).toBe('lifetime')
    expect(summary.planLabel).toBe(DEFAULT_PLANS.lifetime.label)
    expect(summary.interval).toBe('lifetime')
    expect(summary.price).toBe(0)
  })

  it('lejárt előfizetésnél nincs időszak vége', () => {
    const summary = buildSubscriptionSummary(row({ status: 'expired' }), DEFAULT_PLANS)
    expect(summary.status).toBe('expired')
    expect(summary.currentPeriodEnd).toBeNull()
  })
})
