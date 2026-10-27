<script setup lang="ts">
const { legal } = useSiteSettings()

useContentSeo({
  slug: '/kapcsolat',
  title: 'Kapcsolat',
  description:
    'Kapcsolatfelvétel a QRKOD24.hu üzemeltetőjével. Kérdések, hibabejelentés, adatvédelmi megkeresések és együttműködési lehetőségek.',
  h1: 'Kapcsolat',
})
</script>

<template>
  <div>
    <section class="border-b border-slate-200/80 bg-surface">
      <div class="container-page pb-9 pt-5">
        <ContentBreadcrumbs :items="[{ label: 'Főoldal', to: '/' }, { label: 'Kapcsolat' }]" />
        <div class="mt-6 max-w-3xl">
          <span class="eyebrow">Segítünk</span>
          <h1 class="mt-3 text-3xl leading-tight sm:text-4xl">Kapcsolat</h1>
          <p class="mt-4 text-[1.02rem] leading-relaxed text-ink-soft">
            Kérdésed van a QR-kód generátorral, a dinamikus QR-kódokkal vagy az adatkezeléssel
            kapcsolatban? Írj nekünk, és igyekszünk mielőbb válaszolni.
          </p>
        </div>
      </div>
    </section>

    <div class="container-page py-10">
      <div class="grid max-w-5xl gap-6 lg:grid-cols-[1.15fr_1fr]">
        <section class="card p-6 sm:p-8" aria-labelledby="contact-details">
          <h2 id="contact-details" class="text-xl">Elérhetőségeink</h2>

          <div v-if="legal.providerEmail" class="mt-5">
            <p class="text-sm font-medium text-ink">E-mail</p>
            <a
              :href="`mailto:${legal.providerEmail}`"
              class="mt-1 inline-flex items-center gap-2 text-lg font-semibold text-brand-700 underline decoration-brand-200 underline-offset-4 hover:decoration-brand-600"
            >
              <Icon name="lucide:mail" class="h-5 w-5" aria-hidden="true" />
              {{ legal.providerEmail }}
            </a>
            <p class="mt-2 text-xs leading-relaxed text-ink-muted">
              Írd le röviden, miben segíthetünk. Hibabejelentésnél add meg a használt böngészőt és a
              QR-kód típusát; jelszót vagy más bizalmas adatot ne küldj.
            </p>
          </div>

          <div v-else class="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
            <p class="font-medium">Az elérhetőség még nincs beállítva.</p>
            <p class="mt-1 text-xs leading-relaxed">
              Az üzemeltető az adminisztrációs felületen adhatja meg a kapcsolattartó e-mail-címét.
              Kitalált elérhetőséget nem jelenítünk meg.
            </p>
          </div>

          <dl v-if="legal.providerPhone || legal.providerAddress || legal.providerName" class="mt-6 space-y-3 border-t border-slate-200 pt-5 text-sm">
            <div v-if="legal.providerName">
              <dt class="text-ink-muted">Szolgáltató</dt>
              <dd class="mt-0.5 font-medium text-ink">{{ legal.providerName }}</dd>
            </div>
            <div v-if="legal.providerAddress">
              <dt class="text-ink-muted">Cím</dt>
              <dd class="mt-0.5 font-medium text-ink">{{ legal.providerAddress }}</dd>
            </div>
            <div v-if="legal.providerPhone">
              <dt class="text-ink-muted">Telefon</dt>
              <dd class="mt-0.5 font-medium text-ink">{{ legal.providerPhone }}</dd>
            </div>
          </dl>

          <div class="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-ink-muted">
            Adatvédelmi kérdésekkel kapcsolatban a
            <NuxtLink to="/adatvedelmi-tajekoztato" class="font-medium text-brand-700 underline underline-offset-2">
              adatvédelmi tájékoztatóban
            </NuxtLink>
            találsz részletes információt az érintetti jogaidról.
          </div>
        </section>

        <aside class="space-y-4">
          <div class="rounded-2xl border border-brand-100 bg-brand-50/70 p-5">
            <h2 class="text-lg font-semibold">Gyors segítség</h2>
            <ul class="mt-3 space-y-2 text-sm text-ink-soft">
              <li>
                <NuxtLink to="/qr-kod-keszites" class="font-medium text-brand-700 hover:underline">
                  QR-kód készítési útmutató
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/wifi-qr-kod-generator" class="font-medium text-brand-700 hover:underline">
                  Wi-Fi QR-kód beállítása
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/qr-kod-nyomtatasra" class="font-medium text-brand-700 hover:underline">
                  Nyomtatási tippek
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/dinamikus-qr-kod" class="font-medium text-brand-700 hover:underline">
                  Dinamikus QR-kódok
                </NuxtLink>
              </li>
            </ul>
          </div>

          <div class="card p-5">
            <h2 class="text-sm font-semibold">Válaszidő</h2>
            <p class="mt-1.5 text-xs leading-relaxed text-ink-muted">
              A megkereséseket a beérkezés sorrendjében dolgozzuk fel. A válaszidő a kérdések számától
              és a hétköznapi terheléstől függ; sürgős esetben jelezd a tárgyban.
            </p>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>
