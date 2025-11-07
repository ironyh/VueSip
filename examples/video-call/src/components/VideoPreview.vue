<template>
  <div class="video-preview" :class="{ 'has-video': hasLocalVideo }">
    <!-- Video Element -->
    <video
      ref="videoElement"
      autoplay
      muted
      playsinline
      class="preview-video"
      aria-label="Local video preview"
    ></video>

    <!-- No Video Placeholder -->
    <div v-if="!hasLocalVideo" class="no-video-placeholder">
      <span class="camera-icon">📷</span>
      <span class="placeholder-text">Camera Off</span>
    </div>

    <!-- Camera Selector (only show when video is active) -->
    <div v-if="hasLocalVideo && videoDevices.length > 1" class="camera-selector">
      <button
        @click="toggleCameraMenu"
        class="camera-button"
        :class="{ active: showCameraMenu }"
        title="Switch Camera"
      >
        <span class="icon">📹</span>
      </button>

      <!-- Camera Menu -->
      <transition name="slide-up">
        <div v-if="showCameraMenu" class="camera-menu">
          <div class="menu-header">Select Camera</div>
          <button
            v-for="device in videoDevices"
            :key="device.deviceId"
            @click="selectCamera(device.deviceId)"
            class="camera-option"
            :class="{ selected: device.deviceId === selectedDeviceId }"
          >
            <span class="camera-name">{{ device.label || 'Camera' }}</span>
            <span v-if="device.deviceId === selectedDeviceId" class="check-icon">✓</span>
          </button>
        </div>
      </transition>
    </div>

    <!-- Local Label -->
    <div class="local-label">You</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

// ============================================================================
// Props
// ============================================================================

interface MediaDevice {
  deviceId: string
  label: string
  kind: string
  groupId?: string
}

interface Props {
  stream: MediaStream | null
  videoDevices: readonly MediaDevice[]
  selectedDeviceId: string | null
  hasLocalVideo: boolean
}

const props = defineProps<Props>()

// ============================================================================
// Events
// ============================================================================

interface Emits {
  (e: 'select-camera', deviceId: string): void
}

const emit = defineEmits<Emits>()

// ============================================================================
// Local State
// ============================================================================

const videoElement = ref<HTMLVideoElement | null>(null)
const showCameraMenu = ref(false)

// ============================================================================
// Methods
// ============================================================================

/**
 * Toggle camera selection menu
 */
function toggleCameraMenu() {
  showCameraMenu.value = !showCameraMenu.value
}

/**
 * Select a camera
 */
function selectCamera(deviceId: string) {
  emit('select-camera', deviceId)
  showCameraMenu.value = false
}

/**
 * Close camera menu when clicking outside
 */
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.camera-selector')) {
    showCameraMenu.value = false
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
    if (videoElement.value) {
      if (newStream) {
        videoElement.value.srcObject = newStream
      } else {
        videoElement.value.srcObject = null
      }
    }
  }
)

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(() => {
  // Set initial stream if available
  if (props.stream && videoElement.value) {
    videoElement.value.srcObject = props.stream
  }

  // Add click outside listener
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  // Clean up video element
  if (videoElement.value) {
    videoElement.value.srcObject = null
  }

  // Remove click outside listener
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* ============================================================================
   Video Preview (Picture-in-Picture)
   ============================================================================ */

.video-preview {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 240px;
  height: 180px;
  background: #1f2937;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  border: 3px solid rgba(255, 255, 255, 0.2);
  z-index: 10;
  transition: all 0.3s ease;
}

.video-preview:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
}

/* ============================================================================
   Video Element
   ============================================================================ */

.preview-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1); /* Mirror effect for natural self-view */
}

/* ============================================================================
   No Video Placeholder
   ============================================================================ */

.no-video-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
}

.camera-icon {
  font-size: 48px;
  opacity: 0.5;
}

.placeholder-text {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 500;
}

/* ============================================================================
   Local Label
   ============================================================================ */

.local-label {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  padding: 4px 12px;
  border-radius: 6px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  z-index: 2;
}

/* ============================================================================
   Camera Selector
   ============================================================================ */

.camera-selector {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 3;
}

.camera-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.camera-button:hover {
  background: rgba(0, 0, 0, 0.85);
  border-color: rgba(255, 255, 255, 0.4);
  transform: scale(1.05);
}

.camera-button.active {
  background: rgba(102, 126, 234, 0.9);
  border-color: rgba(102, 126, 234, 1);
}

/* ============================================================================
   Camera Menu
   ============================================================================ */

.camera-menu {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  min-width: 200px;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.menu-header {
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.camera-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.camera-option:hover {
  background: rgba(255, 255, 255, 0.1);
}

.camera-option.selected {
  background: rgba(102, 126, 234, 0.3);
  color: #a5b4fc;
}

.camera-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}

.check-icon {
  margin-left: 8px;
  color: #10b981;
  font-weight: bold;
}

/* ============================================================================
   Transitions
   ============================================================================ */

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.2s ease;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* ============================================================================
   Responsive Design
   ============================================================================ */

@media (max-width: 768px) {
  .video-preview {
    width: 160px;
    height: 120px;
    bottom: 80px; /* Above controls on mobile */
    right: 10px;
  }

  .camera-icon {
    font-size: 32px;
  }

  .placeholder-text {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .video-preview {
    width: 120px;
    height: 90px;
  }

  .camera-icon {
    font-size: 24px;
  }

  .local-label {
    font-size: 10px;
    padding: 3px 8px;
  }
}
</style>
