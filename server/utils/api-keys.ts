import { randomBytes } from 'node:crypto'
import { getHeader, type H3Event } from 'h3'
import type { ApiKeyCreated, ApiKeyItem } from '#shared/types/api'
import { ApiProblem } from './api'
import { getPrisma, withDb } from './db'
import { getPlanConfig } from './plans'
import { hashToken } from './security'

/** Egy fiókhoz ennyi aktív kulcs tartozhat egyszerre. */
export const API_KEY_LIMIT = 10
const TOKEN_MARKER = 'qrk_live_'

function serializeKey(row: {
  id: bigint | number
  name: string
  prefix: string
  lastUsedAt: Date | null
  revokedAt: Date | null
  createdAt: Date
}): ApiKeyItem {
  return {
    id: Number(row.id),
    name: row.name,
    prefix: row.prefix,
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function listApiKeys(userId: number | bigint): Promise<ApiKeyItem[]> {
  const rows = await withDb(() =>
    getPrisma().apiKey.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  )
  return rows.map(serializeKey)
}

export async function createApiKey(
  userId: number | bigint,
  plan: string,
  name: string,
): Promise<ApiKeyCreated> {
  const planDefinition = await getPlanConfig(plan)
  if (!planDefinition.apiAccess) {
    throw new ApiProblem(
      403,
      'plan_feature_required',
      'Az API-hozzáférés az Üzleti csomag része. Válts csomagot a használatához.',
    )
  }

  const prisma = getPrisma()
  const active = await withDb(() =>
    prisma.apiKey.count({ where: { userId: BigInt(userId), revokedAt: null } }),
  )
  if (active >= API_KEY_LIMIT) {
    throw new ApiProblem(
      403,
      'api_key_limit_reached',
      `Egyszerre legfeljebb ${API_KEY_LIMIT} aktív API-kulcs lehet. Vond vissza a nem használt kulcsot.`,
    )
  }

  const token = `${TOKEN_MARKER}${randomBytes(24).toString('base64url')}`
  const row = await withDb(() =>
    prisma.apiKey.create({
      data: {
        userId: BigInt(userId),
        name: name.trim().slice(0, 80),
        prefix: token.slice(0, 15),
        tokenHash: hashToken(token),
      },
    }),
  )
  return { ...serializeKey(row), token }
}

export async function revokeApiKey(userId: number | bigint, id: number): Promise<void> {
  const result = await withDb(() =>
    getPrisma().apiKey.updateMany({
      where: { id: BigInt(id), userId: BigInt(userId), revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  )
  if (!result.count) {
    throw new ApiProblem(404, 'not_found', 'Az API-kulcs nem található vagy már vissza van vonva.')
  }
}

export interface ApiKeyContext {
  userId: bigint
  keyId: bigint
  plan: string
}

/**
 * Bearer tokenes hitelesítés a nyilvános API-hoz. A kulcs csak hash formában
 * van tárolva, a teljes token soha nem kerül vissza a klienshez.
 */
export async function authenticateApiKey(event: H3Event): Promise<ApiKeyContext> {
  const header = getHeader(event, 'authorization') || ''
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
  const token = (bearer || getHeader(event, 'x-api-key') || '').trim()
  if (!token || token.length < 20 || token.length > 120) {
    throw new ApiProblem(
      401,
      'unauthorized',
      'Hiányzó vagy érvénytelen API-kulcs. Használd az Authorization: Bearer <kulcs> fejlécet.',
    )
  }

  const row = await withDb(() =>
    getPrisma().apiKey.findUnique({
      where: { tokenHash: hashToken(token) },
      select: {
        id: true,
        revokedAt: true,
        user: { select: { id: true, plan: true } },
      },
    }),
  )
  if (!row || row.revokedAt) {
    throw new ApiProblem(401, 'unauthorized', 'Az API-kulcs érvénytelen vagy vissza van vonva.')
  }

  const plan = await getPlanConfig(row.user.plan)
  if (!plan.apiAccess) {
    throw new ApiProblem(403, 'plan_feature_required', 'Az API-hozzáféréshez Üzleti csomag szükséges.')
  }

  // A használat időpontja nem kritikus: hiba esetén sem akadályozhatja a kérést.
  withDb(() => getPrisma().apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })).catch(() => {})

  return { userId: row.user.id, keyId: row.id, plan: row.user.plan }
}
