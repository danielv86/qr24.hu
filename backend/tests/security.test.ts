import { describe, expect, it } from 'vitest'
import {
  generateEditToken,
  generatePublicId,
  hashToken,
  isBlockedIp,
  isInternalHostname,
  isObviouslyUnsafeUrl,
  safeEqual,
  validateRedirectTarget,
} from '../server/utils/security'
import { ApiProblem } from '../server/utils/api'

async function expectRejected(promise: Promise<unknown>, code: string) {
  try {
    await promise
    throw new Error('expected rejection')
  } catch (error) {
    expect(error).toBeInstanceOf(ApiProblem)
    expect((error as ApiProblem).statusCode).toBe(422)
    expect((error as ApiProblem).code).toBe(code)
  }
}

describe('private network detection', () => {
  it('blocks loopback, private, link-local and reserved IPv4 ranges', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.4.5', '172.31.255.255', '192.168.0.1', '169.254.1.1', '100.64.0.1', '0.0.0.0', '224.0.0.1', '198.18.0.1']) {
      expect(isBlockedIp(ip), ip).toBe(true)
    }
    expect(isBlockedIp('8.8.8.8')).toBe(false)
    expect(isBlockedIp('93.184.216.34')).toBe(false)
  })

  it('blocks loopback, unique-local and link-local IPv6 addresses', () => {
    for (const ip of ['::1', '::', 'fc00::1', 'fd12::1', 'fe80::1', 'ff02::1', '2001:db8::1']) {
      expect(isBlockedIp(ip), ip).toBe(true)
    }
    expect(isBlockedIp('2606:4700:4700::1111')).toBe(false)
  })

  it('rejects internal hostnames, including bracketed IPv6', () => {
    expect(isInternalHostname('localhost')).toBe(true)
    expect(isInternalHostname('intranet')).toBe(true)
    expect(isInternalHostname('printer.local')).toBe(true)
    expect(isInternalHostname('service.internal')).toBe(true)
    expect(isInternalHostname('[::1]')).toBe(true)
    expect(isInternalHostname('example.com')).toBe(false)
  })

  it('flags unsafe URL objects', () => {
    expect(isObviouslyUnsafeUrl(new URL('http://127.0.0.1/admin'))).toBe(true)
    expect(isObviouslyUnsafeUrl(new URL('https://example.com/ok'))).toBe(false)
    expect(isObviouslyUnsafeUrl(new URL('ftp://example.com/file'))).toBe(true)
  })
})

describe('dynamic redirect target validation', () => {
  const publicResolver = async () => ['93.184.216.34']

  it('accepts a public https URL and normalizes it', async () => {
    const url = await validateRedirectTarget('https://example.com/ajanlat?x=1', { resolver: publicResolver })
    expect(url.toString()).toBe('https://example.com/ajanlat?x=1')
  })

  it('rejects missing schemes, credentials and internal addresses', async () => {
    await expectRejected(validateRedirectTarget('example.com', { resolver: publicResolver }), 'invalid_target')
    await expectRejected(validateRedirectTarget('https://user:pass@example.com/', { resolver: publicResolver }), 'unsafe_target')
    await expectRejected(validateRedirectTarget('http://127.0.0.1/', { resolver: publicResolver }), 'unsafe_target')
    await expectRejected(validateRedirectTarget('http://localhost:8080/', { resolver: publicResolver }), 'unsafe_target')
  })

  it('rejects hostnames that resolve to private addresses', async () => {
    await expectRejected(
      validateRedirectTarget('https://example.com/', { resolver: async () => ['10.0.0.5'] }),
      'unsafe_target',
    )
  })

  it('rejects unresolvable hostnames', async () => {
    await expectRejected(
      validateRedirectTarget('https://does-not-exist.example/', {
        resolver: async () => {
          throw new Error('ENOTFOUND')
        },
      }),
      'unresolvable_target',
    )
  })

  it('rejects URLs longer than the limit', async () => {
    await expectRejected(
      validateRedirectTarget(`https://example.com/${'a'.repeat(2100)}`, { resolver: publicResolver }),
      'invalid_target',
    )
  })
})

describe('random identifiers and hashes', () => {
  it('generates URL-safe, unpredictable public IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generatePublicId()))
    expect(ids.size).toBe(100)
    for (const id of ids) {
      expect(id).toMatch(/^[A-Za-z0-9_-]{12}$/)
    }
  })

  it('generates long edit tokens and stores only their hash', () => {
    const token = generateEditToken()
    const hash = hashToken(token)
    expect(token.length).toBeGreaterThan(30)
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(hash).not.toContain(token)
    expect(safeEqual(hash, hashToken(token))).toBe(true)
    expect(safeEqual(hash, hashToken(`${token}x`))).toBe(false)
  })
})
