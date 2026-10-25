<script setup lang="ts">
import type { RelatedLink } from '~/lib/content/types'

defineProps<{ links: RelatedLink[] }>()
</script>

<template>
  <section class="mt-10" aria-labelledby="related-heading">
    <h2 id="related-heading" class="text-2xl">Kapcsolódó QR-kód típusok és útmutatók</h2>
    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="group flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-surface p-4 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
      >
        <span>
          <span class="block text-sm font-semibold text-ink group-hover:text-brand-800">{{ link.label }}</span>
          <span v-if="link.description" class="mt-1 block text-xs leading-relaxed text-ink-muted">{{ link.description }}</span>
        </span>
        <Icon name="lucide:arrow-up-right" class="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
      </NuxtLink>
    </div>
  </section>
</template>
