/**
 * Test Utilities Tests
 *
 * Tests for test helper functions:
 * - Memory leak detection
 * - Event bus listener counting
 * - waitForEvent cleanup
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EventBus } from '../../src/core/EventBus'
import { detectMemoryLeaks, checkEventBusListeners, waitForEvent } from '../utils/test-helpers'

describe('Test Utilities', () => {
  describe('Memory Leak Detection', () => {
    it('should detect memory leaks', async () => {
      const leakyArray: any[] = []

      const result = await detectMemoryLeaks(
        () => {
          // Intentionally leak memory
          leakyArray.push(new Array(1000).fill('x'))
        },
        {
          iterations: 100,
          threshold: 1, // 1MB
          gcBetweenIterations: false, // Don't GC to ensure leak is detected
        }
      )

      // With no GC, memory should accumulate
      expect(result.heapDelta).toBeGreaterThan(0)
      expect(result.iterations).toBe(100)
    })

    it('should not report false positives with proper cleanup', async () => {
      const result = await detectMemoryLeaks(
        () => {
          // Create and discard temporary data
          const temp = new Array(1000).fill('x')
          temp.length = 0 // Clear it
        },
        {
          iterations: 100,
          threshold: 10, // 10MB
          gcBetweenIterations: true,
        }
      )

      // With proper cleanup and GC, shouldn't detect leak
      expect(result.leaked).toBe(false)
    })
  })

  describe('Event Bus Listener Checks', () => {
    it('should count listeners for specific event', () => {
      const eventBus = new EventBus()

      const handler1 = () => {}
      const handler2 = () => {}

      eventBus.on('test:event', handler1)
      eventBus.on('test:event', handler2)
      eventBus.on('other:event', () => {})

      const count = checkEventBusListeners(eventBus, 'test:event')

      expect(count).toBe(2)
    })

    it('should count total listeners across all events', () => {
      const eventBus = new EventBus()

      eventBus.on('event1', () => {})
      eventBus.on('event2', () => {})
      eventBus.on('event2', () => {})
      eventBus.on('event3', () => {})

      const totalCount = checkEventBusListeners(eventBus)

      expect(totalCount).toBe(4)
    })

    it('should return 0 for event with no listeners', () => {
      const eventBus = new EventBus()

      const count = checkEventBusListeners(eventBus, 'nonexistent:event')

      expect(count).toBe(0)
    })
  })

  describe('waitForEvent Cleanup', () => {
    let eventBus: EventBus

    beforeEach(() => {
      eventBus = new EventBus()
    })

    it('should cleanup event listener on timeout', async () => {
      const initialListeners = eventBus.listenerCount('test-event')

      const waitPromise = waitForEvent(eventBus, 'test-event', 100)

      await expect(waitPromise).rejects.toThrow('Timeout waiting for event')

      // Event listener should be removed
      const finalListeners = eventBus.listenerCount('test-event')
      expect(finalListeners).toBe(initialListeners)
    })

    it('should cleanup event listener on success', async () => {
      const initialListeners = eventBus.listenerCount('test-event')

      const waitPromise = waitForEvent(eventBus, 'test-event', 1000)

      // Emit event after a short delay
      setTimeout(() => {
        eventBus.emit('test-event', { data: 'test' })
      }, 50)

      await expect(waitPromise).resolves.toEqual({ data: 'test' })

      // Event listener should be removed
      const finalListeners = eventBus.listenerCount('test-event')
      expect(finalListeners).toBe(initialListeners)
    })

    it('should cleanup timer on event success', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const waitPromise = waitForEvent(eventBus, 'test-event', 5000)

      setTimeout(() => {
        eventBus.emit('test-event', { data: 'test' })
      }, 10)

      await waitPromise

      // Timer should have been cleared
      expect(clearTimeoutSpy).toHaveBeenCalled()

      clearTimeoutSpy.mockRestore()
    })

    it('should not leak listeners with multiple concurrent waits', async () => {
      const initialListeners = eventBus.listenerCount('test-event')

      // Start multiple waits
      const wait1 = waitForEvent(eventBus, 'test-event', 100)
      const wait2 = waitForEvent(eventBus, 'test-event', 100)
      const wait3 = waitForEvent(eventBus, 'test-event', 100)

      // All should timeout
      await expect(wait1).rejects.toThrow()
      await expect(wait2).rejects.toThrow()
      await expect(wait3).rejects.toThrow()

      // No listeners should remain
      const finalListeners = eventBus.listenerCount('test-event')
      expect(finalListeners).toBe(initialListeners)
    })
  })
})
