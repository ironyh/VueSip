<template>
  <div class="ringtones-demo">
    <div class="info-section">
      <p>
        Customize your incoming call experience with different ringtones. Select from built-in
        tones or upload your own audio files. Volume and vibration can be adjusted independently.
      </p>
    </div>

    <!-- Ringtone Selection -->
    <div class="ringtone-interface">
      <h3>Select Ringtone</h3>

      <div class="ringtone-list">
        <div
          v-for="tone in ringtones"
          :key="tone.id"
          class="ringtone-item"
          :class="{ active: selectedRingtone === tone.id }"
          @click="selectRingtone(tone.id)"
        >
          <div class="ringtone-icon">🎵</div>
          <div class="ringtone-info">
            <div class="ringtone-name">{{ tone.name }}</div>
            <div class="ringtone-desc">{{ tone.description }}</div>
          </div>
          <button
            class="play-button"
            @click.stop="playPreview(tone.id)"
            :disabled="isPlaying && playingTone === tone.id"
          >
            {{ isPlaying && playingTone === tone.id ? '⏸️' : '▶️' }}
          </button>
        </div>
      </div>

      <!-- Volume Control -->
      <div class="volume-control">
        <h4>Volume</h4>
        <div class="slider-control">
          <span class="slider-icon">🔈</span>
          <input
            type="range"
            min="0"
            max="100"
            v-model="volume"
            @input="handleVolumeChange"
            class="volume-slider"
          />
          <span class="slider-icon">🔊</span>
          <span class="slider-value">{{ volume }}%</span>
        </div>
      </div>

      <!-- Additional Options -->
      <div class="ringtone-options">
        <h4>Options</h4>

        <div class="option-item">
          <label>
            <input type="checkbox" v-model="loopRingtone" @change="saveSettings" />
            Loop ringtone until answered
          </label>
        </div>

        <div class="option-item">
          <label>
            <input type="checkbox" v-model="vibrateEnabled" @change="saveSettings" />
            Enable vibration (on supported devices)
          </label>
        </div>

        <div class="option-item">
          <label>
            <input type="checkbox" v-model="showNotification" @change="saveSettings" />
            Show desktop notification
          </label>
        </div>
      </div>

      <!-- Test Ringtone -->
      <div class="test-section">
        <h4>Test Your Settings</h4>
        <p class="test-desc">
          Click the button below to simulate an incoming call and hear how your ringtone sounds.
        </p>
        <button
          class="btn btn-primary"
          @click="testRingtone"
          :disabled="isPlaying"
        >
          {{ isPlaying ? '⏸️ Stop Test' : '🔔 Test Ringtone' }}
        </button>
      </div>

      <!-- Call Status (when active) -->
      <div v-if="callState === 'incoming'" class="incoming-call-demo">
        <div class="demo-badge">Live Incoming Call</div>
        <p>
          A real incoming call is using your selected ringtone: <strong>{{ activeRingtoneName }}</strong>
        </p>
      </div>
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>import { ref, watch } from 'vue'
import { useCallSession } from 'vuesip'

// Ringtone audio element
const ringtoneAudio = ref&lt;HTMLAudioElement | null&gt;(null)
const selectedRingtone = ref('classic')
const volume = ref(80)

// Initialize audio element
const initRingtone = () => {
  ringtoneAudio.value = new Audio('/ringtones/classic.mp3')
  ringtoneAudio.value.loop = true
  ringtoneAudio.value.volume = volume.value / 100
}

// Play ringtone for incoming calls
const { state: callState } = useCallSession(sipClient)

watch(callState, (newState, oldState) => {
  if (newState === 'incoming' && oldState !== 'incoming') {
    // Incoming call - play ringtone
    ringtoneAudio.value?.play()

    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate([500, 250, 500])
    }
  } else if (oldState === 'incoming' && newState !== 'incoming') {
    // Call answered/rejected - stop ringtone
    ringtoneAudio.value?.pause()
    if (ringtoneAudio.value) {
      ringtoneAudio.value.currentTime = 0
    }
  }
})

