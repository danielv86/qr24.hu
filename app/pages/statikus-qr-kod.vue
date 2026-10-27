<script setup lang="ts">
import type { ContentFaq } from '#shared/content/types'

const FAQS: ContentFaq[] = [
  {
    question: 'Mi az a statikus QR-kód?',
    answer:
      'A statikus QR-kódban maga a tartalom – például egy webcím, telefonszám, Wi-Fi belépési adat – van beleírva a mintázatba. Beolvasáskor a telefon ezt a tartalmat olvassa ki, ezért nincs szükség szerverre vagy átirányításra.',
  },
  {
    question: 'Módosítható a statikus QR-kód tartalma?',
    answer:
      'Nem. Ha a célcím megváltozik, új kódot kell generálni és újra kell nyomtatni. Ha erre számítasz, válaszd a dinamikus QR-kódot, ahol a kód egy állandó qrkod24.hu linkre mutat, és csak a mögötte lévő célt módosítod.',
  },
  {
    question: 'Meddig működik egy statikus QR-kód?',
    answer:
      'Amíg a benne tárolt adat érvényes, és amíg a beolvasott cím létezik. A kód maga nem jár le, nem kapcsolható ki és nem függ semmilyen előfizetéstől.',
  },
  {
    question: 'Mekkora legyen a kód a nyomtatáson?',
    answer:
      'A kód legyen legalább 2 × 2 cm, a körülötte hagyott üres sáv (csendes zóna) pedig legalább a kód szélességének négy modulja. A generátor ezt alapértelmezésben beállítja, de kisebb méretnél érdemes ellenőrizni a beolvasást.',
  },
  {
    question: 'Kell regisztráció a statikus QR-kódhoz?',
    answer:
      'Nem. A statikus generátor regisztráció nélkül használható, a kód a böngésződben készül el, a megadott adat nem hagyja el az eszközödet.',
  },
]

useContentSeo({
  slug: '/statikus-qr-kod',
  title: 'Statikus QR-kód – mi ez, mire jó és hogyan készül?',
  description:
    'Statikus QR-kód: a tartalom magában a kódban van, ezért ingyenes és örökre működik. Leírás, gyakorlati tippek és összehasonlítás a dinamikus QR-kóddal.',
  h1: 'Statikus QR-kód',
  faqs: FAQS,
})
</script>

