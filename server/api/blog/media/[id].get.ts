import { getRouterParam, setResponseHeader } from 'h3'
import { ApiProblem, defineApiHandler } from '../../../utils/api'
import { readMediaFile } from '../../../utils/blog-media'
import { getBlogMedia } from '../../../utils/blog'

const ID_PATTERN = /^[a-zA-Z0-9-]{8,40}$/

/**
 * A feltöltött képek nyilvános kiszolgálása a lemezről (storage/blog-media).
 * Az azonosító egyszer használatos, ezért a válasz örökre cache-elhető.
 */
export default defineApiHandler(async (event) => {
  const id = String(getRouterParam(event, 'id') || '').trim()
  if (!ID_PATTERN.test(id)) {
    throw new ApiProblem(404, 'media_not_found', 'A kép nem található.')
  }
  const media = await getBlogMedia(id)
  if (!media) {
    throw new ApiProblem(404, 'media_not_found', 'A kép nem található.')
  }
  const data = await readMediaFile(media.storageName)
  if (!data) {
    throw new ApiProblem(404, 'media_not_found', 'A kép nem található.')
  }
  setResponseHeader(event, 'Content-Type', media.mimeType)
  setResponseHeader(event, 'Content-Length', data.length)
  setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  // RFC 5987: az ékezetes fájlnevet UTF-8-ként jelezzük, ne százalék-kódolt ASCII-ként.
  const asciiName = media.fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_')
  setResponseHeader(
    event,
    'Content-Disposition',
    `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(media.fileName)}`,
  )
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  return data
})
