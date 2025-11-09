/**
 * Test to verify timeout race condition fixes in MockSipServer
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockSipServer } from './MockSipServer'
import type { MockSipServer } from './MockSipServer'

describe('MockSipServer Timeout Race Condition Fixes', () => {
  let server: MockSipServer

  beforeEach(() => {
    vi.useFakeTimers()
    server = createMockSipServer({ networkLatency: 100 })
  })

  afterEach(() => {
    server.destroy()
    vi.useRealTimers()
  })

  describe('Session Timeout Management', () => {
    it('should not execute session timeouts after session is terminated', () => {
      const session = server.simulateIncomingCall('sip:alice@example.com', 'sip:bob@example.com')
      const progressHandler = vi.fn()
      session.on('progress', progressHandler)

      // Schedule progress event
      server.simulateCallProgress(session)

      // Terminate session immediately (before timeout fires)
      server.terminateSession(session.id)

      // Advance time to when timeout would have fired
      vi.advanceTimersByTime(100)

      // Progress handler should NOT have been called because session was terminated
      expect(progressHandler).not.toHaveBeenCalled()
    })

    it('should not execute timeouts after server is destroyed', () => {
      const session = server.simulateIncomingCall('sip:alice@example.com', 'sip:bob@example.com')
      const progressHandler = vi.fn()
      session.on('progress', progressHandler)

      // Schedule progress event
      server.simulateCallProgress(session)

      // Destroy server immediately (before timeout fires)
      server.destroy()

      // Advance time to when timeout would have fired
      vi.advanceTimersByTime(100)

      // Progress handler should NOT have been called because server was destroyed
      expect(progressHandler).not.toHaveBeenCalled()
    })

    it('should clear all session timeouts when call ends', () => {
      const session = server.simulateIncomingCall('sip:alice@example.com', 'sip:bob@example.com')
      const progressHandler = vi.fn()
      const acceptedHandler = vi.fn()
      const endedHandler = vi.fn()

      session.on('progress', progressHandler)
      session.on('accepted', acceptedHandler)
      session.on('ended', endedHandler)

      // Schedule multiple events for this session
      server.simulateCallProgress(session)
      server.simulateCallAccepted(session)

      // End the call before any timeouts fire
      server.simulateCallEnded(session)

      // Only the ended timeout should fire
      vi.advanceTimersByTime(100)
      expect(progressHandler).not.toHaveBeenCalled()
      expect(acceptedHandler).not.toHaveBeenCalled()
      expect(endedHandler).toHaveBeenCalledTimes(1)
    })

    it('should clear all timeouts when clearSessions is called', () => {
      const session1 = server.simulateIncomingCall('sip:alice@example.com', 'sip:bob@example.com')
      const session2 = server.simulateIncomingCall(
        'sip:charlie@example.com',
        'sip:david@example.com'
      )

      const handler1 = vi.fn()
      const handler2 = vi.fn()

      session1.on('progress', handler1)
      session2.on('progress', handler2)

      server.simulateCallProgress(session1)
      server.simulateCallProgress(session2)

      // Clear all sessions before timeouts fire
      server.clearSessions()

      // Advance time
      vi.advanceTimersByTime(100)

      // No handlers should have been called
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })

    it('should allow server reuse after reset', () => {
      const session = server.simulateIncomingCall('sip:alice@example.com', 'sip:bob@example.com')
      const handler = vi.fn()
      session.on('progress', handler)

      server.simulateCallProgress(session)

      // Reset server
      server.reset()

      // Advance time - old timeouts should not fire
      vi.advanceTimersByTime(100)
      expect(handler).not.toHaveBeenCalled()

      // Server should be usable again
      const newSession = server.simulateIncomingCall('sip:alice@example.com', 'sip:bob@example.com')
      const newHandler = vi.fn()
      newSession.on('progress', newHandler)

      server.simulateCallProgress(newSession)
      vi.advanceTimersByTime(100)

      // New handler should be called
      expect(newHandler).toHaveBeenCalledTimes(1)
    })
  })

  describe('Multiple Sessions Isolation', () => {
    it('should only clear timeouts for terminated session', () => {
      const session1 = server.simulateIncomingCall('sip:alice@example.com', 'sip:bob@example.com')
      const session2 = server.simulateIncomingCall(
        'sip:charlie@example.com',
        'sip:david@example.com'
      )

      const handler1 = vi.fn()
      const handler2 = vi.fn()

      session1.on('progress', handler1)
      session2.on('progress', handler2)

      server.simulateCallProgress(session1)
      server.simulateCallProgress(session2)

      // Terminate only session1
      server.terminateSession(session1.id)

      // Advance time
      vi.advanceTimersByTime(100)

      // Session1 handler should not be called, but session2 should
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalledTimes(1)
    })
  })

  describe('Guard Conditions', () => {
    it('should not execute callback if server is destroyed during timeout delay', () => {
      const ua = server.getUA()
      const connectHandler = vi.fn()
      ua.once('connected', connectHandler)

      // Schedule connect event
      server.simulateConnect()

      // Destroy server while timeout is pending
      server.destroy()

      // Advance time
      vi.advanceTimersByTime(100)

      // Handler should not be called
      expect(connectHandler).not.toHaveBeenCalled()
    })

    it('should not execute callback if session becomes inactive during timeout delay', () => {
      const session = server.simulateIncomingCall('sip:alice@example.com', 'sip:bob@example.com')
      const acceptedHandler = vi.fn()
      session.on('accepted', acceptedHandler)

      // Schedule accepted event
      server.simulateCallAccepted(session)

      // Remove session from active sessions (simulating it being ended)
      server.terminateSession(session.id)

      // Advance time
      vi.advanceTimersByTime(100)

      // Handler should not be called
      expect(acceptedHandler).not.toHaveBeenCalled()
    })
  })

  describe('Auto-accept Calls Timeout Management', () => {
    it('should handle auto-accept call timeouts properly', () => {
      const serverWithAutoAccept = createMockSipServer({
        autoAcceptCalls: true,
        networkLatency: 100,
      })
      const ua = serverWithAutoAccept.getUA()

      const session = ua.call('sip:bob@example.com')
      const progressHandler = vi.fn()
      const acceptedHandler = vi.fn()

      session.on('progress', progressHandler)
      session.on('accepted', acceptedHandler)

      // Terminate session before auto-accept timeout fires
      serverWithAutoAccept.terminateSession(session.id)

      // Advance time past the auto-accept delay (networkLatency * 2)
      vi.advanceTimersByTime(300)

      // Handlers should not be called because session was terminated
      expect(progressHandler).not.toHaveBeenCalled()
      expect(acceptedHandler).not.toHaveBeenCalled()

      serverWithAutoAccept.destroy()
    })
  })
})
