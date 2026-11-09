import { getRouterParam, type H3Event } from 'h3'
import sanitizeHtml from 'sanitize-html'
import type {
  BlogCategoryCount,
  BlogPostAdminList,
  BlogPostDetail,
  BlogPostListItem,
  BlogPostPublicList,
  BlogPostStatus,
} from '#shared/types/blog'
import { ApiProblem } from './api'
import { getPrisma, withDb } from './db'

/** A szerkesztőben használt formázások engedélyezett készlete. */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'del',
    'code',
    'pre',
    'blockquote',
    'h2',
    'h3',
    'h4',
    'ul',
    'ol',
    'li',
    'a',
    'img',
    'figure',
    'figcaption',
    'hr',
    'mark',
    'sub',
    'sup',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'span',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    span: ['style'],
    p: ['style'],
    h2: ['style'],
    h3: ['style'],
    h4: ['style'],
    th: ['colspan', 'rowspan', 'style'],
    td: ['colspan', 'rowspan', 'style'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowProtocolRelative: false,
  allowedStyles: {
    '*': {
      'text-align': [/^(left|right|center|justify)$/],
      color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\(\s*[\d.\s,%]+\)$/],
      'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgba?\(\s*[\d.\s,%]+\)$/],
    },
  },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
}

export function parsePostId(event: H3Event): number {
  const id = Number(String(getRouterParam(event, 'id') || ''))
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiProblem(404, 'post_not_found', 'A bejegyzés nem található.')
  }
  return id
}

interface BlogRow {
  id: number
  slug: string
  title: string
  excerpt: string
  content: string
  coverImage: string | null
  category: string
  tags: string
  status: string
  publishedAt: Date | null
  readingMinutes: number
  views: number
  createdAt: Date
  updatedAt: Date
}

export interface BlogPostPayload {
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string
  category: string
  tags: string[]
  status: BlogPostStatus
  publishedAt: string
}

/** Magyar ékezeteket is kezelő slug: „Így készül a QR-kód” → „igy-keszul-a-qr-kod”. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/** A szöveg tisztítása mentés előtt: a nyilvános oldal ezt a HTML-t kapja. */
export function sanitizePostHtml(content: string): string {
  return sanitizeHtml(content, SANITIZE_OPTIONS).trim()
}

