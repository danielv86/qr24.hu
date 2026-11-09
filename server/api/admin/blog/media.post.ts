import { randomUUID } from 'node:crypto'
import { getHeader, readMultipartFormData, setResponseHeader } from 'h3'
import { ApiProblem, apiSuccess, defineApiHandler, getClientIp } from '../../../utils/api'
import { requireAdmin } from '../../../utils/auth'
import { deleteMediaFile, saveMediaFile, storageNameFor } from '../../../utils/blog-media'
import { getPrisma, withDb } from '../../../utils/db'
import { enforceRateLimit } from '../../../utils/rate-limit'
import { assertSameOrigin } from '../../../utils/validation'

const MAX_BYTES = 4 * 1024 * 1024
const MAX_REQUEST_BYTES = MAX_BYTES + 1024 * 1024
// Az SVG szándékosan nem engedélyezett: a saját domainről kiszolgálva
// parancsfájlt futtathatna a látogató böngészőjében.
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  await enforceRateLimit(event, {
    bucket: 'admin-upload',
    key: getClientIp(event),
    limit: 30,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')
  await requireAdmin(event)

  const contentLength = Number(getHeader(event, 'content-length') || 0)
  if (contentLength > MAX_REQUEST_BYTES) {
    throw new ApiProblem(413, 'payload_too_large', 'A kép legfeljebb 4 MB lehet.')
  }

  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file' && part.filename && part.data?.length)
  if (!file) {
    throw new ApiProblem(422, 'no_file', 'Válassz ki egy képfájlt.')
  }

  const mimeType = String(file.type || '').toLowerCase()
  if (!ALLOWED_TYPES.has(mimeType)) {
    throw new ApiProblem(415, 'unsupported_media_type', 'Csak PNG, JPG, WebP vagy GIF kép tölthető fel.')
  }
  if (file.data.length > MAX_BYTES) {
    throw new ApiProblem(413, 'payload_too_large', 'A kép legfeljebb 4 MB lehet.')
  }

  const id = randomUUID()
  const fileName = String(file.filename || 'kep').slice(0, 160)
  // A kép a lemezre kerül (storage/blog-media), az adatbázisba csak a metaadat.
  const storageName = storageNameFor(id, mimeType)
  await saveMediaFile(storageName, file.data)
  try {
    await withDb(() =>
      getPrisma().blogMedia.create({
        data: {
          id,
          fileName,
          mimeType,
          size: file.data.length,
          storageName,
        },
      }),
    )
  } catch (error) {
    // Ha a metaadat mentése nem sikerül, ne maradjon árva fájl a lemezen.
    await deleteMediaFile(storageName)
    throw error
  }

  return apiSuccess(
    event,
    { id, url: `/api/blog/media/${id}`, name: fileName, mimeType, size: file.data.length },
    201,
  )
})
