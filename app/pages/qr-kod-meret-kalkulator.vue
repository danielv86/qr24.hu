<script setup lang="ts">
import type { ErrorCorrectionLevel } from '#shared/qr/types'
import { buildQrMatrix } from '~/utils/qr-render'

const EXAMPLE = 'https://qrkod24.hu'

const data = ref(EXAMPLE)
const level = ref<ErrorCorrectionLevel>('M')
const quiet = ref(4)
const widthMm = ref(40)
const distanceCm = ref(40)
const dpi = ref(300)

const levels: { value: ErrorCorrectionLevel; label: string; hint: string }[] = [
  { value: 'L', label: 'L – 7%', hint: 'Legkevesebb modul, legkisebb kód. Tiszta, rövid tartalomhoz.' },
  { value: 'M', label: 'M – 15%', hint: 'Általános választás: jó egyensúly méret és biztonság között.' },
  { value: 'Q', label: 'Q – 25%', hint: 'Koszos felület, nyomdai kopás vagy kisebb logó mellé.' },
  { value: 'H', label: 'H – 30%', hint: 'Logóval takart kódhoz és nehéz körülményekhez ajánlott.' },
]

const payload = computed(() => data.value.trim() || EXAMPLE)

/** A beviteli mezők értékét biztonságos tartományba tesszük a számítás előtt. */
function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

const safeWidth = computed(() => clamp(widthMm.value, 10, 300, 40))
const safeDistance = computed(() => clamp(distanceCm.value, 5, 300, 40))
const safeQuiet = computed(() => clamp(Math.round(quiet.value), 0, 8, 4))
const safeDpi = computed(() => clamp(dpi.value, 72, 600, 300))

const matrix = computed<boolean[][]>(() => {
  try {
    return buildQrMatrix(payload.value, level.value)
  } catch {
    return []
  }
})

const tooLong = computed(() => matrix.value.length === 0)
const modules = computed(() => matrix.value.length)
const totalModules = computed(() => modules.value + safeQuiet.value * 2)
const version = computed(() => (modules.value ? (modules.value - 17) / 4 : 0))

const moduleMm = computed(() => (totalModules.value ? safeWidth.value / totalModules.value : 0))
const modulePx = computed(() => (moduleMm.value / 25.4) * safeDpi.value)
const widthPx = computed(() => Math.round((safeWidth.value / 25.4) * safeDpi.value))

/** Ökölszabály: a kód oldalhossza nagyjából a beolvasási távolság egytizede. */
const recommendedMm = computed(() => Math.max(20, Math.round(safeDistance.value * 10)))
const maxDistanceCm = computed(() => Math.round(safeWidth.value / 10))

type Tone = 'good' | 'warn' | 'bad'

const sizeVerdict = computed<{ tone: Tone; label: string; text: string }>(() => {
  if (safeWidth.value >= recommendedMm.value) {
    return {
      tone: 'good',
      label: 'Jól olvasható',
      text: `A kód ${formatNumber(safeWidth.value)} mm széles, ami elég a ${formatNumber(safeDistance.value)} cm-es távolsághoz.`,
    }
  }
  if (safeWidth.value >= recommendedMm.value * 0.7) {
    return {
      tone: 'warn',
      label: 'Határeset',
      text: `Ajánlott legalább ${formatNumber(recommendedMm.value)} mm ehhez a távolsághoz. Jó fény és éles nyomat mellett működhet.`,
    }
  }
  return {
    tone: 'bad',
    label: 'Túl kicsi',
    text: `Ehhez a távolsághoz legalább ${formatNumber(recommendedMm.value)} mm széles kód kell. Növeld a méretet vagy csökkentsd a távolságot.`,
  }
})

const moduleVerdict = computed<{ tone: Tone; label: string }>(() => {
  if (moduleMm.value >= 0.4) return { tone: 'good', label: 'Nyomdára megfelelő' }
  if (moduleMm.value >= 0.25) return { tone: 'warn', label: 'Csak jó minőségű nyomdával' }
  return { tone: 'bad', label: 'Nyomdában összefolyik' }
})

