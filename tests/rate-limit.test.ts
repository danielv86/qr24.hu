import { describe, expect, it } from 'vitest'
import { MemoryRateLimiter } from '../server/utils/rate-limit'

describe('memory rate limiter', () => {
  it('allows requests up to the limit, then blocks', () => {
    let now = 1_000_000
    const limiter = new MemoryRateLimiter(() => now)
    for (let index = 0; index < 3; index += 1) {
      const result = limiter.consume('ip-1', 3, 60)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2 - index)
    }
    const blocked = limiter.consume('ip-1', 3, 60)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  it('resets after the window expires', () => {
    let now = 1_000_000
    const limiter = new MemoryRateLimiter(() => now)
    limiter.consume('ip-1', 1, 60)
    expect(limiter.consume('ip-1', 1, 60).allowed).toBe(false)
    now += 60_001
    const reset = limiter.consume('ip-1', 1, 60)
    expect(reset.allowed).toBe(true)
    expect(reset.remaining).toBe(0)
  })

  it('keeps separate counters per identifier', () => {
    const limiter = new MemoryRateLimiter(() => 1_000_000)
    expect(limiter.consume('a', 1, 60).allowed).toBe(true)
    expect(limiter.consume('a', 1, 60).allowed).toBe(false)
    expect(limiter.consume('b', 1, 60).allowed).toBe(true)
  })

  it('can be cleared', () => {
    const limiter = new MemoryRateLimiter(() => 1_000_000)
    limiter.consume('a', 1, 60)
    limiter.clear()
    expect(limiter.consume('a', 1, 60).allowed).toBe(true)
  })
})
