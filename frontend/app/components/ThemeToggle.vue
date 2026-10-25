<script setup lang="ts">
const { preference, isDark, cycle } = useTheme()
const { t } = useI18n()

const label = computed(() => {
  if (preference.value === 'light') return t('theme.light')
  if (preference.value === 'dark') return t('theme.dark')
  return t('theme.system')
})
const icon = computed(() => {
  if (preference.value === 'system') return 'lucide:sun-moon'
  return isDark.value ? 'lucide:moon' : 'lucide:sun'
})
</script>

<template>
  <button
    type="button"
    class="btn-ghost h-10 w-10 p-0"
    :aria-label="`${t('theme.label')}: ${label}. ${t('theme.switch')}`"
    :title="`${t('theme.label')}: ${label}`"
    @click="cycle"
  >
    <Icon :name="icon" class="h-5 w-5" aria-hidden="true" />
  </button>
</template>
