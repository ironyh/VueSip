<template>
  <div class="call-waiting-demo">
    <h2>📱 Call Waiting & Switching</h2>
    <p class="description">Handle multiple calls, switch between active calls, and manage call waiting scenarios.</p>

    <!-- Connection Status -->
    <div class="status-section">
      <div :class="['status-badge', connectionState]">
        {{ connectionState.toUpperCase() }}
      </div>
      <div class="calls-indicator">
        <span class="label">Active Calls:</span>
        <span class="value">{{ calls.length }}</span>
      </div>
    </div>

    <!-- SIP Configuration -->
    <div class="config-section">
      <h3>SIP Configuration</h3>
      <div class="form-group">
        <label>SIP Server URI</label>
        <input v-model="sipServerUri" type="text" placeholder="sip:example.com" />
      </div>
      <div class="form-group">
        <label>Username</label>
        <input v-model="username" type="text" placeholder="user123" />
      </div>
      <div class="form-group">
        <label>Password</label>
        <input v-model="password" type="password" placeholder="password" />
      </div>
      <button @click="toggleConnection" :disabled="isConnecting">
        {{ isConnected ? 'Disconnect' : isConnecting ? 'Connecting...' : 'Connect' }}
      </button>
    </div>

    <!-- Call Control -->
    <div v-if="isConnected" class="call-section">
      <h3>Make a Call</h3>
      <div class="form-group">
        <label>Target SIP URI</label>
        <input
          v-model="targetUri"
          type="text"
          placeholder="sip:target@example.com"
          @keyup.enter="makeCall"
        />
      </div>
      <button @click="makeCall">
        📞 Make Call
      </button>
    </div>

    <!-- Active Calls List -->
    <div v-if="calls.length > 0" class="calls-list-section">
      <h3>Active Calls ({{ calls.length }})</h3>

      <div class="calls-container">
        <div
          v-for="call in calls"
          :key="call.id"
          :class="[
            'call-card',
            {
              active: call.id === activeCallId,
              held: call.isHeld,
              incoming: call.state === 'incoming',
              ringing: call.state === 'ringing'
            }
          ]"
        >
          <!-- Call Header -->
          <div class="call-header">
            <div class="call-icon">
              {{ getCallIcon(call) }}
            </div>
            <div class="call-info">
              <div class="call-uri">{{ call.remoteUri }}</div>
              <div class="call-meta">
                <span :class="['state-badge', call.state]">
                  {{ formatState(call.state) }}
                </span>
                <span class="duration">{{ call.duration }}</span>
              </div>
            </div>
          </div>

          <!-- Call State Indicator -->
          <div v-if="call.id === activeCallId" class="active-indicator">
            🔊 ACTIVE CALL
          </div>
          <div v-else-if="call.isHeld" class="held-indicator">
            ⏸️ ON HOLD
          </div>
          <div v-else-if="call.state === 'incoming'" class="incoming-indicator">
            📞 INCOMING...
          </div>

          <!-- Call Controls -->
          <div class="call-controls">
            <!-- Incoming Call Controls -->
            <template v-if="call.state === 'incoming'">
              <button @click="answerCall(call.id)" class="answer-btn">
                ✅ Answer
              </button>
              <button @click="answerAndHoldActive(call.id)" class="answer-hold-btn">
                📞 Answer & Hold Current
              </button>
              <button @click="rejectCall(call.id)" class="reject-btn">
                ❌ Reject
              </button>
            </template>

            <!-- Active/Held Call Controls -->
            <template v-else-if="call.state === 'active'">
              <button
                v-if="call.id !== activeCallId"
                @click="switchToCall(call.id)"
                class="switch-btn"
              >
                🔄 Switch
              </button>
              <button
                v-if="!call.isHeld"
                @click="holdCall(call.id)"
                class="hold-btn"
              >
                ⏸️ Hold
              </button>
              <button
                v-if="call.isHeld"
                @click="resumeCall(call.id)"
                class="resume-btn"
              >
                ▶️ Resume
              </button>
              <button
                @click="muteCall(call.id)"
                :class="['mute-btn', { muted: call.isMuted }]"
              >
                {{ call.isMuted ? '🔊' : '🔇' }} {{ call.isMuted ? 'Unmute' : 'Mute' }}
              </button>
              <button @click="hangupCall(call.id)" class="hangup-btn">
                📞 Hangup
              </button>
            </template>

            <!-- Ringing Call Controls -->
            <template v-else-if="call.state === 'ringing'">
              <button @click="hangupCall(call.id)" class="hangup-btn">
                ❌ Cancel
              </button>
            </template>
          </div>
        </div>
      </div>

      <!-- Multi-Call Actions -->
      <div v-if="calls.length >= 2" class="multi-call-actions">
        <h4>Multi-Call Actions</h4>
        <div class="button-group">
          <button
            @click="swapCalls"
            :disabled="calls.length < 2 || !hasActiveAndHeldCall"
          >
            🔄 Swap Active/Held
          </button>
          <button
            @click="mergeAllCalls"
            :disabled="calls.length < 2"
          >
            🔗 Merge All (Conference)
          </button>
          <button
            @click="hangupAllCalls"
            class="danger"
          >
            📞 Hangup All
          </button>
        </div>
      </div>

      <!-- Call Scenarios -->
      <div class="scenarios-section">
        <h4>Test Scenarios</h4>
        <div class="button-group">
          <button @click="simulateIncomingCall">
            📞 Simulate Incoming Call
          </button>
          <button @click="simulateCallWaiting" :disabled="calls.length === 0">
            ⏳ Simulate Call Waiting
          </button>
          <button @click="simulateThreeWay" :disabled="calls.length < 2">
            👥 Simulate 3-Way Call
          </button>
        </div>
      </div>
    </div>

    <!-- Call Waiting Settings -->
    <div v-if="isConnected" class="settings-section">
      <h3>Call Waiting Settings</h3>
      <div class="settings-grid">
        <label>
          <input type="checkbox" v-model="callWaitingEnabled" />
          Enable Call Waiting
        </label>
        <label>
          <input type="checkbox" v-model="autoAnswerWaiting" />
          Auto-answer waiting calls
        </label>
        <label>
          <input type="checkbox" v-model="playWaitingTone" />
          Play call waiting tone
        </label>
        <label>
          <input type="checkbox" v-model="vibrationOnWaiting" />
          Vibrate on waiting call
        </label>
      </div>

      <div class="setting-item">
        <label>Maximum Simultaneous Calls</label>
        <input
          type="range"
          v-model.number="maxSimultaneousCalls"
          min="1"
          max="5"
          step="1"
        />
        <span class="value">{{ maxSimultaneousCalls }}</span>
      </div>
    </div>

    <!-- Call History -->
    <div v-if="callHistory.length > 0" class="history-section">
      <h3>Recent Activity</h3>
      <div class="history-list">
        <div
          v-for="(entry, index) in callHistory.slice(0, 5)"
          :key="index"
          class="history-item"
        >
          <div class="history-icon">{{ entry.icon }}</div>
          <div class="history-details">
            <div class="history-message">{{ entry.message }}</div>
            <div class="history-time">{{ entry.timestamp }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useSipClient } from '../../src/composables/useSipClient'

