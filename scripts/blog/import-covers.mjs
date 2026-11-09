import { randomBytes } from 'node:crypto'
import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import mariadb from 'mariadb'

/**
 * A blog-boritok mappába másolt képeket teszi be a bloghoz: a fájl a
 * storage/blog-media mappába kerül, az adatbázisba csak a metaadat
 * (id, fájlnév, MIME, méret, lemezes fájlnév). A cikk cover_image mezője
 * a /api/blog/media/<id> címre állítódik.
 */
const COVER_DIR = fileURLToPath(new URL('../../blog-boritok', import.meta.url))
const MEDIA_DIR = process.env.BLOG_MEDIA_DIR
  ? resolve(process.env.BLOG_MEDIA_DIR)
  : fileURLToPath(new URL('../../storage/blog-media', import.meta.url))
const MAX_BYTES = 4 * 1024 * 1024
const EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])

function sniffMime(buffer) {
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
    return 'image/png'
  }
  if (buffer.length > 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg'
  }
  if (buffer.length > 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp'
  }
  if (buffer.length > 6 && buffer.subarray(0, 4).toString('ascii') === 'GIF8') {
    return 'image/gif'
  }
  return null
}

const EXTENSION_BY_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

let entries = []
try {
  entries = await readdir(COVER_DIR, { withFileTypes: true })
} catch {
  console.error(`A mappa nem található: ${COVER_DIR}`)
  process.exit(1)
}

const files = entries
  .filter(entry => entry.isFile())
  .map(entry => entry.name)
  .filter(name => EXTENSIONS.has(name.slice(name.lastIndexOf('.')).toLowerCase()))

if (!files.length) {
  console.log(`Nincs kép a mappában: ${COVER_DIR}`)
  console.log('Másold ide a borítóképeket <slug>.png / .jpg / .webp néven (lásd blog-boritok/README.md).')
  process.exit(0)
}

await mkdir(MEDIA_DIR, { recursive: true })
console.log(`Képek helye: ${MEDIA_DIR}`)

const connection = await mariadb.createConnection({
  host: process.env.NUXT_DB_HOST || '127.0.0.1',
  port: Number(process.env.NUXT_DB_PORT || 3306),
  database: process.env.NUXT_DB_NAME || 'qr24',
  user: process.env.NUXT_DB_USER || '',
  password: process.env.NUXT_DB_PASSWORD || '',
  bigIntAsNumber: true,
})

try {
  const posts = await connection.query('SELECT id, slug, cover_image FROM blog_posts')
  const bySlug = new Map(posts.map(post => [post.slug, post]))
  const byNormalized = new Map(posts.map(post => [slugify(post.slug), post]))

  let imported = 0
  const unknown = []
  const skipped = []

  for (const file of files) {
    const extension = file.slice(file.lastIndexOf('.')).toLowerCase()
    const base = file.slice(0, file.lastIndexOf('.'))
    const post = bySlug.get(base) ?? byNormalized.get(slugify(base))

    if (!post) {
      unknown.push(file)
      continue
    }

    const path = `${COVER_DIR}/${file}`
    const info = await stat(path)
    if (info.size > MAX_BYTES) {
      skipped.push(`${file} (${(info.size / 1024 / 1024).toFixed(1)} MB – a limit 4 MB)`)
      continue
    }

    const buffer = await readFile(path)
    const mimeType = sniffMime(buffer)
    if (!mimeType) {
      skipped.push(`${file} (a tartalom nem PNG/JPEG/WebP/GIF)`)
      continue
    }

    const id = randomBytes(12).toString('hex')
    const storageName = `${id}.${EXTENSION_BY_MIME[mimeType]}`
    await writeFile(resolve(MEDIA_DIR, storageName), buffer)

    await connection.query(
      'INSERT INTO blog_media (id, file_name, mime_type, size, storage_name, created_at) VALUES (?, ?, ?, ?, ?, NOW(3))',
      [id, `${post.slug}${extension}`, mimeType, buffer.length, storageName],
    )
    await connection.query('UPDATE blog_posts SET cover_image = ?, updated_at = NOW(3) WHERE id = ?', [
      `/api/blog/media/${id}`,
      post.id,
    ])

    const oldCover = post.cover_image || ''
    const oldId = oldCover.startsWith('/api/blog/media/') ? oldCover.slice('/api/blog/media/'.length) : ''
    if (oldId && oldId !== id) {
      const oldRows = await connection.query('SELECT storage_name FROM blog_media WHERE id = ?', [oldId])
      await connection.query('DELETE FROM blog_media WHERE id = ?', [oldId])
      const oldStorageName = oldRows[0]?.storage_name
      if (oldStorageName) {
        await unlink(resolve(MEDIA_DIR, oldStorageName)).catch(() => {})
      }
    }

    post.cover_image = `/api/blog/media/${id}`
    imported += 1
    console.log(`  ✓ ${post.slug} ← ${file} (${mimeType}, ${Math.round(buffer.length / 1024)} kB)`)
  }

  const missing = posts.filter(post => !post.cover_image).map(post => post.slug)

  console.log(`\nBetöltve: ${imported} kép.`)
  if (skipped.length) console.log(`Kihagyva:\n - ${skipped.join('\n - ')}`)
  if (unknown.length) console.log(`Ismeretlen fájlnév (nincs ilyen cikk):\n - ${unknown.join('\n - ')}`)
  if (missing.length) console.log(`Borító nélküli cikkek (${missing.length}):\n - ${missing.join('\n - ')}`)

  if (unknown.length) process.exitCode = 1
} finally {
  await connection.end()
}
