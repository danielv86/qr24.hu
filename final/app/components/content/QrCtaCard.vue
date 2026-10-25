<script setup lang="ts">
import type { QrTypeId } from '#shared/qr/types'

const props = withDefaults(
  defineProps<{
    qrType?: QrTypeId
    title?: string
    compact?: boolean
  }>(),
  {
    qrType: undefined,
    title: 'Készítsd el a saját QR-kódodat',
    compact: false,
  },
)

const link = computed(() => (props.qrType ? `/qr-kod-generator?type=${props.qrType}#qr-generator` : '/qr-kod-generator#qr-generator'))
</script>

<template>
  <div :class="compact ? 'rounded-2xl border border-brand-100 bg-brand-50 p-5' : 'card border-brand-100 bg-gradient-to-br from-brand-50 to-surface p-6'">
    <span class="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
      <Icon name="lucide:qr-code" class="h-5 w-5" aria-hidden="true" />
    </span>
    <h2 class="mt-3 text-lg font-semibold text-ink">{{ title }}</h2>
    <p class="mt-2 text-sm leading-relaxed text-ink-soft">
      Ingyenes, regisztráció nélkül. Az előnézet azonnal frissül, PNG és SVG letöltéssel.
    </p>
    <NuxtLink :to="link" class="btn-primary mt-4 w-full">
      QR-kód készítése
      <Icon name="lucide:arrow-right" class="h-4 w-4" aria-hidden="true" />
    </NuxtLink>
  </div>
</template>