const dpiNeeded = computed(() => (moduleMm.value > 0 ? Math.ceil((2 * 25.4) / moduleMm.value) : 0))

function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString('hu-HU', { maximumFractionDigits: digits, minimumFractionDigits: 0 })
}

function formatMm(value: number): string {
  return `${formatNumber(value, value < 10 ? 2 : 1)} mm`
}

const tones: Record<Tone, string> = {
  good: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900',
  warn: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900',
  bad: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900',
}

const printSizes = [
  { label: 'Névjegykártya mező', mm: 30 },
  { label: 'Matrica (kis)', mm: 40 },
  { label: 'Szórólap, asztali kártya', mm: 50 },
  { label: 'A6 – kártya', mm: 90 },
  { label: 'A5 – szórólap', mm: 120 },
  { label: 'A4 – plakát', mm: 160 },
  { label: 'A3 – poszter', mm: 220 },
]

const printRows = computed(() =>
  printSizes.map((preset) => {
    const module = totalModules.value ? preset.mm / totalModules.value : 0
    const tone: Tone = module >= 0.4 ? 'good' : module >= 0.25 ? 'warn' : 'bad'
    return {
      ...preset,
      module,
      tone,
      status: tone === 'good' ? 'Megfelelő' : tone === 'warn' ? 'Határeset' : 'Túl kicsi',
    }
  }),
)

const previewSvg = computed(() => {
  const rows = matrix.value
  if (!rows.length) return ''
  const count = rows.length
  const side = count + safeQuiet.value * 2
  const parts: string[] = []
  for (let row = 0; row < count; row += 1) {
    let column = 0
    while (column < count) {
      if (!rows[row]![column]) {
        column += 1
        continue
      }
      const start = column
      while (column < count && rows[row]![column]) column += 1
      parts.push(`M${start + safeQuiet.value} ${row + safeQuiet.value}h${column - start}v1h-${column - start}z`)
    }
  }
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" class="h-full w-full" role="img" aria-label="A számított QR-kód előnézete">`,
    `<rect width="${side}" height="${side}" fill="#ffffff"/>`,
    `<path d="${parts.join('')}" fill="#111827"/>`,
    '</svg>',
  ].join('')
})

const faqs = [
  {
    question: 'Mekkora legyen a QR-kód a nyomtatáshoz?',
    answer:
      'Az ökölszabály szerint a kód oldalhossza legyen legalább a beolvasási távolság egytizede: 30 cm-ről olvasott kódnál 3 cm, 1 méterről 10 cm. Nyomdában a modulméret ne legyen kisebb 0,4 mm-nél, mert a festék szétterjedése összefolyatja a pontokat.',
  },
  {
    question: 'Számít a hibajavítási szint a méretre?',
    answer:
      'Igen. A magasabb hibajavítás több ellenőrző modult ír a kódba, ezért ugyanahhoz a tartalomhoz nagyobb kód kell. Az L szint a legkisebb, a H a legnagyobb és legellenállóbb. Logó vagy sérülés esetén mégis a H-t érdemes választani, mert a nagyobb méret is jobban olvasható.',
  },
  {
    question: 'Hány pixel kell a képernyőre?',
    answer:
      'A nyomtatott méretet 300 DPI-vel érdemes számolni, de a QR-kódnál fontosabb, hogy egy modul legalább 2 képpont legyen. A kalkulátor kiszámolja a szükséges DPI-t a beállított mérethez, és megmutatja a pixelméretet is.',
  },
  {
    question: 'Miért van szükség csendes zónára?',
    answer:
      'A kód körüli üres sáv segít a kamerának megtalálni a kód széleit. A szabvány 4 modul szélességet ír elő. Ha a kódot színes háttérre vagy kép mellé teszed, ez a sáv eltűnhet, ezért a kalkulátor a csendes zónát is beleszámolja a méretbe.',
  },
]

