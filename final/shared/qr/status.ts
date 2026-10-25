import type { UserDynamicQrStatus } from '../types/api'

/**
 * A dinamikus QR-kód állapotai. Ugyanezt használja a szerver (átirányítás
 * eldöntése) és a felület (címkék, szűrők), ezért a `shared/` alatt él.
 */
export type DynamicQrStatus = UserDynamicQrStatus

export const DYNAMIC_QR_STATUSES: DynamicQrStatus[] = ['active', 'paused', 'expired', 'archived']

export const DYNAMIC_QR_STATUS_LABELS: Record<DynamicQrStatus, string> = {
  active: 'Aktív',
  paused: 'Szüneteltetett',
  expired: 'Lejárt',
  archived: 'Archivált',
}

export interface DynamicQrStateLike {
  status?: string | null
  isActive?: boolean | null
  expiresAt?: Date | string | null
}

function toTimestamp(value: Date | string | null | undefined): number | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  const time = date.getTime()
  return Number.isNaN(time) ? null : time
}

/**
 * A tárolt állapot és a lejárati idő együtteséből számított tényleges állapot.
 * A lejárat nem igényel háttérfeladatot: olvasáskor számoljuk, így a lejárt
 * kód akkor is lejártként viselkedik, ha a státusz mező még "active".
 */
export function effectiveStatus(state: DynamicQrStateLike, now: Date = new Date()): DynamicQrStatus {
  const stored = (state.status || '').toLowerCase()
  if (stored === 'archived') return 'archived'
  if (stored === 'paused') return 'paused'
  if (stored && !DYNAMIC_QR_STATUSES.includes(stored as DynamicQrStatus)) {
    return state.isActive === false ? 'paused' : 'active'
  }
  if (!stored) {
    if (state.isActive === false) return 'paused'
  }
  const expiry = toTimestamp(state.expiresAt)
  if (expiry !== null && expiry <= now.getTime()) return 'expired'
  return 'active'
}

/** A lejárat beállításához használt segédfüggvény (helyi ISO sztring → Date). */
export function parseExpiry(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
