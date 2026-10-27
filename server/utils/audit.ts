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
  | 'user.verified'
  | 'user.login'
  | 'user.oauth_login'
  | 'user.logout'
  | 'user.updated'
  | 'user.password_changed'
  | 'user.deleted'
  | 'api_key.created'
  | 'api_key.revoked'
  | 'domain.added'
  | 'domain.verified'
  | 'domain.removed'
  | 'plans.updated'

export const AUDIT_LABELS: Record<AuditAction, string> = {
  'qr.created': 'QR-kód létrehozva',
  'qr.updated': 'QR-kód módosítva',
  'qr.paused': 'QR-kód szüneteltetve',
  'qr.activated': 'QR-kód újraaktiválva',
  'qr.archived': 'QR-kód archiválva',
  'qr.deleted': 'QR-kód törölve',
  'user.registered': 'Fiók létrehozva',
  'user.verified': 'E-mail-cím megerősítve',
  'user.login': 'Bejelentkezés',
  'user.oauth_login': 'Bejelentkezés külső szolgáltatóval',
  'user.logout': 'Kijelentkezés',
  'user.updated': 'Fiókadatok módosítva',
  'user.password_changed': 'Jelszó módosítva',
  'user.deleted': 'Fiók törölve',
  'api_key.created': 'API-kulcs létrehozva',
  'api_key.revoked': 'API-kulcs visszavonva',
  'domain.added': 'Saját domain hozzáadva',
  'domain.verified': 'Saját domain hitelesítve',
  'domain.removed': 'Saját domain eltávolítva',
  'plans.updated': 'Csomagbeállítás módosítva',
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
