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
      let resolveCount: ((value: any) => void) | null = null
      const countPromise = new Promise((resolve) => {
        resolveCount = resolve
      })

      // Mock IndexedDB
      const mockDb = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            count: vi.fn(() => {
              const countRequest: any = {
                onsuccess: null,
                onerror: null,
                result: 10,
              }
              // Simulate async behavior
              Promise.resolve().then(() => {
                if (countRequest.onsuccess) {
                  countRequest.onsuccess({ target: countRequest })
                  if (resolveCount) resolveCount(true)
                }
              })
              return countRequest
            }),
            index: vi.fn(() => ({
              openCursor: vi.fn(() => {
                const cursorRequest: any = {
                  onsuccess: null,
                  onerror: null,
                }
                Promise.resolve().then(() => {
                  if (cursorRequest.onsuccess) {
                    cursorRequest.onsuccess({ target: { result: null } })
                  }
                })
                return cursorRequest
              }),
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

      // Wait for the first deletion to complete
      await countPromise
      await deletion1Promise

      // After completion, flag should be reset
      expect((plugin as any).isDeleting).toBe(false)
    })

    it('should reset isDeleting flag on success', async () => {
      const mockDb = {
        transaction: vi.fn(() => {
          const transaction = {
            objectStore: vi.fn(() => {
              const store = {
                count: vi.fn(() => {
                  const countRequest: any = {
                    onsuccess: null,
                    onerror: null,
                    result: 3, // Under max, no deletion needed
                  }
                  Promise.resolve().then(() => {
                    if (countRequest.onsuccess) {
                      countRequest.onsuccess({ target: countRequest })
                    }
                  })
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
              const countRequest: any = {
                onsuccess: null,
                onerror: null,
              }
              // Trigger error asynchronously but deterministically
              queueMicrotask(() => {
                if (countRequest.onerror) {
                  countRequest.onerror({})
                }
              })
              return countRequest
            }),
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

      // Wait for the error to be triggered and handled
      await expect((plugin as any).deleteOldRecordings()).rejects.toThrow(
        'Failed to count recordings'
      )

      // Flag should be reset even on error
      expect((plugin as any).isDeleting).toBe(false)
    })
  })
})
