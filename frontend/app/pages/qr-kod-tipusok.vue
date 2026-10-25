<script setup lang="ts">
import { QR_MENU_ORDER, getQrType } from '~/lib/qr/content'
import type { QrTypeId } from '~/lib/qr/types'
import { QR_TYPE_PATHS } from '~/lib/content/type-pages'

const types = QR_MENU_ORDER.map((id) => {
  const definition = getQrType(id)
  return {
    id,
    label: definition.label,
    icon: definition.icon,
    description: definition.description,
    to: QR_TYPE_PATHS[id],
  }
})

interface TypeGroup {
  title: string
  ids: QrTypeId[]
}

const groups: TypeGroup[] = [
  {
    title: 'Kapcsolat és névjegy',
    ids: ['contact', 'vcard', 'business', 'whatsapp', 'social', 'links'],
  },
  {
    title: 'Web, tartalom és média',
    ids: ['url', 'text', 'email', 'pdf', 'app', 'video', 'audio', 'gallery', 'files'],
  },
  {
    title: 'Kereskedés és vendéglátás',
    ids: ['bank', 'paypal', 'coupon', 'menu', 'feedback', 'form', 'google-review'],
  },
  {
    title: 'Helyszín, esemény és egyéb',
    ids: ['map', 'event', 'event-page', 'wifi', 'phone', 'sms'],
  },
]

const byGroup: { title: string; items: (typeof types)[number][] }[] = groups.map(group => ({
  title: group.title,
  items: group.ids
    .map(id => types.find(type => type.id === id))
    .filter((item): item is (typeof types)[number] => Boolean(item)),
}))

const used = new Set(byGroup.flatMap(group => group.items.map(item => item.id)))
const rest = types.filter(type => !used.has(type.id))

if (rest.length) {
  byGroup.push({ title: 'További típusok', items: rest })
}

useContentSeo({
  slug: '/qr-kod-tipusok',
  title: 'QR-kód típusok – minden formátum egy helyen',
  description:
    'A QR24.hu összes QR-kód típusa: weboldal, kapcsolat, Wi-Fi, bank, PayPal, PDF, étlap, kupon és további formátumok. Válaszd ki a célodnak megfelelőt.',
  h1: 'QR-kód típusok',
})
</script>

<template>
  <div>
    <section class="border-b border-slate-200/80 bg-surface">
      <div class="container-page pb-9 pt-5">
        <ContentBreadcrumbs :items="[{ label: 'Főoldal', to: '/' }, { label: 'QR-kód típusok', to: undefined }]" />
        <div class="mt-6 max-w-3xl">
          <span class="eyebrow">Típusválasztó</span>
          <h1 class="mt-3 text-3xl leading-tight sm:text-4xl">QR-kód típusok</h1>
          <p class="mt-4 text-[1.02rem] leading-relaxed text-ink-soft">
            Válaszd ki, mit szeretnél megosztani. Minden típusnak saját útmutatója és generátor-beállítása van,
            a kód pedig ugyanabban az eszközben készül el.
          </p>
          <NuxtLink to="/qr-kod-generator#qr-generator" class="btn-primary mt-5">
            <Icon name="lucide:qr-code" class="h-4 w-4" aria-hidden="true" />
            Ugrás a generátorhoz
          </NuxtLink>
        </div>
      </div>
    </section>

    <div class="container-page py-8">
      <div class="space-y-10">
        <section v-for="(group, index) in byGroup" :key="group.title" :aria-labelledby="`group-${index}`">
          <h2 :id="`group-${index}`" class="text-xl font-semibold">{{ group.title }}</h2>
          <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <NuxtLink
              v-for="type in group.items"
              :key="type.to"
              :to="type.to"
              class="card group flex items-start gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift"
            >
              <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Icon :name="type.icon" class="h-5 w-5" aria-hidden="true" />
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold text-ink group-hover:text-brand-800">
                  {{ type.label }}
                </span>
                <span class="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                  {{ type.description }}
                </span>
              </span>
            </NuxtLink>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
