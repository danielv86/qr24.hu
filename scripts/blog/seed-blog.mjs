import mariadb from 'mariadb'

import { posts as batch1 } from './posts-1.mjs'
import { posts as batch2 } from './posts-2.mjs'
import { posts as batch3 } from './posts-3.mjs'

const LIMITS = { title: 160, excerpt: 320, category: 60, tags: 240, slug: 160, cover: 512 }

function plainText(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function readingMinutes(html) {
  const words = plainText(html).split(' ').filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

function validate(posts) {
  const problems = []
  const slugs = new Set()
  for (const post of posts) {
    for (const [field, max] of Object.entries(LIMITS)) {
      const key = field === 'cover' ? 'coverImage' : field
      const value = post[key]
      if (typeof value === 'string' && value.length > max) {
        problems.push(`${post.slug}: a(z) ${key} mező ${value.length} karakter, a limit ${max}.`)
      }
    }
    if (slugs.has(post.slug)) problems.push(`Duplikált slug: ${post.slug}`)
    slugs.add(post.slug)
    if (!post.title || !post.content || !post.excerpt) problems.push(`${post.slug}: hiányzó kötelező mező.`)
    if (!['draft', 'published', 'archived'].includes(post.status ?? 'published')) {
      problems.push(`${post.slug}: érvénytelen státusz.`)
    }
  }
  return problems
}

const posts = [...batch1, ...batch2, ...batch3]

if (posts.length !== 30) {
  console.warn(`Figyelem: ${posts.length} bejegyzés van betöltve, a tervezett 30 helyett.`)
}

const problems = validate(posts)
if (problems.length) {
  console.error('Érvényesítési hibák:')
  for (const problem of problems) console.error(' -', problem)
  process.exitCode = 1
  if (problems.some(problem => problem.startsWith('Duplikált slug'))) process.exit(1)
}

const host = process.env.NUXT_DB_HOST || '127.0.0.1'
const port = Number(process.env.NUXT_DB_PORT || 3306)
const database = process.env.NUXT_DB_NAME || 'qr24'
const user = process.env.NUXT_DB_USER || ''
const password = process.env.NUXT_DB_PASSWORD || ''

const connection = await mariadb.createConnection({ host, port, database, user, password })

try {
  let inserted = 0
  let updated = 0

  for (const post of posts) {
    const existing = await connection.query('SELECT id FROM blog_posts WHERE slug = ? LIMIT 1', [post.slug])
    const row = {
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      cover_image: post.coverImage ?? null,
      category: post.category,
      tags: post.tags,
      status: post.status ?? 'published',
      published_at: post.publishedAt ?? null,
      reading_minutes: readingMinutes(post.content),
    }

    if (existing.length) {
      await connection.query(
        `UPDATE blog_posts
            SET title = ?, excerpt = ?, content = ?, cover_image = ?, category = ?, tags = ?,
                status = ?, published_at = ?, reading_minutes = ?, updated_at = NOW(3)
          WHERE slug = ?`,
        [
          row.title,
          row.excerpt,
          row.content,
          row.cover_image,
          row.category,
          row.tags,
          row.status,
          row.published_at ? new Date(row.published_at) : null,
          row.reading_minutes,
          row.slug,
        ],
      )
      updated += 1
    } else {
      await connection.query(
        `INSERT INTO blog_posts
            (slug, title, excerpt, content, cover_image, category, tags, status, published_at, reading_minutes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
        [
          row.slug,
          row.title,
          row.excerpt,
          row.content,
          row.cover_image,
          row.category,
          row.tags,
          row.status,
          row.published_at ? new Date(row.published_at) : null,
          row.reading_minutes,
        ],
      )
      inserted += 1
    }
  }

  // A korábbi tesztbejegyzést nem töröljük, csak elrejtjük a nyilvános listáról.
  await connection.query("UPDATE blog_posts SET status = 'draft' WHERE slug = 'teszt-bejegyzes' AND status = 'published'")

  const summary = await connection.query(
    "SELECT status, COUNT(*) AS count FROM blog_posts GROUP BY status ORDER BY status",
  )
  console.log(`Kész: ${inserted} új, ${updated} frissített bejegyzés.`)
  for (const line of summary) console.log(` - ${line.status}: ${line.count}`)
} finally {
  await connection.end()
}
