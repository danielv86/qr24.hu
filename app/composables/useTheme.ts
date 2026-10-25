export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'qr-theme'

function prefersDark(): boolean {
  if (!import.meta.client) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useTheme() {
  const preference = useState<ThemePreference>('theme-preference', () => 'system')
  const isDark = useState<boolean>('theme-is-dark', () => false)

  function apply(next: ThemePreference) {
    preference.value = next
    if (!import.meta.client) return
    const dark = next === 'system' ? prefersDark() : next === 'dark'
    isDark.value = dark
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.dataset.theme = next
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Privát módban a tárolás nem elérhető; a téma akkor is érvényesül.
    }
  }

  /** Világos → sötét → rendszer szerinti váltás. */
  function cycle() {
    apply(preference.value === 'light' ? 'dark' : preference.value === 'dark' ? 'system' : 'light')
  }

  function init() {
    if (!import.meta.client) return
    let stored: ThemePreference = 'system'
    try {
      const value = window.localStorage.getItem(STORAGE_KEY)
      if (value === 'light' || value === 'dark' || value === 'system') stored = value
    } catch {
      stored = 'system'
    }
    preference.value = stored
    isDark.value = document.documentElement.classList.contains('dark')
    if (stored === 'system') {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => apply('system'))
    }
  }

  return { preference, isDark, apply, cycle, init }
}
