import {
  getHeader,
  getQuery,
  getRequestURL,
  readBody,
  type H3Event,
} from 'h3'
import { z } from 'zod'
import { ApiProblem } from './api'
import { getPublicSiteUrl } from './config'

const MAX_BODY_BYTES = 16 * 1024

const optionalText = (max: number, message: string) =>
  z.string({ error: message }).trim().max(max, message).optional().default('')

const optionalOptionalText = (max: number, message: string) =>
  z.string({ error: message }).trim().max(max, message).optional()

export const dynamicQrCreateSchema = z.object({
  targetUrl: z
    .string({ error: 'Add meg a cél-URL-t.' })
    .trim()
    .min(1, 'Add meg a cél-URL-t.')
    .max(2048, 'A cél-URL legfeljebb 2048 karakter lehet.'),
  title: z
    .string({ error: 'A cím csak szöveg lehet.' })
    .trim()
    .max(120, 'A cím legfeljebb 120 karakter lehet.')
    .optional()
    .default(''),
  description: optionalOptionalText(500, 'A leírás legfeljebb 500 karakter lehet.'),
  category: optionalOptionalText(60, 'A kategória legfeljebb 60 karakter lehet.'),
  campaign: optionalOptionalText(60, 'A kampány neve legfeljebb 60 karakter lehet.'),
  expiresAt: z
    .string({ error: 'A lejárat csak dátum lehet.' })
    .trim()
    .max(40, 'Érvénytelen lejárati dátum.')
    .optional(),
  style: z.string().max(8000, 'A megjelenési beállítás túl hosszú.').optional(),
}).strict()

export const dynamicQrUpdateSchema = z.object({
  targetUrl: z
    .string({ error: 'A cél-URL csak szöveg lehet.' })
    .trim()
    .min(1, 'A cél-URL nem lehet üres.')
    .max(2048, 'A cél-URL legfeljebb 2048 karakter lehet.')
    .optional(),
  title: z
    .string({ error: 'A cím csak szöveg lehet.' })
    .trim()
    .max(120, 'A cím legfeljebb 120 karakter lehet.')
    .optional(),
  description: optionalOptionalText(500, 'A leírás legfeljebb 500 karakter lehet.'),
  category: optionalOptionalText(60, 'A kategória legfeljebb 60 karakter lehet.'),
  campaign: optionalOptionalText(60, 'A kampány neve legfeljebb 60 karakter lehet.'),
  expiresAt: z
    .string({ error: 'A lejárat csak dátum lehet.' })
    .trim()
    .max(40, 'Érvénytelen lejárati dátum.')
    .nullable()
    .optional(),
  style: z.string().max(8000, 'A megjelenési beállítás túl hosszú.').optional(),
  isActive: z.boolean({ error: 'Az aktív állapot csak igaz/hamis lehet.' }).optional(),
}).strict().refine(value => Object.keys(value).length > 0, {
  message: 'Adj meg legalább egy módosítandó mezőt.',
})

export const userRegisterSchema = z.object({
  email: z
    .email({ error: 'Érvényes e-mail-címet adj meg.' })
    .trim()
    .toLowerCase()
    .max(190, 'Az e-mail-cím túl hosszú.'),
  password: z
    .string({ error: 'Add meg a jelszót.' })
    .min(10, 'A jelszó legalább 10 karakter legyen.')
    .max(200, 'A jelszó túl hosszú.')
    .refine(value => /[a-zA-Z]/.test(value) && /\d/.test(value), 'A jelszó tartalmazzon betűt és számot.'),
  name: z
    .string({ error: 'A név csak szöveg lehet.' })
    .trim()
    .max(120, 'A név legfeljebb 120 karakter lehet.')
    .optional()
    .default(''),
}).strict()

