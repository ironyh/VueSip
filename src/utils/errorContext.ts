/**
 * Error Context Utilities
 *
 * Provides standardized error logging with rich context for debugging.
 * Includes operation context, state information, timing, and structured data.
 *
 * @packageDocumentation
 */

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Sensitive keys that should be redacted in logs
 */
const SENSITIVE_KEYS = [
  'password',
  'token',
  'apiKey',
  'secret',
  'authorization',
  'auth',
  'key',
  'credentials',
] as const

/**
 * Error context structure
 */
export interface ErrorContext {
  /** Operation being performed when error occurred */
  operation: string
  /** Component or module where error occurred */
  component: string
  /** Error severity level */
  severity: ErrorSeverity
  /** Timestamp when error occurred */
  timestamp: Date
  /** Duration of operation before error (ms) */
  duration?: number
  /** Additional context data */
  context?: Record<string, unknown>
  /** Current state snapshot */
  state?: Record<string, unknown>
  /** User ID or session identifier */
  userId?: string
  /** Stack trace (if available) */
  stack?: string
}

/**
 * Formatted error log entry
 */
export interface ErrorLogEntry {
  /** Error message */
  message: string
  /** Error context */
  context: ErrorContext
  /** Original error object */
  error?: Error | unknown
}

/**
 * Create a structured error context
 *
 * @param operation - Operation being performed
 * @param component - Component or module name
 * @param severity - Error severity level
 * @param options - Additional context options
 * @returns Structured error context
 *
 * @example
 * ```typescript
 * const ctx = createErrorContext('makeCall', 'useCallSession', ErrorSeverity.HIGH, {
 *   context: { target: 'sip:user@domain.com' },
 *   state: { connectionState: 'connected', hasSession: false },
 *   duration: 1234
 * })
 * ```
 */
export function createErrorContext(
  operation: string,
  component: string,
  severity: ErrorSeverity,
  options: {
    context?: Record<string, unknown>
    state?: Record<string, unknown>
    duration?: number
    userId?: string
    includeStack?: boolean
  } = {}
): ErrorContext {
  const errorContext: ErrorContext = {
    operation,
    component,
    severity,
    timestamp: new Date(),
    context: options.context,
    state: options.state,
    duration: options.duration,
    userId: options.userId,
  }

  if (options.includeStack) {
    errorContext.stack = new Error().stack
  }

  return errorContext
}

/**
 * Format an error with context for logging
 *
 * @param message - Error message
 * @param error - Original error object
 * @param context - Error context
 * @returns Formatted error log entry
 *
 * @example
 * ```typescript
 * const ctx = createErrorContext('makeCall', 'useCallSession', ErrorSeverity.HIGH, {
 *   context: { target: 'sip:user@domain.com' },
 *   state: { isConnected: true }
 * })
 * const entry = formatError('Failed to initiate call', error, ctx)
 * log.error(entry.message, entry.context, entry.error)
 * ```
 */
export function formatError(
  message: string,
  error: Error | unknown,
  context: ErrorContext
): ErrorLogEntry {
  return {
    message,
    context,
    error,
  }
}

/**
 * Create an operation timer for tracking duration
 *
 * @returns Object with elapsed() function
 *
 * @example
 * ```typescript
 * const timer = createOperationTimer()
 * // ... perform operation ...
 * const duration = timer.elapsed()
 * // Use duration in error context
 * ```
 */
export function createOperationTimer(): { elapsed: () => number } {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now()

  return {
    elapsed: () => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
      return Math.round(now - startTime)
    },
  }
}

