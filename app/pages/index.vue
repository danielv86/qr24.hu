<script setup lang="ts">
import type { ContentFaq } from '#shared/content/types'

// A fejléc-képek a public mappából jönnek: így a szerver és a kliens
// ugyanazt az URL-t rendereli, és nincs hidratálási eltérés.
const heroBackground = '/img/header/bg1.png'
const heroBackgroundDark = '/img/header/bg1-dark.png'
const heroQrImage = '/img/header/qr-icon.png'

const HERO_BADGES = [
  { label: '28 QR-kód típus', icon: 'lucide:layout-grid', color: 'bg-brand-100 text-brand-700' },
  { label: 'Nincs regisztráció', icon: 'lucide:user-check', color: 'bg-emerald-100 text-emerald-700' },
  { label: '5 exportformátum', icon: 'lucide:download', color: 'bg-amber-100 text-amber-700' },
]

const HOME_FAQS: ContentFaq[] = [
  {
    question: 'Ingyenes a QR-kód generátor?',
    answer:
      'Igen. A statikus QR-kódok létrehozása, testreszabása és letöltése díjmentes, regisztráció nélkül. Az oldal fenntartását a hozzájárulás alapján megjelenő hirdetések segítik.',
  },
  {
    question: 'Hol készül el a QR-kód?',
    answer:
      'A statikus QR-kód a böngésződben, a saját eszközödön készül. A generátor űrlapjába írt tartalom nem kerül fel a szerverre, és nem tároljuk.',
  },
  {
    question: 'Milyen fájlformátumban tölthetem le?',
    answer:
      'PNG-ben képként, SVG-ben pedig vektoros formátumban. Utóbbi nyomdai méretezéshez ideális, mert minőségvesztés nélkül nagyítható.',
  },
  {
    question: 'Módosítható a QR-kód tartalma később?',
    answer:
      'A statikus kód tartalma a képbe kerül, ezért utólag nem írható át. Ha a cél később változhat, dinamikus QR-kódot érdemes használni, amely egy rövid saját címre mutat.',
  },
  {
    question: 'Beolvasható a kód minden telefonnal?',
    answer:
      'A modern Android és iOS eszközök kamerája általában képes QR-kódot olvasni. A nagyon alacsony kontraszt, a túl kis méret vagy a sérült nyomat okozhat gondot – a generátor figyelmeztet a kockázatokra.',
  },
  {
    question: 'Kell hozzá hozzájárulás a sütikhez?',
    answer:
      'A generátor használatához nem. A szükséges sütik nélkül is elkészítheted és letöltheted a kódot. A hirdetési sütik csak akkor aktiválódnak, ha a sütibeállításoknál engedélyezed őket.',
  },
]

const BENEFITS = [
  {
    icon: 'lucide:zap',
    title: 'Ingyenes és gyors',
    text: 'Azonnali előnézet, korlátlan statikus generálás regisztráció nélkül.',
    color: 'bg-brand-50 text-brand-700',
  },
  {
    icon: 'lucide:palette',
    title: 'Egyedi megjelenés',
    text: 'Színek, pontok, sarokelemek, logó, keret és csendes zóna beállítása.',
    color: 'bg-emerald-50 text-emerald-700',
  },
  {
    icon: 'lucide:layout-grid',
    title: '28 QR-kód típus',
    text: 'Weboldal, névjegy, Wi-Fi, bank, PayPal, PDF, galéria, videó és további célok.',
    color: 'bg-amber-50 text-amber-700',
  },
  {
    icon: 'lucide:download',
    title: 'PNG, JPG, WebP, SVG és PDF',
    text: 'Képernyőre PNG, JPG vagy WebP, nyomdára SVG, PDF-be ágyazva is.',
    color: 'bg-sky-50 text-sky-700',
  },
]

const GUIDE_STEPS = [
  {
    title: 'Válassz típust',
    text: 'Weboldal, Wi-Fi, névjegy vagy éppen SMS – mindegyikhez saját űrlap tartozik.',
  },
  {
    title: 'Add meg a tartalmat',
    text: 'Az ékezeteket és nemzetközi telefonszámokat is kezeljük. Az előnézet azonnal frissül.',
  },
  {
    title: 'Töltsd le és teszteld',
    text: 'Válaszd a PNG-t vagy az SVG-t, majd olvasd be a kódot a tervezett méretben.',
  },
]

