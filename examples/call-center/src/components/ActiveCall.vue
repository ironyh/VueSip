<template>
  <div class="active-call card">
    <h2>Active Call</h2>

    <!-- Call Header -->
    <div class="call-header">
      <div class="caller-info">
        <div class="caller-name">{{ remoteDisplayName || 'Unknown Caller' }}</div>
        <div class="caller-number">{{ formatUri(remoteUri) }}</div>
      </div>
      <div class="call-status">
        <span class="status-badge" :class="state">{{ stateText }}</span>
      </div>
    </div>

    <!-- Call Timer -->
    <div class="call-timer">
      <div class="timer-display">{{ formatDuration(duration) }}</div>
      <div class="timer-label">Duration</div>
    </div>

    <!-- Call Controls -->
    <div class="call-controls">
      <button
        class="control-btn"
        :class="{ active: isMuted }"
        @click="$emit('mute')"
        :title="isMuted ? 'Unmute' : 'Mute'"
      >
        <svg v-if="!isMuted" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="1" y1="1" x2="23" y2="23"></line>
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
          <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
        <span>{{ isMuted ? 'Unmute' : 'Mute' }}</span>
      </button>

      <button
        class="control-btn"
        :class="{ active: isOnHold }"
        @click="$emit('hold')"
        :title="isOnHold ? 'Resume' : 'Hold'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
        <span>{{ isOnHold ? 'Resume' : 'Hold' }}</span>
      </button>

      <button
        class="control-btn hangup-btn"
        @click="$emit('hangup')"
        title="Hangup"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
        </svg>
        <span>Hangup</span>
      </button>
    </div>

    <!-- DTMF Dialpad -->
    <div class="dtmf-section">
      <button
        class="toggle-dtmf"
        @click="showDialpad = !showDialpad"
        :aria-label="showDialpad ? 'Hide dialpad' : 'Show dialpad'"
        :aria-expanded="showDialpad"
      >
        {{ showDialpad ? 'Hide' : 'Show' }} Dialpad
      </button>

      <div v-if="showDialpad" class="dialpad" role="group" aria-label="DTMF dialpad">
        <button
          v-for="digit in dialpadDigits"
          :key="digit"
          class="dialpad-btn"
          @click="$emit('send-dtmf', digit)"
          :aria-label="`Send DTMF tone ${digit}`"
        >
          {{ digit }}
        </button>
      </div>
    </div>

    <!-- Call Notes -->
    <div class="call-notes">
      <label for="notes">Call Notes</label>
      <textarea
        id="notes"
        :value="callNotes"
        @input="$emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
        placeholder="Add notes about this call..."
        rows="4"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CallSession } from 'vuesip'

// ============================================================================
// Props & Emits
// ============================================================================

const props = defineProps<{
  session: CallSession | null
  state: string
  remoteUri: string | null
  remoteDisplayName: string | null
  duration: number
  isMuted: boolean
  isOnHold: boolean
  callNotes: string
}>()

defineEmits<{
  hangup: []
  mute: []
  hold: []
  'send-dtmf': [digit: string]
  'update:notes': [notes: string]
}>()

// ============================================================================
// State
// ============================================================================

const showDialpad = ref(false)

const dialpadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

// ============================================================================
// Computed
// ============================================================================

const stateText = computed(() => {
  switch (props.state) {
    case 'calling':
      return 'Calling...'
    case 'ringing':
      return 'Ringing...'
    case 'active':
      return props.isOnHold ? 'On Hold' : 'Active'
    case 'answering':
      return 'Answering...'
    default:
      return props.state
  }
})

// ============================================================================
// Methods
// ============================================================================

const formatUri = (uri: string | null): string => {
  if (!uri) return 'Unknown'
  const match = uri.match(/sip:([^@]+)/)
  return match ? match[1] : uri
}

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.active-call {
  background: white;
}

.active-call h2 {
  font-size: 1.125rem;
  margin-bottom: 1.5rem;
  color: #111827;
}

.call-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
}

.caller-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.25rem;
}

.caller-number {
  font-size: 0.875rem;
  color: #6b7280;
}

.status-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.active {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.calling,
.status-badge.ringing,
.status-badge.answering {
  background: #dbeafe;
  color: #1e40af;
}

.call-timer {
  text-align: center;
  padding: 2rem;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: white;
}

.timer-display {
  font-size: 3rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  margin-bottom: 0.5rem;
}

.timer-label {
  font-size: 0.875rem;
  opacity: 0.9;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.call-controls {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.control-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #374151;
}

.control-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.control-btn.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1e40af;
}

.control-btn.hangup-btn {
  grid-column: 1 / -1;
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}

.control-btn.hangup-btn:hover {
  background: #dc2626;
  border-color: #dc2626;
  color: white;
}

.control-btn span {
  font-size: 0.875rem;
  font-weight: 500;
}

.dtmf-section {
  margin-bottom: 2rem;
}

.toggle-dtmf {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  transition: all 0.2s;
}

.toggle-dtmf:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.dialpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-top: 1rem;
}

.dialpad-btn {
  padding: 1rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  font-size: 1.25rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  color: #111827;
}

.dialpad-btn:hover {
  background: #f3f4f6;
  border-color: #3b82f6;
}

.dialpad-btn:active {
  transform: scale(0.95);
}

.call-notes label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.call-notes textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.875rem;
  resize: vertical;
}

.call-notes textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
</style>
