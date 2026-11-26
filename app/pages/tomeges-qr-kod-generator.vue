<script setup lang="ts">
import { BULK_LIMIT, buildSequence, bulkColumns, bulkSample, parseBulkInput } from '#shared/bulk'
import { QR_MENU_ORDER, getQrType } from '#shared/qr/content'
import type { QrTypeId } from '#shared/qr/types'
import type { ContentFaq, ContentSection, RelatedLink } from '#shared/content/types'
import { contentAnchor } from '~/utils/content'

/** A tömeges listában a szöveg az első, mert ehhez kell a legkevesebb oszlop. */
const BULK_TYPE_ORDER: QrTypeId[] = ['text', ...QR_MENU_ORDER.filter(id => id !== 'text')]
const typeOptions = BULK_TYPE_ORDER.map(id => getQrType(id))
const type = ref<QrTypeId>('text')
const definition = computed(() => getQrType(type.value))

const raw = ref(bulkSample('text'))
const result = computed(() => parseBulkInput(raw.value, { type: type.value, limit: BULK_LIMIT }))
const { customization } = useQrCustomization()
const { isWorking, progress, error, downloadZip, downloadCsv, printSheet } = useBulkDownload()

const pngSize = ref(512)
// A többi generátorhoz hasonlóan egyetlen kód látszik előnézetben.
const previewRow = computed(() => result.value.valid[0] ?? null)

const columns = computed(() => bulkColumns(type.value))
const placeholder = computed(() => bulkSample(type.value))
const hint = computed(() => {
  const required = definition.value.fields.filter(field => field.required).map(field => field.key)
  return `${definition.value.description} Oszlopok: ${columns.value.join('; ')} – a név (name) elhagyható, és fejlécsor is használható.`
    + (required.length ? ` Kötelező: ${required.join(', ')}.` : '')
})

function selectType(next: QrTypeId) {
  if (type.value === next) return
  const previousSample = bulkSample(type.value)
  type.value = next
  // A mintát csak akkor cseréljük, ha a felhasználó még nem írt saját adatot.
  if (!raw.value.trim() || raw.value === previousSample) raw.value = bulkSample(next)
}

const sequence = reactive({ start: 1, end: 10, step: 1, pad: 2, prefix: '', suffix: '', append: false })
const sequenceValues = computed(() => buildSequence({ ...sequence, limit: BULK_LIMIT }))

function createSequence() {
  const values = sequenceValues.value
  if (!values.length) return
  raw.value = sequence.append && raw.value.trim()
    ? `${raw.value.replace(/\n+$/, '')}\n${values.join('\n')}`
    : values.join('\n')
}