useContentSeo({
  slug: '/qr-kod-meret-kalkulator',
  title: 'QR-kód méretkalkulátor – mekkora legyen a QR-kód?',
  description:
    'Számold ki, mekkora QR-kód kell a nyomtatáshoz vagy a képernyőre: modulszám, nyomdai méret, pixelméret és beolvasási távolság egy helyen, ingyen.',
  h1: 'QR-kód méretkalkulátor',
  faqs,
  isWebApp: true,
})
</script>

<template>
  <div>
    <section class="border-b border-slate-200/80 bg-surface">
      <div class="container-page pb-9 pt-5">
        <ContentBreadcrumbs
          :items="[{ label: 'Főoldal', to: '/' }, { label: 'QR-kód méretkalkulátor', to: undefined }]"
        />
        <div class="mt-6 max-w-3xl">
          <span class="eyebrow">App</span>
          <h1 class="mt-3 text-3xl leading-tight sm:text-4xl">QR-kód méretkalkulátor</h1>
          <p class="mt-4 text-[1.02rem] leading-relaxed text-ink-soft">
            Add meg a tartalmat és a tervezett méretet, mi kiszámoljuk a modulméretet, a nyomdai
            mérethez szükséges felbontást és azt a távolságot, ahonnan a kód még biztosan olvasható.
          </p>
        </div>
      </div>
    </section>

    <div class="container-page py-8">
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div class="space-y-6">
          <section class="card p-5 sm:p-6" aria-labelledby="calc-settings">
            <h2 id="calc-settings" class="text-lg font-semibold">Adatok</h2>

            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label for="calc-data" class="text-sm font-medium text-ink">A QR-kód tartalma</label>
                <textarea
                  id="calc-data"
                  v-model="data"
                  rows="3"
                  maxlength="1200"
                  class="mt-1.5 w-full rounded-xl border border-slate-300 bg-surface px-3 py-2 text-sm text-ink shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  placeholder="https://pelda.hu"
                />
                <p class="mt-1 text-xs text-ink-muted">
                  Rövid tartalomhoz kevesebb modul kell, így kisebb méretben is olvasható lesz.
                </p>
              </div>

              <div>
                <label for="calc-level" class="text-sm font-medium text-ink">Hibajavítási szint</label>
                <select
                  id="calc-level"
                  v-model="level"
                  class="mt-1.5 w-full rounded-xl border border-slate-300 bg-surface px-3 py-2 text-sm text-ink shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                >
                  <option v-for="option in levels" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <p class="mt-1 text-xs text-ink-muted">
                  {{ levels.find(option => option.value === level)?.hint }}
                </p>
              </div>

              <div>
                <label for="calc-quiet" class="text-sm font-medium text-ink">
                  Csendes zóna: {{ quiet }} modul
                </label>
                <input
                  id="calc-quiet"
                  v-model.number="quiet"
                  type="range"
                  min="0"
                  max="8"
                  step="1"
                  class="mt-3 w-full accent-brand-600"
                >
                <p class="mt-1 text-xs text-ink-muted">A szabvány szerinti ajánlott érték 4 modul.</p>
              </div>
            </div>

            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label for="calc-width" class="text-sm font-medium text-ink">
                  Tervezett szélesség: {{ formatNumber(safeWidth) }} mm
                </label>
                <input
                  id="calc-width"
                  v-model.number="widthMm"
                  type="range"
                  min="10"
                  max="300"
                  step="1"
                  class="mt-3 w-full accent-brand-600"
                >
                <input
                  v-model.number="widthMm"
                  type="number"
                  min="10"
                  max="300"
                  aria-label="Tervezett szélesség milliméterben"
                  class="mt-2 w-28 rounded-lg border border-slate-300 bg-surface px-2 py-1 text-sm text-ink"
                >
              </div>

              <div>
                <label for="calc-distance" class="text-sm font-medium text-ink">
                  Beolvasási távolság: {{ formatNumber(safeDistance) }} cm
                </label>
                <input
                  id="calc-distance"
                  v-model.number="distanceCm"
                  type="range"
                  min="5"
                  max="300"
                  step="5"
                  class="mt-3 w-full accent-brand-600"
                >
                <input
                  v-model.number="distanceCm"
                  type="number"
                  min="5"
                  max="300"
                  aria-label="Beolvasási távolság centiméterben"
                  class="mt-2 w-28 rounded-lg border border-slate-300 bg-surface px-2 py-1 text-sm text-ink"
                >
              </div>

              <div class="sm:col-span-2">
                <label for="calc-dpi" class="text-sm font-medium text-ink">Felbontás a képernyőre / nyomdába</label>
                <select
                  id="calc-dpi"
                  v-model.number="dpi"
                  class="mt-1.5 w-full rounded-xl border border-slate-300 bg-surface px-3 py-2 text-sm text-ink shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 sm:w-56"
                >
                  <option :value="72">72 DPI – képernyő</option>
                  <option :value="150">150 DPI – irodai nyomtatás</option>
                  <option :value="300">300 DPI – nyomda</option>
                  <option :value="600">600 DPI – prémium nyomda</option>
                </select>
              </div>
            </div>
          </section>

          <section class="card p-5 sm:p-6" aria-labelledby="calc-result">
            <h2 id="calc-result" class="text-lg font-semibold">Eredmény</h2>

            <p
              v-if="tooLong"
              class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
              role="alert"
            >
              Ez a tartalom túl hosszú ehhez a hibajavítási szinthez. Rövidítsd a szöveget, vagy
              válassz alacsonyabb hibajavítást (M vagy L).
            </p>

            <div v-else class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div class="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:bg-slate-900/40">
                <p class="text-xs text-ink-muted">Verzió / modulok</p>
                <p class="mt-1 text-xl font-semibold text-ink">{{ version }}</p>
                <p class="text-xs text-ink-muted">{{ modules }} × {{ modules }} modul</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:bg-slate-900/40">
                <p class="text-xs text-ink-muted">Egy modul mérete</p>
                <p class="mt-1 text-xl font-semibold text-ink">{{ formatMm(moduleMm) }}</p>
                <p class="text-xs text-ink-muted">{{ formatNumber(modulePx, 1) }} px @ {{ safeDpi }} DPI</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:bg-slate-900/40">
                <p class="text-xs text-ink-muted">Kép mérete</p>
                <p class="mt-1 text-xl font-semibold text-ink">{{ formatNumber(widthPx) }} px</p>
                <p class="text-xs text-ink-muted">{{ formatMm(safeWidth) }} szélességnél</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:bg-slate-900/40">
                <p class="text-xs text-ink-muted">Olvasható távolság</p>
                <p class="mt-1 text-xl font-semibold text-ink">kb. {{ formatNumber(maxDistanceCm) }} cm</p>
                <p class="text-xs text-ink-muted">10:1 ökölszabály szerint</p>
              </div>
            </div>

            <div v-if="!tooLong" class="mt-4 flex flex-wrap gap-2">
              <span class="rounded-full border px-3 py-1 text-xs font-semibold" :class="tones[sizeVerdict.tone]">
                {{ sizeVerdict.label }}
              </span>
              <span class="rounded-full border px-3 py-1 text-xs font-semibold" :class="tones[moduleVerdict.tone]">
                {{ moduleVerdict.label }}
              </span>
            </div>

            <p v-if="!tooLong" class="mt-3 text-sm leading-relaxed text-ink-soft">{{ sizeVerdict.text }}</p>
            <p v-if="!tooLong" class="mt-1 text-sm leading-relaxed text-ink-soft">
              Nyomdai mérethez legalább {{ formatNumber(dpiNeeded) }} DPI kell ahhoz, hogy egy modul
              2 képpont legyen. A csendes zóna {{ safeQuiet }} modul, ezért a teljes kód
              {{ totalModules }} modul széles: {{ formatMm(safeWidth) }} a nyomatott méret.
            </p>
          </section>

          <section class="card p-5 sm:p-6" aria-labelledby="calc-print">
            <h2 id="calc-print" class="text-lg font-semibold">Gyakori nyomtatási méretek</h2>
            <p class="mt-1 text-sm text-ink-muted">
              A táblázat a mostani tartalomhoz és hibajavításhoz számol. Zöld: kényelmesen olvasható.
            </p>
            <div class="mt-4 overflow-x-auto">
              <table class="w-full min-w-[420px] text-left text-sm">
                <thead class="text-xs uppercase tracking-wide text-ink-muted">
                  <tr class="border-b border-slate-200">
                    <th scope="col" class="py-2 pr-3 font-semibold">Felület</th>
                    <th scope="col" class="py-2 pr-3 font-semibold">Szélesség</th>
                    <th scope="col" class="py-2 pr-3 font-semibold">Modul</th>
                    <th scope="col" class="py-2 font-semibold">Értékelés</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in printRows" :key="row.label" class="border-b border-slate-100 last:border-0">
                    <td class="py-2 pr-3 text-ink-soft">{{ row.label }}</td>
                    <td class="py-2 pr-3 text-ink-soft">{{ row.mm }} mm</td>
                    <td class="py-2 pr-3 text-ink-soft">{{ formatNumber(row.module, 2) }} mm</td>
                    <td class="py-2">
                      <span class="rounded-full border px-2 py-0.5 text-[11px] font-semibold" :class="tones[row.tone]">
                        {{ row.status }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <AdSlot placement="content" :min-height="280" />

          <div class="card p-5 sm:p-6">
            <FaqAccordion id="meret-gyik" heading="Gyakori kérdések" :faqs="faqs" />
          </div>
        </div>

        <aside class="space-y-4">
          <div class="card p-5">
            <h2 class="text-sm font-semibold">Előnézet</h2>
            <div class="mt-3 rounded-xl border border-slate-200 bg-white p-3">
              <div v-if="previewSvg" class="mx-auto h-44 w-44" v-html="previewSvg" />
              <p v-else class="py-12 text-center text-xs text-ink-muted">Nincs érvényes tartalom.</p>
            </div>
            <p class="mt-2 text-center text-xs text-ink-muted">
              {{ formatMm(safeWidth) }} · {{ totalModules }} modul · csendes zóna {{ safeQuiet }}
            </p>
            <NuxtLink to="/qr-kod-generator" class="btn-primary mt-3 w-full justify-center text-sm">
              <Icon name="lucide:qr-code" class="h-4 w-4" aria-hidden="true" />
              Kód készítése
            </NuxtLink>
          </div>

          <div class="card p-5">
            <h2 class="text-sm font-semibold">Kapcsolódó eszközök</h2>
            <ul class="mt-3 space-y-2 text-sm">
              <li>
                <NuxtLink to="/qr-kod-olvaso" class="flex items-center gap-2 text-ink-soft hover:text-brand-800">
                  <Icon name="lucide:scan-line" class="h-4 w-4 text-brand-600" aria-hidden="true" />
                  QR-kód olvasó
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/qr-kod-nyomtatasra" class="flex items-center gap-2 text-ink-soft hover:text-brand-800">
                  <Icon name="lucide:printer" class="h-4 w-4 text-brand-600" aria-hidden="true" />
                  QR-kód nyomtatásra
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/qr-kod-tipusok" class="flex items-center gap-2 text-ink-soft hover:text-brand-800">
                  <Icon name="lucide:shapes" class="h-4 w-4 text-brand-600" aria-hidden="true" />
                  QR-kód típusok
                </NuxtLink>
              </li>
            </ul>
          </div>

          <AdSlot placement="sidebar" :min-height="600" />
        </aside>
      </div>
    </div>
  </div>
</template>
