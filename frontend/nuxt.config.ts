// https://nuxt.com/docs/api/configuration/nuxt-config
// Éles buildben a termelési domain az alapértelmezett, hogy a kanonikus URL-ek,
// a sitemap és a dinamikus rövid linkek ne essenek vissza localhostra.
const siteUrl =
  process.env.NUXT_PUBLIC_SITE_URL
  || (process.env.NODE_ENV === 'production' ? 'https://qr24.hu' : 'http://localhost:3000')
// A külön futó Nitro backend címe. A böngésző továbbra is ugyanazon az
// originon hívja a /api és /r útvonalakat, a Nuxt proxyn keresztül.
const backendUrl = (process.env.NUXT_BACKEND_URL || 'http://127.0.0.1:3001').replace(/\/$/, '')

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/icon',
    '@nuxtjs/i18n',
    '@nuxtjs/seo',
  ],

  css: ['~/assets/css/main.css'],

  i18n: {
    restructureDir: 'i18n',
    langDir: 'locales',
    defaultLocale: 'hu',
    // A magyar tartalom a fő nyelv; a nyelvválasztó a felületet váltja, az URL-ek
    // változatlanok maradnak. Nyelvenkénti URL-ek (hreflang) akkor lesznek, ha a
    // teljes tartalom lefordult.
    strategy: 'no_prefix',
    locales: [
      { code: 'hu', language: 'hu-HU', file: 'hu.json', name: 'Magyar', flag: 'hu' },
      { code: 'en', language: 'en-US', file: 'en.json', name: 'English', flag: 'gb' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'qr24_locale',
      fallbackLocale: 'hu',
    },
  },

  site: {
    url: siteUrl,
    name: 'QR24.hu',
    description:
      'Ingyenes QR-kód generátor magyarul. Készíts testreszabható QR-kódot weboldalhoz, Wi-Fi-hez, névjegyhez, e-mailhez és még sok máshoz, regisztráció nélkül.',
    defaultLocale: 'hu',
    indexable: true,
  },

  app: {
    head: {
      // A useContentSeo már hozzáfűzi a márkanevet, ezért nem duplázzuk.
      titleTemplate: '%s',
      meta: [
        { name: 'theme-color', content: '#2563eb' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
      script: [
        {
          key: 'theme-init',
          tagPosition: 'head',
          innerHTML:
            "(function(){try{var m=localStorage.getItem('qr-theme')||'system';var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.dataset.theme=m}catch(e){}})()",
        },
      ],
    },
  },

  runtimeConfig: {
    // A backend címe csak szerveroldalon kell; a titkok a backend .env-jében élnek.
    backendUrl,
    public: {
      siteUrl,
      brandName: process.env.NUXT_PUBLIC_BRAND_NAME || 'QR24.hu',
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

  icon: {
    serverBundle: { collections: ['lucide'] },
    clientBundle: {
      scan: true,
      sizeLimitKb: 256,
    },
  },

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    viewer: false,
  },

  sitemap: {
    sources: ['/api/__sitemap__/urls'],
    exclude: ['/admin/**', '/api/**', '/r/**', '/koszonjuk'],
    defaults: { changefreq: 'monthly', priority: 0.6 },
  },

  robots: {
    disallow: ['/admin', '/admin/', '/api/', '/r/'],
    allow: ['/', '/api/__sitemap__/urls'],
  },

  ogImage: { enabled: false },

  schemaOrg: {
    identity: 'Organization',
  },

  routeRules: {
    // A típusonkénti aloldalak új, SEO-barát címére irányítunk (301).
    '/url-qr-kod': { redirect: { to: '/url-qr-kod-generator', statusCode: 301 } },
    '/szoveg-qr-kod': { redirect: { to: '/szoveg-qr-kod-generator', statusCode: 301 } },
    '/wifi-qr-kod': { redirect: { to: '/wifi-qr-kod-generator', statusCode: 301 } },
    '/vcard-qr-kod': { redirect: { to: '/vcard-qr-kod-generator', statusCode: 301 } },
    '/email-qr-kod': { redirect: { to: '/email-qr-kod-generator', statusCode: 301 } },
    '/telefon-qr-kod': { redirect: { to: '/telefon-qr-kod-generator', statusCode: 301 } },
    '/sms-qr-kod': { redirect: { to: '/sms-qr-kod-generator', statusCode: 301 } },
    '/qr-kod-google-ertekeleshez': { redirect: { to: '/google-ertekeles-qr-kod-generator', statusCode: 301 } },
    '/qr-kod-etlaphoz': { redirect: { to: '/etlap-qr-kod-generator', statusCode: 301 } },
    // Az egyedi típust megszüntettük; a szöveg típus fedi le ugyanazt az esetet.
    '/egyedi-qr-kod-generator': { redirect: { to: '/szoveg-qr-kod-generator', statusCode: 301 } },
    '/': { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600' } },
    // A Nitro backend kiszolgálása ugyanazon az originon.
    '/api/**': { proxy: `${backendUrl}/api/**` },
    '/admin/**': { robots: false, headers: { 'Cache-Control': 'no-store' } },
    '/_nuxt/**': { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      },
    },
  },

  nitro: {
    compressPublicAssets: true,
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

})
