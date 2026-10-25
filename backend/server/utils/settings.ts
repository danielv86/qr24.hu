import type { PublicSettings, SeoOverride } from '#shared/types/api'
import { getPrisma, isDbConfigured, withDb } from './db'
import { logger } from './logger'

interface CachedPublicSettings {
  data: PublicSettings
  expiresAt: number
}

let cache: CachedPublicSettings | null = null
const CACHE_TTL_MS = 30_000

interface SettingsRow {
  key: string
  value: string
}

interface SeoRow {
  path: string
  title: string
  description: string
  noindex: boolean
}

function runtimeDefaults(): PublicSettings {
  const config = useRuntimeConfig()
  return {
    brandName: String(config.public.brandName || 'QR24.hu'),
    siteUrl: String(config.public.siteUrl || 'http://localhost:3000').replace(/\/$/, ''),
    dynamicQrEnabled: config.public.dynamicQrEnabled !== false,
    adsense: {
      client: String(config.public.adsense?.client || ''),
      slots: {
        top: String(config.public.adsense?.slots?.top || ''),
        sidebar: String(config.public.adsense?.slots?.sidebar || ''),
        content: String(config.public.adsense?.slots?.content || ''),
        guide: String(config.public.adsense?.slots?.guide || ''),
        mobile: String(config.public.adsense?.slots?.mobile || ''),
      },
    },
    legal: {
      providerName: '',
      providerAddress: '',
      providerEmail: '',
      providerPhone: '',
      taxNumber: '',
      registryNumber: '',
      hostingProvider: '',
      hostingAddress: '',
    },
    seo: {},
  }
}

function safeJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function pickString(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

function mergeSettings(
  base: PublicSettings,
  rows: SettingsRow[],
  seoRows: SeoRow[],
): PublicSettings {
  const result: PublicSettings = {
    ...base,
    adsense: { client: base.adsense.client, slots: { ...base.adsense.slots } },
    legal: { ...base.legal },
    seo: {},
  }
  for (const row of rows) {
    if (row.key === 'brand') {
      const parsed = safeJson<{ name?: string }>(row.value, {})
      const name = pickString(parsed.name, 80)
      if (name) result.brandName = name
    } else if (row.key === 'adsense') {
      const parsed = safeJson<{ client?: string; slots?: Record<string, string> }>(row.value, {})
      result.adsense.client = pickString(parsed.client, 60)
      result.adsense.slots = {
        top: pickString(parsed.slots?.top, 40),
        sidebar: pickString(parsed.slots?.sidebar, 40),
        content: pickString(parsed.slots?.content, 40),
        guide: pickString(parsed.slots?.guide, 40),
        mobile: pickString(parsed.slots?.mobile, 40),
      }
    } else if (row.key === 'legal') {
      const parsed = safeJson<Record<string, unknown>>(row.value, {})
      result.legal = {
        providerName: pickString(parsed.providerName, 160),
        providerAddress: pickString(parsed.providerAddress, 240),
        providerEmail: pickString(parsed.providerEmail, 190),
        providerPhone: pickString(parsed.providerPhone, 60),
        taxNumber: pickString(parsed.taxNumber, 40),
        registryNumber: pickString(parsed.registryNumber, 40),
        hostingProvider: pickString(parsed.hostingProvider, 160),
        hostingAddress: pickString(parsed.hostingAddress, 240),
      }
    }
  }
  for (const row of seoRows) {
    if (!row.path.startsWith('/') || row.path.length > 120) continue
    const override: SeoOverride = {
      title: pickString(row.title, 70),
      description: pickString(row.description, 180),
      noindex: row.noindex === true,
    }
    if (override.title || override.description || override.noindex) {
      result.seo[row.path] = override
    }
  }
  return result
}

export async function loadPublicSettings(options: { force?: boolean } = {}): Promise<PublicSettings> {
  if (!options.force && cache && cache.expiresAt > Date.now()) return cache.data
  const defaults = runtimeDefaults()
  if (!isDbConfigured()) {
    cache = { data: defaults, expiresAt: Date.now() + CACHE_TTL_MS }
    return defaults
  }
  try {
    const [rows, seoRows] = await withDb(() =>
      getPrisma().$transaction([
        getPrisma().setting.findMany({
          where: { key: { in: ['brand', 'adsense', 'legal'] } },
          select: { key: true, value: true },
        }),
        getPrisma().seoOverride.findMany({
          take: 500,
          select: { path: true, title: true, description: true, noindex: true },
        }),
      ]),
    )
    const data = mergeSettings(defaults, rows, seoRows)
    cache = { data, expiresAt: Date.now() + CACHE_TTL_MS }
    return data
  } catch (error) {
    logger.warn('Public settings could not be loaded from database; using environment defaults', {
      error: error instanceof Error ? { name: error.name, message: error.message } : 'unknown',
    })
    return defaults
  }
}

export function invalidateSettingsCache() {
  cache = null
}

export async function saveBrandAndIntegrations(input: {
  brandName: string
  adsense: PublicSettings['adsense']
  legal: PublicSettings['legal']
}): Promise<void> {
  const entries: [string, unknown][] = [
    ['brand', { name: input.brandName }],
    ['adsense', input.adsense],
    ['legal', input.legal],
  ]
  const prisma = getPrisma()
  await withDb(() =>
    prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          create: { key, value: JSON.stringify(value) },
          update: { value: JSON.stringify(value) },
        }),
      ),
    ),
  )
  invalidateSettingsCache()
}

export async function saveSeoOverride(input: SeoOverride & { path: string }): Promise<void> {
  const prisma = getPrisma()
  if (!input.title && !input.description && !input.noindex) {
    await withDb(() => prisma.seoOverride.deleteMany({ where: { path: input.path } }))
  } else {
    const data = {
      title: input.title,
      description: input.description,
      noindex: input.noindex,
    }
    await withDb(() =>
      prisma.seoOverride.upsert({
        where: { path: input.path },
        create: { path: input.path, ...data },
        update: data,
      }),
    )
  }
  invalidateSettingsCache()
}
