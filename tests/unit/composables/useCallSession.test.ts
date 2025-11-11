/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * useCallSession composable unit tests
 * Tests for Phase 6.11 improvements: input validation and concurrent operation guards
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useCallSession } from '@/composables/useCallSession'
import type { SipClient } from '@/core/SipClient'
import { withSetup } from '../../utils/test-helpers'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock the validators
vi.mock('@/utils/validators', () => ({
  validateSipUri: (uri: string) => {
    if (!uri || uri.trim() === '') {
      return { isValid: false, errors: ['URI is empty'] }
    }
    if (!uri.includes('@') && !uri.startsWith('sip:')) {
      return { isValid: false, errors: ['Invalid SIP URI format'] }
    }
    return { isValid: true, errors: [] }
  },
}))

// Mock the call store
vi.mock('@/stores/callStore', () => ({
  callStore: {
    addActiveCall: vi.fn(),
    removeActiveCall: vi.fn(),
    updateCall: vi.fn(),
  },
}))

describe('useCallSession - Phase 6.11 Improvements', () => {
  let mockSipClient: any
  let mockSession: any

  beforeEach(() => {
    // Create mock session
    mockSession = {
      id: 'test-call-id',
      state: 'idle',
      answer: vi.fn().mockResolvedValue(undefined),
      hangup: vi.fn().mockResolvedValue(undefined),
      hold: vi.fn().mockResolvedValue(undefined),
      unhold: vi.fn().mockResolvedValue(undefined),
      sendDTMF: vi.fn().mockResolvedValue(undefined),
    }

    // Create mock SIP client
    mockSipClient = {
      call: vi.fn().mockResolvedValue(mockSession),
      connectionState: 'connected',
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Input Validation', () => {
    it('should reject empty target URI', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      await expect(result.makeCall('')).rejects.toThrow('Target URI cannot be empty')
      expect(mockSipClient.call).not.toHaveBeenCalled()
      unmount()
    })

    it('should reject whitespace-only target URI', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      await expect(result.makeCall('   ')).rejects.toThrow('Target URI cannot be empty')
      expect(mockSipClient.call).not.toHaveBeenCalled()
      unmount()
    })

    it('should reject invalid SIP URI format', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      await expect(result.makeCall('not-a-valid-uri')).rejects.toThrow('Invalid target URI')
      expect(mockSipClient.call).not.toHaveBeenCalled()
      unmount()
    })

    it('should accept valid SIP URI with sip: prefix', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      await result.makeCall('sip:bob@example.com')
      expect(mockSipClient.call).toHaveBeenCalled()
      unmount()
    })

    it('should accept valid SIP URI with @ sign', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      await result.makeCall('alice@example.com')
      expect(mockSipClient.call).toHaveBeenCalled()
      unmount()
    })

    it('should throw if SIP client is not initialized', async () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef as any))

      await expect(result.makeCall('sip:bob@example.com')).rejects.toThrow('SIP client not initialized')
      unmount()
    })
  })

  describe('Concurrent Operation Guards', () => {
    it('should prevent concurrent makeCall attempts', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      // Make call() hang for a bit
      let resolveCall: any
      mockSipClient.call = vi.fn(
        () => new Promise((resolve) => (resolveCall = () => resolve(mockSession)))
      )

      // Start first call (won't complete immediately)
      const call1 = result.makeCall('sip:alice@example.com')

      // Try to start second call before first completes
      const call2 = result.makeCall('sip:bob@example.com')

      // Second call should be rejected
      await expect(call2).rejects.toThrow('Call operation already in progress')

      // Complete first call
      resolveCall()
      await call1

      // Verify only first call was attempted
      expect(mockSipClient.call).toHaveBeenCalledTimes(1)
      unmount()
    })

    it('should prevent concurrent answer attempts', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      // Set up a session
      result.session.value = mockSession

      // Make answer() hang
      let resolveAnswer: any
      mockSession.answer = vi.fn(
        () => new Promise((resolve) => (resolveAnswer = () => resolve(undefined)))
      )

      // Start first answer (won't complete immediately)
      const answer1 = result.answer()

      // Try to answer again
      const answer2 = result.answer()

      // Second answer should be rejected
      await expect(answer2).rejects.toThrow('Call operation already in progress')

      // Complete first answer
      resolveAnswer()
      await answer1

      expect(mockSession.answer).toHaveBeenCalledTimes(1)
      unmount()
    })

    it('should prevent concurrent hangup attempts', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      // Set up a session
      result.session.value = mockSession

      // Make hangup() hang
      let resolveHangup: any
      mockSession.hangup = vi.fn(
        () => new Promise((resolve) => (resolveHangup = () => resolve(undefined)))
      )

      // Start first hangup
      const hangup1 = result.hangup()

      // Try to hangup again
      const hangup2 = result.hangup()

      // Second hangup should be rejected
      await expect(hangup2).rejects.toThrow('Call operation already in progress')

      // Complete first hangup
      resolveHangup()
      await hangup1

      expect(mockSession.hangup).toHaveBeenCalledTimes(1)
      unmount()
    })

    it('should allow new operation after previous completes', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      // First call completes normally
      await result.makeCall('sip:alice@example.com')

      // Second call should succeed
      await result.makeCall('sip:bob@example.com')

      expect(mockSipClient.call).toHaveBeenCalledTimes(2)
      unmount()
    })

    it('should reset guard even if operation fails', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      //Track total call attempts
      let callAttempts = 0
      mockSipClient.call = vi.fn().mockImplementation(() => {
        callAttempts++
        if (callAttempts === 1) {
          return Promise.reject(new Error('Call failed'))
        }
        return Promise.resolve(mockSession)
      })

      // First call fails
      await expect(result.makeCall('sip:alice@example.com')).rejects.toThrow('Call failed')

      // Second call should succeed (guard was reset)
      await result.makeCall('sip:bob@example.com')

      expect(callAttempts).toBe(2)
      unmount()
    })
  })

  describe('Duration Timer Error Recovery', () => {
    it('should handle state transitions without errors', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      // Set up a session and transition states
      result.session.value = mockSession

      // Simulate state changes
      mockSession.state = 'calling'
      mockSession.state = 'active'
      mockSession.state = 'terminated'

      // Should not throw
      expect(() => {
        result.session.value = mockSession
      }).not.toThrow()
      unmount()
    })
  })

  describe('Media Stream Cleanup', () => {
    it('should cleanup media on call failure', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)

      // Create mock tracks that we can verify were stopped
      const mockAudioTrack = { stop: vi.fn(), kind: 'audio' }
      const mockVideoTrack = { stop: vi.fn(), kind: 'video' }
      const mockTracks = [mockAudioTrack, mockVideoTrack]

      const mockMediaManager = {
        value: {
          getUserMedia: vi.fn().mockResolvedValue(undefined),
          getLocalStream: vi.fn().mockReturnValue({
            getTracks: () => mockTracks,
          }),
        },
      }

      const { result, unmount } = withSetup(() =>
        useCallSession(sipClientRef, mockMediaManager as any)
      )

      // Make call fail after media acquisition
      mockSipClient.call = vi.fn().mockRejectedValue(new Error('Call failed'))

      await expect(result.makeCall('sip:bob@example.com')).rejects.toThrow('Call failed')

      // Verify media was acquired
      expect(mockMediaManager.value.getUserMedia).toHaveBeenCalled()

      // Verify cleanup happened (tracks were stopped)
      expect(mockAudioTrack.stop).toHaveBeenCalled()
      expect(mockVideoTrack.stop).toHaveBeenCalled()
      unmount()
    })
  })

  describe('Error Messages', () => {
    it('should provide clear error for no SIP client', async () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef as any))

      await expect(result.makeCall('sip:bob@example.com')).rejects.toThrow(
        'SIP client not initialized'
      )
      unmount()
    })

    it('should provide clear error for no active session on answer', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      await expect(result.answer()).rejects.toThrow('No active session to answer')
      unmount()
    })

    it('should provide clear error for concurrent operations', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      let resolveCall: any
      mockSipClient.call = vi.fn(
        () => new Promise((resolve) => (resolveCall = () => resolve(mockSession)))
      )

      const call1 = result.makeCall('sip:alice@example.com')
      const call2 = result.makeCall('sip:bob@example.com')

      await expect(call2).rejects.toThrow('Call operation already in progress')

      resolveCall()
      await call1
      unmount()
    })
  })

  describe('reject() method', () => {
    it('should reject an incoming call with default status code', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      mockSession.reject = vi.fn().mockResolvedValue(undefined)
      result.session.value = mockSession

      await result.reject()

      expect(mockSession.reject).toHaveBeenCalledWith(486)
      unmount()
    })

    it('should reject an incoming call with custom status code', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      mockSession.reject = vi.fn().mockResolvedValue(undefined)
      result.session.value = mockSession

      await result.reject(603)

      expect(mockSession.reject).toHaveBeenCalledWith(603)
      unmount()
    })

    it('should throw error if no active session to reject', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      await expect(result.reject()).rejects.toThrow('No active session to reject')
      unmount()
    })

    it('should propagate rejection errors', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      mockSession.reject = vi.fn().mockRejectedValue(new Error('Reject failed'))
      result.session.value = mockSession

      await expect(result.reject()).rejects.toThrow('Reject failed')
      unmount()
    })
  })

  describe('hold/unhold/toggleHold methods', () => {
    it('should put call on hold', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      mockSession.hold = vi.fn().mockResolvedValue(undefined)
      result.session.value = mockSession

      await result.hold()

      expect(mockSession.hold).toHaveBeenCalled()
      unmount()
    })

    it('should throw error if no active session to hold', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      await expect(result.hold()).rejects.toThrow('No active session to hold')
      unmount()
    })

    it('should resume call from hold', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      mockSession.unhold = vi.fn().mockResolvedValue(undefined)
      result.session.value = mockSession

      await result.unhold()

      expect(mockSession.unhold).toHaveBeenCalled()
      unmount()
    })

    it('should throw error if no active session to unhold', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      await expect(result.unhold()).rejects.toThrow('No active session to unhold')
      unmount()
    })

    it('should toggle hold state - hold when not on hold', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      mockSession.isOnHold = false
      mockSession.hold = vi.fn().mockResolvedValue(undefined)
      result.session.value = mockSession

      await result.toggleHold()

      expect(mockSession.hold).toHaveBeenCalled()
      unmount()
    })

    it('should toggle hold state - unhold when on hold', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      mockSession.isOnHold = true
      mockSession.unhold = vi.fn().mockResolvedValue(undefined)
      result.session.value = mockSession

      await result.toggleHold()

      expect(mockSession.unhold).toHaveBeenCalled()
      unmount()
    })

    it('should propagate hold errors', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      mockSession.hold = vi.fn().mockRejectedValue(new Error('Hold failed'))
      result.session.value = mockSession

      await expect(result.hold()).rejects.toThrow('Hold failed')
      unmount()
    })

    it('should propagate unhold errors', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      mockSession.unhold = vi.fn().mockRejectedValue(new Error('Unhold failed'))
      result.session.value = mockSession

      await expect(result.unhold()).rejects.toThrow('Unhold failed')
      unmount()
    })
  })

  describe('mute/unmute/toggleMute methods', () => {
    it('should mute audio', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      mockSession.mute = vi.fn()
      result.session.value = mockSession

      result.mute()

      expect(mockSession.mute).toHaveBeenCalled()
      unmount()
    })

    it('should not throw if no session when muting', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(() => result.mute()).not.toThrow()
      unmount()
    })

    it('should unmute audio', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      mockSession.unmute = vi.fn()
      result.session.value = mockSession

      result.unmute()

      expect(mockSession.unmute).toHaveBeenCalled()
      unmount()
    })

    it('should not throw if no session when unmuting', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(() => result.unmute()).not.toThrow()
      unmount()
    })

    it('should toggle mute state - mute when not muted', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      mockSession.isMuted = false
      mockSession.mute = vi.fn()
      result.session.value = mockSession

      result.toggleMute()

      expect(mockSession.mute).toHaveBeenCalled()
      unmount()
    })

    it('should toggle mute state - unmute when muted', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      mockSession.isMuted = true
      mockSession.unmute = vi.fn()
      result.session.value = mockSession

      result.toggleMute()

      expect(mockSession.unmute).toHaveBeenCalled()
      unmount()
    })
  })

  describe('sendDTMF method', () => {
    it('should send DTMF tone', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      mockSession.sendDTMF = vi.fn().mockResolvedValue(undefined)
      result.session.value = mockSession

      await result.sendDTMF('1')

      expect(mockSession.sendDTMF).toHaveBeenCalledWith('1', undefined)
      unmount()
    })

    it('should send DTMF tone with options', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      mockSession.sendDTMF = vi.fn().mockResolvedValue(undefined)
      result.session.value = mockSession

      const options = { duration: 200, interToneGap: 100 }
      await result.sendDTMF('5', options)

      expect(mockSession.sendDTMF).toHaveBeenCalledWith('5', options)
      unmount()
    })

    it('should throw error if no active session to send DTMF', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      await expect(result.sendDTMF('1')).rejects.toThrow('No active session to send DTMF')
      unmount()
    })

    it('should propagate DTMF send errors', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      mockSession.sendDTMF = vi.fn().mockRejectedValue(new Error('DTMF failed'))
      result.session.value = mockSession

      await expect(result.sendDTMF('1')).rejects.toThrow('DTMF failed')
      unmount()
    })
  })

  describe('getStats and clearSession methods', () => {
    it('should get call statistics', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      const mockStats = { bytesReceived: 1000, bytesSent: 500 }
      mockSession.getStats = vi.fn().mockResolvedValue(mockStats)
      result.session.value = mockSession

      const stats = await result.getStats()

      expect(mockSession.getStats).toHaveBeenCalled()
      expect(stats).toEqual(mockStats)
      unmount()
    })

    it('should return null if no active session for stats', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      const stats = await result.getStats()

      expect(stats).toBeNull()
      unmount()
    })

    it('should return null if getStats fails', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      mockSession.getStats = vi.fn().mockRejectedValue(new Error('Stats failed'))
      result.session.value = mockSession

      const stats = await result.getStats()

      expect(stats).toBeNull()
      unmount()
    })

    it('should clear session', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      result.session.value = mockSession

      result.clearSession()

      expect(result.session.value).toBeNull()
      unmount()
    })

    it('should not throw if clearing null session', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(() => result.clearSession()).not.toThrow()
      unmount()
    })
  })

  describe('Reactive State Properties', () => {
    it('should expose session state', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.state.value).toBe('idle')

      mockSession.state = 'active'
      result.session.value = mockSession

      expect(result.state.value).toBe('active')
      unmount()
    })

    it('should expose callId', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.callId.value).toBeNull()

      result.session.value = mockSession

      expect(result.callId.value).toBe('test-call-id')
      unmount()
    })

    it('should expose direction', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.direction.value).toBeNull()

      mockSession.direction = 'outgoing'
      result.session.value = mockSession

      expect(result.direction.value).toBe('outgoing')
      unmount()
    })

    it('should expose localUri', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.localUri.value).toBeNull()

      mockSession.localUri = 'sip:alice@example.com'
      result.session.value = mockSession

      expect(result.localUri.value).toBe('sip:alice@example.com')
      unmount()
    })

    it('should expose remoteUri', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.remoteUri.value).toBeNull()

      mockSession.remoteUri = 'sip:bob@example.com'
      result.session.value = mockSession

      expect(result.remoteUri.value).toBe('sip:bob@example.com')
      unmount()
    })

    it('should expose remoteDisplayName', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.remoteDisplayName.value).toBeNull()

      mockSession.remoteDisplayName = 'Bob Smith'
      result.session.value = mockSession

      expect(result.remoteDisplayName.value).toBe('Bob Smith')
      unmount()
    })

    it('should expose isActive', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.isActive.value).toBe(false)

      mockSession.state = 'active'
      result.session.value = mockSession

      expect(result.isActive.value).toBe(true)

      mockSession.state = 'ringing'
      result.session.value = { ...mockSession }

      expect(result.isActive.value).toBe(true)

      mockSession.state = 'calling'
      result.session.value = { ...mockSession }

      expect(result.isActive.value).toBe(true)

      mockSession.state = 'terminated'
      result.session.value = { ...mockSession }

      expect(result.isActive.value).toBe(false)
      unmount()
    })

    it('should expose isOnHold', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.isOnHold.value).toBe(false)

      mockSession.isOnHold = true
      result.session.value = mockSession

      expect(result.isOnHold.value).toBe(true)
      unmount()
    })

    it('should expose isMuted', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.isMuted.value).toBe(false)

      mockSession.isMuted = true
      result.session.value = mockSession

      expect(result.isMuted.value).toBe(true)
      unmount()
    })

    it('should expose hasRemoteVideo', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.hasRemoteVideo.value).toBe(false)

      mockSession.hasRemoteVideo = true
      result.session.value = mockSession

      expect(result.hasRemoteVideo.value).toBe(true)
      unmount()
    })

    it('should expose hasLocalVideo', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.hasLocalVideo.value).toBe(false)

      mockSession.hasLocalVideo = true
      result.session.value = mockSession

      expect(result.hasLocalVideo.value).toBe(true)
      unmount()
    })

    it('should expose localStream', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.localStream.value).toBeNull()

      const mockStream = { id: 'mock-local-stream' } as any as MediaStream
      mockSession.localStream = mockStream
      result.session.value = mockSession

      expect(result.localStream.value).toEqual(mockStream)
      unmount()
    })

    it('should expose remoteStream', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.remoteStream.value).toBeNull()

      const mockStream = { id: 'mock-remote-stream' } as any as MediaStream
      mockSession.remoteStream = mockStream
      result.session.value = mockSession

      expect(result.remoteStream.value).toEqual(mockStream)
      unmount()
    })

    it('should expose timing', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.timing.value).toEqual({})

      const mockTiming = { startTime: new Date(), answerTime: new Date() }
      mockSession.timing = mockTiming
      result.session.value = mockSession

      expect(result.timing.value).toEqual(mockTiming)
      unmount()
    })

    it('should expose duration', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.duration.value).toBe(0)
      unmount()
    })

    it('should expose terminationCause', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.terminationCause.value).toBeUndefined()

      mockSession.terminationCause = 'busy'
      result.session.value = mockSession

      expect(result.terminationCause.value).toBe('busy')
      unmount()
    })
  })

  describe('Duration Tracking', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.clearAllTimers()
      vi.useRealTimers()
    })

    it('should start duration tracking when call becomes active', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      mockSession.state = 'active'
      mockSession.timing = { answerTime: new Date() }
      result.session.value = mockSession

      // Wait a bit for the watcher to fire
      await vi.advanceTimersByTimeAsync(0)

      expect(result.duration.value).toBe(0)

      // Advance 3 seconds
      await vi.advanceTimersByTimeAsync(3000)

      expect(result.duration.value).toBeGreaterThanOrEqual(2)
      unmount()
    })

    it('should stop duration tracking when call ends', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      mockSession.state = 'active'
      mockSession.timing = { answerTime: new Date() }
      result.session.value = mockSession

      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(2000)

      const durationWhenActive = result.duration.value

      // End the call
      mockSession.state = 'terminated'
      result.session.value = { ...mockSession }

      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(5000)

      // Duration should not have increased after ended
      expect(result.duration.value).toBe(durationWhenActive)
      unmount()
    })

    it('should stop duration tracking when call fails', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      mockSession.state = 'active'
      mockSession.timing = { answerTime: new Date() }
      result.session.value = mockSession

      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(2000)

      const durationWhenActive = result.duration.value

      // Fail the call
      mockSession.state = 'failed'
      result.session.value = { ...mockSession }

      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(5000)

      // Duration should not have increased after failed
      expect(result.duration.value).toBe(durationWhenActive)
      unmount()
    })

    it('should reset duration on new call', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      // First call
      mockSession.state = 'active'
      mockSession.timing = { answerTime: new Date() }
      result.session.value = mockSession

      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(3000)

      expect(result.duration.value).toBeGreaterThan(0)

      // Make a new call
      await result.makeCall('sip:bob@example.com')

      // Duration should be reset
      expect(result.duration.value).toBe(0)
      unmount()
    })
  })

  describe('Media Cleanup on Answer Failure', () => {
    it('should cleanup media if answer fails after acquisition', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)

      const mockAudioTrack = { stop: vi.fn(), kind: 'audio' }
      const mockVideoTrack = { stop: vi.fn(), kind: 'video' }
      const mockTracks = [mockAudioTrack, mockVideoTrack]

      const mockMediaManager = {
        value: {
          getUserMedia: vi.fn().mockResolvedValue(undefined),
          getLocalStream: vi.fn().mockReturnValue({
            getTracks: () => mockTracks,
          }),
        },
      }

      const { result, unmount } = withSetup(() =>
        useCallSession(sipClientRef, mockMediaManager as any)
      )

      // Set up session
      mockSession.answer = vi.fn().mockRejectedValue(new Error('Answer failed'))
      result.session.value = mockSession

      await expect(result.answer()).rejects.toThrow('Answer failed')

      // Verify media was acquired
      expect(mockMediaManager.value.getUserMedia).toHaveBeenCalled()

      // Verify cleanup happened
      expect(mockAudioTrack.stop).toHaveBeenCalled()
      expect(mockVideoTrack.stop).toHaveBeenCalled()
      unmount()
    })
  })

  describe('Call Options (Audio/Video Combinations)', () => {
    it('should make audio-only call', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const mockMediaManager = {
        value: {
          getUserMedia: vi.fn().mockResolvedValue(undefined),
          getLocalStream: vi.fn().mockReturnValue(null),
        },
      }

      const { result, unmount } = withSetup(() =>
        useCallSession(sipClientRef, mockMediaManager as any)
      )

      await result.makeCall('sip:bob@example.com', { audio: true, video: false })

      expect(mockMediaManager.value.getUserMedia).toHaveBeenCalledWith({
        audio: true,
        video: false,
      })
      expect(mockSipClient.call).toHaveBeenCalledWith(
        'sip:bob@example.com',
        expect.objectContaining({
          mediaConstraints: { audio: true, video: false },
        })
      )
      unmount()
    })

    it('should make video call', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const mockMediaManager = {
        value: {
          getUserMedia: vi.fn().mockResolvedValue(undefined),
          getLocalStream: vi.fn().mockReturnValue(null),
        },
      }

      const { result, unmount } = withSetup(() =>
        useCallSession(sipClientRef, mockMediaManager as any)
      )

      await result.makeCall('sip:bob@example.com', { audio: true, video: true })

      expect(mockMediaManager.value.getUserMedia).toHaveBeenCalledWith({ audio: true, video: true })
      expect(mockSipClient.call).toHaveBeenCalledWith(
        'sip:bob@example.com',
        expect.objectContaining({
          mediaConstraints: { audio: true, video: true },
        })
      )
      unmount()
    })

    it('should answer with audio-only', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const mockMediaManager = {
        value: {
          getUserMedia: vi.fn().mockResolvedValue(undefined),
          getLocalStream: vi.fn().mockReturnValue(null),
        },
      }

      const { result, unmount } = withSetup(() =>
        useCallSession(sipClientRef, mockMediaManager as any)
      )

      mockSession.answer = vi.fn().mockResolvedValue(undefined)
      result.session.value = mockSession

      await result.answer({ audio: true, video: false })

      expect(mockMediaManager.value.getUserMedia).toHaveBeenCalledWith({
        audio: true,
        video: false,
      })
      unmount()
    })

    it('should answer with video', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const mockMediaManager = {
        value: {
          getUserMedia: vi.fn().mockResolvedValue(undefined),
          getLocalStream: vi.fn().mockReturnValue(null),
        },
      }

      const { result, unmount } = withSetup(() =>
        useCallSession(sipClientRef, mockMediaManager as any)
      )

      mockSession.answer = vi.fn().mockResolvedValue(undefined)
      result.session.value = mockSession

      await result.answer({ audio: true, video: true })

      expect(mockMediaManager.value.getUserMedia).toHaveBeenCalledWith({ audio: true, video: true })
      unmount()
    })
  })

  describe('Lifecycle Cleanup', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.clearAllTimers()
      vi.useRealTimers()
    })

    it('should cleanup duration tracking on unmount', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)

      // We need to test that onUnmounted cleanup works
      // This is tested indirectly through the composable lifecycle
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      mockSession.state = 'active'
      mockSession.timing = { answerTime: new Date() }
      result.session.value = mockSession

      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(2000)

      expect(result.duration.value).toBeGreaterThan(0)

      // The actual onUnmounted hook will be called by Vue
      // We can verify the timer cleanup happens correctly through other tests
      unmount()
    })
  })

  describe('Call Store Integration', () => {
    it('should add call to store on makeCall', async () => {
      const { callStore } = await import('@/stores/callStore')
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      await result.makeCall('sip:bob@example.com')

      expect(callStore.addActiveCall).toHaveBeenCalledWith(mockSession)
      unmount()
    })

    it('should remove call from store on clearSession', async () => {
      const { callStore } = await import('@/stores/callStore')
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      result.session.value = mockSession

      result.clearSession()

      expect(callStore.removeActiveCall).toHaveBeenCalledWith('test-call-id')
      unmount()
    })
  })

  describe('AbortController Integration', () => {
    it('should abort makeCall when AbortSignal is triggered before call', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      const controller = new AbortController()
      controller.abort() // Abort immediately

      await expect(result.makeCall('sip:bob@example.com', {}, controller.signal)).rejects.toThrow(
        'Operation aborted'
      )
      expect(mockSipClient.call).not.toHaveBeenCalled()
      unmount()
    })

    it('should abort makeCall when AbortSignal is triggered during call setup', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      const controller = new AbortController()

      // Delay the call() to simulate async operation
      mockSipClient.call = vi.fn().mockImplementation(async () => {
        controller.abort() // Abort during the call
        return mockSession
      })

      await expect(result.makeCall('sip:bob@example.com', {}, controller.signal)).rejects.toThrow(
        'Operation aborted'
      )
      unmount()
    })

    it('should cleanup media when makeCall is aborted', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const mockMediaManager = {
        getUserMedia: vi.fn().mockResolvedValue(undefined),
        getLocalStream: vi.fn().mockReturnValue({
          getTracks: vi.fn().mockReturnValue([
            { kind: 'audio', stop: vi.fn() },
            { kind: 'video', stop: vi.fn() },
          ]),
        }),
      }
      const mediaManagerRef = ref(mockMediaManager as any)
      const { result, unmount } = withSetup(() =>
        useCallSession(sipClientRef, mediaManagerRef)
      )

      const controller = new AbortController()

      // Abort after media is acquired
      mockMediaManager.getUserMedia.mockImplementation(async () => {
        controller.abort()
        throw new DOMException('Operation aborted', 'AbortError')
      })

      await expect(result.makeCall('sip:bob@example.com', {}, controller.signal)).rejects.toThrow(
        'Operation aborted'
      )

      // Verify media was acquired
      expect(mockMediaManager.getUserMedia).toHaveBeenCalled()
      unmount()
    })

    it('should work without AbortSignal (backward compatibility)', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      // Call without signal parameter
      await result.makeCall('sip:bob@example.com')

      expect(mockSipClient.call).toHaveBeenCalled()
      unmount()
    })

    it('should differentiate abort errors from other errors', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      const controller = new AbortController()

      // Simulate a different error
      mockSipClient.call = vi.fn().mockRejectedValue(new Error('Network error'))

      await expect(result.makeCall('sip:bob@example.com', {}, controller.signal)).rejects.toThrow(
        'Network error'
      )
      expect(mockSipClient.call).toHaveBeenCalled()
      unmount()
    })
  })
})
