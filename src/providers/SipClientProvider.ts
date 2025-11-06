/**
 * SipClientProvider - Vue provider component for SIP client
 *
 * Provides SIP client instance and event bus to child components
 * using Vue's provide/inject API. Handles lifecycle management
 * and cleanup automatically.
 *
 * @example
 * ```vue
 * <template>
 *   <SipClientProvider :config="sipConfig">
 *     <MyCallComponent />
 *   </SipClientProvider>
 * </template>
 *
 * <script setup>
 * import { SipClientProvider } from 'vuesip'
 *
 * const sipConfig = {
 *   uri: 'wss://sip.example.com:7443',
 *   sipUri: 'sip:alice@example.com',
 *   password: 'secret123'
 * }
 * </script>
 * ```
 *
 * @packageDocumentation
 */

import {
  defineComponent,
  provide,
  inject,
  onMounted,
  onBeforeUnmount,
  readonly,
  ref,
  h,
  type InjectionKey,
  type Ref,
  type PropType,
} from 'vue'
import { SipClient } from '@/core/SipClient'
import { EventBus } from '@/core/EventBus'
import type { SipClientConfig } from '@/types/config.types'
import type { ConnectionState, RegistrationState } from '@/types/sip.types'
import { createLogger } from '@/utils/logger'
import { validateSipConfig } from '@/utils/validators'

const logger = createLogger('SipClientProvider')

/**
 * Injection key for SIP client instance
 */
export const SipClientKey: InjectionKey<Ref<SipClient | null>> = Symbol('sip-client')

/**
 * Injection key for event bus instance
 */
export const EventBusKey: InjectionKey<Ref<EventBus>> = Symbol('event-bus')

/**
 * Injection key for connection state
 */
export const ConnectionStateKey: InjectionKey<Ref<ConnectionState>> = Symbol('connection-state')

/**
 * Injection key for registration state
 */
export const RegistrationStateKey: InjectionKey<Ref<RegistrationState>> =
  Symbol('registration-state')

/**
 * Provider context shape - what gets injected into children
 */
export interface SipClientProviderContext {
  /** SIP client instance (null if not initialized) */
  client: Ref<SipClient | null>
  /** Event bus instance for subscribing to events */
  eventBus: Ref<EventBus>
  /** Current connection state */
  connectionState: Ref<ConnectionState>
  /** Current registration state */
  registrationState: Ref<RegistrationState>
  /** Whether client is ready to use */
  isReady: Ref<boolean>
}

/**
 * Injection key for complete provider context
 */
export const SipClientProviderKey: InjectionKey<SipClientProviderContext> =
  Symbol('sip-client-provider')

/**
 * SipClientProvider component
 *
 * Provides SIP client functionality to all child components via
 * Vue's dependency injection system.
 *
 * @example
 * ```ts
 * import { useSipClientProvider } from 'vuesip'
 *
 * // In child component
 * const { client, eventBus, isReady } = useSipClientProvider()
 *
 * watchEffect(() => {
 *   if (isReady.value) {
 *     console.log('SIP client is ready!')
 *   }
 * })
 * ```
 */
