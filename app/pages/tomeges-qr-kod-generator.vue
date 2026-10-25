<script setup lang="ts">
import { BULK_LIMIT, parseBulkInput } from '#shared/bulk'
import type { ContentFaq } from '#shared/content/types'

const SAMPLE = [
  'Nyitólap;https://qr24.hu',
  'QR-kód generátor;https://qr24.hu/qr-kod-generator',
  'Dinamikus QR-kódok;https://qr24.hu/dinamikus-qr-kod',
  'Árlista;https://qr24.hu/qr-kod-tipusok',
].join('\n')

const raw = ref(SAMPLE)
const result = computed(() => parseBulkInput(raw.value, BULK_LIMIT))
const { customization } = useQrCustomization()
const { isWorking, progress, error, downloadZip, downloadCsv, printSheet } = useBulkDownload()

const pngSize = ref(512)
// A többi generátorhoz hasonlóan egyetlen kód látszik előnézetben.
const previewRow = computed(() => result.value.valid[0] ?? null)

const faqs: ContentFaq[] = [
  {
    question: 'Hány QR-kódot tudok egyszerre legenerálni?',
    answer:
      'Egy tételben legfeljebb 100 kód készül el. Ha ennél több kell, bontsd több listára: a beállítások és a formák ugyanazok maradnak, csak a fájlnevek sorszámozása indul újra.',
  },
  {
    question: 'Milyen formátumban kapom meg a kódokat?',
    answer:
      'ZIP csomagban PNG (512 vagy 1024 pixel) vagy SVG formátumban, fájlonként egy kóddal, valamint egy CSV-riporttal, amelyben benne van a név, a cím és a fájlnév. Kérhetsz A4-es nyomtatóívet is, ahol a kódok felirattal, vágásvonallal jelennek meg.',
  },
  {
    question: 'Feltöltődik a lista valahova?',
    answer:
      'Nem. A kódok a böngésződben készülnek, ugyanazzal a motorral, mint az egyedi generátoré, a lista nem kerül szerverre és nem tároljuk. Fiók nélkül is használható.',
  },
  {
    question: 'Mi a különbség a tömeges és a dinamikus QR-kód között?',
    answer:
      'A tömeges generátor statikus kódokat készít: a cím bele van égetve a képbe, utólag nem módosítható. Ha a célcím később változhat, dinamikus QR-kódot érdemes használni, mert ott a kód ugyanaz marad, csak a mögötte lévő cím változik.',
  },
]

useContentSeo({
  slug: '/tomeges-qr-kod-generator',
  title: 'Tömeges QR-kód generálás – akár 100 kód egyszerre',
  description:
    'Készíts egyszerre akár 100 QR-kódot: illessz be egy listát vagy tölts fel CSV-t, válaszd ki a megjelenést, és töltsd le ZIP-ben (PNG, SVG), A4-es nyomtatóíven vagy CSV-riporttal. Fiók nélkül, a böngésződben.',
  h1: 'Tömeges QR-kód generálás',
  faqs,
  isWebApp: true,
})

const steps = [
  {
    icon: 'lucide:list-checks',
    title: 'Illeszd be a listát',
    text: 'Soronként egy cím, opcionális névvel. CSV-fájlt is behúzhatsz – a vesszőt, a pontosvesszőt és a tabulátort is felismeri.',
  },
  {
    icon: 'lucide:palette',
    title: 'Válaszd ki a megjelenést',
    text: 'A színek, formák és keret minden kódra egyszerre érvényesek, a jobb oldali előnézet azonnal frissül.',
  },
  {
    icon: 'lucide:package',
    title: 'Töltsd le egyben',
    text: 'ZIP PNG-vel vagy SVG-vel, plusz CSV-riport a fájlnevekkel, vagy A4-es nyomtatóív a kiosztáshoz.',
  },
]
</script>

