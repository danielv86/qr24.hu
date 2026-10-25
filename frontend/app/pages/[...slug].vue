<script setup lang="ts">
import { getLandingPage } from '~/lib/content/landing-pages'
import { getLegalPage } from '~/lib/content/legal-pages'
import { contentAnchor } from '~/utils/content'

const route = useRoute()
const path = route.path.replace(/\/+$/, '') || '/'
const landing = getLandingPage(path)
const legal = getLegalPage(path)

if (!landing && !legal) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Az oldal nem található',
    fatal: true,
  })
}

const page = landing || legal!
const isLegal = Boolean(legal)
// A típusonkénti oldalak is beágyazzák a generátort, mert a keresőből érkező
// látogató azonnal készíthet kódot a saját típusával.
const hasGenerator = Boolean(landing?.showGenerator || landing?.qrType)

useContentSeo({
  slug: path,
  title: page.title,
  description: page.description,
  h1: page.h1,
  faqs: landing?.faqs,
  isWebApp: hasGenerator,
})

const { legal: legalSettings, brandName, siteUrl } = useSiteSettings()

const replacements = computed<Record<string, string>>(() => ({
  '{{brandName}}': brandName.value,
  '{{siteUrl}}': siteUrl.value,
  '{{providerName}}': legalSettings.value.providerName || 'Az üzemeltető neve nincs megadva',
  '{{providerAddress}}': legalSettings.value.providerAddress || 'Az üzemeltető címe nincs megadva',
  '{{providerEmail}}': legalSettings.value.providerEmail || 'Az elérhetőség nincs megadva',
  '{{providerPhone}}': legalSettings.value.providerPhone || 'nincs megadva',
  '{{taxNumber}}': legalSettings.value.taxNumber || 'nincs megadva',
  '{{registryNumber}}': legalSettings.value.registryNumber || 'nincs megadva',
  '{{hostingProvider}}': legalSettings.value.hostingProvider || 'nincs megadva',
  '{{hostingAddress}}': legalSettings.value.hostingAddress || 'nincs megadva',
}))

function fillText(value: string): string {
  return Object.entries(replacements.value).reduce(
    (result, [placeholder, replacement]) => result.split(placeholder).join(replacement),
    value,
  )
}

const filledIntro = computed(() => page.intro.map(fillText))
const filledSections = computed(() =>
  page.sections.map(section => ({
    heading: fillText(section.heading),
    paragraphs: section.paragraphs.map(fillText),
    bullets: section.bullets?.map(fillText),
    tip: section.tip ? fillText(section.tip) : undefined,
  })),
)

const providerDataMissing = computed(
  () =>
    Boolean(legal?.requiresProviderData)
    && (!legalSettings.value.providerName || !legalSettings.value.providerAddress || !legalSettings.value.providerEmail),
)

const breadcrumbs = [
  { label: 'Főoldal', to: '/' },
  { label: landing?.kicker || 'Jogi információ', to: undefined },
  { label: page.h1, to: undefined },
].filter((item, index, array) => index === 0 || item.label !== array[index - 1]?.label)

const tocItems = computed(() =>
  filledSections.value.map(section => ({
    label: section.heading,
    href: `#${contentAnchor(section.heading)}`,
  })),
)

const generatorLink = computed(() =>
  landing?.qrType
    ? `/qr-kod-generator?type=${landing.qrType}#qr-generator`
    : '/qr-kod-generator#qr-generator',
)
</script>

<template>
  <div>
    <section class="border-b border-slate-200/80 bg-surface">
      <div class="container-page pb-9 pt-5">
        <ContentBreadcrumbs :items="breadcrumbs" />

        <div class="mt-6 max-w-3xl">
          <span class="eyebrow">{{ landing?.kicker || 'Jogi információ' }}</span>
          <h1 class="mt-3 text-3xl leading-tight sm:text-4xl lg:text-[2.75rem]">{{ page.h1 }}</h1>
          <div class="mt-4 space-y-3 text-[1.02rem] leading-relaxed text-ink-soft">
            <p v-for="paragraph in filledIntro" :key="paragraph">{{ paragraph }}</p>
          </div>

          <div v-if="landing" class="mt-6 flex flex-wrap gap-3">
            <a v-if="hasGenerator" href="#qr-generator" class="btn-primary">
              <Icon name="lucide:qr-code" class="h-4 w-4" aria-hidden="true" />
              Ugrás a generátorhoz
            </a>
            <NuxtLink v-else :to="generatorLink" class="btn-primary">
              <Icon name="lucide:qr-code" class="h-4 w-4" aria-hidden="true" />
              {{ landing.qrType ? 'QR-kód készítése' : 'QR-kód generátor' }}
            </NuxtLink>
            <NuxtLink to="/qr-kod-keszites" class="btn-secondary">
              QR-kód készítés útmutató
            </NuxtLink>
          </div>

          <p v-if="isLegal" class="mt-4 text-xs text-ink-muted">
            Utoljára frissítve: {{ page.updated }}
          </p>
        </div>
      </div>
    </section>

    <div class="container-page py-8">
      <AdSlot
        v-if="landing && !hasGenerator"
        placement="top"
        :min-height="90"
        class="mb-8"
      />

      <QrGenerator
        v-if="hasGenerator"
        class="mt-2"
        :initial-type="landing?.qrType"
      />

      <div class="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
        <article>
          <div
            v-if="providerDataMissing"
            class="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900"
            role="status"
          >
            <p class="flex items-start gap-2 font-medium">
              <Icon name="lucide:info" class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Az üzemeltetői adatok egy része még nincs kitöltve.
            </p>
            <p class="mt-1 pl-6">
              Ez az oldal jogi sablonként működik. Az éles használat előtt a szolgáltató nevét, címét és
              elérhetőségét az adminisztrációs felületen kell megadni. A hiányzó adatokat nem pótoljuk
              kitalált értékekkel.
            </p>
          </div>

          <ContentArticle :sections="filledSections" :show-guide-ad="Boolean(landing)" />

          <ContentFaqAccordion
            v-if="landing"
            :faqs="landing.faqs"
            id="gyik"
            heading="Gyakori kérdések"
            class="mt-10"
          />

          <RelatedLinks v-if="landing" :links="landing.related" />

          <div v-if="isLegal" class="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-ink-soft">
            Kérdésed van az adatkezeléssel vagy a feltételekkel kapcsolatban?
            <NuxtLink to="/kapcsolat" class="font-medium text-brand-700 underline underline-offset-2">
              Lépj kapcsolatba velünk
            </NuxtLink>.
          </div>

          <p class="mt-8 text-xs text-ink-muted">
            Utoljára frissítve: {{ page.updated }}
          </p>
        </article>

        <aside class="hidden lg:block" aria-label="Oldalsáv">
          <div class="sticky top-24 space-y-5">
            <nav
              v-if="tocItems.length"
              class="card p-4"
              aria-labelledby="toc-heading"
            >
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

            <QrCtaCard v-if="!hasGenerator" :qr-type="landing?.qrType" compact />

            <AdSlot
              v-if="landing"
              placement="sidebar"
              :min-height="600"
            />
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>
