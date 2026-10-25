import type { UserDynamicQrStatus } from '~/types/api'

/**
 * A dinamikus QR-kód állapotai a felületen. A szerveroldali döntés (lejárat,
 * szüneteltetés, archiválás) a backendé; itt csak a megjelenítéshez kell a
 * címke és a szűrők listája.
 */
export type DynamicQrStatus = UserDynamicQrStatus

export const DYNAMIC_QR_STATUSES: DynamicQrStatus[] = ['active', 'paused', 'expired', 'archived']

export const DYNAMIC_QR_STATUS_LABELS: Record<DynamicQrStatus, string> = {
  active: 'Aktív',
  paused: 'Szüneteltetett',
  expired: 'Lejárt',
  archived: 'Archivált',
}
