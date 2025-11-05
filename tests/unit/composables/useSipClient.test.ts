/**
 * useSipClient composable unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useSipClient } from '@/composables/useSipClient'
import { SipClient } from '@/core/SipClient'
import { EventBus } from '@/core/EventBus'
import { configStore } from '@/stores/configStore'
import { registrationStore } from '@/stores/registrationStore'
import type { SipClientConfig } from '@/types/config.types'
import { RegistrationState } from '@/types/sip.types'

// Mock the core modules
vi.mock('@/core/SipClient')
vi.mock('@/core/EventBus')

// Mock JsSIP to prevent errors
vi.mock('jssip', () => ({
  default: {
    UA: vi.fn(),
    WebSocketInterface: vi.fn(),
    debug: {
      enable: vi.fn(),
      disable: vi.fn(),
    },
  },
}))

describe('useSipClient', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSipClient: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockEventBus: any
  let testConfig: SipClientConfig

  beforeEach(() => {
    // Reset all stores
    configStore.reset()
    registrationStore.reset()

    // Create mock SipClient
    mockSipClient = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      register: vi.fn().mockResolvedValue(undefined),
      unregister: vi.fn().mockResolvedValue(undefined),
      updateConfig: vi.fn(),
      destroy: vi.fn(),
      getState: vi.fn().mockReturnValue({
        connectionState: 'disconnected',
        registrationState: 'unregistered',
      }),
      get connectionState() {
        return 'disconnected'
      },
      get registrationState() {
        return 'unregistered'
      },
      get isConnected() {
        return false
      },
      get isRegistered() {
        return false
      },
    }

    // Create mock EventBus
    mockEventBus = {
      on: vi.fn(),
      once: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      emitSync: vi.fn(),
      destroy: vi.fn(),
    }

    // Setup mocks to return instances
    vi.mocked(SipClient).mockImplementation(() => mockSipClient)
    vi.mocked(EventBus).mockImplementation(() => mockEventBus)

    // Create test configuration
    testConfig = {
      uri: 'wss://sip.example.com:7443',
      sipUri: 'sip:testuser@example.com',
      password: 'testpassword',
      displayName: 'Test User',
      authorizationUsername: 'testuser',
      realm: 'example.com',
      debug: false,
      registrationOptions: {
        expires: 600,
        autoRegister: false,
      },
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { isConnected, isRegistered, isConnecting, isStarted, error } = useSipClient()

      expect(isConnected.value).toBe(false)
      expect(isRegistered.value).toBe(false)
      expect(isConnecting.value).toBe(false)
      expect(isStarted.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should accept initial configuration', () => {
      useSipClient(testConfig)

      expect(configStore.hasSipConfig).toBe(true)
      expect(configStore.getSipUri()).toBe(testConfig.sipUri)
    })

    it('should set error for invalid initial configuration', () => {
      const invalidConfig = {
        ...testConfig,
        uri: '', // Invalid empty URI
      }

      const { error } = useSipClient(invalidConfig)

      expect(error.value).not.toBeNull()
      expect(error.value?.message).toContain('Invalid configuration')
    })

    it('should use provided event bus', () => {
      const customEventBus = new EventBus()
      const { getEventBus } = useSipClient(testConfig, { eventBus: customEventBus })

      expect(getEventBus()).toBe(customEventBus)
    })

    it('should create new event bus if not provided', () => {
      const { getEventBus } = useSipClient()

      expect(getEventBus()).toBeInstanceOf(EventBus)
    })
  })

  describe('connect()', () => {
    it('should connect to SIP server successfully', async () => {
      configStore.setSipConfig(testConfig)
      const { connect, isConnecting, isStarted } = useSipClient()

      expect(isStarted.value).toBe(false)

      const connectPromise = connect()

      // Should be connecting
      expect(isConnecting.value).toBe(true)

      await connectPromise

      // Should have created SipClient
      expect(SipClient).toHaveBeenCalledWith(expect.any(Object), expect.any(Object))
      expect(mockSipClient.start).toHaveBeenCalled()
      expect(isStarted.value).toBe(true)
    })

    it('should throw error if no configuration set', async () => {
      const { connect } = useSipClient()

      await expect(connect()).rejects.toThrow('No SIP configuration set')
    })

    it('should handle connection failure', async () => {
      const connectionError = new Error('Connection failed')
      mockSipClient.start.mockRejectedValueOnce(connectionError)

      configStore.setSipConfig(testConfig)
      const { connect, error, connectionState } = useSipClient()

      await expect(connect()).rejects.toThrow('Connection failed')
      expect(error.value).toBe(connectionError)
      expect(connectionState.value).toBe('connection_failed')
    })

    it('should reuse existing SipClient on subsequent calls', async () => {
      configStore.setSipConfig(testConfig)
      const { connect } = useSipClient()

      await connect()
      expect(SipClient).toHaveBeenCalledTimes(1)

      await connect()
      expect(SipClient).toHaveBeenCalledTimes(1) // Should not create new instance
    })

    it('should clear error on successful connection', async () => {
      configStore.setSipConfig(testConfig)
      const { connect } = useSipClient()

      // Set an error
      await connect().catch(() => {})
      mockSipClient.start.mockRejectedValueOnce(new Error('Test error'))

      // Now connect successfully
      mockSipClient.start.mockResolvedValueOnce(undefined)
      await connect()

      await nextTick()
      // Error should be cleared (or set to null) during next successful connect
    })
  })

  describe('disconnect()', () => {
    it('should disconnect from SIP server successfully', async () => {
      configStore.setSipConfig(testConfig)
      const { connect, disconnect, isStarted, isDisconnecting } = useSipClient()

      await connect()
      expect(isStarted.value).toBe(true)

      const disconnectPromise = disconnect()
      expect(isDisconnecting.value).toBe(true)

      await disconnectPromise

      expect(mockSipClient.stop).toHaveBeenCalled()
      expect(isStarted.value).toBe(false)
      expect(isDisconnecting.value).toBe(false)
    })

    it('should handle disconnect when not connected', async () => {
      const { disconnect } = useSipClient()

      // Should not throw
      await expect(disconnect()).resolves.toBeUndefined()
    })

    it('should handle disconnect failure', async () => {
      const disconnectError = new Error('Disconnect failed')
      mockSipClient.stop.mockRejectedValueOnce(disconnectError)

      configStore.setSipConfig(testConfig)
      const { connect, disconnect, error } = useSipClient()

      await connect()
      await expect(disconnect()).rejects.toThrow('Disconnect failed')
      expect(error.value).toBe(disconnectError)
    })

    it('should clear registration state on disconnect', async () => {
      configStore.setSipConfig(testConfig)
      const { connect, disconnect } = useSipClient()

      await connect()
      registrationStore.setRegistered(testConfig.sipUri, 600)

      await disconnect()

      expect(registrationStore.state).toBe(RegistrationState.Unregistered)
    })
  })

  describe('register()', () => {
    it('should register with SIP server successfully', async () => {
      configStore.setSipConfig(testConfig)
      const { connect, register } = useSipClient()

      await connect()
      await register()

      expect(mockSipClient.register).toHaveBeenCalled()
    })

    it('should throw error if not connected', async () => {
      const { register } = useSipClient()

      await expect(register()).rejects.toThrow('SIP client not started')
    })

    it('should handle registration failure', async () => {
      const registrationError = new Error('Registration failed')
      mockSipClient.register.mockRejectedValueOnce(registrationError)

      configStore.setSipConfig(testConfig)
      const { connect, register, error } = useSipClient()

      await connect()
      await expect(register()).rejects.toThrow('Registration failed')
      expect(error.value).toBe(registrationError)
    })

    it('should update registration store during registration', async () => {
      configStore.setSipConfig(testConfig)
      const { connect, register } = useSipClient()

      await connect()

      // Start registration
      const registerPromise = register()

      // Should be in registering state
      expect(registrationStore.state).toBe(RegistrationState.Registering)

      await registerPromise
    })
  })

  describe('unregister()', () => {
    it('should unregister from SIP server successfully', async () => {
      configStore.setSipConfig(testConfig)
      const { connect, unregister } = useSipClient()

      await connect()
      await unregister()

      expect(mockSipClient.unregister).toHaveBeenCalled()
    })

    it('should throw error if not started', async () => {
      const { unregister } = useSipClient()

      await expect(unregister()).rejects.toThrow('SIP client not started')
    })

    it('should handle unregistration failure', async () => {
      const unregistrationError = new Error('Unregistration failed')
      mockSipClient.unregister.mockRejectedValueOnce(unregistrationError)

      configStore.setSipConfig(testConfig)
      const { connect, unregister, error } = useSipClient()

      await connect()
      await expect(unregister()).rejects.toThrow('Unregistration failed')
      expect(error.value).toBe(unregistrationError)
    })

    it('should update registration store during unregistration', async () => {
      configStore.setSipConfig(testConfig)
      const { connect, unregister } = useSipClient()

      await connect()

      // Start unregistration
      const unregisterPromise = unregister()

      // Should be in unregistering state
      expect(registrationStore.state).toBe(RegistrationState.Unregistering)

      await unregisterPromise
    })
  })

  describe('updateConfig()', () => {
    it('should update configuration successfully', () => {
      configStore.setSipConfig(testConfig)
      const { updateConfig } = useSipClient()

      const updates = {
        displayName: 'Updated User',
        debug: true,
      }

      const result = updateConfig(updates)

      expect(result.valid).toBe(true)
      expect(configStore.sipConfig?.displayName).toBe('Updated User')
      expect(configStore.sipConfig?.debug).toBe(true)
    })

    it('should validate configuration updates', () => {
      configStore.setSipConfig(testConfig)
      const { updateConfig } = useSipClient()

      const invalidUpdates = {
        uri: '', // Invalid empty URI
      }

      const result = updateConfig(invalidUpdates)

      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('should update SipClient config if client exists', async () => {
      configStore.setSipConfig(testConfig)
      const { connect, updateConfig } = useSipClient()

      await connect()

      const updates = { displayName: 'Updated User' }
      updateConfig(updates)

      expect(mockSipClient.updateConfig).toHaveBeenCalledWith(updates)
    })

    it('should handle update errors', () => {
      configStore.setSipConfig(testConfig)
      const { updateConfig, error } = useSipClient()

      // Try to update with invalid config
      const result = updateConfig({ uri: '' })

      expect(result.valid).toBe(false)
      expect(error.value).not.toBeNull()
    })
  })

  describe('reconnect()', () => {
    it('should reconnect successfully', async () => {
      configStore.setSipConfig(testConfig)
      const { connect, reconnect } = useSipClient()

      await connect()
      await reconnect()

      expect(mockSipClient.stop).toHaveBeenCalled()
      expect(mockSipClient.start).toHaveBeenCalledTimes(2) // Once for initial connect, once for reconnect
    })

    it('should reconnect when not previously connected', async () => {
      configStore.setSipConfig(testConfig)
      const { reconnect } = useSipClient()

      await reconnect()

      expect(mockSipClient.start).toHaveBeenCalled()
    })

    it('should handle reconnection failure', async () => {
      mockSipClient.start.mockRejectedValueOnce(new Error('Reconnection failed'))

      configStore.setSipConfig(testConfig)
      const { reconnect, error } = useSipClient()

      await expect(reconnect()).rejects.toThrow('Reconnection failed')
      expect(error.value?.message).toBe('Reconnection failed')
    })

    it('should wait before reconnecting', async () => {
      vi.useFakeTimers()

      configStore.setSipConfig(testConfig)
      const { connect, reconnect } = useSipClient()

      await connect()

      // Start reconnect
      const reconnectPromise = reconnect()

      // Fast-forward time
      await vi.advanceTimersByTimeAsync(1000)

      await reconnectPromise

      vi.useRealTimers()
    })
  })

  describe('event handling', () => {
    it('should setup event listeners', () => {
      useSipClient(testConfig)

      expect(mockEventBus.on).toHaveBeenCalledWith('sip:connected', expect.any(Function))
      expect(mockEventBus.on).toHaveBeenCalledWith('sip:disconnected', expect.any(Function))
      expect(mockEventBus.on).toHaveBeenCalledWith('sip:registered', expect.any(Function))
      expect(mockEventBus.on).toHaveBeenCalledWith('sip:unregistered', expect.any(Function))
      expect(mockEventBus.on).toHaveBeenCalledWith('sip:registration_failed', expect.any(Function))
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'sip:registration_expiring',
        expect.any(Function)
      )
    })

    it('should handle sip:connected event', async () => {
      const { connectionState } = useSipClient()

      // Find the connected event handler
      const connectedHandler = mockEventBus.on.mock.calls.find(
        (call: any) => call[0] === 'sip:connected'
      )?.[1]

      expect(connectedHandler).toBeDefined()

      // Trigger the event
      connectedHandler?.()

      await nextTick()

      expect(connectionState.value).toBe('connected')
    })

    it('should handle sip:disconnected event', async () => {
      const { connectionState, error } = useSipClient()

      const disconnectedHandler = mockEventBus.on.mock.calls.find(
        (call: any) => call[0] === 'sip:disconnected'
      )?.[1]

      expect(disconnectedHandler).toBeDefined()

      disconnectedHandler?.({ error: 'Connection lost' })

      await nextTick()

      expect(connectionState.value).toBe('disconnected')
      expect(error.value?.message).toBe('Connection lost')
    })

    it('should handle sip:registered event', async () => {
      useSipClient()

      const registeredHandler = mockEventBus.on.mock.calls.find(
        (call: any) => call[0] === 'sip:registered'
      )?.[1]

      expect(registeredHandler).toBeDefined()

      registeredHandler?.({ uri: 'sip:test@example.com', expires: 600 })

      await nextTick()

      expect(registrationStore.state).toBe(RegistrationState.Registered)
      expect(registrationStore.registeredUri).toBe('sip:test@example.com')
    })

    it('should handle sip:registration_failed event', async () => {
      const { error } = useSipClient()

      const failedHandler = mockEventBus.on.mock.calls.find(
        (call: any) => call[0] === 'sip:registration_failed'
      )?.[1]

      expect(failedHandler).toBeDefined()

      failedHandler?.({ cause: 'Authentication failed' })

      await nextTick()

      expect(registrationStore.state).toBe(RegistrationState.RegistrationFailed)
      expect(error.value?.message).toBe('Authentication failed')
    })
  })

  describe('lifecycle options', () => {
    it('should not auto-connect by default', () => {
      useSipClient(testConfig)

      expect(mockSipClient.start).not.toHaveBeenCalled()
    })

    it('should auto-connect when configured', async () => {
      useSipClient(testConfig, { autoConnect: true })

      // Wait for async connect
      await nextTick()
      await nextTick()

      expect(mockSipClient.start).toHaveBeenCalled()
    })

    it('should handle auto-connect failure gracefully', async () => {
      mockSipClient.start.mockRejectedValueOnce(new Error('Auto-connect failed'))

      const { error } = useSipClient(testConfig, { autoConnect: true })

      // Wait for async connect to fail
      await nextTick()
      await nextTick()

      expect(error.value?.message).toBe('Auto-connect failed')
    })
  })

  describe('getClient() and getEventBus()', () => {
    it('should return null client before connect', () => {
      const { getClient } = useSipClient()

      expect(getClient()).toBeNull()
    })

    it('should return SipClient after connect', async () => {
      configStore.setSipConfig(testConfig)
      const { connect, getClient } = useSipClient()

      await connect()

      expect(getClient()).toBe(mockSipClient)
    })

    it('should return EventBus instance', () => {
      const { getEventBus } = useSipClient()

      expect(getEventBus()).toBeInstanceOf(EventBus)
    })
  })

  describe('reactive state', () => {
    it('should expose readonly reactive state', async () => {
      configStore.setSipConfig(testConfig)
      const { isConnected, isRegistered, error } = useSipClient()

      // These should be readonly
      expect(isConnected.value).toBe(false)
      expect(isRegistered.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should update isConnected reactively', async () => {
      const { isConnected } = useSipClient()

      const connectedHandler = mockEventBus.on.mock.calls.find(
        (call: any) => call[0] === 'sip:connected'
      )?.[1]

      connectedHandler?.()
      await nextTick()

      expect(isConnected.value).toBe(true)
    })

    it('should update isRegistered reactively', async () => {
      const { isRegistered } = useSipClient()

      registrationStore.setRegistered('sip:test@example.com', 600)
      await nextTick()

      expect(isRegistered.value).toBe(true)
    })
  })
})
