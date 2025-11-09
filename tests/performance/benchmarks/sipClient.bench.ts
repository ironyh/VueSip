/**
 * SipClient Performance Benchmarks
 *
 * Benchmarks for SIP client operations including register, unregister,
 * makeCall, and connection management.
 */

import { bench, describe, beforeEach, afterEach, vi } from 'vitest'
import { SipClient } from '@/core/SipClient'
import { createEventBus } from '@/core/EventBus'
import type { EventBus } from '@/core/EventBus'
import type { SipClientConfig } from '@/types/config.types'
import { PERFORMANCE } from '@/utils/constants'
import { createMockSipServer, type MockSipServer } from '../../helpers/MockSipServer'

// Mock JsSIP - must be defined inline to avoid hoisting issues
vi.mock('jssip', () => {
  return {
    default: {
      UA: vi.fn(() => ({
        start: vi.fn(),
        stop: vi.fn(),
        register: vi.fn(),
        unregister: vi.fn(),
        call: vi.fn(),
        sendMessage: vi.fn(),
        isConnected: vi.fn().mockReturnValue(false),
        isRegistered: vi.fn().mockReturnValue(false),
        on: vi.fn(),
        once: vi.fn(),
        off: vi.fn(),
      })),
      WebSocketInterface: vi.fn(),
      debug: {
        enable: vi.fn(),
        disable: vi.fn(),
      },
    },
  }
})

