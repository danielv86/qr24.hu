import { setResponseHeader } from 'h3'
import { ApiProblem, apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { writeAudit } from '../../utils/audit'
import { requireAdmin } from '../../utils/auth'
import { enforceRateLimit } from '../../utils/rate-limit'
import { loadPublicSettings, loadSilhouetteShapes, saveSilhouetteShapes } from '../../utils/settings'
import { assertSameOrigin, libraryShapeDeleteSchema, readJsonBody } from '../../utils/validation'

/** Feltöltött alakzat törlése. A már kiválasztott alakzat a felületen marad, de nem lesz újra kiválasztható. */
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

  const { id } = await readJsonBody(event, libraryShapeDeleteSchema)
  const shapes = await loadSilhouetteShapes()
  const target = shapes.find(shape => shape.id === id)
  if (!target) {
    throw new ApiProblem(404, 'shape_not_found', 'Az alakzat nem található.')
  }

  await saveSilhouetteShapes(shapes.filter(shape => shape.id !== id))
  await writeAudit({ action: 'shape.deleted', details: { id, label: target.label } })
  return apiSuccess(event, await loadPublicSettings({ force: true }))
})
