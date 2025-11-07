<template>
  <div class="connection-panel">
    <div class="panel-header">
      <h3>SIP Connection</h3>
      <div class="status-indicator" :class="statusClass">
        <span class="status-dot"></span>
        <span class="status-text">{{ statusText }}</span>
      </div>
    </div>

    <!-- Connection Form -->
    <form @submit.prevent="handleConnect" class="connection-form">
      <div class="form-group">
        <label for="sipUri">SIP URI</label>
        <input
          id="sipUri"
          v-model="config.sipUri"
          type="text"
          placeholder="sip:1000@example.com"
          :disabled="isConnected"
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
          :disabled="isConnected"
          required
        />
      </div>

      <div class="form-group">
        <label for="uri">WebSocket URI</label>
        <input
          id="uri"
          v-model="config.uri"
          type="text"
          placeholder="wss://sip.example.com:7443"
          :disabled="isConnected"
          required
        />
      </div>

      <div class="form-group">
        <label for="displayName">Display Name (Optional)</label>
        <input
          id="displayName"
          v-model="config.displayName"
          type="text"
          placeholder="Your Name"
          :disabled="isConnected"
        />
      </div>

      <!-- Action Buttons -->
      <div class="form-actions">
        <button
          v-if="!isConnected"
          type="submit"
          class="btn btn--primary"
          :disabled="!canConnect || isConnecting"
        >
          <span v-if="!isConnecting" class="btn-icon">🔌</span>
          <span v-else class="btn-spinner"></span>
          {{ isConnecting ? 'Connecting...' : 'Connect' }}
        </button>
        <button
          v-else
          type="button"
          @click="handleDisconnect"
          class="btn btn--danger"
        >
          <span class="btn-icon">🔌</span>
          Disconnect
        </button>
      </div>
    </form>

    <!-- Connection Info (when connected) -->
    <div v-if="isConnected" class="connection-info">
      <div class="info-item">
        <span class="info-label">Status:</span>
        <span class="info-value">{{ isRegistered ? 'Registered' : 'Connected' }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">URI:</span>
        <span class="info-value">{{ config.sipUri }}</span>
      </div>
      <div v-if="config.displayName" class="info-item">
        <span class="info-label">Name:</span>
        <span class="info-value">{{ config.displayName }}</span>
      </div>
    </div>

    <!-- Quick Setup Examples -->
    <details v-if="!isConnected" class="setup-help">
      <summary>Setup Examples</summary>
      <div class="help-content">
        <p><strong>Local Asterisk:</strong></p>
        <ul>
          <li>SIP URI: <code>sip:1000@localhost</code></li>
          <li>WebSocket: <code>ws://localhost:8088/ws</code></li>
          <li>Password: Your extension password</li>
        </ul>

        <p><strong>FreePBX/Asterisk:</strong></p>
        <ul>
          <li>SIP URI: <code>sip:extension@your-server.com</code></li>
          <li>WebSocket: <code>wss://your-server.com:7443</code></li>
          <li>Password: Extension password</li>
        </ul>

        <p class="help-note">
          <strong>Note:</strong> Make sure your Asterisk server has WebRTC/WebSocket
          configured and CORS properly set up.
        </p>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// Props
interface Props {
  connected?: boolean
  registered?: boolean
  isConnecting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  connected: false,
  registered: false,
  isConnecting: false,
})

// Emits
const emit = defineEmits<{
  'update:connected': [value: boolean]
  'update:registered': [value: boolean]
  connect: [config: SipConfig]
  disconnect: []
}>()

// Configuration interface
interface SipConfig {
  uri: string
  sipUri: string
  password: string
  displayName: string
}

// Local state
const config = ref<SipConfig>({
  uri: localStorage.getItem('sip_uri') || '',
  sipUri: localStorage.getItem('sip_sipUri') || '',
  password: localStorage.getItem('sip_password') || '',
  displayName: localStorage.getItem('sip_displayName') || '',
})

const isConnected = ref(props.connected)
const isRegistered = ref(props.registered)
const isConnecting = ref(props.isConnecting)

// Computed
const canConnect = computed(() => {
  return (
    config.value.uri.trim() !== '' &&
    config.value.sipUri.trim() !== '' &&
    config.value.password.trim() !== ''
  )
})

const statusClass = computed(() => {
  if (isRegistered.value) return 'status--registered'
  if (isConnected.value) return 'status--connected'
  return 'status--disconnected'
})

const statusText = computed(() => {
  if (isRegistered.value) return 'Registered'
  if (isConnected.value) return 'Connected'
  return 'Disconnected'
})

// Methods
function handleConnect() {
  if (!canConnect.value) return

  // Save config to localStorage
  localStorage.setItem('sip_uri', config.value.uri)
  localStorage.setItem('sip_sipUri', config.value.sipUri)
  localStorage.setItem('sip_password', config.value.password)
  localStorage.setItem('sip_displayName', config.value.displayName)

  emit('connect', { ...config.value })
}

function handleDisconnect() {
  emit('disconnect')
}

// Watch props for changes
watch(
  () => props.connected,
  (value) => {
    isConnected.value = value
    emit('update:connected', value)
  }
)

watch(
  () => props.registered,
  (value) => {
    isRegistered.value = value
    emit('update:registered', value)
  }
)

watch(
  () => props.isConnecting,
  (value) => {
    isConnecting.value = value
  }
)
</script>

<style scoped>
.connection-panel {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.panel-header {
  margin-bottom: 20px;
}

.panel-header h3 {
  color: #333;
  font-size: 1.2em;
  margin-bottom: 12px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.9em;
  font-weight: 600;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status--disconnected {
  background: #f8d7da;
  color: #721c24;
}

.status--disconnected .status-dot {
  background: #dc3545;
}

.status--connected {
  background: #fff3cd;
  color: #856404;
}

.status--connected .status-dot {
  background: #ffc107;
}

.status--registered {
  background: #d4edda;
  color: #155724;
}

.status--registered .status-dot {
  background: #28a745;
}

/* Form */
.connection-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.9em;
  font-weight: 600;
  color: #495057;
}

.form-group input {
  padding: 10px 12px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 0.95em;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.form-group input:disabled {
  background: #f8f9fa;
  cursor: not-allowed;
}

.form-actions {
  margin-top: 8px;
}

.btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-icon {
  font-size: 1.2em;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn--danger {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
}

/* Connection Info */
.connection-info {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid #e9ecef;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
}

.info-label {
  font-weight: 600;
  color: #6c757d;
}

.info-value {
  color: #212529;
  font-family: 'Courier New', monospace;
}

/* Setup Help */
.setup-help {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid #e9ecef;
}

.setup-help summary {
  font-weight: 600;
  color: #667eea;
  cursor: pointer;
  user-select: none;
  padding: 8px 0;
}

.setup-help summary:hover {
  color: #764ba2;
}

.help-content {
  margin-top: 12px;
  font-size: 0.9em;
  color: #495057;
  line-height: 1.6;
}

.help-content p {
  margin: 12px 0 6px 0;
}

.help-content ul {
  margin: 6px 0 12px 20px;
}

.help-content li {
  margin: 4px 0;
}

.help-content code {
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  color: #e83e8c;
}

.help-note {
  margin-top: 12px;
  padding: 12px;
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  border-radius: 4px;
  color: #856404;
}

/* Spinner */
.btn-spinner {
  width: 16px;
  height: 16px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