/**
 * Sanitize sensitive data from context
 *
 * Removes or masks sensitive fields like passwords, tokens, etc.
 * Handles circular references and nested arrays.
 *
 * @param data - Data to sanitize
 * @param seen - WeakSet to track visited objects (for circular reference detection)
 * @returns Sanitized data
 *
 * @example
 * ```typescript
 * const sanitized = sanitizeContext({
 *   username: 'alice',
 *   password: 'secret123',
 *   apiKey: 'key-12345',
 *   users: [{ name: 'bob', password: 'secret456' }]
 * })
 * // { username: 'alice', password: '[REDACTED]', apiKey: '[REDACTED]', users: [{ name: 'bob', password: '[REDACTED]' }] }
 * ```
 */
export function sanitizeContext(
  data: Record<string, unknown>,
  seen = new WeakSet<object>()
): Record<string, unknown> {
  // Check for circular reference
  if (seen.has(data)) {
    return { '[Circular]': true }
  }
  seen.add(data)

  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()

    // Check if key contains sensitive information (exact match or with common separators)
    const isSensitive = SENSITIVE_KEYS.some((sensitiveKey) => {
      return (
        lowerKey === sensitiveKey ||
        lowerKey.startsWith(sensitiveKey + '_') ||
        lowerKey.endsWith('_' + sensitiveKey) ||
        lowerKey.includes('_' + sensitiveKey + '_')
      )
    })

    if (isSensitive) {
      sanitized[key] = '[REDACTED]'
    } else if (Array.isArray(value)) {
      // Sanitize arrays
      sanitized[key] = value.map((item) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          return sanitizeContext(item as Record<string, unknown>, seen)
        }
        return item
      })
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeContext(value as Record<string, unknown>, seen)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Extract relevant error information from various error types
 *
 * @param error - Error object (can be Error, DOMException, or unknown)
 * @returns Extracted error information
 *
 * @example
 * ```typescript
 * const info = extractErrorInfo(error)
 * // { name: 'TypeError', message: 'Cannot read...', code: undefined, stack: '...' }
 * ```
 */
export function extractErrorInfo(error: unknown): {
  name: string
  message: string
  code?: string | number
  stack?: string
} {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  if (error instanceof DOMException) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      // DOMException may have stack in some environments
      stack: (error as any).stack,
    }
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>
    return {
      name: String(err.name || 'UnknownError'),
      message: String(err.message || 'Unknown error'),
      code: err.code as string | number | undefined,
      stack: typeof err.stack === 'string' ? err.stack : undefined,
    }
  }

  return {
    name: 'UnknownError',
    message: String(error),
  }
}

/**
 * Log an error with full context
 *
 * Convenience function that creates context, formats error, and returns
 * a structured log entry ready for logging.
 *
 * @param logger - Logger instance (must have error method)
 * @param message - Error message
 * @param error - Original error
 * @param operation - Operation being performed
 * @param component - Component name
 * @param severity - Error severity
 * @param options - Additional context options
 *
 * @example
 * ```typescript
 * logErrorWithContext(
 *   log,
 *   'Failed to make call',
 *   error,
 *   'makeCall',
 *   'useCallSession',
 *   ErrorSeverity.HIGH,
 *   {
 *     context: { target: 'sip:user@domain.com' },
 *     state: { isConnected: true },
 *     duration: 1234
 *   }
 * )
 * ```
 */
export function logErrorWithContext(
  logger: { error: (message: string, ...args: unknown[]) => void },
  message: string,
  error: unknown,
  operation: string,
  component: string,
  severity: ErrorSeverity,
  options: {
    context?: Record<string, unknown>
    state?: Record<string, unknown>
    duration?: number
    userId?: string
    includeStack?: boolean
  } = {}
): void {
  const errorContext = createErrorContext(operation, component, severity, options)
  const errorInfo = extractErrorInfo(error)
  const entry = formatError(message, error, errorContext)

  // Sanitize context before logging
  const sanitizedContext = {
    ...entry.context,
    context: entry.context.context ? sanitizeContext(entry.context.context) : undefined,
    state: entry.context.state ? sanitizeContext(entry.context.state) : undefined,
  }

  logger.error(entry.message, {
    ...sanitizedContext,
    errorInfo,
  })
}
