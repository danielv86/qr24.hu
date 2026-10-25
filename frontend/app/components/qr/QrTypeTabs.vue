<script setup lang="ts">
import type { QrTypeId } from '#shared/qr/types'

const props = defineProps<{ modelValue: QrTypeId }>()
const emit = defineEmits<{ 'update:modelValue': [value: QrTypeId] }>()
const { templates } = useQrTemplates()
const tabRefs = ref<HTMLButtonElement[]>([])

function select(id: QrTypeId, focus = false) {
  emit('update:modelValue', id)
  if (focus) {
    nextTick(() => {
      const index = templates.findIndex(type => type.id === id)
      tabRefs.value[index]?.focus()
    })
  }
}

function onKeydown(event: KeyboardEvent, index: number) {
  let next = index
  if (event.key === 'ArrowRight') next = (index + 1) % templates.length
  else if (event.key === 'ArrowLeft') next = (index - 1 + templates.length) % templates.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = templates.length - 1
  else return
  event.preventDefault()
  select(templates[next]!.id, true)
}
</script>

<template>
  <div
    class="-mx-1 flex snap-x gap-1 overflow-x-auto px-1 pb-2 pt-1 [scrollbar-width:thin]"
    role="tablist"
    aria-label="QR-kód típusa"
  >
    <button
      v-for="(type, index) in templates"
      :id="`qr-tab-${type.id}`"
      :key="type.id"
      ref="tabRefs"
      type="button"
      role="tab"
      :aria-selected="props.modelValue === type.id"
      :aria-controls="`qr-panel-${type.id}`"
      :tabindex="props.modelValue === type.id ? 0 : -1"
      :class="[
        'inline-flex snap-start items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
        props.modelValue === type.id
          ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
          : 'border-transparent text-ink-soft hover:border-slate-200 hover:bg-slate-50 hover:text-ink',
      ]"
      @click="select(type.id)"
      @keydown="onKeydown($event, index)"
    >
      <Icon :name="type.icon" class="h-4 w-4" aria-hidden="true" />
      {{ type.shortLabel }}
    </button>
  </div>
</template>
