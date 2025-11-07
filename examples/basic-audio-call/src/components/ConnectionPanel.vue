<template>
  <div class="card">
    <h2>SIP Connection</h2>

    <!-- Connection Form -->
    <form v-if="!isConnected" @submit.prevent="handleConnect" aria-label="SIP connection form">
      <div class="form-group">
        <label for="websocket-uri">WebSocket URI</label>
        <input
          id="websocket-uri"
          v-model="form.uri"
          type="text"
          placeholder="wss://sip.example.com:7443"
          required
          aria-required="true"
          aria-describedby="websocket-uri-help"
        />
        <p id="websocket-uri-help" class="info-message">
          Your SIP server WebSocket URI (e.g., wss://sip.example.com:7443)
        </p>
      </div>

      <div class="form-group">
        <label for="sip-uri">SIP URI</label>
        <input
          id="sip-uri"
          v-model="form.sipUri"
          type="text"
          placeholder="sip:1000@example.com"
          required
          aria-required="true"
          aria-describedby="sip-uri-help"
        />
        <p id="sip-uri-help" class="info-message">
          Your SIP address (e.g., sip:1000@example.com)
        </p>
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="form.password"
          type="password"
          placeholder="Your SIP password"
          required
          aria-required="true"
          autocomplete="current-password"
        />
      </div>

      <div class="form-group">
        <label for="display-name">Display Name (Optional)</label>
        <input
          id="display-name"
          v-model="form.displayName"
          type="text"
          placeholder="John Doe"
          aria-describedby="display-name-help"
        />
        <p id="display-name-help" class="info-message" style="margin-top: 0.5rem">
          Optional name to display to other callers
        </p>
      </div>

      <button
        type="submit"
        class="primary"
        :disabled="connecting"
        :aria-busy="connecting"
      >
        {{ connecting ? 'Connecting...' : 'Connect' }}
      </button>

      <p v-if="error" class="error-message" role="alert" aria-live="polite">{{ error }}</p>
    </form>

    <!-- Connection Status -->
    <div v-else class="connection-status" role="status" aria-live="polite">
      <div style="margin-bottom: 1rem">
        <span class="badge success" aria-label="Connection status">Connected</span>
        <span
          v-if="isRegistered"
          class="badge success"
          style="margin-left: 0.5rem"
          aria-label="Registration status"
        >
          Registered
        </span>
        <span
          v-else
          class="badge warning"
          style="margin-left: 0.5rem"
          aria-label="Registration status"
        >
          Registering...
        </span>
      </div>

      <div style="margin-bottom: 1rem">
        <p><strong>SIP URI:</strong> {{ form.sipUri }}</p>
        <p v-if="form.displayName"><strong>Display Name:</strong> {{ form.displayName }}</p>
      </div>

      <button @click="handleDisconnect" class="danger" aria-label="Disconnect from SIP server">
        Disconnect
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ConnectionPanel Component
 *
 * Displays the SIP connection form and status.
 * Allows users to enter their SIP credentials and connect/disconnect from the server.
 */
import { reactive } from 'vue'

/**
 * Props for the ConnectionPanel component
 */
interface Props {
  /** Whether the client is connected to the SIP server */
  isConnected: boolean
  /** Whether the client is registered with the SIP server */
  isRegistered: boolean
  /** Whether a connection attempt is in progress */
  connecting: boolean
  /** Error message to display (empty if no error) */
  error: string
}

defineProps<Props>()

/**
 * Events emitted by the ConnectionPanel component
 */
const emit = defineEmits<{
  /** Emitted when user submits the connection form */
  connect: [config: {
    uri: string
    sipUri: string
    password: string
    displayName?: string
  }]
  /** Emitted when user clicks disconnect */
  disconnect: []
}>()

/**
 * Form data for SIP connection
 * Users can modify these default values to match their SIP server configuration
 */
const form = reactive({
  uri: 'wss://sip.example.com:7443',    // WebSocket URI of SIP server
  sipUri: 'sip:1000@example.com',        // SIP address (user@domain)
  password: '',                          // SIP password (never hardcode in production!)
  displayName: '',                       // Display name shown to other callers
})

/**
 * Handle connection form submission
 * Validates and emits the connection configuration to parent component
 */
const handleConnect = () => {
  emit('connect', {
    uri: form.uri,
    sipUri: form.sipUri,
    password: form.password,
    // Only include displayName if provided
    displayName: form.displayName || undefined,
  })
}

/**
 * Handle disconnection button click
 * Emits disconnect event to parent component
 */
const handleDisconnect = () => {
  emit('disconnect')
}
</script>

<style scoped>
.connection-status {
  padding: 1rem 0;
}

.connection-status p {
  margin-bottom: 0.5rem;
  color: var(--gray-700);
}
</style>