<template>
  <div>
    <section class="border-b border-slate-200/80 bg-surface">
      <div class="container-page pb-9 pt-5">
        <ContentBreadcrumbs :items="[{ label: 'Főoldal', to: '/' }, { label: 'Statikus QR-kód' }]" />
        <div class="mt-6 max-w-3xl">
          <span class="eyebrow">Beolvasásra kész</span>
          <h1 class="mt-3 text-3xl leading-tight sm:text-4xl">Statikus QR-kód</h1>
          <p class="mt-4 text-[1.02rem] leading-relaxed text-ink-soft">
            A statikus QR-kódban maga a tartalom van: a webcím, a telefonszám vagy a Wi-Fi adatok
            közvetlenül a mintázatba kerülnek. Nincs mögötte szerver, nincs átirányítás – a telefon
            egyszerűen kiolvassa, ami a kódban áll.
          </p>
          <p class="mt-3 text-sm leading-relaxed text-ink-muted">
            Ez a legósibb és leginkább letisztult módja a QR-kód használatának. Ingyenes, nem jár le,
            és akkor is működik, ha a generátor oldala később megszűnik – feltéve, hogy a benne
            tárolt cím továbbra is él.
          </p>
          <div class="mt-5 flex flex-wrap gap-2">
            <NuxtLink to="/qr-kod-generator" class="btn-primary">
              <Icon name="lucide:qr-code" class="h-4 w-4" aria-hidden="true" />
              Statikus QR-kód készítése
            </NuxtLink>
            <NuxtLink to="/dinamikus-qr-kod" class="btn-secondary">
              Dinamikus QR-kód megismerése
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <div class="container-page py-8">
      <AdSlot placement="top" :min-height="90" />

      <div class="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <article class="prose-hu">
          <section class="scroll-mt-24">
            <h2>Mi az a statikus QR-kód?</h2>
            <p>
              A QR-kód egy kétdimenziós vonalkód, amely bináris adatot tárol. Statikus esetben a
              kódba írt szöveg – például <code>https://qrkod24.hu/ajanlat</code> – közvetlenül a
              mintázat része. Nincs olyan szerveroldali lépés, amely a beolvasás után eldöntené, hova
              kerüljön a látogató.
            </p>
            <p>
              Ez a felépítés egyszerre előny és korlát. Előny, mert a kód független minden
              szolgáltatástól, és a beolvasás gyors. Korlát, mert a tartalom utólag nem módosítható:
              ha megváltozik az étlap, az ajánlat vagy az esemény oldalának címe, új kód kell.
            </p>
          </section>

          <section class="scroll-mt-24">
            <h2>Hogyan készül a QRKOD24.hu generátorral?</h2>
            <p>
              A generátor a böngésződben állítja elő a képet, adatbázis és feltöltés nélkül. A
              folyamat három lépésből áll:
            </p>
            <ul>
              <li>Válaszd ki a kód típusát (weboldal, szöveg, Wi-Fi, névjegy, e-mail és további típusok).</li>
              <li>Add meg az adatokat – a generátor azonnal ellenőrzi, hogy érvényes-e a cím.</li>
              <li>Hangolj színt, formát, logót és keretet, majd töltsd le PNG, SVG, JPG, WebP vagy PDF formátumban.</li>
            </ul>
            <p class="not-prose">
              <NuxtLink to="/qr-kod-generator" class="text-sm font-semibold text-brand-700 hover:underline">
                Ugrás a statikus QR-kód generátorhoz →
              </NuxtLink>
            </p>
          </section>

          <div class="not-prose my-8">
            <AdSlot placement="content" :min-height="280" />
          </div>

          <section class="scroll-mt-24">
            <h2>Mikor válaszd a statikus kódot?</h2>
            <ul>
              <li>Állandó adat: céges weboldal, névjegy, telefonszám, e-mail cím, Wi-Fi hozzáférés.</li>
              <li>Olyan helyzet, ahol nincs és nem is lesz internet a beolvasás oldalán (például nyomtatott termékcímke).</li>
              <li>Egyedi, egyszeri marketinganyag, ahol a célcím a kampány ideje alatt biztosan nem változik.</li>
              <li>Olyan felület, ahol fontos, hogy ne függjön szolgáltatótól vagy előfizetéstől.</li>
            </ul>
            <p>
              Ha viszont a cél később változhat, mérni szeretnéd a beolvasásokat, vagy egy kódot
              lejárathoz kötnél, a dinamikus QR-kód praktikusabb.
            </p>
          </section>

          <section class="scroll-mt-24">
            <h2>Mire figyelj a nyomtatásnál?</h2>
            <p>
              A legtöbb beolvasási hiba nem a kódban, hanem a nyomtatásban vagy az elhelyezésben
              van. A generátor által adott alapértékek jó kiindulópontot adnak, de a nyomdai
              ellenőrzés nem spórolható meg.
            </p>
            <ul>
              <li>Hagyj üres sávot a kód körül: a szabvány 4 modul csendes zónát ír elő.</li>
              <li>A sötét minta világos háttéren a legbiztonságosabb; a fordított változatot sok olvasó nem ismeri fel.</li>
              <li>Logó esetén emeld a hibajavítási szintet H-ra – a kép ugyanis takarja a kód egy részét.</li>
              <li>Nyomtatáshoz legalább 1024 px-es vagy vektoros (SVG, PDF) exportot használj.</li>
            </ul>
            <p class="rounded-r-lg border-l-4 border-brand-500 bg-brand-50/70 px-4 py-3 text-sm text-ink-soft">
              <strong class="font-semibold text-ink">Tipp:</strong> nyomtatás előtt olvasd be a kódot
              két különböző telefonnal, és a végleges méretben ellenőrizd.
            </p>
          </section>

          <section id="osszehasonlitas" class="scroll-mt-24">
            <h2>Statikus vagy dinamikus QR-kód?</h2>
            <p>
              A két megoldás ugyanazt a feladatot látja el, de más igényre jó. Az alábbi táblázat a
              gyakorlatban fontos különbségeket gyűjti össze.
            </p>
            <QrComparisonTable />
            <p class="mt-4">
              Ökölszabály: ha a kód egyszer kikerül a nyomdából és soha nem változik, a statikus
              verzió a legegyszerűbb. Ha a kód hónapokig vagy évekig él, és a cél közben módosulhat,
              a dinamikus QR-kód megspórolja az újranyomtatást.
            </p>
          </section>
        </article>

        <aside class="space-y-4">
          <div class="card p-5">
            <h2 class="text-base font-semibold">Készítsd el most</h2>
            <p class="mt-2 text-sm leading-relaxed text-ink-soft">
              Regisztráció nélkül, korlátlanul. A kód a böngésződben készül, az adat nem kerül
              szerverre.
            </p>
            <NuxtLink to="/qr-kod-generator" class="btn-primary mt-3 w-full justify-center">
              QR-kód generátor
            </NuxtLink>
          </div>

          <div class="card p-5">
            <h2 class="text-base font-semibold">Kapcsolódó oldalak</h2>
            <ul class="mt-2 space-y-2 text-sm">
              <li>
                <NuxtLink to="/dinamikus-qr-kod" class="font-medium text-brand-700 hover:underline">
                  Dinamikus QR-kód
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/qr-kod-tipusok" class="font-medium text-brand-700 hover:underline">
                  QR-kód típusok
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/tomeges-qr-kod-generator" class="font-medium text-brand-700 hover:underline">
                  Tömeges QR-kód generátor
                </NuxtLink>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <ContentFaqAccordion :faqs="FAQS" id="gyik" class="mt-10" />
    </div>
  </div>
</template>