// SIP Configuration
const sipServerUri = ref('sip:example.com')
const username = ref('')
const password = ref('')
const targetUri = ref('sip:1000@example.com')

// SIP Client
const { sipClient, connectionState, isConnected, isConnecting, connect, disconnect } =
  useSipClient()

// Call State
interface Call {
  id: string
  remoteUri: string
  state: 'incoming' | 'ringing' | 'active' | 'held'
  isHeld: boolean
  isMuted: boolean
  duration: string
  startTime: Date
  direction: 'inbound' | 'outbound'
}

const calls = ref<Call[]>([])
const activeCallId = ref<string | null>(null)

// Settings
const callWaitingEnabled = ref(true)
const autoAnswerWaiting = ref(false)
const playWaitingTone = ref(true)
const vibrationOnWaiting = ref(true)
const maxSimultaneousCalls = ref(3)

// Call History
interface HistoryEntry {
  icon: string
  message: string
  timestamp: string
}

const callHistory = ref<HistoryEntry[]>([])

// Timers
const callTimers = new Map<string, number>()

// Computed
const hasActiveAndHeldCall = computed(() => {
  const activeCall = calls.value.find(c => c.id === activeCallId.value && !c.isHeld)
  const heldCall = calls.value.find(c => c.isHeld)
  return activeCall && heldCall
})

