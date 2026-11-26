<script setup lang="ts">
import type { QrTypeId } from '#shared/qr/types'
import { scrollToTypeSelector } from '~/utils/scroll'

/**
 * A típusválasztó alapból a generátor állapotát vezérli. A tömeges generátor
 * oldala `modelValue`-vel köti be a saját típusát, ilyenkor a választás nem a
 * generátor állapotába kerül, hanem eseményként megy vissza.
 */
const props = withDefaults(
  defineProps<{
    modelValue?: QrTypeId
    scrollTo?: string
  }>(),
  {
    modelValue: undefined,
    scrollTo: 'qr-generator',
  },
)
const emit = defineEmits<{
  'update:modelValue': [id: QrTypeId]
  /* Minden választásnál jelezzük, hogy az oldal szükség esetén továbbléphessen. */
  select: [id: QrTypeId]
}>()

const { activeType, selectType, startTypeLoading } = useQrGenerator()
const { templates } = useQrTemplates()

const current = computed<QrTypeId>(() => props.modelValue ?? activeType.value)

/**
 * A választó alapból csak két sort mutat; a többi a „További QR kódok” alatt nyílik le.
 * Az állapot globális, mert a típusra kattintás másik oldalra navigál: így a lenyitott
 * választó az új oldalon is lenyitva marad.
 */
const expanded = useState<boolean>('qr-type-menu-expanded', () => false)
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
  if (props.modelValue !== undefined) {
    emit('update:modelValue', id)
  } else {
    startTypeLoading()
    selectType(id)
  }
  emit('select', id)
  if (import.meta.client && props.scrollTo) {
    // Ugyanaz az ugrás, mint a típusoldalakon: a választó a fix fejléc alá igazodik.
    if (props.scrollTo === 'qr-type-selector') void scrollToTypeSelector(5)
    else document.getElementById(props.scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<template>
  <div class="relative z-10">
    <nav
      id="qr-type-selector"
      class="scroll-mt-24 rounded-2xl border border-slate-200 bg-surface p-2.5 shadow-card sm:p-3.5"
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
          :aria-current="current === type.id ? 'true' : undefined"
          :tabindex="isHidden(index) ? -1 : undefined"
          :aria-hidden="isHidden(index) ? 'true' : undefined"
          :data-type="type.id"
          :class="[
            'qr-type-tile flex h-[80px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border px-1 text-center shadow-sm transition-colors',
            current === type.id
              ? 'border-brand-400 bg-brand-50 text-brand-700 ring-1 ring-brand-400/50'
              : 'border-slate-200 bg-surface text-ink-soft hover:border-brand-300 hover:text-brand-700',
          ]"
          @click="choose(type.id)"
        >
          <Icon :name="type.icon" class="qr-type-icon h-6 w-6" aria-hidden="true" />
          <span class="w-full truncate text-[11px] font-medium leading-tight">{{ type.shortLabel }}</span>
        </button>

        <NuxtLink
          to="/tomeges-qr-kod-generator"
          title="Tömeges QR kód generátor"
          :tabindex="isHidden(templates.length) ? -1 : undefined"
          :aria-hidden="isHidden(templates.length) ? 'true' : undefined"
          data-type="bulk"
          class="qr-type-tile flex h-[80px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-surface px-1 text-center text-ink-soft shadow-sm transition-colors hover:border-brand-300 hover:text-brand-700"
        >
          <Icon name="lucide:layers" class="qr-type-icon h-6 w-6" aria-hidden="true" />
          <span class="w-full truncate text-[11px] font-medium leading-tight">Tömeges</span>
        </NuxtLink>
      </div>
    </nav>

    <a
      href="#qr-type-selector"
      class="qr-more-pulse mt-2 inline-flex items-center gap-1 px-1 text-xs font-medium text-brand-700 hover:underline"
      :aria-expanded="expanded"
      @click.prevent="expanded = !expanded"
    >
      {{ expanded ? 'Kevesebb QR-kód típus' : 'További QR kódok' }}
      <Icon :name="expanded ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  </div>
</template>
