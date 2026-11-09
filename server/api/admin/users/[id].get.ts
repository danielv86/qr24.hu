import { getRouterParam, setResponseHeader, type H3Event } from 'h3'
import type { AdminUserDetail, AdminUserQrRow, PlanId } from '#shared/types/api'
import { ApiProblem, apiSuccess, defineApiHandler } from '../../../utils/api'
import { requireAdmin } from '../../../utils/auth'
import { getPrisma, withDb } from '../../../utils/db'
import { loadPlans } from '../../../utils/plans'
import { isTrialAvailable, subscriptionState, type SubscriptionRow } from '../../../utils/subscription'

function parseUserId(event: H3Event): number {
  const raw = getRouterParam(event, 'id') ?? ''
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiProblem(400, 'invalid_user_id', 'Érvénytelen felhasználó-azonosító.')
  }
  return id
}

export default defineApiHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  await requireAdmin(event)

  const id = parseUserId(event)
  const userId = BigInt(id)
  const now = new Date()
  const prisma = getPrisma()

  const [user, plans, sessionTotal, sessionActive, latestSession] = await withDb(() =>
    Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          emailVerified: true,
          emailVerificationSentAt: true,
          emailVerificationExpiresAt: true,
          emailVerificationAttempts: true,
          emailVerificationCodeHash: true,
          passwordHash: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          oauthAccounts: { select: { provider: true } },
          qrCodes: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              publicId: true,
              targetUrl: true,
              title: true,
              description: true,
              category: true,
              campaign: true,
              status: true,
              isActive: true,
              scans: true,
              lastScanAt: true,
              expiresAt: true,
              createdAt: true,
              updatedAt: true,
              style: true,
              ownerId: true,
            },
          },
          subscription: true,
          customDomains: {
            orderBy: { createdAt: 'desc' },
            select: { id: true, host: true, verifiedAt: true, createdAt: true },
          },
          apiKeys: {
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true, prefix: true, lastUsedAt: true, revokedAt: true, createdAt: true },
          },
          auditLogs: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: { id: true, action: true, details: true, createdAt: true },
          },
        },
      }),
      loadPlans(),
      prisma.userSession.count({ where: { userId } }),
      prisma.userSession.count({ where: { userId, expiresAt: { gt: now } } }),
      prisma.userSession.findFirst({ where: { userId }, orderBy: { expiresAt: 'desc' }, select: { expiresAt: true } }),
    ]),
  )

  if (!user) {
    throw new ApiProblem(404, 'user_not_found', 'A felhasználó nem található.')
  }

  const sub = user.subscription as (SubscriptionRow & { id: bigint; createdAt: Date; updatedAt: Date }) | null
  const state = subscriptionState(sub, now)
  const plan = state.plan as PlanId

  const qrCodes: AdminUserQrRow[] = user.qrCodes.map((qr) => ({
    id: Number(qr.id),
    publicId: qr.publicId,
    shortUrl: `/go/${qr.publicId}`,
    targetUrl: qr.targetUrl,
    title: qr.title,
    description: qr.description,
    category: qr.category,
    campaign: qr.campaign,
    status: qr.status,
    isActive: qr.isActive,
    scans: Number(qr.scans),
    lastScanAt: qr.lastScanAt?.toISOString() ?? null,
    expiresAt: qr.expiresAt?.toISOString() ?? null,
    createdAt: qr.createdAt.toISOString(),
    updatedAt: qr.updatedAt.toISOString(),
    hasStyle: Boolean(qr.style),
    owned: qr.ownerId !== null,
  }))

  const payload: AdminUserDetail = {
    id: Number(user.id),
    email: user.email,
    name: user.name,
    plan,
    planLabel: plans[plan].label,
    storedPlan: user.plan,
    emailVerified: user.emailVerified,
    emailVerification: {
      sentAt: user.emailVerificationSentAt?.toISOString() ?? null,
      expiresAt: user.emailVerificationExpiresAt?.toISOString() ?? null,
      attempts: user.emailVerificationAttempts,
      pending: Boolean(user.emailVerificationCodeHash),
    },
    hasPassword: Boolean(user.passwordHash),
    oauthProviders: [...new Set(user.oauthAccounts.map((account) => account.provider))],
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    sessions: {
      total: sessionTotal,
      active: sessionActive,
      latestExpiresAt: latestSession?.expiresAt.toISOString() ?? null,
    },
    qrCodes,
    qrTotalScans: qrCodes.reduce((sum, qr) => sum + qr.scans, 0),
    subscription: sub
      ? {
          id: Number(sub.id),
          // A részleges típus a subscriptionState miatt szűkített, a teljes sor minden mezőt tartalmaz.
          plan,
          planLabel: plans[plan].label,
          storedPlan: sub.plan,
          status: state.status,
          interval: sub.interval === 'yearly'
            ? 'yearly'
            : sub.interval === 'lifetime'
              ? 'lifetime'
              : 'monthly',
          trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
          currentPeriodStart: sub.currentPeriodStart?.toISOString() ?? null,
          currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          canceledAt: sub.canceledAt?.toISOString() ?? null,
          endedAt: sub.endedAt?.toISOString() ?? null,
          trialAvailable: isTrialAvailable(sub),
          createdAt: sub.createdAt.toISOString(),
          updatedAt: sub.updatedAt.toISOString(),
        }
      : null,
    customDomains: user.customDomains.map((domain) => ({
      id: Number(domain.id),
      host: domain.host,
      verifiedAt: domain.verifiedAt?.toISOString() ?? null,
      createdAt: domain.createdAt.toISOString(),
    })),
    apiKeys: user.apiKeys.map((key) => ({
      id: Number(key.id),
      name: key.name,
      prefix: key.prefix,
      lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
      revokedAt: key.revokedAt?.toISOString() ?? null,
      createdAt: key.createdAt.toISOString(),
    })),
    auditLogs: user.auditLogs.map((log) => ({
      id: Number(log.id),
      action: log.action,
      createdAt: log.createdAt.toISOString(),
      details: log.details,
    })),
  }

  return apiSuccess(event, payload)
})
