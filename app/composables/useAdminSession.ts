import type { AdminSession, ApiSuccess } from '#shared/types/api'

type AdminSessionStatus = 'idle' | 'checking' | 'ready'

/**
 * Az admin munkamenet egy helyen él: a layout ellenőrzi, és aszerint mutatja a
 * bejelentkező kártyát vagy a felületet. Az admin oldalak erre az állapotra
 * várva töltik az adataikat, így bejelentkezés nélkül nem indulnak kérések.
 */
export function useAdminSession() {
  const session = useState<AdminSession | null>('admin-session', () => null)
  const status = useState<AdminSessionStatus>('admin-session-status', () => 'idle')
  const email = useState<string>('admin-login-email', () => '')
  const password = ref('')
  const error = ref('')
  const pending = ref(false)

  async function refresh() {
    status.value = 'checking'
    try {
      const response = await $fetch<ApiSuccess<AdminSession>>('/api/admin/session')
      session.value = response.data
    } catch {
      session.value = null
    } finally {
      status.value = 'ready'
    }
  }

  async function login(captchaToken?: string) {
    error.value = ''
    pending.value = true
    try {
      const response = await $fetch<ApiSuccess<AdminSession>>('/api/admin/login', {
        method: 'POST',
        body: {
          email: email.value,
          password: password.value,
          ...(captchaToken ? { captchaToken } : {}),
        },
      })
      session.value = response.data
      password.value = ''
      status.value = 'ready'
    } catch (caught) {
      error.value = apiErrorMessage(caught, 'Sikertelen bejelentkezés.')
    } finally {
      pending.value = false
    }
  }

  async function logout() {
    try {
      await $fetch('/api/admin/logout', { method: 'POST' })
    } catch {
      // A kliensoldali állapotot akkor is töröljük.
    }
    session.value = null
    status.value = 'ready'
  }

  return { session, status, email, password, error, pending, refresh, login, logout }
}
