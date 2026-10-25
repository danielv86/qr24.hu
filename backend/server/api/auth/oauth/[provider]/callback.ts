import {
  deleteCookie,
  getCookie,
  getQuery,
  getRouterParam,
  readBody,
  sendRedirect,
  setResponseHeader,
  type H3Event,
} from 'h3'
import { defineApiHandler, getClientIp } from '../../../../utils/api'
import { writeAudit } from '../../../../utils/audit'
import { logger } from '../../../../utils/logger'
import {
  OAUTH_STATE_COOKIE,
  callbackUrl,
  exchangeCode,
  isProviderConfigured,
  parseProvider,
  unpackState,
  verifyIdToken,
} from '../../../../utils/oauth'
import { enforceRateLimit } from '../../../../utils/rate-limit'
import { createUserSession, findOrCreateOAuthUser } from '../../../../utils/user-auth'

async function readParams(event: H3Event): Promise<{ code: string; state: string }> {
  if (event.method.toUpperCase() === 'GET') {
    const query = getQuery(event)
    return {
      code: typeof query.code === 'string' ? query.code : '',
      state: typeof query.state === 'string' ? query.state : '',
    }
  }
  let body: unknown
  try {
    body = await readBody(event)
  } catch {
    body = null
  }
  if (typeof body === 'string') {
    const form = new URLSearchParams(body)
    return { code: form.get('code') || '', state: form.get('state') || '' }
  }
  const record = (body || {}) as Record<string, unknown>
  return {
    code: typeof record.code === 'string' ? record.code : '',
    state: typeof record.state === 'string' ? record.state : '',
  }
}

export default defineApiHandler(async (event) => {
  await enforceRateLimit(event, {
    bucket: 'oauth-callback',
    key: getClientIp(event),
    limit: 40,
    windowSeconds: 10 * 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const provider = parseProvider(getRouterParam(event, 'provider'))
  if (!isProviderConfigured(provider)) {
    return sendRedirect(event, '/belepes?error=oauth_not_configured', 302)
  }

  const params = await readParams(event)
  const packed = getCookie(event, OAUTH_STATE_COOKIE)
  const stored = unpackState(packed)
  deleteCookie(event, OAUTH_STATE_COOKIE, { path: '/api/auth/oauth' })

  if (!stored || stored.provider !== provider || !params.code || stored.state !== params.state) {
    logger.warn('OAuth state mismatch', { provider })
    return sendRedirect(event, '/belepes?error=oauth_state', 302)
  }

  try {
    const idToken = await exchangeCode(provider, {
      code: params.code,
      redirectUri: callbackUrl(event, provider),
      verifier: stored.verifier,
    })
    const identity = await verifyIdToken(provider, idToken, stored.nonce)
    const { userId } = await findOrCreateOAuthUser({
      provider,
      providerAccountId: identity.providerAccountId,
      email: identity.email,
      name: identity.name,
    })
    await createUserSession(event, userId)
    await writeAudit({ action: 'user.oauth_login', userId, details: { provider } })
    return sendRedirect(event, '/fiok', 302)
  } catch (error) {
    logger.warn('OAuth login failed', {
      provider,
      error: error instanceof Error ? { name: error.name, message: error.message } : 'unknown',
    })
    return sendRedirect(event, '/belepes?error=oauth_failed', 302)
  }
})