// Change volume
const setVolume = (newVolume: number) => {
  volume.value = newVolume
  if (ringtoneAudio.value) {
    ringtoneAudio.value.volume = newVolume / 100
  }
}

// Change ringtone
const changeRingtone = (ringtoneId: string) => {
  selectedRingtone.value = ringtoneId
  ringtoneAudio.value?.pause()
  initRingtone()
}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useSipClient, useCallSession } from '../../src'

interface Ringtone {
  id: string
  name: string
  description: string
  frequency: number
}

const STORAGE_KEY = 'vuesip-ringtone-settings'

// SIP Client and Call Session
const { getClient } = useSipClient()
const sipClientRef = computed(() => getClient())
const { state: callState } = useCallSession(sipClientRef)

// Available ringtones (simulated with Web Audio API)
const ringtones: Ringtone[] = [
  { id: 'classic', name: 'Classic', description: 'Traditional phone ring', frequency: 440 },
  { id: 'digital', name: 'Digital', description: 'Modern digital tone', frequency: 523.25 },
  { id: 'gentle', name: 'Gentle', description: 'Soft and pleasant', frequency: 349.23 },
  { id: 'urgent', name: 'Urgent', description: 'Attention-grabbing', frequency: 659.25 },
  { id: 'melody', name: 'Melody', description: 'Musical ringtone', frequency: 392 },
]

// State
const selectedRingtone = ref('classic')
const volume = ref(80)
const loopRingtone = ref(true)
const vibrateEnabled = ref(true)
const showNotification = ref(false)
const isPlaying = ref(false)
const playingTone = ref<string | null>(null)

// Audio context for generating tones
let audioContext: AudioContext | null = null
let oscillator: OscillatorNode | null = null
let gainNode: GainNode | null = null

// Computed
const activeRingtoneName = computed(() => {
  return ringtones.find(t => t.id === selectedRingtone.value)?.name || 'Unknown'
})

// Methods
const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
}

const playTone = (frequency: number) => {
  if (!audioContext) return

  // Create oscillator
  oscillator = audioContext.createOscillator()
  gainNode = audioContext.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)

  // Set volume
  gainNode.gain.setValueAtTime(volume.value / 100, audioContext.currentTime)

  // Connect nodes
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  // Start playing
  oscillator.start()
}

const stopTone = () => {
  if (oscillator) {
    oscillator.stop()
    oscillator.disconnect()
    oscillator = null
  }

  if (gainNode) {
    gainNode.disconnect()
    gainNode = null
  }
}

const selectRingtone = (id: string) => {
  selectedRingtone.value = id
  saveSettings()
}

const playPreview = (id: string) => {
  if (isPlaying.value && playingTone.value === id) {
    stopTone()
    isPlaying.value = false
    playingTone.value = null
    return
  }

  stopTone()
  initAudioContext()

  const tone = ringtones.find(t => t.id === id)
  if (tone) {
    playTone(tone.frequency)
    isPlaying.value = true
    playingTone.value = id

    // Auto-stop after 3 seconds
    setTimeout(() => {
      if (playingTone.value === id) {
        stopTone()
        isPlaying.value = false
        playingTone.value = null
      }
    }, 3000)
  }
}

const testRingtone = () => {
  if (isPlaying.value) {
    stopTone()
    isPlaying.value = false
    playingTone.value = null
    return
  }

  initAudioContext()
  const tone = ringtones.find(t => t.id === selectedRingtone.value)

  if (tone) {
    playTone(tone.frequency)
    isPlaying.value = true
    playingTone.value = selectedRingtone.value

    // Vibrate if enabled
    if (vibrateEnabled.value && navigator.vibrate) {
      navigator.vibrate([500, 250, 500, 250, 500])
    }

    // Auto-stop after 5 seconds
    setTimeout(() => {
      stopTone()
      isPlaying.value = false
      playingTone.value = null
    }, 5000)
  }
}

