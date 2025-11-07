# Getting Started with VueSip

Welcome to VueSip! This guide will help you get started with building SIP/VoIP applications using Vue 3.

## What is VueSip?

VueSip is a headless Vue.js component library for building SIP (Session Initiation Protocol) applications. It provides powerful, reactive composables that handle the business logic of VoIP calling, while giving you complete control over the UI.

**Key Features:**

- **Headless Architecture** - Complete separation of logic and UI
- **Vue 3 Composition API** - Modern, reactive composables
- **TypeScript Support** - Full type safety and IntelliSense
- **WebRTC Integration** - Built on JsSIP for reliable SIP calling
- **Device Management** - Audio/video device selection and testing
- **DTMF Support** - Send dialpad tones during calls
- **Flexible Configuration** - Extensive options for customization

## Installation

Install VueSip using your preferred package manager:

::: code-group

```bash [npm]
npm install vuesip
```

```bash [pnpm]
pnpm add vuesip
```

```bash [yarn]
yarn add vuesip
```

:::

### Peer Dependencies

VueSip requires Vue 3.4.0 or higher:

```json
{
  "peerDependencies": {
    "vue": "^3.4.0"
  }
}
```

### Browser Support

VueSip requires WebRTC support and works on:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Basic Setup

There are two ways to use VueSip in your application:

### Option 1: Direct Composable Usage (Recommended)

Use VueSip composables directly in your components without any plugin installation:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useSipClient, useCallSession } from 'vuesip'

const { connect, isConnected, isRegistered } = useSipClient({
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:1000@example.com',
  password: 'your-password',
  displayName: 'Your Name'
})

// Your component logic here
</script>
```

### Option 2: Global Plugin Installation

Install VueSip as a Vue plugin for global configuration:

```typescript
// main.ts
import { createApp } from 'vue'
import { createVueSip } from 'vuesip'
import App from './App.vue'

const app = createApp(App)

app.use(createVueSip({
  debug: import.meta.env.DEV,
  logLevel: 'info',
  sipConfig: {
    uri: 'wss://sip.example.com:7443',
    autoRegister: true
  }
}))

app.mount('#app')
```

## Your First Call

Let's build a simple component that connects to a SIP server and makes a call:

```vue
<template>
  <div class="sip-phone">
    <!-- Connection Status -->
    <div class="status-bar">
      <span>Connection: {{ isConnected ? 'Connected' : 'Disconnected' }}</span>
      <span>Registration: {{ isRegistered ? 'Registered' : 'Not Registered' }}</span>
    </div>

    <!-- Connection Form -->
    <div v-if="!isConnected" class="connection-form">
      <input v-model="phoneNumber" placeholder="Phone number" />
      <button @click="handleConnect" :disabled="isConnecting">
        {{ isConnecting ? 'Connecting...' : 'Connect' }}
      </button>
    </div>

    <!-- Call Controls -->
    <div v-else class="call-controls">
      <input v-model="targetNumber" placeholder="Number to call" />
      <button @click="handleMakeCall" :disabled="isActive">
        Make Call
      </button>

      <div v-if="isActive" class="active-call">
        <p>Call State: {{ state }}</p>
        <p v-if="remoteUri">Calling: {{ remoteUri }}</p>
        <p v-if="duration > 0">Duration: {{ formatDuration(duration) }}</p>

        <div class="call-buttons">
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
      </div>

      <button @click="handleDisconnect" class="disconnect">
        Disconnect
      </button>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error">{{ error.message }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSipClient, useCallSession } from 'vuesip'

// Configuration
const phoneNumber = ref('1000')
const targetNumber = ref('')

// SIP Client Setup
const sipClient = ref(null)
const {
  isConnected,
  isRegistered,
  isConnecting,
  error,
  connect,
  disconnect,
  getClient
} = useSipClient({
  uri: 'wss://sip.example.com:7443',
  sipUri: `sip:${phoneNumber.value}@example.com`,
  password: 'your-password',
  displayName: 'My Phone'
})

// Call Session Setup
const {
  session,
  state,
  remoteUri,
  isActive,
  isOnHold,
  isMuted,
  duration,
  makeCall,
  hangup,
  toggleHold,
  toggleMute
} = useCallSession(sipClient)

