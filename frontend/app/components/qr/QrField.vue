<script setup lang="ts">
import type { QrFieldDefinition } from '#shared/qr/types'

const props = defineProps<{
  field: QrFieldDefinition
  modelValue: string | boolean | undefined
  error?: string
  showError?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | boolean]
  blur: []
}>()

const inputId = computed(() => `qr-field-${props.field.key}`)
const helpId = computed(() => `${inputId.value}-help`)
const errorId = computed(() => `${inputId.value}-error`)
const describedBy = computed(() => {
  if (props.showError && props.error) return errorId.value
  if (props.field.help) return helpId.value
  return undefined
})

const value = computed(() => (typeof props.modelValue === 'string' ? props.modelValue : ''))
const checked = computed(() => props.modelValue === true)

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value)
}
</script>

<template>
  <div :class="field.half ? 'sm:col-span-1' : 'sm:col-span-2'">
    <label
      v-if="field.type !== 'checkbox'"
      :for="inputId"
      class="field-label"
    >
      {{ field.label }}
      <span v-if="field.required" class="text-brand-600" aria-hidden="true">*</span>
    </label>

    <template v-if="field.type === 'textarea'">
      <textarea
        :id="inputId"
        class="field-input resize-y"
        :value="value"
        :placeholder="field.placeholder"
        :rows="field.rows || 3"
        :required="field.required"
        :aria-invalid="showError && error ? 'true' : undefined"
        :aria-describedby="describedBy"
        @input="onInput"
        @blur="emit('blur')"
      />
    </template>

    <template v-else-if="field.type === 'select'">
      <select
        :id="inputId"
        class="field-input"
        :value="value"
        :required="field.required"
        :aria-invalid="showError && error ? 'true' : undefined"
        :aria-describedby="describedBy"
        @change="onInput"
        @blur="emit('blur')"
      >
        <option v-for="option in field.options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </template>

    <template v-else-if="field.type === 'checkbox'">
      <label
        :for="inputId"
        class="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-300 bg-surface p-3 transition-colors hover:border-slate-400"
      >
        <input
          :id="inputId"
          type="checkbox"
          class="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-600"
          :checked="checked"
          :aria-describedby="describedBy"
          @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
          @blur="emit('blur')"
        />
        <span>
          <span class="block text-sm font-medium text-ink">{{ field.label }}</span>
          <span v-if="field.help" :id="helpId" class="mt-0.5 block text-xs text-ink-muted">{{ field.help }}</span>
        </span>
      </label>
    </template>

    <template v-else>
      <input
        :id="inputId"
        class="field-input"
        :type="field.type"
        :value="value"
        :placeholder="field.placeholder"
        :required="field.required"
        :inputmode="field.inputmode"
        :autocomplete="field.autocomplete || 'off'"
        :min="field.min"
        :max="field.max"
        :step="field.step"
        :aria-invalid="showError && error ? 'true' : undefined"
        :aria-describedby="describedBy"
        @input="onInput"
        @blur="emit('blur')"
      />
    </template>

    <p v-if="field.help && field.type !== 'checkbox'" :id="helpId" class="field-help">
      {{ field.help }}
    </p>
    <p v-if="showError && error" :id="errorId" class="field-error" role="alert">
      <Icon name="lucide:circle-alert" class="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {{ error }}
    </p>
  </div>
</template>
