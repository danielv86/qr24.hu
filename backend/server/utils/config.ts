import { getRequestURL, type H3Event } from 'h3'
import { ApiProblem } from './api'

export function getPublicSiteUrl(event?: H3Event): string {
  const config = useRuntimeConfig(event)
  const configured = String(config.public.siteUrl || '').trim().replace(/\/$/, '')
  if (configured) return configured
  if (event) return getRequestURL(event).origin
  return 'http://localhost:3000'
}

function secret(name: string, label: string): string {
  const value = String(name || '').trim()
  if (value.length < 32) {
    throw new ApiProblem(
      503,
      'server_misconfigured',
      `${label} nincs megfelelően beállítva. Állíts be legalább 32 karakteres titkot a .env fájlban.`,
    )
  }
  return value
}

export function getSessionSecret(): string {
  return secret(String(useRuntimeConfig().sessionSecret || ''), 'A munkamenet-titok (NUXT_SESSION_SECRET)')
}

export function isDynamicQrEnabled(): boolean {
  return useRuntimeConfig().public.dynamicQrEnabled !== false
}

export function requireDynamicQrEnabled() {
  if (!isDynamicQrEnabled()) {
    throw new ApiProblem(404, 'dynamic_qr_disabled', 'A dinamikus QR-kód modul ezen a telepítésen nem elérhető.')
  }
}
