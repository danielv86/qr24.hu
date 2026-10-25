import { fileURLToPath } from 'node:url'
import { defineNitroConfig } from 'nitropack/config'

const siteUrl =
  process.env.NUXT_PUBLIC_SITE_URL
  || (process.env.NODE_ENV === 'production' ? 'https://qr24.hu' : 'http://localhost:3000')
const brandName = process.env.NUXT_PUBLIC_BRAND_NAME || 'QR24.hu'

export default defineNitroConfig({
  srcDir: 'server',
  compatibilityDate: '2025-07-15',
  alias: {
    '#shared': fileURLToPath(new URL('../shared', import.meta.url)),
  },
  runtimeConfig: {
    db: {
      host: process.env.NUXT_DB_HOST || '127.0.0.1',
      port: process.env.NUXT_DB_PORT || '3306',
      name: process.env.NUXT_DB_NAME || 'qr24',
      user: process.env.NUXT_DB_USER || 'qr24',
      password: process.env.NUXT_DB_PASSWORD || '',
    },
    sessionSecret: process.env.NUXT_SESSION_SECRET || '',
    hashSecret: process.env.NUXT_HASH_SECRET || '',
    trustProxy: process.env.NUXT_TRUST_PROXY === 'true',
    rateLimit: {
      windowSeconds: 60,
      maxRequests: 30,
      loginWindowSeconds: 900,
      loginMaxAttempts: 8,
    },
    oauth: {
      google: {
        clientId: process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET || '',
      },
      apple: {
        clientId: process.env.NUXT_OAUTH_APPLE_CLIENT_ID || '',
        teamId: process.env.NUXT_OAUTH_APPLE_TEAM_ID || '',
        keyId: process.env.NUXT_OAUTH_APPLE_KEY_ID || '',
        privateKey: process.env.NUXT_OAUTH_APPLE_PRIVATE_KEY || '',
      },
    },
    public: {
      siteUrl,
      brandName,
      dynamicQrEnabled: process.env.NUXT_PUBLIC_DYNAMIC_QR_ENABLED !== 'false',
      adsense: {
        client: process.env.NUXT_PUBLIC_ADSENSE_CLIENT || '',
        slots: {
          top: process.env.NUXT_PUBLIC_ADSENSE_SLOT_TOP || '',
          sidebar: process.env.NUXT_PUBLIC_ADSENSE_SLOT_SIDEBAR || '',
          content: process.env.NUXT_PUBLIC_ADSENSE_SLOT_CONTENT || '',
          guide: process.env.NUXT_PUBLIC_ADSENSE_SLOT_GUIDE || '',
          mobile: process.env.NUXT_PUBLIC_ADSENSE_SLOT_MOBILE || '',
        },
      },
    },
  },
  routeRules: {
    '/api/**': { headers: { 'Cache-Control': 'no-store' } },
    '/r/**': { headers: { 'Cache-Control': 'no-store' } },
    '/api/__sitemap__/**': { headers: { 'Cache-Control': 'public, max-age=3600' } },
  },
  typescript: {
    strict: true,
  },
})
