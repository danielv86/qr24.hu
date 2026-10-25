<script setup lang="ts">
import type { QrTypeId } from '#shared/qr/types'

const { activeType, selectType } = useQrGenerator()
const { templates } = useQrTemplates()

function choose(id: QrTypeId) {
  selectType(id)
  if (import.meta.client) {
    document.getElementById('qr-generator')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<template>
  <nav
    class="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 p-3"
    aria-label="QR-kód típus választó"
  >
    <div class="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1">
      <button
        v-for="type in templates"
        :key="`menu-${type.id}`"
        type="button"
        :aria-current="activeType === type.id ? 'true' : undefined"
        :class="[
          'flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-center transition-colors',
          activeType === type.id
            ? 'bg-surface text-brand-700 shadow-sm ring-1 ring-brand-200'
            : 'text-ink-soft hover:bg-surface hover:text-ink',
        ]"
        @click="choose(type.id)"
      >
        <Icon :name="type.icon" class="h-5 w-5" aria-hidden="true" />
        <span class="text-[11px] font-medium leading-tight">{{ type.shortLabel }}</span>
      </button>

      <NuxtLink
        to="/tomeges-qr-kod-generator"
        title="Tömeges QR kód generátor"
        class="flex flex-col items-center justify-center gap-1 rounded-lg bg-surface/80 px-1 py-2 text-center text-brand-700 ring-1 ring-brand-200 transition-colors hover:bg-surface hover:text-brand-800"
      >
        <Icon name="lucide:layers" class="h-5 w-5" aria-hidden="true" />
        <span class="text-[11px] font-medium leading-tight">Tömeges</span>
      </NuxtLink>
    </div>
  </nav>
</template>
