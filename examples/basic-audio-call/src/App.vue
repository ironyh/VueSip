<template>
  <div class="app">
    <header>
      <h1>Basic Audio Call Example</h1>
      <p class="subtitle">
        A simple one-to-one audio call demonstration using VueSip composables
      </p>
    </header>

    <main>
      <!-- Connection Panel -->
      <ConnectionPanel
        :is-connected="isConnected"
        :is-registered="isRegistered"
        :connecting="connecting"
        :error="connectionError"
        @connect="handleConnect"
        @disconnect="handleDisconnect"
      />

      <!-- Audio Device Selection -->
      <div v-if="isConnected" class="card">
        <h2>Audio Devices</h2>
        <div class="form-group">
          <label for="audio-input">Microphone</label>
          <select
            id="audio-input"
            v-model="selectedAudioInputId"
            @change="handleAudioInputChange"
            aria-label="Select microphone device"
          >
            <option
              v-for="device in audioInputDevices"
              :key="device.deviceId"
              :value="device.deviceId"
            >
              {{ device.label || `Microphone ${device.deviceId.slice(0, 8)}` }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="audio-output">Speaker</label>
          <select
            id="audio-output"
            v-model="selectedAudioOutputId"
            @change="handleAudioOutputChange"
            aria-label="Select speaker device"
          >
            <option
              v-for="device in audioOutputDevices"
              :key="device.deviceId"
              :value="device.deviceId"
            >
              {{ device.label || `Speaker ${device.deviceId.slice(0, 8)}` }}
            </option>
          </select>
        </div>
      </div>

      <!-- Call Controls -->
      <CallControls
        v-if="isConnected && isRegistered"
        :call-state="callState"
        :remote-uri="remoteUri"
        :remote-display-name="remoteDisplayName"
        :is-muted="isMuted"
        :is-on-hold="isOnHold"
        :duration="duration"
        :remote-stream="remoteStream"
        @make-call="handleMakeCall"
        @answer="handleAnswer"
        @reject="handleReject"
        @hangup="handleHangup"
        @toggle-mute="handleToggleMute"
        @toggle-hold="handleToggleHold"
      />

      <!-- Call Statistics (Debug Info) -->
      <div v-if="session && callState === 'active'" class="card debug-info">
        <h3>Debug Information</h3>
        <div class="stats-grid">
          <div>
            <strong>Call ID:</strong> {{ callId || 'N/A' }}
          </div>
          <div>
            <strong>Direction:</strong> {{ direction || 'N/A' }}
          </div>
          <div>
            <strong>Local URI:</strong> {{ localUri || 'N/A' }}
          </div>
          <div>
            <strong>State:</strong> {{ callState }}
          </div>
          <div>
            <strong>Muted:</strong> {{ isMuted ? 'Yes' : 'No' }}
          </div>
          <div>
            <strong>On Hold:</strong> {{ isOnHold ? 'Yes' : 'No' }}
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useSipClient, useCallSession, useMediaDevices } from 'vuesip'
import ConnectionPanel from './components/ConnectionPanel.vue'
import CallControls from './components/CallControls.vue'

/**
 * SIP Client Composable
 * Manages the WebSocket connection to the SIP server and registration
 */
const {
  connect,
  disconnect,
  isConnected,
  isRegistered,
  error: sipError,
  updateConfig,
  getClient,
} = useSipClient()

// Get SIP client ref for useCallSession
const sipClientRef = computed(() => getClient())

/**
 * Call Session Composable
 * Manages call state, controls, and media streams
 */
const {
  session,
  state: callState,
  callId,
  direction,
  localUri,
  remoteUri,
  remoteDisplayName,
  isOnHold,
  isMuted,
  localStream,
  remoteStream,
  duration,
  makeCall,
  answer,
  reject,
  hangup,
  hold,
  unhold,
  mute,
  unmute,
} = useCallSession(sipClientRef)

/**
 * Media Devices Composable
 * Manages audio input/output device enumeration and selection
 */
const {
  audioInputDevices,
  audioOutputDevices,
  selectedAudioInputId,
  selectedAudioOutputId,
  enumerateDevices,
  selectAudioInput,
  selectAudioOutput,
} = useMediaDevices()

/**
 * Local state for connection management
 */
const connecting = ref(false)
const connectionError = ref('')

