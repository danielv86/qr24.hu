import { getRouterParam, sendRedirect, setCookie, setResponseHeader } from 'h3'
import { defineApiHandler, getClientIp } from '../../../utils/api'
import { enforceRateLimit } from '../../../utils/rate-limit'
import {
  OAUTH_STATE_COOKIE,
  buildAuthorizeUrl,
  callbackUrl,
  createPkcePair,
  isProviderConfigured,
  packState,
  parseProvider,
  randomState,
} from '../../../utils/oauth'
import { getPublicSiteUrl } from '../../../utils/config'

export default defineApiHandler(async (event) => {
  await enforceRateLimit(event, {
    bucket: 'oauth-start',
    key: getClientIp(event),
    limit: 30,
    windowSeconds: 10 * 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const provider = parseProvider(getRouterParam(event, 'provider'))
  if (!isProviderConfigured(provider)) {
    return sendRedirect(event, '/belepes?error=oauth_not_configured', 302)
  }

  const { verifier, challenge } = createPkcePair()
  const state = randomState()
  const nonce = randomState()
  const redirectUri = callbackUrl(event, provider)

  setCookie(event, OAUTH_STATE_COOKIE, packState({
    state,
    verifier,
    provider,
    nonce,
    createdAt: Date.now(),
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && getPublicSiteUrl(event).startsWith('https://'),
    sameSite: 'lax',
    path: '/api/auth/oauth',
    maxAge: 10 * 60,
  })

  return sendRedirect(event, buildAuthorizeUrl(provider, { redirectUri, state, challenge, nonce }), 302)
})
