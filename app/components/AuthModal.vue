<script setup lang="ts">
/**
 * Bejelentkezés/regisztráció modális ablakban, hogy a látogató ne hagyja el
 * az oldalt. Sikeres belépés után az `authenticated` eseményt adja.
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    initialMode?: 'login' | 'register'
    title?: string
  }>(),
  { initialMode: 'login', title: 'Folytatás a fiókoddal' },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  authenticated: []
}>()

const dialog = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)

const titleId = useId()

function close() {
  emit('update:open', false)
}

function onAuthenticated() {
  emit('authenticated')
  close()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (!import.meta.client) return
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', onKeydown)
      await nextTick()
      closeButton.value?.focus()
    } else {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeydown)
    }
  },
)

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKeydown)
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <!-- A blur saját kulcskép-animációval jelenik meg, mert az opacity
           transition a backdrop-filtert a végén ugratja be. -->
      <div class="auth-modal-backdrop absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="close" />
      <div
        ref="dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        class="auth-modal-panel relative z-10 my-auto w-full max-w-md rounded-2xl border border-slate-200 bg-surface p-5 shadow-2xl sm:p-6"
      >
          <div class="flex items-start justify-between gap-3">
            <h2 :id="titleId" class="text-lg font-semibold text-ink">{{ title }}</h2>
            <button
              ref="closeButton"
              type="button"
              class="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink"
              aria-label="Bezárás"
              @click="close"
            >
              <Icon name="lucide:x" class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

        <AuthPanel
          class="mt-4"
          id-prefix="modal-auth"
          :initial-mode="initialMode"
          :show-legal="false"
          @authenticated="onAuthenticated"
        />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.auth-modal-backdrop {
  animation: auth-backdrop-in 200ms ease-out both;
}

.auth-modal-panel {
  animation: auth-panel-in 200ms ease-out both;
}

@keyframes auth-backdrop-in {
  from {
    background-color: rgb(15 23 42 / 0);
    backdrop-filter: blur(0);
  }
  to {
    background-color: rgb(15 23 42 / 0.5);
    backdrop-filter: blur(4px);
  }
}

@keyframes auth-panel-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-modal-backdrop,
  .auth-modal-panel {
    animation: none;
  }
}
</style>
