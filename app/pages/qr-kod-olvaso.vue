<script setup lang="ts">
import jsQR from 'jsqr'

interface ScanResult {
  text: string
  kind: string
  icon: string
  href?: string
}

const MAX_FILE_BYTES = 12 * 1024 * 1024

const input = ref<HTMLInputElement | null>(null)
const previewUrl = ref('')
const fileName = ref('')
const dragging = ref(false)
const busy = ref(false)
const error = ref('')
const result = ref<ScanResult | null>(null)
const copied = ref(false)

function normalizeUrl(value: string): string {
  return /^www\./i.test(value) ? `https://${value}` : value
}

function classify(raw: string): ScanResult {
  const text = raw.trim()
  if (/^WIFI:/i.test(text)) return { text, kind: 'Wi-Fi kapcsolat', icon: 'lucide:wifi' }
  if (/^BEGIN:VCARD/i.test(text)) return { text, kind: 'Névjegy (vCard)', icon: 'lucide:contact-round' }
  if (/^BEGIN:VEVENT/i.test(text)) return { text, kind: 'Naptáresemény', icon: 'lucide:calendar-days' }
  if (/^MATMSG:/i.test(text) || /^mailto:/i.test(text)) {
    return { text, kind: 'E-mail', icon: 'lucide:mail', href: text.startsWith('mailto:') ? text : undefined }
  }
  if (/^tel:/i.test(text)) return { text, kind: 'Telefonszám', icon: 'lucide:phone', href: text }
  if (/^sms:|^SMSTO:/i.test(text)) return { text, kind: 'SMS', icon: 'lucide:message-square', href: text }
  if (/^geo:/i.test(text)) return { text, kind: 'Helyszín', icon: 'lucide:map-pin', href: text }
  if (/^(https?:\/\/|www\.)/i.test(text)) {
    return { text, kind: 'Weboldal', icon: 'lucide:globe', href: normalizeUrl(text) }
  }
  return { text, kind: 'Szöveg', icon: 'lucide:text' }
}

function decodeSource(source: CanvasImageSource, width: number, height: number): string | null {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('A böngésző nem támogatja a képfeldolgozást.')

  // Több méretben próbálkozunk: a kicsinyítés a zajt, a nagyítás az apró
  // modulokat segít olvasni. A legnagyobb él 1600 px marad, hogy gyors legyen.
  const longest = Math.max(width, height)
  const scales = [Math.min(1, 1600 / longest), 0.5, Math.min(2, 1600 / longest)]

  for (const scale of scales) {
    if (!Number.isFinite(scale) || scale <= 0) continue
    const w = Math.max(1, Math.round(width * scale))
    const h = Math.max(1, Math.round(height * scale))
    canvas.width = w
    canvas.height = h
    context.clearRect(0, 0, w, h)
    context.drawImage(source, 0, 0, w, h)
    const pixels = context.getImageData(0, 0, w, h)
    const code = jsQR(pixels.data, w, h, { inversionAttempts: 'attemptBoth' })
    if (code?.data) return code.data
  }
  return null
}

async function loadImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      return { source: bitmap, width: bitmap.width, height: bitmap.height }
    } catch {
      // SVG és néhány ritka formátum nem megy createImageBitmap-pel.
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = 'sync'
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('A kép megnyitása nem sikerült.'))
      image.src = url
    })
    return { source: image, width: image.naturalWidth, height: image.naturalHeight }
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function scanFile(file: File) {
  error.value = ''
  result.value = null
  copied.value = false

  if (!file.type.startsWith('image/')) {
    error.value = 'Csak képfájlt lehet feltölteni (PNG, JPG, WebP, GIF, SVG vagy BMP).'
    return
  }
  if (file.size > MAX_FILE_BYTES) {
    error.value = 'A kép legfeljebb 12 MB lehet. Kisebb kivágással is próbálkozhatsz.'
    return
  }

  busy.value = true
  try {
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = URL.createObjectURL(file)
    fileName.value = file.name

    const image = await loadImage(file)
    const text = decodeSource(image.source, image.width, image.height)
    if ('close' in image.source && typeof image.source.close === 'function') image.source.close()

    if (!text) {
      error.value =
        'Ezen a képen nem találtam olvasható QR-kódot. Próbálj élesebb, nagyobb felbontású képet, ahol a kód teljes egészében látszik.'
      return
    }
    result.value = classify(text)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'A kép feldolgozása nem sikerült.'
  } finally {
    busy.value = false
  }
}

function onPick(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) scanFile(file)
  ;(event.target as HTMLInputElement).value = ''
}

function onDrop(event: DragEvent) {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) scanFile(file)
}