export const userLoginSchema = z.object({
  email: z
    .email({ error: 'Érvényes e-mail-címet adj meg.' })
    .trim()
    .toLowerCase()
    .max(190, 'Az e-mail-cím túl hosszú.'),
  password: z
    .string({ error: 'Add meg a jelszót.' })
    .min(1, 'Add meg a jelszót.')
    .max(200, 'A jelszó túl hosszú.'),
}).strict()

export const dynamicQrListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(50).optional().default(12),
  q: z.string().trim().max(120).optional().default(''),
  status: z.enum(['all', 'active', 'paused', 'expired', 'archived']).optional().default('all'),
  category: z.string().trim().max(60).optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'lastScanAt', 'scans', 'title']).optional().default('createdAt'),
  dir: z.enum(['asc', 'desc']).optional().default('desc'),
})

export const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(730).optional().default(30),
})

export const adminLoginSchema = z.object({
  email: z
    .email({ error: 'Érvényes e-mail-címet adj meg.' })
    .trim()
    .toLowerCase()
    .max(190, 'Az e-mail-cím túl hosszú.'),
  password: z
    .string({ error: 'Add meg a jelszót.' })
    .min(1, 'Add meg a jelszót.')
    .max(200, 'A jelszó túl hosszú.'),
}).strict()

const slotSchema = z
  .string({ error: 'A hirdetési azonosító csak szöveg lehet.' })
  .trim()
  .max(40, 'A hirdetési azonosító túl hosszú.')
  .regex(/^$|^\d{5,25}$/, 'A hirdetési hely azonosítója csak számokat tartalmazhat.')

export const adminSettingsSchema = z.object({
  brandName: z
    .string({ error: 'A márkanév kötelező.' })
    .trim()
    .min(1, 'A márkanév nem lehet üres.')
    .max(80, 'A márkanév legfeljebb 80 karakter lehet.'),
  adsense: z.object({
    client: z
      .string({ error: 'Az AdSense kliensazonosító csak szöveg lehet.' })
      .trim()
      .max(60, 'Az AdSense kliensazonosító túl hosszú.')
      .regex(/^$|^ca-pub-\d{10,25}$/, 'Az AdSense kliensazonosító formátuma: ca-pub-1234567890123456.'),
    slots: z.object({
      top: slotSchema,
      sidebar: slotSchema,
      content: slotSchema,
      guide: slotSchema,
      mobile: slotSchema,
    }),
  }),
  legal: z.object({
    providerName: optionalText(160, 'A szolgáltató neve legfeljebb 160 karakter lehet.'),
    providerAddress: optionalText(240, 'A cím legfeljebb 240 karakter lehet.'),
    providerEmail: z
      .string({ error: 'A kapcsolattartó e-mail csak szöveg lehet.' })
      .trim()
      .max(190, 'Az e-mail-cím túl hosszú.')
      .refine(value => value === '' || z.email().safeParse(value).success, 'Érvényes e-mail-címet adj meg.')
      .optional()
      .default(''),
    providerPhone: optionalText(60, 'A telefonszám legfeljebb 60 karakter lehet.'),
    taxNumber: optionalText(40, 'Az adószám legfeljebb 40 karakter lehet.'),
    registryNumber: optionalText(40, 'A cégjegyzékszám legfeljebb 40 karakter lehet.'),
    hostingProvider: optionalText(160, 'A tárhelyszolgáltató neve legfeljebb 160 karakter lehet.'),
    hostingAddress: optionalText(240, 'A tárhelyszolgáltató címe legfeljebb 240 karakter lehet.'),
  }),
}).strict()

