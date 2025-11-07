<template>
  <div
    class="call-line"
    :class="{
      'call-line--active': isActiveLine,
      'call-line--held': isOnHold,
      'call-line--ringing': state === 'ringing',
      'call-line--calling': state === 'calling',
      'call-line--connected': state === 'active',
      'call-line--terminated': state === 'terminated' || state === 'failed',
    }"
    @click="handleLineClick"
  >
    <!-- Line Header -->
    <div class="call-line__header">
      <div class="call-line__number">
        <span class="line-badge" :class="{ active: isActiveLine }">Line {{ lineNumber }}</span>
        <span class="state-badge" :class="stateClass">{{ stateText }}</span>
      </div>
      <div class="call-line__duration" v-if="state === 'active' || state === 'held'">
        {{ formattedDuration }}
      </div>
    </div>

    <!-- Caller Info -->
    <div class="call-line__info">
      <div class="caller-name">{{ displayName }}</div>
      <div class="caller-uri">{{ remoteUri || 'Unknown' }}</div>
    </div>

    <!-- Audio Elements (hidden, for WebRTC streams) -->
    <audio ref="localAudioRef" autoplay muted></audio>
    <audio ref="remoteAudioRef" autoplay :muted="!isActiveLine"></audio>

    <!-- Call Controls -->
    <div class="call-line__controls">
      <!-- Incoming Call Controls -->
      <template v-if="state === 'ringing'">
        <button @click.stop="$emit('answer')" class="btn btn--success" title="Answer">
          <span class="btn-icon">📞</span>
          Answer
        </button>
        <button @click.stop="$emit('reject')" class="btn btn--danger" title="Reject">
          <span class="btn-icon">❌</span>
          Reject
        </button>
      </template>

      <!-- Active Call Controls -->
      <template v-else-if="state === 'active' || state === 'held' || isOnHold">
        <button
          @click.stop="handleToggleHold"
          class="btn btn--secondary"
          :class="{ active: isOnHold }"
          :title="isOnHold ? 'Resume' : 'Hold'"
        >
          <span class="btn-icon">{{ isOnHold ? '▶️' : '⏸️' }}</span>
          {{ isOnHold ? 'Resume' : 'Hold' }}
        </button>

        <button
          @click.stop="handleToggleMute"
          class="btn btn--secondary"
          :class="{ active: isMuted }"
          :title="isMuted ? 'Unmute' : 'Mute'"
        >
          <span class="btn-icon">{{ isMuted ? '🔇' : '🔊' }}</span>
          {{ isMuted ? 'Unmute' : 'Mute' }}
        </button>

        <button
          @click.stop="showDtmfPad = !showDtmfPad"
          class="btn btn--secondary"
          :class="{ active: showDtmfPad }"
          :disabled="isOnHold"
          title="DTMF"
        >
          <span class="btn-icon">🔢</span>
          DTMF
        </button>

        <button @click.stop="$emit('hangup')" class="btn btn--danger" title="Hangup">
          <span class="btn-icon">📵</span>
          Hangup
        </button>
      </template>

      <!-- Calling State -->
      <template v-else-if="state === 'calling'">
        <div class="calling-indicator">
          <span class="spinner"></span>
          Calling...
        </div>
        <button @click.stop="$emit('hangup')" class="btn btn--danger" title="Cancel">
          <span class="btn-icon">❌</span>
          Cancel
        </button>
      </template>

      <!-- Terminated State -->
      <template v-else-if="state === 'terminated' || state === 'failed'">
        <div class="terminated-info">
          <span class="status-icon">{{ state === 'failed' ? '❌' : '📴' }}</span>
          {{ state === 'failed' ? 'Call Failed' : 'Call Ended' }}
        </div>
      </template>
    </div>

    <!-- DTMF Pad (shown when active and not on hold) -->
    <div v-if="showDtmfPad && state === 'active' && !isOnHold" class="dtmf-pad">
      <div class="dtmf-grid">
        <button
          v-for="tone in dtmfTones"
          :key="tone"
          @click.stop="handleDtmf(tone)"
          class="dtmf-btn"
        >
          {{ tone }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { CallState, CallSession } from 'vuesip'

// Props
interface Props {
  lineNumber: number
  session: CallSession | null
  state: CallState
  remoteUri: string | null
  remoteDisplayName: string | null
  duration: number
  isOnHold: boolean
  isMuted: boolean
  isActiveLine: boolean
  localStream: MediaStream | null
  remoteStream: MediaStream | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  answer: []
  reject: []
  hangup: []
  hold: []
  unhold: []
  mute: []
  unmute: []
  makeActive: []
  sendDtmf: [tone: string]
}>()

// Local state
const showDtmfPad = ref(false)
const localAudioRef = ref<HTMLAudioElement | null>(null)
const remoteAudioRef = ref<HTMLAudioElement | null>(null)

// DTMF tones
const dtmfTones = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

// Computed
const displayName = computed(() => {
  return props.remoteDisplayName || props.remoteUri || 'Unknown'
})

const formattedDuration = computed(() => {
  const mins = Math.floor(props.duration / 60)
  const secs = props.duration % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

const stateClass = computed(() => {
  const stateMap: Record<string, string> = {
    idle: 'state-idle',
    ringing: 'state-ringing',
    calling: 'state-calling',
    active: 'state-active',
    held: 'state-held',
    terminated: 'state-terminated',
    failed: 'state-failed',
  }
  return stateMap[props.state] || 'state-idle'
})

const stateText = computed(() => {
  if (props.isOnHold) return 'On Hold'

  const textMap: Record<string, string> = {
    idle: 'Idle',
    ringing: 'Incoming',
    calling: 'Calling',
    active: 'Active',
    held: 'On Hold',
    terminated: 'Ended',
    failed: 'Failed',
  }
  return textMap[props.state] || props.state
})

// Methods
function handleLineClick() {
  if (props.state === 'active' || props.state === 'held' || props.isOnHold) {
    emit('makeActive')
  }
}

function handleToggleHold() {
  if (props.isOnHold) {
    emit('unhold')
  } else {
    emit('hold')
  }
}

function handleToggleMute() {
  if (props.isMuted) {
    emit('unmute')
  } else {
    emit('mute')
  }
}

function handleDtmf(tone: string) {
  emit('sendDtmf', tone)
}

// Watch for stream changes and attach to audio elements
watch(
  () => props.localStream,
  (stream) => {
    if (localAudioRef.value && stream) {
      localAudioRef.value.srcObject = stream
    }
  }
)

watch(
  () => props.remoteStream,
  (stream) => {
    if (remoteAudioRef.value && stream) {
      remoteAudioRef.value.srcObject = stream
    }
  }
)

// Watch active line status to control audio playback
watch(
  () => props.isActiveLine,
  (isActive) => {
    if (remoteAudioRef.value) {
      // Only the active line should have unmuted audio
      remoteAudioRef.value.muted = !isActive
    }
  }
)

// Initialize audio on mount
onMounted(() => {
  if (localAudioRef.value && props.localStream) {
    localAudioRef.value.srcObject = props.localStream
  }
  if (remoteAudioRef.value && props.remoteStream) {
    remoteAudioRef.value.srcObject = props.remoteStream
    remoteAudioRef.value.muted = !props.isActiveLine
  }
})
</script>

<style scoped>
.call-line {
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.call-line:hover {
  border-color: #dee2e6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.call-line--active {
  background: linear-gradient(135deg, #e0e7ff 0%, #f0e7ff 100%);
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.call-line--held {
  background: #fff3cd;
  border-color: #ffc107;
}

.call-line--ringing {
  background: #d1ecf1;
  border-color: #17a2b8;
  animation: pulse 1.5s ease-in-out infinite;
}

.call-line--calling {
  background: #e7f3ff;
  border-color: #007bff;
}

.call-line--connected {
  background: #d4edda;
  border-color: #28a745;
}

.call-line--terminated {
  opacity: 0.7;
  cursor: default;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.call-line__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.call-line__number {
  display: flex;
  gap: 8px;
  align-items: center;
}

.line-badge {
  display: inline-block;
  padding: 4px 12px;
  background: #6c757d;
  color: white;
  border-radius: 20px;
  font-size: 0.85em;
  font-weight: 600;
}

.line-badge.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.state-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.8em;
  font-weight: 500;
}

.state-idle {
  background: #e9ecef;
  color: #6c757d;
}

.state-ringing {
  background: #17a2b8;
  color: white;
}

.state-calling {
  background: #007bff;
  color: white;
}

.state-active {
  background: #28a745;
  color: white;
}

.state-held {
  background: #ffc107;
  color: #333;
}

.state-terminated, .state-failed {
  background: #dc3545;
  color: white;
}

.call-line__duration {
  font-size: 1.2em;
  font-weight: 600;
  color: #495057;
  font-family: 'Courier New', monospace;
}

.call-line__info {
  margin-bottom: 12px;
}

.caller-name {
  font-size: 1.1em;
  font-weight: 600;
  color: #212529;
  margin-bottom: 4px;
}

.caller-uri {
  font-size: 0.9em;
  color: #6c757d;
}

.call-line__controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.9em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-icon {
  font-size: 1.1em;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.btn:active {
  transform: translateY(0);
}

.btn--success {
  background: #28a745;
  color: white;
}

.btn--success:hover {
  background: #218838;
}

.btn--danger {
  background: #dc3545;
  color: white;
}

.btn--danger:hover {
  background: #c82333;
}

.btn--secondary {
  background: #6c757d;
  color: white;
}

.btn--secondary:hover {
  background: #5a6268;
}

.btn--secondary.active {
  background: #ffc107;
  color: #333;
}

.calling-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #007bff;
  font-weight: 600;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 3px solid #e9ecef;
  border-top-color: #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.terminated-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6c757d;
  font-weight: 600;
}

.status-icon {
  font-size: 1.2em;
}

/* DTMF Pad */
.dtmf-pad {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #dee2e6;
}

.dtmf-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  max-width: 200px;
}

.dtmf-btn {
  padding: 12px;
  background: white;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.dtmf-btn:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.dtmf-btn:active {
  transform: scale(0.95);
}
</style>
