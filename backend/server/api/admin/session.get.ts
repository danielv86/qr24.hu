import { setResponseHeader } from 'h3'
import { apiSuccess, defineApiHandler } from '../../utils/api'
import { requireAdmin } from '../../utils/auth'

export default defineApiHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const admin = await requireAdmin(event)
  return apiSuccess(event, { email: admin.email, role: admin.role })
})
