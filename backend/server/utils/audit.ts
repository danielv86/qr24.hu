import { getPrisma, withDb } from './db'
import { logger } from './logger'

export type AuditAction =
  | 'qr.created'
  | 'qr.updated'
  | 'qr.paused'
  | 'qr.activated'
  | 'qr.archived'
  | 'qr.deleted'
  | 'user.registered'
  | 'user.login'
  | 'user.oauth_login'
  | 'user.logout'

export const AUDIT_LABELS: Record<AuditAction, string> = {
  'qr.created': 'QR-kód létrehozva',
  'qr.updated': 'QR-kód módosítva',
  'qr.paused': 'QR-kód szüneteltetve',
  'qr.activated': 'QR-kód újraaktiválva',
  'qr.archived': 'QR-kód archiválva',
  'qr.deleted': 'QR-kód törölve',
  'user.registered': 'Fiók létrehozva',
  'user.login': 'Bejelentkezés',
  'user.oauth_login': 'Bejelentkezés külső szolgáltatóval',
  'user.logout': 'Kijelentkezés',
}

/**
 * Az auditnapló írása soha nem akadályozhatja a fő műveletet: hiba esetén
 * csak naplózunk, a felhasználó nem kap hibát.
 */
export async function writeAudit(input: {
  action: AuditAction
  userId?: number | bigint | null
  qrId?: number | bigint | null
  details?: Record<string, unknown>
}): Promise<void> {
  try {
    await withDb(() =>
      getPrisma().auditLog.create({
        data: {
          action: input.action,
          userId: input.userId ? BigInt(input.userId) : null,
          qrId: input.qrId ? BigInt(input.qrId) : null,
          details: input.details ? JSON.stringify(input.details).slice(0, 2000) : null,
        },
      }),
    )
  } catch (error) {
    logger.warn('Audit write failed', {
      action: input.action,
      error: error instanceof Error ? { name: error.name, message: error.message } : 'unknown',
    })
  }
}

export function isAuditAction(value: string): value is AuditAction {
  return Object.prototype.hasOwnProperty.call(AUDIT_LABELS, value)
}
