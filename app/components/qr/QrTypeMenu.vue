<script setup lang="ts">
import type { QrTypeId } from '#shared/qr/types'

const { activeType, selectType } = useQrGenerator()
const { templates } = useQrTemplates()

/** A választó alapból csak két sort mutat; a többi a „További QR kódok” alatt nyílik le. */
const expanded = ref(false)
const perRow = ref(0)

function syncColumns() {
  if (!import.meta.client) return
  const width = window.innerWidth
  perRow.value = width >= 1024 ? 10 : width >= 768 ? 7 : width >= 640 ? 6 : 4
}

onMounted(() => {
  syncColumns()
  window.addEventListener('resize', syncColumns)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncColumns)
})

/** A 28 típus után a tömeges generátor a 29. csempe. */
const total = computed(() => templates.length + 1)
const visibleCount = computed(() => (expanded.value || !perRow.value ? total.value : perRow.value * 2))

function isHidden(index: number): boolean {
  return !expanded.value && perRow.value > 0 && index >= visibleCount.value
}

function choose(id: QrTypeId) {
  selectType(id)
  if (import.meta.client) {
    document.getElementById('qr-generator')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<template>
  <div class="relative z-10">
    <nav
      id="qr-type-selector"
      class="scroll-mt-24 rounded-2xl border border-[#e2e8f0] bg-white p-2.5 shadow-card sm:p-3.5"
      aria-label="QR-kód típus választó"
    >
      <div
        :class="[
          'grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-10',
          expanded ? '' : 'max-h-[168px] overflow-hidden',
        ]"
      >
        <button
          v-for="(type, index) in templates"
          :key="`menu-${type.id}`"
          type="button"
          :aria-current="activeType === type.id ? 'true' : undefined"
          :tabindex="isHidden(index) ? -1 : undefined"
          :aria-hidden="isHidden(index) ? 'true' : undefined"
          :class="[
            'flex h-[80px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border px-1 text-center shadow-sm transition-colors',
            activeType === type.id
              ? 'border-[#a78bfa] bg-[#f5f3ff] text-[#5b21b6] ring-1 ring-[#a78bfa]/50'
              : 'border-[#e2e8f0] bg-white text-[#334155] hover:border-[#a78bfa]/60 hover:text-[#5b21b6]',
          ]"
          @click="choose(type.id)"
        >
          <Icon
            :name="type.icon"
            :class="['h-6 w-6', activeType === type.id ? 'text-[#7c3aed]' : 'text-[#64748b]']"
            aria-hidden="true"
          />
          <span class="w-full truncate text-[11px] font-medium leading-tight">{{ type.shortLabel }}</span>
        </button>

        <NuxtLink
          to="/tomeges-qr-kod-generator"
          title="Tömeges QR kód generátor"
          :tabindex="isHidden(templates.length) ? -1 : undefined"
          :aria-hidden="isHidden(templates.length) ? 'true' : undefined"
          class="flex h-[80px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white px-1 text-center text-[#334155] shadow-sm transition-colors hover:border-[#a78bfa]/60 hover:text-[#5b21b6]"
        >
          <Icon name="lucide:layers" class="h-6 w-6 text-[#64748b]" aria-hidden="true" />
          <span class="w-full truncate text-[11px] font-medium leading-tight">Tömeges</span>
        </NuxtLink>
      </div>
    </nav>

    <a
      href="#qr-type-selector"
      class="qr-more-pulse mt-2 inline-flex items-center gap-1 px-1 text-xs font-medium text-[#6D28D9] hover:underline"
      :aria-expanded="expanded"
      @click.prevent="expanded = !expanded"
    >
      {{ expanded ? 'Kevesebb QR-kód típus' : 'További QR kódok' }}
      <Icon :name="expanded ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  </div>
</template>
