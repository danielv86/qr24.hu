import type { H3Event } from 'h3'
import { getHeader } from 'h3'
import type {
  DashboardActivity,
  DashboardSummary,
  DynamicQrCreated,
  DynamicQrListItem,
  QrAnalytics,
  QrAnalyticsBreakdown,
  UserDynamicQrItem,
  UserDynamicQrList,
} from '../types/api'
import { effectiveStatus, type DynamicQrStatus } from './qr-status'
import { getPlanConfig } from './plans'
import { AUDIT_LABELS, isAuditAction } from './audit'
import { ApiProblem } from './api'
import { getAdminSession } from './auth'
import { getPrisma, withDb } from './db'
import { getUserSession } from './user-auth'
import { generateEditToken, generatePublicId, hashToken, safeEqual } from './security'
import { buildRange, startOfUtcDay } from './scan-events'

export interface DynamicQrRow {
  id: bigint
  publicId: string
  targetUrl: string
  title: string | null
  description?: string | null
  category?: string | null
  campaign?: string | null
  status?: string
  expiresAt?: Date | null
  style?: string | null
  ownerId?: bigint | null
  ownerRef: string | null
  editTokenHash: string
  isActive: boolean
  scans: bigint
  createdAt: Date
  updatedAt: Date
  lastScanAt: Date | null
}

const PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-]{6,16}$/

export function isValidPublicId(value: string): boolean {
  return PUBLIC_ID_PATTERN.test(value)
}

function toIso(value: Date | string | null): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function serializeDynamicQr(row: DynamicQrRow, siteUrl: string): DynamicQrListItem {
  return {
    id: Number(row.id),
    shortCode: row.publicId,
    shortUrl: `${siteUrl.replace(/\/$/, '')}/r/${row.publicId}`,
    targetUrl: row.targetUrl,
    title: row.title || null,
    status: effectiveStatus(row),
    isActive: effectiveStatus(row) === 'active',
    scans: Number(row.scans),
    createdAt: toIso(row.createdAt) || new Date().toISOString(),
    updatedAt: toIso(row.updatedAt) || new Date().toISOString(),
    lastScanAt: toIso(row.lastScanAt),
  }
}

export function serializeUserQr(row: DynamicQrRow, siteUrl: string, now: Date = new Date()): UserDynamicQrItem {
  return {
    id: Number(row.id),
    shortCode: row.publicId,
    shortUrl: `${siteUrl.replace(/\/$/, '')}/r/${row.publicId}`,
    name: row.title || null,
    targetUrl: row.targetUrl,
    status: effectiveStatus(row, now),
    category: row.category || null,
    campaign: row.campaign || null,
    description: row.description || null,
    expiresAt: toIso(row.expiresAt ?? null),
    scans: Number(row.scans),
    lastScanAt: toIso(row.lastScanAt),
    createdAt: toIso(row.createdAt) || new Date().toISOString(),
    updatedAt: toIso(row.updatedAt) || new Date().toISOString(),
  }
}

export async function findDynamicQrByPublicId(publicId: string): Promise<DynamicQrRow | null> {
  if (!isValidPublicId(publicId)) return null
  return withDb(() => getPrisma().dynamicQrCode.findUnique({ where: { publicId } }))
}

