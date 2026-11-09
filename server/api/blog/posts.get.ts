import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler } from '../../utils/api'
import { listPublicPosts } from '../../utils/blog'
import { blogListQuerySchema, parseQuery } from '../../utils/validation'

export default defineApiHandler(async (event) => {
  const query = parseQuery(event, blogListQuerySchema)
  const result = await listPublicPosts(query)
  setResponseHeader(event, 'Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  return apiSuccess(event, result)
})
