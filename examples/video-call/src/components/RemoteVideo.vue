<template>
  <div class="remote-video-container">
    <!-- Remote Video Element -->
    <video
      ref="remoteVideoElement"
      autoplay
      playsinline
      class="remote-video"
      :class="{ active: isActive && stream }"
      aria-label="Remote video stream"
    ></video>

    <!-- Placeholder when no call is active -->
    <div v-if="!isActive" class="idle-state">
      <div class="idle-content">
        <span class="phone-icon">📞</span>
        <h2>Ready for Video Call</h2>
        <p>Enter a SIP URI below to start a call</p>
      </div>
    </div>

    <!-- Placeholder when call is active but no video -->
    <div v-else-if="isActive && !stream" class="connecting-state">
      <div class="connecting-content">
        <div class="pulse-ring"></div>
        <span class="user-icon">👤</span>
        <h2>{{ remoteDisplayName || 'Unknown' }}</h2>
        <p>Connecting video...</p>
      </div>
    </div>

    <!-- Remote Display Name Overlay (when video is active) -->
    <div v-if="isActive && stream" class="remote-name-overlay">
      {{ remoteDisplayName || 'Remote User' }}
    </div>

    <!-- Video Statistics (optional, can be toggled) -->
    <div v-if="showStats && isActive && stream" class="video-stats">
      <div class="stat-item">
        <span class="stat-label">Resolution:</span>
        <span class="stat-value">{{ videoResolution }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

// ============================================================================
// Props
// ============================================================================

interface Props {
  stream: MediaStream | null
  isActive: boolean
  remoteDisplayName?: string | null
  showStats?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  remoteDisplayName: null,
  showStats: false,
})

// ============================================================================
// Local State
// ============================================================================

const remoteVideoElement = ref<HTMLVideoElement | null>(null)
const videoResolution = ref<string>('Unknown')

// ============================================================================
// Methods
// ============================================================================

/**
 * Update video statistics
 */
function updateVideoStats() {
  if (!remoteVideoElement.value) return

  const video = remoteVideoElement.value
  if (video.videoWidth && video.videoHeight) {
    videoResolution.value = `${video.videoWidth}x${video.videoHeight}`
  }
}

// ============================================================================
// Watchers
// ============================================================================

/**
 * Update video element when stream changes
 */
watch(
  () => props.stream,
  (newStream) => {
    if (remoteVideoElement.value) {
      if (newStream) {
        remoteVideoElement.value.srcObject = newStream

        // Update stats when video metadata is loaded
        remoteVideoElement.value.addEventListener('loadedmetadata', updateVideoStats)
      } else {
        remoteVideoElement.value.srcObject = null
        videoResolution.value = 'Unknown'
      }
    }
  }
)

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(() => {
  // Set initial stream if available
  if (props.stream && remoteVideoElement.value) {
    remoteVideoElement.value.srcObject = props.stream

    // Update stats when video metadata is loaded
    remoteVideoElement.value.addEventListener('loadedmetadata', updateVideoStats)
  }
})

onUnmounted(() => {
  // Clean up video element
  if (remoteVideoElement.value) {
    remoteVideoElement.value.removeEventListener('loadedmetadata', updateVideoStats)
    remoteVideoElement.value.srcObject = null
  }
})
</script>

<style scoped>
/* ============================================================================
   Remote Video Container
   ============================================================================ */

.remote-video-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
}

/* ============================================================================
   Remote Video Element
   ============================================================================ */

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.remote-video.active {
  opacity: 1;
}

/* ============================================================================
   Idle State (No Call)
   ============================================================================ */

.idle-state {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
}

.idle-content {
  text-align: center;
  color: white;
}

.phone-icon {
  font-size: 80px;
  display: block;
  margin-bottom: 20px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.idle-content h2 {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 10px;
  color: white;
}

.idle-content p {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
}

/* ============================================================================
   Connecting State (Call Active, No Video Yet)
   ============================================================================ */

.connecting-state {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
}

.connecting-content {
  text-align: center;
  color: white;
  position: relative;
}

.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  border: 3px solid rgba(102, 126, 234, 0.5);
  border-radius: 50%;
  animation: pulse 2s ease-out infinite;
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0;
  }
}

.user-icon {
  font-size: 80px;
  display: block;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

.connecting-content h2 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 10px;
  color: white;
}

.connecting-content p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  animation: pulse-text 1.5s ease-in-out infinite;
}

@keyframes pulse-text {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* ============================================================================
   Remote Name Overlay
   ============================================================================ */

.remote-name-overlay {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  padding: 8px 16px;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  z-index: 2;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* ============================================================================
   Video Statistics
   ============================================================================ */

.video-stats {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  padding: 12px 16px;
  border-radius: 8px;
  z-index: 2;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.stat-item {
  display: flex;
  gap: 8px;
  color: white;
  font-size: 13px;
}

.stat-label {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

.stat-value {
  font-weight: 500;
  color: #10b981;
}

/* ============================================================================
   Responsive Design
   ============================================================================ */

@media (max-width: 768px) {
  .phone-icon,
  .user-icon {
    font-size: 60px;
  }

  .idle-content h2,
  .connecting-content h2 {
    font-size: 20px;
  }

  .idle-content p,
  .connecting-content p {
    font-size: 14px;
  }

  .remote-name-overlay {
    font-size: 14px;
    padding: 6px 12px;
  }

  .video-stats {
    font-size: 11px;
    padding: 8px 12px;
  }
}
</style>
