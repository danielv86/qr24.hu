import type { OAuthProviderAvailability, UserProfile, UserSessionPayload } from '~/types/api'

interface SessionState {
  user: UserProfile | null
  providers: OAuthProviderAvailability
}

export function useUserSession() {
  const state = useState<SessionState>('user-session', () => ({
    user: null,
    providers: { google: false, apple: false },
  }))
  const loading = useState<boolean>('user-session-loading', () => false)
  const request = useRequestFetch()

  async function refresh(): Promise<UserProfile | null> {
    loading.value = true
    try {
      const response = await request<{ success: true; data: UserSessionPayload }>('/api/auth/session', {
        headers: { accept: 'application/json' },
      })
      state.value = { user: response.data.user, providers: response.data.providers }
      return response.data.user
    } catch {
      state.value = { user: null, providers: { google: false, apple: false } }
      return null
    } finally {
      loading.value = false
    }
  }

  async function login(email: string, password: string): Promise<void> {
    await $fetch('/api/auth/login', { method: 'POST', body: { email, password } })
    await refresh()
  }

  async function register(email: string, password: string, name: string): Promise<void> {
    await $fetch('/api/auth/register', { method: 'POST', body: { email, password, name } })
    await refresh()
  }

  async function logout(): Promise<void> {
    await $fetch('/api/auth/logout', { method: 'POST', body: {} })
    state.value = { user: null, providers: state.value.providers }
    await navigateTo('/')
  }

  return {
    user: computed(() => state.value.user),
    providers: computed(() => state.value.providers),
    loading: computed(() => loading.value),
    refresh,
    login,
    register,
    logout,
  }
}
