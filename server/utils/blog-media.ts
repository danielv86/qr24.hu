import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

/**
 * A blogképek a lemezen, a projekt gyökeréhez tartozó storage/blog-media
 * mappában tárolódnak – az adatbázisban csak a metaadat van. A mappa
 * felülírható a BLOG_MEDIA_DIR környezeti változóval (pl. éles telepítésnél,
 * ha a könyvtár a kiadási mappán kívül esik).
 */
const STORAGE_NAME_PATTERN = /^[a-zA-Z0-9-]{8,40}\.(png|jpg|jpeg|webp|gif)$/

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export const MEDIA_URL_PREFIX = '/api/blog/media/'

export function mediaDirectory(): string {
  const configured = process.env.BLOG_MEDIA_DIR?.trim()
  return configured ? resolve(configured) : resolve(process.cwd(), 'storage', 'blog-media')
}

export function isSafeStorageName(value: string): boolean {
  return STORAGE_NAME_PATTERN.test(value)
}

/** A lemezen használt fájlnév: az URL-hez tartozó azonosító + a MIME-ből képzett kiterjesztés. */
export function storageNameFor(id: string, mimeType: string): string {
  const extension = EXTENSION_BY_MIME[mimeType.toLowerCase()]
  if (!extension) {
    throw new Error(`Nem támogatott képtípus: ${mimeType}`)
  }
  return `${id}.${extension}`
}

export async function saveMediaFile(storageName: string, data: Uint8Array): Promise<void> {
  if (!isSafeStorageName(storageName)) {
    throw new Error(`Érvénytelen fájlnév: ${storageName}`)
  }
  const directory = mediaDirectory()
  await mkdir(directory, { recursive: true })
  await writeFile(resolve(directory, storageName), data)
}

export async function readMediaFile(storageName: string): Promise<Uint8Array | null> {
  if (!isSafeStorageName(storageName)) return null
  try {
    return await readFile(resolve(mediaDirectory(), storageName))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

export async function deleteMediaFile(storageName: string): Promise<void> {
  if (!isSafeStorageName(storageName)) return
  try {
    await unlink(resolve(mediaDirectory(), storageName))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}
