<template>
  <div class="dnd-demo">
    <div class="info-section">
      <p>
        Do Not Disturb mode automatically rejects all incoming calls. Perfect for when you need
        uninterrupted focus time or are in a meeting. DND status persists across sessions.
      </p>
    </div>

    <!-- Connection Status -->
    <div v-if="!isConnected" class="status-message info">
      Connect to a SIP server to use Do Not Disturb (use the Basic Call demo to connect)
    </div>

    <!-- DND Interface -->
    <div v-else class="dnd-interface">
      <!-- Main DND Toggle -->
      <div class="dnd-toggle-card">
        <div class="toggle-header">
          <div class="toggle-icon" :class="{ active: dndEnabled }">
            {{ dndEnabled ? '🔕' : '🔔' }}
          </div>
          <div class="toggle-info">
            <h3>Do Not Disturb</h3>
            <p>{{ dndEnabled ? 'All calls will be rejected' : 'Calls will ring normally' }}</p>
          </div>
        </div>

        <div class="toggle-control">
          <label class="switch">
            <input type="checkbox" v-model="dndEnabled" @change="handleDndToggle" />
            <span class="slider"></span>
          </label>
          <span class="toggle-label">
            {{ dndEnabled ? 'Enabled' : 'Disabled' }}
          </span>
        </div>
      </div>

      <!-- DND Statistics -->
      <div class="dnd-stats">
        <h4>Statistics</h4>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ rejectedCount }}</div>
            <div class="stat-label">Calls Rejected</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ dndEnabled ? 'Active' : 'Inactive' }}</div>
            <div class="stat-label">Current Status</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ getDndDuration() }}</div>
            <div class="stat-label">Duration</div>
          </div>
        </div>
      </div>

      <!-- Recent Rejected Calls -->
      <div v-if="rejectedCalls.length > 0" class="rejected-calls">
        <h4>Recently Rejected Calls</h4>
        <div class="rejected-list">
          <div
            v-for="(call, index) in rejectedCalls.slice(0, 5)"
            :key="index"
            class="rejected-item"
          >
            <span class="rejected-icon">🚫</span>
            <div class="rejected-info">
              <div class="rejected-uri">{{ call.uri }}</div>
              <div class="rejected-time">{{ formatTime(call.time) }}</div>
            </div>
          </div>
        </div>
        <button
          v-if="rejectedCalls.length > 0"
          class="btn btn-secondary btn-sm"
          @click="clearRejectedCalls"
        >
          Clear History
        </button>
      </div>

      <!-- DND Options -->
      <div class="dnd-options">
        <h4>Options</h4>

        <div class="option-item">
          <label>
            <input type="checkbox" v-model="sendBusyResponse" @change="saveSettings" />
            Send "Busy Here" response
          </label>
          <p class="option-desc">
            Sends a 486 Busy Here SIP response instead of a generic rejection
          </p>
        </div>

        <div class="option-item">
          <label>
            <input type="checkbox" v-model="logRejections" @change="saveSettings" />
            Log rejected calls to history
          </label>
          <p class="option-desc">
            Keep a record of calls rejected during DND in call history
          </p>
        </div>
      </div>

      <!-- Status Indicator -->
      <div v-if="dndEnabled" class="dnd-banner">
        <div class="banner-content">
          <span class="banner-icon">🔕</span>
          <span class="banner-text">Do Not Disturb is currently enabled</span>
        </div>
      </div>
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>import { ref, watch } from 'vue'
import { useSipClient, useCallSession } from 'vuesip'

const dndEnabled = ref(false)
const rejectedCount = ref(0)

// Load DND state from localStorage
const loadDndState = () => {
  const saved = localStorage.getItem('vuesip-dnd-enabled')
  dndEnabled.value = saved === 'true'
}

// Save DND state
const saveDndState = () => {
  localStorage.setItem('vuesip-dnd-enabled', String(dndEnabled.value))
}

