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
    id="qr-type-selector"
    class="relative z-10 scroll-mt-24 rounded-2xl border border-[#e2e8f0] bg-white p-2.5 shadow-card sm:p-3.5"
    aria-label="QR-kód típus választó"
  >
    <div class="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-10 xl:grid-cols-[repeat(14,minmax(0,1fr))]">
      <button
        v-for="type in templates"
        :key="`menu-${type.id}`"
        type="button"
        :aria-current="activeType === type.id ? 'true' : undefined"
        :class="[
          'flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border px-1 py-2.5 text-center shadow-sm transition-colors',
          activeType === type.id
            ? 'border-[#a78bfa] bg-[#f5f3ff] text-[#5b21b6] ring-1 ring-[#a78bfa]/50'
            : 'border-[#e2e8f0] bg-white text-[#334155] hover:border-[#a78bfa]/60 hover:text-[#5b21b6]',
        ]"
        @click="choose(type.id)"
      >
        <Icon
          :name="type.icon"
          :class="['h-5 w-5', activeType === type.id ? 'text-[#7c3aed]' : 'text-[#64748b]']"
          aria-hidden="true"
        />
        <span class="w-full truncate text-[10px] font-medium leading-tight">{{ type.shortLabel }}</span>
      </button>

      <NuxtLink
        to="/tomeges-qr-kod-generator"
        title="Tömeges QR kód generátor"
        class="flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white px-1 py-2.5 text-center text-[#334155] shadow-sm transition-colors hover:border-[#a78bfa]/60 hover:text-[#5b21b6]"
      >
        <Icon name="lucide:layers" class="h-5 w-5 text-[#64748b]" aria-hidden="true" />
        <span class="w-full truncate text-[10px] font-medium leading-tight">Tömeges</span>
      </NuxtLink>
    </div>
  </nav>
</template>
