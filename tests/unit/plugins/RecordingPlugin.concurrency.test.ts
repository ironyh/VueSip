/**
 * RecordingPlugin Concurrency Tests
 *
 * Tests for concurrency control features:
 * - Old recording deletion race conditions
 * - Mutex flag protection
 * - Proper flag cleanup on success/error
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RecordingPlugin } from '../../../src/plugins/RecordingPlugin'

describe('RecordingPlugin - Concurrency', () => {
  describe('Old Recording Deletion Race Condition', () => {
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
})
