export type AdminToastVariant = 'success' | 'error' | 'info'

export interface AdminToastItem {
  id: number
  title: string
  description?: string
  variant: AdminToastVariant
}

let sequence = 0
const timers = new Map<number, ReturnType<typeof setTimeout>>()

/**
 * Admin értesítések (toast). A lista Nuxt state-ben él, így az admin layout
 * egyetlen kirajzolója minden oldalról ugyanazt a sort mutatja.
 */
export function useAdminToast() {
  const toasts = useState<AdminToastItem[]>('admin-toasts', () => [])

  function dismiss(id: number) {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
    toasts.value = toasts.value.filter(toast => toast.id !== id)
  }

  function push(variant: AdminToastVariant, title: string, description?: string, duration = 4200) {
    const id = ++sequence
    toasts.value = [...toasts.value, { id, title, description, variant }]
    timers.set(id, setTimeout(() => dismiss(id), duration))
    return id
  }

  return {
    toasts,
    dismiss,
    success: (title: string, description?: string) => push('success', title, description),
    error: (title: string, description?: string) => push('error', title, description),
    info: (title: string, description?: string) => push('info', title, description),
  }
}
