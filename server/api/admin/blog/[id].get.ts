import { setResponseHeader } from 'h3'
import { ApiProblem, apiSuccess, defineApiHandler } from '../../../utils/api'
import { requireAdmin } from '../../../utils/auth'
import { getAdminPost, parsePostId } from '../../../utils/blog'

export default defineApiHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  await requireAdmin(event)
  const post = await getAdminPost(parsePostId(event))
  if (!post) {
    throw new ApiProblem(404, 'post_not_found', 'A bejegyzés nem található.')
  }
  return apiSuccess(event, post)
})