const HERO_BADGES = [
  { label: `${typeOptions.length} QR-típus`, icon: 'lucide:layout-grid', color: 'bg-brand-100 text-brand-700' },
  { label: `${BULK_LIMIT} kód / tétel`, icon: 'lucide:layers', color: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' },
  { label: 'ZIP: PNG vagy SVG', icon: 'lucide:download', color: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' },
]

const intro = [
  'A tömeges generátorral egyetlen menetben készíthetsz akár száz QR-kódot ugyanazzal a motorral, mint az egyedi generátor: csak beillesztesz egy listát, feltöltesz egy CSV-t vagy előállítasz egy sorszám-sorozatot, és a kész kódokat ZIP-ben, nyomtatóíven vagy CSV-riporttal viheted tovább.',
  'A típus kiválasztásával az oszlopok és a minta is a választott típushoz igazodik – webcím, szöveg, Wi-Fi, névjegy, kupon és a többi. A kódok a böngésződben készülnek, a lista nem kerül fel a szerverre, és fiók sem kell hozzá.',
]

const sections: ContentSection[] = [
  {
    heading: 'Hogyan készül el a tömeges QR-kód?',
    paragraphs: [
      'A lista minden érvényes sora egy-egy önálló QR-kódot eredményez. A generátor soronként összeállítja a tartalmat a választott típus mezőiből, majd ugyanazzal a beállítással rajzolja ki a képet – így a tételek kinézete egységes marad.',
      'A feldolgozás előtt a program ellenőrzi a sorokat: jelzi a hiányzó kötelező mezőket, a hibás formátumot és az ismétlődő tartalmat. Csak az érvényes sorokból lesz kód, a hibás sorok javítására a lista mellett külön figyelmeztetést kapsz.',
    ],
    bullets: [
      'Válaszd ki a típust a felső választóból – ezzel az oszlopok is beállnak.',
      'Illessz be egy listát, tölts fel CSV-t, vagy generálj sorszám-sorozatot.',
      'Ellenőrizd a darabszámot és a hibás sorokat, majd állítsd be a megjelenést.',
      'Töltsd le ZIP-ben, nyomtatóíven vagy CSV-riporttal.',
    ],
    tip: 'A fejlécsor használatával a sorrend nem számít, csak az oszlopnevek egyezzenek a mezőnevekkel – így egy korábbi táblázatot változtatás nélkül újrahasználhatsz.',
  },
  {
    heading: 'Milyen QR-kódot készíthetsz tömegesen?',
    paragraphs: [
      'A generátor minden típusa elérhető: webcím, szöveg, Wi-Fi, vCard névjegy, telefonszám, e-mail, SMS, WhatsApp, banki átutalás, PayPal, kupon, esemény, étlap, PDF, alkalmazás, közösségi profil, helyszín és a többi. Egy tételen belül mindig egy típus szerepel, mert az oszlopok a típus mezőihez igazodnak.',
      'A gyakorlatban ez azt jelenti, hogy például száz különböző asztal és száz étlap-link, száz kuponkód vagy száz termék Wi-Fi-adatlapja egyetlen listából készülhet el. Ha több típusra van szükség, készíts több tételt – a beállítások a következő tételnél is megmaradnak.',
    ],
    bullets: [
      'Kuponok és egyedi kódok sorszám-sorozattal, elő- és utótaggal.',
      'Névjegyek és Wi-Fi adatok CSV-importból, fejlécsorral.',
      'Étlapok, árlisták és események linkjei egy kattintással.',
    ],
  },
  {
    heading: 'Testreszabás és letöltés',
    paragraphs: [
      'A megjelenés beállításai – előtér- és háttérszín, pontok, sarokelemek, keret, logó, hibajavítási szint és csendes zóna – a teljes tételre érvényesek, így a kódok egységes arculatot kapnak. Az előnézet az első kódot mutatja, a letöltés viszont minden érvényes sort tartalmaz.',
      'ZIP-ben fájlonként egy képet kapsz PNG vagy SVG formátumban, a fájlnevek a sorszámból és a megadott névből képződnek. A CSV-riport a fájlneveket és a tartalmat tartalmazza, az A4-es nyomtatóív pedig kivágásra kész rácsban rendezi a kódokat.',
    ],
    bullets: [
      'PNG 512 vagy 1024 pixel szélességben – webes használatra és üzenetküldésre.',
      'SVG vektorosan – nyomdai méretezéshez, minőségvesztés nélkül.',
      'A4-es nyomtatóív – asztali kártyákhoz és szórólapokhoz.',
      'CSV-riport – a fájlnevek és a tartalom áttekintéséhez.',
    ],
    tip: 'Nyomdai anyaghoz mindig SVG-t használj, és a ZIP kibontása után ellenőrizz néhány kódot a végleges méretben.',
  },
  {
    heading: 'Hogyan marad jól beolvasható?',
    paragraphs: [
      'A tömeges gyártás legnagyobb kockázata, hogy a hiba csak a nyomtatás után derül ki. Ezért érdemes a tétel első és utolsó kódját, valamint egy-egy középső elemet beolvasni még a nyomtatás előtt – a minta ugyanis minden kódon azonos felépítésű.',
      'A kontraszt legyen erős: sötét minta világos háttéren. A túl halvány színek, a nagy logó és a levágra kerülő csendes zóna mind rontja az olvashatóságot. Kisebb méretnél növeld a hibajavítási szintet, és hagyj elegendő üres sávot a kód körül.',
    ],
    bullets: [
      'A kód körül maradjon legalább 4 modulnyi üres sáv.',
      'Nyomtatásnál legalább 2 × 2 cm, üzleti használatban 3–4 cm.',
      'Ne tedd tükröződő felületre vagy erős UV-fénynek kitett helyre.',
      'Ellenőrizd a kódot legalább kétféle telefonnal, a valós méretben.',
    ],
  },
]

const faqs: ContentFaq[] = [
  {
    question: 'Milyen QR-típusokat tud tömegesen generálni?',
    answer:
      'A generátor összes típusát: webcím, szöveg, Wi-Fi, vCard névjegy, telefonszám, e-mail, SMS, WhatsApp, banki átutalás, PayPal, kupon, esemény, étlap, PDF, alkalmazás, közösségi profil, helyszín és a többi. A típust felül választod ki, az oszlopok pedig a típus mezőihez igazodnak.',
  },
  {
    question: 'Hogyan adom meg a több mezős típusokat, például a Wi-Fi-t?',
    answer:
      'Oszloponként, pontosvesszővel vagy tabulátorral elválasztva: például name;ssid;security;password;hidden. Fejlécsort is írhatsz, akkor a sorrend nem számít, csak az oszlopnevek egyezzenek a mezőkkel. A minta gomb mindig az adott típus helyes oszlopait tölti be.',
  },
  {
    question: 'Mire jó a sorszám-sorozat?',
    answer:
      'Egyedi kódok gyors előállítására: megadod a kezdő és végértéket, a lépést, a számjegyek számát, valamint egy elő- és utótagot, és a lista máris készül (például kupon-001 … kupon-100). A sorozatot hozzá is fűzheted a meglévő adatokhoz.',
  },
  {
    question: 'Hány QR-kódot tudok egyszerre legenerálni?',
    answer:
      'Egy tételben legfeljebb 100 kód készül el. Ha ennél több kell, bontsd több listára: a beállítások ugyanazok maradnak, csak a fájlnevek sorszámozása indul újra.',
  },
  {
    question: 'Feltöltődik a lista valahova?',
    answer:
      'Nem. A kódok a böngésződben készülnek, ugyanazzal a motorral, mint az egyedi generátoré, a lista nem kerül szerverre és nem tároljuk. Fiók nélkül is használható.',
  },
]

const related: RelatedLink[] = [
  { label: 'QR-kód generátor', to: '/qr-kod-generator', description: 'Egyedi kód élő előnézettel.' },
  { label: 'QR-kód készítés útmutató', to: '/qr-kod-keszites', description: 'A tervezéstől a tesztelésig.' },
  { label: 'Dinamikus QR-kód', to: '/dinamikus-qr-kod', description: 'Módosítható cél, statisztika.' },
  { label: 'QR-kód típusok', to: '/qr-kod-tipusok', description: 'Melyik típus mire való.' },
]

useContentSeo({
  slug: '/tomeges-qr-kod-generator',
  title: 'Tömeges QR-kód generátor – akár 100 kód, minden típusból',
  description:
    'Készíts egyszerre akár 100 QR-kódot bármelyik típusból: webcím, szöveg, Wi-Fi, vCard, kupon és a többi. Illessz be listát vagy tölts fel CSV-t, használj sorszám-sorozatot, majd töltsd le ZIP-ben (PNG, SVG), A4-es nyomtatóíven vagy CSV-riporttal – fiók nélkül, a böngésződben.',
  h1: 'Tömeges QR-kód generátor',
  faqs,
  isWebApp: true,
})

const tocItems = computed(() =>
  sections.map(section => ({
    label: section.heading,
    href: `#${contentAnchor(section.heading)}`,
  })),
)

const steps = [
  {
    icon: 'lucide:list-checks',
    title: 'Válassz típust',
    text: 'Webcím, szöveg, Wi-Fi, névjegy, kupon – az oszlopok és a minta a választott típushoz igazodnak.',
  },
  {
    icon: 'lucide:palette',
    title: 'Adj meg adatokat',
    text: 'Beillesztés, CSV, vagy sorszám-sorozat. A hibás és ismétlődő sorokat generálás előtt jelzi.',
  },
  {
    icon: 'lucide:package',
    title: 'Töltsd le egyben',
    text: 'ZIP PNG-vel vagy SVG-vel, CSV-riport a fájlnevekkel, vagy A4-es nyomtatóív a kiosztáshoz.',
  },
]
</script>

<template>
  <div>
    <GeneratorHero
      eyebrow="Eszköz"
      heading="Tömeges QR-kód generátor"
      description="Készíts egyszerre akár száz QR-kódot bármelyik típusból. Illessz be egy listát, tölts fel CSV-t vagy generálj sorszám-sorozatot, majd vidd el ZIP-ben, nyomtatóíven vagy riporttal – regisztráció nélkül, a böngésződben."
      :badges="HERO_BADGES"
    />

    <div class="container-page py-8 lg:py-10">
      <QrTypeMenu
        class="-mt-28"
        :model-value="type"
        scroll-to="qr-type-selector"
        @update:model-value="selectType"
      />

      <div id="bulk-tool" class="mt-5 grid scroll-mt-24 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <div class="space-y-6">
          <BulkInput
            v-model="raw"
            :result="result"
            :limit="BULK_LIMIT"
            :hint="hint"
            :placeholder="placeholder"
            step-label="1. lépés"
            title="Adatok"
          >
            <template #actions>
              <button type="button" class="btn-ghost h-9 px-3 text-sm" @click="raw = placeholder">
                <Icon name="lucide:sparkles" class="h-4 w-4" aria-hidden="true" />
                Minta
              </button>
              <button type="button" class="btn-ghost h-9 px-3 text-sm" @click="raw = ''">
                <Icon name="lucide:eraser" class="h-4 w-4" aria-hidden="true" />
                Törlés
              </button>
            </template>
          </BulkInput>

          <details class="card p-5 sm:p-6">
            <summary class="cursor-pointer text-sm font-semibold text-ink">
              Sorszám-sorozat létrehozása
              <span class="ml-1 font-normal text-ink-muted">(pl. kupon-001 … kupon-100)</span>
            </summary>
            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <label class="text-sm">
                <span class="mb-1 block font-medium text-ink">Kezdő érték</span>
                <input v-model.number="sequence.start" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              </label>
              <label class="text-sm">
                <span class="mb-1 block font-medium text-ink">Végérték</span>
                <input v-model.number="sequence.end" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              </label>
              <label class="text-sm">
                <span class="mb-1 block font-medium text-ink">Lépés</span>
                <input v-model.number="sequence.step" type="number" min="1" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              </label>
              <label class="text-sm">
                <span class="mb-1 block font-medium text-ink">Számjegyek (nullázás)</span>
                <input v-model.number="sequence.pad" type="number" min="0" max="12" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              </label>
              <label class="text-sm">
                <span class="mb-1 block font-medium text-ink">Előtag</span>
                <input v-model="sequence.prefix" type="text" placeholder="kupon-" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              </label>
              <label class="text-sm">
                <span class="mb-1 block font-medium text-ink">Utótag</span>
                <input v-model="sequence.suffix" type="text" placeholder="-2026" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              </label>
            </div>
            <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div class="text-sm text-ink-soft">
                <p>{{ sequenceValues.length }} sor készül: <strong>{{ sequenceValues[0] || '–' }}</strong> … <strong>{{ sequenceValues[sequenceValues.length - 1] || '–' }}</strong></p>
                <label class="mt-2 flex items-center gap-2 text-xs text-ink-muted">
                  <input v-model="sequence.append" type="checkbox" class="h-4 w-4 rounded border-slate-300">
                  Hozzáfűzés a meglévő adatokhoz
                </label>
              </div>
              <button type="button" class="btn-secondary h-10 px-4" :disabled="!sequenceValues.length" @click="createSequence">
                <Icon name="lucide:list-plus" class="h-4 w-4" aria-hidden="true" />
                Sorozat beszúrása
              </button>
            </div>
          </details>

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
              {{ result.valid.length }} {{ definition.shortLabel }} kód áll készen. A ZIP-ben fájlonként egy kép és egy
              <code class="rounded bg-slate-100 px-1.5 py-0.5 text-[0.8em]">riport.csv</code> lesz.
            </p>

            <div class="mt-4 flex flex-wrap items-end gap-3">
              <label class="text-sm">
                <span class="mb-1 block font-medium text-ink">PNG méret</span>
                <select v-model.number="pngSize" class="rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm">
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
                @click="downloadZip(result.valid, customization, 'png', pngSize, definition.shortLabel)"
              >
                <Icon name="lucide:download" class="h-4 w-4" aria-hidden="true" />
                ZIP – PNG kódok
              </button>
              <button
                type="button"
                class="btn-secondary h-11 justify-center"
                :disabled="!result.valid.length || isWorking"
                @click="downloadZip(result.valid, customization, 'svg', pngSize, definition.shortLabel)"
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
                @click="downloadCsv(result.valid, definition.shortLabel)"
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

            <p v-if="error" class="mt-3 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
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
                :data="previewRow.payload"
                :customization="customization"
                :label="previewRow.label"
                :size="512"
              />
            </div>
            <p v-else class="mt-3 rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-ink-muted">
              Adj meg legalább egy érvényes sort a bal oldalon.
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

      <div class="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
        <article class="min-w-0">
          <div class="mb-8 space-y-3 text-[1.02rem] leading-relaxed text-ink-soft">
            <p v-for="paragraph in intro" :key="paragraph">{{ paragraph }}</p>
          </div>

          <ContentArticle :sections="sections" :show-guide-ad="true" />

          <ContentFaqAccordion :faqs="faqs" id="gyik" heading="Gyakori kérdések a tömeges generálásról" class="mt-10" />

          <ContentRelatedLinks :links="related" />

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
        </article>

        <aside class="hidden lg:block" aria-label="Oldalsáv">
          <div class="sticky top-24 space-y-5">
            <nav class="card p-4" aria-labelledby="toc-heading">
              <h2 id="toc-heading" class="text-sm font-semibold text-ink">Ezen az oldalon</h2>
              <ul class="mt-2.5 space-y-1.5">
                <li v-for="item in tocItems" :key="item.href">
                  <a
                    :href="item.href"
                    class="block rounded px-1 py-1 text-xs leading-relaxed text-ink-muted hover:text-brand-700"
                  >
                    {{ item.label }}
                  </a>
                </li>
              </ul>
            </nav>

            <div class="card p-5">
              <h2 class="text-base font-semibold">Egyetlen kód kell?</h2>
              <p class="mt-2 text-sm leading-relaxed text-ink-soft">
                Az egyedi generátorban élő előnézettel, logóval és több exportformátummal dolgozhatsz.
              </p>
              <NuxtLink to="/qr-kod-generator" class="btn-primary mt-3 w-full justify-center">
                QR-kód generátor
              </NuxtLink>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>
