# Making Calls Guide

This guide explains how to make outgoing calls in VueSip, including call setup, configuration options, event handling, and error management.

## Table of Contents

- [Quick Start](#quick-start)
- [Call Setup](#call-setup)
- [Call Options](#call-options)
- [Media Constraints](#media-constraints)
- [Call Events and Lifecycle](#call-events-and-lifecycle)
- [Error Handling](#error-handling)
- [Advanced Examples](#advanced-examples)
- [Best Practices](#best-practices)

## Quick Start

The simplest way to make a call:

```typescript
import { useSipClient, useCallSession } from 'vuesip'

const { sipClient } = useSipClient()
const { makeCall, state, hangup } = useCallSession(sipClient)

// Make a call
await makeCall('sip:user@example.com')

// Later: hang up the call
await hangup()
```

## Call Setup

### Basic Outgoing Call

Use the `useCallSession` composable to manage outgoing calls:

```typescript
import { ref } from 'vue'
import { useSipClient, useCallSession } from 'vuesip'

// Initialize SIP client
const { sipClient, isConnected } = useSipClient({
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:alice@example.com',
  password: 'your-password'
})

// Initialize call session
const {
  makeCall,
  hangup,
  state,
  remoteUri,
  duration,
  localStream,
  remoteStream
} = useCallSession(sipClient)

// Make a call when connected
const handleCall = async () => {
  if (!isConnected.value) {
    console.error('Not connected to SIP server')
    return
  }

  try {
    await makeCall('sip:bob@example.com')
    console.log('Call initiated')
  } catch (error) {
    console.error('Call failed:', error)
  }
}
```

### Target URI Formats

VueSip accepts multiple target URI formats:

```typescript
// Full SIP URI
await makeCall('sip:user@domain.com')

// SIP URI with port
await makeCall('sip:user@domain.com:5060')

// SIP URI with display name (display name ignored for outgoing)
await makeCall('"Bob Smith" <sip:bob@domain.com>')

// Extension/short number (automatically formatted based on config)
await makeCall('1000')
```

**Note:** The target URI is validated before initiating the call. Invalid URIs will throw an error immediately.

## Call Options

The `makeCall` method accepts an options object to customize the call behavior:

```typescript
interface CallSessionOptions {
  /** Enable audio (default: true) */
  audio?: boolean
  /** Enable video (default: false) */
  video?: boolean
  /** Custom call data */
  data?: Record<string, unknown>
  /** Auto-cleanup on hangup (default: true) */
  autoCleanup?: boolean
}
```

### Audio-Only Call (Default)

```typescript
// Audio only (default behavior)
await makeCall('sip:user@domain.com', {
  audio: true,
  video: false
})

// Or simply:
await makeCall('sip:user@domain.com')
```

### Video Call

```typescript
// Enable video
await makeCall('sip:user@domain.com', {
  audio: true,
  video: true
})
```

### Attach Custom Data

```typescript
// Add custom metadata to the call
await makeCall('sip:user@domain.com', {
  data: {
    callType: 'support',
    ticketId: '12345',
    priority: 'high'
  }
})

// Access custom data later
console.log(session.value?.data)
```

## Media Constraints

For advanced media configuration, you can specify detailed MediaTrackConstraints:

### Audio Constraints

```typescript
await makeCall('sip:user@domain.com', {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000
  },
  video: false
})
```

### Video Constraints

```typescript
await makeCall('sip:user@domain.com', {
  audio: true,
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
    facingMode: 'user' // or 'environment' for rear camera
  }
})
```

### Specific Device Selection

```typescript
import { useMediaDevices } from 'vuesip'

const { audioInputDevices, videoDevices } = useMediaDevices()

// Select specific devices
await makeCall('sip:user@domain.com', {
  audio: {
    deviceId: { exact: audioInputDevices.value[0].deviceId }
  },
  video: {
    deviceId: { exact: videoDevices.value[0].deviceId }
  }
})
```

### Screen Sharing

For screen sharing, acquire the screen stream separately:

```typescript
import { useMediaManager } from 'vuesip'

const { mediaManager } = useMediaManager()

// Get screen share stream
const screenStream = await navigator.mediaDevices.getDisplayMedia({
  video: true,
  audio: false
})

// Set as local stream before making call
mediaManager.value?.setLocalStream(screenStream)

// Make call
await makeCall('sip:user@domain.com', {
  video: true
})
```

## Call Events and Lifecycle

### Call States

A call progresses through several states:

```typescript
type CallState =
  | 'idle'          // No active call
  | 'calling'       // Outgoing call initiated
  | 'ringing'       // Incoming call (not used for outgoing)
  | 'answering'     // Call being answered (not used for outgoing)
  | 'early_media'   // Early media (e.g., ringback tone)
  | 'active'        // Call connected
  | 'held'          // Call on hold (local)
  | 'remote_held'   // Call on hold (remote)
  | 'terminating'   // Call ending
  | 'terminated'    // Call ended normally
  | 'failed'        // Call failed
```

### Monitoring Call State

```typescript
import { watch } from 'vue'

const { state, makeCall } = useCallSession(sipClient)

// Watch state changes
watch(state, (newState, oldState) => {
  console.log(`Call state: ${oldState} → ${newState}`)

  switch (newState) {
    case 'calling':
      console.log('Call is being placed...')
      break
    case 'early_media':
      console.log('Ringback tone playing')
      break
    case 'active':
      console.log('Call connected!')
      break
    case 'terminated':
      console.log('Call ended')
      break
    case 'failed':
      console.log('Call failed')
      break
  }
})
```

### Call Lifecycle Hooks

Track the complete call lifecycle:

```typescript
const {
  makeCall,
  state,
  timing,
  duration,
  terminationCause
} = useCallSession(sipClient)

// Track timing information
watch(timing, (timingInfo) => {
  console.log('Call started:', timingInfo.startTime)
  console.log('Call answered:', timingInfo.answerTime)
  console.log('Call ended:', timingInfo.endTime)
  console.log('Duration:', timingInfo.duration, 'seconds')
})

// Monitor duration (updates every second during active call)
watch(duration, (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  console.log(`Call duration: ${minutes}:${secs.toString().padStart(2, '0')}`)
})

// Check termination cause
watch(state, (newState) => {
  if (newState === 'terminated' || newState === 'failed') {
    console.log('Termination cause:', terminationCause.value)
    // Possible values: 'canceled', 'rejected', 'no_answer', 'unavailable',
    // 'busy', 'bye', 'request_timeout', 'webrtc_error', 'internal_error',
    // 'network_error', 'other'
  }
})
```

### Media Stream Events

Monitor media streams during the call:

```typescript
const { localStream, remoteStream, hasLocalVideo, hasRemoteVideo } = useCallSession(sipClient)

// Watch for local stream
watch(localStream, (stream) => {
  if (stream) {
    console.log('Local stream available:', stream.getTracks())
    // Attach to video element
    const localVideo = document.getElementById('local-video')
    if (localVideo) {
      localVideo.srcObject = stream
    }
  }
})

// Watch for remote stream
watch(remoteStream, (stream) => {
  if (stream) {
    console.log('Remote stream available:', stream.getTracks())
    // Attach to video element
    const remoteVideo = document.getElementById('remote-video')
    if (remoteVideo) {
      remoteVideo.srcObject = stream
    }
  }
})

// Track video state
watch([hasLocalVideo, hasRemoteVideo], ([local, remote]) => {
  console.log(`Video - Local: ${local}, Remote: ${remote}`)
})
```

## Error Handling

### Common Error Scenarios

#### 1. SIP Client Not Initialized

```typescript
try {
  await makeCall('sip:user@domain.com')
} catch (error) {
  if (error.message === 'SIP client not initialized') {
    console.error('Connect to SIP server first')
    // Trigger connection
    await connect()
  }
}
```

#### 2. Invalid Target URI

```typescript
try {
  await makeCall('invalid-uri')
} catch (error) {
  if (error.message.includes('Invalid target URI')) {
    console.error('Please enter a valid SIP URI')
    // Show validation error to user
  }
}
```

#### 3. Empty Target URI

```typescript
try {
  await makeCall('')
} catch (error) {
  if (error.message === 'Target URI cannot be empty') {
    console.error('Please enter a phone number or URI')
  }
}
```

#### 4. Call Operation In Progress

```typescript
try {
  await makeCall('sip:user@domain.com')
} catch (error) {
  if (error.message === 'Call operation already in progress') {
    console.error('Please wait for the current operation to complete')
  }
}
```

#### 5. Media Acquisition Failed

```typescript
try {
  await makeCall('sip:user@domain.com', { video: true })
} catch (error) {
  if (error.name === 'NotAllowedError') {
    console.error('Camera/microphone access denied')
    // Prompt user to grant permissions
  } else if (error.name === 'NotFoundError') {
    console.error('No camera/microphone found')
    // Fall back to audio-only
  } else if (error.name === 'NotReadableError') {
    console.error('Camera/microphone is in use by another application')
  }
}
```

### Comprehensive Error Handler

```typescript
const handleCallError = (error: Error) => {
  console.error('Call error:', error)

  // Check error type
  if (error.message.includes('SIP client not initialized')) {
    showNotification('Please connect to SIP server first', 'error')
  } else if (error.message.includes('Invalid target URI')) {
    showNotification('Invalid phone number or SIP address', 'error')
  } else if (error.message.includes('Target URI cannot be empty')) {
    showNotification('Please enter a phone number', 'error')
  } else if (error.message.includes('Call operation already in progress')) {
    showNotification('Please wait for current operation to complete', 'warning')
  } else if (error.name === 'NotAllowedError') {
    showNotification('Please grant camera/microphone permissions', 'error')
  } else if (error.name === 'NotFoundError') {
    showNotification('No camera/microphone found', 'error')
  } else if (error.name === 'NotReadableError') {
    showNotification('Camera/microphone is already in use', 'error')
  } else {
    showNotification('Failed to make call. Please try again.', 'error')
  }
}

// Usage
try {
  await makeCall(targetUri.value, callOptions.value)
} catch (error) {
  handleCallError(error)
}
```

### Validation Before Calling

Validate input before attempting to make a call:

```typescript
import { validateSipUri } from 'vuesip'

const makeCallWithValidation = async (target: string) => {
  // Pre-validate URI
  const validation = validateSipUri(target)

  if (!validation.isValid) {
    console.error('Validation failed:', validation.error)
    console.error('Details:', validation.errors)
    return
  }

  // URI is valid, proceed with call
  try {
    await makeCall(target)
  } catch (error) {
    handleCallError(error)
  }
}
```

### Network Error Recovery

```typescript
import { watch } from 'vue'

const { makeCall, state, terminationCause } = useCallSession(sipClient)

watch(state, (newState) => {
  if (newState === 'failed' && terminationCause.value === 'network_error') {
    console.error('Network error detected')

    // Attempt to reconnect
    setTimeout(async () => {
      console.log('Attempting to reconnect...')
      try {
        await connect()
        // Optionally retry the call
      } catch (error) {
        console.error('Reconnection failed:', error)
      }
    }, 5000)
  }
})
```

## Advanced Examples

### Complete Call Manager Component

```vue
<template>
  <div class="call-manager">
    <div v-if="state === 'idle'" class="dial-section">
      <input
        v-model="targetUri"
        placeholder="Enter SIP URI or number"
        @keyup.enter="handleMakeCall"
      />
      <button
        @click="handleMakeCall"
        :disabled="!isConnected || isProcessing"
      >
        {{ isProcessing ? 'Calling...' : 'Call' }}
      </button>
    </div>

    <div v-else-if="state === 'calling'" class="calling">
      <p>Calling {{ remoteUri }}...</p>
      <button @click="handleHangup">Cancel</button>
    </div>

    <div v-else-if="state === 'active'" class="active-call">
      <p>Connected to {{ remoteUri }}</p>
      <p>Duration: {{ formatDuration(duration) }}</p>

      <div class="call-controls">
        <button @click="toggleMute">
          {{ isMuted ? 'Unmute' : 'Mute' }}
        </button>
        <button @click="toggleHold">
          {{ isOnHold ? 'Resume' : 'Hold' }}
        </button>
        <button @click="handleHangup" class="danger">
          Hang Up
        </button>
      </div>

      <div class="media-section">
        <video ref="localVideo" autoplay muted playsinline />
        <video ref="remoteVideo" autoplay playsinline />
      </div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useSipClient, useCallSession, validateSipUri } from 'vuesip'

const targetUri = ref('')
const error = ref('')
const isProcessing = ref(false)

const { sipClient, isConnected } = useSipClient()

const {
  makeCall,
  hangup,
  toggleMute,
  toggleHold,
  state,
  remoteUri,
  duration,
  isMuted,
  isOnHold,
  localStream,
  remoteStream,
  terminationCause
} = useCallSession(sipClient)

const localVideo = ref<HTMLVideoElement>()
const remoteVideo = ref<HTMLVideoElement>()

// Format duration as MM:SS
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Make call with validation
const handleMakeCall = async () => {
  error.value = ''

  if (!targetUri.value.trim()) {
    error.value = 'Please enter a phone number or SIP URI'
    return
  }

  // Validate URI
  const validation = validateSipUri(targetUri.value)
  if (!validation.isValid) {
    error.value = validation.error || 'Invalid SIP URI'
    return
  }

  isProcessing.value = true

  try {
    await makeCall(targetUri.value, {
      audio: true,
      video: false
    })
  } catch (err: any) {
    error.value = err.message || 'Failed to make call'
    console.error('Call error:', err)
  } finally {
    isProcessing.value = false
  }
}

// Hang up call
const handleHangup = async () => {
  isProcessing.value = true
  try {
    await hangup()
  } catch (err: any) {
    error.value = err.message || 'Failed to hang up'
  } finally {
    isProcessing.value = false
  }
}

// Attach local stream to video element
watch(localStream, (stream) => {
  if (stream && localVideo.value) {
    localVideo.value.srcObject = stream
  }
})

// Attach remote stream to video element
watch(remoteStream, (stream) => {
  if (stream && remoteVideo.value) {
    remoteVideo.value.srcObject = stream
  }
})

// Handle call termination
watch(state, (newState) => {
  if (newState === 'terminated' || newState === 'failed') {
    // Clear target URI on call end
    targetUri.value = ''

    // Log termination cause
    if (terminationCause.value) {
      console.log('Call ended:', terminationCause.value)
    }
  }
})
</script>

<style scoped>
.call-manager {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.dial-section {
  display: flex;
  gap: 10px;
}

.dial-section input {
  flex: 1;
  padding: 10px;
  font-size: 16px;
}

button {
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.danger {
  background: #ef4444;
  color: white;
}

.call-controls {
  display: flex;
  gap: 10px;
  margin: 20px 0;
}

.media-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

video {
  width: 100%;
  background: #000;
  border-radius: 8px;
}

.error {
  color: #ef4444;
  margin-top: 10px;
  padding: 10px;
  background: #fee;
  border-radius: 4px;
}
</style>
```

### Auto-Retry on Failure

```typescript
const { makeCall, state, terminationCause } = useCallSession(sipClient)

const makeCallWithRetry = async (
  target: string,
  maxRetries = 3,
  retryDelay = 2000
) => {
  let attempts = 0

  while (attempts < maxRetries) {
    try {
      attempts++
      console.log(`Call attempt ${attempts}/${maxRetries}`)

      await makeCall(target)

      // Wait for call to resolve (success or failure)
      await new Promise<void>((resolve) => {
        const unwatch = watch(state, (newState) => {
          if (newState === 'active') {
            unwatch()
            resolve()
          } else if (newState === 'failed' || newState === 'terminated') {
            unwatch()
            resolve()
          }
        })
      })

      // If call is active, we succeeded
      if (state.value === 'active') {
        console.log('Call connected successfully')
        return true
      }

      // If we have retries left, wait and try again
      if (attempts < maxRetries) {
        console.log(`Call failed, retrying in ${retryDelay}ms...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }

    } catch (error) {
      console.error(`Attempt ${attempts} failed:`, error)

      // Don't retry on validation errors
      if (error.message.includes('Invalid target URI')) {
        throw error
      }

      if (attempts >= maxRetries) {
        throw new Error(`Failed to connect after ${maxRetries} attempts`)
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay))
    }
  }

  return false
}

// Usage
try {
  const success = await makeCallWithRetry('sip:user@domain.com', 3, 2000)
  if (!success) {
    console.error('All retry attempts failed')
  }
} catch (error) {
  console.error('Call failed:', error)
}
```

### Call with Timeout

```typescript
const makeCallWithTimeout = async (
  target: string,
  timeoutMs = 30000 // 30 seconds
) => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Call timeout - no answer'))
    }, timeoutMs)
  })

  const callPromise = new Promise<void>(async (resolve, reject) => {
    try {
      await makeCall(target)

      // Wait for call to be answered or fail
      const unwatch = watch(state, (newState) => {
        if (newState === 'active') {
          unwatch()
          resolve()
        } else if (newState === 'failed') {
          unwatch()
          reject(new Error('Call failed'))
        }
      })
    } catch (error) {
      reject(error)
    }
  })

  try {
    await Promise.race([callPromise, timeoutPromise])
    console.log('Call answered')
  } catch (error) {
    // Hang up if timeout
    await hangup()
    throw error
  }
}
```

## Best Practices

### 1. Always Check Connection State

```typescript
const handleCall = async () => {
  if (!isConnected.value) {
    console.error('Not connected to SIP server')
    return
  }

  await makeCall(targetUri.value)
}
```

### 2. Validate URIs Before Calling

```typescript
import { validateSipUri } from 'vuesip'