const POPULAR_TYPES = [
  { label: 'Weboldal QR-kód', icon: 'lucide:link', to: '/url-qr-kod-generator', color: 'bg-blue-50 text-blue-600' },
  { label: 'Kapcsolat (vCard)', icon: 'lucide:id-card', to: '/vcard-qr-kod-generator', color: 'bg-emerald-50 text-emerald-600' },
  { label: 'Wi-Fi megosztás', icon: 'lucide:wifi', to: '/wifi-qr-kod-generator', color: 'bg-amber-50 text-amber-600' },
  { label: 'E-mail küldés', icon: 'lucide:mail', to: '/email-qr-kod-generator', color: 'bg-violet-50 text-violet-600' },
  { label: 'Telefonhívás', icon: 'lucide:phone', to: '/telefon-qr-kod-generator', color: 'bg-rose-50 text-rose-600' },
  { label: 'SMS küldés', icon: 'lucide:message-square', to: '/sms-qr-kod-generator', color: 'bg-yellow-50 text-yellow-700' },
  { label: 'Közösségi oldalak', icon: 'lucide:share-2', to: '/qr-kod-generator', color: 'bg-pink-50 text-pink-600' },
  { label: 'Szöveg QR-kód', icon: 'lucide:type', to: '/szoveg-qr-kod-generator', color: 'bg-teal-50 text-teal-600' },
  { label: 'Tömeges QR kód generátor', icon: 'lucide:layers', to: '/tomeges-qr-kod-generator', color: 'bg-indigo-50 text-indigo-600' },
]

const INTERNAL_LINKS = [
  { label: 'QR-kód generátor', to: '/qr-kod-generator', text: 'A teljes eszköz és beállítások.' },
  { label: 'QR-kód készítés', to: '/qr-kod-keszites', text: 'Lépésről lépésre útmutató.' },
  { label: 'Wi-Fi QR-kód', to: '/wifi-qr-kod-generator', text: 'Vendéghálózat megosztása.' },
  { label: 'vCard QR-kód', to: '/vcard-qr-kod-generator', text: 'Digitális névjegy.' },
  { label: 'Névjegykártya QR-kód', to: '/nevjegykartya-qr-kod', text: 'Nyomdai tippek.' },
  { label: 'E-mail QR-kód', to: '/email-qr-kod-generator', text: 'Előre kitöltött levél.' },
  { label: 'Telefon QR-kód', to: '/telefon-qr-kod-generator', text: 'Azonnali hívás.' },
  { label: 'SMS QR-kód', to: '/sms-qr-kod-generator', text: 'Előre megírt üzenet.' },
  { label: 'Google-értékelés', to: '/google-ertekeles-qr-kod-generator', text: 'Etikus értékeléskérés.' },
  { label: 'Étlap QR-kód', to: '/etlap-qr-kod-generator', text: 'Vendéglátás és asztali kártya.' },
  { label: 'Nyomtatásra', to: '/qr-kod-nyomtatasra', text: 'Méret, felbontás, anyag.' },
  { label: 'URL QR-kód', to: '/url-qr-kod-generator', text: 'Webcímek megosztása.' },
  { label: 'Szöveg QR-kód', to: '/szoveg-qr-kod-generator', text: 'Egyszerű szöveges tartalom.' },
  { label: 'Tömeges QR kód generátor', to: '/tomeges-qr-kod-generator', text: 'Akár 100 kód egyszerre, ZIP-ben.' },
]

useContentSeo({
  slug: '/',
  title: 'Ingyenes QR-kód generátor – QRKOD24.hu',
  description:
    'Készíts ingyenes QR-kódot regisztráció nélkül: weboldal, Wi-Fi, vCard, e-mail, SMS és további típusok. Élő előnézet, egyedi színek, keretek és sablonok, PNG, JPG, WebP, SVG és PDF letöltés.',
  h1: 'Ingyenes QR-kód generátor',
  faqs: HOME_FAQS,
  isWebApp: true,
})
</script>

