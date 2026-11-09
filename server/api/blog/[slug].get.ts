import { getRouterParam, setResponseHeader } from 'h3'
import { ApiProblem, apiSuccess, defineApiHandler } from '../../utils/api'
import { getPublicPost } from '../../utils/blog'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export default defineApiHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') || '').trim()
  if (!slug || slug.length > 160 || !SLUG_PATTERN.test(slug)) {
    throw new ApiProblem(404, 'post_not_found', 'A bejegyzés nem található.')
  }
  const post = await getPublicPost(slug)
  if (!post) {
    throw new ApiProblem(404, 'post_not_found', 'A bejegyzés nem található.')
  }
  setResponseHeader(event, 'Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
  return apiSuccess(event, post)
})