const validation = validateSipUri(targetUri.value)
if (!validation.isValid) {
  showError(validation.error)
  return
}

await makeCall(targetUri.value)
```

### 3. Handle Errors Gracefully

```typescript
try {
  await makeCall(targetUri.value)
} catch (error) {
  // Show user-friendly error message
  showNotification(getUserFriendlyError(error), 'error')
  // Log detailed error for debugging
  console.error('Call error:', error)
}
```

### 4. Clean Up Media Streams

Media streams are automatically cleaned up when calls end, but you can manually clean up if needed:

```typescript
import { onUnmounted } from 'vue'

onUnmounted(() => {
  // Composable handles cleanup automatically
  // No manual cleanup needed
})
```

### 5. Request Permissions Early

Request media permissions before making a call:

```typescript
import { useMediaDevices } from 'vuesip'

const { requestPermissions, permissions } = useMediaDevices()

// Request permissions when component mounts
onMounted(async () => {
  try {
    await requestPermissions({ audio: true, video: false })
  } catch (error) {
    console.error('Permission denied:', error)
  }
})

// Check permissions before calling
const handleCall = async () => {
  if (permissions.value.audio !== 'granted') {
    console.error('Microphone access required')
    return
  }

  await makeCall(targetUri.value)
}
```

### 6. Monitor Call Quality

```typescript
const { getStats } = useCallSession(sipClient)

