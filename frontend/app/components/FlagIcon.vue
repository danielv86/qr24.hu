<script setup lang="ts">
const props = withDefaults(defineProps<{ code: string, size?: number }>(), { size: 20 })

const title = computed(() => ({ hu: 'Magyar zászló', gb: 'Brit zászló', en: 'Brit zászló' }[props.code] || 'Zászló'))
</script>

<template>
  <svg
    :width="props.size"
    :height="Math.round(props.size * 0.7)"
    viewBox="0 0 20 14"
    role="img"
    :aria-label="title"
    class="shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/10"
  >
    <template v-if="props.code === 'hu'">
      <rect width="20" height="4.67" fill="#CE2939" />
      <rect y="4.67" width="20" height="4.67" fill="#FFFFFF" />
      <rect y="9.33" width="20" height="4.67" fill="#477050" />
    </template>
    <template v-else-if="props.code === 'gb' || props.code === 'en'">
      <rect width="20" height="14" fill="#012169" />
      <path d="M0 0L20 14M20 0L0 14" stroke="#FFFFFF" stroke-width="2.8" />
      <path d="M0 0L20 14M20 0L0 14" stroke="#C8102E" stroke-width="1.4" />
      <path d="M10 0V14M0 7H20" stroke="#FFFFFF" stroke-width="4.6" />
      <path d="M10 0V14M0 7H20" stroke="#C8102E" stroke-width="2.6" />
    </template>
    <template v-else>
      <rect width="20" height="14" fill="#94A3B8" />
    </template>
  </svg>
</template>