export async function createDynamicQr(input: {
  targetUrl: string
  title?: string
  description?: string
  category?: string
  campaign?: string
  expiresAt?: Date | null
  style?: string | null
  ownerId?: number | bigint | null
  siteUrl: string
}): Promise<DynamicQrCreated> {
  const editToken = generateEditToken()
  const editTokenHash = hashToken(editToken)
  const title = input.title?.trim() ? input.title.trim().slice(0, 120) : null
  const description = input.description?.trim() ? input.description.trim().slice(0, 500) : null
  const category = input.category?.trim() ? input.category.trim().slice(0, 60) : null
  const campaign = input.campaign?.trim() ? input.campaign.trim().slice(0, 60) : null

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const publicId = generatePublicId()
    try {
      const row = await withDb(() =>
        getPrisma().dynamicQrCode.create({
          data: {
            publicId,
            targetUrl: input.targetUrl,
            title,
            description,
            category,
            campaign,
            status: 'active',
            expiresAt: input.expiresAt ?? null,
            style: input.style ?? null,
            ownerId: input.ownerId ? BigInt(input.ownerId) : null,
            editTokenHash,
            isActive: true,
          },
        }),
      )
      return { ...serializeDynamicQr(row, input.siteUrl), editToken }
    } catch (error) {
      const code = (error as { code?: string }).code
      if ((code === 'P2002' || code === 'ER_DUP_ENTRY') && attempt < 3) continue
      throw error
    }
  }
  throw new ApiProblem(500, 'creation_failed', 'Nem sikerült egyedi azonosítót generálni. Próbáld újra.')
}

export async function updateDynamicQr(
  row: DynamicQrRow,
  changes: {
    targetUrl?: string
    title?: string
    description?: string
    category?: string
    campaign?: string
    expiresAt?: Date | null
    style?: string | null
    isActive?: boolean
    status?: DynamicQrStatus
  },
): Promise<DynamicQrRow> {
  const data: Record<string, unknown> = {}
  if (changes.targetUrl !== undefined) data.targetUrl = changes.targetUrl
  if (changes.title !== undefined) data.title = changes.title.trim().slice(0, 120) || null
  if (changes.description !== undefined) data.description = changes.description.trim().slice(0, 500) || null
  if (changes.category !== undefined) data.category = changes.category.trim().slice(0, 60) || null
  if (changes.campaign !== undefined) data.campaign = changes.campaign.trim().slice(0, 60) || null
  if (changes.expiresAt !== undefined) data.expiresAt = changes.expiresAt
  if (changes.style !== undefined) data.style = changes.style
  if (changes.status !== undefined) {
    data.status = changes.status
    data.isActive = changes.status === 'active'
  }
  if (changes.isActive !== undefined && changes.status === undefined) {
    data.isActive = changes.isActive
    data.status = changes.isActive ? 'active' : 'paused'
  }

  if (Object.keys(data).length === 0) return row

  const updated = await withDb(() =>
    getPrisma().dynamicQrCode.update({ where: { id: row.id }, data }).catch((error: unknown) => {
      if ((error as { code?: string }).code === 'P2025') {
        throw new ApiProblem(404, 'not_found', 'A dinamikus QR-kód nem található.')
      }
      throw error
    }),
  )
  return updated
}

export async function setDynamicQrStatus(row: DynamicQrRow, status: DynamicQrStatus): Promise<DynamicQrRow> {
  return updateDynamicQr(row, { status })
}

export async function deleteDynamicQr(row: DynamicQrRow): Promise<void> {
  await withDb(() => getPrisma().dynamicQrCode.deleteMany({ where: { id: row.id } }))
}

/**
 * Admin munkamenet vagy a létrehozáskor kapott szerkesztői token jogosít.
 * A token soha nem kerül naplózásra.
 */
export async function assertDynamicQrAccess(
  event: H3Event,
  row: DynamicQrRow,
): Promise<'admin' | 'user' | 'owner'> {
  const admin = await getAdminSession(event)
  if (admin) return 'admin'
  const user = await getUserSession(event)
  if (user && row.ownerId && BigInt(user.id) === row.ownerId) return 'user'
  const supplied = getHeader(event, 'x-edit-token') || ''
  if (!supplied || supplied.length > 200 || supplied.length < 20) {
    throw new ApiProblem(401, 'unauthorized', 'A művelethez érvényes szerkesztői token vagy admin bejelentkezés szükséges.')
  }
  if (!safeEqual(hashToken(supplied), row.editTokenHash)) {
    throw new ApiProblem(401, 'unauthorized', 'A szerkesztői token érvénytelen.')
  }
  return 'owner'
}

