import { defineApiHandler, apiSuccess } from '../../utils/api'
import { loadPublicSettings } from '../../utils/settings'
import { setResponseHeader } from 'h3'

export default defineApiHandler(async (event) => {
  const settings = await loadPublicSettings()
  setResponseHeader(event, 'Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
  return apiSuccess(event, settings)
})