// Format time helper
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Connection Toggle
const toggleConnection = async () => {
  if (isConnected.value) {
    await disconnect()
    hangupAllCalls()
  } else {
    await connect({
      uri: sipServerUri.value,
      username: username.value,
      password: password.value,
    })
  }
}

// Make Call
const makeCall = async () => {
  if (!targetUri.value || calls.value.length >= maxSimultaneousCalls.value) {
    if (calls.value.length >= maxSimultaneousCalls.value) {
      alert(`Maximum ${maxSimultaneousCalls.value} simultaneous calls reached`)
    }
    return
  }

  const callId = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const newCall: Call = {
    id: callId,
    remoteUri: targetUri.value,
    state: 'ringing',
    isHeld: false,
    isMuted: false,
    duration: '00:00',
    startTime: new Date(),
    direction: 'outbound',
  }

  calls.value.push(newCall)
  logHistory('📞', `Calling ${targetUri.value}`)

  // Simulate call connection
  setTimeout(() => {
    const call = calls.value.find(c => c.id === callId)
    if (call) {
      call.state = 'active'

      // Hold current active call if exists
      if (activeCallId.value && activeCallId.value !== callId) {
        const currentActive = calls.value.find(c => c.id === activeCallId.value)
        if (currentActive) {
          currentActive.isHeld = true
        }
      }

      activeCallId.value = callId
      startCallTimer(callId)
      logHistory('✅', `Call connected: ${call.remoteUri}`)
    }
  }, 2000)
}

// Answer Call
const answerCall = async (callId: string) => {
  const call = calls.value.find(c => c.id === callId)
  if (!call) return

  call.state = 'active'

  // Set as active call
  activeCallId.value = callId

  startCallTimer(callId)
  logHistory('✅', `Answered call from ${call.remoteUri}`)
}

// Answer and Hold Current
const answerAndHoldActive = async (callId: string) => {
  // Hold current active call
  if (activeCallId.value) {
    const currentActive = calls.value.find(c => c.id === activeCallId.value)
    if (currentActive) {
      currentActive.isHeld = true
      logHistory('⏸️', `Held call with ${currentActive.remoteUri}`)
    }
  }

  // Answer new call
  await answerCall(callId)
}

// Reject Call
const rejectCall = async (callId: string) => {
  const call = calls.value.find(c => c.id === callId)
  if (!call) return

  logHistory('❌', `Rejected call from ${call.remoteUri}`)
  removeCall(callId)
}

// Hold Call
const holdCall = async (callId: string) => {
  const call = calls.value.find(c => c.id === callId)
  if (!call) return

  call.isHeld = true

  if (activeCallId.value === callId) {
    activeCallId.value = null
  }

  logHistory('⏸️', `Held call with ${call.remoteUri}`)
}

// Resume Call
const resumeCall = async (callId: string) => {
  const call = calls.value.find(c => c.id === callId)
  if (!call) return

  // Hold current active call
  if (activeCallId.value && activeCallId.value !== callId) {
    const currentActive = calls.value.find(c => c.id === activeCallId.value)
    if (currentActive) {
      currentActive.isHeld = true
    }
  }

  call.isHeld = false
  activeCallId.value = callId

  logHistory('▶️', `Resumed call with ${call.remoteUri}`)
}

// Switch to Call
const switchToCall = async (callId: string) => {
  // Hold current active call
  if (activeCallId.value) {
    const currentActive = calls.value.find(c => c.id === activeCallId.value)
    if (currentActive) {
      currentActive.isHeld = true
    }
  }

  // Resume target call
  const call = calls.value.find(c => c.id === callId)
  if (call) {
    call.isHeld = false
    activeCallId.value = callId
    logHistory('🔄', `Switched to call with ${call.remoteUri}`)
  }
}

// Mute Call
const muteCall = async (callId: string) => {
  const call = calls.value.find(c => c.id === callId)
  if (!call) return

  call.isMuted = !call.isMuted
  logHistory(call.isMuted ? '🔇' : '🔊', `${call.isMuted ? 'Muted' : 'Unmuted'} call`)
}

// Hangup Call
const hangupCall = async (callId: string) => {
  const call = calls.value.find(c => c.id === callId)
  if (!call) return

  logHistory('📞', `Call ended: ${call.remoteUri}`)
  removeCall(callId)

  // If this was the active call, find another to make active
  if (activeCallId.value === callId) {
    activeCallId.value = null

    // Find first non-held call or any call
    const nextActive = calls.value.find(c => !c.isHeld) || calls.value[0]
    if (nextActive) {
      activeCallId.value = nextActive.id
      nextActive.isHeld = false
    }
  }
}