export const seoOverrideSchema = z.object({
  path: z
    .string({ error: 'Az oldal útvonala kötelező.' })
    .trim()
    .max(120, 'Az útvonal túl hosszú.')
    .regex(/^\/[a-z0-9\-/]*$/, 'Érvénytelen útvonal.'),
  title: z
    .string({ error: 'A cím csak szöveg lehet.' })
    .trim()
    .max(70, 'A SEO cím legfeljebb 70 karakter lehet.')
    .optional()
    .default(''),
  description: z
    .string({ error: 'A leírás csak szöveg lehet.' })
    .trim()
    .max(180, 'A meta leírás legfeljebb 180 karakter lehet.')
    .optional()
    .default(''),
  noindex: z.boolean({ error: 'A noindex csak igaz/hamis lehet.' }).optional().default(false),
}).strict()

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(120).optional().default(''),
  status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
})

export type DynamicQrCreateInput = z.infer<typeof dynamicQrCreateSchema>
export type DynamicQrUpdateInput = z.infer<typeof dynamicQrUpdateSchema>
export type AdminLoginInput = z.infer<typeof adminLoginSchema>
export type AdminSettingsInput = z.infer<typeof adminSettingsSchema>
export type SeoOverrideInput = z.infer<typeof seoOverrideSchema>
export type ListQueryInput = z.infer<typeof listQuerySchema>

function issuesToDetails(error: z.ZodError): Record<string, string> {
  const details: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.map(String).join('.') : '_form'
    if (!details[key]) details[key] = issue.message
  }
  return details
}

export async function readJsonBody<T>(event: H3Event, schema: z.ZodType<T>): Promise<T> {
  const contentType = getHeader(event, 'content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new ApiProblem(415, 'unsupported_media_type', 'A kérés tartalmának JSON formátumúnak kell lennie.')
  }
  const contentLength = Number(getHeader(event, 'content-length') || 0)
  if (contentLength > MAX_BODY_BYTES) {
    throw new ApiProblem(413, 'payload_too_large', 'A kérés tartalma túl nagy.')
  }

  let body: unknown
  try {
    body = await readBody(event)
  } catch {
    throw new ApiProblem(400, 'invalid_json', 'A kérés tartalma érvénytelen JSON.')
  }
  if (body === null || body === undefined || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiProblem(400, 'invalid_json', 'A kérés törzse JSON objektum kell legyen.')
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new ApiProblem(422, 'validation_error', 'A megadott adatok érvénytelenek.', {
      details: issuesToDetails(parsed.error),
    })
  }
  return parsed.data
}

export function parseQuery<T>(event: H3Event, schema: z.ZodType<T>): T {
  const query = getQuery(event)
  const parsed = schema.safeParse(query)
  if (!parsed.success) {
    throw new ApiProblem(422, 'validation_error', 'A lekérdezési paraméterek érvénytelenek.', {
      details: issuesToDetails(parsed.error),
    })
  }
  return parsed.data
}

/**
 * Cookie-alapú admin műveleteknél kötelező az azonos eredet ellenőrzése.
 * A GET kérések nem módosítanak állapotot, ezért azokat nem érinti.
 */
export function assertSameOrigin(event: H3Event) {
  const method = event.method.toUpperCase()
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return

  const origin = getHeader(event, 'origin')
  const referer = getHeader(event, 'referer')
  let sourceOrigin = origin || ''
  if (!sourceOrigin && referer) {
    try {
      sourceOrigin = new URL(referer).origin
    } catch {
      sourceOrigin = ''
    }
  }
  if (!sourceOrigin) {
    throw new ApiProblem(403, 'invalid_origin', 'Hiányzó Origin fejléc – a művelet biztonsági okból nem engedélyezett.')
  }
  const allowed = new Set<string>([getRequestURL(event).origin, getPublicSiteUrl(event)])
  // Fejlesztésben a Nuxt proxy mögül localhost origin érkezik, miközben a
  // beállított nyilvános cím az éles domain. Élesben ez az engedmény nem él.
  const devLoopback = process.env.NODE_ENV !== 'production'
    && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(sourceOrigin)
  if (!allowed.has(sourceOrigin) && !devLoopback) {
    throw new ApiProblem(403, 'invalid_origin', 'A kérés idegen eredetről érkezett.')
  }
}