/**
 * Handle SIP connection
 */
const handleConnect = async (config: {
  uri: string
  sipUri: string
  password: string
  displayName?: string
}) => {
  try {
    connecting.value = true
    connectionError.value = ''

    // Update SIP client configuration
    const validationResult = updateConfig({
      uri: config.uri,
      sipUri: config.sipUri,
      password: config.password,
      displayName: config.displayName,
      // Enable automatic registration
      autoRegister: true,
      // Connection options
      connectionTimeout: 10000,
      registerExpires: 600,
    })

    if (!validationResult.valid) {
      throw new Error(`Invalid configuration: ${validationResult.errors?.join(', ')}`)
    }

    // Connect to SIP server
    await connect()

    // Enumerate audio devices after successful connection
    await enumerateDevices()
  } catch (error) {
    connectionError.value = error instanceof Error ? error.message : 'Connection failed'
    console.error('Connection error:', error)
  } finally {
    connecting.value = false
  }
}

/**
 * Handle SIP disconnection
 */
const handleDisconnect = async () => {
  try {
    // Hangup any active call first
    if (session.value && callState.value !== 'idle') {
      await hangup()
    }
    // Disconnect from SIP server
    await disconnect()
  } catch (error) {
    console.error('Disconnect error:', error)
  }
}

/**
 * Handle making an outgoing call
 */
const handleMakeCall = async (target: string) => {
  try {
    // Make a call with audio enabled
    await makeCall(target, {
      audio: true,
      video: false,
    })
  } catch (error) {
    console.error('Make call error:', error)
    alert(`Failed to make call: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Handle answering an incoming call
 */
const handleAnswer = async () => {
  try {
    // Answer the incoming call with audio
    await answer({
      audio: true,
      video: false,
    })
  } catch (error) {
    console.error('Answer error:', error)
    alert(`Failed to answer call: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Handle rejecting an incoming call
 */
const handleReject = async () => {
  try {
    // Reject with 486 Busy Here status code
    await reject(486)
  } catch (error) {
    console.error('Reject error:', error)
  }
}

/**
 * Handle hanging up the current call
 */
const handleHangup = async () => {
  try {
    await hangup()
  } catch (error) {
    console.error('Hangup error:', error)
  }
}

/**
 * Handle toggling mute state
 */
const handleToggleMute = async () => {
  try {
    if (isMuted.value) {
      await unmute()
    } else {
      await mute()
    }
  } catch (error) {
    console.error('Toggle mute error:', error)
  }
}

/**
 * Handle toggling hold state
 */
const handleToggleHold = async () => {
  try {
    if (isOnHold.value) {
      await unhold()
    } else {
      await hold()
    }
  } catch (error) {
    console.error('Toggle hold error:', error)
  }
}

/**
 * Handle audio input device change
 */
const handleAudioInputChange = () => {
  try {
    if (selectedAudioInputId.value) {
      selectAudioInput(selectedAudioInputId.value)
    }
  } catch (error) {
    console.error('Audio input change error:', error)
  }
}

/**
 * Handle audio output device change
 */
const handleAudioOutputChange = () => {
  try {
    if (selectedAudioOutputId.value) {
      selectAudioOutput(selectedAudioOutputId.value)
    }
  } catch (error) {
    console.error('Audio output change error:', error)
  }
}

/**
 * Watch for SIP errors and display them
 */
watch(sipError, (error) => {
  if (error) {
    connectionError.value = error
  }
})

/**
 * Request microphone permissions on mount
 */
onMounted(async () => {
  try {
    // Request microphone permissions early to enumerate devices
    await navigator.mediaDevices.getUserMedia({ audio: true })
    await enumerateDevices()
  } catch (error) {
    console.warn('Could not get microphone permissions:', error)
  }
})
</script>

<style scoped>
.app {
  min-height: 100vh;
}

header {
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--gray-200);
}

.subtitle {
  color: var(--gray-600);
  font-size: 1rem;
  margin-top: 0.5rem;
}

main {
  max-width: 800px;
  margin: 0 auto;
}

.debug-info {
  background-color: var(--gray-50);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.stats-grid div {
  font-size: 0.875rem;
}

.stats-grid strong {
  color: var(--gray-700);
  margin-right: 0.5rem;
}
</style>