<template>
  <div>
    <section class="border-b border-slate-200/80 bg-surface">
      <div class="container-page pb-9 pt-5">
        <ContentBreadcrumbs :items="[{ label: 'Főoldal', to: '/' }, { label: 'Tömeges QR-kód generálás', to: undefined }]" />
        <div class="mt-6 max-w-3xl">
          <span class="eyebrow">Eszköz</span>
          <h1 class="mt-3 text-3xl leading-tight sm:text-4xl">Tömeges QR-kód generálás</h1>
          <p class="mt-4 text-[1.02rem] leading-relaxed text-ink-soft">
            Készíts egyszerre akár {{ BULK_LIMIT }} QR-kódot: illessz be egy listát vagy tölts fel CSV-t,
            válaszd ki a megjelenést, majd vidd el ZIP-ben, nyomtatóíven vagy riporttal.
            A kódok a böngésződben készülnek, a lista nem kerül szerverre.
          </p>

          <ul class="mt-5 flex flex-wrap gap-2 text-xs font-medium">
            <li class="rounded-full bg-brand-50 px-3 py-1 text-brand-800">{{ BULK_LIMIT }} kód / tétel</li>
            <li class="rounded-full bg-brand-50 px-3 py-1 text-brand-800">ZIP: PNG vagy SVG</li>
            <li class="rounded-full bg-brand-50 px-3 py-1 text-brand-800">A4-es nyomtatóív</li>
            <li class="rounded-full bg-brand-50 px-3 py-1 text-brand-800">Fiók nélkül</li>
          </ul>
        </div>
      </div>
    </section>

    <div class="container-page py-8">
      <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <div class="space-y-6">
          <BulkInput v-model="raw" :result="result" :limit="BULK_LIMIT">
            <template #actions>
              <button type="button" class="btn-ghost h-9 px-3 text-sm" @click="raw = SAMPLE">
                <Icon name="lucide:sparkles" class="h-4 w-4" aria-hidden="true" />
                Minta
              </button>
              <button type="button" class="btn-ghost h-9 px-3 text-sm" @click="raw = ''">
                <Icon name="lucide:eraser" class="h-4 w-4" aria-hidden="true" />
                Törlés
              </button>
            </template>
          </BulkInput>

          <section class="card p-5 sm:p-6" aria-labelledby="bulk-design-heading">
            <p class="text-xs font-semibold uppercase tracking-wide text-brand-700">2. lépés</p>
            <h2 id="bulk-design-heading" class="mt-1 text-xl">Megjelenés</h2>
            <p class="mt-2 text-sm leading-relaxed text-ink-soft">
              Ezek a beállítások minden kódra érvényesek. A jobb oldali előnézet azonnal követi a változtatásokat.
            </p>
            <div class="mt-4">
              <QrCustomizer />
            </div>
          </section>

          <section class="card p-5 sm:p-6" aria-labelledby="bulk-download-heading">
            <p class="text-xs font-semibold uppercase tracking-wide text-brand-700">3. lépés</p>
            <h2 id="bulk-download-heading" class="mt-1 text-xl">Letöltés</h2>
            <p class="mt-2 text-sm leading-relaxed text-ink-soft">
              {{ result.valid.length }} kód áll készen. A ZIP-ben fájlonként egy kép és egy
              <code class="rounded bg-slate-100 px-1.5 py-0.5 text-[0.8em]">riport.csv</code> lesz.
            </p>

            <div class="mt-4 flex flex-wrap items-end gap-3">
              <label class="text-sm">
                <span class="mb-1 block font-medium text-ink">PNG méret</span>
                <select v-model.number="pngSize" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option :value="512">512 × 512 px</option>
                  <option :value="1024">1024 × 1024 px</option>
                </select>
              </label>
            </div>

            <div class="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                class="btn-primary h-11 justify-center"
                :disabled="!result.valid.length || isWorking"
                @click="downloadZip(result.valid, customization, 'png', pngSize)"
              >
                <Icon name="lucide:download" class="h-4 w-4" aria-hidden="true" />
                ZIP – PNG kódok
              </button>
              <button
                type="button"
                class="btn-secondary h-11 justify-center"
                :disabled="!result.valid.length || isWorking"
                @click="downloadZip(result.valid, customization, 'svg', pngSize)"
              >
                <Icon name="lucide:file-code-2" class="h-4 w-4" aria-hidden="true" />
                ZIP – SVG kódok
              </button>
              <button
                type="button"
                class="btn-secondary h-11 justify-center"
                :disabled="!result.valid.length || isWorking"
                @click="printSheet(result.valid, customization)"
              >
                <Icon name="lucide:printer" class="h-4 w-4" aria-hidden="true" />
                Nyomtatóív (A4)
              </button>
              <button
                type="button"
                class="btn-secondary h-11 justify-center"
                :disabled="!result.valid.length || isWorking"
                @click="downloadCsv(result.valid)"
              >
                <Icon name="lucide:file-spreadsheet" class="h-4 w-4" aria-hidden="true" />
                CSV riport
              </button>
            </div>

            <div v-if="isWorking" class="mt-4">
              <div class="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div class="h-full rounded-full bg-brand-600 transition-all" :style="{ width: `${Math.round(progress * 100)}%` }" />
              </div>
              <p class="mt-1.5 text-xs text-ink-muted">
                Készítés… {{ Math.round(progress * 100) }}% – a nagyobb tételeknél ez néhány másodpercig tart.
              </p>
            </div>

            <p v-if="error" class="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {{ error }}
            </p>
          </section>
        </div>

        <aside class="lg:sticky lg:top-28">
          <div class="card p-4">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-sm font-semibold text-ink">Előnézet</h2>
              <span class="text-xs text-ink-muted">{{ result.valid.length }} / {{ BULK_LIMIT }}</span>
            </div>

            <div v-if="previewRow" class="mt-3">
              <BulkCode
                :data="previewRow.url"
                :customization="customization"
                :label="previewRow.label"
                :size="512"
              />
            </div>
            <p v-else class="mt-3 rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-ink-muted">
              Adj meg legalább egy érvényes webcímet a bal oldalon.
            </p>

            <p v-if="previewRow && result.valid.length > 1" class="mt-2 text-xs text-ink-muted">
              Az előnézet az első kódot mutatja, a letöltés mind a {{ result.valid.length }} kódot tartalmazza.
            </p>
          </div>

          <div class="mt-3 rounded-xl border border-brand-100 bg-brand-50/70 p-4">
            <p class="flex items-start gap-2 text-sm leading-relaxed text-brand-900">
              <Icon name="lucide:shield-check" class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              A lista a böngészőben marad. Ha a célcím később változhat, válaszd a dinamikus QR-kódot:
              ott a kód ugyanaz marad, csak a mögötte lévő cím módosul.
            </p>
            <NuxtLink to="/dinamikus-qr-kod" class="mt-2 inline-flex text-sm font-semibold text-brand-800 hover:underline">
              Dinamikus QR-kódok
            </NuxtLink>
          </div>
        </aside>
      </div>

      <section class="mt-12" aria-labelledby="bulk-how-heading">
        <h2 id="bulk-how-heading" class="text-2xl">Hogyan működik?</h2>
        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          <div v-for="step in steps" :key="step.title" class="card p-4">
            <span class="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <Icon :name="step.icon" class="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 class="mt-3 text-base font-semibold">{{ step.title }}</h3>
            <p class="mt-1 text-sm leading-relaxed text-ink-soft">{{ step.text }}</p>
          </div>
        </div>
      </section>

      <div class="mt-12 max-w-3xl">
        <ContentFaqAccordion :faqs="faqs" heading="Gyakori kérdések a tömeges generálásról" />
      </div>
    </div>
  </div>
</template>