export const SipClientProvider = defineComponent({
  name: 'SipClientProvider',

  props: {
    /**
     * SIP client configuration
     */
    config: {
      type: Object as PropType<SipClientConfig>,
      required: true,
    },

    /**
     * Whether to automatically connect on mount
     * @default true
     */
    autoConnect: {
      type: Boolean,
      default: true,
    },

    /**
     * Whether to automatically register after connecting
     * @default true
     */
    autoRegister: {
      type: Boolean,
      default: true,
    },

    /**
     * Whether to automatically cleanup on unmount
     * @default true
     */
    autoCleanup: {
      type: Boolean,
      default: true,
    },
  },

  emits: {
    /**
     * Emitted when client is ready (connected and optionally registered)
     */
    ready: () => true,

    /**
     * Emitted when client connects to SIP server
     */
    connected: () => true,

    /**
     * Emitted when client disconnects from SIP server
     */
    disconnected: (_error?: Error) => true,

    /**
     * Emitted when client registers with SIP server
     */
    registered: (_uri: string) => true,

    /**
     * Emitted when client unregisters from SIP server
     */
    unregistered: () => true,

    /**
     * Emitted when an error occurs
     */
    error: (_error: Error) => true,
  },

  setup(props, { emit, slots }) {
    // Create event bus instance (shared across provider)
    const eventBus = ref<EventBus>(new EventBus())

    // SIP client instance
    const client = ref<SipClient | null>(null)

    // Reactive state
    const connectionState = ref<ConnectionState>('disconnected')
    const registrationState = ref<RegistrationState>('unregistered')
    const isReady = ref(false)
    const error = ref<Error | null>(null)

    /**
     * Initialize SIP client with configuration
     */
    const initializeClient = (): void => {
      try {
        // Validate configuration
        const validation = validateSipConfig(props.config)
        if (!validation.valid) {
          const err = new Error(`Invalid SIP configuration: ${validation.errors?.join(', ')}`)
          logger.error('Configuration validation failed', { validation })
          error.value = err
          emit('error', err)
          return
        }

        logger.info('Initializing SIP client', {
          uri: props.config.uri,
          sipUri: props.config.sipUri,
        })

        // Create SIP client instance
        client.value = new SipClient(props.config, eventBus.value)

        // Setup event listeners
        setupEventListeners()

        logger.debug('SIP client initialized successfully')
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err))
        logger.error('Failed to initialize SIP client', err)
        error.value = errorObj
        emit('error', errorObj)
      }
    }

    /**
     * Setup event listeners for SIP client events
     */
    const setupEventListeners = (): void => {
      if (!client.value) return

      // Connection events
      eventBus.value.on('sip:connected', () => {
        logger.info('SIP client connected')
        connectionState.value = 'connected'
        emit('connected')

        // Auto-register if enabled
        if (props.autoRegister && client.value) {
          client.value.register().catch((err) => {
            logger.error('Auto-registration failed', err)
            const errorObj = err instanceof Error ? err : new Error(String(err))
            error.value = errorObj
            emit('error', errorObj)
          })
        } else if (!props.autoRegister) {
          // If not auto-registering, client is ready once connected
          isReady.value = true
          emit('ready')
        }
      })

      eventBus.value.on('sip:disconnected', (data) => {
        logger.info('SIP client disconnected', data)
        connectionState.value = 'disconnected'
        registrationState.value = 'unregistered'
        isReady.value = false

        const errorObj = data?.error ? new Error(data.error) : undefined
        emit('disconnected', errorObj)
      })

      eventBus.value.on('sip:connecting', () => {
        logger.debug('SIP client connecting')
        connectionState.value = 'connecting'
      })

      // Registration events
      eventBus.value.on('sip:registered', (data) => {
        logger.info('SIP client registered', data)
        registrationState.value = 'registered'
        isReady.value = true
        emit('registered', data.uri)
        emit('ready')
      })

      eventBus.value.on('sip:unregistered', () => {
        logger.info('SIP client unregistered')
        registrationState.value = 'unregistered'
        emit('unregistered')
      })

      eventBus.value.on('sip:registering', () => {
        logger.debug('SIP client registering')
        registrationState.value = 'registering'
      })

      eventBus.value.on('sip:registration_failed', (data) => {
        logger.error('SIP registration failed', data)
        registrationState.value = 'unregistered'
        const errorObj = new Error(`Registration failed: ${data.cause}`)
        error.value = errorObj
        emit('error', errorObj)
      })
    }

    /**
     * Connect to SIP server
     */
    const connect = async (): Promise<void> => {
      if (!client.value) {
        const err = new Error('SIP client not initialized')
        logger.error(err.message)
        error.value = err
        emit('error', err)
        throw err
      }

      try {
        logger.info('Connecting to SIP server')
        await client.value.start()
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err))
        logger.error('Failed to connect', err)
        error.value = errorObj
        emit('error', errorObj)
        throw errorObj
      }
    }

    /**
     * Disconnect from SIP server and cleanup
     */
    const disconnect = async (): Promise<void> => {
      if (!client.value) {
        logger.debug('No client to disconnect')
        return
      }

      try {
        logger.info('Disconnecting from SIP server')
        await client.value.stop()
        isReady.value = false
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err))
        logger.error('Failed to disconnect', err)
        error.value = errorObj
        emit('error', errorObj)
        throw errorObj
      }
    }

    /**
     * Cleanup resources
     */
    const cleanup = async (): Promise<void> => {
      logger.debug('Cleaning up SIP client provider')

      try {
        await disconnect()
      } catch (err) {
        logger.warn('Error during cleanup', err)
      }

      // Clear references
      client.value = null
      isReady.value = false
      error.value = null
    }

    // Lifecycle hooks
    onMounted(async () => {
      logger.debug('SipClientProvider mounted')

      // Initialize client
      initializeClient()

      // Auto-connect if enabled
      if (props.autoConnect && client.value) {
        try {
          await connect()
        } catch (err) {
          logger.error('Auto-connect failed', err)
          // Error already emitted in connect()
        }
      }
    })

    onBeforeUnmount(async () => {
      logger.debug('SipClientProvider unmounting')

      if (props.autoCleanup) {
        await cleanup()
      }
    })

    // Create provider context
    const providerContext: SipClientProviderContext = {
      client: readonly(client) as Ref<SipClient | null>,
      eventBus: readonly(eventBus) as Ref<EventBus>,
      connectionState: readonly(connectionState) as Ref<ConnectionState>,
      registrationState: readonly(registrationState) as Ref<RegistrationState>,
      isReady: readonly(isReady) as Ref<boolean>,
    }

    // Provide context to children
    provide(SipClientProviderKey, providerContext)
    provide(SipClientKey, readonly(client) as Ref<SipClient | null>)
    provide(EventBusKey, readonly(eventBus) as Ref<EventBus>)
    provide(ConnectionStateKey, readonly(connectionState) as Ref<ConnectionState>)
    provide(RegistrationStateKey, readonly(registrationState) as Ref<RegistrationState>)

    // Render default slot
    return () => {
      if (slots.default) {
        return h('div', { class: 'sip-client-provider' }, slots.default())
      }
      return null
    }
  },
})

/**
 * Composable for consuming SipClientProvider context
 *
 * Must be used inside a component that is a child of SipClientProvider.
 *
 * @throws {Error} If used outside of SipClientProvider
 *
 * @example
 * ```vue
 * <script setup>
 * import { useSipClientProvider } from 'vuesip'
 *
 * const { client, eventBus, isReady, connectionState } = useSipClientProvider()
 *
 * watchEffect(() => {
 *   console.log('Connection state:', connectionState.value)
 * })
 * </script>
 * ```
 */
export function useSipClientProvider(): SipClientProviderContext {
  const context = inject(SipClientProviderKey)

  if (!context) {
    throw new Error(
      'useSipClientProvider() must be called inside a component that is a child of <SipClientProvider>'
    )
  }

  return context
}
