# Error Handling Guide

This guide covers error handling in VueSip, including error types, handling patterns, recovery strategies, and debugging techniques.

## Table of Contents

- [Error Types](#error-types)
- [Error Handling Patterns](#error-handling-patterns)
- [Recovery Strategies](#recovery-strategies)
- [Logging and Debugging](#logging-and-debugging)
- [Common Issues and Solutions](#common-issues-and-solutions)
- [Best Practices](#best-practices)

## Error Types

VueSip defines several error types to help you identify and handle different failure scenarios.

### Storage Errors

#### QuotaExceededError

Thrown when storage quota is exceeded during operations like call history persistence or recording storage.

```typescript
import { QuotaExceededError } from 'vuesip'

try {
  await saveRecording(recordingData)
} catch (error) {
  if (error instanceof QuotaExceededError) {
    console.error('Storage quota exceeded:', error.quotaInfo)
    // Handle quota exceeded (e.g., cleanup old data)
    await cleanupOldRecordings()
  }
}
```

**Properties:**
- `message` - Error description
- `quotaInfo` - Storage quota information including usage and available space

### Media Errors

#### MediaError Interface

Media-related errors from device access or permission issues.

```typescript
interface MediaError {
  name: string
  message: string
  constraint?: string // Constraint that failed (if applicable)
}
```

**Common Media Error Names:**
- `NotAllowedError` - User denied permission
- `NotFoundError` - No media devices found
- `NotReadableError` - Device is already in use
- `OverconstrainedError` - Constraints cannot be satisfied
- `AbortError` - Device access was aborted
- `TypeError` - Invalid constraints

**Example:**

```typescript
import { useMediaDevices } from 'vuesip'

const { requestPermissions, error } = useMediaDevices()

async function setupMedia() {
  try {
    await requestPermissions()
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      console.error('Microphone permission denied')
      showPermissionDialog()
    } else if (err.name === 'NotFoundError') {
      console.error('No microphone found')
      showNoDeviceMessage()
    } else if (err.name === 'NotReadableError') {
      console.error('Microphone already in use')
      showDeviceInUseMessage()
    }
  }
}
```

### Call Errors

#### TerminationCause Enum

Describes why a call ended or failed.

```typescript
enum TerminationCause {
  Canceled = 'canceled',         // Call was canceled
  Rejected = 'rejected',         // Call was rejected
  NoAnswer = 'no_answer',        // Call was not answered
  Unavailable = 'unavailable',   // Call was unavailable
  Busy = 'busy',                 // Call was busy
  Bye = 'bye',                   // Normal call clearing
  RequestTimeout = 'request_timeout', // Request timeout
  WebRtcError = 'webrtc_error',  // WebRTC error
  InternalError = 'internal_error', // Internal error
  NetworkError = 'network_error', // Network error
  Other = 'other'                // Other reason
}
```

**Example:**

```typescript
import { useCallSession } from 'vuesip'

const { activeCall } = useCallSession()

// Listen for call failures
eventBus.on('call:failed', (event) => {
  const cause = event.terminationCause

  switch (cause) {
    case 'network_error':
      showNotification('Call failed due to network issues')
      break
    case 'webrtc_error':
      showNotification('Media connection failed')
      break
    case 'busy':
      showNotification('User is busy')
      break
    default:
      showNotification('Call failed')
  }
})
```

### Connection Errors

#### Connection States

Connection failures are tracked through state changes:

```typescript
enum ConnectionState {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  ConnectionFailed = 'connection_failed',
  Reconnecting = 'reconnecting'
}
```

**Example:**

```typescript
import { useSipClient } from 'vuesip'

const { connectionState, connect, error } = useSipClient(config)

async function handleConnect() {
  try {
    await connect()
  } catch (err) {
    console.error('Connection failed:', err)

    if (err.message.includes('WebSocket')) {
      showNotification('Cannot connect to server')
    } else if (err.message.includes('Invalid SIP configuration')) {
      showNotification('Invalid configuration')
    }
  }
}
```

### Registration Errors

#### Registration States

Registration failures are tracked through state changes:

```typescript
enum RegistrationState {
  Unregistered = 'unregistered',
  Registering = 'registering',
  Registered = 'registered',
  Unregistering = 'unregistering',
  RegistrationFailed = 'registration_failed'
}
```

**Example:**

```typescript
import { useSipRegistration } from 'vuesip'

const { registrationState, register, lastError } = useSipRegistration()

// Listen for registration failures
eventBus.on('sip:registration_failed', (event) => {
  console.error('Registration failed:', event.cause)

  if (event.cause?.includes('401')) {
    showNotification('Invalid credentials')
  } else if (event.cause?.includes('403')) {
    showNotification('Access forbidden')
  } else if (event.cause?.includes('timeout')) {
    showNotification('Registration timeout - check your network')
  }
})
```

### Validation Errors

VueSip provides validators that return detailed error information:

```typescript
interface ValidationResult {
  valid: boolean
  errors?: string[]
  warnings?: string[]
}
```

**Example:**

```typescript
import { validateSipUri, validateSipConfig } from 'vuesip'

// Validate SIP URI
const uriResult = validateSipUri('sip:user@domain.com')
if (!uriResult.valid) {
  console.error('Invalid SIP URI:', uriResult.error)
}

// Validate configuration
const configResult = validateSipConfig({
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:1000@example.com',
  password: 'secret'
})

if (!configResult.valid) {
  console.error('Configuration errors:', configResult.errors)
}

if (configResult.warnings) {
  console.warn('Configuration warnings:', configResult.warnings)
}
```

### Event-Based Errors

#### ErrorEvent Interface

Generic error events emitted through the EventBus:

```typescript
interface ErrorEvent extends BaseEvent {
  type: 'error'
  error: Error
  context?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
}
```

**Example:**

```typescript
import { EventBus } from 'vuesip'

const eventBus = new EventBus()

// Listen for all errors
eventBus.on('error', (event: ErrorEvent) => {
  console.error(`[${event.severity}] ${event.context}:`, event.error)

  if (event.severity === 'critical') {
    // Handle critical errors
    notifyUser('A critical error occurred')
    logToServer(event)
  }
})
```

## Error Handling Patterns

### Try-Catch Pattern

Use try-catch blocks for operations that may throw errors:

```typescript
import { useSipClient, useCallSession } from 'vuesip'

const { connect, disconnect } = useSipClient(config)
const { makeCall } = useCallSession()

async function initiateCall(targetUri: string) {
  try {
    // Connect if not already connected
    await connect()

    // Make the call
    await makeCall(targetUri)
  } catch (error) {
    console.error('Failed to initiate call:', error)

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('not started')) {
        showNotification('Please connect first')
      } else if (error.message.includes('Not connected')) {
        showNotification('Connection lost - reconnecting...')
        await connect()
      }
    }
  }
}
```

### Error State Management

Track errors in reactive state:

```typescript
import { ref, computed } from 'vue'
import { useSipClient } from 'vuesip'

const error = ref<Error | null>(null)
const isError = computed(() => error.value !== null)

const { connect } = useSipClient(config)

async function handleConnect() {
  error.value = null // Clear previous errors

  try {
    await connect()
  } catch (err) {
    error.value = err instanceof Error ? err : new Error(String(err))
  }
}

// Clear error when user acknowledges
function clearError() {
  error.value = null
}
```

### Event-Based Error Handling

Use the EventBus for centralized error handling:

```typescript
import { EventBus } from 'vuesip'

const eventBus = new EventBus()

// Centralized error handler
function setupErrorHandling() {
  // Connection errors
  eventBus.on('sip:disconnected', (event) => {
    if (event.error) {
      console.error('Disconnected:', event.error)
      showNotification('Connection lost')
    }
  })

  // Registration errors
  eventBus.on('sip:registration_failed', (event) => {
    console.error('Registration failed:', event.cause)
    showNotification('Registration failed: ' + event.cause)
  })

  // Call errors
  eventBus.on('call:failed', (event) => {
    console.error('Call failed:', event.terminationCause)
    showNotification('Call failed')
  })

  // Media errors
  eventBus.on('media:error', (event) => {
    console.error('Media error:', event.error)
    showNotification('Media error: ' + event.error.message)
  })
}
```

### Validation Before Execution

Validate inputs before attempting operations:

```typescript
import { validateSipUri, validatePhoneNumber } from 'vuesip'

function makeCallWithValidation(target: string) {
  // Validate target
  const validation = validateSipUri(target)

  if (!validation.valid) {
    showError('Invalid target: ' + validation.error)
    return
  }

  // Use normalized URI
  makeCall(validation.normalized!)
}
```

### Graceful Degradation

Handle partial failures gracefully:

```typescript
import { useMediaDevices } from 'vuesip'

const { enumerateDevices, hasPermission } = useMediaDevices()

async function setupAudio() {
  try {
    // Try to get devices
    await enumerateDevices()

    if (!hasPermission.value.audio) {
      // Fall back to default device
      console.warn('Audio permission not granted, using default device')
      useDefaultAudioDevice()
    }
  } catch (error) {
    console.error('Failed to enumerate devices:', error)
    // Continue with limited functionality
    disableDeviceSelection()
  }
}
```

### Cleanup in Finally Blocks

Always clean up resources, even on errors:

```typescript
let timer: ReturnType<typeof setTimeout> | null = null

async function operationWithCleanup() {
  try {
    // Set timeout
    timer = setTimeout(() => {
      throw new Error('Operation timeout')
    }, 5000)

    // Perform operation
    await performOperation()
  } catch (error) {
    console.error('Operation failed:', error)
    throw error
  } finally {
    // Always cleanup
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
}
```

## Recovery Strategies

### Automatic Retry with Exponential Backoff

Retry failed operations with increasing delays:

```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError!
}

// Usage
const { connect } = useSipClient(config)

async function connectWithRetry() {
  try {
    await retryWithBackoff(() => connect(), 3, 1000)
    console.log('Connected successfully')
  } catch (error) {
    console.error('Failed to connect after retries:', error)
    showNotification('Unable to connect - please try again later')
  }
}
```

### Registration Auto-Retry

The registration store includes automatic retry logic:

```typescript
import { registrationStore } from 'vuesip'

// Check registration retry count
if (registrationStore.retryCount > 3) {
  console.warn('Multiple registration failures detected')
  showNotification('Having trouble connecting - check your credentials')
}

// Listen for registration failures
eventBus.on('sip:registration_failed', async () => {
  // Wait before retrying
  await new Promise(resolve => setTimeout(resolve, 5000))

  // Retry registration
  try {
    await register()
  } catch (error) {
    console.error('Registration retry failed:', error)
  }
})
```

### Connection Recovery

Recover from connection failures:

```typescript
import { useSipClient } from 'vuesip'

const { connect, disconnect, connectionState } = useSipClient(config)
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

// Monitor connection state
watch(connectionState, (state) => {
  if (state === 'disconnected') {
    // Start reconnection attempts
    scheduleReconnect()
  } else if (state === 'connected') {
    // Clear reconnection timer
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }
})

function scheduleReconnect() {
  if (reconnectTimer) return

  reconnectTimer = setTimeout(async () => {
    try {
      console.log('Attempting to reconnect...')
      await connect()
    } catch (error) {
      console.error('Reconnection failed:', error)
      // Schedule next attempt
      scheduleReconnect()
    }
  }, 5000)
}

// Cleanup on unmount
onUnmounted(() => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
  }
})
```

### Media Device Recovery

Recover from media device failures:

```typescript
import { useMediaDevices } from 'vuesip'

const { enumerateDevices, selectedAudioInput, setAudioInput } = useMediaDevices()

// Listen for device changes
eventBus.on('media:device:changed', async (event) => {
  // Check if current device was removed
  const currentDevice = selectedAudioInput.value
  const stillAvailable = event.currentDevices.some(
    d => d.deviceId === currentDevice
  )

  if (!stillAvailable && event.currentDevices.length > 0) {
    // Switch to first available device
    const newDevice = event.currentDevices.find(
      d => d.kind === 'audioinput'
    )

    if (newDevice) {
      console.log('Switching to new audio device:', newDevice.label)
      await setAudioInput(newDevice.deviceId)
    }
  }
})
```

### Call Recovery

Handle call failures with retry options:

```typescript
import { useCallSession } from 'vuesip'

const { makeCall, activeCall } = useCallSession()

async function makeCallWithRecovery(target: string, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await makeCall(target)
      return // Success
    } catch (error) {
      console.error(`Call attempt ${attempt + 1} failed:`, error)

      if (attempt < retries) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000))
      } else {
        // All attempts failed
        throw new Error('Call failed after ' + (retries + 1) + ' attempts')
      }
    }
  }
}
```

### Storage Quota Recovery

Automatically clean up old data when quota is exceeded:

```typescript
import { hasEnoughSpace, clearOldDataLRU, QuotaExceededError } from 'vuesip'

async function saveWithQuotaManagement(data: any) {
  try {
    // Check if we have enough space
    const hasSpace = await hasEnoughSpace(data.size)

    if (!hasSpace) {
      console.warn('Low storage space, cleaning up old data')
      await clearOldDataLRU(
        () => getAllRecordings(),
        (ids) => deleteRecordings(ids),
        20 // Remove oldest 20%
      )
    }

    // Save data
    await saveData(data)
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      // Aggressive cleanup
      await clearOldDataLRU(
        () => getAllRecordings(),
        (ids) => deleteRecordings(ids),
        50 // Remove oldest 50%
      )

      // Retry save
      await saveData(data)
    } else {
      throw error
    }
  }
}
```

## Logging and Debugging

### Logger Configuration

Configure the VueSip logger for debugging:

```typescript
import { configureLogger, setLogLevel } from 'vuesip'

// Development: Show all logs
if (import.meta.env.DEV) {
  configureLogger({
    level: 'debug',
    enabled: true,
    showTimestamp: true
  })
}

// Production: Show only warnings and errors
if (import.meta.env.PROD) {
  setLogLevel('warn')
}

// Disable logging entirely
// import { disableLogging } from 'vuesip'
// disableLogging()
```

### Creating Component Loggers

Use namespaced loggers for better organization:

```typescript
import { createLogger } from 'vuesip'

const logger = createLogger('MyComponent')

function handleOperation() {
  logger.debug('Starting operation', { timestamp: Date.now() })

  try {
    performOperation()
    logger.info('Operation completed successfully')
  } catch (error) {
    logger.error('Operation failed:', error)
  }
}

// Create child logger
const subLogger = logger.child('SubComponent')
subLogger.debug('Sub-component initialized')
```

### Custom Log Handler

Implement custom logging for production monitoring:

```typescript
import { setLogHandler } from 'vuesip'

// Send errors to monitoring service
setLogHandler((level, namespace, message, ...args) => {
  const logEntry = {
    level,
    namespace,
    message,
    args,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  }

  // Only send warnings and errors to server
  if (level === 'warn' || level === 'error') {
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry)
    }).catch(console.error)
  }

  // Also log to console
  console[level === 'debug' ? 'log' : level](
    `[${namespace}] ${message}`,
    ...args
  )
})
```

### Debug Event Flow

Track events for debugging:

```typescript
import { EventBus } from 'vuesip'

const eventBus = new EventBus()

// Log all events in development
if (import.meta.env.DEV) {
  // Use wildcard to catch all events
  eventBus.on('*', (event) => {
    console.log('[Event]', event.type, event)
  })
}

// Track specific event sequences
const eventSequence: string[] = []

eventBus.on('sip:connecting', () => {
  eventSequence.push('connecting')
})

eventBus.on('sip:connected', () => {
  eventSequence.push('connected')
  console.log('Connection sequence:', eventSequence)
})

eventBus.on('sip:disconnected', () => {
  eventSequence.push('disconnected')
  console.log('Disconnection sequence:', eventSequence)
})
```

### Network Diagnostics

Collect network statistics for debugging:

```typescript
import { useCallSession } from 'vuesip'

const { activeCall, getMediaStatistics } = useCallSession()

// Monitor call quality
const statsInterval = setInterval(async () => {
  if (!activeCall.value) return

  const stats = await getMediaStatistics()

  if (stats) {
    console.log('Call Statistics:', {
      audio: {
        packetsLost: stats.audio?.packetsLost,
        packetLoss: stats.audio?.packetLossPercentage?.toFixed(2) + '%',
        jitter: stats.audio?.jitter?.toFixed(3) + 's',
        bitrate: (stats.audio?.bitrate / 1000).toFixed(0) + ' kbps'
      },
      network: {
        rtt: stats.network?.currentRoundTripTime?.toFixed(3) + 's',
        bytesReceived: (stats.network?.totalBytesReceived / 1024).toFixed(0) + ' KB',
        bytesSent: (stats.network?.totalBytesSent / 1024).toFixed(0) + ' KB'
      }
    })

    // Warn about poor quality
    if (stats.audio?.packetLossPercentage > 5) {
      console.warn('High packet loss detected:', stats.audio.packetLossPercentage + '%')
    }
  }
}, 5000)

// Cleanup
onUnmounted(() => {
  clearInterval(statsInterval)
})
```

## Common Issues and Solutions

### Issue 1: Microphone Permission Denied

**Symptoms:**
- `NotAllowedError` when requesting media
- No audio in calls
- Empty device list

**Causes:**
- User denied permission
- Browser settings block microphone access
- HTTPS required but using HTTP

**Solutions:**

```typescript
import { useMediaDevices } from 'vuesip'

const { requestPermissions, hasPermission, error } = useMediaDevices()

async function handlePermissionDenied() {
  try {
    await requestPermissions()
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      // Show instructions to user
      showModal({
        title: 'Microphone Access Required',
        message: `
          Please allow microphone access to make calls:
          1. Click the camera icon in your browser's address bar
          2. Change microphone setting to "Allow"
          3. Refresh the page
        `
      })
    }
  }
}

// Check permission status
watch(hasPermission, (permissions) => {
  if (permissions.audio === 'denied') {
    showWarning('Microphone access is blocked')
  }
})
```

**Prevention:**
- Request permissions early in the user flow
- Explain why permissions are needed before requesting
- Use HTTPS in production
- Provide clear instructions for granting permissions

### Issue 2: Connection Timeout

**Symptoms:**
- Connection fails to establish
- `ConnectionState` stuck in `connecting`
- "Connection timeout" errors

**Causes:**
- Network firewall blocking WebSocket
- Incorrect server URI
- Server is down
- Network connectivity issues

**Solutions:**

```typescript
import { useSipClient } from 'vuesip'

const { connect, connectionState } = useSipClient(config)

async function connectWithTimeout(timeoutMs = 10000) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Connection timeout')), timeoutMs)
  })

  try {
    await Promise.race([connect(), timeoutPromise])
  } catch (error) {
    if (error.message === 'Connection timeout') {
      showError(`
        Unable to connect to server:
        - Check your internet connection
        - Verify server URI is correct
        - Check if firewall is blocking WebSocket connections
      `)
    }
    throw error
  }
}

// Monitor connection state
watch(connectionState, (state) => {
  if (state === 'connection_failed') {
    console.error('Connection failed')
    // Try alternative server or show error
  }
})
```

**Prevention:**
- Validate server URI before connecting
- Implement connection timeout
- Show connection status to user
- Provide fallback server options

### Issue 3: Registration Failure (401/403)

**Symptoms:**
- `RegistrationState` is `registration_failed`
- "401 Unauthorized" or "403 Forbidden" errors
- Cannot make or receive calls

**Causes:**
- Invalid credentials
- Incorrect authentication realm
- Account not activated
- IP address not whitelisted

**Solutions:**

```typescript
import { useSipClient, useSipRegistration } from 'vuesip'

const { registrationState } = useSipRegistration()

// Listen for registration failures
eventBus.on('sip:registration_failed', (event) => {
  console.error('Registration failed:', event)

  const cause = event.cause || ''

  if (cause.includes('401')) {
    showError('Invalid username or password')
  } else if (cause.includes('403')) {
    showError('Access forbidden - contact your administrator')
  } else if (cause.includes('timeout')) {
    showError('Registration timeout - check network connection')
  } else {
    showError('Registration failed: ' + cause)
  }
})

// Validate credentials before attempting registration
function validateCredentials(config: SipClientConfig) {
  if (!config.sipUri || !config.password) {
    throw new Error('Username and password are required')
  }

  const validation = validateSipUri(config.sipUri)
  if (!validation.valid) {
    throw new Error('Invalid SIP URI: ' + validation.error)
  }
}
```

**Prevention:**
- Validate credentials format before attempting registration
- Store credentials securely
- Implement credential verification flow
- Show clear error messages for authentication failures

### Issue 4: Audio Not Working During Call

**Symptoms:**
- Call connects but no audio heard
- One-way audio (can't hear remote party or they can't hear you)
- Audio cutting in and out

**Causes:**
- Microphone/speaker muted
- Wrong audio device selected
- Network issues (packet loss, jitter)
- NAT/firewall blocking RTP packets
- Echo cancellation issues

**Solutions:**

```typescript
import { useCallSession, useMediaDevices } from 'vuesip'

const { activeCall, isMuted, mute, unmute } = useCallSession()
const { selectedAudioInput, selectedAudioOutput, enumerateDevices } = useMediaDevices()

async function diagnoseAudioIssues() {
  console.log('Audio Diagnostics:')

  // Check if muted
  if (isMuted.value) {
    console.warn('Microphone is muted')
    await unmute()
  }

  // Check device selection
  const devices = await enumerateDevices()
  console.log('Available devices:', devices)
  console.log('Selected input:', selectedAudioInput.value)
  console.log('Selected output:', selectedAudioOutput.value)

  // Check media streams
  if (activeCall.value) {
    const localStream = activeCall.value.localStream
    const remoteStream = activeCall.value.remoteStream

    console.log('Local stream:', {
      active: localStream?.active,
      tracks: localStream?.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState
      }))
    })

    console.log('Remote stream:', {
      active: remoteStream?.active,
      tracks: remoteStream?.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState
      }))
    })
  }

  // Check network quality
  const stats = await getMediaStatistics()
  if (stats?.audio) {
    console.log('Audio quality:', {
      packetLoss: stats.audio.packetLossPercentage + '%',
      jitter: stats.audio.jitter + 's',
      bitrate: stats.audio.bitrate + ' bps'
    })

    if (stats.audio.packetLossPercentage > 5) {
      console.warn('High packet loss - poor network quality')
    }
  }
}
```

**Prevention:**
- Test audio devices before calls
- Monitor call quality with statistics
- Provide audio troubleshooting UI
- Use appropriate codecs for network conditions

### Issue 5: Call Drops or Connection Lost

**Symptoms:**
- Active call suddenly ends
- `TerminationCause` is `network_error`
- WebSocket disconnects during call

**Causes:**
- Network instability
- Mobile device switching networks (WiFi to cellular)
- Server timeout
- Firewall closing idle connections

**Solutions:**

```typescript
import { useCallSession, useSipClient } from 'vuesip'

const { activeCall } = useCallSession()
const { connectionState, connect } = useSipClient(config)

// Monitor connection during call
watch(connectionState, async (state) => {
  if (state === 'disconnected' && activeCall.value) {
    console.error('Connection lost during active call')

    showNotification('Connection lost - attempting to reconnect...')

    try {
      // Attempt reconnection
      await connect()
      showNotification('Reconnected successfully')
    } catch (error) {
      console.error('Reconnection failed:', error)
      showError('Unable to reconnect - call ended')
    }
  }
})

// Listen for call failures
eventBus.on('call:failed', (event) => {
  if (event.terminationCause === 'network_error') {
    showError('Call dropped due to network issues')
    // Log for diagnostics
    logNetworkError(event)
  }
})

// Implement keep-alive for WebSocket
function setupKeepAlive() {
  const keepAliveInterval = setInterval(() => {
    if (connectionState.value === 'connected') {
      // Send OPTIONS or keep-alive packet
      // This prevents firewall from closing idle connection
    }
  }, 30000) // Every 30 seconds

  onUnmounted(() => clearInterval(keepAliveInterval))
}
```

**Prevention:**
- Implement connection monitoring
- Use session timers to detect disconnections
- Handle network changes gracefully
- Provide reconnection logic

### Issue 6: Device Not Found or In Use

**Symptoms:**
- `NotFoundError` - No media devices
- `NotReadableError` - Device already in use
- Empty device list

**Causes:**
- No physical devices connected
- Device being used by another application
- Browser tab already using device
- Device permissions not granted
- Virtual devices not working

**Solutions:**

```typescript
import { useMediaDevices } from 'vuesip'

const { enumerateDevices, requestPermissions, audioInputs } = useMediaDevices()

async function handleDeviceErrors() {
  try {
    // Request permissions first
    await requestPermissions()

    // Enumerate devices
    await enumerateDevices()

    if (audioInputs.value.length === 0) {
      showError(`
        No microphone detected:
        - Check if a microphone is connected
        - Try unplugging and reconnecting USB microphone
        - Restart your browser
      `)
      return
    }
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      showError('No microphone found - please connect a microphone')
    } else if (err.name === 'NotReadableError') {
      showError(`
        Microphone is already in use:
        - Close other applications using the microphone
        - Check if another browser tab is using the microphone
        - Try restarting your browser
      `)
    }
  }
}

// Monitor device changes
eventBus.on('media:device:changed', (event) => {
  console.log('Device change detected:', {
    added: event.addedDevices,
    removed: event.removedDevices,
    current: event.currentDevices
  })

  // Handle device removal
  if (event.removedDevices.length > 0) {
    showNotification('Audio device disconnected')
    // Switch to another device if available
    if (audioInputs.value.length > 0) {
      setAudioInput(audioInputs.value[0].deviceId)
    }
  }
})
```

**Prevention:**
- Check for devices before making calls
- Handle device changes during calls
- Provide clear device selection UI
- Show device status indicators

### Issue 7: Storage Quota Exceeded

**Symptoms:**
- `QuotaExceededError` thrown
- Unable to save recordings or call history
- Persistence operations fail

**Causes:**
- Too many recordings stored
- Call history too large
- Browser storage limit reached
- Other applications using storage

**Solutions:**

```typescript
import {
  getStorageQuota,
  hasEnoughSpace,
  clearOldDataLRU,
  checkStorageUsageWarning
} from 'vuesip'

async function handleStorageQuota() {
  // Check current usage
  const quota = await getStorageQuota()

  console.log('Storage:', {
    used: (quota.usage / 1024 / 1024).toFixed(2) + ' MB',
    total: (quota.quota / 1024 / 1024).toFixed(2) + ' MB',
    available: (quota.available / 1024 / 1024).toFixed(2) + ' MB',
    percentage: quota.usagePercent.toFixed(1) + '%'
  })

  // Check if usage is high
  const isHigh = await checkStorageUsageWarning(80)
  if (isHigh) {
    showWarning(`
      Storage is ${quota.usagePercent.toFixed(0)}% full
      Consider cleaning up old recordings or call history
    `)
  }

  // Clean up if necessary
  if (quota.usagePercent > 90) {
    await cleanupStorage()
  }
}

async function cleanupStorage() {
  try {
    // Remove oldest recordings
    const removedRecordings = await clearOldDataLRU(
      () => getAllRecordings(),
      (ids) => deleteRecordings(ids),
      30 // Remove oldest 30%
    )

    // Remove old call history
    const removedHistory = await clearOldDataLRU(
      () => getCallHistory(),
      (ids) => deleteHistoryEntries(ids),
      30
    )

    showNotification(`
      Cleaned up ${removedRecordings} recordings and
      ${removedHistory} history entries
    `)
  } catch (error) {
    console.error('Cleanup failed:', error)
  }
}

// Check before saving
async function saveRecordingWithCheck(recording: RecordingData) {
  const hasSpace = await hasEnoughSpace(recording.size, 0.1)

  if (!hasSpace) {
    await cleanupStorage()
  }

  try {
    await saveRecording(recording)
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      showError('Storage full - please free up space')
    }
    throw error
  }
}
```

**Prevention:**
- Monitor storage usage regularly
- Implement automatic cleanup policies
- Limit recording duration or quality
- Provide manual cleanup controls
- Warn users before quota is reached

### Issue 8: DTMF Tones Not Working

**Symptoms:**
- DTMF tones not sent or not heard
- Remote system doesn't respond to tones
- Invalid tone errors

**Causes:**
- Call not established
- Invalid DTMF tone character
- Duration too short
- RTP events not supported

**Solutions:**

```typescript
import { useSipDtmf } from 'vuesip'
import { validateDtmfTone } from 'vuesip'

const { sendDTMF, isSending } = useSipDtmf()

async function sendToneWithValidation(tone: string) {
  // Validate tone
  const validation = validateDtmfTone(tone)
  if (!validation.valid) {
    showError('Invalid DTMF tone: ' + validation.error)
    return
  }

  // Check if call is active
  if (!activeCall.value || activeCall.value.state !== 'active') {
    showError('Cannot send DTMF - no active call')
    return
  }

  try {
    await sendDTMF(validation.normalized!, {
      duration: 100, // milliseconds
      interToneGap: 70 // milliseconds
    })
  } catch (error) {
    console.error('DTMF send failed:', error)
    showError('Failed to send DTMF tone')
  }
}

// Send sequence with validation
async function sendDTMFSequence(sequence: string) {
  const validation = validateDtmfSequence(sequence)
  if (!validation.valid) {
    showError('Invalid DTMF sequence: ' + validation.error)
    return
  }

  // Send each tone in sequence
  for (const tone of validation.normalized!) {
    await sendToneWithValidation(tone)
    // Wait between tones
    await new Promise(resolve => setTimeout(resolve, 200))
  }
}
```

**Prevention:**
- Validate DTMF input before sending
- Check call state before sending
- Use appropriate tone duration
- Test DTMF with your SIP server

## Best Practices

### 1. Always Handle Errors

Never leave operations without error handling:

```typescript
// ❌ Bad
await connect()
await makeCall(target)

// ✅ Good
try {
  await connect()
  await makeCall(target)
} catch (error) {
  console.error('Operation failed:', error)
  handleError(error)
}
```

### 2. Provide User Feedback

Always inform users about errors:

```typescript
// ❌ Bad
try {
  await connect()
} catch (error) {
  console.error(error)
}

// ✅ Good
try {
  await connect()
  showSuccess('Connected successfully')
} catch (error) {
  console.error(error)
  showError('Failed to connect: ' + error.message)
}
```

### 3. Clean Up Resources

Always clean up, especially in error cases:

```typescript
// ❌ Bad
const timer = setInterval(checkStatus, 1000)
await doOperation()
clearInterval(timer)

// ✅ Good
const timer = setInterval(checkStatus, 1000)
try {
  await doOperation()
} finally {
  clearInterval(timer)
}
```

### 4. Use Specific Error Types

Check for specific error types when handling:

```typescript
// ❌ Bad
catch (error) {
  showError('Something went wrong')
}

// ✅ Good
catch (error: any) {
  if (error instanceof QuotaExceededError) {
    handleQuotaExceeded(error)
  } else if (error.name === 'NotAllowedError') {
    handlePermissionDenied(error)
  } else {
    handleGenericError(error)
  }
}
```

### 5. Log Errors Appropriately

Use appropriate log levels:

```typescript
// Use debug for verbose information
logger.debug('Attempting connection', { uri: config.uri })

// Use info for important events
logger.info('Connected successfully')

// Use warn for potential issues
logger.warn('High packet loss detected:', packetLoss)

// Use error for failures
logger.error('Connection failed:', error)
```

### 6. Validate Input Early

Validate inputs before performing operations:

```typescript
// ✅ Good
function makeCall(target: string) {
  // Validate first
  const validation = validateSipUri(target)
  if (!validation.valid) {
    throw new Error('Invalid target: ' + validation.error)
  }

  // Then proceed with validated input
  return performCall(validation.normalized!)
}
```

### 7. Implement Retry Logic Wisely

Don't retry indefinitely:

```typescript
// ✅ Good
async function retryOperation(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await delay(1000 * Math.pow(2, i)) // Exponential backoff
    }
  }
}
```

### 8. Monitor Application Health

Track errors for patterns:

```typescript
const errorCounts = new Map<string, number>()

function trackError(errorType: string) {
  const count = errorCounts.get(errorType) || 0
  errorCounts.set(errorType, count + 1)

  // Alert if too many errors
  if (count > 5) {
    alertSupport('High error rate: ' + errorType)
  }
}
```

### 9. Provide Recovery Options

Give users ways to recover:

```typescript
// ✅ Good
showErrorWithActions({
  message: 'Connection failed',
  actions: [
    { label: 'Retry', onClick: () => connect() },
    { label: 'Use Different Server', onClick: () => showServerSelection() },
    { label: 'Help', onClick: () => openHelpDialog() }
  ]
})
```

### 10. Test Error Scenarios

Always test error handling:

```typescript
// Test connection failure
it('should handle connection failure', async () => {
  mockWebSocket.simulate('error', new Error('Connection failed'))

  await expect(connect()).rejects.toThrow('Connection failed')
  expect(connectionState.value).toBe('connection_failed')
})

// Test recovery
it('should recover from disconnection', async () => {
  mockWebSocket.simulate('close', { code: 1006 })

  await waitFor(() => {
    expect(connectionState.value).toBe('disconnected')
  })

  // Should attempt reconnection
  await waitFor(() => {
    expect(connectionState.value).toBe('connecting')
  })
})
```

## Summary

Effective error handling in VueSip involves:

1. **Understanding Error Types** - Know the different errors and what they mean
2. **Proper Error Handling** - Use try-catch, validation, and state management
3. **Recovery Strategies** - Implement retry logic and graceful degradation
4. **Debugging Tools** - Use logging and diagnostics effectively
5. **Common Issues** - Know how to recognize and fix frequent problems
6. **Best Practices** - Follow patterns that lead to robust applications

By following this guide, you can build reliable VoIP applications that handle errors gracefully and provide excellent user experiences even when things go wrong.

## Additional Resources

- [Getting Started Guide](./getting-started.md)
- [Making Calls Guide](./making-calls.md)
- [Device Management Guide](./device-management.md)
- [API Reference](/api)
