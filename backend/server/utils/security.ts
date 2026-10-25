import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { ApiProblem } from './api'

const MAX_URL_LENGTH = 2048
const INTERNAL_HOST_SUFFIXES = ['.local', '.localhost', '.internal', '.home.arpa', '.test', '.invalid']

function parseIpv4(ip: string): number[] | null {
  if (isIP(ip) !== 4) return null
  return ip.split('.').map(part => Number(part))
}

function isBlockedIpv4(ip: string): boolean {
  const parts = parseIpv4(ip)
  if (!parts) return false
  const [a, b, c] = parts as [number, number, number, number]
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true
  if (a === 198 && (b === 18 || b === 19)) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a === 203 && b === 0 && c === 113) return true
  if (a >= 224) return true
  return false
}

function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase().split('%')[0] || ''
  if (normalized === '::' || normalized === '::1') return true
  if (/^fe[89ab]/.test(normalized)) return true
  if (/^fe[cdef]/.test(normalized)) return true
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true
  if (normalized.startsWith('ff')) return true
  if (normalized.startsWith('2001:db8')) return true
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped && isBlockedIpv4(mapped[1]!)) return true
  return false
}

export function isBlockedIp(ip: string): boolean {
  const version = isIP(ip)
  if (version === 4) return isBlockedIpv4(ip)
  if (version === 6) return isBlockedIpv6(ip)
  return false
}

export function isInternalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '')
  if (!host) return true
  if (host === 'localhost' || host.endsWith('.localhost')) return true
  if (INTERNAL_HOST_SUFFIXES.some(suffix => host.endsWith(suffix))) return true
  if (isIP(host)) return isBlockedIp(host)
  if (!host.includes('.')) return true
  return false
}

export function isObviouslyUnsafeUrl(url: URL): boolean {
  if (!['http:', 'https:'].includes(url.protocol)) return true
  if (!url.hostname) return true
  if (url.username || url.password) return true
  return isInternalHostname(url.hostname)
}

export type DnsResolver = (hostname: string) => Promise<string[]>

const defaultResolver: DnsResolver = async (hostname) => {
  const records = await lookup(hostname, { all: true, verbatim: true })
  return records.map(record => record.address)
}

interface ValidateOptions {
  resolver?: DnsResolver
  skipDns?: boolean
}

/**
 * Dinamikus átirányítási cél validálása. Csak nyilvános http(s) URL-t fogad el,
 * és a hosztnevet DNS-sel is ellenőrzi, hogy belső hálózatra ne mutasson.
 */
export async function validateRedirectTarget(raw: string, options: ValidateOptions = {}): Promise<URL> {
  const value = raw.trim()
  if (!value) {
    throw new ApiProblem(422, 'invalid_target', 'Add meg a cél-URL-t.')
  }
  if (value.length > MAX_URL_LENGTH) {
    throw new ApiProblem(422, 'invalid_target', `A cél-URL legfeljebb ${MAX_URL_LENGTH} karakter lehet.`)
  }
  if (!/^https?:\/\//i.test(value)) {
    throw new ApiProblem(422, 'invalid_target', 'A cél-URL-nek http:// vagy https:// címmel kell kezdődnie.')
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new ApiProblem(422, 'invalid_target', 'Érvénytelen cél-URL.')
  }
  if (isObviouslyUnsafeUrl(url)) {
    throw new ApiProblem(
      422,
      'unsafe_target',
      'A cél-URL nem mutathat helyi, belső vagy nem nyilvános hálózatra.',
    )
  }
  if (options.skipDns) return url

  const resolver = options.resolver || defaultResolver
  let addresses: string[]
  try {
    addresses = await Promise.race([
      resolver(url.hostname),
      new Promise<string[]>((_, reject) => setTimeout(() => reject(new Error('dns_timeout')), 3000)),
    ])
  } catch {
    throw new ApiProblem(422, 'unresolvable_target', 'A cél-URL hosztneve nem oldható fel.')
  }
  if (!addresses.length) {
    throw new ApiProblem(422, 'unresolvable_target', 'A cél-URL hosztneve nem oldható fel.')
  }
  if (addresses.some(address => isBlockedIp(address))) {
    throw new ApiProblem(
      422,
      'unsafe_target',
      'A cél-URL belső hálózati címre mutat, ezért biztonsági okból nem engedélyezett.',
    )
  }
  return url
}

/** Rövid, URL-biztos és nehezen kitalálható nyilvános azonosító (72 bit). */
export function generatePublicId(): string {
  return randomBytes(9).toString('base64url')
}

export function generateEditToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function hashIdentifier(value: string): string {
  let secret = ''
  try {
    const config = useRuntimeConfig()
    secret = String(config.hashSecret || config.sessionSecret || '')
  } catch {
    secret = ''
  }
  if (secret.length >= 32) {
    return createHmac('sha256', secret).update(value).digest('hex')
  }
  return createHash('sha256').update(value).digest('hex')
}

export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a)
  const bufferB = Buffer.from(b)
  if (bufferA.length !== bufferB.length) return false
  return timingSafeEqual(bufferA, bufferB)
}
