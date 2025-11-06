/**
 * RecordingPlugin Security Tests
 *
 * Tests for security-related features:
 * - Recording ID generation with crypto APIs
 * - Collision resistance
 */

import { describe, it, expect, vi } from 'vitest'
import { RecordingPlugin } from '../../../src/plugins/RecordingPlugin'

describe('RecordingPlugin - Security', () => {
  describe('Recording ID Generation', () => {
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
})
