import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../generated/prisma/client'
import { ApiProblem } from './api'
import { logger } from './logger'

interface DbConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
}

interface PrismaCache {
  client: PrismaClient | null
  signature: string
}

// A Nitro HMR újratölti a modulokat, ezért a klienst a globális objektumon cache-eljük.
const globalCache = globalThis as typeof globalThis & { __qrPrisma?: PrismaCache }
const cache: PrismaCache = (globalCache.__qrPrisma ??= { client: null, signature: '' })

function readDbConfig(): DbConfig | null {
  const runtime = useRuntimeConfig()
  const db = runtime.db as Record<string, string | undefined>
  const host = String(db.host || '').trim()
  const database = String(db.name || '').trim()
  const user = String(db.user || '').trim()
  const password = String(db.password || '')
  const port = Number(db.port || 3306)
  if (!host || !database || !user || !Number.isInteger(port) || port <= 0 || port > 65535) {
    return null
  }
  return { host, port, database, user, password }
}

export function isDbConfigured(): boolean {
  return readDbConfig() !== null
}

export function getPrisma(): PrismaClient {
  const config = readDbConfig()
  if (!config) {
    throw new ApiProblem(
      503,
      'database_not_configured',
      'Az adatbázis nincs beállítva. A dinamikus QR-kódok és az adminisztráció ezért nem elérhetők.',
    )
  }
  const signature = `${config.host}:${config.port}/${config.database}/${config.user}`
  if (!cache.client || cache.signature !== signature) {
    const adapter = new PrismaMariaDb({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionLimit: 8,
      connectTimeout: 5000,
      charset: 'utf8mb4',
      timezone: 'Z',
    })
    cache.client = new PrismaClient({ adapter })
    cache.signature = signature
    logger.info('Prisma client created', { host: config.host, port: config.port, database: config.database })
  }
  return cache.client
}

const CONNECTION_ERROR_CODES = [
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'PROTOCOL_CONNECTION_LOST',
  'ER_ACCESS_DENIED_ERROR',
  'ENOTFOUND',
  'ER_BAD_DB_ERROR',
  'P1000',
  'P1001',
  'P1002',
  'P1003',
  'P1017',
]

// A MariaDB adapter egyes esetekben kód nélkül, csak az eredeti driver
// üzenetével dobja tovább a hibát, ezért üzenetre is ellenőrzünk.
const CONNECTION_ERROR_MESSAGE =
  /ER_ACCESS_DENIED_ERROR|ER_BAD_DB_ERROR|ECONNREFUSED|ETIMEDOUT|P100[0-3]|Access denied for user|Unknown database/i

function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const { code, errorCode } = error as Error & { code?: string; errorCode?: string }
  if ([code, errorCode].some(value => value && CONNECTION_ERROR_CODES.includes(value))) return true
  return CONNECTION_ERROR_MESSAGE.test(error.message || '')
}

/**
 * Egységes hibaátalakítás a Prisma hibákból API-válasszá, hogy a végpontok
 * ne szivárogtassanak adatbázis-részleteket a kliens felé.
 */
export async function withDb<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof ApiProblem) throw error
    if (isConnectionError(error)) {
      logger.error('Database operation failed', {
        errorName: error instanceof Error ? error.name : 'unknown',
      })
      throw new ApiProblem(503, 'database_unavailable', 'Az adatbázis átmenetileg nem elérhető. Próbáld újra később.')
    }
    throw error
  }
}

export async function pingDb(): Promise<boolean> {
  if (!isDbConfigured()) return false
  try {
    await Promise.race([
      getPrisma().$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
    ])
    return true
  } catch {
    return false
  }
}
