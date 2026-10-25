import { parseHttpUrl } from './qr/content'

/** Egy tételben legenerálható kódok száma. */
export const BULK_LIMIT = 100
const MAX_URL_LENGTH = 2048

export type BulkRowStatus = 'ok' | 'invalid' | 'duplicate'

export interface BulkRow {
  /** A bemenet hányadik sora (1-től), hogy a hibát vissza lehessen keresni. */
  line: number
  label: string
  /** Normalizált cím (https:// hozzáadva, ha hiányzott). */
  url: string
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
}

const HEADER_PATTERN = /^(n[ée]v|name|title|c[íi]m|url|link|address|c[ée]l|le[íi]r[áa]s)$/i

function cleanCell(value: string): string {
  let text = value.replace(/^\uFEFF/, '').trim()
  if (text.length > 1 && text.startsWith('"') && text.endsWith('"')) {
    text = text.slice(1, -1).replace(/""/g, '"').trim()
  }
  return text
}

function looksLikeUrl(value: string): boolean {
  return parseHttpUrl(value) !== null
}

/**
 * Egy sor felbontása név + cím párosra. A pontosvesszőt és a tabulátort mindig
 * elválasztónak vesszük; a vesszőt csak akkor, ha az utána következő rész
 * egyértelműen webcím (különben a címben lévő vesszőt nem bontanánk el).
 */
function splitRow(line: string): { label: string; value: string } {
  const tabIndex = line.indexOf('\t')
  if (tabIndex >= 0) {
    return { label: cleanCell(line.slice(0, tabIndex)), value: cleanCell(line.slice(tabIndex + 1)) }
  }

  const semicolonIndex = line.indexOf(';')
  if (semicolonIndex >= 0) {
    return {
      label: cleanCell(line.slice(0, semicolonIndex)),
      value: cleanCell(line.slice(semicolonIndex + 1)),
    }
  }

  const commaIndex = line.indexOf(',')
  if (commaIndex > 0) {
    const left = cleanCell(line.slice(0, commaIndex))
    const right = cleanCell(line.slice(commaIndex + 1))
    if (right && looksLikeUrl(right) && !looksLikeUrl(left)) {
      return { label: left, value: right }
    }
  }

  return { label: '', value: cleanCell(line) }
}

/** A címből képzett olvasható név, ha a bemenet nem adott meg nevet. */
export function labelFromUrl(value: string): string {
  const url = parseHttpUrl(value)
  if (!url) return ''
  const segments = url.pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  if (!last) return url.hostname.replace(/^www\./, '')
  return decodeURIComponent(last)
    .replace(/\.[a-z0-9]{1,5}$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim()
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

export function parseBulkInput(raw: string, limit: number = BULK_LIMIT): BulkParseResult {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n')
  const rows: BulkRow[] = []
  const seen = new Map<string, number>()

  lines.forEach((line, index) => {
    if (!line.trim()) return
    const lineNumber = index + 1
    const { label, value } = splitRow(line)

    // A fejlécsor (pl. „Név;Cím”) nem cím, ezért kihagyjuk.
    if (rows.length === 0 && !looksLikeUrl(value) && HEADER_PATTERN.test(label) && HEADER_PATTERN.test(value)) {
      return
    }

    const cleanedLabel = label.trim()
    if (!value) {
      rows.push({
        line: lineNumber,
        label: cleanedLabel,
        url: '',
        status: 'invalid',
        message: 'Hiányzó webcím.',
      })
      return
    }

    if (value.length > MAX_URL_LENGTH) {
      rows.push({
        line: lineNumber,
        label: cleanedLabel,
        url: value.slice(0, MAX_URL_LENGTH),
        status: 'invalid',
        message: `A webcím legfeljebb ${MAX_URL_LENGTH} karakter lehet.`,
      })
      return
    }

    const parsed = parseHttpUrl(value)
    if (!parsed) {
      rows.push({
        line: lineNumber,
        label: cleanedLabel,
        url: value,
        status: 'invalid',
        message: 'Érvénytelen webcím (csak http és https engedélyezett).',
      })
      return
    }

    const normalized = parsed.toString()
    const firstLine = seen.get(normalized)
    if (firstLine !== undefined) {
      rows.push({
        line: lineNumber,
        label: cleanedLabel,
        url: normalized,
        status: 'duplicate',
        message: `Ugyanez a cím már szerepel a(z) ${firstLine}. sorban.`,
      })
      return
    }
    seen.set(normalized, lineNumber)

    rows.push({
      line: lineNumber,
      label: cleanedLabel || labelFromUrl(normalized),
      url: normalized,
      status: 'ok',
    })
  })

  const okRows = rows.filter(row => row.status === 'ok')
  const valid = okRows.slice(0, limit)

  return {
    rows,
    valid,
    total: rows.length,
    invalidCount: rows.filter(row => row.status === 'invalid').length,
    duplicateCount: rows.filter(row => row.status === 'duplicate').length,
    truncatedCount: Math.max(0, okRows.length - valid.length),
  }
}

/** Zipen belüli egyedi fájlnév: név-slug + sorszám. */
export function bulkFileName(row: BulkRow, index: number): string {
  const slug = slugifyLabel(row.label) || slugifyLabel(labelFromUrl(row.url)) || 'qr-kod'
  return `${slug}-${String(index + 1).padStart(3, '0')}`
}

function csvCell(value: string): string {
  return /[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Visszakövethető riport a legenerált fájlokról. */
export function buildBulkCsv(rows: BulkRow[]): string {
  const header = 'Nev;Cim;Fajlnev'
  const lines = rows.map((row, index) => [row.label, row.url, bulkFileName(row, index)]
    .map(csvCell)
    .join(';'))
  return [header, ...lines].join('\r\n')
}
