import { buildQrContent, createDefaultValues, getQrType } from './qr/content'
import type { QrFieldDefinition, QrFormValues, QrTypeId } from './qr/types'

/** Egy tételben legenerálható kódok száma. */
export const BULK_LIMIT = 100
const MAX_CELL_LENGTH = 2048

export type BulkRowStatus = 'ok' | 'invalid' | 'duplicate'

export interface BulkRow {
  /** A bemenet hányadik sora (1-től), hogy a hibát vissza lehessen keresni. */
  line: number
  label: string
  /** A QR-kódba kerülő kész tartalom. */
  payload: string
  /** Rövid, emberi összegzés az előnézethez és a riporthoz. */
  summary: string
  status: BulkRowStatus
  message?: string
}

export interface BulkParseResult {
  /** Minden beolvasott sor, a hibásokkal és duplikátumokkal együtt. */
  rows: BulkRow[]
  /** A ténylegesen legenerálandó sorok (a limithatárig). */
  valid: BulkRow[]
  total: number
  invalidCount: number
  duplicateCount: number
  /** A limit feletti érvényes sorok száma. */
  truncatedCount: number
  /** A felismert oszlopok nevei (fejlécsorból vagy pozícióból). */
  columns: string[]
}

export interface BulkParseOptions {
  type?: QrTypeId
  limit?: number
}

const LABEL_ALIASES = new Set(['name', 'nev', 'caption', 'felirat', 'filename', 'fajlnev', 'title', 'cimke'])

/** Ékezetek nélküli, kisbetűs összehasonlítás az oszlopnevekhez. */
function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function cleanCell(value: string): string {
  let text = value.replace(/^\uFEFF/, '').trim()
  if (text.length > 1 && text.startsWith('"') && text.endsWith('"')) {
    text = text.slice(1, -1).replace(/""/g, '"').trim()
  }
  return text
}

/**
 * Az elválasztó kiválasztása. A vesszőt csak akkor vesszük elválasztónak, ha a
 * típusnak egynél több mezője van – különben a címben szereplő vesszőt is
 * szétdobná (pl. `https://pelda.hu/kereses?q=alma,korte`).
 */
function detectDelimiter(lines: string[], multiField: boolean): string | null {
  const test = lines.slice(0, 5)
  if (test.some(line => line.includes('\t'))) return '\t'
  if (test.some(line => line.includes(';'))) return ';'
  if (multiField && test.some(line => line.includes(','))) return ','
  return null
}

function splitLine(line: string, delimiter: string | null): string[] {
  if (!delimiter) return [cleanCell(line)]
  return line.split(delimiter).map(cleanCell)
}

function parseBoolean(value: string): boolean {
  return /^(1|true|igen|yes|x|✓)$/i.test(value.trim())
}

/** A típus mezőihez tartozó oszlopnevek (a felületi súgóhoz). */
export function bulkColumns(type: QrTypeId): string[] {
  return ['name', ...getQrType(type).fields.map(field => field.key)]
}

/** Egy mező példaértéke a mintához (placeholder, alapérték, majd típus szerinti tartalék). */
function sampleValue(field: QrFieldDefinition, fallback: unknown): string {
  const candidate = field.placeholder || (typeof fallback === 'string' ? fallback : '')
  if (candidate) return candidate.replace(/[;\t\n]+/g, ' ')
  switch (field.type) {
    case 'url': return 'https://pelda.hu'
    case 'email': return 'pelda@pelda.hu'
    case 'tel': return '+36301234567'
    case 'checkbox': return '0'
    case 'number': return '1'
    case 'date': return '2026-06-01'
    case 'time': return '18:00'
    case 'select': return field.options?.[0]?.value ?? ''
    default: return 'Példa'
  }
}

/** Minta sorok a kiválasztott típushoz (a mezők placeholderéből). */
export function bulkSample(type: QrTypeId): string {
  const definition = getQrType(type)
  const values = createDefaultValues(type)
  const cells = definition.fields.map((field) => {
    // Az esemény mintájában a befejezésnek később kell lennie a kezdésnél.
    if (field.key === 'endDate') return '2026-06-02'
    if (field.key === 'endTime') return '20:00'
    // A jelszó-mező helyettesítő szövege útmutatás, nem valódi jelszó.
    if (field.key === 'password') return 'Jelszo123'
    return sampleValue(field, values[field.key])
  })
  return `${definition.label};${cells.join(';')}`
}

/** A rövid összegzés, ami a listában és a riportban megjelenik. */
function summarize(type: QrTypeId, payload: string, values: QrFormValues): string {
  const preferred = ['url', 'text', 'ssid', 'name', 'company', 'code', 'handle', 'phone', 'email']
  for (const key of preferred) {
    const value = String(values[key] ?? '').trim()
    if (value) return value.length > 80 ? `${value.slice(0, 77)}…` : value
  }
  const firstValue = Object.values(values).find(value => typeof value === 'string' && value.trim())
  if (typeof firstValue === 'string') return firstValue
  return payload.length > 80 ? `${payload.slice(0, 77)}…` : payload
}

function labelFromValues(values: QrFormValues): string {
  const candidates = ['name', 'title', 'ssid', 'company', 'code', 'text', 'url']
  for (const key of candidates) {
    const value = String(values[key] ?? '').trim()
    if (value) return value.replace(/\s+/g, ' ').slice(0, 60)
  }
  return ''
}

