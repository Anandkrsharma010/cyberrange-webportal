// Centralized logger wrapper
// - In development: logs all levels to console
// - In production: logs warn/log only when explicitly enabled; errors always printed and optionally reported remotely
const isDev = process.env.NODE_ENV === 'development'
const LOG_ENDPOINT = process.env.NEXT_PUBLIC_LOGGING_ENDPOINT || ''

function sanitizeArg(arg: any) {
  try {
    // Handle Error objects (they stringify to {} by default)
    if (arg instanceof Error) {
      return {
        name: arg.name,
        message: arg.message,
        stack: arg.stack
      }
    }
    if (typeof arg === 'string') {
      // redact tokens and simple secrets
      return arg.replace(/(token\s*[:=]\s*)([\w-\._-]+)/gi, '$1[REDACTED]')
                .replace(/(password\s*[:=]\s*)([^\s]+)/gi, '$1[REDACTED]')
    }
    // shallow clone for objects to avoid mutating original
    if (typeof arg === 'object' && arg !== null) {
      try {
        const clone = JSON.parse(JSON.stringify(arg))
        // redact common keys
        if (clone && typeof clone === 'object') {
          if (clone.token) clone.token = '[REDACTED]'
          if (clone.password) clone.password = '[REDACTED]'
        }
        return clone
      } catch {
        return arg
      }
    }
    return arg
  } catch {
    return arg
  }
}

async function reportToServer(level: string, message: string, payload?: any) {
  try {
    if (!LOG_ENDPOINT) return
    const body = JSON.stringify({ level, message, payload, ts: new Date().toISOString() })
    // Use navigator.sendBeacon when available for reliability on unload
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon(LOG_ENDPOINT, blob)
    } else {
      await fetch(LOG_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    }
  } catch {
    // Swallow errors from reporting to avoid breaking the app
  }
}

function formatArgs(args: any[]) {
  return args.map(sanitizeArg)
}

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log('[log]', ...formatArgs(args))
  },
  info: (...args: any[]) => {
    if (isDev) console.info('[info]', ...formatArgs(args))
  },
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn('[warn]', ...formatArgs(args))
    } else {
      // In production, only report warnings optionally
      console.warn('[warn]', ...formatArgs(args))
      reportToServer('warn', String(args[0] || ''), args.slice(1))
    }
  },
  error: (...args: any[]) => {
    // Always log errors locally (sanitized) and report remotely when configured
    try {
      console.error('[error]', ...formatArgs(args))
    } catch {
      // ignore
    }
    try {
      reportToServer('error', String(args[0] || 'Error'), args.slice(1))
    } catch {
      // ignore
    }
  },
  captureException: (err: any, context?: any) => {
    try {
      const message = err?.message || String(err)
      console.error('[exception]', message, sanitizeArg(context || {}))
    } catch {
      // ignore
    }
    try {
      reportToServer('exception', err?.message || String(err), { error: String(err), context })
    } catch {
      // ignore
    }
  }
}

export default logger
