<script setup lang="ts">
const { toasts, dismiss } = useAdminToast()

const ICONS: Record<string, string> = {
  success: 'lucide:check-circle-2',
  error: 'lucide:alert-circle',
  info: 'lucide:info',
}

const CLASSES: Record<string, string> = {
  success: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100',
  error: 'border-red-400/30 bg-red-500/15 text-red-100',
  info: 'border-violet-400/30 bg-violet-500/15 text-violet-100',
}

const ICON_CLASSES: Record<string, string> = {
  success: 'text-emerald-300',
  error: 'text-red-300',
  info: 'text-violet-300',
}
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed bottom-4 right-4 z-[150] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      role="region"
      aria-label="Értesítések"
    >
      <TransitionGroup name="admin-toast" tag="div" class="flex flex-col gap-2">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-start gap-3 rounded-xl border px-3.5 py-3 shadow-2xl backdrop-blur-md"
          :class="CLASSES[toast.variant]"
          role="status"
        >
          <Icon :name="ICONS[toast.variant] ?? 'lucide:info'" :class="['mt-0.5 h-5 w-5 shrink-0', ICON_CLASSES[toast.variant] ?? '']" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold">{{ toast.title }}</p>
            <p v-if="toast.description" class="mt-0.5 text-xs leading-relaxed opacity-80">{{ toast.description }}</p>
          </div>
          <button
            type="button"
            class="-mr-1 -mt-1 shrink-0 rounded-lg p-1 opacity-60 transition-opacity hover:opacity-100"
            aria-label="Értesítés bezárása"
            @click="dismiss(toast.id)"
          >
            <Icon name="lucide:x" class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.admin-toast-enter-active,
.admin-toast-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.admin-toast-enter-from,
.admin-toast-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
</style>
