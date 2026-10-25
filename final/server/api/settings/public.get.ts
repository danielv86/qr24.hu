import { apiSuccess, defineApiHandler } from '../../utils/api'
import { loadPlans } from '../../utils/plans'
import { loadPublicSettings } from '../../utils/settings'
import { setResponseHeader } from 'h3'

export default defineApiHandler(async (event) => {
  const [settings, plans] = await Promise.all([loadPublicSettings(), loadPlans()])
  setResponseHeader(event, 'Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
  return apiSuccess(event, { ...settings, plans })
})
