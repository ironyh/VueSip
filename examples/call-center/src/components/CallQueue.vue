<template>
  <div class="call-queue card">
    <h2>Call Queue</h2>

    <div v-if="queue.length === 0" class="empty-state">
      <p>No calls in queue</p>
      <p class="helper-text">
        {{ agentStatus === 'available' ? 'Waiting for incoming calls...' : 'Set status to Available to receive calls' }}
      </p>
    </div>

    <div v-else class="queue-list">
      <div
        v-for="call in sortedQueue"
        :key="call.id"
        class="queue-item"
        :class="{ urgent: call.waitTime > 60 }"
      >
        <div class="call-info">
          <div class="caller-name">{{ call.displayName || 'Unknown' }}</div>
          <div class="caller-number">{{ formatUri(call.from) }}</div>
          <div class="wait-time">
            <span class="wait-label">Wait:</span>
            <span :class="{ 'wait-urgent': call.waitTime > 60 }">
              {{ formatWaitTime(call.waitTime) }}
            </span>
          </div>
        </div>
        <div class="call-actions">
          <button
            class="btn btn-success btn-sm"
            :disabled="agentStatus !== 'available'"
            @click="$emit('answer', call)"
            :aria-label="`Answer call from ${call.displayName || 'Unknown'}`"
          >
            Answer
          </button>
        </div>
      </div>
    </div>

    <div v-if="queue.length > 0" class="queue-summary">
      <span>{{ queue.length }} {{ queue.length === 1 ? 'call' : 'calls' }} waiting</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// ============================================================================
// Types
// ============================================================================

interface QueuedCall {
  id: string
  from: string
  displayName?: string
  waitTime: number
  priority?: number
}

// ============================================================================
// Props & Emits
// ============================================================================

const props = defineProps<{
  queue: QueuedCall[]
  agentStatus: 'available' | 'busy' | 'away'
}>()

defineEmits<{
  answer: [call: QueuedCall]
}>()

// ============================================================================
// Computed
// ============================================================================

/**
 * Sort queue by priority (highest first) and wait time (longest first)
 */
const sortedQueue = computed(() => {
  return [...props.queue].sort((a, b) => {
    // First by priority (higher priority first)
    if ((a.priority || 0) !== (b.priority || 0)) {
      return (b.priority || 0) - (a.priority || 0)
    }
    // Then by wait time (longer wait first)
    return b.waitTime - a.waitTime
  })
})

// ============================================================================
// Methods
// ============================================================================

const formatUri = (uri: string): string => {
  // Extract username from SIP URI
  const match = uri.match(/sip:([^@]+)/)
  return match ? match[1] : uri
}

const formatWaitTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  if (mins === 0) {
    return `${secs}s`
  }
  return `${mins}m ${secs}s`
}
</script>

<style scoped>
.call-queue {
  background: white;
  max-height: 400px;
  display: flex;
  flex-direction: column;
}

.call-queue h2 {
  font-size: 1.125rem;
  margin-bottom: 1rem;
  color: #111827;
}

.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: #6b7280;
}

.empty-state p {
  margin-bottom: 0.5rem;
}

.helper-text {
  font-size: 0.875rem;
  color: #9ca3af;
}

.queue-list {
  flex: 1;
  overflow-y: auto;
}

.queue-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 0.75rem;
  transition: all 0.2s;
}

.queue-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.queue-item.urgent {
  border-color: #f59e0b;
  background: #fffbeb;
}

.call-info {
  flex: 1;
}

.caller-name {
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.25rem;
}

.caller-number {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.wait-time {
  font-size: 0.75rem;
  color: #6b7280;
}

.wait-label {
  margin-right: 0.25rem;
}

.wait-urgent {
  color: #f59e0b;
  font-weight: 600;
}

.call-actions {
  margin-left: 1rem;
}

.queue-summary {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
  text-align: center;
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}
</style>
