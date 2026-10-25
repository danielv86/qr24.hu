export type PlanId = 'free' | 'pro' | 'business'

export interface PlanDefinition {
  id: PlanId
  label: string
  /** Egyszerre használható dinamikus QR-kódok száma. */
  maxDynamicQr: number
  /** Hány napra visszamenőleg érhető el a részletes analitika. */
  analyticsDays: number
  campaigns: boolean
  expiresAt: boolean
  csvExport: boolean
  apiAccess: boolean
  customDomain: boolean
}

/**
 * A csomaglimitek egy helyen élnek, így a szerveroldali ellenőrzés és a
 * felület ugyanazt a számot mutatja. Fizetés még nincs bekötve: a csomag a
 * felhasználó `plan` mezőjéből jön, később ez váltás után frissül.
 */
export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    label: 'Ingyenes',
    maxDynamicQr: 5,
    analyticsDays: 30,
    campaigns: false,
    expiresAt: false,
    csvExport: false,
    apiAccess: false,
    customDomain: false,
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    maxDynamicQr: 100,
    analyticsDays: 365,
    campaigns: true,
    expiresAt: true,
    csvExport: true,
    apiAccess: false,
    customDomain: false,
  },
  business: {
    id: 'business',
    label: 'Business',
    maxDynamicQr: 5000,
    analyticsDays: 1095,
    campaigns: true,
    expiresAt: true,
    csvExport: true,
    apiAccess: true,
    customDomain: true,
  },
}

export function getPlan(plan: string | null | undefined): PlanDefinition {
  return PLANS[(plan || 'free') as PlanId] || PLANS.free
}

export function planLabel(plan: string | null | undefined): string {
  return getPlan(plan).label
}
