<template>
  <div class="call-quality-demo">
    <div class="info-section">
      <p>
        Monitor real-time call quality metrics including audio codec information, packet statistics,
        jitter, and round-trip time. Essential for diagnosing call quality issues and network
        problems.
      </p>
      <p class="note">
        <strong>Note:</strong> Statistics are available only during active calls. Some metrics may
        vary depending on browser support.
      </p>
    </div>

    <!-- Connection Status -->
    <div v-if="!isConnected" class="status-message info">
      Connect to a SIP server to view call quality metrics (use the Basic Call demo to connect)
    </div>

    <div v-else-if="callState !== 'active'" class="status-message warning">
      Make or answer a call to see real-time quality metrics
    </div>

    <!-- Quality Metrics -->
    <div v-else class="quality-metrics">
      <!-- Overall Quality Score -->
      <div class="quality-score-card">
        <div class="score-container">
          <div class="score-circle" :class="qualityLevel">
            <div class="score-value">{{ qualityScore }}</div>
            <div class="score-label">Quality</div>
          </div>
          <div class="score-indicator">
            <div class="indicator-bar">
              <div class="indicator-fill" :style="{ width: qualityScore + '%' }" :class="qualityLevel"></div>
            </div>
            <div class="indicator-text">{{ qualityText }}</div>
          </div>
        </div>
      </div>

      <!-- Audio Codec Information -->
      <div class="metrics-section">
        <h3>📡 Audio Codec</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Codec:</span>
            <span class="info-value">{{ codecInfo.name }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Sample Rate:</span>
            <span class="info-value">{{ codecInfo.sampleRate }} Hz</span>
          </div>
          <div class="info-item">
            <span class="info-label">Channels:</span>
            <span class="info-value">{{ codecInfo.channels }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Bitrate:</span>
            <span class="info-value">{{ codecInfo.bitrate }} kbps</span>
          </div>
        </div>
      </div>

      <!-- Network Statistics -->
      <div class="metrics-section">
        <h3>🌐 Network Statistics</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
              <div class="stat-value">{{ networkStats.packetLoss }}%</div>
              <div class="stat-label">Packet Loss</div>
              <div class="stat-quality" :class="getPacketLossLevel(networkStats.packetLoss)">
                {{ getPacketLossText(networkStats.packetLoss) }}
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">⏱️</div>
            <div class="stat-content">
              <div class="stat-value">{{ networkStats.jitter }}ms</div>
              <div class="stat-label">Jitter</div>
              <div class="stat-quality" :class="getJitterLevel(networkStats.jitter)">
                {{ getJitterText(networkStats.jitter) }}
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">🔄</div>
            <div class="stat-content">
              <div class="stat-value">{{ networkStats.rtt }}ms</div>
              <div class="stat-label">Round Trip Time</div>
              <div class="stat-quality" :class="getRttLevel(networkStats.rtt)">
                {{ getRttText(networkStats.rtt) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Packet Information -->
      <div class="metrics-section">
        <h3>📦 Packet Statistics</h3>
        <div class="packet-stats">
          <div class="packet-row">
            <span class="packet-label">Packets Sent:</span>
            <span class="packet-value">{{ formatNumber(packetStats.sent) }}</span>
          </div>
          <div class="packet-row">
            <span class="packet-label">Packets Received:</span>
            <span class="packet-value">{{ formatNumber(packetStats.received) }}</span>
          </div>
          <div class="packet-row">
            <span class="packet-label">Packets Lost:</span>
            <span class="packet-value lost">{{ formatNumber(packetStats.lost) }}</span>
          </div>
          <div class="packet-row">
            <span class="packet-label">Bytes Sent:</span>
            <span class="packet-value">{{ formatBytes(packetStats.bytesSent) }}</span>
          </div>
          <div class="packet-row">
            <span class="packet-label">Bytes Received:</span>
            <span class="packet-value">{{ formatBytes(packetStats.bytesReceived) }}</span>
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div v-if="recommendations.length > 0" class="recommendations">
        <h3>💡 Recommendations</h3>
        <ul>
          <li v-for="(rec, index) in recommendations" :key="index">{{ rec }}</li>
        </ul>
      </div>
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>import { ref, onUnmounted } from 'vue'
import { useCallSession } from 'vuesip'

const { session, state } = useCallSession(sipClient)

// Get RTC peer connection stats
const getCallStats = async () => {
  if (!session.value?.connection) return null

  const stats = await session.value.connection.getStats()

  const audioStats = {
    codec: null,
    packetLoss: 0,
    jitter: 0,
    rtt: 0,
    packetsSent: 0,
    packetsReceived: 0
  }

  stats.forEach(report => {
    if (report.type === 'inbound-rtp' && report.kind === 'audio') {
      audioStats.packetsReceived = report.packetsReceived || 0
      audioStats.packetLoss = report.packetsLost || 0
      audioStats.jitter = report.jitter ? (report.jitter * 1000).toFixed(2) : 0
    }

    if (report.type === 'outbound-rtp' && report.kind === 'audio') {
      audioStats.packetsSent = report.packetsSent || 0
    }

    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
      audioStats.rtt = report.currentRoundTripTime
        ? (report.currentRoundTripTime * 1000).toFixed(2)
        : 0
    }
  })

  return audioStats
}

// Poll stats every 2 seconds
const statsInterval = setInterval(async () => {
  if (state.value === 'active') {
    const stats = await getCallStats()
    // Update UI with stats
  }
}, 2000)

onUnmounted(() => {
  clearInterval(statsInterval)
})</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useSipClient, useCallSession } from '../../src'

// SIP Client and Call Session
const { isConnected, getClient } = useSipClient()
const sipClientRef = computed(() => getClient())
const { state: callState, session } = useCallSession(sipClientRef)

// State
const codecInfo = ref({
  name: 'Unknown',
  sampleRate: 0,
  channels: 0,
  bitrate: 0,
})

const networkStats = ref({
  packetLoss: 0,
  jitter: 0,
  rtt: 0,
})

const packetStats = ref({
  sent: 0,
  received: 0,
  lost: 0,
  bytesSent: 0,
  bytesReceived: 0,
})

let statsInterval: number | null = null

// Computed
const qualityScore = computed(() => {
  // Calculate quality score based on metrics (0-100)
  let score = 100

  // Deduct points for packet loss (max 30 points)
  score -= Math.min(networkStats.value.packetLoss * 30, 30)

  // Deduct points for jitter (max 25 points)
  if (networkStats.value.jitter > 30) {
    score -= Math.min((networkStats.value.jitter - 30) / 2, 25)
  }

  // Deduct points for high RTT (max 25 points)
  if (networkStats.value.rtt > 150) {
    score -= Math.min((networkStats.value.rtt - 150) / 10, 25)
  }

  return Math.max(0, Math.min(100, Math.round(score)))
})

const qualityLevel = computed(() => {
  if (qualityScore.value >= 80) return 'excellent'
  if (qualityScore.value >= 60) return 'good'
  if (qualityScore.value >= 40) return 'fair'
  return 'poor'
})

const qualityText = computed(() => {
  if (qualityScore.value >= 80) return 'Excellent'
  if (qualityScore.value >= 60) return 'Good'
  if (qualityScore.value >= 40) return 'Fair'
  return 'Poor'
})

const recommendations = computed(() => {
  const recs: string[] = []

  if (networkStats.value.packetLoss > 2) {
    recs.push('High packet loss detected. Check network congestion or switch to a wired connection.')
  }

  if (networkStats.value.jitter > 30) {
    recs.push('High jitter may cause choppy audio. Consider closing bandwidth-intensive applications.')
  }

  if (networkStats.value.rtt > 200) {
    recs.push('High latency detected. You may experience delays in conversation.')
  }

  if (qualityScore.value < 60) {
    recs.push('Overall call quality is suboptimal. Consider improving your network connection.')
  }

  return recs
})

// Methods
const getPacketLossLevel = (loss: number): string => {
  if (loss < 1) return 'excellent'
  if (loss < 3) return 'good'
  if (loss < 5) return 'fair'
  return 'poor'
}

const getPacketLossText = (loss: number): string => {
  if (loss < 1) return 'Excellent'
  if (loss < 3) return 'Acceptable'
  if (loss < 5) return 'Noticeable'
  return 'Poor'
}

const getJitterLevel = (jitter: number): string => {
  if (jitter < 20) return 'excellent'
  if (jitter < 30) return 'good'
  if (jitter < 50) return 'fair'
  return 'poor'
}

const getJitterText = (jitter: number): string => {
  if (jitter < 20) return 'Excellent'
  if (jitter < 30) return 'Good'
  if (jitter < 50) return 'Fair'
  return 'Poor'
}

const getRttLevel = (rtt: number): string => {
  if (rtt < 150) return 'excellent'
  if (rtt < 200) return 'good'
  if (rtt < 300) return 'fair'
  return 'poor'
}

const getRttText = (rtt: number): string => {
  if (rtt < 150) return 'Excellent'
  if (rtt < 200) return 'Good'
  if (rtt < 300) return 'Fair'
  return 'Poor'
}

const formatNumber = (num: number): string => {
  return num.toLocaleString()
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const updateStats = async () => {
  // Simulated stats for demo purposes
  // In a real implementation, you would get these from the WebRTC peer connection
  networkStats.value = {
    packetLoss: Math.random() * 5,
    jitter: 15 + Math.random() * 20,
    rtt: 100 + Math.random() * 100,
  }

  packetStats.value = {
    sent: Math.floor(Math.random() * 10000) + 5000,
    received: Math.floor(Math.random() * 10000) + 5000,
    lost: Math.floor(Math.random() * 100),
    bytesSent: Math.floor(Math.random() * 1000000) + 500000,
    bytesReceived: Math.floor(Math.random() * 1000000) + 500000,
  }

  codecInfo.value = {
    name: 'PCMU',
    sampleRate: 8000,
    channels: 1,
    bitrate: 64,
  }
}

// Watch for active calls and start polling stats
watch(callState, (newState) => {
  if (newState === 'active') {
    // Start polling stats
    updateStats()
    statsInterval = window.setInterval(updateStats, 2000)
  } else {
    // Stop polling
    if (statsInterval) {
      clearInterval(statsInterval)
      statsInterval = null
    }
  }
})

// Cleanup
onUnmounted(() => {
  if (statsInterval) {
    clearInterval(statsInterval)
  }
})
</script>

<style scoped>
.call-quality-demo {
  max-width: 900px;
  margin: 0 auto;
}

.info-section {
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.info-section p {
  margin: 0 0 1rem 0;
  color: #666;
  line-height: 1.6;
}

.info-section p:last-child {
  margin-bottom: 0;
}

.note {
  padding: 1rem;
  background: #eff6ff;
  border-left: 3px solid #667eea;
  border-radius: 4px;
  font-size: 0.875rem;
}

.status-message {
  padding: 1rem;
  border-radius: 6px;
  text-align: center;
  font-size: 0.875rem;
}

.status-message.info {
  background: #eff6ff;
  color: #1e40af;
}

.status-message.warning {
  background: #fef3c7;
  color: #92400e;
}

.quality-metrics {
  padding: 1.5rem;
}

.quality-score-card {
  background: white;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  padding: 2rem;
  margin-bottom: 2rem;
}

.score-container {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.score-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 8px solid;
  flex-shrink: 0;
}

.score-circle.excellent {
  border-color: #10b981;
  background: #d1fae5;
}

.score-circle.good {
  border-color: #3b82f6;
  background: #dbeafe;
}

.score-circle.fair {
  border-color: #f59e0b;
  background: #fef3c7;
}

.score-circle.poor {
  border-color: #ef4444;
  background: #fee2e2;
}

.score-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: #333;
}

.score-label {
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
}

.score-indicator {
  flex: 1;
}

.indicator-bar {
  height: 12px;
  background: #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.indicator-fill {
  height: 100%;
  transition: width 0.5s ease;
}

.indicator-fill.excellent {
  background: linear-gradient(90deg, #10b981, #059669);
}

.indicator-fill.good {
  background: linear-gradient(90deg, #3b82f6, #2563eb);
}

.indicator-fill.fair {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.indicator-fill.poor {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.indicator-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.metrics-section {
  background: white;
  border-radius: 8px;
  border: 2px solid #e5e7eb;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.metrics-section h3 {
  margin: 0 0 1.5rem 0;
  color: #333;
  font-size: 1rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 6px;
}

.info-label {
  font-size: 0.875rem;
  color: #666;
}

.info-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #333;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.stat-card {
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: #667eea;
}

.stat-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.25rem;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 0.5rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-quality {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.stat-quality.excellent {
  background: #d1fae5;
  color: #065f46;
}

.stat-quality.good {
  background: #dbeafe;
  color: #1e40af;
}

.stat-quality.fair {
  background: #fef3c7;
  color: #92400e;
}

.stat-quality.poor {
  background: #fee2e2;
  color: #991b1b;
}

.packet-stats {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.packet-row {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 6px;
}

.packet-label {
  font-size: 0.875rem;
  color: #666;
}

.packet-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #333;
  font-variant-numeric: tabular-nums;
}

.packet-value.lost {
  color: #ef4444;
}

.recommendations {
  background: #eff6ff;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  padding: 1.5rem;
}

.recommendations h3 {
  margin: 0 0 1rem 0;
  color: #1e40af;
  font-size: 1rem;
}

.recommendations ul {
  margin: 0;
  padding-left: 1.5rem;
}

.recommendations li {
  color: #1e40af;
  font-size: 0.875rem;
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

.recommendations li:last-child {
  margin-bottom: 0;
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
  .score-container {
    flex-direction: column;
    text-align: center;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
