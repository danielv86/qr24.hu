import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler } from '../../../utils/api'
import { requireAdmin } from '../../../utils/auth'
import { listAdminPosts } from '../../../utils/blog'
import { blogAdminListQuerySchema, parseQuery } from '../../../utils/validation'

export default defineApiHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  await requireAdmin(event)
  const query = parseQuery(event, blogAdminListQuerySchema)
  return apiSuccess(event, await listAdminPosts(query))
})
