import type { H3Event } from 'h3'
import { ApiProblem, getClientIp } from './api'
import { serverEnv } from './env'
import { logger } from './logger'

const VERIFY_ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const VERIFY_TIMEOUT_MS = 8_000

interface TurnstileResult {
  success?: boolean
  'error-codes'?: string[]
  hostname?: string
  action?: string
}

/**
 * Be van-e állítva a robotellenőrzés. Amíg nincs titkos kulcs, a védelem
 * kikapcsolt állapotban van (fejlesztésben ez a normál eset).
 */
export function turnstileConfigured(): boolean {
  return Boolean(serverEnv('NUXT_TURNSTILE_SECRET_KEY'))
}

/**
 * Cloudflare Turnstile token ellenőrzése a szerveroldalon. A token egyszer
 * használható, ezért a kliensnek minden sikertelen kísérlet után újat kell kérnie.
 *
 * Ha nincs beállítva titkos kulcs, a hívás csendben visszatér: így a fejlesztői
 * és a még be nem állított éles környezet is működik.
 */
export async function assertTurnstile(event: H3Event, token?: string | null): Promise<void> {
  const secret = serverEnv('NUXT_TURNSTILE_SECRET_KEY')
  if (!secret) return

  const response = String(token || '').trim()
  if (!response || response.length > 4096) {
    throw new ApiProblem(
      400,
      'captcha_required',
      'Hiányzik a robotellenőrzés. Töltsd újra az űrlapot, és próbáld meg újra.',
    )
  }

  const body = new URLSearchParams({
    secret,
    response,
    remoteip: getClientIp(event),
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS)
  let result: TurnstileResult
  try {
    const res = await fetch(VERIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    })
    result = (await res.json()) as TurnstileResult
  } catch (error) {
    logger.warn('Turnstile verification request failed', { error })
    throw new ApiProblem(
      503,
      'captcha_unavailable',
      'A robotellenőrzés átmenetileg nem elérhető. Próbáld újra néhány perc múlva.',
    )
  } finally {
    clearTimeout(timer)
  }

  if (!result?.success) {
    logger.warn('Turnstile rejected token', { codes: result?.['error-codes'] })
    throw new ApiProblem(
      400,
      'captcha_failed',
      'A robotellenőrzés nem sikerült. Próbáld újra.',
    )
  }
}
