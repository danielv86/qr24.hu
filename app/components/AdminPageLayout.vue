<script setup lang="ts">
/**
 * Egységes admin oldalváz: a cím mellett, egyetlen sorban vannak a műveletek
 * (mentés, törlés, feltöltés, frissítés), a tartalom pedig teljes szélességben
 * alatta. Mobilon a műveletsor a cím alá tördelődik.
 */
withDefaults(
  defineProps<{
    title: string
    description?: string
  }>(),
  { description: '' },
)
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold tracking-tight text-ink">{{ title }}</h1>
        <p v-if="description" class="mt-1 max-w-3xl text-sm text-ink-soft">{{ description }}</p>
      </div>

      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>

    <div class="mt-5">
      <slot />
    </div>
  </div>
</template>