export function parseBulkInput(raw: string, options: BulkParseOptions = {}): BulkParseResult {
  const type: QrTypeId = options.type ?? 'url'
  const limit = options.limit ?? BULK_LIMIT
  const definition = getQrType(type)
  const fields = definition.fields
  const multiField = fields.length > 1

  const lines = raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((text, index) => ({ text, line: index + 1 }))
    .filter(entry => entry.text.trim())

  const delimiter = detectDelimiter(lines.map(entry => entry.text), multiField)
  const rows: BulkRow[] = []
  const seen = new Map<string, number>()
  let columns: string[] = []
  let mapping: ({ kind: 'label' } | { kind: 'field'; key: string })[] = []

  // Fejlécsor felismerése: a cellák a típus mezőneveire vagy a név-oszlopra hasonlítanak.
  const firstCells = lines.length ? splitLine(lines[0]!.text, delimiter) : []
  const normalizedCells = firstCells.map(normalizeKey)
  const fieldKeys = new Set(fields.map(field => normalizeKey(field.key)))
  const looksLikeHeader = firstCells.length > 1
    && normalizedCells.some(cell => fieldKeys.has(cell))
    && !firstCells.some(cell => /:\/\/|@/.test(cell))

  if (looksLikeHeader) {
    columns = firstCells
    mapping = firstCells.map((cell) => {
      const key = normalizeKey(cell)
      if (LABEL_ALIASES.has(key)) return { kind: 'label' as const }
      const field = fields.find(item => normalizeKey(item.key) === key || normalizeKey(item.label) === key)
      return field ? { kind: 'field' as const, key: field.key } : { kind: 'label' as const }
    })
    lines.shift()
  } else {
    columns = ['name', ...fields.map(field => field.key)]
    mapping = fields.map(field => ({ kind: 'field' as const, key: field.key }))
  }

  for (const entry of lines) {
    const cells = splitLine(entry.text, delimiter)
    const values: QrFormValues = createDefaultValues(type)
    let label = ''

    const assign = (target: { kind: 'label' } | { kind: 'field'; key: string }, value: string) => {
      if (!value) return
      if (target.kind === 'label') {
        label = label || value
        return
      }
      const field = fields.find(item => item.key === target.key)
      if (!field) return
      if (value.length > MAX_CELL_LENGTH) return
      values[target.key] = field.type === 'checkbox' ? parseBoolean(value) : value
    }

    if (looksLikeHeader) {
      cells.forEach((cell, index) => {
        const target = mapping[index]
        if (target) assign(target, cell)
      })
    } else if (cells.length > fields.length) {
      // Név + a mezők pozíció szerint (a többlet oszlop a végén név).
      label = cells[0] ?? ''
      cells.slice(1, fields.length + 1).forEach((cell, index) => {
        assign(mapping[index]!, cell)
      })
    } else {
      cells.forEach((cell, index) => {
        const target = mapping[index]
        if (target) assign(target, cell)
      })
    }

    const built = buildQrContent(type, values)
    if (!built.ok) {
      const message = Object.values(built.errors)[0] || 'A sor adatai hiányosak vagy érvénytelenek.'
      rows.push({
        line: entry.line,
        label: label || labelFromValues(values),
        payload: '',
        summary: entry.text.trim(),
        status: 'invalid',
        message,
      })
      continue
    }

    const firstLine = seen.get(built.data)
    if (firstLine !== undefined) {
      rows.push({
        line: entry.line,
        label: label || labelFromValues(values),
        payload: built.data,
        summary: summarize(type, built.data, values),
        status: 'duplicate',
        message: `Ugyanaz a tartalom már szerepel a(z) ${firstLine}. sorban.`,
      })
      continue
    }
    seen.set(built.data, entry.line)

    rows.push({
      line: entry.line,
      label: label || labelFromValues(values) || `${definition.shortLabel} ${rows.length + 1}`,
      payload: built.data,
      summary: summarize(type, built.data, values),
      status: 'ok',
    })
  }

  const okRows = rows.filter(row => row.status === 'ok')
  const valid = okRows.slice(0, limit)

  return {
    rows,
    valid,
    total: rows.length,
    invalidCount: rows.filter(row => row.status === 'invalid').length,
    duplicateCount: rows.filter(row => row.status === 'duplicate').length,
    truncatedCount: Math.max(0, okRows.length - valid.length),
    columns,
  }
}

export interface BulkSequenceOptions {
  start: number
  end: number
  step: number
  pad: number
  prefix: string
  suffix: string
  limit?: number
}

/** Sorszámozott értéksorozat (pl. egyedi kuponkódokhoz). */
export function buildSequence(options: BulkSequenceOptions): string[] {
  const step = Math.abs(Math.trunc(options.step)) || 1
  const start = Math.trunc(options.start)
  const end = Math.trunc(options.end)
  const pad = Math.max(0, Math.min(12, Math.trunc(options.pad)))
  const limit = options.limit ?? BULK_LIMIT
  const series: string[] = []

  if (end < start) return series
  for (let value = start; value <= end && series.length < limit; value += step) {
    const number = pad > 0 ? String(value).padStart(pad, '0') : String(value)
    series.push(`${options.prefix}${number}${options.suffix}`)
  }
  return series
}

/** Fájlnévhez használható, ékezet nélküli azonosító. */
export function slugifyLabel(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized.slice(0, 40).replace(/-+$/g, '')
}

/** Zipen belüli egyedi fájlnév: név-slug + sorszám. */
export function bulkFileName(row: BulkRow, index: number): string {
  const slug = slugifyLabel(row.label) || 'qr-kod'
  return `${slug}-${String(index + 1).padStart(3, '0')}`
}

function csvCell(value: string): string {
  return /[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Visszakövethető riport a legenerált fájlokról. */
export function buildBulkCsv(rows: BulkRow[], typeLabel = ''): string {
  const header = 'Nev;Tipus;Tartalom;Fajlnev'
  const lines = rows.map((row, index) => [
    row.label,
    typeLabel,
    row.summary || row.payload,
    bulkFileName(row, index),
  ].map(csvCell).join(';'))
  return [header, ...lines].join('\r\n')
}