<template>
  <div>
    <!-- Fejléc sáv a saját háttérképpel, a menüsor és a típusválasztó alá is benyúlva -->
    <section class="relative -mt-[6.0625rem] overflow-hidden pt-[6.0625rem]">
      <img
        :src="heroBackground"
        alt=""
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 h-full w-full object-cover dark:hidden"
      >
      <img
        :src="heroBackgroundDark"
        alt=""
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 hidden h-full w-full object-cover dark:block"
      >
      <div class="relative container-page pb-28 pt-3 sm:pt-5">
        <AdSlot placement="top" :min-height="90" class="mx-auto max-w-3xl" />

        <div class="mt-7 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div class="text-left" aria-labelledby="home-heading">
            <span class="eyebrow">
              <Icon name="lucide:sparkles" class="h-3.5 w-3.5" aria-hidden="true" />
              Ingyenes online eszköz
            </span>
            <h1 id="home-heading" class="mt-4 text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-[3.4rem]">
              Ingyenes
              <span class="bg-gradient-to-r from-brand-700 via-brand-600 to-fuchsia-500 bg-clip-text text-transparent">QR-kód</span>
              generátor
            </h1>
            <p class="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
              Készíts egyedi QR-kódot bármilyen tartalomhoz. Gyors, egyszerű és testreszabható –
              regisztráció nélkül, közvetlenül a böngésződben.
            </p>
            <ul class="mt-5 flex flex-wrap gap-2.5">
              <li
                v-for="badge in HERO_BADGES"
                :key="badge.label"
                class="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-surface/90 px-3 py-1.5 text-xs font-semibold text-ink shadow-sm backdrop-blur-sm"
              >
                <span :class="['grid h-5 w-5 place-items-center rounded-full', badge.color]">
                  <Icon :name="badge.icon" class="h-3 w-3" aria-hidden="true" />
                </span>
                {{ badge.label }}
              </li>
            </ul>
          </div>

          <div class="hidden justify-self-end lg:block">
            <img
              :src="heroQrImage"
              alt="QR-kód előnézet"
              class="w-[280px] drop-shadow-2xl"
              loading="eager"
            >
          </div>
        </div>
      </div>
    </section>

    <div class="container-page py-8 lg:py-10">
      <div class="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18.75rem]">
        <div class="min-w-0 xl:col-span-2">
          <QrTypeMenu class="-mt-28" />

          <QrGenerator class="mt-5" :initial-type="'url'" :show-type-tabs="false" />
        </div>

        <div class="min-w-0">
          <section aria-labelledby="benefits-heading">
            <h2 id="benefits-heading" class="sr-only">A generátor előnyei</h2>
            <div class="grid gap-3 rounded-2xl border border-slate-200 bg-surface p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4">
              <div v-for="benefit in BENEFITS" :key="benefit.title" class="rounded-xl p-3">
                <span :class="['grid h-10 w-10 place-items-center rounded-xl', benefit.color]">
                  <Icon :name="benefit.icon" class="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 class="mt-3 text-sm font-semibold">{{ benefit.title }}</h3>
                <p class="mt-1 text-xs leading-relaxed text-ink-muted">{{ benefit.text }}</p>
              </div>
            </div>
          </section>

          <AdSlot placement="content" :min-height="250" class="mt-8" />

          <section id="nepszeru-tipusok" class="mt-12 scroll-mt-24" aria-labelledby="popular-heading">
            <div class="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span class="eyebrow">Népszerű megoldások</span>
                <h2 id="popular-heading" class="mt-2 text-2xl sm:text-3xl">Népszerű QR-kód típusok és eszközök</h2>
              </div>
              <NuxtLink to="/qr-kod-generator" class="text-sm font-medium text-brand-700 hover:text-brand-800">
                Összes típus a generátorban →
              </NuxtLink>
            </div>
            <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <NuxtLink
                v-for="type in POPULAR_TYPES"
                :key="type.to + type.label"
                :to="type.to"
                class="card group flex flex-col items-center justify-center gap-2 p-4 text-center transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift"
              >
                <span :class="['grid h-11 w-11 place-items-center rounded-xl', type.color]">
                  <Icon :name="type.icon" class="h-5 w-5" aria-hidden="true" />
                </span>
                <span class="text-xs font-semibold leading-snug text-ink-soft group-hover:text-ink">{{ type.label }}</span>
              </NuxtLink>
            </div>
          </section>

          <section class="mt-12" aria-labelledby="how-heading">
            <div class="rounded-2xl border border-slate-200 bg-surface p-6 shadow-card sm:p-8">
              <div class="grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-center">
                <div>
                  <span class="eyebrow">Gyors útmutató</span>
                  <h2 id="how-heading" class="mt-2 text-2xl">Hogyan készül a QR-kód?</h2>
                  <p class="mt-3 text-sm leading-relaxed text-ink-soft">
                    A folyamat három egyszerű lépésből áll. A tartalmat te adod meg, a kódot a böngésző
                    állítja elő, a letöltött fájlt pedig bármikor felhasználhatod.
                  </p>
                  <NuxtLink to="/qr-kod-keszites" class="btn-secondary mt-4">
                    Részletes útmutató
                    <Icon name="lucide:arrow-right" class="h-4 w-4" aria-hidden="true" />
                  </NuxtLink>
                </div>
                <ol class="space-y-3">
                  <li
                    v-for="(step, index) in GUIDE_STEPS"
                    :key="step.title"
                    class="flex gap-3 rounded-xl bg-slate-50 p-3.5"
                  >
                    <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                      {{ index + 1 }}
                    </span>
                    <span>
                      <span class="block text-sm font-semibold text-ink">{{ step.title }}</span>
                      <span class="mt-0.5 block text-xs leading-relaxed text-ink-muted">{{ step.text }}</span>
                    </span>
                  </li>
                </ol>
              </div>
            </div>
          </section>

          <AdSlot placement="guide" :min-height="90" class="mt-8" />

          <ContentFaqAccordion :faqs="HOME_FAQS" id="gyik" class="mt-12" />

          <section class="mt-12" aria-labelledby="internal-links-heading">
            <span class="eyebrow">További útmutatók</span>
            <h2 id="internal-links-heading" class="mt-2 text-2xl">QR-kód típusok és hasznos cikkek</h2>
            <div class="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <NuxtLink
                v-for="link in INTERNAL_LINKS"
                :key="link.to"
                :to="link.to"
                class="group rounded-xl border border-slate-200 bg-surface p-3.5 transition-colors hover:border-brand-300 hover:bg-brand-50/30"
              >
                <span class="block text-sm font-semibold text-ink group-hover:text-brand-800">{{ link.label }}</span>
                <span class="mt-0.5 block text-xs text-ink-muted">{{ link.text }}</span>
              </NuxtLink>
            </div>
          </section>

          <div class="mt-10 rounded-2xl border border-brand-100 bg-brand-50/60 p-6">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 class="text-lg font-semibold">Készen állsz a saját kódodra?</h2>
                <p class="mt-1 text-sm text-ink-soft">
                  Válassz típust, állítsd be a megjelenést, és töltsd le pár másodperc alatt.
                </p>
              </div>
              <a href="#qr-generator" class="btn-primary shrink-0">
                <Icon name="lucide:qr-code" class="h-4 w-4" aria-hidden="true" />
                Generátor megnyitása
              </a>
            </div>
          </div>
        </div>

        <aside class="hidden xl:block" aria-label="Oldalsáv">
          <div class="sticky top-24 space-y-5">
            <AdSlot placement="sidebar" :min-height="600" />

            <div class="card p-4">
              <h2 class="text-sm font-semibold">Népszerű QR-kódok</h2>
              <ul class="mt-2 space-y-1">
                <li v-for="type in POPULAR_TYPES.slice(0, 5)" :key="`side-${type.label}`">
                  <NuxtLink
                    :to="type.to"
                    class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-ink-muted hover:bg-brand-50 hover:text-brand-800"
                  >
                    <Icon :name="type.icon" class="h-3.5 w-3.5" aria-hidden="true" />
                    {{ type.label }}
                  </NuxtLink>
                </li>
              </ul>
            </div>

            <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p class="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
                <Icon name="lucide:shield-check" class="h-4 w-4" aria-hidden="true" />
                Adatvédelem első helyen
              </p>
              <p class="mt-1.5 text-xs leading-relaxed text-emerald-900">
                A statikus QR-kódok a böngésződben készülnek. Az űrlap tartalmát nem küldjük el a szervernek.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>
