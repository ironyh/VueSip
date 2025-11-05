/**
 * CallSession unit tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
// Note: Test mocks use 'any' for flexibility and non-null assertions for test setup

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CallSession, createCallSession } from '@/core/CallSession'
import { EventBus } from '@/core/EventBus'
import { CallDirection } from '@/types/call.types'

// Mock RTCSession
class MockRTCSession {
  id = 'test-session-id'
  remote_identity = {
    uri: { toString: () => 'sip:alice@example.com' },
    display_name: 'Alice',
  }
  connection: any = null

  private listeners: Map<string, ((...args: any[]) => void)[]> = new Map()

  on(event: string, handler: (...args: any[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.push(handler)
    }
  }

  once(event: string, handler: (...args: any[]) => void) {
    const wrapper = (...args: any[]) => {
      handler(...args)
      this.off(event, wrapper)
    }
    this.on(event, wrapper)
  }

  off(event: string, handler: (...args: any[]) => void) {
    const handlers = this.listeners.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  removeAllListeners() {
    this.listeners.clear()
  }

  emit(event: string, data?: any) {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.forEach((handler) => handler(data))
    }
  }

  answer = vi.fn()
  terminate = vi.fn()
  hold = vi.fn()
  unhold = vi.fn()
  mute = vi.fn()
  unmute = vi.fn()
  sendDTMF = vi.fn()
}

// Mock MediaStreamTrack
class MockMediaStreamTrack {
  kind: string
  private stopped = false

  constructor(kind: string = 'audio') {
    this.kind = kind
  }

  stop() {
    this.stopped = true
  }

  isStopped() {
    return this.stopped
  }
}

// Mock MediaStream
class MockMediaStream {
  private tracks: any[] = []

  constructor(tracks: any[] = []) {
    this.tracks = tracks
  }

  addTrack(track: any) {
    this.tracks.push(track)
  }

  getTracks() {
    return this.tracks
  }

  getAudioTracks() {
    return this.tracks.filter((t) => t.kind === 'audio')
  }

  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === 'video')
  }
}

// Setup global mocks
;(global as any).MediaStream = MockMediaStream

// Mock RTCPeerConnection
class MockRTCPeerConnection {
  ontrack: ((event: any) => void) | null = null

  getSenders() {
    return []
  }

  async getStats() {
    return new Map([
      [
        'audio-inbound',
        {
          type: 'inbound-rtp',
          kind: 'audio',
          bytesReceived: 1000,
          packetsReceived: 100,
          packetsLost: 2,
          jitter: 0.01,
        },
      ],
      [
        'audio-outbound',
        {
          type: 'outbound-rtp',
          kind: 'audio',
          bytesSent: 1500,
          packetsSent: 150,
        },
      ],
      [
        'candidate-pair',
        {
          type: 'candidate-pair',
          state: 'succeeded',
          currentRoundTripTime: 0.05,
          availableOutgoingBitrate: 1000000,
          availableIncomingBitrate: 1000000,
        },
      ],
    ])
  }
}

describe('CallSession', () => {
  let eventBus: EventBus
  let mockRtcSession: MockRTCSession

  beforeEach(() => {
    eventBus = new EventBus()
    mockRtcSession = new MockRTCSession()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Constructor', () => {
    it('should create a call session with correct properties', () => {
      const session = new CallSession({
        id: 'test-call-1',
        direction: 'outgoing' as CallDirection,
        localUri: 'sip:bob@example.com',
        remoteUri: 'sip:alice@example.com',
        remoteDisplayName: 'Alice',
        rtcSession: mockRtcSession,
        eventBus,
        data: { custom: 'value' },
      })

      expect(session.id).toBe('test-call-1')
      expect(session.direction).toBe('outgoing')
      expect(session.localUri).toBe('sip:bob@example.com')
      expect(session.remoteUri).toBe('sip:alice@example.com')
      expect(session.remoteDisplayName).toBe('Alice')
      expect(session.state).toBe('idle')
      expect(session.isOnHold).toBe(false)
      expect(session.isMuted).toBe(false)
      expect(session.data).toEqual({ custom: 'value' })
    })

    it('should initialize timing with start time', () => {
      const beforeTime = new Date()
      const session = new CallSession({
        id: 'test-call-1',
        direction: 'outgoing' as CallDirection,
        localUri: 'sip:bob@example.com',
        remoteUri: 'sip:alice@example.com',
        rtcSession: mockRtcSession,
        eventBus,
      })
      const afterTime = new Date()

      expect(session.timing.startTime).toBeDefined()
      expect(session.timing.startTime!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
      expect(session.timing.startTime!.getTime()).toBeLessThanOrEqual(afterTime.getTime())
    })

    it('should setup event handlers on RTCSession', () => {
      const onSpy = vi.spyOn(mockRtcSession, 'on')

      new CallSession({
        id: 'test-call-1',
        direction: 'outgoing' as CallDirection,
        localUri: 'sip:bob@example.com',
        remoteUri: 'sip:alice@example.com',
        rtcSession: mockRtcSession,
        eventBus,
      })

      expect(onSpy).toHaveBeenCalledWith('progress', expect.any(Function))
      expect(onSpy).toHaveBeenCalledWith('accepted', expect.any(Function))
      expect(onSpy).toHaveBeenCalledWith('confirmed', expect.any(Function))
      expect(onSpy).toHaveBeenCalledWith('ended', expect.any(Function))
      expect(onSpy).toHaveBeenCalledWith('failed', expect.any(Function))
      expect(onSpy).toHaveBeenCalledWith('hold', expect.any(Function))
      expect(onSpy).toHaveBeenCalledWith('unhold', expect.any(Function))
    })
  })

  describe('toInterface', () => {
    it('should return call session as interface', () => {
      const session = new CallSession({
        id: 'test-call-1',
        direction: 'outgoing' as CallDirection,
        localUri: 'sip:bob@example.com',
        remoteUri: 'sip:alice@example.com',
        remoteDisplayName: 'Alice',
        rtcSession: mockRtcSession,
        eventBus,
      })

      const iface = session.toInterface()

      expect(iface.id).toBe('test-call-1')
      expect(iface.direction).toBe('outgoing')
      expect(iface.localUri).toBe('sip:bob@example.com')
      expect(iface.remoteUri).toBe('sip:alice@example.com')
      expect(iface.remoteDisplayName).toBe('Alice')
      expect(iface.state).toBe('idle')
      expect(iface.isOnHold).toBe(false)
      expect(iface.isMuted).toBe(false)
    })
  })

  describe('Incoming Call Flow', () => {
    let session: CallSession

    beforeEach(() => {
      session = new CallSession({
        id: 'test-call-1',
        direction: 'incoming' as CallDirection,
        localUri: 'sip:bob@example.com',
        remoteUri: 'sip:alice@example.com',
        rtcSession: mockRtcSession,
        eventBus,
      })

      // Set initial state to ringing
      ;(session as any)._state = 'ringing'
    })

    it('should answer incoming call', async () => {
      const answerPromise = session.answer()

      expect(mockRtcSession.answer).toHaveBeenCalled()
      expect(session.state).toBe('answering')

      await answerPromise
    })

    it('should answer with custom options', async () => {
      const options = {
        mediaConstraints: { audio: true, video: false },
        extraHeaders: ['X-Custom: value'],
      }

      await session.answer(options)

      expect(mockRtcSession.answer).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaConstraints: options.mediaConstraints,
          extraHeaders: options.extraHeaders,
        })
      )
    })

    it('should reject answer for outgoing call', async () => {
      const outgoingSession = new CallSession({
        id: 'test-call-2',
        direction: 'outgoing' as CallDirection,
        localUri: 'sip:bob@example.com',
        remoteUri: 'sip:alice@example.com',
        rtcSession: mockRtcSession,
        eventBus,
      })

      await expect(outgoingSession.answer()).rejects.toThrow('Cannot answer outgoing call')
    })

    it('should reject answer if not in ringing state', async () => {
      ;(session as any)._state = 'active'

      await expect(session.answer()).rejects.toThrow('Cannot answer call in state: active')
    })

    it('should transition to active state on confirmed', () => {
      const eventSpy = vi.fn()
      eventBus.on('call:confirmed', eventSpy)

      mockRtcSession.emit('confirmed', {})

      expect(session.state).toBe('active')
      expect(eventSpy).toHaveBeenCalled()
    })

    it('should emit accepted event on 200 OK', () => {
      const eventSpy = vi.fn()
      eventBus.on('call:accepted', eventSpy)

      mockRtcSession.emit('accepted', {
        response: { status_code: 200 },
      })

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          responseCode: 200,
        })
      )
    })
  })

  describe('Outgoing Call Flow', () => {
    let session: CallSession

    beforeEach(() => {
      session = new CallSession({
        id: 'test-call-1',
        direction: 'outgoing' as CallDirection,
        localUri: 'sip:bob@example.com',
        remoteUri: 'sip:alice@example.com',
        rtcSession: mockRtcSession,
        eventBus,
      })
    })

    it('should transition to ringing on 180 response', () => {
      const eventSpy = vi.fn()
      eventBus.on('call:progress', eventSpy)

      mockRtcSession.emit('progress', {
        response: { status_code: 180, reason_phrase: 'Ringing' },
      })

      expect(session.state).toBe('ringing')
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          responseCode: 180,
          reasonPhrase: 'Ringing',
        })
      )
    })

    it('should transition to early_media on 183 response', () => {
      mockRtcSession.emit('progress', {
        response: { status_code: 183, reason_phrase: 'Session Progress' },
      })

      expect(session.state).toBe('early_media')
    })

    it('should transition to active on confirmed', () => {
      mockRtcSession.emit('confirmed', {})

      expect(session.state).toBe('active')
    })

    it('should record timing on call flow', () => {
      // Accepted (200 OK)
      const beforeAnswer = new Date()
      mockRtcSession.emit('accepted', {
        response: { status_code: 200 },
      })
      const afterAnswer = new Date()

      expect(session.timing.answerTime).toBeDefined()
      expect(session.timing.answerTime!.getTime()).toBeGreaterThanOrEqual(beforeAnswer.getTime())
      expect(session.timing.answerTime!.getTime()).toBeLessThanOrEqual(afterAnswer.getTime())

      // Confirmed (ACK)
      mockRtcSession.emit('confirmed', {})

      expect(session.state).toBe('active')
    })
  })

  describe('Call Termination Flow', () => {
    let session: CallSession

    beforeEach(() => {
      session = new CallSession({
        id: 'test-call-1',
        direction: 'outgoing' as CallDirection,
        localUri: 'sip:bob@example.com',
        remoteUri: 'sip:alice@example.com',
        rtcSession: mockRtcSession,
        eventBus,
      })

      // Set to active state
      ;(session as any)._state = 'active'
    })

    it('should terminate call', async () => {
      await session.hangup()

      expect(mockRtcSession.terminate).toHaveBeenCalled()
      expect(session.state).toBe('terminating')
    })

    it('should not terminate already terminated call', async () => {
      ;(session as any)._state = 'terminated'

      await session.hangup()

      expect(mockRtcSession.terminate).not.toHaveBeenCalled()
    })

    it('should clean up on ended event', () => {
      // Add timing
      ;(session as any)._timing.answerTime = new Date(Date.now() - 30000)

      const eventSpy = vi.fn()
      eventBus.on('call:ended', eventSpy)

      mockRtcSession.emit('ended', {
        cause: 'BYE',
        originator: 'local',
      })

      expect(session.state).toBe('terminated')
      expect(session.timing.endTime).toBeDefined()
      expect(session.timing.duration).toBeDefined()
      expect(session.timing.duration).toBeGreaterThan(0)
      expect(session.terminationCause).toBe('bye')
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          cause: 'bye',
          originator: 'local',
        })
      )
    })

    it('should handle failed event', () => {
      const eventSpy = vi.fn()
      eventBus.on('call:failed', eventSpy)

      mockRtcSession.emit('failed', {
        cause: 'Busy',
        response: { status_code: 486, reason_phrase: 'Busy Here' },
        message: 'Call failed',
      })

      expect(session.state).toBe('failed')
      expect(session.terminationCause).toBe('busy')
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          cause: 'busy',
          responseCode: 486,
          reasonPhrase: 'Busy Here',
          message: 'Call failed',
        })
      )
    })

    it('should calculate ring duration', () => {
      const startTime = new Date(Date.now() - 60000) // 60 seconds ago
      const answerTime = new Date(Date.now() - 30000) // 30 seconds ago
      ;(session as any)._timing.startTime = startTime
      ;(session as any)._timing.answerTime = answerTime

      mockRtcSession.emit('ended', {
        cause: 'BYE',
        originator: 'local',
      })

      expect(session.timing.ringDuration).toBeDefined()
      expect(session.timing.ringDuration).toBeGreaterThanOrEqual(29)
      expect(session.timing.ringDuration).toBeLessThanOrEqual(31)
    })
  })

  describe('Call Controls', () => {
    let session: CallSession

    beforeEach(() => {
      session = new CallSession({
        id: 'test-call-1',
        direction: 'outgoing' as CallDirection,
        localUri: 'sip:bob@example.com',
        remoteUri: 'sip:alice@example.com',
        rtcSession: mockRtcSession,
        eventBus,
      })

      // Set to active state
      ;(session as any)._state = 'active'
    })

    describe('Hold/Unhold', () => {
      it('should put call on hold', async () => {
        await session.hold()

        expect(mockRtcSession.hold).toHaveBeenCalled()
      })

      it('should resume call from hold', async () => {
        ;(session as any)._isOnHold = true

        await session.unhold()

        expect(mockRtcSession.unhold).toHaveBeenCalled()
      })

      it('should reject hold if not in active state', async () => {
        ;(session as any)._state = 'ringing'

        await expect(session.hold()).rejects.toThrow('Cannot hold call in state: ringing')
      })

      it('should update state on hold event (local)', () => {
        mockRtcSession.emit('hold', { originator: 'local' })

        expect(session.isOnHold).toBe(true)
        expect(session.state).toBe('held')
      })

      it('should update state on hold event (remote)', () => {
        mockRtcSession.emit('hold', { originator: 'remote' })

        expect(session.state).toBe('remote_held')
      })

      it('should update state on unhold event', () => {
        ;(session as any)._isOnHold = true
        ;(session as any)._state = 'held'

        mockRtcSession.emit('unhold', { originator: 'local' })

        expect(session.isOnHold).toBe(false)
        expect(session.state).toBe('active')
      })
    })

    describe('Mute/Unmute', () => {
      it('should mute call', () => {
        const eventSpy = vi.fn()
        eventBus.on('call:muted', eventSpy)

        session.mute()

        expect(mockRtcSession.mute).toHaveBeenCalledWith({ audio: true })
        expect(session.isMuted).toBe(true)
        expect(eventSpy).toHaveBeenCalled()
      })

      it('should unmute call', () => {
        ;(session as any)._isMuted = true

        const eventSpy = vi.fn()
        eventBus.on('call:unmuted', eventSpy)

        session.unmute()

        expect(mockRtcSession.unmute).toHaveBeenCalledWith({ audio: true })
        expect(session.isMuted).toBe(false)
        expect(eventSpy).toHaveBeenCalled()
      })

      it('should not mute if already muted', () => {
        ;(session as any)._isMuted = true

        session.mute()

        // Should still call the method but log a warning
        expect(mockRtcSession.mute).not.toHaveBeenCalled()
      })

      it('should not unmute if not muted', () => {
        session.unmute()

        expect(mockRtcSession.unmute).not.toHaveBeenCalled()
      })
    })

    describe('DTMF', () => {
      it('should send DTMF tone', () => {
        const eventSpy = vi.fn()
        eventBus.on('call:dtmf_sent', eventSpy)

        session.sendDTMF('1')

        // New implementation adds default duration
        expect(mockRtcSession.sendDTMF).toHaveBeenCalledWith('1', {
          duration: 100,
        })
        expect(eventSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            tone: '1',
          })
        )
      })

      it('should send DTMF with options', () => {
        session.sendDTMF('2', {
          duration: 200,
          interToneGap: 100,
        })

        // interToneGap is not passed to JsSIP, only used for queue timing
        expect(mockRtcSession.sendDTMF).toHaveBeenCalledWith('2', {
          duration: 200,
        })
      })

      it('should send DTMF via INFO', () => {
        session.sendDTMF('3', {
          transportType: 'INFO',
        })

        // New implementation adds default duration
        expect(mockRtcSession.sendDTMF).toHaveBeenCalledWith('3', {
          duration: 100,
          transportType: 'INFO',
        })
      })

      it('should reject DTMF if not in active state', () => {
        ;(session as any)._state = 'ringing'

        expect(() => session.sendDTMF('1')).toThrow('Cannot send DTMF in state: ringing')
      })
    })
  })

  describe('Media Streams', () => {
    let session: CallSession
    let mockPeerConnection: MockRTCPeerConnection

    beforeEach(() => {
      session = new CallSession({
        id: 'test-call-1',
        direction: 'outgoing' as CallDirection,
        localUri: 'sip:bob@example.com',
        remoteUri: 'sip:alice@example.com',
        rtcSession: mockRtcSession,
        eventBus,
      })

      mockPeerConnection = new MockRTCPeerConnection()
    })

    it('should handle remote track event', () => {
      const eventSpy = vi.fn()
      eventBus.on('call:stream_added', eventSpy)

      mockRtcSession.emit('peerconnection', {
        peerconnection: mockPeerConnection,
      })

      // Simulate receiving remote track
      const track = new MockMediaStreamTrack('audio')

      mockPeerConnection.ontrack?.({
        track,
        streams: [],
      } as any)

      expect(session.remoteStream).toBeDefined()
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'remote',
        })
      )
    })

    it('should detect remote video', () => {
      mockRtcSession.emit('peerconnection', {
        peerconnection: mockPeerConnection,
      })

      const track = new MockMediaStreamTrack('video')

      mockPeerConnection.ontrack?.({
        track,
        streams: [],
      } as any)

      expect(session.hasRemoteVideo).toBe(true)
    })
  })

  describe('Statistics', () => {
    let session: CallSession

    beforeEach(() => {
      session = new CallSession({
        id: 'test-call-1',
        direction: 'outgoing' as CallDirection,
        localUri: 'sip:bob@example.com',
        remoteUri: 'sip:alice@example.com',
        rtcSession: mockRtcSession,
        eventBus,
      })

      // Mock peer connection
      mockRtcSession.connection = new MockRTCPeerConnection()
    })

    it('should get call statistics', async () => {
      const stats = await session.getStats()

      expect(stats.audio).toBeDefined()
      expect(stats.audio?.bytesReceived).toBe(1000)
      expect(stats.audio?.packetsReceived).toBe(100)
      expect(stats.audio?.packetsLost).toBe(2)
      expect(stats.audio?.bytesSent).toBe(1500)
      expect(stats.audio?.packetsSent).toBe(150)

      expect(stats.network).toBeDefined()
      expect(stats.network?.currentRoundTripTime).toBe(0.05)
      expect(stats.network?.availableOutgoingBitrate).toBe(1000000)
    })

    it('should throw error if no peer connection', async () => {
      mockRtcSession.connection = null

      await expect(session.getStats()).rejects.toThrow('No peer connection available')
    })
  })

  describe('State Management', () => {
    let session: CallSession

    beforeEach(() => {
      session = new CallSession({
        id: 'test-call-1',
        direction: 'outgoing' as CallDirection,
        localUri: 'sip:bob@example.com',
        remoteUri: 'sip:alice@example.com',
        rtcSession: mockRtcSession,
        eventBus,
      })
    })

    it('should emit state change event', () => {
      const eventSpy = vi.fn()
      eventBus.on('call:state_changed', eventSpy)

      mockRtcSession.emit('confirmed', {})

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          previousState: 'idle',
          currentState: 'active',
        })
      )
    })

    it('should not emit state change if state is the same', () => {
      const eventSpy = vi.fn()
      eventBus.on('call:state_changed', eventSpy)
      ;(session as any)._state = 'active'

      mockRtcSession.emit('confirmed', {})

      expect(eventSpy).not.toHaveBeenCalled()
    })
  })

  describe('Termination Causes', () => {
    let session: CallSession

    beforeEach(() => {
      session = new CallSession({
        id: 'test-call-1',
        direction: 'outgoing' as CallDirection,
        localUri: 'sip:bob@example.com',
        remoteUri: 'sip:alice@example.com',
        rtcSession: mockRtcSession,
        eventBus,
      })
    })

    it('should map Canceled to canceled', () => {
      mockRtcSession.emit('failed', { cause: 'Canceled' })
      expect(session.terminationCause).toBe('canceled')
    })

    it('should map Rejected to rejected', () => {
      mockRtcSession.emit('failed', { cause: 'Rejected' })
      expect(session.terminationCause).toBe('rejected')
    })

    it('should map No Answer to no_answer', () => {
      mockRtcSession.emit('failed', { cause: 'No Answer' })
      expect(session.terminationCause).toBe('no_answer')
    })

    it('should map Busy to busy', () => {
      mockRtcSession.emit('failed', { cause: 'Busy' })
      expect(session.terminationCause).toBe('busy')
    })

    it('should map BYE to bye', () => {
      mockRtcSession.emit('ended', { cause: 'BYE' })
      expect(session.terminationCause).toBe('bye')
    })

    it('should map unknown cause to other', () => {
      mockRtcSession.emit('failed', { cause: 'Unknown Cause' })
      expect(session.terminationCause).toBe('other')
    })
  })

  describe('Cleanup', () => {
    let session: CallSession

    beforeEach(() => {
      session = new CallSession({
        id: 'test-call-1',
        direction: 'outgoing' as CallDirection,
        localUri: 'sip:bob@example.com',
        remoteUri: 'sip:alice@example.com',
        rtcSession: mockRtcSession,
        eventBus,
      })
    })

    it('should stop media tracks on cleanup', () => {
      const localTrack = new MockMediaStreamTrack('audio')
      const remoteTrack = new MockMediaStreamTrack('audio')

      const localStopSpy = vi.spyOn(localTrack, 'stop')
      const remoteStopSpy = vi.spyOn(remoteTrack, 'stop')

      ;(session as any)._localStream = new MediaStream([localTrack as any])
      ;(session as any)._remoteStream = new MediaStream([remoteTrack as any])

      mockRtcSession.emit('ended', { cause: 'BYE' })

      expect(localStopSpy).toHaveBeenCalled()
      expect(remoteStopSpy).toHaveBeenCalled()
    })

    it('should remove all RTCSession listeners on cleanup', () => {
      const removeAllListenersSpy = vi.spyOn(mockRtcSession, 'removeAllListeners')

      mockRtcSession.emit('ended', { cause: 'BYE' })

      expect(removeAllListenersSpy).toHaveBeenCalled()
    })
  })

  describe('Destroy', () => {
    it('should terminate call if not already terminated', async () => {
      const session = new CallSession({
        id: 'test-call-1',
        direction: 'outgoing' as CallDirection,
        localUri: 'sip:bob@example.com',
        remoteUri: 'sip:alice@example.com',
        rtcSession: mockRtcSession,
        eventBus,
      })

      ;(session as any)._state = 'active'

      session.destroy()

      expect(mockRtcSession.terminate).toHaveBeenCalled()
    })

    it('should not terminate if already terminated', () => {
      const session = new CallSession({
        id: 'test-call-1',
        direction: 'outgoing' as CallDirection,
        localUri: 'sip:bob@example.com',
        remoteUri: 'sip:alice@example.com',
        rtcSession: mockRtcSession,
        eventBus,
      })

      ;(session as any)._state = 'terminated'

      session.destroy()

      expect(mockRtcSession.terminate).not.toHaveBeenCalled()
    })
  })

  describe('createCallSession', () => {
    it('should create incoming call session', () => {
      const session = createCallSession(
        mockRtcSession,
        'incoming' as CallDirection,
        'sip:bob@example.com',
        eventBus
      )

      expect(session.id).toBe('test-session-id')
      expect(session.direction).toBe('incoming')
      expect(session.remoteUri).toBe('sip:alice@example.com')
      expect(session.remoteDisplayName).toBe('Alice')
      expect(session.state).toBe('ringing')
    })

    it('should create outgoing call session', () => {
      const session = createCallSession(
        mockRtcSession,
        'outgoing' as CallDirection,
        'sip:bob@example.com',
        eventBus
      )

      expect(session.direction).toBe('outgoing')
      expect(session.state).toBe('calling')
    })

    it('should handle missing remote identity', () => {
      mockRtcSession.remote_identity = null

      const session = createCallSession(
        mockRtcSession,
        'incoming' as CallDirection,
        'sip:bob@example.com',
        eventBus
      )

      expect(session.remoteUri).toBe('sip:unknown@unknown')
      expect(session.remoteDisplayName).toBeUndefined()
    })

    it('should include custom data', () => {
      const session = createCallSession(
        mockRtcSession,
        'incoming' as CallDirection,
        'sip:bob@example.com',
        eventBus,
        { custom: 'value' }
      )

      expect(session.data).toEqual({ custom: 'value' })
    })
  })
})