// Get statistics during active call
const monitorCallQuality = async () => {
  const stats = await getStats()

  if (stats?.audio) {
    console.log('Packets lost:', stats.audio.packetsLost)
    console.log('Jitter:', stats.audio.jitter)
    console.log('RTT:', stats.audio.roundTripTime)

    // Alert on poor quality
    if (stats.audio.packetsLost > 50) {
      console.warn('High packet loss detected')
    }
  }
}

// Monitor every 5 seconds during active call
const stopMonitoring = setInterval(() => {
  if (state.value === 'active') {
    monitorCallQuality()
  }
}, 5000)

// Clean up on component unmount
onUnmounted(() => {
  clearInterval(stopMonitoring)
})
```

### 7. Provide User Feedback

```typescript
// Show loading states
const isDialing = computed(() => state.value === 'calling')
const isConnecting = computed(() =>
  state.value === 'calling' || state.value === 'early_media'
)

// Show connection status
const statusMessage = computed(() => {
  switch (state.value) {
    case 'calling':
      return 'Dialing...'
    case 'early_media':
      return 'Ringing...'
    case 'active':
      return 'Connected'
    case 'failed':
      return 'Call failed'
    default:
      return ''
  }
})
```

### 8. Handle Concurrent Calls

```typescript
// Check if call is already active
if (state.value !== 'idle') {
  console.error('Another call is active')
  return
}

await makeCall(targetUri.value)
```

### 9. Use Try-Catch for Async Operations

```typescript
const handleMakeCall = async () => {
  try {
    await makeCall(targetUri.value)
  } catch (error) {
    handleCallError(error)
  }
}

const handleHangup = async () => {
  try {
    await hangup()
  } catch (error) {
    console.error('Hangup error:', error)
  }
}
```

### 10. Log Important Events

```typescript
watch(state, (newState, oldState) => {
  console.log(`[Call] ${oldState} → ${newState}`)
})

watch(timing, (timingInfo) => {
  if (timingInfo.answerTime) {
    const ringDuration = timingInfo.answerTime.getTime() -
                        timingInfo.startTime.getTime()
    console.log(`[Call] Answered after ${ringDuration}ms`)
  }
})
```

## See Also

- [Receiving Calls Guide](./receiving-calls.md) - Learn how to handle incoming calls
- [Call Controls Guide](./call-controls.md) - Learn about hold, mute, DTMF, etc.
- [Media Management Guide](./media-management.md) - Advanced media configuration
- [API Reference](../api/use-call-session.md) - Complete API documentation
