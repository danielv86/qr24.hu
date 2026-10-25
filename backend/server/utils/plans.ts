import { z } from 'zod'
import type { PlanDefinition, PlanId, PlansConfig } from '../types/api'
import { ApiProblem } from './api'
import { getPrisma, isDbConfigured, withDb } from './db'
import { logger } from './logger'

/**
 * A csomagok alapértelmezése. Az éles értékek a `settings` tábla `plans`
 * kulcsából jönnek, így az üzemeltető build és újraindítás nélkül állíthatja a
 * limiteket. Ha a kulcs hiányzik vagy érvénytelen, marad ez a beállítás.
 */
export const DEFAULT_PLANS: PlansConfig = {
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

export const PLAN_IDS: PlanId[] = ['free', 'pro', 'business']
export const PLAN_SETTING_KEY = 'plans'

const planPatchSchema = z.object({
  label: z.string().trim().min(1).max(40).optional(),
  maxDynamicQr: z.number().int().min(0).max(1_000_000).optional(),
  analyticsDays: z.number().int().min(1).max(3650).optional(),
  campaigns: z.boolean().optional(),
  expiresAt: z.boolean().optional(),
  csvExport: z.boolean().optional(),
  apiAccess: z.boolean().optional(),
  customDomain: z.boolean().optional(),
}).strict()

/** Részleges mentés: bármelyik csomagnak csak a megadott mezői változnak. */
export const plansPatchSchema = z.object({
  free: planPatchSchema.optional(),
  pro: planPatchSchema.optional(),
  business: planPatchSchema.optional(),
}).strict().refine(value => Object.keys(value).length > 0, {
  message: 'Adj meg legalább egy módosítandó csomagot.',
})

export type PlansPatchInput = z.infer<typeof plansPatchSchema>

interface PlansCache {
  data: PlansConfig
  expiresAt: number
}

const CACHE_TTL_MS = 30_000
let cache: PlansCache | null = null

/** Az adatbázisban tárolt (esetleg hiányos vagy hibás) értékek összefésülése. */
export function mergePlans(overrides: unknown): PlansConfig {
  const merged: PlansConfig = {
    free: { ...DEFAULT_PLANS.free },
    pro: { ...DEFAULT_PLANS.pro },
    business: { ...DEFAULT_PLANS.business },
  }
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return merged

  for (const id of PLAN_IDS) {
    const candidate = (overrides as Record<string, unknown>)[id]
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue
    const parsed = planPatchSchema.safeParse(candidate)
    if (!parsed.success) {
      logger.warn('Invalid plan override ignored', { plan: id })
      continue
    }
    const patch = parsed.data
    const target = merged[id]
    if (patch.label !== undefined) target.label = patch.label
    if (patch.maxDynamicQr !== undefined) target.maxDynamicQr = patch.maxDynamicQr
    if (patch.analyticsDays !== undefined) target.analyticsDays = patch.analyticsDays
    if (patch.campaigns !== undefined) target.campaigns = patch.campaigns
    if (patch.expiresAt !== undefined) target.expiresAt = patch.expiresAt
    if (patch.csvExport !== undefined) target.csvExport = patch.csvExport
    if (patch.apiAccess !== undefined) target.apiAccess = patch.apiAccess
    if (patch.customDomain !== undefined) target.customDomain = patch.customDomain
  }
  return merged
}

export function invalidatePlansCache() {
  cache = null
}

export async function loadPlans(options: { force?: boolean } = {}): Promise<PlansConfig> {
  if (!options.force && cache && cache.expiresAt > Date.now()) return cache.data
  if (!isDbConfigured()) {
    cache = { data: mergePlans(null), expiresAt: Date.now() + CACHE_TTL_MS }
    return cache.data
  }
  try {
    const row = await withDb(() =>
      getPrisma().setting.findUnique({ where: { key: PLAN_SETTING_KEY }, select: { value: true } }),
    )
    let overrides: unknown = null
    if (row?.value) {
      try {
        overrides = JSON.parse(row.value)
      } catch {
        logger.warn('Plan setting is not valid JSON; using defaults')
      }
    }
    const data = mergePlans(overrides)
    cache = { data, expiresAt: Date.now() + CACHE_TTL_MS }
    return data
  } catch (error) {
    logger.warn('Plans could not be loaded from database; using defaults', {
      error: error instanceof Error ? { name: error.name, message: error.message } : 'unknown',
    })
    return mergePlans(null)
  }
}

/** A felhasználó csomagjának aktuális szabályai (ismeretlen csomag → ingyenes). */
export async function getPlanConfig(plan: string | null | undefined): Promise<PlanDefinition> {
  const plans = await loadPlans()
  const id = (plan || 'free') as PlanId
  return plans[id] || plans.free
}

/** Részleges módosítás mentése; a hiányzó mezők az alapértelmezésből jönnek. */
export async function savePlans(input: PlansPatchInput): Promise<PlansConfig> {
  const prisma = getPrisma()
  const existing = await withDb(() =>
    prisma.setting.findUnique({ where: { key: PLAN_SETTING_KEY }, select: { value: true } }),
  )
  let current: Record<string, unknown> = {}
  if (existing?.value) {
    try {
      const parsed = JSON.parse(existing.value)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) current = parsed as Record<string, unknown>
    } catch {
      current = {}
    }
  }

  const next: Record<string, unknown> = { ...current }
  for (const id of PLAN_IDS) {
    const patch = input[id]
    if (!patch) continue
    const previous = next[id] && typeof next[id] === 'object' ? (next[id] as Record<string, unknown>) : {}
    next[id] = { ...previous, ...patch }
  }

  const value = JSON.stringify(next)
  if (value.length > 8000) {
    throw new ApiProblem(422, 'validation_error', 'A csomagbeállítás túl nagy.')
  }
  await withDb(() =>
    prisma.setting.upsert({
      where: { key: PLAN_SETTING_KEY },
      create: { key: PLAN_SETTING_KEY, value },
      update: { value },
    }),
  )
  invalidatePlansCache()
  return loadPlans({ force: true })
}