function onPaste(event: ClipboardEvent) {
  const item = [...(event.clipboardData?.items || [])].find(entry => entry.type.startsWith('image/'))
  const file = item?.getAsFile()
  if (file) scanFile(file)
}

function reset() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  fileName.value = ''
  result.value = null
  error.value = ''
  copied.value = false
}

async function copyText() {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(result.value.text)
    copied.value = true
    window.setTimeout(() => (copied.value = false), 2200)
  } catch {
    error.value = 'A vágólap nem érhető el. Jelöld ki és másold ki kézzel a szöveget.'
  }
}

onMounted(() => window.addEventListener('paste', onPaste))
onBeforeUnmount(() => {
  window.removeEventListener('paste', onPaste)
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

const faqs = [
  {
    question: 'Feltöltődik a kép valahova?',
    answer:
      'Nem. A beolvasás a böngésződben történik, a kép nem hagyja el az eszközödet, és nem tároljuk. Ezért működik az oldal internetkapcsolat nélkül is, ha már betöltődött.',
  },
  {
    question: 'Miért nem olvasható be a QR-kódom?',
    answer:
      'A leggyakoribb okok: életlen kép, túl kicsi kód, alacsony kontraszt, levágott sarok vagy hiányzó csendes zóna. Próbáld meg közelebbről, egyenes szögben lefotózni, vagy használj nagyobb felbontású képet.',
  },
  {
    question: 'Milyen tartalmat ismer fel az olvasó?',
    answer:
      'A kódban tárolt nyers szöveget mindig megmutatja, és felismeri a weboldalakat, e-mail-címeket, telefonszámokat, Wi-Fi-adatokat, vCard névjegyeket, naptáreseményeket és helyszíneket is.',
  },
  {
    question: 'Beolvashatok kódról készült képernyőképet?',
    answer:
      'Igen. A képernyőképet a vágólapra másolva a Ctrl+V (macOS-en Cmd+V) billentyűvel közvetlenül beillesztheted, feltöltés nélkül.',
  },
]

useContentSeo({
  slug: '/qr-kod-olvaso',
  title: 'QR-kód olvasó – olvass be QR-kódot képből',
  description:
    'Ingyenes QR-kód olvasó: tölts fel vagy illessz be egy képet, és a böngésződben azonnal kiolvassuk a QR-kód tartalmát. Regisztráció nélkül, a kép nem hagyja el az eszközödet.',
  h1: 'QR-kód olvasó',
  faqs,
  isWebApp: true,
})
</script>

<template>
  <div>
    <section class="border-b border-slate-200/80 bg-surface">
      <div class="container-page pb-9 pt-5">
        <ContentBreadcrumbs :items="[{ label: 'Főoldal', to: '/' }, { label: 'QR-kód olvasó', to: undefined }]" />
        <div class="mt-6 max-w-3xl">
          <span class="eyebrow">App</span>
          <h1 class="mt-3 text-3xl leading-tight sm:text-4xl">QR-kód olvasó</h1>
          <p class="mt-4 text-[1.02rem] leading-relaxed text-ink-soft">
            Tölts fel egy fotót vagy képernyőképet a QR-kódról, és azonnal megmutatjuk, mi van benne.
            A beolvasás a böngésződben történik, a kép nem kerül fel a szerverre.
          </p>
        </div>
      </div>
    </section>

    <div class="container-page py-8">
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div class="space-y-6">
          <section class="card p-5 sm:p-6" aria-labelledby="scanner-heading">
            <h2 id="scanner-heading" class="text-lg font-semibold">Kép kiválasztása</h2>
            <p class="mt-1 text-sm text-ink-muted">
              Húzd ide a képet, illeszd be a vágólapról, vagy böngéssz a fájlok között.
            </p>

            <div
              class="mt-4 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors"
              :class="dragging ? 'border-brand-500 bg-brand-50/70' : 'border-slate-300 bg-slate-50/60 dark:bg-slate-900/40'"
              @dragover.prevent="dragging = true"
              @dragleave.prevent="dragging = false"
              @drop.prevent="onDrop"
            >
              <Icon name="lucide:image-up" class="mx-auto h-9 w-9 text-brand-600" aria-hidden="true" />
              <p class="mt-3 text-sm font-medium text-ink">Ejtsd ide a QR-kódot tartalmazó képet</p>
              <p class="mt-1 text-xs text-ink-muted">PNG, JPG, WebP, GIF vagy SVG · legfeljebb 12 MB</p>
              <button type="button" class="btn-primary mt-4" :disabled="busy" @click="input?.click()">
                <Icon name="lucide:folder-open" class="h-4 w-4" aria-hidden="true" />
                Kép kiválasztása
              </button>
              <input
                ref="input"
                type="file"
                accept="image/*"
                class="sr-only"
                @change="onPick"
              >
              <p class="mt-3 text-xs text-ink-muted">Vagy nyomd meg a Ctrl+V / Cmd+V billentyűt egy képernyőképhez.</p>
            </div>

            <p v-if="busy" class="mt-4 text-sm text-ink-soft" role="status">Beolvasás folyamatban…</p>
            <p v-if="error" class="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200" role="alert">
              {{ error }}
            </p>

            <div v-if="previewUrl" class="mt-5 grid gap-4 sm:grid-cols-[132px_minmax(0,1fr)]">
              <img
                :src="previewUrl"
                :alt="`Feltöltött kép: ${fileName}`"
                class="h-32 w-full rounded-xl border border-slate-200 bg-white object-contain p-1.5"
              >
              <div class="min-w-0">
                <p class="truncate text-xs text-ink-muted">{{ fileName }}</p>

                <div v-if="result" class="mt-2">
                  <p class="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Icon :name="result.icon" class="h-4 w-4 text-brand-600" aria-hidden="true" />
                    {{ result.kind }}
                  </p>
                  <p class="mt-1 break-words rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs leading-relaxed text-ink-soft dark:bg-slate-900/60">
                    {{ result.text }}
                  </p>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <button type="button" class="btn-secondary h-9 px-3 text-xs" @click="copyText">
                      <Icon :name="copied ? 'lucide:check' : 'lucide:copy'" class="h-3.5 w-3.5" aria-hidden="true" />
                      {{ copied ? 'Kimásolva' : 'Tartalom másolása' }}
                    </button>
                    <a
                      v-if="result.href"
                      :href="result.href"
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      class="btn-primary h-9 px-3 text-xs"
                    >
                      <Icon name="lucide:external-link" class="h-3.5 w-3.5" aria-hidden="true" />
                      Megnyitás
                    </a>
                    <button type="button" class="btn-ghost h-9 px-3 text-xs" @click="reset">
                      <Icon name="lucide:rotate-ccw" class="h-3.5 w-3.5" aria-hidden="true" />
                      Új kép
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="card p-5 sm:p-6" aria-labelledby="scanner-how">
            <h2 id="scanner-how" class="text-lg font-semibold">Így működik</h2>
            <ol class="mt-3 space-y-3 text-sm leading-relaxed text-ink-soft">
              <li class="flex gap-3">
                <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">1</span>
                Készíts fotót a QR-kódról, vagy használj képernyőképet – a kód legyen teljes egészében a képen.
              </li>
              <li class="flex gap-3">
                <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">2</span>
                Töltsd fel a képet, vagy illeszd be a vágólapról. A kép feldolgozása azonnal elindul.
              </li>
              <li class="flex gap-3">
                <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">3</span>
                Olvasd el a tartalmat, másold ki, vagy nyisd meg közvetlenül a benne lévő hivatkozást.
              </li>
            </ol>
          </section>

          <AdSlot placement="content" :min-height="280" />

          <div class="card p-5 sm:p-6">
            <FaqAccordion id="qr-olvaso-gyik" heading="Gyakori kérdések" :faqs="faqs" />
          </div>
        </div>

        <aside class="space-y-4">
          <div class="card p-5">
            <h2 class="text-sm font-semibold">Kapcsolódó eszközök</h2>
            <ul class="mt-3 space-y-2 text-sm">
              <li>
                <NuxtLink to="/qr-kod-meret-kalkulator" class="flex items-center gap-2 text-ink-soft hover:text-brand-800">
                  <Icon name="lucide:ruler" class="h-4 w-4 text-brand-600" aria-hidden="true" />
                  QR-kód méretkalkulátor
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/qr-kod-generator" class="flex items-center gap-2 text-ink-soft hover:text-brand-800">
                  <Icon name="lucide:qr-code" class="h-4 w-4 text-brand-600" aria-hidden="true" />
                  QR-kód generátor
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

          <div class="rounded-2xl bg-brand-600 p-5 text-white">
            <p class="text-sm font-semibold">Ne csak olvasd – készítsd is!</p>
            <p class="mt-1.5 text-xs leading-relaxed text-white/80">
              Ingyenes generátorunkkal saját QR-kódot készíthetsz, logóval és egyedi formákkal.
            </p>
            <NuxtLink to="/qr-kod-generator" class="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white underline underline-offset-4">
              Ugrás a generátorhoz
              <Icon name="lucide:arrow-right" class="h-3.5 w-3.5" aria-hidden="true" />
            </NuxtLink>
          </div>

          <AdSlot placement="sidebar" :min-height="600" />
        </aside>
      </div>
    </div>
  </div>
</template>