// Auto-reject incoming calls when DND is enabled
const { state: callState, reject } = useCallSession(sipClient)

watch(callState, async (newState) => {
  if (newState === 'incoming' && dndEnabled.value) {
    console.log('Auto-rejecting call due to DND')
    await reject(486) // 486 Busy Here
    rejectedCount.value++
  }
})

// Toggle DND
const toggleDnd = () => {
  dndEnabled.value = !dndEnabled.value
  saveDndState()
}

// Load on mount
onMounted(() => {
  loadDndState()
})</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useSipClient, useCallSession } from '../../src'

interface RejectedCall {
  uri: string
  time: Date
}

const DND_STORAGE_KEY = 'vuesip-dnd-enabled'
const DND_OPTIONS_KEY = 'vuesip-dnd-options'
const DND_START_KEY = 'vuesip-dnd-start-time'
const REJECTED_CALLS_KEY = 'vuesip-dnd-rejected'

// SIP Client and Call Session
const { isConnected, getClient } = useSipClient()
const sipClientRef = computed(() => getClient())
const { state: callState, remoteUri, reject } = useCallSession(sipClientRef)

// State
const dndEnabled = ref(false)
const rejectedCount = ref(0)
const dndStartTime = ref<Date | null>(null)
const sendBusyResponse = ref(true)
const logRejections = ref(true)
const rejectedCalls = ref<RejectedCall[]>([])

// Methods
const loadDndState = () => {
  const saved = localStorage.getItem(DND_STORAGE_KEY)
  dndEnabled.value = saved === 'true'

  const options = localStorage.getItem(DND_OPTIONS_KEY)
  if (options) {
    try {
      const parsed = JSON.parse(options)
      sendBusyResponse.value = parsed.sendBusyResponse ?? true
      logRejections.value = parsed.logRejections ?? true
    } catch (error) {
      console.error('Failed to load DND options:', error)
    }
  }

  const startTime = localStorage.getItem(DND_START_KEY)
  if (startTime && dndEnabled.value) {
    dndStartTime.value = new Date(startTime)
  }

  const rejected = localStorage.getItem(REJECTED_CALLS_KEY)
  if (rejected) {
    try {
      const parsed = JSON.parse(rejected)
      rejectedCalls.value = parsed.map((call: any) => ({
        ...call,
        time: new Date(call.time),
      }))
      rejectedCount.value = rejectedCalls.value.length
    } catch (error) {
      console.error('Failed to load rejected calls:', error)
    }
  }
}

const saveDndState = () => {
  localStorage.setItem(DND_STORAGE_KEY, String(dndEnabled.value))

  if (dndEnabled.value && !dndStartTime.value) {
    dndStartTime.value = new Date()
    localStorage.setItem(DND_START_KEY, dndStartTime.value.toISOString())
  } else if (!dndEnabled.value) {
    dndStartTime.value = null
    localStorage.removeItem(DND_START_KEY)
  }
}

const saveSettings = () => {
  const options = {
    sendBusyResponse: sendBusyResponse.value,
    logRejections: logRejections.value,
  }
  localStorage.setItem(DND_OPTIONS_KEY, JSON.stringify(options))
}

const saveRejectedCalls = () => {
  localStorage.setItem(REJECTED_CALLS_KEY, JSON.stringify(rejectedCalls.value))
}

const handleDndToggle = () => {
  saveDndState()
}

const clearRejectedCalls = () => {
  rejectedCalls.value = []
  rejectedCount.value = 0
  localStorage.removeItem(REJECTED_CALLS_KEY)
}

const getDndDuration = (): string => {
  if (!dndEnabled.value || !dndStartTime.value) return '0m'

  const now = new Date()
  const diff = now.getTime() - dndStartTime.value.getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 60) return `${minutes}m`

  const hours = Math.floor(minutes / 60)
  const remainingMins = minutes % 60

  if (hours < 24) {
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
  }

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return `${days}d ${remainingHours}h`
}

