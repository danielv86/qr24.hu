import { defineApiHandler, apiSuccess } from '../utils/api'
import { pingDb, isDbConfigured } from '../utils/db'

export default defineApiHandler(async (event) => {
  const configured = isDbConfigured()
  const reachable = configured ? await pingDb() : false
  return apiSuccess(event, {
    status: configured && !reachable ? 'degraded' : 'ok',
    database: configured ? (reachable ? 'ok' : 'unavailable') : 'not_configured',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
})
