<script setup lang="ts">
const { locale, locales, setLocale, t } = useI18n()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

interface LocaleOption {
  code: string
  name: string
  flag: string
}

const options = computed<LocaleOption[]>(() =>
  (locales.value as unknown as LocaleOption[]).map(item => ({
    code: item.code,
    name: item.name,
    flag: item.flag || item.code,
  })),
)

const current = computed(() => options.value.find(item => item.code === locale.value) || options.value[0])

function choose(code: string) {
  open.value = false
  if (code !== locale.value) setLocale(code as typeof locale.value)
}

function onDocumentClick(event: MouseEvent) {
  if (!open.value) return
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="inline-flex h-10 items-center gap-2 rounded-xl px-2.5 text-xs font-medium text-ink-soft transition-colors hover:bg-slate-100 hover:text-ink"
      :aria-label="`${t('language.label')}: ${current?.name}`"
      :title="t('language.choose')"
      aria-haspopup="menu"
      :aria-expanded="open"
      @keydown.esc="open = false"
      @click="open = !open"
    >
      <FlagIcon v-if="current" :code="current.flag" />
      <span class="uppercase tracking-wide">{{ current?.code }}</span>
      <Icon name="lucide:chevron-down" class="h-3.5 w-3.5" aria-hidden="true" />
    </button>

    <div
      v-if="open"
      class="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-surface py-1 shadow-lift"
      role="menu"
      :aria-label="t('language.choose')"
    >
      <button
        v-for="option in options"
        :key="`locale-${option.code}`"
        type="button"
        role="menuitemradio"
        :aria-checked="option.code === locale"
        class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink-soft hover:bg-slate-50 hover:text-ink"
        @click="choose(option.code)"
      >
        <FlagIcon :code="option.flag" :size="22" />
        <span class="flex-1">{{ option.name }}</span>
        <Icon v-if="option.code === locale" name="lucide:check" class="h-4 w-4 text-brand-700" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
