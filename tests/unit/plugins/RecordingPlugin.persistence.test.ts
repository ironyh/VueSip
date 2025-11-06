/**
 * RecordingPlugin Persistence Tests
 *
 * Tests for IndexedDB persistence features:
 * - Transaction handling (abort/error)
 * - Data storage and retrieval
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RecordingPlugin } from '../../../src/plugins/RecordingPlugin'

describe('RecordingPlugin - Persistence', () => {
  describe('IndexedDB Transaction Failures', () => {
    let plugin: RecordingPlugin
    let mockDb: any

    beforeEach(() => {
      plugin = new RecordingPlugin()

      // Mock IndexedDB
      mockDb = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            add: vi.fn(() => ({
              onsuccess: null,
              onerror: null,
            })),
          })),
          onabort: null,
          onerror: null,
          error: null,
        })),
      }

      ;(plugin as any).db = mockDb
    })

    it('should handle transaction abort during save', async () => {
      const recording = {
        id: 'test-recording',
        callId: 'test-call',
        startTime: new Date(),
        mimeType: 'audio/webm',
        state: 'stopped',
        blob: new Blob(['test'], { type: 'audio/webm' }),
      }

      const transaction = {
        objectStore: vi.fn(() => ({
          add: vi.fn(() => ({
            onsuccess: null,
            onerror: null,
          })),
        })),
        onabort: null,
        onerror: null,
        error: new Error('Transaction aborted by user'),
      }

      mockDb.transaction.mockReturnValue(transaction)

      const savePromise = (plugin as any).saveRecording(recording)

      // Simulate transaction abort
      await new Promise((resolve) => setTimeout(resolve, 10))
      if (transaction.onabort) {
        transaction.onabort()
      }

      await expect(savePromise).rejects.toThrow('Transaction aborted')
    })

    it('should handle transaction error during save', async () => {
      const recording = {
        id: 'test-recording',
        callId: 'test-call',
        startTime: new Date(),
        mimeType: 'audio/webm',
        state: 'stopped',
        blob: new Blob(['test'], { type: 'audio/webm' }),
      }

      const transaction = {
        objectStore: vi.fn(() => ({
          add: vi.fn(() => ({
            onsuccess: null,
            onerror: null,
          })),
        })),
        onabort: null,
        onerror: null,
        error: new Error('Transaction error'),
      }

      mockDb.transaction.mockReturnValue(transaction)

      const savePromise = (plugin as any).saveRecording(recording)

      // Simulate transaction error
      await new Promise((resolve) => setTimeout(resolve, 10))
      if (transaction.onerror) {
        transaction.onerror()
      }

      await expect(savePromise).rejects.toThrow('Transaction failed')
    })
  })
})