const formatTime = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  return date.toLocaleString()
}

// Watch for incoming calls and auto-reject if DND is enabled
watch(callState, async (newState) => {
  if (newState === 'incoming' && dndEnabled.value) {
    console.log('Auto-rejecting call due to DND mode')

    try {
      // Reject with appropriate code
      const rejectCode = sendBusyResponse.value ? 486 : 603
      await reject(rejectCode)

      // Log the rejected call
      if (remoteUri.value) {
        rejectedCalls.value.unshift({
          uri: remoteUri.value,
          time: new Date(),
        })

        // Keep only last 50 rejected calls
        if (rejectedCalls.value.length > 50) {
          rejectedCalls.value = rejectedCalls.value.slice(0, 50)
        }

        rejectedCount.value = rejectedCalls.value.length
        saveRejectedCalls()
      }
    } catch (error) {
      console.error('Failed to reject call:', error)
    }
  }
})

// Load DND state on mount
onMounted(() => {
  loadDndState()
})
</script>

<style scoped>
.dnd-demo {
  max-width: 700px;
  margin: 0 auto;
}

.info-section {
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.info-section p {
  margin: 0;
  color: #666;
  line-height: 1.6;
}

.status-message {
  padding: 1rem;
  border-radius: 6px;
  text-align: center;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

.status-message.info {
  background: #eff6ff;
  color: #1e40af;
}

.dnd-interface {
  padding: 1.5rem;
}

.dnd-toggle-card {
  background: white;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  padding: 2rem;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex: 1;
}

.toggle-icon {
  font-size: 3rem;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f3f4f6;
  transition: all 0.3s;
}

.toggle-icon.active {
  background: #fee2e2;
}

.toggle-info h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1.25rem;
}

.toggle-info p {
  margin: 0;
  color: #666;
  font-size: 0.875rem;
}

.toggle-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.toggle-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #666;
}

/* Toggle Switch */
.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: '';
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #ef4444;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.dnd-stats {
  margin-bottom: 1.5rem;
}

.dnd-stats h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.25rem;
  text-align: center;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 0.5rem;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 0.75rem;
  color: #666;
  font-weight: 500;
}

.rejected-calls {
  background: white;
  border-radius: 8px;
  border: 2px solid #e5e7eb;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.rejected-calls h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1rem;
}

.rejected-list {
  margin-bottom: 1rem;
}

.rejected-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.rejected-item:last-child {
  border-bottom: none;
}

.rejected-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.rejected-info {
  flex: 1;
  min-width: 0;
}

.rejected-uri {
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rejected-time {
  font-size: 0.75rem;
  color: #999;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
}

.btn-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
}

.dnd-options {
  background: white;
  border-radius: 8px;
  border: 2px solid #e5e7eb;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.dnd-options h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1rem;
}

.option-item {
  margin-bottom: 1.25rem;
}

.option-item:last-child {
  margin-bottom: 0;
}

.option-item label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
  cursor: pointer;
}

.option-item input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.option-desc {
  margin: 0.5rem 0 0 1.625rem;
  font-size: 0.75rem;
  color: #666;
  line-height: 1.5;
}

.dnd-banner {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border: 2px solid #ef4444;
  border-radius: 8px;
  padding: 1rem;
}

.banner-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.banner-icon {
  font-size: 1.5rem;
}

.banner-text {
  font-size: 1rem;
  font-weight: 600;
  color: #991b1b;
}

.code-example {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
}

.code-example h4 {
  margin: 0 0 1rem 0;
  color: #333;
}

.code-example pre {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 1.5rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0;
}

.code-example code {
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .dnd-toggle-card {
    flex-direction: column;
    gap: 1.5rem;
    text-align: center;
  }

  .toggle-header {
    flex-direction: column;
  }
}
</style>
