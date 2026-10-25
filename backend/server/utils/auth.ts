import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { deleteCookie, getCookie, setCookie, type H3Event } from 'h3'
import { ApiProblem } from './api'
import { getPublicSiteUrl, getSessionSecret } from './config'
import { getPrisma, withDb } from './db'
import { logger } from './logger'

const SESSION_COOKIE = 'qr_admin'
const SESSION_DAYS = 7
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEYLEN = 64

export interface AdminAuthSession {
  id: number
  email: string
  role: 'admin'
  expiresAt: Date
}

export interface AdminRow {
  id: number
  email: string
  passwordHash: string
  role: string
  failedAttempts: number
  lockedUntil: Date | null
}

function scryptAsync(password: string, salt: Buffer, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error)
      else resolve(key as Buffer)
    })
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scryptAsync(password, salt, SCRYPT_KEYLEN)
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${derived.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const n = Number(parts[1])
  const r = Number(parts[2])
  const p = Number(parts[3])
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false
  if (n < 4096 || n > 1_048_576 || r < 1 || r > 32 || p < 1 || p > 16) return false
  let salt: Buffer
  let expected: Buffer
  try {
    salt = Buffer.from(parts[4] || '', 'base64')
    expected = Buffer.from(parts[5] || '', 'base64')
  } catch {
    return false
  }
  if (salt.length < 8 || expected.length < 16) return false
  try {
    const derived = await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, expected.length, { N: n, r, p, maxmem: 128 * 1024 * 1024 }, (error, key) => {
        if (error) reject(error)
        else resolve(key as Buffer)
      })
    })
    return derived.length === expected.length && timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}

function sessionTokenHash(token: string): string {
  return createHmac('sha256', getSessionSecret()).update(token).digest('hex')
}

function cookieSecure(event: H3Event): boolean {
  // Fejlesztésben a backend http-n fut a Nuxt proxy mögött, ezért ott nem
  // állítunk Secure jelzőt, különben a böngésző eldobná a sütit.
  return process.env.NODE_ENV === 'production' && getPublicSiteUrl(event).startsWith('https://')
}

export async function createAdminSession(event: H3Event, admin: { id: number; email: string }): Promise<void> {
  const token = randomBytes(32).toString('base64url')
  const tokenHash = sessionTokenHash(token)
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await withDb(() =>
    getPrisma().adminSession.create({
      data: { tokenHash, adminId: admin.id, expiresAt },
    }),
  )
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure(event),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
  await withDb(() =>
    getPrisma().adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } }),
  ).catch(() => {
    // A last_login_at hiánya nem akadályozhatja a bejelentkezést.
  })
  logger.info('Admin session created', { adminId: admin.id })
}

export async function getAdminSession(event: H3Event): Promise<AdminAuthSession | null> {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token || token.length < 20 || token.length > 200) return null
  const hash = sessionTokenHash(token)
  const row = await withDb(() =>
    getPrisma().adminSession.findUnique({
      where: { tokenHash: hash },
      select: { expiresAt: true, admin: { select: { id: true, email: true, role: true } } },
    }),
  )
  if (!row || !row.admin || row.admin.role !== 'admin') return null
  if (row.expiresAt.getTime() <= Date.now()) return null
  return {
    id: row.admin.id,
    email: row.admin.email,
    role: 'admin',
    expiresAt: row.expiresAt,
  }
}

export async function requireAdmin(event: H3Event): Promise<AdminAuthSession> {
  const session = await getAdminSession(event)
  if (!session) {
    throw new ApiProblem(401, 'unauthorized', 'A művelethez bejelentkezett adminisztrátor szükséges.')
  }
  return session
}

export async function destroyAdminSession(event: H3Event): Promise<void> {
  const token = getCookie(event, SESSION_COOKIE)
  if (token) {
    try {
      await withDb(() =>
        getPrisma().adminSession.deleteMany({ where: { tokenHash: sessionTokenHash(token) } }),
      )
    } catch {
      // Ha az adatbázis nem elérhető, a cookie-t akkor is töröljük.
    }
  }
  deleteCookie(event, SESSION_COOKIE, { path: '/', secure: cookieSecure(event), sameSite: 'lax' })
  setCookie(event, SESSION_COOKIE, '', {
    httpOnly: true,
    secure: cookieSecure(event),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export async function findAdminByEmail(email: string): Promise<AdminRow | null> {
  return withDb(() =>
    getPrisma().adminUser.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        failedAttempts: true,
        lockedUntil: true,
      },
    }),
  )
}

export async function registerFailedLogin(admin: AdminRow): Promise<void> {
  const attempts = Number(admin.failedAttempts) + 1
  const lockUntil = attempts >= 8 ? new Date(Date.now() + 15 * 60 * 1000) : null
  await withDb(() =>
    getPrisma().adminUser.update({
      where: { id: admin.id },
      data: { failedAttempts: attempts, lockedUntil: lockUntil },
    }),
  )
  logger.warn('Failed admin login', { adminId: admin.id, attempts })
}

export async function resetFailedLogins(adminId: number): Promise<void> {
  await withDb(() =>
    getPrisma().adminUser.update({
      where: { id: adminId },
      data: { failedAttempts: 0, lockedUntil: null },
    }),
  )
}

export async function cleanupExpiredSessions(): Promise<void> {
  await withDb(() =>
    getPrisma().adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
  ).catch(() => {})
}

export function isAccountLocked(admin: AdminRow): boolean {
  return Boolean(admin.lockedUntil && admin.lockedUntil.getTime() > Date.now())
}
