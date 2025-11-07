# Device Management Guide

This guide covers comprehensive device management in VueSip, including device enumeration, selection, permission handling, and testing.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Device Enumeration](#device-enumeration)
- [Device Selection](#device-selection)
- [Permission Handling](#permission-handling)
- [Device Testing](#device-testing)
- [Device Change Monitoring](#device-change-monitoring)
- [Best Practices](#best-practices)
- [Complete Examples](#complete-examples)
- [API Reference](#api-reference)

## Overview

VueSip provides powerful device management capabilities through the `useMediaDevices` composable. This composable offers:

- **Reactive device lists**: Automatically updated when devices change
- **Device enumeration**: List all available audio/video devices
- **Device selection**: Select specific devices for input/output
- **Permission management**: Request and track media permissions
- **Device testing**: Test devices before use
- **Change monitoring**: Automatically detect device changes (plug/unplug)

### Key Components

- `useMediaDevices` - Primary composable for device management
- `deviceStore` - Reactive store for device state
- `MediaManager` - Core device and media stream management

## Getting Started

### Basic Setup

```typescript
import { useMediaDevices } from 'vuesip'

const {
  // Device lists
  audioInputDevices,
  audioOutputDevices,
  videoInputDevices,

  // Selected devices
  selectedAudioInputId,
  selectedAudioOutputId,
  selectedVideoInputId,

  // Permissions
  hasAudioPermission,
  hasVideoPermission,

  // Methods
  enumerateDevices,
  requestPermissions,
  selectAudioInput,
  testAudioInput
} = useMediaDevices()
```

### With MediaManager

```typescript
import { ref } from 'vue'
import { MediaManager } from 'vuesip'
import { useMediaDevices } from 'vuesip'

const mediaManager = ref(new MediaManager({ eventBus }))

const devices = useMediaDevices(mediaManager)
```

## Device Enumeration

### Automatic Enumeration

By default, devices are enumerated automatically when the composable mounts:

```typescript
const {
  audioInputDevices,
  audioOutputDevices,
  videoInputDevices,
  isEnumerating
} = useMediaDevices()

// Devices are automatically enumerated on mount
watch(audioInputDevices, (devices) => {
  console.log('Audio input devices:', devices)
})
```

### Manual Enumeration

You can manually enumerate devices at any time:

```typescript
const { enumerateDevices, isEnumerating } = useMediaDevices({
  autoEnumerate: false // Disable automatic enumeration
})

async function refreshDevices() {
  try {
    const devices = await enumerateDevices()
    console.log('Found devices:', devices)
  } catch (error) {
    console.error('Failed to enumerate devices:', error)
  }
}
```

### Filtering Devices

Access specific device types using computed refs:

```typescript
const {
  audioInputDevices,
  audioOutputDevices,
  videoInputDevices,
  allDevices,
  totalDevices
} = useMediaDevices()

// Count devices
console.log(`Total devices: ${totalDevices.value}`)

// Filter devices
const microphones = audioInputDevices.value
const speakers = audioOutputDevices.value
const cameras = videoInputDevices.value

// Find specific device
const defaultMic = microphones.find(d => d.isDefault)
```

### Using getDevicesByKind

```typescript
import { MediaDeviceKind } from 'vuesip'

const { getDevicesByKind, getDeviceById } = useMediaDevices()

// Get devices by kind
const audioInputs = getDevicesByKind(MediaDeviceKind.AudioInput)
const audioOutputs = getDevicesByKind(MediaDeviceKind.AudioOutput)
const videoInputs = getDevicesByKind(MediaDeviceKind.VideoInput)

// Get specific device
const device = getDeviceById('device-id-123')
if (device) {
  console.log(`Device: ${device.label}`)
}
```

## Device Selection

### Selecting Audio Input

```typescript
const {
  audioInputDevices,
  selectedAudioInputId,
  selectAudioInput
} = useMediaDevices()

// Select first available microphone
if (audioInputDevices.value.length > 0) {
  selectAudioInput(audioInputDevices.value[0].deviceId)
}

// Watch for selection changes
watch(selectedAudioInputId, (deviceId) => {
  console.log('Selected audio input:', deviceId)
})
```

### Selecting Audio Output

```typescript
const {
  audioOutputDevices,
  selectedAudioOutputId,
  selectAudioOutput
} = useMediaDevices()

// Select specific speaker
function selectSpeaker(deviceId: string) {
  selectAudioOutput(deviceId)
}

// Get selected device details
const {
  selectedAudioOutputDevice
} = useMediaDevices()

console.log('Selected speaker:', selectedAudioOutputDevice.value?.label)
```

### Selecting Video Input

```typescript
const {
  videoInputDevices,
  selectedVideoInputId,
  selectVideoInput
} = useMediaDevices()

// Select camera
function selectCamera(deviceId: string) {
  selectVideoInput(deviceId)
}

// Get selected camera details
const {
  selectedVideoInputDevice
} = useMediaDevices()

console.log('Selected camera:', selectedVideoInputDevice.value?.label)
```

### Building a Device Selector

```vue
<template>
  <div class="device-selector">
    <label for="microphone">Microphone:</label>
    <select id="microphone" v-model="selectedAudioInputId">
      <option
        v-for="device in audioInputDevices"
        :key="device.deviceId"
        :value="device.deviceId"
      >
        {{ device.label }}
      </option>
    </select>

    <label for="speaker">Speaker:</label>
    <select id="speaker" v-model="selectedAudioOutputId">
      <option
        v-for="device in audioOutputDevices"
        :key="device.deviceId"
        :value="device.deviceId"
      >
        {{ device.label }}
      </option>
    </select>

    <label for="camera">Camera:</label>
    <select id="camera" v-model="selectedVideoInputId">
      <option
        v-for="device in videoInputDevices"
        :key="device.deviceId"
        :value="device.deviceId"
      >
        {{ device.label }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { useMediaDevices } from 'vuesip'

const {
  audioInputDevices,
  audioOutputDevices,
  videoInputDevices,
  selectedAudioInputId,
  selectedAudioOutputId,
  selectedVideoInputId
} = useMediaDevices()
</script>
```

## Permission Handling

### Understanding Permission States

VueSip tracks four permission states:

- `NotRequested` - Permission has not been requested yet
- `Prompt` - Browser will prompt user when requested
- `Granted` - User has granted permission
- `Denied` - User has denied permission

### Requesting Permissions

```typescript
const {
  requestPermissions,
  requestAudioPermission,
  requestVideoPermission,
  audioPermission,
  videoPermission,
  hasAudioPermission,
  hasVideoPermission
} = useMediaDevices()

// Request both audio and video permissions
async function requestBothPermissions() {
  try {
    await requestPermissions(true, true)
    console.log('Permissions granted!')
  } catch (error) {
    console.error('Permission denied:', error)
  }
}

// Request audio only
async function requestAudio() {
  const granted = await requestAudioPermission()
  if (granted) {
    console.log('Audio permission granted')
    // Re-enumerate to get device labels
    await enumerateDevices()
  }
}

// Request video only
async function requestVideo() {
  const granted = await requestVideoPermission()
  if (granted) {
    console.log('Video permission granted')
  }
}
```

### Checking Permission Status

```typescript
const {
  audioPermission,
  videoPermission,
  hasAudioPermission,
  hasVideoPermission
} = useMediaDevices()

// Check if permissions are granted
if (hasAudioPermission.value) {
  console.log('Audio permission is granted')
}

// Check specific permission state
import { PermissionStatus } from 'vuesip'

if (audioPermission.value === PermissionStatus.Denied) {
  console.log('User denied audio permission')
} else if (audioPermission.value === PermissionStatus.NotRequested) {
  console.log('Audio permission not requested yet')
}
```

### Permission-Aware UI

```vue
<template>
  <div class="permission-ui">
    <div v-if="!hasAudioPermission" class="permission-prompt">
      <p>Microphone access is required for calls</p>
      <button @click="requestAudio">Grant Microphone Access</button>
    </div>

    <div v-else class="device-selector">
      <select v-model="selectedAudioInputId">
        <option
          v-for="device in audioInputDevices"
          :key="device.deviceId"
          :value="device.deviceId"
        >
          {{ device.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMediaDevices } from 'vuesip'

const {
  audioInputDevices,
  selectedAudioInputId,
  hasAudioPermission,
  requestAudioPermission,
  enumerateDevices
} = useMediaDevices()

async function requestAudio() {
  const granted = await requestAudioPermission()
  if (granted) {
    await enumerateDevices()
  }
}
</script>
```

## Device Testing

### Testing Audio Input

Test a microphone to verify it's working properly:

```typescript
const { testAudioInput, selectedAudioInputId } = useMediaDevices()

async function testMicrophone() {
  try {
    // Test selected device
    const success = await testAudioInput()

    if (success) {
      console.log('Microphone is working!')
    } else {
      console.log('No audio detected from microphone')
    }
  } catch (error) {
    console.error('Failed to test microphone:', error)
  }
}

// Test specific device with options
async function testSpecificDevice(deviceId: string) {
  const success = await testAudioInput(deviceId, {
    duration: 3000, // Test for 3 seconds
    audioLevelThreshold: 0.02 // Minimum audio level
  })

  return success
}
```

### Testing Audio Output

Test a speaker by playing a tone:

```typescript
const { testAudioOutput, selectedAudioOutputId } = useMediaDevices()

async function testSpeaker() {
  try {
    // Test selected speaker (plays 1kHz tone for 500ms)
    const success = await testAudioOutput()

    if (success) {
      console.log('Speaker test tone played successfully')
    } else {
      console.log('Failed to play test tone')
    }
  } catch (error) {
    console.error('Speaker test failed:', error)
  }
}

// Test specific speaker
async function testSpecificSpeaker(deviceId: string) {
  const success = await testAudioOutput(deviceId)
  return success
}
```

### Building a Device Tester

```vue
<template>
  <div class="device-tester">
    <h3>Test Devices</h3>

    <!-- Microphone Test -->
    <div class="test-section">
      <h4>Microphone Test</h4>
      <button
        @click="performMicTest"
        :disabled="testing || !hasAudioPermission"
      >
        {{ testing ? 'Testing...' : 'Test Microphone' }}
      </button>
      <div v-if="micTestResult !== null" class="result">
        {{ micTestResult ? '✓ Working' : '✗ Not detected' }}
      </div>
    </div>

    <!-- Speaker Test -->
    <div class="test-section">
      <h4>Speaker Test</h4>
      <button
        @click="performSpeakerTest"
        :disabled="testing"
      >
        {{ testing ? 'Testing...' : 'Test Speaker' }}
      </button>
      <div v-if="speakerTestResult !== null" class="result">
        {{ speakerTestResult ? '✓ Working' : '✗ Failed' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMediaDevices } from 'vuesip'

const {
  testAudioInput,
  testAudioOutput,
  hasAudioPermission
} = useMediaDevices()

const testing = ref(false)
const micTestResult = ref<boolean | null>(null)
const speakerTestResult = ref<boolean | null>(null)

async function performMicTest() {
  testing.value = true
  micTestResult.value = null

  try {
    const success = await testAudioInput(undefined, {
      duration: 2000,
      audioLevelThreshold: 0.01
    })
    micTestResult.value = success
  } catch (error) {
    micTestResult.value = false
  } finally {
    testing.value = false
  }
}

async function performSpeakerTest() {
  testing.value = true
  speakerTestResult.value = null

  try {
    const success = await testAudioOutput()
    speakerTestResult.value = success
  } catch (error) {
    speakerTestResult.value = false
  } finally {
    testing.value = false
  }
}
</script>
```

## Device Change Monitoring

### Automatic Monitoring

Device change monitoring is enabled by default:

```typescript
const {
  audioInputDevices,
  audioOutputDevices,
  videoInputDevices
} = useMediaDevices({
  autoMonitor: true // Default behavior
})

// Device lists automatically update when devices change
watch(audioInputDevices, (devices) => {
  console.log('Audio devices changed:', devices)
})
```

### Manual Monitoring Control

```typescript
const {
  startDeviceChangeMonitoring,
  stopDeviceChangeMonitoring
} = useMediaDevices({
  autoMonitor: false // Disable automatic monitoring
})

// Start monitoring manually
startDeviceChangeMonitoring()

// Stop monitoring when done
onUnmounted(() => {
  stopDeviceChangeMonitoring()
})
```

### Handling Device Changes

```vue
<template>
  <div class="device-monitor">
    <p>Devices: {{ totalDevices }}</p>
    <div v-if="deviceJustChanged" class="notification">
      Device configuration changed!
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMediaDevices } from 'vuesip'

const {
  audioInputDevices,
  audioOutputDevices,
  videoInputDevices,
  totalDevices
} = useMediaDevices()

const deviceJustChanged = ref(false)

// Watch for device changes
watch(
  [audioInputDevices, audioOutputDevices, videoInputDevices],
  () => {
    deviceJustChanged.value = true

    // Clear notification after 3 seconds
    setTimeout(() => {
      deviceJustChanged.value = false
    }, 3000)
  }
)
</script>
```

### Recovering from Device Loss

```typescript
import { watch } from 'vue'

const {
  selectedAudioInputId,
  audioInputDevices,
  selectAudioInput
} = useMediaDevices()

// Handle when selected device is unplugged
watch([selectedAudioInputId, audioInputDevices], ([selectedId, devices]) => {
  if (selectedId) {
    const deviceExists = devices.some(d => d.deviceId === selectedId)

    if (!deviceExists && devices.length > 0) {
      // Selected device was unplugged, select first available
      console.log('Selected device lost, switching to first available')
      selectAudioInput(devices[0].deviceId)
    }
  }
})
```

## Best Practices

### 1. Request Permissions Early

Request permissions before attempting to enumerate devices for full device labels:

```typescript
// Good: Request permission first
async function initialize() {
  await requestPermissions(true, false)
  await enumerateDevices()
  // Now device labels are available
}

// Bad: Enumerate without permission
async function initialize() {
  await enumerateDevices()
  // Device labels will be empty or generic
}
```

### 2. Handle Permission Denials Gracefully

```typescript
async function setupAudio() {
  try {
    await requestAudioPermission()
  } catch (error) {
    // Show user-friendly message
    showError('Microphone access is required for calls. Please enable it in your browser settings.')
    return
  }

  // Continue with setup
  await enumerateDevices()
}
```

### 3. Validate Device Selection

```typescript
function selectDevice(deviceId: string) {
  const device = getDeviceById(deviceId)

  if (!device) {
    console.warn('Device not found:', deviceId)
    // Fall back to first available device
    if (audioInputDevices.value.length > 0) {
      selectAudioInput(audioInputDevices.value[0].deviceId)
    }
    return
  }

  selectAudioInput(deviceId)
}
```

### 4. Test Devices Before Important Calls

```typescript
async function prepareForCall() {
  // Test microphone before joining call
  const micWorks = await testAudioInput(undefined, {
    duration: 2000,
    audioLevelThreshold: 0.01
  })

  if (!micWorks) {
    showWarning('No audio detected from microphone. Please check your device.')
  }

  return micWorks
}
```

### 5. Save User Preferences

```typescript
import { watch } from 'vue'

const {
  selectedAudioInputId,
  selectedAudioOutputId,
  selectedVideoInputId
} = useMediaDevices()

// Save to localStorage
watch(selectedAudioInputId, (deviceId) => {
  if (deviceId) {
    localStorage.setItem('preferredMicrophone', deviceId)
  }
})

// Restore on load
onMounted(() => {
  const savedDeviceId = localStorage.getItem('preferredMicrophone')
  if (savedDeviceId) {
    selectAudioInput(savedDeviceId)
  }
})
```

### 6. Handle Mobile Devices

```typescript
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

if (isMobile) {
  // Mobile devices typically have fewer device choices
  // Automatically select defaults
  if (audioInputDevices.value.length > 0) {
    selectAudioInput(audioInputDevices.value[0].deviceId)
  }
}
```

### 7. Provide Clear User Feedback

```vue
<template>
  <div class="device-status">
    <div v-if="isEnumerating" class="loading">
      Loading devices...
    </div>

    <div v-else-if="!hasAudioInputDevices" class="warning">
      No microphone detected
    </div>

    <div v-else class="success">
      {{ audioInputDevices.length }} microphone(s) available
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMediaDevices } from 'vuesip'

const {
  isEnumerating,
  hasAudioInputDevices,
  audioInputDevices
} = useMediaDevices()
</script>
```

## Complete Examples

### Full Device Manager Component

```vue
<template>
  <div class="device-manager">
    <h2>Device Settings</h2>

    <!-- Permission Request -->
    <div v-if="!hasAudioPermission" class="permission-section">
      <p>Microphone access is required</p>
      <button @click="handleRequestPermission">
        Grant Permission
      </button>
    </div>

    <!-- Device Selection -->
    <div v-else class="device-section">
      <!-- Microphone -->
      <div class="device-group">
        <label for="microphone">Microphone</label>
        <select
          id="microphone"
          v-model="selectedAudioInputId"
          :disabled="isEnumerating"
        >
          <option
            v-for="device in audioInputDevices"
            :key="device.deviceId"
            :value="device.deviceId"
          >
            {{ device.label }}
          </option>
        </select>
        <button
          @click="testMic"
          :disabled="testingMic || !selectedAudioInputId"
        >
          {{ testingMic ? 'Testing...' : 'Test' }}
        </button>
        <span v-if="micTestResult !== null" class="test-result">
          {{ micTestResult ? '✓' : '✗' }}
        </span>
      </div>

      <!-- Speaker -->
      <div class="device-group">
        <label for="speaker">Speaker</label>
        <select
          id="speaker"
          v-model="selectedAudioOutputId"
          :disabled="isEnumerating"
        >
          <option
            v-for="device in audioOutputDevices"
            :key="device.deviceId"
            :value="device.deviceId"
          >
            {{ device.label }}
          </option>
        </select>
        <button
          @click="testSpeaker"
          :disabled="testingSpeaker || !selectedAudioOutputId"
        >
          {{ testingSpeaker ? 'Testing...' : 'Test' }}
        </button>
        <span v-if="speakerTestResult !== null" class="test-result">
          {{ speakerTestResult ? '✓' : '✗' }}
        </span>
      </div>

      <!-- Camera -->
      <div class="device-group">
        <label for="camera">Camera</label>
        <select
          id="camera"
          v-model="selectedVideoInputId"
          :disabled="isEnumerating || !hasVideoInputDevices"
        >
          <option value="">No camera</option>
          <option
            v-for="device in videoInputDevices"
            :key="device.deviceId"
            :value="device.deviceId"
          >
            {{ device.label }}
          </option>
        </select>
      </div>

      <!-- Refresh Button -->
      <button
        @click="handleRefreshDevices"
        :disabled="isEnumerating"
      >
        {{ isEnumerating ? 'Refreshing...' : 'Refresh Devices' }}
      </button>
    </div>

    <!-- Error Display -->
    <div v-if="lastError" class="error">
      {{ lastError.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMediaDevices } from 'vuesip'

const {
  // Devices
  audioInputDevices,
  audioOutputDevices,
  videoInputDevices,
  hasAudioInputDevices,
  hasAudioOutputDevices,
  hasVideoInputDevices,

  // Selection
  selectedAudioInputId,
  selectedAudioOutputId,
  selectedVideoInputId,

  // Permissions
  hasAudioPermission,
  hasVideoPermission,
  requestPermissions,

  // Methods
  enumerateDevices,
  testAudioInput,
  testAudioOutput,

  // State
  isEnumerating,
  lastError
} = useMediaDevices()

// Testing state
const testingMic = ref(false)
const testingSpeaker = ref(false)
const micTestResult = ref<boolean | null>(null)
const speakerTestResult = ref<boolean | null>(null)

async function handleRequestPermission() {
  try {
    await requestPermissions(true, true)
    await enumerateDevices()
  } catch (error) {
    console.error('Permission request failed:', error)
  }
}

async function handleRefreshDevices() {
  try {
    await enumerateDevices()
  } catch (error) {
    console.error('Failed to refresh devices:', error)
  }
}

async function testMic() {
  testingMic.value = true
  micTestResult.value = null

  try {
    const result = await testAudioInput(undefined, {
      duration: 2000,
      audioLevelThreshold: 0.01
    })
    micTestResult.value = result
  } catch (error) {
    micTestResult.value = false
  } finally {
    testingMic.value = false
  }
}

async function testSpeaker() {
  testingSpeaker.value = true
  speakerTestResult.value = null

  try {
    const result = await testAudioOutput()
    speakerTestResult.value = result
  } catch (error) {
    speakerTestResult.value = false
  } finally {
    testingSpeaker.value = false
  }
}
</script>

<style scoped>
.device-manager {
  padding: 20px;
  max-width: 600px;
}

.device-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.device-group label {
  min-width: 100px;
}

.device-group select {
  flex: 1;
  padding: 8px;
}

.test-result {
  font-size: 20px;
}

.error {
  color: red;
  margin-top: 10px;
}

.permission-section {
  padding: 20px;
  background: #f5f5f5;
  border-radius: 4px;
}
</style>
```

### Settings Page with Persistence

```vue
<template>
  <div class="device-settings">
    <h2>Audio/Video Settings</h2>

    <div class="settings-section">
      <h3>Microphone</h3>
      <select v-model="selectedAudioInputId">
        <option
          v-for="device in audioInputDevices"
          :key="device.deviceId"
          :value="device.deviceId"
        >
          {{ device.label }}
        </option>
      </select>
    </div>

    <div class="settings-section">
      <h3>Speaker</h3>
      <select v-model="selectedAudioOutputId">
        <option
          v-for="device in audioOutputDevices"
          :key="device.deviceId"
          :value="device.deviceId"
        >
          {{ device.label }}
        </option>
      </select>
    </div>

    <div class="settings-section">
      <h3>Camera</h3>
      <select v-model="selectedVideoInputId">
        <option value="">None</option>
        <option
          v-for="device in videoInputDevices"
          :key="device.deviceId"
          :value="device.deviceId"
        >
          {{ device.label }}
        </option>
      </select>
    </div>

    <button @click="saveSettings">Save Settings</button>
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { useMediaDevices } from 'vuesip'

const {
  audioInputDevices,
  audioOutputDevices,
  videoInputDevices,
  selectedAudioInputId,
  selectedAudioOutputId,
  selectedVideoInputId,
  selectAudioInput,
  selectAudioOutput,
  selectVideoInput,
  requestPermissions,
  enumerateDevices
} = useMediaDevices()

// Load saved preferences
onMounted(async () => {
  // Request permissions first
  await requestPermissions(true, true)
  await enumerateDevices()

  // Restore saved preferences
  const savedMic = localStorage.getItem('preferredMicrophone')
  const savedSpeaker = localStorage.getItem('preferredSpeaker')
  const savedCamera = localStorage.getItem('preferredCamera')

  if (savedMic) selectAudioInput(savedMic)
  if (savedSpeaker) selectAudioOutput(savedSpeaker)
  if (savedCamera) selectVideoInput(savedCamera)
})

// Auto-save on change
watch(selectedAudioInputId, (deviceId) => {
  if (deviceId) {
    localStorage.setItem('preferredMicrophone', deviceId)
  }
})

watch(selectedAudioOutputId, (deviceId) => {
  if (deviceId) {
    localStorage.setItem('preferredSpeaker', deviceId)
  }
})

watch(selectedVideoInputId, (deviceId) => {
  if (deviceId) {
    localStorage.setItem('preferredCamera', deviceId)
  }
})

function saveSettings() {
  console.log('Settings saved!')
}
</script>
```

## API Reference

### useMediaDevices()

Primary composable for device management.

#### Parameters

```typescript
function useMediaDevices(
  mediaManager?: Ref<MediaManager | null>,
  options?: {
    autoEnumerate?: boolean  // Default: true
    autoMonitor?: boolean    // Default: true
  }
): UseMediaDevicesReturn
```

#### Returns

##### Reactive State

- `audioInputDevices: ComputedRef<readonly MediaDevice[]>` - Audio input devices
- `audioOutputDevices: ComputedRef<readonly MediaDevice[]>` - Audio output devices
- `videoInputDevices: ComputedRef<readonly MediaDevice[]>` - Video input devices
- `allDevices: ComputedRef<readonly MediaDevice[]>` - All devices
- `selectedAudioInputId: Ref<string | null>` - Selected audio input device ID
- `selectedAudioOutputId: Ref<string | null>` - Selected audio output device ID
- `selectedVideoInputId: Ref<string | null>` - Selected video input device ID
- `selectedAudioInputDevice: ComputedRef<MediaDevice | undefined>` - Selected audio input device
- `selectedAudioOutputDevice: ComputedRef<MediaDevice | undefined>` - Selected audio output device
- `selectedVideoInputDevice: ComputedRef<MediaDevice | undefined>` - Selected video input device
- `audioPermission: ComputedRef<PermissionStatus>` - Audio permission status
- `videoPermission: ComputedRef<PermissionStatus>` - Video permission status
- `hasAudioPermission: ComputedRef<boolean>` - Has audio permission
- `hasVideoPermission: ComputedRef<boolean>` - Has video permission
- `hasAudioInputDevices: ComputedRef<boolean>` - Has audio input devices
- `hasAudioOutputDevices: ComputedRef<boolean>` - Has audio output devices
- `hasVideoInputDevices: ComputedRef<boolean>` - Has video input devices
- `totalDevices: ComputedRef<number>` - Total device count
- `isEnumerating: Ref<boolean>` - Is enumerating devices
- `lastError: Ref<Error | null>` - Last error

##### Methods

- `enumerateDevices(): Promise<MediaDevice[]>` - Enumerate devices
- `requestAudioPermission(): Promise<boolean>` - Request audio permission
- `requestVideoPermission(): Promise<boolean>` - Request video permission
- `requestPermissions(audio?: boolean, video?: boolean): Promise<void>` - Request permissions
- `selectAudioInput(deviceId: string): void` - Select audio input device
- `selectAudioOutput(deviceId: string): void` - Select audio output device
- `selectVideoInput(deviceId: string): void` - Select video input device
- `testAudioInput(deviceId?: string, options?: DeviceTestOptions): Promise<boolean>` - Test audio input
- `testAudioOutput(deviceId?: string): Promise<boolean>` - Test audio output
- `getDeviceById(deviceId: string): MediaDevice | undefined` - Get device by ID
- `getDevicesByKind(kind: MediaDeviceKind): readonly MediaDevice[]` - Get devices by kind
- `startDeviceChangeMonitoring(): void` - Start device change monitoring
- `stopDeviceChangeMonitoring(): void` - Stop device change monitoring

### Types

#### MediaDevice

```typescript
interface MediaDevice {
  deviceId: string
  kind: MediaDeviceKind
  label: string
  groupId: string
  isDefault?: boolean
}
```

#### MediaDeviceKind

```typescript
enum MediaDeviceKind {
  AudioInput = 'audioinput',
  AudioOutput = 'audiooutput',
  VideoInput = 'videoinput'
}
```

#### PermissionStatus

```typescript
enum PermissionStatus {
  Granted = 'granted',
  Denied = 'denied',
  Prompt = 'prompt',
  NotRequested = 'not_requested'
}
```

#### DeviceTestOptions

```typescript
interface DeviceTestOptions {
  duration?: number              // Test duration in ms (default: 2000)
  audioLevelThreshold?: number   // Audio level threshold 0-1 (default: 0.01)
}
```

## Troubleshooting

### Devices Not Showing Labels

**Problem**: Device labels show as empty or generic (e.g., "Microphone (12345)")

**Solution**: Request permissions before enumerating devices:

```typescript
await requestPermissions(true, false)
await enumerateDevices()
```

### Selected Device Not Working

**Problem**: Selected device doesn't produce audio/video

**Solution**: Test the device first:

```typescript
const works = await testAudioInput(deviceId)
if (!works) {
  console.error('Device not working')
}
```

### Permission Denied

**Problem**: User denied permission and it's stuck

**Solution**: Provide clear instructions to reset in browser settings:

```typescript
if (audioPermission.value === PermissionStatus.Denied) {
  showMessage('Please reset microphone permission in your browser settings')
}
```

### Device Change Not Detected

**Problem**: Plugging/unplugging devices doesn't update list

**Solution**: Ensure device monitoring is enabled:

```typescript
const devices = useMediaDevices({
  autoMonitor: true  // Ensure this is enabled
})
```

## Related Documentation

- [Call Management Guide](./call-management.md)
- [Conference Management Guide](./conference-management.md)
- [Testing Guide](../testing-guide.md)

## Further Reading

- [WebRTC getUserMedia API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [MediaDevices API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices)
- [Permissions API](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API)
