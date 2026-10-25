<script setup lang="ts">
const { brandName, legal, dynamicQrEnabled } = useSiteSettings()
const { openPreferences } = useCookieConsent()
const { t } = useI18n()
const year = computed(() => new Date().getFullYear())

const typeLinks = [
  { label: 'Weboldal QR-kód', to: '/url-qr-kod-generator' },
  { label: 'Wi-Fi QR-kód', to: '/wifi-qr-kod-generator' },
  { label: 'vCard QR-kód', to: '/vcard-qr-kod-generator' },
  { label: 'Névjegykártya QR-kód', to: '/nevjegykartya-qr-kod' },
  { label: 'E-mail QR-kód', to: '/email-qr-kod-generator' },
  { label: 'Telefon QR-kód', to: '/telefon-qr-kod-generator' },
  { label: 'SMS QR-kód', to: '/sms-qr-kod-generator' },
  { label: 'Google-értékelés', to: '/google-ertekeles-qr-kod-generator' },
  { label: 'Esemény QR-kód', to: '/esemeny-qr-kod-generator' },
  { label: 'Nyomtatásra', to: '/qr-kod-nyomtatasra' },
]

const infoLinks = [
  { label: 'QR-kód készítés', to: '/qr-kod-keszites' },
  { label: 'QR-kód generátor', to: '/qr-kod-generator' },
  { label: 'QR-kód típusok', to: '/qr-kod-tipusok' },
  { label: 'Dinamikus QR-kódok', to: '/dinamikus-qr-kod' },
  { label: 'Kapcsolat', to: '/kapcsolat' },
]

const legalLinks = [
  { label: 'Adatvédelmi tájékoztató', to: '/adatvedelmi-tajekoztato' },
  { label: 'Cookie-tájékoztató', to: '/cookie-tajekoztato' },
  { label: 'Felhasználási feltételek', to: '/felhasznalasi-feltetelek' },
  { label: 'Impresszum', to: '/impresszum' },
]
</script>

<template>
  <footer class="mt-16 border-t border-slate-200 bg-surface">
    <div class="container-page py-12">
      <div class="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <AppLogo />
          <p class="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
            {{ t('footer.tagline') }}
          </p>
          <p class="mt-3 text-xs text-ink-muted">
            {{ t('footer.scanHint') }}
          </p>
        </div>

        <nav aria-labelledby="footer-types">
          <h2 id="footer-types" class="text-sm font-semibold text-ink">{{ t('footer.types') }}</h2>
          <ul class="mt-3 space-y-2">
            <li v-for="link in typeLinks" :key="link.to">
              <NuxtLink :to="link.to" class="text-sm text-ink-muted transition-colors hover:text-brand-700">
                {{ link.label }}
              </NuxtLink>
            </li>
          </ul>
        </nav>

        <nav aria-labelledby="footer-info">
          <h2 id="footer-info" class="text-sm font-semibold text-ink">{{ t('footer.info') }}</h2>
          <ul class="mt-3 space-y-2">
            <li v-for="link in infoLinks" :key="link.to">
              <NuxtLink :to="link.to" class="text-sm text-ink-muted transition-colors hover:text-brand-700">
                {{ link.label }}
              </NuxtLink>
            </li>
            <li v-if="dynamicQrEnabled">
              <NuxtLink to="/dinamikus-qr-kod" class="text-sm text-ink-muted transition-colors hover:text-brand-700">
                Rövid linkek kezelése
              </NuxtLink>
            </li>
          </ul>
        </nav>

        <nav aria-labelledby="footer-legal">
          <h2 id="footer-legal" class="text-sm font-semibold text-ink">{{ t('footer.legal') }}</h2>
          <ul class="mt-3 space-y-2">
            <li v-for="link in legalLinks" :key="link.to">
              <NuxtLink :to="link.to" class="text-sm text-ink-muted transition-colors hover:text-brand-700">
                {{ link.label }}
              </NuxtLink>
            </li>
            <li>
              <button
                type="button"
                class="text-sm text-ink-muted transition-colors hover:text-brand-700"
                @click="openPreferences"
              >
                {{ t('footer.manageCookies') }}
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <div class="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {{ year }} {{ legal.providerName || brandName }}. {{ t('footer.rights') }}
        </p>
        <p class="text-ink-muted">
          {{ t('footer.ads') }}
        </p>
      </div>
    </div>
  </footer>
</template>
