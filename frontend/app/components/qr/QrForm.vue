<script setup lang="ts">
import { QR_TYPE_PATHS } from '~/lib/content/type-pages'

const {
  activeType,
  typeDefinition,
  values,
  errors,
  attempted,
  isValid,
  shouldShowError,
  setValue,
  markTouched,
} = useQrGenerator()

const guidePath = computed(() => QR_TYPE_PATHS[activeType.value])
const route = useRoute()
const showGuideLink = computed(() => Boolean(guidePath.value) && route.path.replace(/\/+$/, '') !== guidePath.value)
</script>

<template>
  <div>
    <div class="flex items-start gap-3">
      <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
        <Icon :name="typeDefinition.icon" class="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <h2 class="text-lg font-semibold text-ink">{{ typeDefinition.label }} QR-kód</h2>
        <p class="mt-1 text-sm leading-relaxed text-ink-muted">{{ typeDefinition.description }}</p>
        <NuxtLink
          v-if="showGuideLink"
          :to="guidePath"
          class="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
        >
          {{ typeDefinition.label }} QR-kód: útmutató és tippek
          <Icon name="lucide:arrow-right" class="h-3.5 w-3.5" aria-hidden="true" />
        </NuxtLink>
      </div>
    </div>

    <div
      v-if="attempted && !isValid"
      class="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
      role="alert"
    >
      <Icon name="lucide:circle-alert" class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      Néhány mező javításra szorul. A pirossal jelölt mezők mellett látod a részleteket.
    </div>

    <div class="mt-5 grid gap-x-4 gap-y-4 sm:grid-cols-2">
      <QrField
        v-for="field in typeDefinition.fields"
        :key="`${activeType}-${field.key}`"
        :field="field"
        :model-value="values[field.key]"
        :error="errors[field.key]"
        :show-error="shouldShowError(field.key)"
        @update:model-value="setValue(field.key, $event)"
        @blur="markTouched(field.key)"
      />
    </div>

    <p class="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
      <Icon name="lucide:shield-check" class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
      <span>
        A statikus QR-kód a böngésződben készül. Az itt megadott adatok nem kerülnek fel a szerverre,
        és nem tároljuk őket. Példa: <span class="font-medium text-ink-soft">{{ typeDefinition.examples }}</span>
      </span>
    </p>
  </div>
</template>