/** A bejelentkezett felhasználóhoz tartozó QR-kódot ad vissza, tulajdonjog-ellenőrzéssel. */
export async function findOwnedQr(publicId: string, userId: number | bigint): Promise<DynamicQrRow> {
  if (!isValidPublicId(publicId)) {
    throw new ApiProblem(404, 'not_found', 'A dinamikus QR-kód nem található.')
  }
  const row = await withDb(() =>
    getPrisma().dynamicQrCode.findFirst({
      where: { publicId, ownerId: BigInt(userId) },
    }),
  )
  if (!row) {
    // Nem áruljuk el, hogy létezik-e más tulajdonában lévő kód.
    throw new ApiProblem(404, 'not_found', 'A dinamikus QR-kód nem található.')
  }
  return row
}

export interface ListOptions {
  page: number
  perPage: number
  q: string
  status: 'all' | DynamicQrStatus
  category?: string
  sort: 'createdAt' | 'updatedAt' | 'lastScanAt' | 'scans' | 'title'
  dir: 'asc' | 'desc'
}

export async function listUserQrCodes(userId: number | bigint, options: ListOptions): Promise<UserDynamicQrList> {
  const prisma = getPrisma()
  const now = new Date()
  const where: Record<string, unknown> = { ownerId: BigInt(userId) }

  if (options.q) {
    where.OR = [
      { title: { contains: options.q } },
      { targetUrl: { contains: options.q } },
      { publicId: { contains: options.q } },
      { category: { contains: options.q } },
      { campaign: { contains: options.q } },
    ]
  }
  if (options.category) where.category = options.category

  if (options.status === 'active') {
    where.status = 'active'
    where.AND = [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }]
  } else if (options.status === 'expired') {
    where.OR = [
      ...(Array.isArray(where.OR) ? (where.OR as unknown[]) : []),
      { status: 'expired' },
      { status: 'active', expiresAt: { lte: now } },
    ]
  } else if (options.status !== 'all') {
    where.status = options.status
  }

  const skip = (options.page - 1) * options.perPage
  const [rows, total] = await withDb(() =>
    prisma.$transaction([
      prisma.dynamicQrCode.findMany({
        where,
        orderBy: { [options.sort]: options.dir },
        skip,
        take: options.perPage,
      }),
      prisma.dynamicQrCode.count({ where }),
    ]),
  )

  return {
    items: rows.map(row => serializeUserQr(row, getSiteUrl(), now)),
    total,
    page: options.page,
    perPage: options.perPage,
    totalPages: Math.max(1, Math.ceil(total / options.perPage)),
  }
}

function getSiteUrl(): string {
  return String(useRuntimeConfig().public.siteUrl || 'http://localhost:3000').replace(/\/$/, '')
}

export async function assertPlanCapacity(userId: number | bigint, planId: string): Promise<void> {
  const plan = await getPlanConfig(planId)
  const limit = plan.maxDynamicQr
  const used = await withDb(() =>
    getPrisma().dynamicQrCode.count({
      where: { ownerId: BigInt(userId), status: { not: 'archived' } },
    }),
  )
  if (used >= limit) {
    throw new ApiProblem(
      403,
      'plan_limit_reached',
      `A(z) ${plan.label} csomagban legfeljebb ${limit} aktív dinamikus QR-kód lehet.`,
    )
  }
}

