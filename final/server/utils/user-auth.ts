import { createHmac, randomBytes } from 'node:crypto'
import { deleteCookie, getCookie, setCookie, type H3Event } from 'h3'
import type { UserProfile } from '#shared/types/api'
import { ApiProblem } from './api'
import { hashPassword, verifyPassword } from './auth'
import { getPublicSiteUrl, getSessionSecret } from './config'
import { getPrisma, withDb } from './db'
import { logger } from './logger'

const SESSION_COOKIE = 'qr_user'
const SESSION_DAYS = 30

export interface UserSession {
  id: number
  email: string
  name: string | null
  plan: string
  createdAt: Date
  expiresAt: Date
}

export interface UserRow {
  id: bigint | number
  email: string
  name: string | null
  passwordHash: string | null
  plan: string
  createdAt: Date
}

function sessionTokenHash(token: string): string {
  return createHmac('sha256', getSessionSecret()).update(token).digest('hex')
}

function cookieSecure(event: H3Event): boolean {
  return process.env.NODE_ENV === 'production' && getPublicSiteUrl(event).startsWith('https://')
}

export function serializeUser(user: { id: bigint | number; email: string; name: string | null; plan: string; createdAt: Date }): UserProfile {
  return {
    id: Number(user.id),
    email: user.email,
    name: user.name,
    plan: user.plan,
    createdAt: new Date(user.createdAt).toISOString(),
  }
}

export async function createUserSession(event: H3Event, userId: bigint | number): Promise<void> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await withDb(() =>
    getPrisma().userSession.create({
      data: { tokenHash: sessionTokenHash(token), userId: BigInt(userId), expiresAt },
    }),
  )
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure(event),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
}

export async function destroyUserSession(event: H3Event): Promise<void> {
  const token = getCookie(event, SESSION_COOKIE)
  if (token) {
    try {
      await withDb(() =>
        getPrisma().userSession.deleteMany({ where: { tokenHash: sessionTokenHash(token) } }),
      )
    } catch {
      // Ha az adatbázis nem elérhető, a sütit akkor is töröljük.
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

export async function getUserSession(event: H3Event): Promise<UserSession | null> {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token || token.length < 20 || token.length > 200) return null
  const row = await withDb(() =>
    getPrisma().userSession.findUnique({
      where: { tokenHash: sessionTokenHash(token) },
      select: {
        expiresAt: true,
        user: { select: { id: true, email: true, name: true, plan: true, createdAt: true } },
      },
    }),
  )
  if (!row || !row.user) return null
  if (row.expiresAt.getTime() <= Date.now()) return null
  return {
    id: Number(row.user.id),
    email: row.user.email,
    name: row.user.name,
    plan: row.user.plan,
    createdAt: row.user.createdAt,
    expiresAt: row.expiresAt,
  }
}

export async function requireUser(event: H3Event): Promise<UserSession> {
  const session = await getUserSession(event)
  if (!session) {
    throw new ApiProblem(401, 'unauthorized', 'A művelethez be kell jelentkezned.')
  }
  return session
}

export async function findUserByEmail(email: string) {
  return withDb(() =>
    getPrisma().user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, name: true, passwordHash: true, plan: true, createdAt: true },
    }),
  )
}

export async function registerUser(input: {
  email: string
  password: string
  name?: string
}): Promise<UserRow> {
  const email = input.email.trim().toLowerCase()
  const existing = await findUserByEmail(email)
  if (existing) {
    throw new ApiProblem(409, 'email_taken', 'Ezzel az e-mail-címmel már létezik fiók.')
  }
  const passwordHash = await hashPassword(input.password)
  try {
    return await withDb(() =>
      getPrisma().user.create({
        data: {
          email,
          name: input.name?.trim().slice(0, 120) || null,
          passwordHash,
          plan: 'free',
        },
        select: { id: true, email: true, name: true, passwordHash: true, plan: true, createdAt: true },
      }),
    )
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ApiProblem(409, 'email_taken', 'Ezzel az e-mail-címmel már létezik fiók.')
    }
    throw error
  }
}

export async function authenticateUser(email: string, password: string): Promise<UserRow | null> {
  const user = await findUserByEmail(email)
  if (!user || !user.passwordHash) return null
  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) return null
  await withDb(() =>
    getPrisma().user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
  ).catch(() => {
    // A last_login_at frissítése nem akadályozhatja a bejelentkezést.
  })
  return user
}

/**
 * OAuth-bejelentkezéshez: a szolgáltató által hitelesített e-mail-címhez
 * felhasználót keresünk, vagy létrehozunk egyet jelszó nélkül.
 */
export async function findOrCreateOAuthUser(input: {
  provider: string
  providerAccountId: string
  email: string
  name?: string | null
}): Promise<{ userId: bigint | number; created: boolean }> {
  const prisma = getPrisma()
  const email = input.email.trim().toLowerCase()
  const link = await withDb(() =>
    prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider: input.provider, providerAccountId: input.providerAccountId } },
      select: { userId: true },
    }),
  )
  if (link) return { userId: link.userId, created: false }

  const existing = await findUserByEmail(email)
  let userId: bigint | number
  let created = false
  if (existing) {
    userId = existing.id
  } else {
    const user = await withDb(() =>
      prisma.user.create({
        data: {
          email,
          name: input.name?.trim().slice(0, 120) || null,
          passwordHash: null,
          plan: 'free',
          emailVerified: true,
        },
        select: { id: true },
      }),
    )
    userId = user.id
    created = true
  }

  await withDb(() =>
    prisma.oAuthAccount.create({
      data: {
        provider: input.provider,
        providerAccountId: input.providerAccountId,
        email,
        userId: BigInt(userId),
      },
    }),
  ).catch((error: unknown) => {
    // Versenyhelyzet: ha közben másik kérés létrehozta a kapcsolatot, az nem hiba.
    if ((error as { code?: string }).code !== 'P2002') throw error
  })
  await withDb(() => prisma.user.update({ where: { id: BigInt(userId) }, data: { lastLoginAt: new Date() } })).catch(() => {})
  logger.info('OAuth login', { provider: input.provider, created })
  return { userId, created }
}
