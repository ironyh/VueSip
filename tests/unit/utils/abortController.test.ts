/**
 * Tests for abortController utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createAbortError, isAbortError, abortableSleep, throwIfAborted } from '@/utils/abortController'

describe('abortController utilities', () => {
  describe('createAbortError', () => {
    it('should create DOMException with AbortError name', () => {
      const error = createAbortError()

      expect(error).toBeInstanceOf(DOMException)
      expect(error.name).toBe('AbortError')
      expect(error.message).toBe('Operation aborted')
    })

    it('should create DOMException with custom message', () => {
      const error = createAbortError('Custom abort message')

      expect(error).toBeInstanceOf(DOMException)
      expect(error.name).toBe('AbortError')
      expect(error.message).toBe('Custom abort message')
    })
  })

  describe('isAbortError', () => {
    it('should return true for AbortError', () => {
      const error = createAbortError()

      expect(isAbortError(error)).toBe(true)
    })

    it('should return true for DOMException with AbortError name', () => {
      const error = new DOMException('Aborted', 'AbortError')

      expect(isAbortError(error)).toBe(true)
    })

    it('should return false for regular Error', () => {
      const error = new Error('Regular error')

      expect(isAbortError(error)).toBe(false)
    })

    it('should return false for DOMException with different name', () => {
      const error = new DOMException('Not allowed', 'NotAllowedError')

      expect(isAbortError(error)).toBe(false)
    })

    it('should return false for non-error values', () => {
      expect(isAbortError('string')).toBe(false)
      expect(isAbortError(null)).toBe(false)
      expect(isAbortError(undefined)).toBe(false)
      expect(isAbortError(123)).toBe(false)
      expect(isAbortError({})).toBe(false)
    })
  })

  describe('abortableSleep', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.clearAllTimers()
      vi.useRealTimers()
    })

    it('should resolve after specified duration', async () => {
      const promise = abortableSleep(1000)

      expect(promise).toBeInstanceOf(Promise)

      await vi.advanceTimersByTimeAsync(1000)

      await expect(promise).resolves.toBeUndefined()
    })

    it('should reject if signal is already aborted', async () => {
      const controller = new AbortController()
      controller.abort()

      const promise = abortableSleep(1000, controller.signal)

      await expect(promise).rejects.toThrow('Operation aborted')
      await expect(promise).rejects.toThrowError(DOMException)
    })

    it('should reject when signal is aborted during sleep', async () => {
      const controller = new AbortController()
      const promise = abortableSleep(1000, controller.signal)

      // Abort after 500ms
      await vi.advanceTimersByTimeAsync(500)
      controller.abort()

      await expect(promise).rejects.toThrow('Operation aborted')
    })

    it('should clean up event listener on successful completion', async () => {
      const controller = new AbortController()
      const removeEventListenerSpy = vi.spyOn(controller.signal, 'removeEventListener')

      const promise = abortableSleep(1000, controller.signal)

      await vi.advanceTimersByTimeAsync(1000)
      await promise

      // Event listener should be removed
      expect(removeEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function))
    })

    it('should not leak timers when aborted', async () => {
      const controller = new AbortController()
      const promise = abortableSleep(10000, controller.signal)

      const timerCountBefore = vi.getTimerCount()

      controller.abort()

      await expect(promise).rejects.toThrow()

      // Timer should be cleared
      const timerCountAfter = vi.getTimerCount()
      expect(timerCountAfter).toBeLessThan(timerCountBefore)
    })

    it('should handle multiple concurrent abortable sleeps', async () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()

      const promise1 = abortableSleep(1000, controller1.signal)
      const promise2 = abortableSleep(2000, controller2.signal)

      // Abort first one
      controller1.abort()

      await expect(promise1).rejects.toThrow('Operation aborted')

      // Second one should still work
      await vi.advanceTimersByTimeAsync(2000)
      await expect(promise2).resolves.toBeUndefined()
    })

    it('should work without signal (backward compatibility)', async () => {
      const promise = abortableSleep(500)

      await vi.advanceTimersByTimeAsync(500)

      await expect(promise).resolves.toBeUndefined()
    })

    it('should handle zero duration sleep', async () => {
      const promise = abortableSleep(0)

      await vi.advanceTimersByTimeAsync(0)

      await expect(promise).resolves.toBeUndefined()
    })

    it('should handle signal abort during zero duration sleep', async () => {
      const controller = new AbortController()
      controller.abort()

      const promise = abortableSleep(0, controller.signal)

      await expect(promise).rejects.toThrow('Operation aborted')
    })

    it('should use once:true for abort event listener', async () => {
      const controller = new AbortController()
      const addEventListenerSpy = vi.spyOn(controller.signal, 'addEventListener')

      const promise = abortableSleep(1000, controller.signal)

      expect(addEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function), { once: true })

      controller.abort()
      await expect(promise).rejects.toThrow()
    })

    it('should properly clean up on abort', async () => {
      const controller = new AbortController()
      const promise = abortableSleep(5000, controller.signal)

      // Start sleep, then abort immediately
      controller.abort()

      await expect(promise).rejects.toThrow()

      // Advance time to ensure no lingering timer
      await vi.advanceTimersByTimeAsync(10000)

      // No errors should be thrown from cleared timer
    })

    it('should clear timeout before rejecting on abort', async () => {
      const controller = new AbortController()
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const promise = abortableSleep(1000, controller.signal)

      controller.abort()

      await expect(promise).rejects.toThrow()

      // clearTimeout should have been called
      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })

  describe('throwIfAborted', () => {
    it('should throw if signal is aborted', () => {
      const controller = new AbortController()
      controller.abort()

      expect(() => throwIfAborted(controller.signal)).toThrow('Operation aborted')
      expect(() => throwIfAborted(controller.signal)).toThrowError(DOMException)
    })

    it('should not throw if signal is not aborted', () => {
      const controller = new AbortController()

      expect(() => throwIfAborted(controller.signal)).not.toThrow()
    })

    it('should not throw if signal is undefined', () => {
      expect(() => throwIfAborted(undefined)).not.toThrow()
    })

    it('should work with signal that becomes aborted', () => {
      const controller = new AbortController()

      expect(() => throwIfAborted(controller.signal)).not.toThrow()

      controller.abort()

      expect(() => throwIfAborted(controller.signal)).toThrow('Operation aborted')
    })
  })
})
