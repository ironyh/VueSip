/**
 * Call Store Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { callStore } from '../../../src/stores/callStore'
import { CallState, CallDirection, type CallSession } from '../../../src/types/call.types'

describe('callStore', () => {
  // Helper function to create a mock call session
  const createMockCall = (overrides?: Partial<CallSession>): CallSession => ({
    id: `call-${Date.now()}-${Math.random()}`,
    state: CallState.Idle,
    direction: CallDirection.Outgoing,
    localUri: 'sip:alice@example.com',
    remoteUri: 'sip:bob@example.com',
    remoteDisplayName: 'Bob',
    isOnHold: false,
    isMuted: false,
    hasRemoteVideo: false,
    hasLocalVideo: false,
    timing: {},
    ...overrides,
  })

  beforeEach(() => {
    // Reset store before each test
    callStore.reset()
  })

  describe('Active Call Management', () => {
    it('should start with empty active calls', () => {
      expect(callStore.activeCallCount).toBe(0)
      expect(callStore.activeCallsArray).toEqual([])
    })

    it('should add a call to active calls', () => {
      const call = createMockCall()
      const result = callStore.addCall(call)

      expect(result).toBe(true)
      expect(callStore.activeCallCount).toBe(1)
      expect(callStore.hasCall(call.id)).toBe(true)
    })

    it('should not add duplicate calls', () => {
      const call = createMockCall()
      callStore.addCall(call)
      const result = callStore.addCall(call)

      expect(result).toBe(false)
      expect(callStore.activeCallCount).toBe(1)
    })

    it('should enforce max concurrent calls for outgoing calls', () => {
      callStore.setMaxConcurrentCalls(2)

      const call1 = createMockCall()
      const call2 = createMockCall()
      const call3 = createMockCall()

      expect(callStore.addCall(call1)).toBe(true)
      expect(callStore.addCall(call2)).toBe(true)
      expect(callStore.addCall(call3)).toBe(false) // Should fail
      expect(callStore.activeCallCount).toBe(2)
    })

    it('should allow incoming calls even at max limit', () => {
      callStore.setMaxConcurrentCalls(1)

      const outgoingCall = createMockCall({ direction: CallDirection.Outgoing })
      const incomingCall = createMockCall({
        direction: CallDirection.Incoming,
        state: CallState.Ringing,
      })

      expect(callStore.addCall(outgoingCall)).toBe(true)
      expect(callStore.addCall(incomingCall)).toBe(true)
      expect(callStore.activeCallCount).toBe(2)
    })

    it('should update a call', () => {
      const call = createMockCall()
      callStore.addCall(call)

      const updatedCall = { ...call, state: CallState.Active }
      callStore.updateCall(updatedCall)

      const retrieved = callStore.getCall(call.id)
      expect(retrieved?.state).toBe(CallState.Active)
    })

    it('should remove a call', () => {
      const call = createMockCall()
      callStore.addCall(call)

      const removed = callStore.removeCall(call.id)

      expect(removed).toEqual(call)
      expect(callStore.activeCallCount).toBe(0)
      expect(callStore.hasCall(call.id)).toBe(false)
    })

    it('should return undefined when removing non-existent call', () => {
      const removed = callStore.removeCall('non-existent')
      expect(removed).toBeUndefined()
    })

    it('should get a call by ID', () => {
      const call = createMockCall()
      callStore.addCall(call)

      const retrieved = callStore.getCall(call.id)
      expect(retrieved).toEqual(call)
    })

    it('should find calls by predicate', () => {
      const call1 = createMockCall({ state: CallState.Active })
      const call2 = createMockCall({ state: CallState.Ringing })
      const call3 = createMockCall({ state: CallState.Active })

      callStore.addCall(call1)
      callStore.addCall(call2)
      callStore.addCall(call3)

      const activeCalls = callStore.findCalls((c) => c.state === CallState.Active)
      expect(activeCalls).toHaveLength(2)
    })

    it('should clear all active calls', () => {
      callStore.addCall(createMockCall())
      callStore.addCall(createMockCall())

      callStore.clearActiveCalls()

      expect(callStore.activeCallCount).toBe(0)
      expect(callStore.incomingCallCount).toBe(0)
    })
  })

  describe('Incoming Call Queue', () => {
    it('should add incoming calls to queue', () => {
      const call = createMockCall({
        direction: CallDirection.Incoming,
        state: CallState.Ringing,
      })

      callStore.addCall(call)

      expect(callStore.incomingCallCount).toBe(1)
      expect(callStore.incomingCalls).toHaveLength(1)
    })

    it('should not add outgoing calls to incoming queue', () => {
      const call = createMockCall({
        direction: CallDirection.Outgoing,
        state: CallState.Calling,
      })

      callStore.addCall(call)

      expect(callStore.incomingCallCount).toBe(0)
    })

    it('should get next incoming call', () => {
      const call1 = createMockCall({
        direction: CallDirection.Incoming,
        state: CallState.Ringing,
      })
      const call2 = createMockCall({
        direction: CallDirection.Incoming,
        state: CallState.Ringing,
      })

      callStore.addCall(call1)
      callStore.addCall(call2)

      const next = callStore.getNextIncomingCall()
      expect(next?.id).toBe(call1.id)
    })

    it('should remove call from incoming queue', () => {
      const call = createMockCall({
        direction: CallDirection.Incoming,
        state: CallState.Ringing,
      })

      callStore.addCall(call)
      callStore.removeFromIncomingQueue(call.id)

      expect(callStore.incomingCallCount).toBe(0)
      expect(callStore.hasCall(call.id)).toBe(true) // Still in active calls
    })

    it('should remove call from queue when removing from active calls', () => {
      const call = createMockCall({
        direction: CallDirection.Incoming,
        state: CallState.Ringing,
      })

      callStore.addCall(call)
      callStore.removeCall(call.id)

      expect(callStore.incomingCallCount).toBe(0)
      expect(callStore.activeCallCount).toBe(0)
    })
  })

  describe('Call History', () => {
    it('should add call to history', () => {
      const entry = callStore.createHistoryEntry(
        createMockCall({
          state: CallState.Terminated,
          timing: {
            startTime: new Date(),
            endTime: new Date(),
            duration: 60,
          },
        })
      )

      callStore.addToHistory(entry)

      expect(callStore.totalHistoryCalls).toBe(1)
    })

    it('should create history entry from call session', () => {
      const call = createMockCall({
        id: 'test-call',
        direction: CallDirection.Incoming,
        state: CallState.Active,
        remoteUri: 'sip:bob@example.com',
        remoteDisplayName: 'Bob',
        timing: {
          startTime: new Date('2024-01-01T10:00:00'),
          answerTime: new Date('2024-01-01T10:00:05'),
          duration: 60,
        },
      })

      const entry = callStore.createHistoryEntry(call)

      expect(entry.id).toBe('test-call')
      expect(entry.direction).toBe(CallDirection.Incoming)
      expect(entry.remoteUri).toBe('sip:bob@example.com')
      expect(entry.remoteDisplayName).toBe('Bob')
      expect(entry.wasAnswered).toBe(true)
      expect(entry.wasMissed).toBe(false)
    })

    it('should mark unanswered incoming calls as missed', () => {
      const call = createMockCall({
        direction: CallDirection.Incoming,
        state: CallState.Terminated,
        timing: {
          startTime: new Date(),
          endTime: new Date(),
        },
      })

      const entry = callStore.createHistoryEntry(call)

      expect(entry.wasMissed).toBe(true)
      expect(entry.wasAnswered).toBe(false)
    })

    it('should add entries to beginning of history', () => {
      const entry1 = callStore.createHistoryEntry(createMockCall())
      const entry2 = callStore.createHistoryEntry(createMockCall())

      callStore.addToHistory(entry1)
      callStore.addToHistory(entry2)

      const history = callStore.getHistory()
      expect(history[0].id).toBe(entry2.id) // Most recent first
    })

    it('should trim history to max entries', () => {
      callStore.setMaxHistoryEntries(2)

      callStore.addToHistory(callStore.createHistoryEntry(createMockCall()))
      callStore.addToHistory(callStore.createHistoryEntry(createMockCall()))
      callStore.addToHistory(callStore.createHistoryEntry(createMockCall()))

      expect(callStore.totalHistoryCalls).toBe(2)
    })

    it('should filter history by direction', () => {
      const incoming = callStore.createHistoryEntry(
        createMockCall({ direction: CallDirection.Incoming })
      )
      const outgoing = callStore.createHistoryEntry(
        createMockCall({ direction: CallDirection.Outgoing })
      )

      callStore.addToHistory(incoming)
      callStore.addToHistory(outgoing)

      const filtered = callStore.getHistory({
        direction: CallDirection.Incoming,
      })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].direction).toBe(CallDirection.Incoming)
    })

    it('should filter history by remote URI', () => {
      const entry1 = callStore.createHistoryEntry(
        createMockCall({ remoteUri: 'sip:alice@example.com' })
      )
      const entry2 = callStore.createHistoryEntry(
        createMockCall({ remoteUri: 'sip:bob@example.com' })
      )

      callStore.addToHistory(entry1)
      callStore.addToHistory(entry2)

      const filtered = callStore.getHistory({
        remoteUri: 'sip:alice@example.com',
      })
      expect(filtered).toHaveLength(1)
    })

    it('should search history by query', () => {
      const entry1 = callStore.createHistoryEntry(
        createMockCall({
          remoteUri: 'sip:alice@example.com',
          remoteDisplayName: 'Alice Smith',
        })
      )
      const entry2 = callStore.createHistoryEntry(
        createMockCall({
          remoteUri: 'sip:bob@example.com',
          remoteDisplayName: 'Bob Jones',
        })
      )

      callStore.addToHistory(entry1)
      callStore.addToHistory(entry2)

      const result = callStore.searchHistory({ searchQuery: 'alice' })
      expect(result.entries).toHaveLength(1)
      expect(result.totalCount).toBe(1)
    })

    it('should paginate history results', () => {
      for (let i = 0; i < 5; i++) {
        callStore.addToHistory(callStore.createHistoryEntry(createMockCall()))
      }

      const page1 = callStore.getHistory({ limit: 2, offset: 0 })
      const page2 = callStore.getHistory({ limit: 2, offset: 2 })

      expect(page1).toHaveLength(2)
      expect(page2).toHaveLength(2)
    })

    it('should delete history entry by ID', () => {
      const entry = callStore.createHistoryEntry(createMockCall())
      callStore.addToHistory(entry)

      const deleted = callStore.deleteHistoryEntry(entry.id)

      expect(deleted).toBe(true)
      expect(callStore.totalHistoryCalls).toBe(0)
    })

    it('should clear all history', () => {
      callStore.addToHistory(callStore.createHistoryEntry(createMockCall()))
      callStore.addToHistory(callStore.createHistoryEntry(createMockCall()))

      callStore.clearHistory()

      expect(callStore.totalHistoryCalls).toBe(0)
    })

    it('should clear history by filter', () => {
      callStore.addToHistory(
        callStore.createHistoryEntry(createMockCall({ direction: CallDirection.Incoming }))
      )
      callStore.addToHistory(
        callStore.createHistoryEntry(createMockCall({ direction: CallDirection.Outgoing }))
      )

      const deleted = callStore.clearHistoryByFilter({
        direction: CallDirection.Incoming,
      })

      expect(deleted).toBe(1)
      expect(callStore.totalHistoryCalls).toBe(1)
    })

    it('should count missed calls', () => {
      const missed1 = createMockCall({
        direction: CallDirection.Incoming,
        state: CallState.Terminated,
        timing: { startTime: new Date(), endTime: new Date() },
      })
      const missed2 = createMockCall({
        direction: CallDirection.Incoming,
        state: CallState.Terminated,
        timing: { startTime: new Date(), endTime: new Date() },
      })
      const answered = createMockCall({
        direction: CallDirection.Incoming,
        state: CallState.Active,
        timing: {
          startTime: new Date(),
          answerTime: new Date(),
          endTime: new Date(),
        },
      })

      callStore.addToHistory(callStore.createHistoryEntry(missed1))
      callStore.addToHistory(callStore.createHistoryEntry(missed2))
      callStore.addToHistory(callStore.createHistoryEntry(answered))

      expect(callStore.missedCallsCount).toBe(2)
    })
  })

  describe('Configuration', () => {
    it('should set max concurrent calls', () => {
      callStore.setMaxConcurrentCalls(5)
      const stats = callStore.getStatistics()
      expect(stats.maxConcurrentCalls).toBe(5)
    })

    it('should not allow setting max concurrent calls to 0 or negative', () => {
      callStore.setMaxConcurrentCalls(3)
      callStore.setMaxConcurrentCalls(0)
      const stats = callStore.getStatistics()
      expect(stats.maxConcurrentCalls).toBe(3) // Should remain unchanged
    })

    it('should set max history entries', () => {
      callStore.setMaxHistoryEntries(100)
      const stats = callStore.getStatistics()
      expect(stats.maxHistoryEntries).toBe(100)
    })

    it('should trim history when reducing max entries', () => {
      for (let i = 0; i < 5; i++) {
        callStore.addToHistory(callStore.createHistoryEntry(createMockCall()))
      }

      callStore.setMaxHistoryEntries(3)

      expect(callStore.totalHistoryCalls).toBe(3)
    })
  })

  describe('Store Reset', () => {
    it('should reset store to initial state', () => {
      callStore.addCall(createMockCall())
      callStore.addToHistory(callStore.createHistoryEntry(createMockCall()))
      callStore.setMaxConcurrentCalls(10)

      callStore.reset()

      const stats = callStore.getStatistics()
      expect(stats.activeCalls).toBe(0)
      expect(stats.historyEntries).toBe(0)
      expect(stats.maxConcurrentCalls).toBe(4) // Default value
    })
  })

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      callStore.addCall(createMockCall())
      callStore.addCall(
        createMockCall({
          direction: CallDirection.Incoming,
          state: CallState.Ringing,
        })
      )
      callStore.addToHistory(callStore.createHistoryEntry(createMockCall()))

      const stats = callStore.getStatistics()

      expect(stats.activeCalls).toBe(2)
      expect(stats.incomingCalls).toBe(1)
      expect(stats.historyEntries).toBe(1)
    })
  })

  describe('Computed Properties', () => {
    it('should compute isAtMaxCalls correctly', () => {
      callStore.setMaxConcurrentCalls(2)
      expect(callStore.isAtMaxCalls).toBe(false)

      callStore.addCall(createMockCall())
      callStore.addCall(createMockCall())
      expect(callStore.isAtMaxCalls).toBe(true)
    })

    it('should compute established calls correctly', () => {
      callStore.addCall(
        createMockCall({
          direction: CallDirection.Incoming,
          state: CallState.Ringing,
        })
      )
      callStore.addCall(
        createMockCall({
          direction: CallDirection.Outgoing,
          state: CallState.Active,
        })
      )

      expect(callStore.establishedCalls).toHaveLength(1)
    })
  })
})
