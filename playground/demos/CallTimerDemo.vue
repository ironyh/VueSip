<template>
  <div class="call-timer-demo">
    <div class="info-section">
      <p>
        Display call duration in various formats. This demo shows how to format and display
        elapsed time during calls using VueSip's built-in duration tracking.
      </p>
    </div>

    <!-- Timer Display Formats -->
    <div class="timer-showcase">
      <h3>Timer Formats</h3>

      <div v-if="callState !== 'active' || !duration" class="timer-placeholder">
        <div class="placeholder-icon">⏱️</div>
        <p>Start a call to see the timer in action</p>
      </div>

      <div v-else class="timer-displays">
        <!-- Default Format -->
        <div class="timer-card">
          <div class="timer-label">Default (MM:SS)</div>
          <div class="timer-value">{{ formatMMSS(duration) }}</div>
          <div class="timer-desc">Standard call timer format</div>
        </div>

        <!-- Long Format -->
        <div class="timer-card">
          <div class="timer-label">Long (HH:MM:SS)</div>
          <div class="timer-value">{{ formatHHMMSS(duration) }}</div>
          <div class="timer-desc">For calls over 1 hour</div>
        </div>

        <!-- Human Readable -->
        <div class="timer-card">
          <div class="timer-label">Human Readable</div>
          <div class="timer-value human">{{ formatHuman(duration) }}</div>
          <div class="timer-desc">Natural language format</div>
        </div>

        <!-- Compact -->
        <div class="timer-card">
          <div class="timer-label">Compact</div>
          <div class="timer-value">{{ formatCompact(duration) }}</div>
          <div class="timer-desc">Space-efficient display</div>
        </div>
      </div>
    </div>

    <!-- Call Status with Timer -->
    <div class="call-status-section">
      <h3>Call Status Display Example</h3>
      <div class="status-card" :class="{ active: callState === 'active' }">
        <div class="status-header">
          <span class="status-icon">
            {{ callState === 'active' ? '📞' : '⏸️' }}
          </span>
          <span class="status-text">
            {{ callState === 'active' ? 'In Call' : 'No Active Call' }}
          </span>
        </div>

        <div v-if="callState === 'active'" class="status-details">
          <div v-if="remoteUri" class="detail-row">
            <span class="label">Connected to:</span>
            <span class="value">{{ remoteDisplayName || remoteUri }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Duration:</span>
            <span class="value timer">{{ formatMMSS(duration) }}</span>
          </div>
        </div>

        <div v-else class="empty-status">
          Connect to a SIP server and make a call to see the timer
        </div>
      </div>
    </div>

    <!-- Statistics -->
    <div v-if="callState === 'active'" class="timer-stats">
      <h3>Timer Information</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">Total Seconds</div>
          <div class="stat-value">{{ duration }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Minutes</div>
          <div class="stat-value">{{ Math.floor(duration / 60) }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Hours</div>
          <div class="stat-value">{{ Math.floor(duration / 3600) }}</div>
        </div>
      </div>
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>import { useCallSession } from 'vuesip'

const { duration, state } = useCallSession(sipClient)

// Format MM:SS (e.g., "05:23")
const formatMMSS = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return \`\${mins}:\${secs.toString().padStart(2, '0')}\`
}

// Format HH:MM:SS (e.g., "01:05:23")
const formatHHMMSS = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return \`\${hours}:\${mins.toString().padStart(2, '0')}:\${secs.toString().padStart(2, '0')}\`
}

// Human readable (e.g., "5 minutes, 23 seconds")
const formatHuman = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts = []
  if (hours > 0) parts.push(\`\${hours}h\`)
  if (mins > 0) parts.push(\`\${mins}m\`)
  if (secs > 0 || parts.length === 0) parts.push(\`\${secs}s\`)

  return parts.join(' ')
}

// Use in template
&lt;div v-if="state === 'active'"&gt;
  Duration: {{ formatMMSS(duration) }}
&lt;/div&gt;</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSipClient, useCallSession } from '../../src'

// Get SIP client and call session
const { getClient } = useSipClient()
const sipClientRef = computed(() => getClient())
const { state: callState, duration, remoteUri, remoteDisplayName } = useCallSession(sipClientRef)

// Formatting functions
const formatMMSS = (seconds: number): string => {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatHHMMSS = (seconds: number): string => {
  if (!seconds) return '0:00:00'
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const formatHuman = (seconds: number): string => {
  if (!seconds) return '0 seconds'

  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (mins > 0) parts.push(`${mins}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

  return parts.join(' ')
}

const formatCompact = (seconds: number): string => {
  if (!seconds) return '0s'
  if (seconds < 60) return `${seconds}s`

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  if (mins < 60) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }

  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}h ${remainingMins}m`
}
</script>

<style scoped>
.call-timer-demo {
  max-width: 800px;
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

.timer-showcase {
  margin-bottom: 2rem;
}

.timer-showcase h3 {
  margin: 0 0 1.5rem 0;
  color: #333;
}

.timer-placeholder {
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 8px;
  border: 2px dashed #e5e7eb;
}

.placeholder-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.timer-placeholder p {
  margin: 0;
  color: #666;
  font-size: 0.875rem;
}

.timer-displays {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.timer-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  border: 2px solid #e5e7eb;
  text-align: center;
  transition: all 0.2s;
}

.timer-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.timer-label {
  font-size: 0.75rem;
  color: #666;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.timer-value {
  font-size: 2rem;
  font-weight: 700;
  color: #667eea;
  font-variant-numeric: tabular-nums;
  margin-bottom: 0.5rem;
}

.timer-value.human {
  font-size: 1.5rem;
}

.timer-desc {
  font-size: 0.75rem;
  color: #999;
}

.call-status-section {
  margin-bottom: 2rem;
}

.call-status-section h3 {
  margin: 0 0 1rem 0;
  color: #333;
}

.status-card {
  background: white;
  border-radius: 8px;
  border: 2px solid #e5e7eb;
  padding: 1.5rem;
  transition: all 0.3s;
}

.status-card.active {
  border-color: #10b981;
  background: #f0fdf4;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.status-icon {
  font-size: 2rem;
}

.status-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.status-details {
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.detail-row .label {
  color: #666;
  font-size: 0.875rem;
}

.detail-row .value {
  color: #333;
  font-weight: 500;
}

.detail-row .value.timer {
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
  font-variant-numeric: tabular-nums;
}

.empty-status {
  text-align: center;
  padding: 1.5rem;
  color: #999;
  font-size: 0.875rem;
}

.timer-stats {
  background: #f9fafb;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.timer-stats h3 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.stat-item {
  background: white;
  padding: 1rem;
  border-radius: 6px;
  text-align: center;
}

.stat-label {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 0.5rem;
  display: block;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
  font-variant-numeric: tabular-nums;
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
  .timer-displays {
    grid-template-columns: repeat(2, 1fr);
  }

  .timer-value {
    font-size: 1.5rem;
  }

  .timer-value.human {
    font-size: 1.125rem;
  }
}
</style>
