<script setup lang="ts">
const route = useRoute()
const { init: initTheme } = useTheme()

onMounted(initTheme)
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage :key="route.fullPath" />
    </NuxtLayout>
  </div>
</template>
