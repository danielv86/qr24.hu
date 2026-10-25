import {
  createHash,
  createHmac,
  createPublicKey,
  createSign,
  createVerify,
  randomBytes,
  timingSafeEqual,
  type JsonWebKey,
  type KeyObject,
} from 'node:crypto'
import type { H3Event } from 'h3'
import type { OAuthProviderAvailability } from '#shared/types/api'
import { ApiProblem } from './api'
import { getPublicSiteUrl, getSessionSecret } from './config'
import { logger } from './logger'

export type OAuthProvider = 'google' | 'apple'

interface GoogleConfig {
  clientId: string
  clientSecret: string
}

interface AppleConfig {
  clientId: string
  teamId: string
  keyId: string
  privateKey: string
}

function runtimeOAuth(): Record<string, Record<string, string>> {
  const config = useRuntimeConfig()
  return (config.oauth || {}) as unknown as Record<string, Record<string, string>>
}

function googleConfig(): GoogleConfig | null {
  const google = runtimeOAuth().google || {}
  if (!google.clientId || !google.clientSecret) return null
  return { clientId: google.clientId, clientSecret: google.clientSecret }
}

function appleConfig(): AppleConfig | null {
  const apple = runtimeOAuth().apple || {}
  if (!apple.clientId || !apple.teamId || !apple.keyId || !apple.privateKey) return null
  return {
    clientId: apple.clientId,
    teamId: apple.teamId,
    keyId: apple.keyId,
    privateKey: apple.privateKey.replace(/\\n/g, '\n'),
  }
}

export function providerAvailability(): OAuthProviderAvailability {
  return { google: Boolean(googleConfig()), apple: Boolean(appleConfig()) }
}

export function isProviderConfigured(provider: OAuthProvider): boolean {
  return provider === 'google' ? Boolean(googleConfig()) : Boolean(appleConfig())
}

export function parseProvider(value: string | undefined): OAuthProvider {
  if (value === 'google' || value === 'apple') return value
  throw new ApiProblem(404, 'unknown_provider', 'Ismeretlen bejelentkezési szolgáltató.')
}

export function callbackUrl(event: H3Event, provider: OAuthProvider): string {
  return `${getPublicSiteUrl(event)}/api/auth/oauth/${provider}/callback`
}

/** PKCE: S256 kódkihívás a kódellenőrzőből (RFC 7636). */
export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export function randomState(): string {
  return randomBytes(24).toString('base64url')
}

interface StatePayload {
  state: string
  verifier: string
  provider: OAuthProvider
  nonce: string
  createdAt: number
}

const STATE_COOKIE = 'qr_oauth'

function signState(payload: string): string {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url')
}

export function packState(payload: StatePayload): string {
  const raw = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${raw}.${signState(raw)}`
}

export function unpackState(value: string | undefined): StatePayload | null {
  if (!value) return null
  const [raw, signature] = value.split('.')
  if (!raw || !signature) return null
  const expected = signState(raw)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as StatePayload
    if (!parsed.state || !parsed.verifier || !parsed.nonce) return null
    if (Date.now() - parsed.createdAt > 10 * 60 * 1000) return null
    return parsed
  } catch {
    return null
  }
}

export const OAUTH_STATE_COOKIE = STATE_COOKIE

export function buildAuthorizeUrl(
  provider: OAuthProvider,
  input: { redirectUri: string; state: string; challenge: string; nonce: string },
): string {
  if (provider === 'google') {
    const config = googleConfig()
    if (!config) throw new ApiProblem(503, 'oauth_not_configured', 'A Google bejelentkezés nincs beállítva.')
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: input.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: input.state,
      code_challenge: input.challenge,
      code_challenge_method: 'S256',
      nonce: input.nonce,
      prompt: 'select_account',
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  const config = appleConfig()
  if (!config) throw new ApiProblem(503, 'oauth_not_configured', 'Az Apple bejelentkezés nincs beállítva.')
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: input.redirectUri,
    response_type: 'code',
    scope: 'name email',
    response_mode: 'form_post',
    state: input.state,
    nonce: input.nonce,
  })
  return `https://appleid.apple.com/auth/authorize?${params.toString()}`
}

function appleClientSecret(config: AppleConfig): string {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'ES256', kid: config.keyId, typ: 'JWT' }
  const payload = {
    iss: config.teamId,
    iat: now,
    exp: now + 5 * 60,
    aud: 'https://appleid.apple.com',
    sub: config.clientId,
  }
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const signingInput = `${encode(header)}.${encode(payload)}`
  const signer = createSign('SHA256')
  signer.update(signingInput)
  signer.end()
  const signature = signer.sign({ key: config.privateKey, dsaEncoding: 'ieee-p1363' })
  return `${signingInput}.${signature.toString('base64url')}`
}

interface TokenResponse {
  id_token?: string
  access_token?: string
  error?: string
  error_description?: string
}

export async function exchangeCode(
  provider: OAuthProvider,
  input: { code: string; redirectUri: string; verifier: string },
): Promise<string> {
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: input.redirectUri,
    code_verifier: input.verifier,
  })

  let endpoint: string
  if (provider === 'google') {
    const config = googleConfig()
    if (!config) throw new ApiProblem(503, 'oauth_not_configured', 'A Google bejelentkezés nincs beállítva.')
    form.set('client_id', config.clientId)
    form.set('client_secret', config.clientSecret)
    endpoint = 'https://oauth2.googleapis.com/token'
  } else {
    const config = appleConfig()
    if (!config) throw new ApiProblem(503, 'oauth_not_configured', 'Az Apple bejelentkezés nincs beállítva.')
    form.set('client_id', config.clientId)
    form.set('client_secret', appleClientSecret(config))
    endpoint = 'https://appleid.apple.com/auth/token'
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: form.toString(),
    signal: AbortSignal.timeout(8000),
  })
  const data = (await response.json().catch(() => ({}))) as TokenResponse
  if (!response.ok || !data.id_token) {
    logger.warn('OAuth token exchange failed', { provider, status: response.status, error: data.error })
    throw new ApiProblem(502, 'oauth_failed', 'A külső bejelentkezés nem sikerült. Próbáld újra.')
  }
  return data.id_token
}

