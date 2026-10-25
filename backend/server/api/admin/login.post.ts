import { setResponseHeader } from 'h3'
import { ApiProblem, apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import {
  cleanupExpiredSessions,
  createAdminSession,
  findAdminByEmail,
  hashPassword,
  isAccountLocked,
  registerFailedLogin,
  resetFailedLogins,
  verifyPassword,
} from '../../utils/auth'
import { isDbConfigured } from '../../utils/db'
import { enforceRateLimit } from '../../utils/rate-limit'
import { assertSameOrigin, adminLoginSchema, readJsonBody } from '../../utils/validation'

export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const ip = getClientIp(event)
  await enforceRateLimit(event, {
    bucket: 'admin-login-ip',
    key: ip,
    limit: 8,
    windowSeconds: 15 * 60,
    message: 'Túl sok bejelentkezési kísérlet. Próbáld újra 15 perc múlva.',
  })

  const input = await readJsonBody(event, adminLoginSchema)
  await enforceRateLimit(event, {
    bucket: 'admin-login-account',
    key: input.email,
    limit: 20,
    windowSeconds: 15 * 60,
    message: 'Túl sok bejelentkezési kísérlet ehhez a fiókhoz.',
  })

  if (!isDbConfigured()) {
    throw new ApiProblem(503, 'database_not_configured', 'Az adminisztrációhoz nincs beállítva adatbázis.')
  }

  const admin = await findAdminByEmail(input.email)
  if (!admin) {
    // Azonos időigényű jelszó-ellenőrzés a felhasználó felsorolás csökkentésére.
    await hashPassword(input.password)
    throw new ApiProblem(401, 'invalid_credentials', 'Sikertelen bejelentkezés.')
  }

  if (admin.role !== 'admin') {
    throw new ApiProblem(401, 'invalid_credentials', 'Sikertelen bejelentkezés.')
  }

  if (isAccountLocked(admin)) {
    throw new ApiProblem(429, 'account_locked', 'Túl sok sikertelen próbálkozás. Próbáld újra 15 perc múlva.', {
      retryAfter: 900,
    })
  }

  const valid = await verifyPassword(input.password, admin.passwordHash)
  if (!valid) {
    await registerFailedLogin(admin)
    throw new ApiProblem(401, 'invalid_credentials', 'Sikertelen bejelentkezés.')
  }

  await resetFailedLogins(admin.id)
  await createAdminSession(event, admin)
  await cleanupExpiredSessions()

  return apiSuccess(event, { email: admin.email, role: 'admin' as const })
})
