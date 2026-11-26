<script setup lang="ts">
/**
 * Típusváltás alatti töltő réteg: áttetsző, elmosott (glassmorphism) felület,
 * közepén forgó ikonnal. A szülő elemhez kell `relative` pozicionálás.
 */
withDefaults(
  defineProps<{
    show?: boolean
    label?: string
  }>(),
  { show: false, label: 'Típus betöltése…' },
)
</script>

<template>
  <Transition name="qr-loading">
    <div
      v-if="show"
      class="absolute inset-0 z-20 grid place-items-center overflow-hidden rounded-2xl border border-white/50 bg-white/40 backdrop-blur-md dark:border-white/10 dark:bg-black/45"
      role="status"
      aria-live="polite"
    >
      <span
        class="grid h-14 w-14 place-items-center rounded-full border border-white/70 bg-white/70 shadow-lg shadow-slate-900/10 backdrop-blur-sm dark:border-white/10 dark:bg-white/10 dark:shadow-black/40"
      >
        <Icon
          name="lucide:loader-circle"
          class="h-7 w-7 animate-spin text-brand-700 dark:text-brand-400"
          aria-hidden="true"
        />
      </span>
      <span class="sr-only">{{ label }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.qr-loading-enter-active,
.qr-loading-leave-active {
  transition: opacity 180ms ease-out;
}

.qr-loading-enter-from,
.qr-loading-leave-to {
  opacity: 0;
}
</style>
