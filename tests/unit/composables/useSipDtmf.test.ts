/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useSipDtmf composable unit tests
 * Tests for AbortController integration in DTMF sequence sending
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useSipDtmf } from '@/composables/useSipDtmf'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('useSipDtmf - AbortController Integration', () => {
  let mockSession: any
  let mockDtmfSender: any
  let mockPeerConnection: any

  beforeEach(() => {
    vi.useFakeTimers()

    // Mock DTMF sender
    mockDtmfSender = {
      insertDTMF: vi.fn(),
      toneBuffer: '',
      ontonechange: null,
    }

    // Mock RTP sender with DTMF support
    const mockAudioSender = {
      track: { kind: 'audio' },
      dtmf: mockDtmfSender,
    }

    // Mock peer connection
    mockPeerConnection = {
      getSenders: vi.fn().mockReturnValue([mockAudioSender]),
    }

    // Mock session
    mockSession = {
      id: 'test-session',
      state: 'active',
      sessionDescriptionHandler: {
        peerConnection: mockPeerConnection,
      },
    }
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('sendDtmfSequence with AbortController', () => {
    it('should abort sequence when signal is triggered before starting', async () => {
      const sessionRef = ref(mockSession)
      const { sendDtmfSequence } = useSipDtmf(sessionRef)

      const controller = new AbortController()
      controller.abort() // Abort immediately

      await expect(sendDtmfSequence('123', 160, controller.signal)).rejects.toThrow(
        'Operation aborted'
      )
      expect(mockDtmfSender.insertDTMF).not.toHaveBeenCalled()
    })

    it('should abort sequence when signal is triggered during sequence', async () => {
      const sessionRef = ref(mockSession)
      const { sendDtmfSequence } = useSipDtmf(sessionRef)

      const controller = new AbortController()

      // Start sending sequence
      const promise = sendDtmfSequence('123', 160, controller.signal)

      // Abort after first tone
      await vi.advanceTimersByTimeAsync(0)
      controller.abort()

      await expect(promise).rejects.toThrow('Operation aborted')

      // Should have sent at least the first tone
      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledTimes(1)
      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledWith('1', 160, 70)
    })

    it('should complete sequence without AbortSignal (backward compatibility)', async () => {
      const sessionRef = ref(mockSession)
      const { sendDtmfSequence } = useSipDtmf(sessionRef)

      // Call without signal parameter
      const promise = sendDtmfSequence('123')

      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(160)
      await vi.advanceTimersByTimeAsync(160)

      await promise

      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledTimes(3)
      expect(mockDtmfSender.insertDTMF).toHaveBeenNthCalledWith(1, '1', 160, 70)
      expect(mockDtmfSender.insertDTMF).toHaveBeenNthCalledWith(2, '2', 160, 70)
      expect(mockDtmfSender.insertDTMF).toHaveBeenNthCalledWith(3, '3', 160, 70)
    })

    it('should abort between tones using abortableSleep', async () => {
      const sessionRef = ref(mockSession)
      const { sendDtmfSequence } = useSipDtmf(sessionRef)

      const controller = new AbortController()

      // Start sending sequence
      const promise = sendDtmfSequence('1234', 200, controller.signal)

      // Let first tone complete
      await vi.advanceTimersByTimeAsync(0)
      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledTimes(1)

      // Abort during inter-tone gap
      await vi.advanceTimersByTimeAsync(100)
      controller.abort()

      await expect(promise).rejects.toThrow('Operation aborted')

      // Should have only sent first tone
      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledTimes(1)
    })

    it('should use custom interval with AbortSignal', async () => {
      const sessionRef = ref(mockSession)
      const { sendDtmfSequence } = useSipDtmf(sessionRef)

      const controller = new AbortController()

      const promise = sendDtmfSequence('12', 300, controller.signal)

      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(300)

      await promise

      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledTimes(2)
    })

    it('should reject invalid DTMF digit even with AbortSignal', async () => {
      const sessionRef = ref(mockSession)
      const { sendDtmfSequence } = useSipDtmf(sessionRef)

      const controller = new AbortController()

      await expect(sendDtmfSequence('X', 160, controller.signal)).rejects.toThrow(
        'Invalid DTMF digit'
      )
      expect(mockDtmfSender.insertDTMF).not.toHaveBeenCalled()
    })

    it('should prevent concurrent sendDtmfSequence calls', async () => {
      const sessionRef = ref(mockSession)
      const { sendDtmfSequence } = useSipDtmf(sessionRef)

      // Start first sequence
      const promise1 = sendDtmfSequence('123', 160)

      // Try to start second sequence before first completes
      const promise2 = sendDtmfSequence('456', 160)

      // Second call should be rejected
      await expect(promise2).rejects.toThrow('DTMF operation already in progress')

      // Complete first sequence
      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(160)
      await vi.advanceTimersByTimeAsync(160)

      await promise1

      // First sequence should have sent all digits
      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledTimes(3)
    })

    it('should allow new sequence after previous completes', async () => {
      const sessionRef = ref(mockSession)
      const { sendDtmfSequence } = useSipDtmf(sessionRef)

      // First sequence
      const promise1 = sendDtmfSequence('12', 160)
      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(160)
      await promise1

      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledTimes(2)

      mockDtmfSender.insertDTMF.mockClear()

      // Second sequence should succeed
      const promise2 = sendDtmfSequence('34', 160)
      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(160)
      await promise2

      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledTimes(2)
    })

    it('should reset guard even if sequence fails', async () => {
      const sessionRef = ref(mockSession)
      const { sendDtmfSequence } = useSipDtmf(sessionRef)

      // First sequence fails
      mockDtmfSender.insertDTMF = vi.fn().mockImplementation(() => {
        throw new Error('DTMF send failed')
      })

      await expect(sendDtmfSequence('1', 160)).rejects.toThrow('DTMF send failed')

      // Reset mock to succeed
      mockDtmfSender.insertDTMF = vi.fn()

      // Second sequence should succeed (guard was reset)
      const promise2 = sendDtmfSequence('2', 160)
      await vi.advanceTimersByTimeAsync(0)
      await promise2

      expect(mockDtmfSender.insertDTMF).toHaveBeenCalled()
    })
  })

  describe('Upfront Validation', () => {
    it('should validate entire sequence before sending any digits', async () => {
      const sessionRef = ref(mockSession)
      const { sendDtmfSequence } = useSipDtmf(sessionRef)

      // Sequence with invalid digit at the end
      await expect(sendDtmfSequence('12X', 160)).rejects.toThrow('Invalid DTMF digit')

      // Should not have sent any digits
      expect(mockDtmfSender.insertDTMF).not.toHaveBeenCalled()
    })

    it('should validate each digit in sequence upfront', async () => {
      const sessionRef = ref(mockSession)
      const { sendDtmfSequence } = useSipDtmf(sessionRef)

      // Various invalid sequences
      await expect(sendDtmfSequence('1Z3', 160)).rejects.toThrow('Invalid DTMF digit')
      await expect(sendDtmfSequence('$123', 160)).rejects.toThrow('Invalid DTMF digit')
      await expect(sendDtmfSequence('12!', 160)).rejects.toThrow('Invalid DTMF digit')

      // Should not have sent any digits for any of these
      expect(mockDtmfSender.insertDTMF).not.toHaveBeenCalled()
    })

    it('should accept all valid DTMF digits in sequence', async () => {
      const sessionRef = ref(mockSession)
      const { sendDtmfSequence } = useSipDtmf(sessionRef)

      const validSequence = '0123456789*#ABCD'

      const promise = sendDtmfSequence(validSequence, 160)

      // Advance through all digits
      for (let i = 0; i < validSequence.length; i++) {
        await vi.advanceTimersByTimeAsync(i === 0 ? 0 : 160)
      }

      await promise

      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledTimes(validSequence.length)
    })

    it('should throw immediately for empty sequence', async () => {
      const sessionRef = ref(mockSession)
      const { sendDtmfSequence } = useSipDtmf(sessionRef)

      await expect(sendDtmfSequence('', 160)).rejects.toThrow()

      expect(mockDtmfSender.insertDTMF).not.toHaveBeenCalled()
    })
  })

  describe('sendDtmf (single tone)', () => {
    it('should send single tone without AbortSignal', async () => {
      const sessionRef = ref(mockSession)
      const { sendDtmf } = useSipDtmf(sessionRef)

      await sendDtmf('5')

      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledWith('5', 160, 70)
    })

    it('should validate single tone', async () => {
      const sessionRef = ref(mockSession)
      const { sendDtmf } = useSipDtmf(sessionRef)

      await expect(sendDtmf('Z')).rejects.toThrow('Invalid DTMF digit')
      expect(mockDtmfSender.insertDTMF).not.toHaveBeenCalled()
    })

    it('should accept all valid DTMF digits', async () => {
      const sessionRef = ref(mockSession)
      const { sendDtmf } = useSipDtmf(sessionRef)

      const validDigits = '0123456789*#ABCD'

      for (const digit of validDigits) {
        await sendDtmf(digit)
      }

      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledTimes(validDigits.length)
    })

    it('should throw error when session is null', async () => {
      const sessionRef = ref(null)
      const { sendDtmf } = useSipDtmf(sessionRef)

      await expect(sendDtmf('1')).rejects.toThrow('No active session')
    })
  })

  describe('Error Handling', () => {
    it('should throw error when peer connection is missing', async () => {
      const sessionWithoutPC = {
        ...mockSession,
        sessionDescriptionHandler: {},
      }
      const sessionRef = ref(sessionWithoutPC)
      const { sendDtmf } = useSipDtmf(sessionRef)

      // Should not throw, just not send DTMF
      await sendDtmf('1')

      expect(mockDtmfSender.insertDTMF).not.toHaveBeenCalled()
    })

    it('should throw error when DTMF sender is not available', async () => {
      const mockSenderWithoutDtmf = {
        track: { kind: 'audio' },
        // No dtmf property
      }

      mockPeerConnection.getSenders.mockReturnValue([mockSenderWithoutDtmf])

      const sessionRef = ref(mockSession)
      const { sendDtmf } = useSipDtmf(sessionRef)

      // Should not throw, just not send DTMF
      await sendDtmf('1')

      expect(mockDtmfSender.insertDTMF).not.toHaveBeenCalled()
    })
  })
})
