<template>
  <div class="agent-status-toggle">
    <label>Status:</label>
    <div class="status-buttons">
      <button
        class="status-btn"
        :class="{ active: agentStatus === 'available' }"
        @click="$emit('update:status', 'available')"
        aria-label="Set agent status to available"
        :aria-pressed="agentStatus === 'available'"
      >
        <span class="status-dot available" aria-hidden="true"></span>
        Available
      </button>
      <button
        class="status-btn"
        :class="{ active: agentStatus === 'busy' }"
        @click="$emit('update:status', 'busy')"
        aria-label="Set agent status to busy"
        :aria-pressed="agentStatus === 'busy'"
      >
        <span class="status-dot busy" aria-hidden="true"></span>
        Busy
      </button>
      <button
        class="status-btn"
        :class="{ active: agentStatus === 'away' }"
        @click="$emit('update:status', 'away')"
        aria-label="Set agent status to away"
        :aria-pressed="agentStatus === 'away'"
      >
        <span class="status-dot away" aria-hidden="true"></span>
        Away
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  agentStatus: 'available' | 'busy' | 'away'
}>()

defineEmits<{
  'update:status': [status: 'available' | 'busy' | 'away']
}>()
</script>

<style scoped>
.agent-status-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.agent-status-toggle label {
  margin: 0;
  font-weight: 500;
  color: #374151;
}

.status-buttons {
  display: flex;
  gap: 0.5rem;
}

.status-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.status-btn:hover {
  border-color: #9ca3af;
  background: #f9fafb;
}

.status-btn.active {
  border-color: #3b82f6;
  background: #eff6ff;
  font-weight: 500;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.available {
  background: #10b981;
}

.status-dot.busy {
  background: #ef4444;
}

.status-dot.away {
  background: #f59e0b;
}
</style>
