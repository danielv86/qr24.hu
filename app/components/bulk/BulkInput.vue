<script setup lang="ts">
import type { BulkParseResult } from '#shared/bulk'

const props = defineProps<{
  modelValue: string
  result: BulkParseResult
  limit: number
  hint: string
  placeholder: string
  stepLabel?: string
  title?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const fileInput = ref<HTMLInputElement | null>(null)
const fileError = ref('')

const rows = computed(() => props.modelValue.split(/\r?\n/).length)

function update(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  fileError.value = ''
  if (!file) return
  if (file.size > 1_000_000) {
    fileError.value = 'A fájl legfeljebb 1 MB lehet.'
    input.value = ''
    return
  }
  try {
    const text = await file.text()
    emit('update:modelValue', text.replace(/^\uFEFF/, ''))
  } catch {
    fileError.value = 'A fájl beolvasása nem sikerült.'
  } finally {
    input.value = ''
  }
}

const problems = computed(() => props.result.rows.filter(row => row.status !== 'ok'))
const shownProblems = computed(() => problems.value.slice(0, 8))
</script>

<template>
  <section class="card p-5 sm:p-6" aria-labelledby="bulk-input-heading">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-brand-700">{{ stepLabel || '1. lépés' }}</p>
        <h2 id="bulk-input-heading" class="mt-1 text-xl">{{ title || 'Címek megadása' }}</h2>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn-ghost h-9 px-3 text-sm" @click="fileInput?.click()">
          <Icon name="lucide:upload" class="h-4 w-4" aria-hidden="true" />
          CSV feltöltése
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          class="sr-only"
          @change="onFile"
        >
        <slot name="actions" />
      </div>
    </div>

    <p class="mt-3 text-sm leading-relaxed text-ink-soft">
      Soronként egy kód. {{ hint }}
    </p>

    <label class="mt-4 block">
      <span class="sr-only">Kódok adatai</span>
      <textarea
        :value="modelValue"
        rows="10"
        spellcheck="false"
        class="w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-3 font-mono text-sm leading-relaxed text-ink shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        :placeholder="placeholder"
        @input="update"
      />
    </label>

    <p v-if="fileError" class="mt-2 text-sm text-rose-600">{{ fileError }}</p>

    <div class="mt-4 flex flex-wrap items-center gap-2 text-sm">
      <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
        <Icon name="lucide:check" class="h-3.5 w-3.5" aria-hidden="true" />
        {{ result.valid.length }} érvényes
      </span>
      <span
        v-if="result.invalidCount"
        class="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-700"
      >
        <Icon name="lucide:circle-alert" class="h-3.5 w-3.5" aria-hidden="true" />
        {{ result.invalidCount }} hibás
      </span>
      <span
        v-if="result.duplicateCount"
        class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700"
      >
        <Icon name="lucide:copy" class="h-3.5 w-3.5" aria-hidden="true" />
        {{ result.duplicateCount }} ismétlődő
      </span>
      <span class="text-ink-muted">{{ rows }} sor</span>
    </div>

    <p
      v-if="result.truncatedCount"
      class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
    >
      Egy tételben legfeljebb {{ limit }} kód generálható. A limit feletti
      {{ result.truncatedCount }} érvényes sor most kimarad – bontsd több tételre.
    </p>

    <div v-if="shownProblems.length" class="mt-3">
      <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Javítandó sorok</p>
      <ul class="mt-2 space-y-1.5">
        <li
          v-for="problem in shownProblems"
          :key="`${problem.line}-${problem.summary}`"
          class="flex gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
        >
          <span class="shrink-0 font-mono text-xs text-ink-muted">{{ problem.line }}.</span>
          <span class="min-w-0">
            <span class="font-medium text-ink">{{ problem.summary || '(üres)' }}</span>
            <span class="block text-xs text-rose-600">{{ problem.message }}</span>
          </span>
        </li>
      </ul>
      <p v-if="problems.length > shownProblems.length" class="mt-1.5 text-xs text-ink-muted">
        …és további {{ problems.length - shownProblems.length }} sor.
      </p>
    </div>
  </section>
</template>