// Event Handlers
const handleConnect = async () => {
  try {
    await connect()
    sipClient.value = getClient()
  } catch (err) {
    console.error('Connection failed:', err)
  }
}

const handleDisconnect = async () => {
  try {
    await disconnect()
  } catch (err) {
    console.error('Disconnect failed:', err)
  }
}

const handleMakeCall = async () => {
  if (!targetNumber.value) return

  try {
    await makeCall(`sip:${targetNumber.value}@example.com`, {
      audio: true,
      video: false
    })
  } catch (err) {
    console.error('Call failed:', err)
  }
}

const handleHangup = async () => {
  try {
    await hangup()
  } catch (err) {
    console.error('Hangup failed:', err)
  }
}

// Helper function to format call duration
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.sip-phone {
  max-width: 500px;
  margin: 0 auto;
  padding: 2rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 1rem;
}

input {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  padding: 0.75rem 1.5rem;
  margin: 0.5rem;
  border: none;
  border-radius: 4px;
  background: #3b82f6;
  color: white;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.danger {
  background: #ef4444;
}

.error {
  padding: 1rem;
  background: #fee;
  color: #c00;
  border-radius: 4px;
  margin-top: 1rem;
}
</style>
```

## Configuration Overview

VueSip provides extensive configuration options to customize behavior:

### SipClientConfig

The main configuration object for connecting to a SIP server:

```typescript
interface SipClientConfig {
  // Required: Connection settings
  uri: string                    // WebSocket URI: 'wss://sip.example.com:7443'
  sipUri: string                 // SIP URI: 'sip:user@domain.com'
  password: string               // SIP password

  // Optional: Identity
  displayName?: string           // Display name for calls
  authorizationUsername?: string // Auth username (if different from SIP username)
  realm?: string                 // SIP realm
  ha1?: string                   // HA1 hash (alternative to password)

  // WebSocket options
  wsOptions?: {
    protocols?: string[]         // WebSocket protocols
    connectionTimeout?: number   // Connection timeout in ms (default: 10000)
    maxReconnectionAttempts?: number  // Max reconnection attempts (default: 5)
    reconnectionDelay?: number   // Reconnection delay in ms (default: 2000)
  }

  // Registration options
  registrationOptions?: {
    expires?: number             // Registration expiry in seconds (default: 600)
    autoRegister?: boolean       // Auto-register on connection (default: true)
    registrationRetryInterval?: number  // Retry interval in ms (default: 30000)
  }

  // Session options
  sessionOptions?: {
    sessionTimers?: boolean      // Enable session timers (default: true)
    maxConcurrentCalls?: number  // Max concurrent calls (default: 1)
    callTimeout?: number         // Call timeout in ms (default: 60000)
  }

  // Media configuration
  mediaConfiguration?: {
    audio?: boolean | MediaTrackConstraints
    video?: boolean | MediaTrackConstraints
    echoCancellation?: boolean   // Echo cancellation (default: true)
    noiseSuppression?: boolean   // Noise suppression (default: true)
    autoGainControl?: boolean    // Auto gain control (default: true)
    audioCodec?: 'opus' | 'pcmu' | 'pcma' | 'g722'
    videoCodec?: 'vp8' | 'vp9' | 'h264'
  }

  // RTC configuration (STUN/TURN servers)
  rtcConfiguration?: {
    stunServers?: string[]       // STUN server URLs
    turnServers?: TurnServerConfig[]  // TURN server configs
    iceTransportPolicy?: RTCIceTransportPolicy
    bundlePolicy?: RTCBundlePolicy
  }

  // User preferences
  userPreferences?: {
    audioInputDeviceId?: string  // Default audio input device
    audioOutputDeviceId?: string // Default audio output device
    videoInputDeviceId?: string  // Default video input device
    autoAnswer?: boolean         // Auto-answer incoming calls
    autoAnswerDelay?: number     // Auto-answer delay in ms
    ringToneUrl?: string         // Ring tone URL
    enableDtmfTones?: boolean    // Enable DTMF tones
  }

  // Debugging
  debug?: boolean                // Enable debug mode
  userAgent?: string            // Custom User-Agent string
}
```

### Example Configurations

#### Basic Configuration

```typescript
const basicConfig = {
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:1000@example.com',
  password: 'secret123',
  displayName: 'John Doe'
}
```

#### Advanced Configuration with STUN/TURN

```typescript
const advancedConfig = {
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:1000@example.com',
  password: 'secret123',
  displayName: 'John Doe',

  // Registration settings
  registrationOptions: {
    expires: 600,
    autoRegister: true,
    registrationRetryInterval: 30000
  },

  // Media settings
  mediaConfiguration: {
    audio: true,
    video: false,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    audioCodec: 'opus'
  },

  // STUN/TURN configuration for NAT traversal
  rtcConfiguration: {
    stunServers: ['stun:stun.l.google.com:19302'],
    turnServers: [
      {
        urls: 'turn:turn.example.com:3478',
        username: 'turnuser',
        credential: 'turnpass'
      }
    ],
    iceTransportPolicy: 'all'
  },

  // User preferences
  userPreferences: {
    autoAnswer: false,
    enableDtmfTones: true
  },

  // Debugging
  debug: true
}
```

## Common Use Cases

### 1. Making Outgoing Calls

```typescript
const { makeCall, state, duration } = useCallSession(sipClient)

// Make a call
await makeCall('sip:2000@example.com', {
  audio: true,
  video: false
})

// Monitor call state
watch(state, (newState) => {
  console.log('Call state changed:', newState)
  // States: 'idle', 'calling', 'ringing', 'active', 'terminated'
})
```

### 2. Handling Incoming Calls

```typescript
const { session, answer, reject } = useCallSession(sipClient)

// Watch for incoming calls
watch(session, (newSession) => {
  if (newSession && newSession.direction === 'incoming') {
    console.log('Incoming call from:', newSession.remoteUri)

    // Answer the call
    await answer({ audio: true, video: false })

    // Or reject it
    // await reject(486) // 486 = Busy Here
  }
})
```

### 3. Sending DTMF Tones

```typescript
const { sendTone, sendToneSequence } = useDTMF(session)

// Send single tone
await sendTone('1')

// Send sequence of tones
await sendToneSequence('1234#', {
  duration: 100,        // Tone duration in ms
  interToneGap: 70,     // Gap between tones in ms
  onToneSent: (tone) => console.log(`Sent: ${tone}`)
})
```

### 4. Managing Audio Devices

```typescript
const {
  audioInputDevices,
  audioOutputDevices,
  selectedAudioInputId,
  enumerateDevices,
  requestPermissions,
  selectAudioInput,
  testAudioInput
} = useMediaDevices()

// Request permissions
await requestPermissions(true, false) // audio, video

// Enumerate devices
await enumerateDevices()

// Select a device
if (audioInputDevices.value.length > 0) {
  selectAudioInput(audioInputDevices.value[0].deviceId)
}

// Test a device
const success = await testAudioInput()
console.log('Device test:', success ? 'passed' : 'failed')
```

### 5. Call Controls (Hold, Mute, Transfer)

```typescript
const {
  isOnHold,
  isMuted,
  hold,
  unhold,
  mute,
  unmute,
  toggleHold,
  toggleMute
} = useCallSession(sipClient)

// Hold/unhold
await hold()
await unhold()
await toggleHold()

// Mute/unmute (local only)
mute()
unmute()
toggleMute()
```

### 6. Call Statistics and Duration

```typescript
const {
  duration,
  timing,
  getStats
} = useCallSession(sipClient)

// Monitor call duration (in seconds)
watch(duration, (seconds) => {
  console.log('Call duration:', seconds)
})

// Get call timing information
console.log('Start time:', timing.value.startTime)
console.log('Answer time:', timing.value.answerTime)
console.log('End time:', timing.value.endTime)

// Get WebRTC statistics
const stats = await getStats()
console.log('Call statistics:', stats)
```

### 7. Registration Management

```typescript
const {
  isRegistered,
  isRegistering,
  expires,
  secondsUntilExpiry,
  register,
  unregister,
  refresh
} = useSipRegistration(sipClient, {
  expires: 600,
  maxRetries: 3,
  autoRefresh: true
})

// Manually register
await register()

// Manually unregister
await unregister()

// Refresh registration
await refresh()

// Monitor registration status
watch(isRegistered, (registered) => {
  if (registered) {
    console.log('Successfully registered!')
    console.log('Expires in:', secondsUntilExpiry.value, 'seconds')
  }
})
```

## Best Practices

### 1. Error Handling

Always wrap SIP operations in try-catch blocks:

```typescript
try {
  await connect()
  await makeCall('sip:2000@example.com')
} catch (error) {
  console.error('Operation failed:', error)
  // Show user-friendly error message
}
```

### 2. Cleanup on Unmount

Ensure proper cleanup when components unmount:

```typescript
import { onUnmounted } from 'vue'

const { disconnect } = useSipClient(config, {
  autoCleanup: true  // Automatically cleanup on unmount
})

// Or manually cleanup
onUnmounted(async () => {
  await disconnect()
})
```

### 3. Reactive State

Use Vue's reactivity system to respond to state changes:

```typescript
import { watch } from 'vue'

watch(isConnected, (connected) => {
  if (connected) {
    console.log('Connected to SIP server')
    // Perform post-connection actions
  }
})
```

### 4. Type Safety

Use TypeScript for better development experience:

```typescript
import type { SipClientConfig, CallSession, CallState } from 'vuesip'

const config: SipClientConfig = {
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:1000@example.com',
  password: 'secret'
}
```

### 5. Device Permissions

Request media permissions early and handle denials gracefully:

```typescript
const { requestPermissions, hasAudioPermission } = useMediaDevices()

try {
  await requestPermissions(true, false)
  if (!hasAudioPermission.value) {
    // Show instructions to enable permissions
  }
} catch (error) {
  console.error('Permission denied:', error)
}
```

## Tips and Tricks

### Using Providers for Global State

For larger applications, use providers to share SIP client state:

```vue
<template>
  <SipClientProvider :config="sipConfig">
    <MediaProvider :auto-enumerate="true">
      <YourApp />
    </MediaProvider>
  </SipClientProvider>
</template>

<script setup lang="ts">
import { SipClientProvider, MediaProvider } from 'vuesip'

const sipConfig = {
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:1000@example.com',
  password: 'secret'
}
</script>
```

### Debugging

Enable debug mode to see detailed logs:

```typescript
const { connect } = useSipClient({
  ...config,
  debug: true
})

// Or use the plugin
app.use(createVueSip({
  debug: true,
  logLevel: 'debug'
}))
```

### Testing Without a SIP Server

For development, you can test the UI without a real SIP server by mocking the composables:

```typescript
// mock-sip.ts
export const useSipClient = () => ({
  isConnected: ref(true),
  isRegistered: ref(true),
  connect: async () => {},
  disconnect: async () => {}
})
```

## Next Steps

Now that you've learned the basics, explore these topics:

- **[Making Calls](./making-calls.md)** - Deep dive into call management
- **[Receiving Calls](./receiving-calls.md)** - Handle incoming calls
- **[Media Devices](./media-devices.md)** - Device selection and testing
- **[Advanced Features](./advanced-features.md)** - Conferencing, messaging, presence

## Troubleshooting

### Connection Issues

**Problem:** Can't connect to SIP server

**Solutions:**
- Verify WebSocket URI is correct (use `wss://` for secure connections)
- Check that the SIP server allows WebSocket connections
- Verify credentials are correct
- Check browser console for specific error messages
- Ensure CORS is properly configured on the SIP server

### No Audio in Calls

**Problem:** Call connects but no audio

**Solutions:**
- Request microphone permissions before making calls
- Check that audio devices are properly selected
- Verify STUN/TURN servers are configured for NAT traversal
- Test audio devices using `testAudioInput()` and `testAudioOutput()`
- Check browser console for WebRTC errors

### Registration Failures

**Problem:** Can't register with SIP server

**Solutions:**
- Verify SIP URI format: `sip:user@domain.com`
- Check that username and password are correct
- Ensure realm is set correctly if required
- Check registration expiry time isn't too short
- Enable debug mode to see detailed error messages

## Getting Help

- **GitHub Issues:** [Report bugs or request features](https://github.com/yourusername/vuesip/issues)
- **Documentation:** [Full API reference](https://vuesip.dev)
- **Examples:** Check the `examples/` directory in the repository

## Summary

You've learned how to:

- Install and configure VueSip
- Connect to a SIP server
- Make and receive calls
- Send DTMF tones
- Manage audio devices
- Handle errors and cleanup

VueSip's headless architecture gives you complete flexibility to build any SIP interface you need. The composables handle all the complex SIP logic, so you can focus on creating a great user experience.

Happy coding! 🎉
