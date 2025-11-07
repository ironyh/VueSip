<template>
  <div id="app" data-testid="sip-client">
    <div class="container">
      <h1>VueSip - E2E Test Application</h1>

      <!-- Connection Status -->
      <div class="status-bar">
        <div class="status-item">
          <span class="status-label">Connection:</span>
          <span
            data-testid="connection-status"
            :class="['status-indicator', { connected: isConnected }]"
          >
            {{ connectionState }}
          </span>
        </div>
        <div class="status-item">
          <span class="status-label">Registration:</span>
          <span
            data-testid="registration-status"
            :class="['status-indicator', { connected: isRegistered }]"
          >
            {{ isRegistered ? 'Registered' : 'Unregistered' }}
          </span>
        </div>
      </div>

      <!-- Settings Panel -->
      <div v-if="showSettings" class="settings-panel">
        <h2>SIP Settings</h2>
        <div class="form-group">
          <label>SIP URI:</label>
          <input
            v-model="tempConfig.sipUri"
            data-testid="sip-uri-input"
            type="text"
            placeholder="sip:user@example.com"
          />
        </div>
        <div class="form-group">
          <label>Password:</label>
          <input
            v-model="tempConfig.password"
            data-testid="password-input"
            type="password"
            placeholder="password"
          />
        </div>
        <div class="form-group">
          <label>Server URI:</label>
          <input
            v-model="tempConfig.uri"
            data-testid="server-uri-input"
            type="text"
            placeholder="wss://sip.example.com:7443"
          />
        </div>
        <button class="btn btn-primary" data-testid="save-settings-button" @click="saveSettings">
          Save Settings
        </button>
        <div v-if="settingsSaved" data-testid="settings-saved-message" class="success-message">
          Settings saved successfully!
        </div>
      </div>

      <!-- Main Interface -->
      <div v-if="!showSettings" class="main-interface">
        <!-- Connection Controls -->
        <div class="connection-controls">
          <button
            v-if="!isConnected"
            class="btn btn-primary"
            data-testid="connect-button"
            @click="handleConnect"
          >
            Connect
          </button>
          <button
            v-else
            class="btn btn-danger"
            data-testid="disconnect-button"
            @click="handleDisconnect"
          >
            Disconnect
          </button>
        </div>

        <!-- Dialpad and Call Controls -->
        <div class="row">
          <div class="col">
            <div class="dialpad-section">
              <h3>Dialpad</h3>
              <input
                v-model="dialNumber"
                data-testid="dialpad-input"
                type="text"
                class="dialpad-input"
                placeholder="Enter number or SIP URI"
              />
              <button
                class="btn btn-success"
                data-testid="call-button"
                :disabled="!dialNumber || !isConnected"
                @click="handleMakeCall"
              >
                <i class="pi pi-phone"></i> Call
              </button>
            </div>

            <!-- DTMF Pad (during call) -->
            <div v-if="callState !== 'idle'" class="dtmf-section">
              <button data-testid="dialpad-toggle" class="btn btn-secondary" @click="toggleDTMF">
                {{ showDTMF ? 'Hide' : 'Show' }} DTMF Pad
              </button>
              <div v-if="showDTMF" class="dtmf-pad">
                <button
                  v-for="digit in dtmfDigits"
                  :key="digit"
                  :data-testid="`dtmf-${digit}`"
                  class="dtmf-button"
                  @click="sendDTMF(digit)"
                >
                  {{ digit }}
                </button>
              </div>
              <div v-if="dtmfFeedback" data-testid="dtmf-feedback" class="dtmf-feedback">
                Sent: {{ dtmfFeedback }}
              </div>
            </div>
          </div>

          <div class="col">
            <!-- Active Call Display -->
            <div v-if="callState !== 'idle'" class="active-call-panel" data-testid="active-call">
              <h3>Active Call</h3>
              <div data-testid="call-status" class="call-status">
                {{ callState }}
              </div>
              <div class="call-info">
                <div>Direction: {{ direction }}</div>
                <div>Remote: {{ remoteUri }}</div>
                <div v-if="answerTime">Duration: {{ formatDuration() }}</div>
              </div>

              <!-- Call Control Buttons -->
              <div class="call-controls">
                <button
                  v-if="callState === 'ringing' && direction === 'incoming'"
                  class="btn btn-success"
                  data-testid="answer-button"
                  @click="handleAnswer"
                >
                  Answer
                </button>
                <button
                  v-if="callState === 'ringing'"
                  class="btn btn-danger"
                  data-testid="reject-button"
                  @click="handleReject"
                >
                  Reject
                </button>
                <button
                  v-if="callState === 'active'"
                  class="btn btn-secondary"
                  :data-testid="isLocalHeld ? 'unhold-button' : 'hold-button'"
                  @click="handleToggleHold"
                >
                  {{ isLocalHeld ? 'Unhold' : 'Hold' }}
                </button>
                <button
                  v-if="callState === 'active'"
                  class="btn btn-secondary"
                  data-testid="mute-audio-button"
                  @click="handleToggleMute"
                >
                  {{ isMuted ? 'Unmute' : 'Mute' }}
                </button>
                <button
                  v-if="callState === 'active'"
                  class="btn btn-secondary"
                  data-testid="toggle-video-button"
                  @click="handleToggleVideo"
                >
                  {{ videoEnabled ? 'Disable Video' : 'Enable Video' }}
                </button>
                <button
                  class="btn btn-danger"
                  data-testid="hangup-button"
                  @click="handleHangup"
                >
                  Hangup
                </button>
              </div>

              <!-- Audio/Video Status -->
              <div class="media-status">
                <div data-testid="audio-status">
                  Audio: {{ isMuted ? 'Muted' : 'Unmuted' }}
                </div>
                <div data-testid="video-status">
                  Video: {{ videoEnabled ? 'Enabled' : 'Disabled' }}
                </div>
              </div>

              <!-- Transfer Controls -->
              <div class="transfer-section">
                <button
                  class="btn btn-secondary"
                  data-testid="transfer-button"
                  @click="showTransfer = !showTransfer"
                >
                  Transfer Call
                </button>
                <div v-if="showTransfer" class="transfer-controls">
                  <input
                    v-model="transferTarget"
                    data-testid="transfer-input"
                    type="text"
                    placeholder="sip:transfer@example.com"
                  />
                  <button
                    class="btn btn-primary"
                    data-testid="confirm-transfer-button"
                    @click="handleTransfer"
                  >
                    Confirm Transfer
                  </button>
                  <div v-if="transferStatus" data-testid="transfer-status">
                    {{ transferStatus }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Incoming Call Notification -->
            <div
              v-if="direction === 'incoming' && callState === 'ringing'"
              class="incoming-notification"
              data-testid="incoming-call-notification"
            >
              <h3>Incoming Call</h3>
              <p>From: {{ remoteUri }}</p>
            </div>
          </div>
        </div>

        <!-- Call History -->
        <div class="call-history-section">
          <button
            class="btn btn-secondary"
            data-testid="call-history-button"
            @click="showHistory = !showHistory"
          >
            {{ showHistory ? 'Hide' : 'Show' }} Call History
          </button>
          <div v-if="showHistory" data-testid="call-history-panel" class="history-panel">
            <h3>Call History</h3>
            <div
              v-for="(entry, index) in history"
              :key="index"
              data-testid="history-entry"
              class="history-entry"
            >
              <div>{{ entry.remoteUri }}</div>
              <div>{{ entry.direction }} - {{ entry.startTime }}</div>
            </div>
          </div>
        </div>

        <!-- Device Settings -->
        <div class="device-settings-section">
          <button
            class="btn btn-secondary"
            data-testid="device-settings-button"
            @click="showDevices = !showDevices"
          >
            {{ showDevices ? 'Hide' : 'Show' }} Device Settings
          </button>
          <div v-if="showDevices" class="device-panel">
            <h3>Audio Devices</h3>
            <div class="form-group">
              <label>Audio Input:</label>
              <select
                v-model="selectedAudioInputId"
                data-testid="audio-input-select"
                data-testid="audio-input-devices"
                @change="handleInputChange"
              >
                <option v-for="device in audioInputDevices" :key="device.deviceId" :value="device.deviceId">
                  {{ device.label || 'Unknown Device' }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Audio Output:</label>
              <select
                v-model="selectedAudioOutputId"
                data-testid="audio-output-select"
                data-testid="audio-output-devices"
                @change="handleOutputChange"
              >
                <option v-for="device in audioOutputDevices" :key="device.deviceId" :value="device.deviceId">
                  {{ device.label || 'Unknown Device' }}
                </option>
              </select>
            </div>
            <div v-if="deviceChanged" data-testid="device-changed-message" class="success-message">
              Device changed successfully!
            </div>
          </div>
        </div>
      </div>

      <!-- Settings Button -->
      <button class="btn btn-secondary settings-btn" data-testid="settings-button" @click="showSettings = !showSettings">
        <i class="pi pi-cog"></i> {{ showSettings ? 'Close' : 'Settings' }}
      </button>

      <!-- Error Display -->
      <div v-if="lastError" data-testid="error-message" class="error-message">
        {{ lastError }}
      </div>
      <div v-if="registrationError" data-testid="registration-error" class="error-message">
        {{ registrationError }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  useSipClient,
  useCallSession,
  useDTMF,
  useMediaDevices,
  useCallHistory,
  useCallControls,
  type SipClientConfig,
} from '../src'

// Configuration
const tempConfig = ref<Partial<SipClientConfig>>({
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:testuser@example.com',
  password: 'testpassword',
})

const showSettings = ref(false)
const settingsSaved = ref(false)
const showHistory = ref(false)
const showDevices = ref(false)
const showDTMF = ref(false)
const showTransfer = ref(false)
const transferTarget = ref('')
const transferStatus = ref('')
const dialNumber = ref('')
const deviceChanged = ref(false)
const dtmfFeedback = ref('')
const videoEnabled = ref(false)
const registrationError = ref('')

// SIP Client
const sipClient = useSipClient({
  autoConnect: false,
  autoCleanup: true,
})

const {
  isConnected,
  isRegistered,
  connectionState,
  lastError,
  connect,
  disconnect,
  updateConfig,
} = sipClient

// Call Session
const callSession = useCallSession(sipClient)
const {
  callState,
  direction,
  remoteUri,
  isLocalHeld,
  isMuted,
  answerTime,
  makeCall,
  answer,
  reject,
  hangup,
  hold,
  unhold,
  mute,
  unmute,
} = callSession

// DTMF
const dtmf = useDTMF(callSession)
const dtmfDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

// Media Devices
const mediaDevices = useMediaDevices()
const {
  audioInputDevices,
  audioOutputDevices,
  selectedAudioInputId,
  selectedAudioOutputId,
  selectAudioInput,
  selectAudioOutput,
} = mediaDevices

// Call History
const callHistory = useCallHistory()
const { history } = callHistory

// Call Controls
const callControls = useCallControls(callSession)

// Methods
const saveSettings = () => {
  if (tempConfig.value.uri && tempConfig.value.sipUri && tempConfig.value.password) {
    updateConfig(tempConfig.value as SipClientConfig)
    settingsSaved.value = true
    setTimeout(() => {
      settingsSaved.value = false
    }, 3000)
  }
}

const handleConnect = async () => {
  try {
    registrationError.value = ''
    await connect()
  } catch (err: any) {
    registrationError.value = err.message || 'Connection failed'
  }
}

const handleDisconnect = async () => {
  try {
    await disconnect()
  } catch (err) {
    console.error('Disconnect error:', err)
  }
}

const handleMakeCall = async () => {
  if (!dialNumber.value) return
  try {
    await makeCall(dialNumber.value)
  } catch (err) {
    console.error('Call error:', err)
  }
}

const handleAnswer = async () => {
  try {
    await answer()
  } catch (err) {
    console.error('Answer error:', err)
  }
}

const handleReject = async () => {
  try {
    await reject()
  } catch (err) {
    console.error('Reject error:', err)
  }
}

const handleHangup = async () => {
  try {
    await hangup()
  } catch (err) {
    console.error('Hangup error:', err)
  }
}

const handleToggleHold = async () => {
  try {
    if (isLocalHeld.value) {
      await unhold()
    } else {
      await hold()
    }
  } catch (err) {
    console.error('Hold/Unhold error:', err)
  }
}

const handleToggleMute = async () => {
  try {
    if (isMuted.value) {
      await unmute()
    } else {
      await mute()
    }
  } catch (err) {
    console.error('Mute/Unmute error:', err)
  }
}

const handleToggleVideo = () => {
  videoEnabled.value = !videoEnabled.value
}

const toggleDTMF = () => {
  showDTMF.value = !showDTMF.value
}

const sendDTMF = async (digit: string) => {
  try {
    await dtmf.sendTone(digit)
    dtmfFeedback.value = (dtmfFeedback.value + digit).slice(-10)
    setTimeout(() => {
      if (dtmfFeedback.value.endsWith(digit)) {
        dtmfFeedback.value = ''
      }
    }, 3000)
  } catch (err) {
    console.error('DTMF error:', err)
  }
}

const handleTransfer = async () => {
  if (!transferTarget.value) return
  try {
    transferStatus.value = 'Transferring...'
    await callControls.blindTransfer(transferTarget.value)
    transferStatus.value = 'Transfer initiated'
  } catch (err: any) {
    transferStatus.value = `Transfer failed: ${err.message}`
  }
}

const handleInputChange = () => {
  if (selectedAudioInputId.value) {
    selectAudioInput(selectedAudioInputId.value)
    deviceChanged.value = true
    setTimeout(() => {
      deviceChanged.value = false
    }, 3000)
  }
}

const handleOutputChange = () => {
  if (selectedAudioOutputId.value) {
    selectAudioOutput(selectedAudioOutputId.value)
    deviceChanged.value = true
    setTimeout(() => {
      deviceChanged.value = false
    }, 3000)
  }
}

const formatDuration = () => {
  if (!answerTime.value) return '00:00'
  const now = Date.now()
  const diff = Math.floor((now - answerTime.value.getTime()) / 1000)
  const minutes = Math.floor(diff / 60)
  const seconds = diff % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// Watch for connection errors
watch(lastError, (error) => {
  if (error) {
    console.error('SIP Error:', error)
  }
})
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #f3f4f6;
  color: #1f2937;
}

#app {
  padding: 2rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

h1 {
  text-align: center;
  margin-bottom: 2rem;
  color: #111827;
}

h2, h3 {
  margin-bottom: 1rem;
  color: #374151;
}

.status-bar {
  display: flex;
  gap: 2rem;
  justify-content: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-label {
  font-weight: 500;
}

.status-indicator {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  background: #fee2e2;
  color: #991b1b;
  font-size: 0.875rem;
}

.status-indicator.connected {
  background: #d1fae5;
  color: #065f46;
}

.settings-panel {
  max-width: 500px;
  margin: 0 auto 2rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  width: 100%;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #059669;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #4b5563;
}

.connection-controls {
  text-align: center;
  margin-bottom: 2rem;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.dialpad-section {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.dialpad-input {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
}

.dtmf-section {
  margin-top: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.dtmf-pad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-top: 1rem;
}

.dtmf-button {
  padding: 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 1.25rem;
  font-weight: bold;
}

.dtmf-button:hover {
  background: #f3f4f6;
}

.dtmf-feedback {
  margin-top: 1rem;
  padding: 0.5rem;
  background: #dbeafe;
  border-radius: 4px;
  text-align: center;
}

.active-call-panel {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.call-status {
  font-size: 1.25rem;
  font-weight: bold;
  color: #3b82f6;
  margin-bottom: 1rem;
  text-transform: capitalize;
}

.call-info {
  margin-bottom: 1rem;
}

.call-info > div {
  margin-bottom: 0.5rem;
}

.call-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.call-controls .btn {
  flex: 1;
  min-width: 120px;
}

.media-status {
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.transfer-section {
  margin-top: 1rem;
}

.transfer-controls {
  margin-top: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 6px;
}

.transfer-controls input {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.incoming-notification {
  padding: 1rem;
  background: #dbeafe;
  border-radius: 8px;
  text-align: center;
}

.call-history-section,
.device-settings-section {
  margin-bottom: 1rem;
}

.history-panel,
.device-panel {
  margin-top: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.history-entry {
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.settings-btn {
  margin-top: 2rem;
}

.success-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #d1fae5;
  color: #065f46;
  border-radius: 6px;
  text-align: center;
}

.error-message {
  padding: 1rem;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 6px;
  margin-top: 1rem;
  text-align: center;
}

@media (max-width: 768px) {
  .row {
    grid-template-columns: 1fr;
  }
}
</style>
