<script setup lang="ts">
defineProps<{
  items: { label: string; to?: string }[]
}>()
</script>

<template>
  <nav aria-label="Morzsamenü">
    <ol class="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
      <li v-for="(item, index) in items" :key="`${item.label}-${index}`" class="flex items-center gap-1.5">
        <Icon v-if="index > 0" name="lucide:chevron-right" class="h-3 w-3 text-slate-400" aria-hidden="true" />
        <NuxtLink v-if="item.to" :to="item.to" class="rounded hover:text-brand-700 focus-visible:ring-2">
          {{ item.label }}
        </NuxtLink>
        <span v-else :aria-current="index === items.length - 1 ? 'page' : undefined" class="font-medium text-ink-soft">
          {{ item.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>
