<template>
  <div class="app">
    <h1>VueSip Conference Call Example</h1>
    <p class="subtitle">
      Multi-party conference calling with participant management
    </p>

    <!-- Connection Panel -->
    <ConnectionPanel
      v-model:server="config.server"
      v-model:username="config.username"
      v-model:password="config.password"
      v-model:display-name="config.displayName"
      :is-connected="isConnected"
      :is-registered="isRegistered"
      @connect="handleConnect"
      @disconnect="handleDisconnect"
    />

    <!-- Conference Room (only shown when connected) -->
    <ConferenceRoom
      v-if="isRegistered"
      :sip-client="sipClient"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { SipClient } from 'vuesip'
import type { SipClientConfig } from 'vuesip'
import ConnectionPanel from './components/ConnectionPanel.vue'
import ConferenceRoom from './components/ConferenceRoom.vue'

// SIP Configuration
const config = ref<SipClientConfig>({
  server: 'wss://sip.example.com:7443',
  username: '',
  password: '',
  displayName: 'Conference Moderator',
})

// SIP Client
const sipClient = ref<SipClient | null>(null)
const isConnected = ref(false)
const isRegistered = ref(false)

// Store event listener cleanup functions
const eventCleanupFunctions: Array<() => void> = []

/**
 * Connect to SIP server
 */
const handleConnect = async () => {
  try {
    console.log('Connecting to SIP server...')

    // Clean up any existing listeners
    cleanupEventListeners()

    // Create SIP client
    sipClient.value = new SipClient(config.value)

    // Listen to connection events and store cleanup functions
    const onConnected = () => {
      console.log('Connected to SIP server')
      isConnected.value = true
    }
    sipClient.value.on('connected', onConnected)
    eventCleanupFunctions.push(() => sipClient.value?.off('connected', onConnected))

    const onRegistered = () => {
      console.log('Registered with SIP server')
      isRegistered.value = true
    }
    sipClient.value.on('registered', onRegistered)
    eventCleanupFunctions.push(() => sipClient.value?.off('registered', onRegistered))

    const onDisconnected = () => {
      console.log('Disconnected from SIP server')
      isConnected.value = false
      isRegistered.value = false
    }
    sipClient.value.on('disconnected', onDisconnected)
    eventCleanupFunctions.push(() => sipClient.value?.off('disconnected', onDisconnected))

    const onRegistrationFailed = (error: Error) => {
      console.error('Registration failed:', error)
      alert(`Registration failed: ${error.message}`)
    }
    sipClient.value.on('registrationFailed', onRegistrationFailed)
    eventCleanupFunctions.push(() => sipClient.value?.off('registrationFailed', onRegistrationFailed))

    // Start the client
    await sipClient.value.start()
  } catch (error) {
    console.error('Failed to connect:', error)
    alert(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Clean up event listeners
 */
const cleanupEventListeners = () => {
  eventCleanupFunctions.forEach(cleanup => cleanup())
  eventCleanupFunctions.length = 0
}

/**
 * Disconnect from SIP server
 */
const handleDisconnect = async () => {
  try {
    // Clean up event listeners first
    cleanupEventListeners()

    if (sipClient.value) {
      await sipClient.value.stop()
      sipClient.value = null
    }
    isConnected.value = false
    isRegistered.value = false
  } catch (error) {
    console.error('Failed to disconnect:', error)
  }
}

/**
 * Clean up on component unmount
 */
onUnmounted(async () => {
  await handleDisconnect()
})
</script>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
}

.subtitle {
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

@media (prefers-color-scheme: light) {
  .subtitle {
    color: rgba(0, 0, 0, 0.6);
  }
}
</style>
