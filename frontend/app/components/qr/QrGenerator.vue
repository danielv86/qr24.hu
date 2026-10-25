<script setup lang="ts">
import { isQrTypeId } from '~/lib/qr/content'
import type { QrTypeId } from '~/lib/qr/types'

const props = withDefaults(
  defineProps<{
    initialType?: QrTypeId
    showTypeTabs?: boolean
  }>(),
  { initialType: undefined, showTypeTabs: true },
)

const route = useRoute()
const { activeType, selectType, typeDefinition } = useQrGenerator()

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
        :id="`qr-panel-${typeDefinition.id}`"
        role="tabpanel"
        :aria-labelledby="showTypeTabs ? `qr-tab-${typeDefinition.id}` : 'qr-content-heading'"
        class="card p-4 sm:p-6 lg:col-start-1 lg:row-start-1 lg:rounded-b-none lg:border-b-0"
      >
        <QrStepHead
          :num="1"
          title="Tartalom"
          hint="Válaszd ki, mit kapjon, aki beolvassa a kódot, majd add meg az adatokat."
          heading-id="qr-content-heading"
        />

        <div v-if="showTypeTabs" class="border-b border-slate-200 pb-1">
          <QrTypeTabs :model-value="activeType" @update:model-value="selectType" />
        </div>

        <div class="pt-5">
          <QrForm />
        </div>
      </section>

      <!-- Előnézet és letöltés -->
      <div class="min-w-0 lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <QrPreview />
      </div>

      <!-- 2. lépés: megjelenés -->
      <section
        class="card p-4 sm:p-6 lg:col-start-1 lg:row-start-2 lg:rounded-t-none lg:border-t-0 lg:shadow-[inset_0_1px_0_#e2e8f0]"
        aria-labelledby="qr-style-heading"
      >
        <QrStepHead
          :num="2"
          title="Stílus"
          hint="Indulj egy sablonból, majd hangold össze a formákat, a színeket, a logót és a keretet."
          heading-id="qr-style-heading"
        />

        <QrCustomizer />
      </section>
    </div>
  </section>
</template>
