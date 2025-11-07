<template>
  <div
    class="participant-card"
    :class="{ 'is-local': isLocal, 'is-speaking': isSpeaking }"
    role="article"
    :aria-label="`Participant: ${participant.displayName || 'Unknown'}`"
  >
    <!-- Participant Header -->
    <div class="participant-header">
      <div class="participant-avatar">
        {{ avatarInitials }}
      </div>

      <div class="participant-info">
        <div class="participant-name">
          {{ participant.displayName || 'Unknown' }}
          <span v-if="isLocal" class="local-badge">(You)</span>
          <span v-if="participant.isModerator" class="moderator-badge">Moderator</span>
        </div>
        <div class="participant-uri">
          {{ participant.uri }}
        </div>
      </div>
    </div>

    <!-- Participant Status -->
    <div class="participant-status">
      <div class="status-indicators">
        <span
          :class="['indicator', `indicator-${participant.state}`]"
          :title="`State: ${participant.state}`"
        >
          {{ stateLabel }}
        </span>

        <span
          v-if="participant.isMuted"
          class="indicator indicator-muted"
          title="Muted"
        >
          Muted
        </span>

        <span
          v-if="participant.isOnHold"
          class="indicator indicator-hold"
          title="On Hold"
        >
          On Hold
        </span>
      </div>

      <!-- Audio Level Indicator -->
      <div
        v-if="participant.state === 'connected'"
        class="audio-level"
        role="progressbar"
        :aria-valuenow="audioLevelPercent"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`Audio level: ${audioLevelPercent}%`"
      >
        <div class="audio-level-bar">
          <div
            class="audio-level-fill"
            :style="{ width: `${audioLevelPercent}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Participant Controls -->
    <div class="participant-controls" role="group" :aria-label="`Controls for ${participant.displayName || 'participant'}`">
      <button
        v-if="!participant.isMuted"
        @click="$emit('mute')"
        class="control-btn"
        :aria-label="`Mute ${participant.displayName || 'participant'}`"
        title="Mute participant"
      >
        Mute
      </button>
      <button
        v-else
        @click="$emit('unmute')"
        class="control-btn"
        :aria-label="`Unmute ${participant.displayName || 'participant'}`"
        title="Unmute participant"
      >
        Unmute
      </button>

      <button
        v-if="!isLocal"
        @click="handleRemove"
        class="control-btn danger"
        :aria-label="`Remove ${participant.displayName || 'participant'} from conference`"
        title="Remove participant"
      >
        Remove
      </button>
    </div>

    <!-- Join Time -->
    <div class="participant-meta">
      <small>Joined {{ joinedAtFormatted }}</small>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import type { Participant } from 'vuesip'

/**
 * Participant Card Component
 *
 * Displays individual participant information and controls.
 * Shows:
 * - Avatar with initials
 * - Display name and URI
 * - Connection state
 * - Mute/on-hold status
 * - Audio level visualization
 * - Mute/unmute/remove controls
 */

interface Props {
  participant: Participant
  isLocal: boolean
}

interface Emits {
  (e: 'mute'): void
  (e: 'unmute'): void
  (e: 'remove'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Avatar initials
const avatarInitials = computed(() => {
  const name = props.participant.displayName || props.participant.uri
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
})

// State label
const stateLabel = computed(() => {
  const state = props.participant.state
  return state.charAt(0).toUpperCase() + state.slice(1)
})

// Audio level (0-100%)
const audioLevelPercent = computed(() => {
  const level = props.participant.audioLevel || 0
  return Math.round(level * 100)
})

// Check if participant is speaking (audio level above threshold)
const isSpeaking = ref(false)
const SPEAKING_THRESHOLD = 0.1 // 10% audio level

watch(
  () => props.participant.audioLevel,
  (level) => {
    isSpeaking.value = (level || 0) > SPEAKING_THRESHOLD
  }
)

// Format joined time - updates reactively every minute
const currentTime = ref(new Date())
let timeUpdateInterval: number | null = null

const joinedAtFormatted = computed(() => {
  const now = currentTime.value
  const joined = props.participant.joinedAt
  const diffMs = now.getTime() - joined.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'just now'
  if (diffMins === 1) return '1 minute ago'
  if (diffMins < 60) return `${diffMins} minutes ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours === 1) return '1 hour ago'
  return `${diffHours} hours ago`
})

// Update current time every 30 seconds for reactive join time display
onMounted(() => {
  timeUpdateInterval = window.setInterval(() => {
    currentTime.value = new Date()
  }, 30000) // Update every 30 seconds
})

onUnmounted(() => {
  if (timeUpdateInterval !== null) {
    clearInterval(timeUpdateInterval)
    timeUpdateInterval = null
  }
})

// Handle remove with confirmation
const handleRemove = () => {
  const name = props.participant.displayName || props.participant.uri
  if (confirm(`Remove ${name} from the conference?`)) {
    emit('remove')
  }
}
</script>

<style scoped>
.participant-card {
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.02);
  transition: all 0.3s ease;
}

.participant-card.is-local {
  border-color: #646cff;
  background-color: rgba(100, 108, 255, 0.1);
}

.participant-card.is-speaking {
  border-color: #4caf50;
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
}

.participant-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.participant-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.participant-info {
  flex: 1;
  min-width: 0;
}

.participant-name {
  font-weight: 600;
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.local-badge,
.moderator-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
  font-weight: normal;
}

.local-badge {
  background-color: #646cff;
  color: white;
}

.moderator-badge {
  background-color: #ff9800;
  color: white;
}

.participant-uri {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.participant-status {
  margin-bottom: 1rem;
}

.status-indicators {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.indicator {
  font-size: 0.75rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-weight: 500;
}

.indicator-connected {
  background-color: #4caf50;
  color: white;
}

.indicator-connecting {
  background-color: #ff9800;
  color: white;
}

.indicator-disconnected {
  background-color: #f44336;
  color: white;
}

.indicator-muted {
  background-color: #9e9e9e;
  color: white;
}

.indicator-hold {
  background-color: #ff9800;
  color: white;
}

.audio-level {
  margin-top: 0.5rem;
}

.audio-level-bar {
  height: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.audio-level-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50 0%, #8bc34a 50%, #ffeb3b 100%);
  transition: width 0.1s ease;
}

.participant-controls {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.control-btn {
  flex: 1;
  padding: 0.5rem;
  font-size: 0.875rem;
}

.participant-meta {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
}

@media (prefers-color-scheme: light) {
  .participant-card {
    border-color: rgba(0, 0, 0, 0.1);
    background-color: rgba(0, 0, 0, 0.02);
  }

  .participant-card.is-local {
    border-color: #646cff;
    background-color: rgba(100, 108, 255, 0.1);
  }

  .participant-uri {
    color: rgba(0, 0, 0, 0.6);
  }

  .audio-level-bar {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .participant-meta {
    color: rgba(0, 0, 0, 0.5);
  }
}
</style>
