<template>
  <div class="connection-panel">
    <form @submit.prevent="handleConnect">
      <div class="form-group">
        <label for="server">SIP Server</label>
        <input
          id="server"
          v-model="config.server"
          type="text"
          placeholder="sip.example.com"
          required
        />
      </div>

      <div class="form-group">
        <label for="username">Username (Extension)</label>
        <input
          id="username"
          v-model="config.username"
          type="text"
          placeholder="1001"
          required
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="config.password"
          type="password"
          placeholder="Enter password"
          required
        />
      </div>

      <div class="form-group">
        <label for="displayName">Agent Name</label>
        <input
          id="displayName"
          v-model="config.displayName"
          type="text"
          placeholder="Agent Smith"
          required
        />
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <button type="submit" class="btn btn-primary" :disabled="isConnecting">
        {{ isConnecting ? 'Connecting...' : 'Connect to Call Center' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSipClient } from 'vuesip'

// ============================================================================
// State
// ============================================================================

const config = ref({
  server: 'sip.example.com',
  username: '',
  password: '',
  displayName: '',
})

const error = ref<string | null>(null)

// ============================================================================
// SIP Client
// ============================================================================

const { connect, isConnecting } = useSipClient()

// ============================================================================
// Methods
// ============================================================================

const handleConnect = async () => {
  try {
    error.value = null

    // Validate config
    if (!config.value.server || !config.value.username || !config.value.password) {
      error.value = 'Please fill in all required fields'
      return
    }

    // Validate SIP server format
    const serverPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!serverPattern.test(config.value.server)) {
      error.value = 'Invalid server address format'
      return
    }

    // Connect with config
    await connect({
      server: `wss://${config.value.server}`,
      username: config.value.username,
      password: config.value.password,
      displayName: config.value.displayName || config.value.username,
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Connection failed'
    console.error('Connection failed:', err)
  }
}
</script>

<style scoped>
.connection-panel {
  width: 100%;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group:last-of-type {
  margin-bottom: 2rem;
}

.error-message {
  padding: 0.75rem;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.btn {
  width: 100%;
}
</style>