interface JwtHeader {
  alg?: string
  kid?: string
}

interface JwtPayload {
  iss?: string
  aud?: string | string[]
  exp?: number
  iat?: number
  nonce?: string
  sub?: string
  email?: string
  email_verified?: boolean | string
  name?: string
}

interface Jwk extends JsonWebKey {
  kid?: string
  alg?: string
}

interface JwksCacheEntry {
  keys: Jwk[]
  expiresAt: number
}

const jwksCache = new Map<string, JwksCacheEntry>()

async function fetchJwks(url: string): Promise<Jwk[]> {
  const cached = jwksCache.get(url)
  if (cached && cached.expiresAt > Date.now()) return cached.keys
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw new ApiProblem(502, 'oauth_failed', 'A bejelentkezési kulcsok nem érhetők el.')
  const data = (await response.json()) as { keys?: Jwk[] }
  const keys = Array.isArray(data.keys) ? data.keys : []
  jwksCache.set(url, { keys, expiresAt: Date.now() + 60 * 60 * 1000 })
  return keys
}

function publicKeyFromJwk(jwk: Jwk): KeyObject {
  return createPublicKey({ key: jwk as JsonWebKey, format: 'jwk' })
}

function verifySignature(alg: string, key: KeyObject, signingInput: string, signature: Buffer): boolean {
  try {
    if (alg === 'RS256') {
      const verifier = createVerify('RSA-SHA256')
      verifier.update(signingInput)
      verifier.end()
      return verifier.verify(key, signature)
    }
    if (alg === 'ES256') {
      const verifier = createVerify('SHA256')
      verifier.update(signingInput)
      verifier.end()
      return verifier.verify({ key, dsaEncoding: 'ieee-p1363' }, signature)
    }
    return false
  } catch {
    return false
  }
}

export interface OAuthIdentity {
  provider: OAuthProvider
  providerAccountId: string
  email: string
  emailVerified: boolean
  name: string | null
}

/**
 * Az id_token ellenőrzése a szolgáltató nyilvános kulcsaival: aláírás, kibocsátó,
 * közönség, lejárat és nonce. Csak a tokenben szereplő, hitelesített adatokat
 * használjuk fel a fiók létrehozásához.
 */
export async function verifyIdToken(
  provider: OAuthProvider,
  idToken: string,
  expectedNonce: string,
): Promise<OAuthIdentity> {
  const parts = idToken.split('.')
  if (parts.length !== 3) throw new ApiProblem(401, 'oauth_invalid', 'Érvénytelen bejelentkezési token.')
  const header = JSON.parse(Buffer.from(parts[0]!, 'base64url').toString('utf8')) as JwtHeader
  const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as JwtPayload
  const signature = Buffer.from(parts[2]!, 'base64url')
  const alg = header.alg || ''
  if (!['RS256', 'ES256'].includes(alg) || !header.kid) {
    throw new ApiProblem(401, 'oauth_invalid', 'Nem támogatott bejelentkezési token.')
  }

  const jwksUrl = provider === 'google'
    ? 'https://www.googleapis.com/oauth2/v3/certs'
    : 'https://appleid.apple.com/auth/keys'
  const keys = await fetchJwks(jwksUrl)
  const jwk = keys.find(key => key.kid === header.kid)
  if (!jwk) throw new ApiProblem(401, 'oauth_invalid', 'A bejelentkezési kulcs nem található.')

  const signingInput = `${parts[0]}.${parts[1]}`
  if (!verifySignature(alg, publicKeyFromJwk(jwk), signingInput, signature)) {
    throw new ApiProblem(401, 'oauth_invalid', 'A bejelentkezési token aláírása érvénytelen.')
  }

  const now = Math.floor(Date.now() / 1000)
  const expectedIssuer = provider === 'google'
    ? ['accounts.google.com', 'https://accounts.google.com']
    : ['https://appleid.apple.com']
  if (!payload.iss || !expectedIssuer.includes(payload.iss)) {
    throw new ApiProblem(401, 'oauth_invalid', 'A token kibocsátója nem megfelelő.')
  }
  const config = provider === 'google' ? googleConfig() : appleConfig()
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (!config || !audience.includes(config.clientId)) {
    throw new ApiProblem(401, 'oauth_invalid', 'A token célközönsége nem megfelelő.')
  }
  if (!payload.exp || payload.exp < now - 30) {
    throw new ApiProblem(401, 'oauth_invalid', 'A bejelentkezési token lejárt.')
  }
  if (payload.nonce && payload.nonce !== expectedNonce) {
    throw new ApiProblem(401, 'oauth_invalid', 'A bejelentkezési token nonce értéke nem megfelelő.')
  }
  if (!payload.sub) throw new ApiProblem(401, 'oauth_invalid', 'A token nem tartalmaz felhasználóazonosítót.')
  if (!payload.email) {
    throw new ApiProblem(401, 'oauth_email_missing', 'A szolgáltató nem adott át e-mail-címet. Jelentkezz be e-mail-címmel.')
  }

  return {
    provider,
    providerAccountId: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified === true || payload.email_verified === 'true',
    name: payload.name || null,
  }
}