// Hangup All Calls
const hangupAllCalls = () => {
  calls.value.forEach(call => {
    stopCallTimer(call.id)
  })
  calls.value = []
  activeCallId.value = null
  logHistory('📞', 'All calls ended')
}

// Swap Calls
const swapCalls = () => {
  if (!hasActiveAndHeldCall.value) return

  const activeCall = calls.value.find(c => c.id === activeCallId.value)
  const heldCall = calls.value.find(c => c.isHeld)

  if (activeCall && heldCall) {
    activeCall.isHeld = true
    heldCall.isHeld = false
    activeCallId.value = heldCall.id

    logHistory('🔄', `Swapped calls: ${heldCall.remoteUri} now active`)
  }
}

// Merge All Calls
const mergeAllCalls = () => {
  calls.value.forEach(call => {
    call.isHeld = false
  })

  logHistory('🔗', `Merged ${calls.value.length} calls into conference`)
}

// Remove Call
const removeCall = (callId: string) => {
  stopCallTimer(callId)
  const index = calls.value.findIndex(c => c.id === callId)
  if (index !== -1) {
    calls.value.splice(index, 1)
  }
}

// Call Timer
const startCallTimer = (callId: string) => {
  const timer = window.setInterval(() => {
    const call = calls.value.find(c => c.id === callId)
    if (call) {
      const elapsed = Math.floor((Date.now() - call.startTime.getTime()) / 1000)
      call.duration = formatTime(elapsed)
    }
  }, 1000)
  callTimers.set(callId, timer)
}

const stopCallTimer = (callId: string) => {
  const timer = callTimers.get(callId)
  if (timer) {
    clearInterval(timer)
    callTimers.delete(callId)
  }
}

// Simulate Incoming Call
const simulateIncomingCall = () => {
  if (calls.value.length >= maxSimultaneousCalls.value) {
    alert(`Maximum ${maxSimultaneousCalls.value} simultaneous calls reached`)
    return
  }

  if (!callWaitingEnabled.value && calls.value.length > 0) {
    alert('Call waiting is disabled')
    return
  }

  const callId = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const incomingUri = `sip:incoming-${Math.floor(Math.random() * 9000 + 1000)}@example.com`

  const newCall: Call = {
    id: callId,
    remoteUri: incomingUri,
    state: 'incoming',
    isHeld: false,
    isMuted: false,
    duration: '00:00',
    startTime: new Date(),
    direction: 'inbound',
  }

  calls.value.push(newCall)
  logHistory('📞', `Incoming call from ${incomingUri}`)

  // Play waiting tone
  if (playWaitingTone.value && calls.value.length > 1) {
    console.log('Playing call waiting tone...')
  }

  // Vibrate
  if (vibrationOnWaiting.value && navigator.vibrate) {
    navigator.vibrate([200, 100, 200])
  }

  // Auto-answer if enabled
  if (autoAnswerWaiting.value) {
    setTimeout(() => {
      answerAndHoldActive(callId)
    }, 1000)
  }
}

// Simulate Call Waiting
const simulateCallWaiting = () => {
  simulateIncomingCall()
}

// Simulate Three-Way
const simulateThreeWay = () => {
  mergeAllCalls()
}

// Helpers
const getCallIcon = (call: Call): string => {
  if (call.state === 'incoming') return '📞'
  if (call.state === 'ringing') return '📱'
  if (call.isHeld) return '⏸️'
  if (call.id === activeCallId.value) return '🔊'
  return '📞'
}

const formatState = (state: string): string => {
  return state.charAt(0).toUpperCase() + state.slice(1)
}

// Log History
const logHistory = (icon: string, message: string) => {
  callHistory.value.unshift({
    icon,
    message,
    timestamp: new Date().toLocaleTimeString(),
  })

  // Keep only last 20 entries
  if (callHistory.value.length > 20) {
    callHistory.value = callHistory.value.slice(0, 20)
  }
}

// Cleanup
onUnmounted(() => {
  callTimers.forEach(timer => clearInterval(timer))
  callTimers.clear()
})
</script>

