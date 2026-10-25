<script setup lang="ts">
defineProps<{
  num: number
  title: string
  hint: string
  headingId: string
}>()
</script>

<template>
  <header class="mb-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1">
    <span
      class="row-start-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700"
      aria-hidden="true"
    >
      {{ num }}
    </span>
    <h3 :id="headingId" class="col-start-2 row-start-1 text-lg font-semibold text-ink">
      {{ title }}
    </h3>
    <p class="col-start-2 row-start-2 text-sm leading-relaxed text-ink-muted">
      {{ hint }}
    </p>
  </header>
</template>