export async function getUserAnalytics(
  row: DynamicQrRow,
  options: { days: number; plan: string },
): Promise<QrAnalytics> {
  const plan = await getPlanConfig(options.plan)
  const days = Math.max(1, Math.min(options.days, plan.analyticsDays))
  const { from, to } = buildRange(days)
  const prisma = getPrisma()

  const [events, byDevice, byBrowser, dailyRows] = await withDb(() =>
    prisma.$transaction([
      prisma.scanEvent.findMany({
        where: { qrId: row.id, createdAt: { gte: from, lte: to } },
        select: { device: true, browser: true, isBot: true },
      }),
      prisma.scanEvent.groupBy({
        by: ['device'],
        where: { qrId: row.id, createdAt: { gte: from, lte: to }, isBot: false },
        _count: { _all: true },
      }),
      prisma.scanEvent.groupBy({
        by: ['browser'],
        where: { qrId: row.id, createdAt: { gte: from, lte: to }, isBot: false },
        _count: { _all: true },
      }),
      prisma.dynamicQrScan.findMany({
        where: { qrId: row.id, day: { gte: from, lte: to } },
        orderBy: { day: 'asc' },
      }),
    ]),
  )

  const mapBreakdown = (rows: { _count: { _all: number } }[], key: string): QrAnalyticsBreakdown[] =>
    rows
      .map(row => ({
        label: String((row as unknown as Record<string, string>)[key] || 'Egyéb'),
        count: row._count._all,
      }))
      .sort((a, b) => b.count - a.count)

  const dailyMap = new Map<string, number>()
  for (const item of dailyRows) {
    dailyMap.set(startOfUtcDay(item.day).toISOString().slice(0, 10), item.scans)
  }
  const daily = Array.from({ length: days }, (_, index) => {
    const date = new Date(from.getTime() + index * 24 * 60 * 60 * 1000)
    const key = date.toISOString().slice(0, 10)
    return { day: key, scans: dailyMap.get(key) || 0 }
  })

  const botTotal = events.filter(event => event.isBot).length

  return {
    shortCode: row.publicId,
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    total: events.length,
    humanTotal: events.length - botTotal,
    botTotal,
    lastScanAt: toIso(row.lastScanAt),
    daily,
    devices: mapBreakdown(byDevice, 'device'),
    browsers: mapBreakdown(byBrowser, 'browser'),
  }
}

export async function getDashboardSummary(userId: number | bigint, plan: string): Promise<DashboardSummary> {
  const planDefinition = await getPlanConfig(plan)
  const prisma = getPrisma()
  const ownerId = BigInt(userId)
  const now = new Date()
  const last30 = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)

  const [total, active, paused, archived, aggregate, recentScans, top, activity] = await withDb(() =>
    prisma.$transaction([
      prisma.dynamicQrCode.count({ where: { ownerId } }),
      prisma.dynamicQrCode.count({
        where: { ownerId, status: 'active', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      }),
      prisma.dynamicQrCode.count({ where: { ownerId, status: 'paused' } }),
      prisma.dynamicQrCode.count({ where: { ownerId, status: 'archived' } }),
      prisma.dynamicQrCode.aggregate({ where: { ownerId }, _sum: { scans: true } }),
      prisma.dynamicQrScan.aggregate({
        where: { qr: { ownerId }, day: { gte: startOfUtcDay(last30) } },
        _sum: { scans: true },
      }),
      prisma.dynamicQrCode.findMany({
        where: { ownerId },
        orderBy: { scans: 'desc' },
        take: 5,
        select: { publicId: true, title: true, scans: true },
      }),
      prisma.auditLog.findMany({
        where: { userId: ownerId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          action: true,
          createdAt: true,
          qr: { select: { title: true, publicId: true, targetUrl: true } },
        },
      }),
    ]),
  )

  const recentActivity: DashboardActivity[] = activity.map(item => ({
    id: Number(item.id),
    action: item.action,
    label: isAuditAction(item.action) ? AUDIT_LABELS[item.action] : item.action,
    qrName: item.qr?.title || item.qr?.targetUrl || null,
    shortCode: item.qr?.publicId || null,
    createdAt: item.createdAt.toISOString(),
  }))

  return {
    totalQrCodes: total,
    activeQrCodes: active,
    pausedQrCodes: paused,
    archivedQrCodes: archived,
    totalScans: Number(aggregate._sum.scans || 0),
    scansLast30Days: Number(recentScans._sum.scans || 0),
    plan,
    planLabel: planDefinition.label,
    planLimit: planDefinition.maxDynamicQr,
    topQrCodes: top.map(item => ({
      shortCode: item.publicId,
      name: item.title || null,
      scans: Number(item.scans),
    })),
    recentActivity,
  }
}