export function estimateReadingMinutes(content: string): number {
  const words = stripHtml(content).split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

export function estimateExcerpt(content: string, max = 300): string {
  const text = stripHtml(content)
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim()}…`
}

function parseTags(value: string): string[] {
  return value
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)
}

function toListItem(row: BlogRow): BlogPostListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverImage: row.coverImage || null,
    category: row.category,
    tags: parseTags(row.tags),
    status: row.status === 'published' ? 'published' : 'draft',
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    readingMinutes: row.readingMinutes,
    views: row.views,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

async function ensureUniqueSlug(slug: string, ignoreId?: number): Promise<string> {
  const prisma = getPrisma()
  const base = slug || `bejegyzes-${Date.now().toString(36)}`
  let candidate = base
  for (let index = 2; index < 200; index += 1) {
    const existing = await withDb(() =>
      prisma.blogPost.findFirst({ where: { slug: candidate }, select: { id: true } }),
    )
    if (!existing || existing.id === ignoreId) return candidate
    candidate = `${base}-${index}`.slice(0, 160)
  }
  return `${base}-${Date.now().toString(36)}`.slice(0, 160)
}

function publishedDate(input: BlogPostPayload): Date | null {
  if (input.status !== 'published') return null
  if (input.publishedAt) {
    const parsed = new Date(input.publishedAt)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

export async function listPublicPosts(options: {
  page: number
  perPage: number
  category?: string
  q?: string
}): Promise<BlogPostPublicList> {
  const prisma = getPrisma()
  const where = {
    status: 'published',
    publishedAt: { lte: new Date() },
    ...(options.category ? { category: options.category } : {}),
    ...(options.q
      ? { OR: [{ title: { contains: options.q } }, { excerpt: { contains: options.q } }] }
      : {}),
  }
  const [rows, total, grouped] = await withDb(() =>
    prisma.$transaction([
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (options.page - 1) * options.perPage,
        take: options.perPage,
      }),
      prisma.blogPost.count({ where }),
      prisma.blogPost.groupBy({
        by: ['category'],
        where: { status: 'published', publishedAt: { lte: new Date() } },
        _count: { _all: true },
      }),
    ]),
  )

  const categories: BlogCategoryCount[] = grouped
    .filter(group => group.category)
    .map(group => ({ name: group.category, count: group._count._all }))
    .sort((a, b) => b.count - a.count)

  return {
    items: (rows as BlogRow[]).map(toListItem),
    total,
    page: options.page,
    perPage: options.perPage,
    categories,
  }
}

export async function getPublicPost(slug: string): Promise<BlogPostDetail | null> {
  const prisma = getPrisma()
  const row = (await withDb(() =>
    prisma.blogPost.findFirst({
      where: { slug, status: 'published', publishedAt: { lte: new Date() } },
    }),
  )) as BlogRow | null
  if (!row) return null
  return { ...toListItem(row), content: row.content }
}

export async function listAdminPosts(options: {
  page: number
  perPage: number
  status: 'all' | BlogPostStatus
  q?: string
}): Promise<BlogPostAdminList> {
  const prisma = getPrisma()
  const where = {
    ...(options.status !== 'all' ? { status: options.status } : {}),
    ...(options.q
      ? { OR: [{ title: { contains: options.q } }, { slug: { contains: options.q } }] }
      : {}),
  }
  const [rows, total, all, published, draft] = await withDb(() =>
    prisma.$transaction([
      prisma.blogPost.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (options.page - 1) * options.perPage,
        take: options.perPage,
      }),
      prisma.blogPost.count({ where }),
      prisma.blogPost.count(),
      prisma.blogPost.count({ where: { status: 'published' } }),
      prisma.blogPost.count({ where: { status: 'draft' } }),
    ]),
  )
  return {
    items: (rows as BlogRow[]).map(toListItem),
    total,
    page: options.page,
    perPage: options.perPage,
    counts: { all, published, draft },
  }
}

export async function getAdminPost(id: number): Promise<BlogPostDetail | null> {
  const prisma = getPrisma()
  const row = (await withDb(() => prisma.blogPost.findUnique({ where: { id } }))) as BlogRow | null
  if (!row) return null
  return { ...toListItem(row), content: row.content }
}

export async function createBlogPost(input: BlogPostPayload): Promise<BlogPostDetail> {
  const prisma = getPrisma()
  const slug = await ensureUniqueSlug(input.slug || slugify(input.title))
  const content = sanitizePostHtml(input.content)
  const excerpt = input.excerpt.trim() || estimateExcerpt(content)
  const row = (await withDb(() =>
    prisma.blogPost.create({
      data: {
        slug,
        title: input.title,
        excerpt,
        content,
        coverImage: input.coverImage.trim() || null,
        category: input.category.trim(),
        tags: input.tags.join(','),
        status: input.status,
        publishedAt: publishedDate(input),
        readingMinutes: estimateReadingMinutes(content),
      },
    }),
  )) as BlogRow
  return { ...toListItem(row), content: row.content }
}

export async function updateBlogPost(id: number, input: BlogPostPayload): Promise<BlogPostDetail> {
  const prisma = getPrisma()
  const existing = (await withDb(() => prisma.blogPost.findUnique({ where: { id } }))) as BlogRow | null
  if (!existing) {
    throw new ApiProblem(404, 'post_not_found', 'A bejegyzés nem található.')
  }
  const slug = await ensureUniqueSlug(input.slug || slugify(input.title) || existing.slug, id)
  const content = sanitizePostHtml(input.content)
  const excerpt = input.excerpt.trim() || estimateExcerpt(content)
  const row = (await withDb(() =>
    prisma.blogPost.update({
      where: { id },
      data: {
        slug,
        title: input.title,
        excerpt,
        content,
        coverImage: input.coverImage.trim() || null,
        category: input.category.trim(),
        tags: input.tags.join(','),
        status: input.status,
        publishedAt: publishedDate(input),
        readingMinutes: estimateReadingMinutes(content),
      },
    }),
  )) as BlogRow
  return { ...toListItem(row), content: row.content }
}

export async function deleteBlogPost(id: number): Promise<void> {
  const prisma = getPrisma()
  const existing = await withDb(() => prisma.blogPost.findUnique({ where: { id }, select: { id: true } }))
  if (!existing) {
    throw new ApiProblem(404, 'post_not_found', 'A bejegyzés nem található.')
  }
  await withDb(() => prisma.blogPost.delete({ where: { id } }))
}

/** Az összes publikált bejegyzés a sitemaphoz. */
export async function listPublishedForSitemap(): Promise<{ slug: string; updatedAt: Date }[]> {
  const prisma = getPrisma()
  const rows = await withDb(() =>
    prisma.blogPost.findMany({
      where: { status: 'published', publishedAt: { lte: new Date() } },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
      take: 5000,
    }),
  )
  return rows
}

export async function getBlogMedia(id: string) {
  const prisma = getPrisma()
  return await withDb(() => prisma.blogMedia.findUnique({ where: { id } }))
}