<style scoped>
.call-waiting-demo {
  max-width: 1000px;
  margin: 0 auto;
}

.description {
  color: #666;
  margin-bottom: 2rem;
}

.status-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.status-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.875rem;
}

.status-badge.connected {
  background-color: #10b981;
  color: white;
}

.status-badge.disconnected {
  background-color: #6b7280;
  color: white;
}

.status-badge.connecting {
  background-color: #f59e0b;
  color: white;
}

.calls-indicator {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.875rem;
}

.calls-indicator .label {
  color: #6b7280;
}

.calls-indicator .value {
  font-weight: 700;
  color: #111827;
  background: #f3f4f6;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

.config-section,
.call-section,
.calls-list-section,
.settings-section,
.history-section {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.125rem;
}

h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

button {
  padding: 0.625rem 1.25rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover:not(:disabled) {
  background-color: #2563eb;
}

button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

button.danger {
  background-color: #ef4444;
}

button.danger:hover:not(:disabled) {
  background-color: #dc2626;
}

.calls-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.call-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s;
}

.call-card.active {
  border-color: #10b981;
  background: #ecfdf5;
}

.call-card.held {
  border-color: #f59e0b;
  background: #fffbeb;
  opacity: 0.8;
}

.call-card.incoming {
  border-color: #3b82f6;
  background: #eff6ff;
  animation: pulse-border 1.5s ease-in-out infinite;
}

@keyframes pulse-border {
  0%, 100% {
    border-color: #3b82f6;
  }
  50% {
    border-color: #60a5fa;
  }
}

.call-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.call-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.call-info {
  flex: 1;
}

.call-uri {
  font-weight: 600;
  margin-bottom: 0.25rem;
  word-break: break-all;
}

.call-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.875rem;
}

.state-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
  font-size: 0.75rem;
}

.state-badge.incoming {
  background: #dbeafe;
  color: #1e40af;
}

.state-badge.ringing {
  background: #fef3c7;
  color: #92400e;
}

.state-badge.active {
  background: #d1fae5;
  color: #065f46;
}

.state-badge.held {
  background: #fef3c7;
  color: #92400e;
}

.duration {
  color: #6b7280;
}

.active-indicator,
.held-indicator,
.incoming-indicator {
  padding: 0.5rem;
  border-radius: 6px;
  text-align: center;
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.active-indicator {
  background: #d1fae5;
  color: #065f46;
}

.held-indicator {
  background: #fef3c7;
  color: #92400e;
}

.incoming-indicator {
  background: #dbeafe;
  color: #1e40af;
  animation: pulse-bg 1.5s ease-in-out infinite;
}

@keyframes pulse-bg {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.call-controls {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.call-controls button {
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
}

.answer-btn {
  background-color: #10b981;
}

.answer-btn:hover {
  background-color: #059669;
}

.answer-hold-btn {
  background-color: #3b82f6;
}

.reject-btn {
  background-color: #ef4444;
}

.reject-btn:hover {
  background-color: #dc2626;
}

.switch-btn {
  background-color: #8b5cf6;
}

.switch-btn:hover {
  background-color: #7c3aed;
}

.hold-btn {
  background-color: #f59e0b;
}

.hold-btn:hover {
  background-color: #d97706;
}

.resume-btn {
  background-color: #10b981;
}

.resume-btn:hover {
  background-color: #059669;
}

.mute-btn {
  background-color: #6b7280;
}

.mute-btn:hover {
  background-color: #4b5563;
}

.mute-btn.muted {
  background-color: #ef4444;
}

.hangup-btn {
  background-color: #ef4444;
}

.hangup-btn:hover {
  background-color: #dc2626;
}

.multi-call-actions,
.scenarios-section {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.button-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.settings-grid label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.settings-grid input[type="checkbox"] {
  width: auto;
}

.setting-item {
  margin-bottom: 1rem;
}

.setting-item label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
}

.setting-item input[type="range"] {
  width: calc(100% - 3rem);
  margin-right: 0.5rem;
}

.setting-item .value {
  font-weight: 600;
  color: #3b82f6;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  font-size: 0.875rem;
}

.history-icon {
  font-size: 1.25rem;
}

.history-details {
  flex: 1;
}

.history-message {
  color: #111827;
  margin-bottom: 0.125rem;
}

.history-time {
  color: #9ca3af;
  font-size: 0.75rem;
}
</style>
