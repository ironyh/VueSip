<template>
  <div class="card">
    <h2>Call Controls</h2>

    <!-- Incoming Call Alert -->
    <div
      v-if="callState === 'incoming'"
      class="incoming-call"
      role="alert"
      aria-live="assertive"
    >
      <div class="incoming-call-info">
        <h3>Incoming Call</h3>
        <p class="caller-id">{{ remoteDisplayName || remoteUri }}</p>
      </div>
      <div class="button-group" role="group" aria-label="Call actions">
        <button @click="emit('answer')" class="success" aria-label="Answer incoming call">
          Answer
        </button>
        <button @click="emit('reject')" class="danger" aria-label="Reject incoming call">
          Reject
        </button>
      </div>
    </div>

    <!-- Outgoing Call Form -->
    <div v-else-if="callState === 'idle'" class="call-form">
      <div class="form-group">
        <label for="target-uri">Target SIP URI</label>
        <input
          id="target-uri"
          v-model="targetUri"
          type="text"
          placeholder="sip:2000@example.com"
          @keyup.enter="handleMakeCall"
          aria-describedby="target-uri-help"
        />
        <p id="target-uri-help" class="info-message">
          Enter the SIP URI of the person you want to call
        </p>
      </div>
      <button
        @click="handleMakeCall"
        class="primary"
        :disabled="!targetUri.trim()"
        aria-label="Make outgoing call"
      >
        Call
      </button>
    </div>

    <!-- Active Call Controls -->
    <div v-else class="active-call">
      <div class="call-status" role="status" aria-live="polite">
        <h3>{{ callStateLabel }}</h3>
        <p class="caller-id">{{ remoteDisplayName || remoteUri }}</p>
        <p v-if="duration > 0" class="duration" aria-label="Call duration">
          {{ formattedDuration }}
        </p>
      </div>

      <div class="button-group" role="group" aria-label="Call controls">
        <!-- Mute/Unmute -->
        <button
          v-if="callState === 'active'"
          @click="emit('toggleMute')"
          :class="isMuted ? 'warning' : 'secondary'"
          :aria-label="isMuted ? 'Unmute microphone' : 'Mute microphone'"
          :aria-pressed="isMuted"
        >
          {{ isMuted ? 'Unmute' : 'Mute' }}
        </button>

        <!-- Hold/Unhold -->
        <button
          v-if="callState === 'active'"
          @click="emit('toggleHold')"
          :class="isOnHold ? 'warning' : 'secondary'"
          :aria-label="isOnHold ? 'Resume call' : 'Put call on hold'"
          :aria-pressed="isOnHold"
        >
          {{ isOnHold ? 'Unhold' : 'Hold' }}
        </button>

        <!-- Hangup -->
        <button
          v-if="callState !== 'idle'"
          @click="emit('hangup')"
          class="danger"
          aria-label="End call"
        >
          Hangup
        </button>
      </div>

      <!-- Audio Element for Remote Stream -->
      <audio
        v-if="remoteStream"
        ref="remoteAudioRef"
        autoplay
        style="display: none"
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * CallControls Component
 *
 * Displays call controls and handles user interactions during calls.
 * Supports three states:
 * - Idle: Shows form to make outgoing calls
 * - Incoming: Shows answer/reject buttons for incoming calls
 * - Active/Calling/Ringing: Shows call status and control buttons (mute, hold, hangup)
 */
import { ref, computed, watch } from 'vue'

/**
 * Props for the CallControls component
 */
interface Props {
  /** Current state of the call */
  callState: 'idle' | 'calling' | 'incoming' | 'ringing' | 'active' | 'held' | 'ended'
  /** SIP URI of the remote party */
  remoteUri: string | null
  /** Display name of the remote party */
  remoteDisplayName: string | null
  /** Whether the local microphone is muted */
  isMuted: boolean
  /** Whether the call is on hold */
  isOnHold: boolean
  /** Call duration in seconds (for active calls) */
  duration: number
  /** Remote audio stream to play */
  remoteStream: MediaStream | null
}

const props = defineProps<Props>()

/**
 * Events emitted by the CallControls component
 */
const emit = defineEmits<{
  /** Emitted when user initiates an outgoing call */
  makeCall: [target: string]
  /** Emitted when user answers an incoming call */
  answer: []
  /** Emitted when user rejects an incoming call */
  reject: []
  /** Emitted when user hangs up the call */
  hangup: []
  /** Emitted when user toggles mute state */
  toggleMute: []
  /** Emitted when user toggles hold state */
  toggleHold: []
}>()

/**
 * Target URI for outgoing calls
 * Users can modify this default value to match their test setup
 */
const targetUri = ref('sip:2000@example.com')

/**
 * Reference to the remote audio element
 * Used to attach the remote audio stream for playback
 */
const remoteAudioRef = ref<HTMLAudioElement | null>(null)

/**
 * Computed call state label for display
 * Converts internal call state into user-friendly text
 */
const callStateLabel = computed(() => {
  switch (props.callState) {
    case 'calling':
      return 'Calling...'
    case 'ringing':
      return 'Ringing...'
    case 'active':
      return props.isOnHold ? 'On Hold' : 'Active Call'
    case 'held':
      return 'Call Held'
    case 'ended':
      return 'Call Ended'
    default:
      return ''
  }
})

/**
 * Format duration as MM:SS
 * Converts duration in seconds to a readable time format
 */
const formattedDuration = computed(() => {
  const minutes = Math.floor(props.duration / 60)
  const seconds = props.duration % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

/**
 * Handle making an outgoing call
 * Validates the target URI and emits the makeCall event
 */
const handleMakeCall = () => {
  if (targetUri.value.trim()) {
    emit('makeCall', targetUri.value.trim())
  }
}

/**
 * Watch for changes to remote stream and attach it to audio element
 * This ensures that remote audio is played when a stream becomes available
 */
watch(
  () => props.remoteStream,
  (newStream) => {
    if (remoteAudioRef.value && newStream) {
      // Attach the remote stream to the audio element for playback
      remoteAudioRef.value.srcObject = newStream
    }
  },
  { immediate: true } // Run immediately to handle existing streams
)
</script>

<style scoped>
.incoming-call,
.call-form,
.active-call {
  padding: 1rem 0;
}

.incoming-call-info {
  margin-bottom: 1.5rem;
  text-align: center;
}

.incoming-call-info h3 {
  margin-bottom: 0.5rem;
  color: var(--gray-900);
}

.caller-id {
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--gray-700);
  margin-bottom: 0.25rem;
}

.call-status {
  margin-bottom: 1.5rem;
  text-align: center;
}

.call-status h3 {
  margin-bottom: 0.5rem;
  color: var(--gray-900);
}

.duration {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary-color);
  margin-top: 0.5rem;
}

.button-group {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.button-group button {
  flex: 1;
  min-width: 100px;
}
</style>
