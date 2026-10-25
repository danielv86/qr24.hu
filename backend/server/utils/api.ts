import {
  defineEventHandler,
  getHeader,
  setResponseHeader,
  setResponseStatus,
  type H3Event,
} from 'h3'
import type { ApiErrorBody, ApiSuccess } from '../types/api'
import { logger } from './logger'

export class ApiProblem extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: Record<string, string>
  readonly retryAfter?: number

  constructor(
    statusCode: number,
    code: string,
    message: string,
    options?: { details?: Record<string, string>; retryAfter?: number },
  ) {
    super(message)
    this.name = 'ApiProblem'
    this.statusCode = statusCode
    this.code = code
    this.details = options?.details
    this.retryAfter = options?.retryAfter
  }
}

export function apiSuccess<T>(event: H3Event, data: T, statusCode = 200): ApiSuccess<T> {
  setResponseStatus(event, statusCode)
  if (statusCode === 204) {
    setResponseHeader(event, 'Content-Type', 'application/json; charset=utf-8')
  }
  return { success: true, data }
}

export function apiErrorResponse(
  event: H3Event,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, string>,
  retryAfter?: number,
): ApiErrorBody {
  setResponseStatus(event, statusCode)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  if (retryAfter) setResponseHeader(event, 'Retry-After', retryAfter)
  return {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  }
}

export function defineApiHandler<T>(handler: (event: H3Event) => Promise<T> | T) {
  return defineEventHandler(async (event) => {
    try {
      return await handler(event)
    } catch (error) {
      if (error instanceof ApiProblem) {
        if (error.retryAfter) {
          setResponseHeader(event, 'Retry-After', error.retryAfter)
        }
        return apiErrorResponse(event, error.statusCode, error.code, error.message, error.details, error.retryAfter)
      }
      logger.error('Unhandled API error', {
        path: event.path,
        method: event.method,
        error: error instanceof Error ? { name: error.name, message: error.message } : error,
      })
      return apiErrorResponse(
        event,
        500,
        'internal_error',
        'Váratlan szerverhiba történt. Kérjük, próbáld újra később.',
      )
    }
  })
}

export function getClientIp(event: H3Event): string {
  const config = useRuntimeConfig(event)
  if (config.trustProxy) {
    const forwarded = getHeader(event, 'x-forwarded-for')
    if (forwarded) {
      const first = forwarded.split(',')[0]?.trim()
      if (first && first.length <= 64) return first
    }
  }
  return event.node.req.socket?.remoteAddress || 'unknown'
}
