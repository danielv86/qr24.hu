import { setResponseHeader } from 'h3'
import { LIBRARY_SHAPE_MAX_COUNT, LIBRARY_SHAPE_ID_MAX, normalizeLibraryShapePoints } from '#shared/qr/library-shape'
import { ApiProblem, apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { writeAudit } from '../../utils/audit'
import { requireAdmin } from '../../utils/auth'
import { enforceRateLimit } from '../../utils/rate-limit'
import { loadPublicSettings, loadSilhouetteShapes, saveSilhouetteShapes } from '../../utils/settings'
import { assertSameOrigin, libraryShapeCreateSchema, readJsonBody } from '../../utils/validation'

/**
 * Új alakzat a generátor alakzat-választójához. A körvonal a beépített formákkal
 * azonos 0..1-es térben, legfeljebb 24 csomóponttal kerül a settings táblába,
 * ezért build és újraindítás nélkül megjelenik minden látogatónál.
 */
export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  await enforceRateLimit(event, {
    bucket: 'admin-write',
    key: getClientIp(event),
    limit: 30,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')
  await requireAdmin(event)

  const input = await readJsonBody(event, libraryShapeCreateSchema)
  const points = normalizeLibraryShapePoints(input.points)
  if (points.length < 3) {
    throw new ApiProblem(422, 'validation_error', 'Az alakzat körvonala nem olvasható.')
  }

  const shapes = await loadSilhouetteShapes()
  if (shapes.length >= LIBRARY_SHAPE_MAX_COUNT) {
    throw new ApiProblem(422, 'shape_limit', `Legfeljebb ${LIBRARY_SHAPE_MAX_COUNT} alakzat tölthető fel.`)
  }

  const id = `shape-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.slice(0, LIBRARY_SHAPE_ID_MAX)
  const shape = {
    id,
    label: input.label,
    points,
    createdAt: new Date().toISOString(),
  }

  await saveSilhouetteShapes([...shapes, shape])
  await writeAudit({ action: 'shape.created', details: { id, label: shape.label, points: points.length } })
  return apiSuccess(event, await loadPublicSettings({ force: true }))
})
