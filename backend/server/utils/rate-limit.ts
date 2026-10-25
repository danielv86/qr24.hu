import { setResponseHeader, type H3Event } from 'h3'
import { ApiProblem } from './api'
import { getPrisma, isDbConfigured, withDb } from './db'
import { logger } from './logger'
import { hashIdentifier } from './security'

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfter: number
}

interface MemoryEntry {
  count: number
  resetAt: number
}

export class MemoryRateLimiter {
  private entries = new Map<string, MemoryEntry>()

  constructor(private readonly now: () => number = () => Date.now()) {}

  consume(key: string, limit: number, windowSeconds: number): RateLimitResult {
    const now = this.now()
    const windowMs = windowSeconds * 1000
    const existing = this.entries.get(key)
    let entry: MemoryEntry
    if (!existing || existing.resetAt <= now) {
      entry = { count: 1, resetAt: now + windowMs }
      this.entries.set(key, entry)
    } else {
      entry = existing
      entry.count += 1
    }
    if (this.entries.size > 20_000) this.cleanup(now)
    return this.result(entry, limit, now)
  }

  private result(entry: MemoryEntry, limit: number, now: number): RateLimitResult {
    const remaining = Math.max(0, limit - entry.count)
    const resetAt = Math.ceil(entry.resetAt / 1000)
    return {
      allowed: entry.count <= limit,
      limit,
      remaining,
      resetAt,
      retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    }
  }

  private cleanup(now: number) {
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key)
    }
  }

  clear() {
    this.entries.clear()
  }
}

const memoryLimiter = new MemoryRateLimiter()

async function consumeDb(
  keyHash: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult | null> {
  if (!isDbConfigured()) return null
  const windowMs = windowSeconds * 1000
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs
  const windowStartBig = BigInt(windowStart)
  try {
    const prisma = getPrisma()
    const row = await withDb(() =>
      prisma.$transaction(async (tx) => {
        const incremented = await tx.rateLimit.updateMany({
          where: { keyHash, windowStart: windowStartBig },
          data: { hits: { increment: 1 } },
        })
        if (incremented.count === 0) {
          await tx.rateLimit.upsert({
            where: { keyHash },
            create: { keyHash, windowStart: windowStartBig, hits: 1 },
            update: { windowStart: windowStartBig, hits: 1 },
          })
        }
        return tx.rateLimit.findUnique({ where: { keyHash }, select: { hits: true, windowStart: true } })
      }),
    )
    if (!row) return null
    const storedWindowStart = Number(row.windowStart)
    const hits = Number(row.hits)
    const resetAt = Math.ceil((storedWindowStart + windowMs) / 1000)
    const retryAfter = Math.max(1, Math.ceil((storedWindowStart + windowMs - Date.now()) / 1000))
    return {
      allowed: hits <= limit,
      limit,
      remaining: Math.max(0, limit - hits),
      resetAt,
      retryAfter,
    }
  } catch (error) {
    logger.warn('Database rate limiter unavailable, using memory fallback', {
      error: error instanceof Error ? { name: error.name, message: error.message } : 'unknown',
    })
    return null
  }
}

interface EnforceOptions {
  bucket: string
  key: string
  limit: number
  windowSeconds: number
  message?: string
}

export async function enforceRateLimit(event: H3Event, options: EnforceOptions): Promise<RateLimitResult> {
  const identifier = hashIdentifier(`${options.bucket}:${options.key}`)
  const result = (await consumeDb(identifier, options.limit, options.windowSeconds))
    || memoryLimiter.consume(identifier, options.limit, options.windowSeconds)

  setResponseHeader(event, 'X-RateLimit-Limit', String(result.limit))
  setResponseHeader(event, 'X-RateLimit-Remaining', String(result.remaining))
  setResponseHeader(event, 'X-RateLimit-Reset', String(result.resetAt))

  if (!result.allowed) {
    throw new ApiProblem(
      429,
      'rate_limited',
      options.message || 'Túl sok kérés érkezett. Kérjük, várj egy kicsit, majd próbáld újra.',
      { retryAfter: result.retryAfter },
    )
  }
  return result
}
