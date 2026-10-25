import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { requireAdmin } from '../../utils/auth'
import { getPrisma, withDb } from '../../utils/db'
import { enforceRateLimit } from '../../utils/rate-limit'

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
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

  const prisma = getPrisma()
  const since = startOfUtcDay(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))

  const [totalQrCodes, activeQrCodes, totals, recent, daily] = await withDb(() =>
    prisma.$transaction([
      prisma.dynamicQrCode.count(),
      prisma.dynamicQrCode.count({ where: { isActive: true } }),
      prisma.dynamicQrCode.aggregate({ _sum: { scans: true } }),
      prisma.dynamicQrScan.aggregate({ where: { day: { gte: since } }, _sum: { scans: true } }),
      prisma.dynamicQrScan.groupBy({
        by: ['day'],
        where: { day: { gte: since } },
        _sum: { scans: true },
        orderBy: { day: 'asc' },
      }),
    ]),
  )

  return apiSuccess(event, {
    totalQrCodes,
    activeQrCodes,
    totalScans: Number(totals._sum.scans || 0),
    scansLast30Days: Number(recent._sum.scans || 0),
    daily: daily.map(point => ({ day: isoDay(point.day), scans: Number(point._sum.scans || 0) })),
  })
})
