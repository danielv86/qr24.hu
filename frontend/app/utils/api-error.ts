interface ApiErrorData {
  error?: {
    message?: string
    details?: Record<string, string>
  }
}

export function apiErrorMessage(error: unknown, fallback = 'A művelet nem sikerült. Próbáld újra.'): string {
  const data = (error as { data?: ApiErrorData })?.data
  const message = data?.error?.message
  const details = data?.error?.details
  const firstDetail = details ? Object.values(details)[0] : ''
  if (message && firstDetail && firstDetail !== message) return `${message} ${firstDetail}`
  if (message) return message
  if (error instanceof Error && error.message) {
    if (error.message.includes('fetch')) return 'A szerver nem elérhető. Ellenőrizd a kapcsolatot, majd próbáld újra.'
    return error.message
  }
  return fallback
}
