/**
 * Tests for errorContext utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  sanitizeContext,
  createErrorContext,
  formatError,
  createOperationTimer,
  extractErrorInfo,
  logErrorWithContext,
  ErrorSeverity,
} from '@/utils/errorContext'

describe('errorContext utilities', () => {
  describe('sanitizeContext', () => {
    it('should redact sensitive keys', () => {
      const data = {
        username: 'alice',
        password: 'secret123',
        apiKey: 'key-12345',
        token: 'bearer-token',
        authorization: 'Basic xyz',
        normalData: 'visible',
      }

      const sanitized = sanitizeContext(data)

      expect(sanitized.username).toBe('alice')
      expect(sanitized.password).toBe('[REDACTED]')
      expect(sanitized.apiKey).toBe('[REDACTED]')
      expect(sanitized.token).toBe('[REDACTED]')
      expect(sanitized.authorization).toBe('[REDACTED]')
      expect(sanitized.normalData).toBe('visible')
    })

    it('should redact keys with underscores', () => {
      const data = {
        user_password: 'secret',
        api_key: 'key123',
        my_secret_value: 'hidden',
        public_info: 'visible',
      }

      const sanitized = sanitizeContext(data)

      expect(sanitized.user_password).toBe('[REDACTED]')
      expect(sanitized.api_key).toBe('[REDACTED]')
      expect(sanitized.my_secret_value).toBe('[REDACTED]')
      expect(sanitized.public_info).toBe('visible')
    })

    it('should handle circular references', () => {
      const data: Record<string, unknown> = {
        name: 'test',
      }
      data.circular = data // Create circular reference

      const sanitized = sanitizeContext(data)

      expect(sanitized.name).toBe('test')
      expect(sanitized.circular).toEqual({ '[Circular]': true })
    })

    it('should sanitize nested objects', () => {
      const data = {
        user: {
          name: 'alice',
          password: 'secret',
          profile: {
            email: 'alice@example.com',
            apiKey: 'key123',
          },
        },
        public: 'data',
      }

      const sanitized = sanitizeContext(data)

      expect((sanitized.user as any).name).toBe('alice')
      expect((sanitized.user as any).password).toBe('[REDACTED]')
      expect((sanitized.user as any).profile.email).toBe('alice@example.com')
      expect((sanitized.user as any).profile.apiKey).toBe('[REDACTED]')
      expect(sanitized.public).toBe('data')
    })

    it('should sanitize arrays with nested objects', () => {
      const data = {
        users: [
          { name: 'alice', password: 'secret1' },
          { name: 'bob', password: 'secret2' },
        ],
        count: 2,
      }

      const sanitized = sanitizeContext(data)

      expect(Array.isArray(sanitized.users)).toBe(true)
      expect((sanitized.users as any)[0].name).toBe('alice')
      expect((sanitized.users as any)[0].password).toBe('[REDACTED]')
      expect((sanitized.users as any)[1].name).toBe('bob')
      expect((sanitized.users as any)[1].password).toBe('[REDACTED]')
      expect(sanitized.count).toBe(2)
    })

    it('should handle arrays with primitive values', () => {
      const data = {
        numbers: [1, 2, 3],
        strings: ['a', 'b', 'c'],
      }

      const sanitized = sanitizeContext(data)

      expect(sanitized.numbers).toEqual([1, 2, 3])
      expect(sanitized.strings).toEqual(['a', 'b', 'c'])
    })

    it('should handle arrays with mixed content', () => {
      const data = {
        mixed: [
          'string',
          123,
          { name: 'alice', password: 'secret' },
          null,
          undefined,
        ],
      }

      const sanitized = sanitizeContext(data)

      expect((sanitized.mixed as any)[0]).toBe('string')
      expect((sanitized.mixed as any)[1]).toBe(123)
      expect((sanitized.mixed as any)[2].name).toBe('alice')
      expect((sanitized.mixed as any)[2].password).toBe('[REDACTED]')
      expect((sanitized.mixed as any)[3]).toBeNull()
      expect((sanitized.mixed as any)[4]).toBeUndefined()
    })

    it('should handle circular references in nested objects', () => {
      const data: Record<string, unknown> = {
        level1: {
          level2: {
            name: 'test',
          },
        },
      }
      ;(data.level1 as any).level2.circular = data // Circular reference deep in structure

      const sanitized = sanitizeContext(data)

      expect((sanitized.level1 as any).level2.name).toBe('test')
      expect((sanitized.level1 as any).level2.circular).toEqual({ '[Circular]': true })
    })

    it('should handle circular references in arrays', () => {
      const data: Record<string, unknown> = {
        items: [],
      }
      ;(data.items as any[]).push({ ref: data }) // Circular reference in array

      const sanitized = sanitizeContext(data)

      expect(Array.isArray(sanitized.items)).toBe(true)
      expect((sanitized.items as any[])[0].ref).toEqual({ '[Circular]': true })
    })

    it('should preserve null and undefined values', () => {
      const data = {
        nullValue: null,
        undefinedValue: undefined,
        normalValue: 'test',
      }

      const sanitized = sanitizeContext(data)

      expect(sanitized.nullValue).toBeNull()
      expect(sanitized.undefinedValue).toBeUndefined()
      expect(sanitized.normalValue).toBe('test')
    })

    it('should handle empty objects', () => {
      const data = {}

      const sanitized = sanitizeContext(data)

      expect(sanitized).toEqual({})
    })

    it('should handle nested empty arrays', () => {
      const data = {
        emptyArray: [],
        nestedEmpty: [[]],
      }

      const sanitized = sanitizeContext(data)

      expect(sanitized.emptyArray).toEqual([])
      expect(sanitized.nestedEmpty).toEqual([[]])
    })

    it('should be case insensitive for sensitive keys', () => {
      const data = {
        PASSWORD: 'secret',
        ApiKey: 'key123',
        ToKeN: 'token',
      }

      const sanitized = sanitizeContext(data)

      expect(sanitized.PASSWORD).toBe('[REDACTED]')
      expect(sanitized.ApiKey).toBe('[REDACTED]')
      expect(sanitized.ToKeN).toBe('[REDACTED]')
    })
  })

  describe('createErrorContext', () => {
    it('should create basic error context', () => {
      const ctx = createErrorContext('testOp', 'TestComponent', ErrorSeverity.HIGH)

      expect(ctx.operation).toBe('testOp')
      expect(ctx.component).toBe('TestComponent')
      expect(ctx.severity).toBe(ErrorSeverity.HIGH)
      expect(ctx.timestamp).toBeInstanceOf(Date)
      expect(ctx.context).toBeUndefined()
      expect(ctx.state).toBeUndefined()
      expect(ctx.duration).toBeUndefined()
      expect(ctx.userId).toBeUndefined()
      expect(ctx.stack).toBeUndefined()
    })

    it('should create error context with options', () => {
      const ctx = createErrorContext('testOp', 'TestComponent', ErrorSeverity.MEDIUM, {
        context: { foo: 'bar' },
        state: { isConnected: true },
        duration: 1234,
        userId: 'user-123',
      })

      expect(ctx.context).toEqual({ foo: 'bar' })
      expect(ctx.state).toEqual({ isConnected: true })
      expect(ctx.duration).toBe(1234)
      expect(ctx.userId).toBe('user-123')
    })

    it('should include stack trace when requested', () => {
      const ctx = createErrorContext('testOp', 'TestComponent', ErrorSeverity.CRITICAL, {
        includeStack: true,
      })

      expect(ctx.stack).toBeDefined()
      expect(typeof ctx.stack).toBe('string')
    })
  })

  describe('formatError', () => {
    it('should format error with context', () => {
      const error = new Error('Test error')
      const ctx = createErrorContext('testOp', 'TestComponent', ErrorSeverity.HIGH)

      const formatted = formatError('Operation failed', error, ctx)

      expect(formatted.message).toBe('Operation failed')
      expect(formatted.error).toBe(error)
      expect(formatted.context).toBe(ctx)
    })
  })

  describe('createOperationTimer', () => {
    it('should track elapsed time', () => {
      const timer = createOperationTimer()

      // Simulate some time passing (can't control performance.now in tests)
      const elapsed = timer.elapsed()

      expect(typeof elapsed).toBe('number')
      expect(elapsed).toBeGreaterThanOrEqual(0)
    })

    it('should return increasing elapsed time', () => {
      const timer = createOperationTimer()

      const elapsed1 = timer.elapsed()
      // Small delay
      let sum = 0
      for (let i = 0; i < 1000; i++) {
        sum += i
      }
      const elapsed2 = timer.elapsed()

      expect(elapsed2).toBeGreaterThanOrEqual(elapsed1)
    })
  })

  describe('extractErrorInfo', () => {
    it('should extract info from Error object', () => {
      const error = new Error('Test error')
      error.name = 'TestError'

      const info = extractErrorInfo(error)

      expect(info.name).toBe('TestError')
      expect(info.message).toBe('Test error')
      expect(info.stack).toBeDefined()
      expect(info.code).toBeUndefined()
    })

    it('should extract info from DOMException', () => {
      const error = new DOMException('Permission denied', 'NotAllowedError')

      const info = extractErrorInfo(error)

      expect(info.name).toBe('NotAllowedError')
      expect(info.message).toBe('Permission denied')
      expect(info.code).toBeDefined()
    })

    it('should extract info from error-like object', () => {
      const error = {
        name: 'CustomError',
        message: 'Custom message',
        code: 'ERR_CUSTOM',
        stack: 'stack trace',
      }

      const info = extractErrorInfo(error)

      expect(info.name).toBe('CustomError')
      expect(info.message).toBe('Custom message')
      expect(info.code).toBe('ERR_CUSTOM')
      expect(info.stack).toBe('stack trace')
    })

    it('should handle non-object errors', () => {
      const info1 = extractErrorInfo('string error')
      expect(info1.name).toBe('UnknownError')
      expect(info1.message).toBe('string error')

      const info2 = extractErrorInfo(null)
      expect(info2.name).toBe('UnknownError')
      expect(info2.message).toBe('null')

      const info3 = extractErrorInfo(undefined)
      expect(info3.name).toBe('UnknownError')
      expect(info3.message).toBe('undefined')
    })
  })

  describe('logErrorWithContext', () => {
    let mockLogger: { error: ReturnType<typeof vi.fn> }

    beforeEach(() => {
      mockLogger = {
        error: vi.fn(),
      }
    })

    it('should log error with sanitized context', () => {
      const error = new Error('Test error')

      logErrorWithContext(
        mockLogger,
        'Operation failed',
        error,
        'testOp',
        'TestComponent',
        ErrorSeverity.HIGH,
        {
          context: { username: 'alice', password: 'secret' },
          state: { isConnected: true, apiKey: 'key123' },
        }
      )

      expect(mockLogger.error).toHaveBeenCalled()
      const loggedArgs = mockLogger.error.mock.calls[0]

      expect(loggedArgs[0]).toBe('Operation failed')
      expect(loggedArgs[1]).toMatchObject({
        operation: 'testOp',
        component: 'TestComponent',
        severity: ErrorSeverity.HIGH,
        context: {
          username: 'alice',
          password: '[REDACTED]',
        },
        state: {
          isConnected: true,
          apiKey: '[REDACTED]',
        },
        errorInfo: {
          name: 'Error',
          message: 'Test error',
        },
      })
    })

    it('should handle errors without context or state', () => {
      const error = new Error('Test error')

      logErrorWithContext(mockLogger, 'Operation failed', error, 'testOp', 'TestComponent', ErrorSeverity.LOW)

      expect(mockLogger.error).toHaveBeenCalled()
      const loggedArgs = mockLogger.error.mock.calls[0]

      expect(loggedArgs[1].context).toBeUndefined()
      expect(loggedArgs[1].state).toBeUndefined()
    })
  })
})
