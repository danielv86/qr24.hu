type LogLevel = 'info' | 'warn' | 'error'

const SENSITIVE_KEY = /(password|passwd|token|secret|authorization|cookie|session|hash)/i

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[max-depth]'
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return value.length > 500 ? `${value.slice(0, 500)}…` : value
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (value instanceof Error) {
    return { name: value.name, message: value.message }
  }
  if (Array.isArray(value)) return value.slice(0, 20).map(item => redact(item, depth + 1))
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : redact(item, depth + 1)
    }
    return result
  }
  return '[unknown]'
}

function write(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const payload = {
    level,
    time: new Date().toISOString(),
    message,
    ...(context ? { context: redact(context) } : {}),
  }
  const line = JSON.stringify(payload)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => write('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => write('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => write('error', message, context),
}
