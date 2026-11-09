import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../../utils/api'
import { writeAudit } from '../../../utils/audit'
import { requireAdmin } from '../../../utils/auth'
import { deleteBlogPost, parsePostId } from '../../../utils/blog'
import { enforceRateLimit } from '../../../utils/rate-limit'
import { assertSameOrigin } from '../../../utils/validation'

export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  await enforceRateLimit(event, {
    bucket: 'admin-blog',
    key: getClientIp(event),
    limit: 60,
    windowSeconds: 60,
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')
  await requireAdmin(event)

  const id = parsePostId(event)
  await deleteBlogPost(id)
  await writeAudit({ action: 'blog.deleted', details: { id } })
  return apiSuccess(event, { id }, 200)
})
