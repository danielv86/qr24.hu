import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler, getClientIp } from '../../../utils/api'
import { writeAudit } from '../../../utils/audit'
import { requireAdmin } from '../../../utils/auth'
import { createBlogPost } from '../../../utils/blog'
import { enforceRateLimit } from '../../../utils/rate-limit'
import { assertSameOrigin, blogPostSchema, readJsonBody } from '../../../utils/validation'

const MAX_POST_BYTES = 512 * 1024

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

  const input = await readJsonBody(event, blogPostSchema, { maxBytes: MAX_POST_BYTES })
  const post = await createBlogPost(input)
  await writeAudit({ action: 'blog.created', details: { id: post.id, slug: post.slug, status: post.status } })
  return apiSuccess(event, post, 201)
})
