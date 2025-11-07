<template>
  <div class="card connection-panel">
    <h2>SIP Connection</h2>

    <div class="status-section">
      <span>Status:</span>
      <span v-if="isRegistered" class="status-badge status-connected">
        Registered
      </span>
      <span v-else-if="isConnected" class="status-badge status-connecting">
        Connecting...
      </span>
      <span v-else class="status-badge status-disconnected">
        Disconnected
      </span>
    </div>

    <form v-if="!isConnected" @submit.prevent="$emit('connect')" class="connection-form">
      <div class="form-group">
        <label for="server">SIP Server (WebSocket URL)</label>
        <input
          id="server"
          :value="server"
          @input="$emit('update:server', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="wss://sip.example.com:7443"
          required
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            :value="username"
            @input="$emit('update:username', ($event.target as HTMLInputElement).value)"
            type="text"
            placeholder="1000"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            :value="password"
            @input="$emit('update:password', ($event.target as HTMLInputElement).value)"
            type="password"
            placeholder="Enter password"
            required
          />
        </div>
      </div>

      <div class="form-group">
        <label for="displayName">Display Name</label>
        <input
          id="displayName"
          :value="displayName"
          @input="$emit('update:displayName', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="Your Name"
        />
      </div>

      <button type="submit" class="primary connect-btn">
        Connect to SIP Server
      </button>
    </form>

    <div v-else class="connected-info">
      <p><strong>Server:</strong> {{ server }}</p>
      <p><strong>Username:</strong> {{ username }}</p>
      <p><strong>Display Name:</strong> {{ displayName }}</p>

      <button @click="$emit('disconnect')" class="danger disconnect-btn">
        Disconnect
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Connection Panel Component
 *
 * Handles SIP server connection configuration and status display.
 * Users must connect before they can create or join conferences.
 */

interface Props {
  server: string
  username: string
  password: string
  displayName: string
  isConnected: boolean
  isRegistered: boolean
}

interface Emits {
  (e: 'update:server', value: string): void
  (e: 'update:username', value: string): void
  (e: 'update:password', value: string): void
  (e: 'update:displayName', value: string): void
  (e: 'connect'): void
  (e: 'disconnect'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
.connection-panel {
  margin-bottom: 2rem;
}

.status-section {
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.connection-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.connect-btn,
.disconnect-btn {
  margin-top: 1rem;
  width: 100%;
}

.connected-info {
  margin-top: 1rem;
}

.connected-info p {
  margin-bottom: 0.5rem;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