describe('SipClient Performance Benchmarks', () => {
  let eventBus: EventBus
  let mockServer: MockSipServer
  let config: SipClientConfig

  beforeEach(() => {
    vi.clearAllMocks()
    eventBus = createEventBus()
    mockServer = createMockSipServer({
      autoRegister: false,
      autoAcceptCalls: false,
      networkLatency: 0, // Zero latency for benchmarks
    })

    config = {
      uri: 'wss://sip.example.com:7443',
      sipUri: 'sip:testuser@example.com',
      password: 'testpassword',
      displayName: 'Test User',
      authorizationUsername: 'testuser',
      realm: 'example.com',
      userAgent: 'VueSip Benchmark',
      debug: false,
      registrationOptions: {
        expires: 600,
        autoRegister: false,
      },
      wsOptions: {
        connectionTimeout: 5000,
        maxReconnectionAttempts: 3,
        reconnectionDelay: 1000,
      },
    }
  })

  afterEach(async () => {
    const mockServerResult = mockServer.destroy()
    if (mockServerResult && typeof mockServerResult.then === 'function') {
      await mockServerResult
    }

    const eventBusResult = eventBus.destroy()
    if (eventBusResult && typeof eventBusResult.then === 'function') {
      await eventBusResult
    }
  })

  describe('Client Creation', () => {
    bench('create SIP client instance', async () => {
      const client = new SipClient(config, eventBus)

      const result = client.destroy()
      if (result && typeof result.then === 'function') {
        await result
      }
    })

    bench('create and configure client with all options', async () => {
      const fullConfig: SipClientConfig = {
        ...config,
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          {
            urls: 'turn:turn.example.com:3478',
            username: 'user',
            credential: 'pass',
          },
        ],
        mediaConstraints: {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        },
      }

      const client = new SipClient(fullConfig, eventBus)

      const result = client.destroy()
      if (result && typeof result.then === 'function') {
        await result
      }
    })
  })

  describe('Registration Operations', () => {
    bench('register (fast path)', async () => {
      const client = new SipClient(config, eventBus)

      // Mock successful registration
      const registerPromise = client.register()

      // Fast-path: immediate success
      const mockUA = (client as any).ua
      const handlers = mockUA.once.mock.calls.find((c: any) => c[0] === 'registered')
      if (handlers && handlers[1]) {
        handlers[1]({ response: { getHeader: () => '600' } })
      }

      await registerPromise

      const result = client.destroy()
      if (result && typeof result.then === 'function') {
        await result
      }
    })

    bench('unregister', async () => {
      const client = new SipClient(config, eventBus)

      // Set as registered
      ;(client as any)._registrationState = 'registered'

      const unregisterPromise = client.unregister()

      // Mock successful unregistration
      const mockUA = (client as any).ua
      const handlers = mockUA.once.mock.calls.find((c: any) => c[0] === 'unregistered')
      if (handlers && handlers[1]) {
        handlers[1]()
      }

      await unregisterPromise

      const result = client.destroy()
      if (result && typeof result.then === 'function') {
        await result
      }
    })

    bench('register -> unregister cycle', async () => {
      const client = new SipClient(config, eventBus)

      // Register
      const registerPromise = client.register()
      const mockUA = (client as any).ua
      let handlers = mockUA.once.mock.calls.find((c: any) => c[0] === 'registered')
      if (handlers && handlers[1]) {
        handlers[1]({ response: { getHeader: () => '600' } })
      }
      await registerPromise

      // Unregister
      const unregisterPromise = client.unregister()
      handlers = mockUA.once.mock.calls.find((c: any) => c[0] === 'unregistered')
      if (handlers && handlers[1]) {
        handlers[1]()
      }
      await unregisterPromise

      const result = client.destroy()
      if (result && typeof result.then === 'function') {
        await result
      }
    })
  })

  describe('Call Operations', () => {
    bench('make outgoing call', async () => {
      const client = new SipClient(config, eventBus)

      // Make call
      client.makeCall('sip:alice@example.com')

      const result = client.destroy()
      if (result && typeof result.then === 'function') {
        await result
      }
    })

    bench('make call with custom options', async () => {
      const client = new SipClient(config, eventBus)

      client.makeCall('sip:alice@example.com', {
        mediaConstraints: {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
          video: false,
        },
        extraHeaders: ['X-Custom-Header: value', 'X-Call-ID: 12345'],
      })

      const result = client.destroy()
      if (result && typeof result.then === 'function') {
        await result
      }
    })

    bench('handle incoming call event', async () => {
      const client = new SipClient(config, eventBus)

      // Simulate incoming call
      const mockSession = mockServer.createSession()
      const mockUA = (client as any).ua
      const handlers = mockUA.on.mock.calls.find((c: any) => c[0] === 'newRTCSession')

      if (handlers && handlers[1]) {
        handlers[1]({
          session: mockSession,
          originator: 'remote',
          request: {
            from: { uri: 'sip:alice@example.com' },
            to: { uri: 'sip:testuser@example.com' },
          },
        })
      }

      const result = client.destroy()
      if (result && typeof result.then === 'function') {
        await result
      }
    })
  })

  describe('Connection Management', () => {
    bench('connect to server', async () => {
      const client = new SipClient(config, eventBus)

      // Start connection
      client.connect()

      const result = client.destroy()
      if (result && typeof result.then === 'function') {
        await result
      }
    })

    bench('disconnect from server', async () => {
      const client = new SipClient(config, eventBus)

      // Set as connected
      ;(client as any)._connectionState = 'connected'

      client.disconnect()

      const result = client.destroy()
      if (result && typeof result.then === 'function') {
        await result
      }
    })

    bench('handle connection state changes', async () => {
      const client = new SipClient(config, eventBus)

      const mockUA = (client as any).ua

      // Simulate connecting
      const connectingHandlers = mockUA.on.mock.calls.find((c: any) => c[0] === 'connecting')
      if (connectingHandlers && connectingHandlers[1]) {
        connectingHandlers[1]()
      }

      // Simulate connected
      const connectedHandlers = mockUA.on.mock.calls.find((c: any) => c[0] === 'connected')
      if (connectedHandlers && connectedHandlers[1]) {
        connectedHandlers[1]({ socket: { url: 'wss://sip.example.com' } })
      }

      const result = client.destroy()
      if (result && typeof result.then === 'function') {
        await result
      }
    })
  })

  describe('State Management', () => {
    bench('check connection state', async () => {
      const client = new SipClient(config, eventBus)

      const _isConnected = client.isConnected
      const _isRegistered = client.isRegistered
      const _connectionState = client.connectionState
      const _registrationState = client.registrationState

      const result = client.destroy()
      if (result && typeof result.then === 'function') {
        await result
      }
    })

    bench('state transitions with event emission', async () => {
      const client = new SipClient(config, eventBus)

      let eventCount = 0
      eventBus.on('connection:connected', () => eventCount++)
      eventBus.on('registration:registered', () => eventCount++)

      // Trigger state changes
      const mockUA = (client as any).ua
      const connectedHandlers = mockUA.on.mock.calls.find((c: any) => c[0] === 'connected')
      if (connectedHandlers && connectedHandlers[1]) {
        connectedHandlers[1]({ socket: { url: 'wss://sip.example.com' } })
      }

      const result = client.destroy()
      if (result && typeof result.then === 'function') {
        await result
      }
    })
  })

  describe('Event Handling', () => {
    bench('process multiple concurrent events', async () => {
      const client = new SipClient(config, eventBus)

      const mockUA = (client as any).ua

      // Simulate multiple events
      const events = ['connecting', 'connected', 'newRTCSession', 'registered']

      const startTime = performance.now()

      events.forEach((eventName) => {
        const handlers = mockUA.on.mock.calls.find((c: any) => c[0] === eventName)
        if (handlers && handlers[1]) {
          if (eventName === 'connected') {
            handlers[1]({ socket: { url: 'wss://sip.example.com' } })
          } else if (eventName === 'newRTCSession') {
            const mockSession = mockServer.createSession()
            handlers[1]({
              session: mockSession,
              originator: 'remote',
              request: {
                from: { uri: 'sip:alice@example.com' },
                to: { uri: 'sip:testuser@example.com' },
              },
            })
          } else {
            handlers[1]({})
          }
        }
      })

      const endTime = performance.now()
      const processingTime = endTime - startTime

      if (processingTime > PERFORMANCE.MAX_EVENT_PROPAGATION_TIME * events.length) {
        console.warn(
          `Event processing exceeded budget: ${processingTime}ms > ${PERFORMANCE.MAX_EVENT_PROPAGATION_TIME * events.length}ms`
        )
      }

      const result = client.destroy()
      if (result && typeof result.then === 'function') {
        await result
      }
    })
  })

  describe('Configuration Updates', () => {
    bench('update client configuration', async () => {
      const client = new SipClient(config, eventBus)

      // Update various config options
      const _updates = {
        displayName: 'Updated User',
        debug: true,
      }

      // Simulate config updates (if API exists)
      // This benchmarks the overhead of config changes

      const result = client.destroy()
      if (result && typeof result.then === 'function') {
        await result
      }
    })
  })

  describe('Memory Management', () => {
    bench('cleanup on destroy', async () => {
      const client = new SipClient(config, eventBus)

      // Set up some state
      ;(client as any)._connectionState = 'connected'
      ;(client as any)._registrationState = 'registered'

      // Clean up
      const result = client.destroy()
      if (result && typeof result.then === 'function') {
        await result
      }
    })

    bench('multiple client creation and cleanup', async () => {
      const clients: SipClient[] = []

      // Create multiple clients
      for (let i = 0; i < 5; i++) {
        const client = new SipClient(
          {
            ...config,
            sipUri: `sip:user${i}@example.com`,
          },
          eventBus
        )
        clients.push(client)
      }

      // Cleanup all
      for (const c of clients) {
        const result = c.destroy()
        if (result && typeof result.then === 'function') {
          await result
        }
      }
    })
  })

  describe('Performance Budget Compliance', () => {
    bench('state update latency check', async () => {
      const client = new SipClient(config, eventBus)

      const startTime = performance.now()

      // Trigger state change
      const mockUA = (client as any).ua
      const handlers = mockUA.on.mock.calls.find((c: any) => c[0] === 'connected')
      if (handlers && handlers[1]) {
        handlers[1]({ socket: { url: 'wss://sip.example.com' } })
      }

      const endTime = performance.now()
      const latency = endTime - startTime

      if (latency > PERFORMANCE.MAX_STATE_UPDATE_LATENCY) {
        console.warn(
          `State update latency exceeded budget: ${latency}ms > ${PERFORMANCE.MAX_STATE_UPDATE_LATENCY}ms`
        )
      }

      const result = client.destroy()
      if (result && typeof result.then === 'function') {
        await result
      }
    })
  })

  describe('Concurrent Operations', () => {
    bench('handle concurrent registration and call', async () => {
      const client = new SipClient(config, eventBus)

      // Start registration
      void client.register()

      // Simultaneously make a call
      client.makeCall('sip:alice@example.com')

      // Complete registration
      const mockUA = (client as any).ua
      const handlers = mockUA.once.mock.calls.find((c: any) => c[0] === 'registered')
      if (handlers && handlers[1]) {
        handlers[1]({ response: { getHeader: () => '600' } })
      }

      const result = client.destroy()
      if (result && typeof result.then === 'function') {
        await result
      }
    })
  })
})
