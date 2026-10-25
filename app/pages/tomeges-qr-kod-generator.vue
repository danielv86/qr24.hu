<script setup lang="ts">
import { BULK_LIMIT, buildSequence, bulkColumns, bulkSample, parseBulkInput } from '#shared/bulk'
import { QR_MENU_ORDER, getQrType } from '#shared/qr/content'
import type { QrTypeId } from '#shared/qr/types'
import type { ContentFaq } from '#shared/content/types'

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
  const keys = definition.value.fields.map(field => field.key)
  const required = definition.value.fields.filter(field => field.required).map(field => field.key)
  return `Oszlopok: ${columns.value.join('; ')} – a név (name) elhagyható, és fejlécsor is használható.`
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

useContentSeo({
  slug: '/tomeges-qr-kod-generator',
  title: 'Tömeges QR-kód generálás – akár 100 kód, minden típusból',
  description:
    'Készíts egyszerre akár 100 QR-kódot bármelyik típusból: webcím, szöveg, Wi-Fi, vCard, kupon és a többi. Illessz be listát vagy tölts fel CSV-t, használj sorszám-sorozatot, majd töltsd le ZIP-ben (PNG, SVG), A4-es nyomtatóíven vagy CSV-riporttal – fiók nélkül, a böngésződben.',
  h1: 'Tömeges QR-kód generálás',
  faqs,
  isWebApp: true,
})

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
    <section class="border-b border-slate-200/80 bg-surface">
      <div class="container-page pb-9 pt-5">
        <ContentBreadcrumbs :items="[{ label: 'Főoldal', to: '/' }, { label: 'Tömeges QR-kód generálás', to: undefined }]" />
        <div class="mt-6 max-w-3xl">
          <span class="eyebrow">Eszköz</span>
          <h1 class="mt-3 text-3xl leading-tight sm:text-4xl">Tömeges QR-kód generálás</h1>
          <p class="mt-4 text-[1.02rem] leading-relaxed text-ink-soft">
            Készíts egyszerre akár {{ BULK_LIMIT }} QR-kódot bármelyik típusból: webcím, szöveg, Wi-Fi,
            névjegy, kupon és a többi. Illessz be egy listát, tölts fel CSV-t vagy generálj sorszám-sorozatot,
            majd vidd el ZIP-ben, nyomtatóíven vagy riporttal. A kódok a böngésződben készülnek.
          </p>

          <ul class="mt-5 flex flex-wrap gap-2 text-xs font-medium">
            <li class="rounded-full bg-brand-50 px-3 py-1 text-brand-800">{{ typeOptions.length }} QR-típus</li>
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
          <section class="card p-5 sm:p-6" aria-labelledby="bulk-type-heading">
            <p class="text-xs font-semibold uppercase tracking-wide text-brand-700">1. lépés</p>
            <h2 id="bulk-type-heading" class="mt-1 text-xl">QR-típus</h2>
            <p class="mt-2 text-sm leading-relaxed text-ink-soft">
              A választott típus dönti el, milyen oszlopokat vár a lista.
            </p>
            <div class="mt-4 flex max-h-64 flex-wrap gap-2 overflow-y-auto pr-1">
              <button
                v-for="option in typeOptions"
                :key="option.id"
                type="button"
                :aria-pressed="type === option.id"
                :class="[
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                  type === option.id
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-slate-200 bg-surface text-ink-soft hover:border-brand-300 hover:text-brand-800',
                ]"
                @click="selectType(option.id)"
              >
                <Icon :name="option.icon" class="h-4 w-4" aria-hidden="true" />
                {{ option.shortLabel }}
              </button>
            </div>

            <div class="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-ink-muted">
              <span class="font-semibold text-ink">Oszlopok:</span>
              <span class="ml-1 font-mono">{{ columns.join('; ') }}</span>
              <span class="mt-1 block">
                {{ definition.description }}
              </span>
            </div>
          </section>

          <BulkInput
            v-model="raw"
            :result="result"
            :limit="BULK_LIMIT"
            :hint="hint"
            :placeholder="placeholder"
            step-label="2. lépés"
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
            <p class="text-xs font-semibold uppercase tracking-wide text-brand-700">3. lépés</p>
            <h2 id="bulk-design-heading" class="mt-1 text-xl">Megjelenés</h2>
            <p class="mt-2 text-sm leading-relaxed text-ink-soft">
              Ezek a beállítások minden kódra érvényesek. A jobb oldali előnézet azonnal követi a változtatásokat.
            </p>
            <div class="mt-4">
              <QrCustomizer />
            </div>
          </section>

          <section class="card p-5 sm:p-6" aria-labelledby="bulk-download-heading">
            <p class="text-xs font-semibold uppercase tracking-wide text-brand-700">4. lépés</p>
            <h2 id="bulk-download-heading" class="mt-1 text-xl">Letöltés</h2>
            <p class="mt-2 text-sm leading-relaxed text-ink-soft">
              {{ result.valid.length }} {{ definition.shortLabel }} kód áll készen. A ZIP-ben fájlonként egy kép és egy
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
