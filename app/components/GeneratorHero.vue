<script setup lang="ts">
// A fejléc-képek a public mappából jönnek: így a szerver és a kliens
// ugyanazt az URL-t rendereli, és nincs hidratálási eltérés.
const heroBackground = '/img/header/bg1.png'
const heroBackgroundDark = '/img/header/bg1-dark.png'
const heroQrImage = '/img/header/qr-icon.png'

const HERO_BADGES = [
  { label: '28 QR-kód típus', icon: 'lucide:layout-grid', color: 'bg-brand-100 text-brand-700' },
  { label: 'Nincs regisztráció', icon: 'lucide:user-check', color: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' },
  { label: '5 exportformátum', icon: 'lucide:download', color: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' },
]

const props = withDefaults(
  defineProps<{
    eyebrow?: string
    /* A teljes cím; a „QR-kód” szó kapja a gradiens kiemelést. */
    heading?: string
    description?: string | string[]
    badges?: { label: string, icon: string, color: string }[]
  }>(),
  {
    eyebrow: 'Ingyenes online eszköz',
    heading: 'Ingyenes QR-kód generátor',
    description:
      'Készíts egyedi QR-kódot bármilyen tartalomhoz. Gyors, egyszerű és testreszabható – '
      + 'regisztráció nélkül, közvetlenül a böngésződben.',
  },
)

const HIGHLIGHT = 'QR-kód'

const parts = computed(() => {
  const index = props.heading.indexOf(HIGHLIGHT)
  if (index < 0) return { lead: props.heading, highlight: '', tail: '' }
  const lead = props.heading.slice(0, index).trim()
  const tail = props.heading.slice(index + HIGHLIGHT.length).trim()
  return {
    lead: lead ? `${lead} ` : '',
    highlight: HIGHLIGHT,
    tail: tail ? ` ${tail}` : '',
  }
})

const descriptionParagraphs = computed(() =>
  Array.isArray(props.description) ? props.description : [props.description],
)

const badges = computed(() => props.badges ?? HERO_BADGES)
</script>

<template>
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
    <div class="relative container-page">
      <!-- A hirdetősáv a 4rem-es térközön kívül, közvetlenül a fejléc alatt van. -->
      <div class="pt-6">
        <AdSlot placement="top" :min-height="90" class="mx-auto max-w-3xl" />
      </div>

      <div class="grid items-center gap-8 py-[4rem] lg:grid-cols-[minmax(0,1fr)_300px]">
        <div class="text-left" aria-labelledby="generator-hero-heading">
          <span class="eyebrow">
            <Icon name="lucide:sparkles" class="h-3.5 w-3.5" aria-hidden="true" />
            {{ eyebrow }}
          </span>
          <h1 id="generator-hero-heading" class="mt-4 text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-[3.4rem]">
            {{ parts.lead }}<span
              v-if="parts.highlight"
              class="bg-gradient-to-r from-brand-700 via-brand-600 to-fuchsia-500 bg-clip-text text-transparent"
            >{{ parts.highlight }}</span>{{ parts.tail }}
          </h1>
          <p
            v-for="paragraph in descriptionParagraphs"
            :key="paragraph"
            class="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg"
          >
            {{ paragraph }}
          </p>
          <ul class="mt-5 flex flex-wrap gap-2.5">
            <li
              v-for="badge in badges"
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
          <!-- A méretek azért kellenek, hogy a kép helye már betöltés előtt foglalt
               legyen: különben a fejléc utólag megnyúlik, és elmozdítja az alatta
               lévő típusválasztót. -->
          <img
            :src="heroQrImage"
            alt="QR-kód előnézet"
            width="1316"
            height="1195"
            class="w-[280px] drop-shadow-2xl"
            loading="eager"
          >
        </div>
      </div>
    </div>
  </section>
</template>
