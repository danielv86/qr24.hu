<script setup lang="ts">
const { brandName } = useSiteSettings()
</script>

<template>
  <NuxtLink
    to="/"
    class="group inline-flex items-center rounded-xl py-1 focus-visible:ring-2 focus-visible:ring-brand-600"
    :aria-label="`${brandName} – főoldal`"
  >
    <img
      src="/img/logo/qrkod24.hu-logo.png"
      :alt="brandName"
      width="1024"
      height="404"
      class="h-16 w-auto dark:brightness-0 dark:invert"
      decoding="async"
    >
  </NuxtLink>
</template>
