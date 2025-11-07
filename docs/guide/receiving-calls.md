# Receiving Calls Guide

This guide covers how to handle incoming calls in VueSip, including call detection, auto-answer configuration, answer/reject options, and call queuing mechanisms.

## Table of Contents

- [Detecting Incoming Calls](#detecting-incoming-calls)
- [Auto-Answer Configuration](#auto-answer-configuration)
- [Answering Calls](#answering-calls)
- [Rejecting Calls](#rejecting-calls)
- [Call Queuing](#call-queuing)
- [Best Practices](#best-practices)
- [Complete Examples](#complete-examples)

## Detecting Incoming Calls

VueSip automatically detects incoming calls through the SIP client's event system. When a remote party initiates a call, VueSip emits a `sip:new_session` event with the session details.

### Listening for Incoming Calls

```typescript
import { useSipClient } from 'vuesip'
import { ref, watch } from 'vue'

const { sipClient, eventBus } = useSipClient()
const incomingCall = ref(null)

// Listen for new session events
eventBus.on('sip:new_session', (event) => {
  if (event.originator === 'remote') {
    // This is an incoming call
    console.log('Incoming call from:', event.session.remote_identity)
    incomingCall.value = event.session
  }
})
```

### Using the Call Store

The call store automatically tracks incoming calls in a queue:

```typescript
import { callStore } from 'vuesip'
import { computed } from 'vue'

// Get all incoming calls
const incomingCalls = computed(() => callStore.incomingCalls)

// Get the count of incoming calls
const incomingCallCount = computed(() => callStore.incomingCallCount)

// Get the next incoming call to handle
const nextIncomingCall = callStore.getNextIncomingCall()
```

### Using the Call Session Composable

The easiest way to handle incoming calls is with the `useCallSession` composable:

```typescript
import { useCallSession } from 'vuesip'
import { ref } from 'vue'

const sipClient = ref(/* your SIP client */)
const { session, state, direction, answer, reject } = useCallSession(sipClient)

// Watch for incoming calls
watch(state, (newState) => {
  if (newState === 'ringing' && direction.value === 'incoming') {
    console.log('Incoming call detected!')
    // Show incoming call UI
  }
})
```

## Auto-Answer Configuration

VueSip supports automatic answering of incoming calls with optional delay.

### Configuring Auto-Answer

Configure auto-answer in the user preferences when initializing VueSip:

```typescript
import { createVueSip } from 'vuesip'

const vueSip = createVueSip({
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:1000@sip.example.com',
  password: 'your-password',
  userPreferences: {
    // Enable auto-answer for all incoming calls
    autoAnswer: true,

    // Optional: Add delay before auto-answering (in milliseconds)
    // Default: 0 (answer immediately)
    autoAnswerDelay: 2000 // Answer after 2 seconds
  }
})
```

### Manual Auto-Answer Implementation

If you need custom auto-answer logic, implement it using event listeners:

```typescript
import { useCallSession } from 'vuesip'
import { ref, watch } from 'vue'

const sipClient = ref(/* your SIP client */)
const { session, state, direction, answer } = useCallSession(sipClient)

// Auto-answer incoming calls with custom logic
watch([state, direction], ([newState, newDirection]) => {
  if (newState === 'ringing' && newDirection === 'incoming') {
    // Check if auto-answer should be enabled
    const shouldAutoAnswer = checkAutoAnswerConditions()

    if (shouldAutoAnswer) {
      // Optional delay
      setTimeout(async () => {
        try {
          await answer({
            audio: true,
            video: false
          })
          console.log('Call auto-answered')
        } catch (error) {
          console.error('Auto-answer failed:', error)
        }
      }, 2000) // 2 second delay
    }
  }
})

function checkAutoAnswerConditions(): boolean {
  // Add your custom logic here
  // Examples:
  // - Check time of day
  // - Check caller identity
  // - Check user availability status
  // - Check if already in a call
  return true
}
```

## Answering Calls

### Basic Answer

Answer an incoming call with default audio settings:

```typescript
import { useCallSession } from 'vuesip'

const { answer } = useCallSession(sipClient)

async function handleAnswer() {
  try {
    await answer()
    console.log('Call answered successfully')
  } catch (error) {
    console.error('Failed to answer call:', error)
  }
}
```

### Answer with Options

Customize media constraints when answering:

```typescript
import type { AnswerOptions } from 'vuesip'

const answerOptions: AnswerOptions = {
  // Enable/disable audio
  audio: true,

  // Enable/disable video
  video: false,

  // Custom media constraints
  mediaConstraints: {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 }
    }
  },

  // Custom RTC configuration
  rtcConfiguration: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  },

  // Additional SIP headers
  extraHeaders: [
    'X-Custom-Header: value'
  ]
}

await answer(answerOptions)
```

### Answer with Video

```typescript
async function answerWithVideo() {
  try {
    await answer({
      audio: true,
      video: true,
      mediaConstraints: {
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      }
    })
  } catch (error) {
    console.error('Failed to answer with video:', error)
  }
}
```

### Answer from Call Store

When managing multiple calls, answer a specific call from the store:

```typescript
import { callStore } from 'vuesip'

// Get the next incoming call
const incomingCall = callStore.getNextIncomingCall()

if (incomingCall) {
  // Create a CallSession instance for this call
  const session = new CallSession({
    id: incomingCall.id,
    direction: incomingCall.direction,
    localUri: incomingCall.localUri,
    remoteUri: incomingCall.remoteUri,
    rtcSession: /* JsSIP session */,
    eventBus: /* event bus */
  })

  // Answer the call
  await session.answer({ audio: true, video: false })
}
```

## Rejecting Calls

### Basic Reject

Reject an incoming call with the default status code (603 - Decline):

```typescript
import { useCallSession } from 'vuesip'

const { reject } = useCallSession(sipClient)

async function handleReject() {
  try {
    await reject()
    console.log('Call rejected')
  } catch (error) {
    console.error('Failed to reject call:', error)
  }
}
```

### Reject with Status Code

Use different SIP status codes to indicate the reason for rejection:

```typescript
// 486 - Busy Here
async function rejectBusy() {
  await reject(486)
}

// 603 - Decline (default)
async function rejectDecline() {
  await reject(603)
}

// 480 - Temporarily Unavailable
async function rejectUnavailable() {
  await reject(480)
}
```

### Common SIP Rejection Status Codes

| Code | Reason Phrase | Use Case |
|------|---------------|----------|
| 486  | Busy Here | User is already on another call |
| 603  | Decline | User explicitly declined the call |
| 480  | Temporarily Unavailable | User is temporarily unavailable |
| 404  | Not Found | User/extension not found |
| 406  | Not Acceptable | Call parameters not acceptable |

### Example: Reject Based on Caller

```typescript
import { useCallSession } from 'vuesip'
import { watch } from 'vue'

const { session, state, direction, remoteUri, reject } = useCallSession(sipClient)

// Automatically reject calls from blocked numbers
const blockedNumbers = ['sip:spam@example.com', 'sip:blocked@example.com']

watch([state, direction, remoteUri], ([newState, newDirection, newRemoteUri]) => {
  if (newState === 'ringing' && newDirection === 'incoming') {
    const isBlocked = blockedNumbers.some(blocked =>
      newRemoteUri?.includes(blocked)
    )

    if (isBlocked) {
      reject(603) // Decline blocked calls
        .then(() => console.log('Blocked call rejected'))
        .catch(err => console.error('Rejection failed:', err))
    }
  }
})
```

## Call Queuing

VueSip automatically manages incoming calls in a queue, allowing you to handle multiple incoming calls gracefully.

### Understanding the Call Queue

When multiple calls arrive simultaneously:

1. All incoming calls are added to the call store
2. Incoming calls are queued in the order they arrive
3. You can retrieve calls from the queue to handle them sequentially
4. Answered or rejected calls are automatically removed from the queue

### Accessing the Queue

```typescript
import { callStore } from 'vuesip'
import { computed } from 'vue'

// Get all incoming calls in the queue
const queuedCalls = computed(() => callStore.incomingCalls)

// Get the number of calls waiting
const queueLength = computed(() => callStore.incomingCallCount)

// Get the next call to handle
const nextCall = callStore.getNextIncomingCall()
```

### Handling Queued Calls

```typescript
import { callStore } from 'vuesip'

async function handleNextIncomingCall() {
  const nextCall = callStore.getNextIncomingCall()

  if (!nextCall) {
    console.log('No incoming calls in queue')
    return
  }

  console.log(`Handling call from: ${nextCall.remoteUri}`)

  // Create session and answer
  // ... (answer implementation)
}
```

### Sequential Call Handling

Handle multiple incoming calls one at a time:

```typescript
import { callStore } from 'vuesip'
import { ref, watch } from 'vue'

const isHandlingCall = ref(false)

// Watch for incoming calls
watch(() => callStore.incomingCallCount, (count) => {
  if (count > 0 && !isHandlingCall.value) {
    handleNextCall()
  }
})

async function handleNextCall() {
  const nextCall = callStore.getNextIncomingCall()

  if (!nextCall) return

  isHandlingCall.value = true

  try {
    // Show incoming call UI for this specific call
    showIncomingCallUI(nextCall)

    // Wait for user action (answer or reject)
    // This would be handled by your UI

  } finally {
    isHandlingCall.value = false

    // Check if there are more calls in the queue
    if (callStore.incomingCallCount > 0) {
      handleNextCall()
    }
  }
}
```

### Max Concurrent Calls

Configure the maximum number of concurrent calls:

```typescript
import { callStore } from 'vuesip'

// Set maximum concurrent calls (default: 4)
callStore.setMaxConcurrentCalls(2)

// Check if at max capacity
if (callStore.isAtMaxCalls) {
  console.log('Cannot accept more calls - at maximum capacity')
}
```

### Rejecting Queued Calls When Busy

```typescript
import { callStore } from 'vuesip'
import { watch } from 'vue'

// Auto-reject incoming calls when already at max capacity
watch(() => callStore.incomingCallCount, async (count) => {
  if (count > 0 && callStore.isAtMaxCalls) {
    const calls = callStore.incomingCalls

    // Reject excess calls with "Busy" status
    for (const call of calls) {
      const session = /* get CallSession for this call */
      await session.reject(486) // 486 Busy Here
    }
  }
})
```

## Best Practices

### 1. Always Handle Incoming Call Events

Always set up listeners for incoming calls to avoid missing calls:

```typescript
// Set up listeners when component mounts
onMounted(() => {
  eventBus.on('sip:new_session', handleIncomingCall)
})

// Clean up listeners when component unmounts
onUnmounted(() => {
  eventBus.off('sip:new_session', handleIncomingCall)
})
```

### 2. Provide User Feedback

Always show visual/audio feedback for incoming calls:

```typescript
import { watch } from 'vue'

const showIncomingCallModal = ref(false)
const ringtone = new Audio('/sounds/ringtone.mp3')

watch(state, (newState) => {
  if (newState === 'ringing' && direction.value === 'incoming') {
    // Show UI
    showIncomingCallModal.value = true

    // Play ringtone
    ringtone.loop = true
    ringtone.play()
  } else {
    // Hide UI and stop ringtone
    showIncomingCallModal.value = false
    ringtone.pause()
    ringtone.currentTime = 0
  }
})
```

### 3. Handle Media Permissions

Request media permissions before answering:

```typescript
async function handleAnswer() {
  try {
    // Request permissions first
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    })

    // Stop the test stream
    stream.getTracks().forEach(track => track.stop())

    // Now answer the call
    await answer({ audio: true, video: false })

  } catch (error) {
    if (error.name === 'NotAllowedError') {
      console.error('Microphone permission denied')
      // Show error to user
    } else {
      console.error('Failed to answer:', error)
    }
  }
}
```

### 4. Display Caller Information

Show useful information about incoming calls:

```typescript
import { computed } from 'vue'

const callerInfo = computed(() => {
  if (!session.value || direction.value !== 'incoming') {
    return null
  }

  return {
    displayName: session.value.remoteDisplayName || 'Unknown',
    uri: session.value.remoteUri,
    startTime: session.value.timing.startTime
  }
})
```

### 5. Handle Errors Gracefully

```typescript
async function handleAnswer() {
  try {
    await answer()
  } catch (error) {
    console.error('Answer failed:', error)

    // Provide user feedback
    showNotification({
      type: 'error',
      message: 'Failed to answer call. Please try again.'
    })

    // Optionally reject the call
    await reject(480) // Temporarily Unavailable
  }
}
```

### 6. Clean Up Resources

Always clean up call resources when done:

```typescript
import { watch } from 'vue'

watch(state, (newState) => {
  if (newState === 'terminated' || newState === 'failed') {
    // Stop ringtone
    ringtone.pause()
    ringtone.currentTime = 0

    // Close UI
    showIncomingCallModal.value = false

    // Clear session
    clearSession()

    // Remove from queue
    if (session.value) {
      callStore.removeFromIncomingQueue(session.value.id)
    }
  }
})
```

### 7. Implement Call Waiting

Handle multiple calls with call waiting:

```typescript
import { computed } from 'vue'

const hasActiveCall = computed(() => {
  return callStore.establishedCalls.length > 0
})

const hasWaitingCall = computed(() => {
  return callStore.incomingCallCount > 0 && hasActiveCall.value
})

// Show call waiting UI
watch(hasWaitingCall, (isWaiting) => {
  if (isWaiting) {
    showCallWaitingNotification()
  }
})
```

## Complete Examples

### Example 1: Basic Incoming Call Handler

```typescript
<template>
  <div>
    <!-- Incoming Call Modal -->
    <div v-if="showIncomingCall" class="incoming-call-modal">
      <h2>Incoming Call</h2>
      <p>{{ callerName }}</p>
      <p>{{ callerUri }}</p>

      <button @click="handleAnswer">Answer</button>
      <button @click="handleReject">Decline</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCallSession } from 'vuesip'

const sipClient = ref(/* your SIP client */)
const {
  session,
  state,
  direction,
  remoteUri,
  remoteDisplayName,
  answer,
  reject
} = useCallSession(sipClient)

const showIncomingCall = ref(false)
const ringtone = new Audio('/sounds/ringtone.mp3')

const callerName = computed(() => {
  return remoteDisplayName.value || 'Unknown Caller'
})

const callerUri = computed(() => {
  return remoteUri.value || ''
})

// Watch for incoming calls
watch([state, direction], ([newState, newDirection]) => {
  if (newState === 'ringing' && newDirection === 'incoming') {
    showIncomingCall.value = true
    ringtone.loop = true
    ringtone.play()
  } else if (newState === 'terminated' || newState === 'failed') {
    showIncomingCall.value = false
    ringtone.pause()
    ringtone.currentTime = 0
  }
})

async function handleAnswer() {
  try {
    await answer({ audio: true, video: false })
    showIncomingCall.value = false
    ringtone.pause()
  } catch (error) {
    console.error('Failed to answer:', error)
  }
}

async function handleReject() {
  try {
    await reject(603) // Decline
    showIncomingCall.value = false
    ringtone.pause()
  } catch (error) {
    console.error('Failed to reject:', error)
  }
}
</script>
```

### Example 2: Call Queue Manager

```typescript
<template>
  <div>
    <!-- Queue Status -->
    <div v-if="queueLength > 0" class="queue-status">
      <p>{{ queueLength }} call(s) waiting</p>
    </div>

    <!-- Current Incoming Call -->
    <div v-if="currentIncomingCall" class="incoming-call">
      <h2>Incoming Call {{ currentCallIndex + 1 }} of {{ queueLength }}</h2>
      <p>{{ currentIncomingCall.remoteDisplayName }}</p>

      <button @click="answerCurrent">Answer</button>
      <button @click="rejectCurrent">Decline</button>
      <button @click="rejectAll">Decline All</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { callStore } from 'vuesip'
import { CallSession } from 'vuesip'

const currentIncomingCall = ref(null)
const currentCallIndex = ref(0)

const queueLength = computed(() => callStore.incomingCallCount)
const incomingCalls = computed(() => callStore.incomingCalls)

// Watch for new calls in queue
watch(queueLength, (count) => {
  if (count > 0 && !currentIncomingCall.value) {
    showNextCall()
  }
})

function showNextCall() {
  const nextCall = callStore.getNextIncomingCall()
  if (nextCall) {
    currentIncomingCall.value = nextCall
    currentCallIndex.value = 0
  }
}

async function answerCurrent() {
  if (!currentIncomingCall.value) return

  try {
    // Create session and answer
    const session = new CallSession({
      id: currentIncomingCall.value.id,
      direction: currentIncomingCall.value.direction,
      localUri: currentIncomingCall.value.localUri,
      remoteUri: currentIncomingCall.value.remoteUri,
      rtcSession: /* JsSIP session */,
      eventBus: /* event bus */
    })

    await session.answer({ audio: true, video: false })

    // Remove from queue and show next
    callStore.removeFromIncomingQueue(currentIncomingCall.value.id)
    currentIncomingCall.value = null

    if (queueLength.value > 0) {
      showNextCall()
    }
  } catch (error) {
    console.error('Failed to answer:', error)
  }
}

async function rejectCurrent() {
  if (!currentIncomingCall.value) return

  try {
    const session = new CallSession(/* ... */)
    await session.reject(603)

    callStore.removeFromIncomingQueue(currentIncomingCall.value.id)
    currentIncomingCall.value = null

    if (queueLength.value > 0) {
      showNextCall()
    }
  } catch (error) {
    console.error('Failed to reject:', error)
  }
}

async function rejectAll() {
  const calls = [...incomingCalls.value]

  for (const call of calls) {
    try {
      const session = new CallSession(/* ... */)
      await session.reject(603)
      callStore.removeFromIncomingQueue(call.id)
    } catch (error) {
      console.error('Failed to reject call:', error)
    }
  }

  currentIncomingCall.value = null
}
</script>
```

### Example 3: Auto-Answer with Conditions

```typescript
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCallSession } from 'vuesip'

const sipClient = ref(/* your SIP client */)
const {
  session,
  state,
  direction,
  remoteUri,
  answer,
  reject
} = useCallSession(sipClient)

// Auto-answer configuration
const autoAnswerEnabled = ref(true)
const autoAnswerDelay = ref(2000) // 2 seconds
const whitelistedNumbers = ref([
  'sip:boss@company.com',
  'sip:support@company.com'
])

// Watch for incoming calls
watch([state, direction, remoteUri], ([newState, newDirection, newRemoteUri]) => {
  if (newState === 'ringing' && newDirection === 'incoming') {
    handleIncomingCall(newRemoteUri)
  }
})

function handleIncomingCall(callerUri: string | null) {
  if (!autoAnswerEnabled.value) {
    // Manual answer - show UI
    return
  }

  // Check if caller is whitelisted
  const isWhitelisted = whitelistedNumbers.value.some(num =>
    callerUri?.includes(num)
  )

  if (!isWhitelisted) {
    console.log('Caller not whitelisted, requiring manual answer')
    return
  }

  // Auto-answer after delay
  console.log(`Auto-answering call from ${callerUri} in ${autoAnswerDelay.value}ms`)

  setTimeout(async () => {
    // Check if call is still ringing
    if (state.value === 'ringing') {
      try {
        await answer({ audio: true, video: false })
        console.log('Call auto-answered')
      } catch (error) {
        console.error('Auto-answer failed:', error)
      }
    }
  }, autoAnswerDelay.value)
}
</script>
```

## Summary

This guide covered:

- **Incoming Call Detection**: Using events and the call store to detect incoming calls
- **Auto-Answer**: Configuring and implementing auto-answer functionality
- **Answering Calls**: Various methods and options for answering calls
- **Rejecting Calls**: Using different SIP status codes to reject calls appropriately
- **Call Queuing**: Managing multiple incoming calls with the built-in queue system
- **Best Practices**: Essential patterns for robust incoming call handling

For more information, see:
- [Making Calls Guide](./making-calls.md)
- [Call Controls Guide](./call-controls.md)
- [API Reference](../api/index.md)
