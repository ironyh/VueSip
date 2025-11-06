/**
 * Medium-Priority Fixes Tests
 *
 * Tests for medium-priority issues identified in Phase 10 code review (Batch 1 & 2)
 * These tests validate the fixes implemented in Phase 10.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AnalyticsPlugin } from '../../src/plugins/AnalyticsPlugin'
import { RecordingPlugin } from '../../src/plugins/RecordingPlugin'
import { EventBus } from '../../src/core/EventBus'
import {
  createMockPluginContext,
  detectMemoryLeaks,
  checkEventBusListeners,
} from '../utils/test-helpers'

describe('Medium-Priority Fixes - Batch 1', () => {
  describe('AnalyticsPlugin - Empty Event Tracking Validation', () => {
    let plugin: AnalyticsPlugin
    let context: ReturnType<typeof createMockPluginContext>

    beforeEach(async () => {
      plugin = new AnalyticsPlugin()
      context = createMockPluginContext()
      await plugin.install(context, {
        endpoint: 'https://test.com',
        validateEventData: true, // Enable validation
        batchEvents: false, // Disable batching for easier testing
      })
    })

    afterEach(async () => {
      await plugin.uninstall(context)
    })

    it('should reject null event data when validation enabled', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      plugin.trackEvent('test:event', null as any)

      expect(consoleSpy).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid event data'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('should accept undefined event data', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      plugin.trackEvent('test:event', undefined)

      // Should not warn about invalid data
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Invalid event data'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('should accept empty object event data', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      plugin.trackEvent('test:event', {})

      // Should not warn about invalid data
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Invalid event data'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('should reject array event data', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      plugin.trackEvent('test:event', [] as any)

      expect(consoleSpy).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid event data'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('should reject non-object event data', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      plugin.trackEvent('test:event', 'string' as any)
      plugin.trackEvent('test:event', 123 as any)
      plugin.trackEvent('test:event', true as any)

      expect(consoleSpy).toHaveBeenCalledTimes(3)

      consoleSpy.mockRestore()
    })

    it('should allow disabling validation', async () => {
      await plugin.uninstall(context)

      plugin = new AnalyticsPlugin()
      await plugin.install(context, {
        endpoint: 'https://test.com',
        validateEventData: false, // Disable validation
        batchEvents: false,
      })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Null should be allowed when validation disabled
      plugin.trackEvent('test:event', null as any)

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Invalid event data'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })
  })

  describe('AnalyticsPlugin - Large Event Payload Size Limits', () => {
    let plugin: AnalyticsPlugin
    let context: ReturnType<typeof createMockPluginContext>

    beforeEach(async () => {
      plugin = new AnalyticsPlugin()
      context = createMockPluginContext()
      await plugin.install(context, {
        endpoint: 'https://test.com',
        maxPayloadSize: 1000, // 1KB limit for testing
        batchEvents: false,
      })
    })

    afterEach(async () => {
      await plugin.uninstall(context)
    })

    it('should reject events exceeding payload size limit', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Create large event data
      const largeData = {
        bigArray: new Array(1000).fill('x'.repeat(100)),
      }

      plugin.trackEvent('test:event', largeData)

      expect(consoleSpy).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Event payload too large'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('should accept events within payload size limit', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Small event data
      const smallData = {
        message: 'test',
      }

      plugin.trackEvent('test:event', smallData)

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Event payload too large'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('should use default 100KB limit', async () => {
      await plugin.uninstall(context)

      plugin = new AnalyticsPlugin()
      await plugin.install(context, {
        endpoint: 'https://test.com',
        // maxPayloadSize not specified, should default to 100KB
        batchEvents: false,
      })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Create data under 100KB
      const mediumData = {
        data: 'x'.repeat(50000), // 50KB
      }

      plugin.trackEvent('test:event', mediumData)

      // Should not exceed 100KB default limit
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Event payload too large'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('should handle serialization failures', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Create circular reference that will fail JSON.stringify
      const circular: any = { prop: 'value' }
      circular.circular = circular

      plugin.trackEvent('test:event', circular)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to serialize event'),
        expect.anything(),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })
  })

  describe('AnalyticsPlugin - Multiple Install Protection', () => {
    let plugin: AnalyticsPlugin
    let context: ReturnType<typeof createMockPluginContext>

    beforeEach(() => {
      plugin = new AnalyticsPlugin()
      context = createMockPluginContext()
    })

    afterEach(async () => {
      try {
        await plugin.uninstall(context)
      } catch {
        // Ignore if already uninstalled
      }
    })

    it('should prevent double installation', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await plugin.install(context, { endpoint: 'https://test.com' })
      await plugin.install(context, { endpoint: 'https://test.com' })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('already installed'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('should allow reinstallation after uninstall', async () => {
      await plugin.install(context, { endpoint: 'https://test.com' })
      await plugin.uninstall(context)

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await plugin.install(context, { endpoint: 'https://test.com' })

      // Should not warn about already installed
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('already installed'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('should not start duplicate timers on double install', async () => {
      await plugin.install(context, {
        endpoint: 'https://test.com',
        batchEvents: true,
        sendInterval: 1000,
      })

      const batchTimerBefore = (plugin as any).batchTimer

      // Try to install again
      await plugin.install(context, {
        endpoint: 'https://test.com',
        batchEvents: true,
        sendInterval: 1000,
      })

      const batchTimerAfter = (plugin as any).batchTimer

      // Timer should be the same (not recreated)
      expect(batchTimerAfter).toBe(batchTimerBefore)
    })

    it('should not register duplicate event listeners on double install', async () => {
      const eventBus = context.eventBus

      await plugin.install(context, { endpoint: 'https://test.com' })

      const listenersBefore = checkEventBusListeners(eventBus)

      // Try to install again
      await plugin.install(context, { endpoint: 'https://test.com' })

      const listenersAfter = checkEventBusListeners(eventBus)

      // Listener count should not increase
      expect(listenersAfter).toBe(listenersBefore)
    })
  })

  describe('RecordingPlugin - Recording ID Collision', () => {
    it('should use crypto.randomUUID when available', () => {
      const originalCrypto = global.crypto
      global.crypto = {
        ...global.crypto,
        randomUUID: vi.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
      } as any

      const plugin = new RecordingPlugin()

      // Call the private generateRecordingId method via reflection
      const recordingId = (plugin as any).generateRecordingId()

      expect(recordingId).toContain('recording-')
      expect(recordingId).toContain('123e4567')
      expect(global.crypto.randomUUID).toHaveBeenCalled()

      global.crypto = originalCrypto
    })

    it('should use crypto.getRandomValues when randomUUID not available', () => {
      const originalCrypto = global.crypto
      global.crypto = {
        getRandomValues: vi.fn((array: Uint32Array) => {
          for (let i = 0; i < array.length; i++) {
            array[i] = 0x12345678
          }
          return array
        }),
      } as any

      const plugin = new RecordingPlugin()
      const recordingId = (plugin as any).generateRecordingId()

      expect(recordingId).toContain('recording-')
      expect(recordingId).toContain('12345678')
      expect(global.crypto.getRandomValues).toHaveBeenCalled()

      global.crypto = originalCrypto
    })

    it('should fallback to Math.random when crypto not available', () => {
      const originalCrypto = global.crypto
      ;(global as any).crypto = undefined

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const plugin = new RecordingPlugin()
      const recordingId = (plugin as any).generateRecordingId()

      expect(recordingId).toContain('recording-')
      // Should have logged warning about non-cryptographic generation
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
      global.crypto = originalCrypto
    })

    it('should generate unique recording IDs', () => {
      const plugin = new RecordingPlugin()

      const id1 = (plugin as any).generateRecordingId()
      const id2 = (plugin as any).generateRecordingId()
      const id3 = (plugin as any).generateRecordingId()

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).not.toBe(id3)
    })
  })

  describe('RecordingPlugin - Old Recording Deletion Race Condition', () => {
    let plugin: RecordingPlugin

    beforeEach(() => {
      plugin = new RecordingPlugin()
    })

    it('should prevent concurrent deletion operations', async () => {
      // Mock IndexedDB
      const mockDb = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            count: vi.fn(() => ({
              onsuccess: null,
              onerror: null,
              result: 10,
            })),
            index: vi.fn(() => ({
              openCursor: vi.fn(() => ({
                onsuccess: null,
                onerror: null,
              })),
            })),
          })),
        })),
      }

      ;(plugin as any).db = mockDb
      ;(plugin as any).config = { maxRecordings: 5 }

      // Start first deletion
      const deletion1Promise = (plugin as any).deleteOldRecordings()

      // Try to start second deletion immediately
      const deletion2Promise = (plugin as any).deleteOldRecordings()

      // Second deletion should return immediately without doing anything
      await deletion2Promise

      // Verify that isDeleting flag prevented concurrent execution
      expect((plugin as any).isDeleting).toBe(true)

      // Wait for first deletion to complete (by simulating success)
      const transaction = mockDb.transaction()
      const store = transaction.objectStore()
      const countRequest = store.count()

      if (countRequest.onsuccess) {
        countRequest.onsuccess({ target: countRequest } as any)
      }

      await deletion1Promise
    })

    it('should reset isDeleting flag on success', async () => {
      const mockDb = {
        transaction: vi.fn(() => {
          const transaction = {
            objectStore: vi.fn(() => {
              const store = {
                count: vi.fn(() => {
                  const countRequest = {
                    onsuccess: null as any,
                    onerror: null as any,
                    result: 3, // Under max, no deletion needed
                  }
                  setTimeout(() => {
                    if (countRequest.onsuccess) {
                      countRequest.onsuccess({ target: countRequest } as any)
                    }
                  }, 10)
                  return countRequest
                }),
                index: vi.fn(),
              }
              return store
            }),
          }
          return transaction
        }),
      }

      ;(plugin as any).db = mockDb
      ;(plugin as any).config = { maxRecordings: 5 }

      await (plugin as any).deleteOldRecordings()

      // Flag should be reset after successful completion
      expect((plugin as any).isDeleting).toBe(false)
    })

    it('should reset isDeleting flag on error', async () => {
      const mockDb = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            count: vi.fn(() => {
              const countRequest = {
                onsuccess: null as any,
                onerror: null as any,
              }
              setTimeout(() => {
                if (countRequest.onerror) {
                  countRequest.onerror({} as any)
                }
              }, 10)
              return countRequest
            }),
          })),
        })),
      }

      ;(plugin as any).db = mockDb
      ;(plugin as any).config = { maxRecordings: 5 }

      try {
        await (plugin as any).deleteOldRecordings()
      } catch {
        // Expected to fail
      }

      // Flag should be reset even on error
      expect((plugin as any).isDeleting).toBe(false)
    })
  })

  describe('Test Utilities - Memory Leak Detection', () => {
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

  describe('Test Utilities - Event Bus Listener Checks', () => {
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
})
