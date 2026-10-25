import { setResponseHeader } from 'h3'
import type { AdminQrListItem } from '#shared/types/api'
import { apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { requireAdmin } from '../../utils/auth'
import { getPrisma, withDb } from '../../utils/db'
import type { DynamicQrRow } from '../../utils/dynamic-qr'
import { serializeDynamicQr } from '../../utils/dynamic-qr'
import { getPublicSiteUrl } from '../../utils/config'
import { enforceRateLimit } from '../../utils/rate-limit'
import { listQuerySchema, parseQuery } from '../../utils/validation'
import type { Prisma } from '../../generated/prisma/client'

export default defineApiHandler(async (event) => {
  await enforceRateLimit(event, {
    bucket: 'admin-read',
    key: getClientIp(event),
    limit: 120,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')
  await requireAdmin(event)

  const query = parseQuery(event, listQuerySchema)
  const where: Prisma.DynamicQrCodeWhereInput = {}
  if (query.q) {
    where.OR = [
      { title: { contains: query.q } },
      { publicId: { contains: query.q } },
      { targetUrl: { contains: query.q } },
    ]
  }
  if (query.status === 'active') where.isActive = true
  if (query.status === 'inactive') where.isActive = false

  const prisma = getPrisma()
  const [total, rows] = await withDb(() =>
    prisma.$transaction([
      prisma.dynamicQrCode.count({ where }),
      prisma.dynamicQrCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
    ]),
  )

  const siteUrl = getPublicSiteUrl(event)
  const items: AdminQrListItem[] = (rows as DynamicQrRow[]).map(row => ({
    ...serializeDynamicQr(row, siteUrl),
    ownerRef: row.ownerRef,
  }))

  return apiSuccess(event, {
    items,
    pagination: {
      page: query.page,
      perPage: query.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.perPage)),
    },
  })
})
