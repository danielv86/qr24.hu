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
      src="~/assets/img/logo/qr24.hu-logo.png"
      :alt="brandName"
      width="1024"
      height="404"
      class="h-16 w-auto rounded-md bg-white dark:p-1"
      decoding="async"
    >
  </NuxtLink>
</template>