const handleVolumeChange = () => {
  saveSettings()

  // Update playing audio volume
  if (gainNode && audioContext) {
    gainNode.gain.setValueAtTime(volume.value / 100, audioContext.currentTime)
  }
}

const saveSettings = () => {
  const settings = {
    ringtone: selectedRingtone.value,
    volume: volume.value,
    loop: loopRingtone.value,
    vibrate: vibrateEnabled.value,
    notification: showNotification.value,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

const loadSettings = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const settings = JSON.parse(saved)
      selectedRingtone.value = settings.ringtone || 'classic'
      volume.value = settings.volume ?? 80
      loopRingtone.value = settings.loop ?? true
      vibrateEnabled.value = settings.vibrate ?? true
      showNotification.value = settings.notification ?? false
    } catch (error) {
      console.error('Failed to load ringtone settings:', error)
    }
  }
}

// Watch for incoming calls and play ringtone
watch(callState, (newState, oldState) => {
  if (newState === 'incoming' && oldState !== 'incoming') {
    // Start ringing
    initAudioContext()
    const tone = ringtones.find(t => t.id === selectedRingtone.value)
    if (tone) {
      playTone(tone.frequency)
      isPlaying.value = true

      // Vibrate if enabled
      if (vibrateEnabled.value && navigator.vibrate) {
        const vibrationPattern = [500, 250, 500, 250, 500, 1000]
        const vibrateInterval = setInterval(() => {
          if (callState.value === 'incoming') {
            navigator.vibrate(vibrationPattern)
          } else {
            clearInterval(vibrateInterval)
          }
        }, 3000)
      }
    }
  } else if (oldState === 'incoming' && newState !== 'incoming') {
    // Stop ringing
    stopTone()
    isPlaying.value = false
    playingTone.value = null
  }
})

// Load settings on mount
onMounted(() => {
  loadSettings()
})

// Cleanup on unmount
onUnmounted(() => {
  stopTone()
  if (audioContext) {
    audioContext.close()
  }
})
</script>

<style scoped>
.ringtones-demo {
  max-width: 700px;
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

.ringtone-interface {
  padding: 1.5rem;
}

.ringtone-interface h3 {
  margin: 0 0 1.5rem 0;
  color: #333;
}

.ringtone-interface h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1rem;
}

.ringtone-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.ringtone-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.ringtone-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.ringtone-item.active {
  border-color: #667eea;
  background: #eff6ff;
}

.ringtone-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.ringtone-info {
  flex: 1;
  min-width: 0;
}

.ringtone-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 0.25rem;
}

.ringtone-desc {
  font-size: 0.875rem;
  color: #666;
}

.play-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #667eea;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.play-button:hover:not(:disabled) {
  background: #5568d3;
  transform: scale(1.05);
}

.play-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.volume-control {
  background: white;
  border-radius: 8px;
  border: 2px solid #e5e7eb;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.slider-control {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.slider-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.volume-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
  -webkit-appearance: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  border: none;
}

.slider-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #667eea;
  min-width: 45px;
  text-align: right;
}

.ringtone-options {
  background: white;
  border-radius: 8px;
  border: 2px solid #e5e7eb;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.option-item {
  margin-bottom: 1rem;
}

.option-item:last-child {
  margin-bottom: 0;
}

.option-item label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #333;
  cursor: pointer;
}

.option-item input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.test-section {
  background: #eff6ff;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  margin-bottom: 1.5rem;
}

.test-desc {
  margin: 0 0 1rem 0;
  color: #1e40af;
  font-size: 0.875rem;
  line-height: 1.6;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

.incoming-call-demo {
  background: #d1fae5;
  border: 2px solid #10b981;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
}

.demo-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: #10b981;
  color: white;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.incoming-call-demo p {
  margin: 0;
  color: #065f46;
  font-size: 0.875rem;
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
</style>
