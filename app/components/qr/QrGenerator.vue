<script setup lang="ts">
import { isQrTypeId } from '#shared/qr/content'
import type { QrTypeId } from '#shared/qr/types'

const props = withDefaults(
  defineProps<{
    initialType?: QrTypeId
    showTypeTabs?: boolean
  }>(),
  { initialType: undefined, showTypeTabs: true },
)

const route = useRoute()
const { activeType, selectType, typeDefinition, validateNow } = useQrGenerator()

/** 1 = tartalom, 2 = stílus. Egyszerre mindig csak az aktív lépés látszik. */
const step = ref<1 | 2>(1)
/** Statikus vagy dinamikus kód – egyelőre csak vizuális választás, működés nélkül. */
const mode = ref<'static' | 'dynamic'>('static')

const MODE_OPTIONS = [
  {
    id: 'static',
    title: 'Statikus QR-kód',
    icon: 'lucide:qr-code',
    to: '/statikus-qr-kod',
    linkLabel: 'Bővebben a statikus QR-kódról',
  },
  {
    id: 'dynamic',
    title: 'Dinamikus QR-kód',
    icon: 'lucide:refresh-cw',
    to: '/dinamikus-qr-kod#osszehasonlitas',
    linkLabel: 'Bővebben a dinamikus QR-kódról',
  },
] as const

if (props.initialType && isQrTypeId(props.initialType) && activeType.value !== props.initialType) {
  selectType(props.initialType)
}

function applyQueryType(value: unknown) {
  if (isQrTypeId(value)) selectType(value)
}

onMounted(() => {
  applyQueryType(route.query.type)
})

watch(
  () => route.query.type,
  value => applyQueryType(value),
)

// Új QR-kód típusnál mindig a tartalommal kezdünk.
watch(activeType, () => {
  step.value = 1
})

function scrollTo(elementId: string) {
  if (!import.meta.client) return
  document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function goToStyle() {
  if (!validateNow()) return
  step.value = 2
  scrollTo('qr-generator')
}

function backToContent() {
  step.value = 1
  scrollTo('qr-generator')
}

function backToType() {
  scrollTo('qr-type-selector')
}
</script>

<template>
  <section
    id="qr-generator"
    class="scroll-mt-24"
    aria-labelledby="qr-generator-heading"
  >
    <h2 id="qr-generator-heading" class="sr-only">QR-kód generátor munkaterület</h2>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,25rem)] lg:items-start lg:gap-x-8 lg:gap-y-0">
      <!-- 1. lépés: tartalom -->
      <section
        v-if="step === 1"
        :id="`qr-panel-${typeDefinition.id}`"
        role="tabpanel"
        :aria-labelledby="showTypeTabs ? `qr-tab-${typeDefinition.id}` : 'qr-content-heading'"
        class="card p-4 sm:p-6 lg:col-start-1 lg:row-start-1"
      >
        <QrStepHead
          :num="1"
          title="Tartalom"
          hint="Válaszd ki, mit kapjon, aki beolvassa a kódot, majd add meg az adatokat."
          heading-id="qr-content-heading"
        />

        <div class="grid gap-2 sm:grid-cols-2" role="group" aria-label="QR-kód típusa">
          <div
            v-for="option in MODE_OPTIONS"
            :key="option.id"
            :class="[
              'rounded-xl border p-3 transition-colors',
              mode === option.id
                ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
                : 'border-slate-200 bg-surface hover:border-brand-300',
            ]"
          >
            <button
              type="button"
              :aria-pressed="mode === option.id"
              class="flex w-full items-center gap-3 text-left"
              @click="mode = option.id"
            >
              <span
                :class="[
                  'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
                  mode === option.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-ink-soft',
                ]"
              >
                <Icon :name="option.icon" class="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <span class="block text-sm font-semibold text-ink">{{ option.title }}</span>
            </button>
            <NuxtLink
              :to="option.to"
              class="mt-1.5 inline-flex items-center gap-1 pl-12 text-xs font-semibold text-brand-700 hover:underline"
            >
              {{ option.linkLabel }}
              <Icon name="lucide:arrow-right" class="h-3 w-3" aria-hidden="true" />
            </NuxtLink>
          </div>
        </div>

        <div v-if="showTypeTabs" id="qr-type-selector" class="mt-4 scroll-mt-24 border-b border-slate-200 pb-1">
          <QrTypeTabs :model-value="activeType" @update:model-value="selectType" />
        </div>

        <div class="pt-5">
          <QrForm />
        </div>

        <div class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <button type="button" class="btn-secondary" @click="backToType">
            <Icon name="lucide:arrow-left" class="h-4 w-4" aria-hidden="true" />
            Típus kiválasztása
          </button>
          <button type="button" class="btn-primary w-full sm:w-auto" @click="goToStyle">
            Stílus beállítások
            <Icon name="lucide:arrow-right" class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>

      <!-- 2. lépés: megjelenés -->
      <section
        v-else
        class="card p-4 sm:p-6 lg:col-start-1 lg:row-start-1"
        aria-labelledby="qr-style-heading"
      >
        <QrStepHead
          :num="2"
          title="Stílus"
          hint="Indulj egy sablonból, majd hangold össze a formákat, a színeket, a logót és a keretet."
          heading-id="qr-style-heading"
        />

        <QrCustomizer />

        <div class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <button type="button" class="btn-secondary" @click="backToContent">
            <Icon name="lucide:arrow-left" class="h-4 w-4" aria-hidden="true" />
            Vissza a tartalomhoz
          </button>
        </div>
      </section>

      <!-- Előnézet és letöltés -->
      <div class="min-w-0 lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:col-start-2 lg:row-start-1">
        <QrPreview />
      </div>
    </div>
  </section>
</template>
