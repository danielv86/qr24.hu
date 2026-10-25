<script setup lang="ts">
import type { ContentSection } from '~/lib/content/types'
import { contentAnchor } from '~/utils/content'

withDefaults(
  defineProps<{
    sections: ContentSection[]
    showGuideAd?: boolean
  }>(),
  { showGuideAd: false },
)
</script>

<template>
  <div class="prose-hu">
    <template v-for="(section, index) in sections" :key="section.heading">
      <section :id="contentAnchor(section.heading)" class="scroll-mt-24">
        <h2>{{ section.heading }}</h2>
        <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
        <ul v-if="section.bullets?.length">
          <li v-for="bullet in section.bullets" :key="bullet">{{ bullet }}</li>
        </ul>
        <p
          v-if="section.tip"
          class="rounded-r-lg border-l-4 border-brand-500 bg-brand-50/70 px-4 py-3 text-sm text-ink-soft"
        >
          <strong class="font-semibold text-ink">Tipp:</strong> {{ section.tip }}
        </p>
      </section>

      <div v-if="showGuideAd && index === 1" class="not-prose my-8">
        <AdSlot placement="guide" :min-height="90" />
      </div>
    </template>
  </div>
</template>
