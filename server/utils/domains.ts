import { randomBytes } from 'node:crypto'
import { resolveTxt } from 'node:dns/promises'
import type { CustomDomainItem } from '#shared/types/api'
import { ApiProblem } from './api'
import { getPrisma, withDb } from './db'
import { getPlanConfig } from './plans'


const HOST_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?:\.[a-z0-9-]{1,63})+$/
const RESERVED_SUFFIXES = ['qrkod24.hu', 'qr24.hu', 'localhost']

/** A DNS TXT rekord neve, amivel a domain tulajdonjoga igazolható. */
export function verificationRecordName(host: string): string {
  return `_qrkod24.${host}`
}

export function verificationRecordValue(token: string): string {
  return `qrkod24-verify=${token}`
}

function siteHost(): string {
  try {
    return new URL(String(useRuntimeConfig().public.siteUrl || 'http://localhost:3000')).hostname.toLowerCase()
  } catch {
    return 'qrkod24.hu'
  }
}

function normalizeHost(raw: string): string {
  let value = String(raw || '').trim().toLowerCase()
  if (!value) throw new ApiProblem(422, 'invalid_domain', 'Add meg a domaint.')

  // A felületre bemásolt teljes címből is elfogadjuk a hosztot.
  if (/^[a-z]+:\/\//.test(value)) {
    try {
      value = new URL(value).hostname
    } catch {
      throw new ApiProblem(422, 'invalid_domain', 'Érvénytelen domain.')
    }
  }
  value = value.replace(/\/.*$/, '').replace(/\.$/, '')
  if (value.startsWith('www.')) value = value.slice(4)
  if (value.includes(':')) value = value.split(':')[0] || ''
  if (value.includes('@') || value.includes('/') || value.includes(' ')) {
    throw new ApiProblem(422, 'invalid_domain', 'Csak a domain nevet add meg, elérési út nélkül.')
  }
  if (value.length < 4 || value.length > 190 || !HOST_PATTERN.test(value)) {
    throw new ApiProblem(422, 'invalid_domain', 'Érvénytelen domain. Példa: go.sajatbrand.hu')
  }
  const host = siteHost()
  if (value === host || value.endsWith(`.${host}`)) {
    throw new ApiProblem(422, 'invalid_domain', 'Ez a domain a szolgáltatás saját címe, nem rendelhető hozzá.')
  }
  if (RESERVED_SUFFIXES.some(suffix => value === suffix || value.endsWith(`.${suffix}`))) {
    throw new ApiProblem(422, 'invalid_domain', 'Ez a domain nem használható saját domainként.')
  }
  return value
}

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

export function serializeDomain(row: {
  id: bigint | number
  host: string
  verificationToken: string
  verifiedAt: Date | null
  lastCheckedAt: Date | null
  createdAt: Date
}): CustomDomainItem {
  return {
    id: Number(row.id),
    host: row.host,
    status: row.verifiedAt ? 'verified' : 'pending',
    verificationName: verificationRecordName(row.host),
    verificationValue: verificationRecordValue(row.verificationToken),
    shortUrlBase: `https://${row.host}/go/`,
    verifiedAt: toIso(row.verifiedAt),
    lastCheckedAt: toIso(row.lastCheckedAt),
    createdAt: row.createdAt.toISOString(),
  }
}

export async function listDomains(userId: number | bigint): Promise<CustomDomainItem[]> {
  const rows = await withDb(() =>
    getPrisma().customDomain.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: 'desc' },
    }),
  )
  return rows.map(serializeDomain)
}

export async function addDomain(
  userId: number | bigint,
  plan: string,
  rawHost: string,
): Promise<CustomDomainItem> {
  const planDefinition = await getPlanConfig(plan)
  if (!planDefinition.customDomain || planDefinition.domainLimit <= 0) {
    throw new ApiProblem(
      403,
      'plan_feature_required',
      'A saját domain az Üzleti csomag része. Válts csomagot a használatához.',
    )
  }

  const host = normalizeHost(rawHost)
  const prisma = getPrisma()
  const limit = planDefinition.domainLimit
  const count = await withDb(() => prisma.customDomain.count({ where: { userId: BigInt(userId) } }))
  if (count >= limit) {
    throw new ApiProblem(
      403,
      'domain_limit_reached',
      `A(z) ${planDefinition.label} csomagban legfeljebb ${limit} saját domain rendelhető.`,
    )
  }

  const existing = await withDb(() => prisma.customDomain.findUnique({ where: { host } }))
  if (existing) {
    throw new ApiProblem(409, 'domain_taken', 'Ez a domain már hozzá van rendelve egy fiókhoz.')
  }

  const row = await withDb(() =>
    prisma.customDomain.create({
      data: {
        userId: BigInt(userId),
        host,
        verificationToken: randomBytes(16).toString('hex'),
      },
    }),
  )
  return serializeDomain(row)
}

export async function removeDomain(userId: number | bigint, id: number): Promise<void> {
  const result = await withDb(() =>
    getPrisma().customDomain.deleteMany({ where: { id: BigInt(id), userId: BigInt(userId) } }),
  )
  if (!result.count) {
    throw new ApiProblem(404, 'not_found', 'A domain nem található.')
  }
}

/**
 * A domain tulajdonjogát egy TXT rekord igazolja. A bejegyzésre a szolgáltatás
 * saját domainje alatt keressük, így a domain DNS-ét nem kell átadni.
 */
export async function verifyDomain(userId: number | bigint, id: number): Promise<CustomDomainItem> {
  const prisma = getPrisma()
  const row = await withDb(() =>
    prisma.customDomain.findFirst({ where: { id: BigInt(id), userId: BigInt(userId) } }),
  )
  if (!row) {
    throw new ApiProblem(404, 'not_found', 'A domain nem található.')
  }

  const name = verificationRecordName(row.host)
  const expected = verificationRecordValue(row.verificationToken)
  let records: string[][] = []
  try {
    records = await Promise.race([
      resolveTxt(name),
      new Promise<string[][]>((_, reject) => setTimeout(() => reject(new Error('dns_timeout')), 4000)),
    ])
  } catch {
    await withDb(() => prisma.customDomain.update({ where: { id: row.id }, data: { lastCheckedAt: new Date() } }))
    throw new ApiProblem(
      422,
      'verification_pending',
      `A(z) ${name} TXT rekord még nem érhető el. A DNS módosítása akár néhány órát is igénybe vehet.`,
    )
  }

  const found = records.some(chunks => chunks.join('').trim() === expected)
  if (!found) {
    await withDb(() => prisma.customDomain.update({ where: { id: row.id }, data: { lastCheckedAt: new Date() } }))
    throw new ApiProblem(
      422,
      'verification_failed',
      `A TXT rekord értéke nem egyezik. Várt érték: ${expected}`,
    )
  }

  const updated = await withDb(() =>
    prisma.customDomain.update({
      where: { id: row.id },
      data: { verifiedAt: row.verifiedAt ?? new Date(), lastCheckedAt: new Date() },
    }),
  )
  return serializeDomain(updated)
}
