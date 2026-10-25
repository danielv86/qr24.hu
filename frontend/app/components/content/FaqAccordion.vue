<script setup lang="ts">
import type { ContentFaq } from '~/lib/content/types'

withDefaults(
  defineProps<{
    faqs: ContentFaq[]
    id?: string
    heading?: string
  }>(),
  {
    id: 'gyik',
    heading: 'Gyakori kérdések',
  },
)
</script>

<template>
  <section :id="id" :aria-labelledby="`${id}-heading`" class="scroll-mt-24">
    <h2 :id="`${id}-heading`" class="text-2xl">{{ heading }}</h2>
    <div class="mt-5 space-y-3">
      <details
        v-for="(faq, index) in faqs"
        :key="faq.question"
        class="group rounded-xl border border-slate-200 bg-surface px-4 py-1 shadow-sm open:border-brand-200"
      >
        <summary
          class="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-left text-[0.98rem] font-semibold text-ink [&::-webkit-details-marker]:hidden"
        >
          <span>{{ faq.question }}</span>
          <Icon
            name="lucide:plus"
            class="h-4 w-4 shrink-0 text-brand-600 transition-transform group-open:rotate-45"
            aria-hidden="true"
          />
        </summary>
        <div class="pb-4 text-sm leading-relaxed text-ink-soft">
          <p>{{ faq.answer }}</p>
        </div>
        <span class="sr-only">Kérdés {{ index + 1 }} / {{ faqs.length }}</span>
      </details>
    </div>
  </section>
</template>
