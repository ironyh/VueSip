# Call Controls Guide

This guide covers the call control features in VueSip, including hold/unhold functionality, mute/unmute controls, DTMF tone sending, and call transfer capabilities.

## Overview

VueSip provides comprehensive call control features through two main composables:

- **`useCallControls`** - Advanced call transfer and forwarding
- **`useDTMF`** - DTMF tone sending with queue management

Additionally, basic call controls (hold, mute, DTMF) are available directly on `CallSession` instances.

## Table of Contents

- [Hold/Unhold Functionality](#holdunhold-functionality)
- [Mute/Unmute Controls](#muteunmute-controls)
- [DTMF Tone Sending](#dtmf-tone-sending)
- [Call Transfer](#call-transfer)
- [Best Practices](#best-practices)

---

## Hold/Unhold Functionality

### Basic Hold/Unhold

The `CallSession` class provides `hold()` and `unhold()` methods for managing call hold state.

#### Putting a Call on Hold

```typescript
import { useSipClient } from 'vuesip'

const { currentCall } = useSipClient()

// Put the current call on hold
try {
  await currentCall.value?.hold()
  console.log('Call placed on hold')
} catch (error) {
  console.error('Failed to hold call:', error)
}
```

#### Resuming a Call from Hold

```typescript
// Resume call from hold
try {
  await currentCall.value?.unhold()
  console.log('Call resumed')
} catch (error) {
  console.error('Failed to unhold call:', error)
}
```

### Hold State Management

The call session maintains hold state that you can monitor:

```typescript
import { watch } from 'vue'

// Watch hold state changes
watch(
  () => currentCall.value?.isOnHold,
  (isOnHold) => {
    if (isOnHold) {
      console.log('Call is now on hold')
      // Update UI to show hold state
    } else {
      console.log('Call is active')
      // Update UI to show active state
    }
  }
)
```

### Call States During Hold

When a call is placed on hold:
- Local hold: Call state transitions to `'held'`
- Remote hold: Call state transitions to `'remote_held'`
- When resumed: Call state returns to `'active'`

```typescript
import { watch } from 'vue'

// Monitor call state changes
watch(
  () => currentCall.value?.state,
  (state) => {
    switch (state) {
      case 'held':
        console.log('You put the call on hold')
        break
      case 'remote_held':
        console.log('Remote party put you on hold')
        break
      case 'active':
        console.log('Call is active')
        break
    }
  }
)
```

### Hold Timeout Protection

VueSip includes automatic timeout protection for hold operations (10 seconds by default). If a hold/unhold operation doesn't complete within the timeout period, the operation lock is automatically released to prevent the call from getting stuck.

---

## Mute/Unmute Controls

### Basic Mute/Unmute

The `CallSession` class provides synchronous `mute()` and `unmute()` methods for controlling local audio.

#### Muting the Microphone

```typescript
import { useSipClient } from 'vuesip'

const { currentCall } = useSipClient()

// Mute the microphone
try {
  currentCall.value?.mute()
  console.log('Microphone muted')
} catch (error) {
  console.error('Failed to mute:', error)
}
```

#### Unmuting the Microphone

```typescript
// Unmute the microphone
try {
  currentCall.value?.unmute()
  console.log('Microphone unmuted')
} catch (error) {
  console.error('Failed to unmute:', error)
}
```

### Mute State Management

Track mute state using the `isMuted` property:

```typescript
import { computed } from 'vue'

// Reactive mute state
const isMuted = computed(() => currentCall.value?.isMuted ?? false)

// Toggle mute function
function toggleMute() {
  if (!currentCall.value) return

  if (isMuted.value) {
    currentCall.value.unmute()
  } else {
    currentCall.value.mute()
  }
}
```

### Mute Events

Listen for mute state changes:

```typescript
import { useSipClient } from 'vuesip'

const { on } = useSipClient()

// Listen for mute events
on('call:muted', (event) => {
  console.log('Call muted:', event.session.id)
  // Update UI
})

on('call:unmuted', (event) => {
  console.log('Call unmuted:', event.session.id)
  // Update UI
})
```

### Complete Mute Toggle Component

```vue
<template>
  <button
    @click="toggleMute"
    :disabled="!hasActiveCall"
    :class="{ 'muted': isMuted }"
  >
    {{ isMuted ? '🔇 Unmute' : '🔊 Mute' }}
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSipClient } from 'vuesip'

const { currentCall } = useSipClient()

const hasActiveCall = computed(() =>
  currentCall.value?.state === 'active'
)

const isMuted = computed(() =>
  currentCall.value?.isMuted ?? false
)

function toggleMute() {
  if (!currentCall.value) return

  if (isMuted.value) {
    currentCall.value.unmute()
  } else {
    currentCall.value.mute()
  }
}
</script>
```

---

## DTMF Tone Sending

VueSip provides two ways to send DTMF tones:
1. Direct sending via `CallSession`
2. Advanced queue management via `useDTMF` composable

### Using CallSession for DTMF

The `CallSession` class provides a simple `sendDTMF()` method:

```typescript
import { useSipClient } from 'vuesip'

const { currentCall } = useSipClient()

// Send single tone
currentCall.value?.sendDTMF('1')

// Send sequence
currentCall.value?.sendDTMF('1234#')

// Send with custom options
currentCall.value?.sendDTMF('5', {
  duration: 100,        // Tone duration in ms
  interToneGap: 70,     // Gap between tones in ms
  transportType: 'RFC2833' // or 'INFO'
})
```

### Using the useDTMF Composable

For advanced DTMF functionality with queue management, use the `useDTMF` composable:

```typescript
import { ref } from 'vue'
import { useSipClient } from 'vuesip'
import { useDTMF } from 'vuesip/composables'

const { currentCall } = useSipClient()

// Initialize DTMF composable
const {
  sendTone,
  sendToneSequence,
  queueTone,
  queueToneSequence,
  processQueue,
  clearQueue,
  isSending,
  queuedTones,
  lastSentTone,
  tonesSentCount
} = useDTMF(currentCall)
```

### Sending Individual Tones

```typescript
// Send a single tone immediately
try {
  await sendTone('5')
  console.log('Tone sent successfully')
} catch (error) {
  console.error('Failed to send tone:', error)
}

// Send with custom duration
await sendTone('9', {
  duration: 150,
  transport: 'RFC2833'
})
```

### Sending Tone Sequences

```typescript
// Send a sequence of tones
await sendToneSequence('1234#', {
  duration: 100,
  interToneGap: 70,
  onToneSent: (tone) => {
    console.log(`Sent: ${tone}`)
  },
  onComplete: () => {
    console.log('Sequence complete')
  },
  onError: (error, tone) => {
    console.error(`Failed to send ${tone}:`, error)
  }
})
```

### Queue Management

Queue tones for later sending:

```typescript
// Queue individual tones
queueTone('1')
queueTone('2')
queueTone('3')

// Queue a sequence
queueToneSequence('456#')

// Check queue status
console.log('Queue size:', queueSize.value)
console.log('Queued tones:', queuedTones.value)

// Process the queue
await processQueue({
  duration: 100,
  interToneGap: 70,
  onComplete: () => {
    console.log('Queue processed')
  }
})

// Clear the queue
clearQueue()
```

### DTMF State Tracking

```typescript
import { watch } from 'vue'

// Monitor sending state
watch(isSending, (sending) => {
  if (sending) {
    console.log('Sending DTMF...')
  } else {
    console.log('DTMF idle')
  }
})

// Track tones sent
watch(tonesSentCount, (count) => {
  console.log(`Total tones sent: ${count}`)
})

// Monitor last sent tone
watch(lastSentTone, (tone) => {
  if (tone) {
    console.log(`Last tone: ${tone}`)
  }
})
```

### Valid DTMF Tones

VueSip supports the following DTMF tones:
- **Digits**: 0-9
- **Symbols**: `*` (star), `#` (hash)
- **Letters**: A, B, C, D (extended DTMF)

### Queue Size Limits

The DTMF queue has a maximum size limit (default: 1000 tones) to prevent unbounded memory growth. When the limit is reached, the oldest tones are automatically dropped.

### Complete DTMF Dialer Component

```vue
<template>
  <div class="dtmf-dialer">
    <div class="display">{{ display }}</div>

    <div class="keypad">
      <button
        v-for="key in keys"
        :key="key"
        @click="dialTone(key)"
        :disabled="!canDial"
      >
        {{ key }}
      </button>
    </div>

    <div class="status">
      <span v-if="isSending">Sending...</span>
      <span v-else>Tones sent: {{ tonesSentCount }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSipClient } from 'vuesip'
import { useDTMF } from 'vuesip/composables'

const { currentCall } = useSipClient()

const {
  sendTone,
  isSending,
  tonesSentCount
} = useDTMF(currentCall)

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']
const display = ref('')

const canDial = computed(() =>
  currentCall.value?.state === 'active' && !isSending.value
)

async function dialTone(tone: string) {
  display.value += tone

  try {
    await sendTone(tone, {
      duration: 100,
      transport: 'RFC2833'
    })
  } catch (error) {
    console.error('Failed to send tone:', error)
  }

  // Clear display after 2 seconds
  setTimeout(() => {
    display.value = ''
  }, 2000)
}
</script>
```

---

## Call Transfer

VueSip supports two types of call transfer:
1. **Blind Transfer** - Transfer without consultation
2. **Attended Transfer** - Transfer with consultation call

### Using the useCallControls Composable

```typescript
import { ref } from 'vue'
import { useSipClient } from 'vuesip'
import { useCallControls } from 'vuesip/composables'

const { sipClient } = useSipClient()

const {
  // State
  activeTransfer,
  transferState,
  isTransferring,
  consultationCall,

  // Methods
  blindTransfer,
  initiateAttendedTransfer,
  completeAttendedTransfer,
  cancelTransfer,
  forwardCall,
  getTransferProgress,
  onTransferEvent
} = useCallControls(sipClient)
```

### Blind Transfer

Transfer a call directly to another party without consultation:

```typescript
// Perform blind transfer
try {
  await blindTransfer(
    'call-123',                      // Call ID to transfer
    'sip:target@example.com'        // Target SIP URI
  )
  console.log('Blind transfer initiated')
} catch (error) {
  console.error('Transfer failed:', error)
}

// Blind transfer with custom headers
await blindTransfer(
  'call-123',
  'sip:target@example.com',
  ['X-Transfer-Reason: Customer request']
)
```

### Attended Transfer

Transfer with consultation allows you to speak with the transfer target before completing the transfer.

#### Step 1: Initiate Attended Transfer

```typescript
// Start attended transfer (puts original call on hold)
try {
  const consultationCallId = await initiateAttendedTransfer(
    'call-123',                      // Original call ID
    'sip:colleague@example.com'     // Target to consult with
  )

  console.log('Consultation call started:', consultationCallId)
  console.log('Original call on hold:', activeTransfer.value?.callId)

  // Now you can talk to the transfer target

} catch (error) {
  console.error('Failed to initiate transfer:', error)
}
```

#### Step 2: Complete or Cancel Transfer

After consulting with the target, you can either complete or cancel the transfer:

```typescript
// Complete the transfer (connect original caller to target)
try {
  await completeAttendedTransfer()
  console.log('Transfer completed')
} catch (error) {
  console.error('Failed to complete transfer:', error)
}

// OR cancel the transfer (hangup consultation, unhold original)
try {
  await cancelTransfer()
  console.log('Transfer cancelled, original call resumed')
} catch (error) {
  console.error('Failed to cancel transfer:', error)
}
```

### Call Forwarding

Forward an incoming call before answering:

```typescript
// Forward call to another extension
await forwardCall(
  'call-456',
  'sip:voicemail@example.com'
)
```

### Transfer State Management

Monitor transfer state and progress:

```typescript
import { watch } from 'vue'

// Watch transfer state
watch(transferState, (state) => {
  switch (state) {
    case 'idle':
      console.log('No active transfer')
      break
    case 'initiated':
      console.log('Transfer initiated')
      break
    case 'in_progress':
      console.log('Transfer in progress')
      break
    case 'completed':
      console.log('Transfer completed')
      break
    case 'failed':
      console.log('Transfer failed')
      break
    case 'canceled':
      console.log('Transfer canceled')
      break
  }
})

// Check if transfer is in progress
if (isTransferring.value) {
  console.log('Transfer currently active')
}

// Get transfer progress
const progress = getTransferProgress()
if (progress) {
  console.log(`Transfer: ${progress.progress}% complete`)
  console.log(`State: ${progress.state}`)
  console.log(`Type: ${progress.type}`)
}
```

### Transfer Events

Listen for transfer events:

```typescript
// Subscribe to transfer events
const unsubscribe = onTransferEvent((event) => {
  console.log('Transfer event:', event.type)
  console.log('Transfer ID:', event.transferId)
  console.log('State:', event.state)
  console.log('Target:', event.target)

  if (event.error) {
    console.error('Transfer error:', event.error)
  }
})

// Unsubscribe when done
onUnmounted(() => {
  unsubscribe()
})
```

### Complete Transfer Component

```vue
<template>
  <div class="transfer-controls">
    <!-- Transfer Type Selection -->
    <div v-if="!isTransferring">
      <input
        v-model="targetUri"
        placeholder="sip:target@example.com"
        :disabled="!hasActiveCall"
      />

      <button
        @click="startBlindTransfer"
        :disabled="!canTransfer"
      >
        Blind Transfer
      </button>

      <button
        @click="startAttendedTransfer"
        :disabled="!canTransfer"
      >
        Attended Transfer
      </button>
    </div>

    <!-- Transfer In Progress -->
    <div v-else>
      <p>Transfer in progress...</p>
      <p>State: {{ transferState }}</p>
      <p v-if="progress">Progress: {{ progress.progress }}%</p>

      <!-- Attended Transfer Controls -->
      <div v-if="activeTransfer?.type === 'attended'">
        <p>Consulting with target...</p>
        <button @click="completeTransfer">
          Complete Transfer
        </button>
        <button @click="cancelTransferAction">
          Cancel Transfer
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSipClient } from 'vuesip'
import { useCallControls } from 'vuesip/composables'

const { sipClient, currentCall } = useSipClient()

const {
  activeTransfer,
  transferState,
  isTransferring,
  blindTransfer,
  initiateAttendedTransfer,
  completeAttendedTransfer,
  cancelTransfer,
  getTransferProgress
} = useCallControls(sipClient)

const targetUri = ref('')

const hasActiveCall = computed(() =>
  currentCall.value?.state === 'active'
)

const canTransfer = computed(() =>
  hasActiveCall.value &&
  targetUri.value.length > 0 &&
  !isTransferring.value
)

const progress = computed(() => getTransferProgress())

async function startBlindTransfer() {
  if (!currentCall.value) return

  try {
    await blindTransfer(currentCall.value.id, targetUri.value)
    targetUri.value = ''
  } catch (error) {
    console.error('Blind transfer failed:', error)
  }
}

async function startAttendedTransfer() {
  if (!currentCall.value) return

  try {
    await initiateAttendedTransfer(currentCall.value.id, targetUri.value)
    targetUri.value = ''
  } catch (error) {
    console.error('Attended transfer failed:', error)
  }
}

async function completeTransfer() {
  try {
    await completeAttendedTransfer()
  } catch (error) {
    console.error('Failed to complete transfer:', error)
  }
}

async function cancelTransferAction() {
  try {
    await cancelTransfer()
  } catch (error) {
    console.error('Failed to cancel transfer:', error)
  }
}
</script>
```

---

## Best Practices

### Hold/Unhold

1. **Always check call state before holding**
   ```typescript
   if (currentCall.value?.state === 'active') {
     await currentCall.value.hold()
   }
   ```

2. **Handle hold/unhold errors gracefully**
   ```typescript
   try {
     await currentCall.value?.hold()
   } catch (error) {
     // Show user-friendly error message
     showNotification('Failed to hold call')
   }
   ```

3. **Don't hold already held calls**
   ```typescript
   if (!currentCall.value?.isOnHold) {
     await currentCall.value?.hold()
   }
   ```

### Mute/Unmute

1. **Provide visual feedback for mute state**
   ```typescript
   // Use clear icons and colors
   const muteIcon = computed(() =>
     isMuted.value ? '🔇' : '🔊'
   )
   ```

2. **Prevent double muting**
   ```typescript
   if (!currentCall.value?.isMuted) {
     currentCall.value?.mute()
   }
   ```

3. **Consider push-to-talk scenarios**
   ```typescript
   // Hold to unmute, release to mute
   function handleKeyDown() {
     currentCall.value?.unmute()
   }

   function handleKeyUp() {
     currentCall.value?.mute()
   }
   ```

### DTMF

1. **Validate tone input**
   ```typescript
   const validTones = /^[0-9*#A-D]+$/i

   function validateTone(tone: string): boolean {
     return validTones.test(tone)
   }
   ```

2. **Use appropriate transport method**
   ```typescript
   // RFC2833 (in-band) is more reliable
   await sendTone('1', { transport: 'RFC2833' })

   // INFO (out-of-band) for compatibility
   await sendTone('2', { transport: 'INFO' })
   ```

3. **Provide audio feedback**
   ```typescript
   async function sendToneWithFeedback(tone: string) {
     // Play local tone audio
     playDTMFSound(tone)

     // Send to remote
     await sendTone(tone)
   }
   ```

4. **Use queue for rapid input**
   ```typescript
   // Queue tones for smooth dialing
   function dialNumber(number: string) {
     queueToneSequence(number)
     processQueue()
   }
   ```

### Call Transfer

1. **Always validate transfer target**
   ```typescript
   function isValidSipUri(uri: string): boolean {
     return /^sips?:[\w\-.!~*'()&=+$,;?/]+@[\w\-.]+/.test(uri)
   }

   if (!isValidSipUri(targetUri)) {
     throw new Error('Invalid SIP URI')
   }
   ```

2. **Handle transfer failures gracefully**
   ```typescript
   try {
     await blindTransfer(callId, targetUri)
   } catch (error) {
     // Notify user and maintain original call
     showNotification('Transfer failed. Call maintained.')
   }
   ```

3. **Provide clear UI during attended transfer**
   ```typescript
   // Show both calls during consultation
   if (activeTransfer.value?.type === 'attended') {
     // Display original call (on hold)
     // Display consultation call (active)
     // Show "Complete" and "Cancel" buttons
   }
   ```

4. **Monitor transfer progress**
   ```typescript
   watch(transferState, (state) => {
     if (state === 'failed') {
       // Automatically resume original call
       if (currentCall.value?.isOnHold) {
         currentCall.value.unhold()
       }
     }
   })
   ```

5. **Clean up after transfer**
   ```typescript
   watch(transferState, (state) => {
     if (state === 'completed') {
       // Clear transfer UI
       // Update call list
       // Show success notification
     }
   })
   ```

### General Guidelines

1. **Only perform operations on active calls**
   ```typescript
   const canPerformAction = computed(() =>
     currentCall.value?.state === 'active'
   )
   ```

2. **Prevent concurrent operations**
   ```typescript
   if (isTransferring.value || isSending.value) {
     return // Operation in progress
   }
   ```

3. **Provide user feedback**
   ```typescript
   // Show loading states
   // Display operation status
   // Notify on success/failure
   ```

4. **Handle edge cases**
   ```typescript
   // Call ends during operation
   // Network disconnection
   // SIP client not initialized
   // Multiple rapid button clicks
   ```

5. **Test with real SIP servers**
   ```typescript
   // Different SIP implementations may vary
   // Test blind transfer behavior
   // Test attended transfer with Replaces header
   // Test DTMF transport methods
   ```

---

## Summary

VueSip provides comprehensive call control features:

- **Hold/Unhold**: Simple async methods with timeout protection
- **Mute/Unmute**: Synchronous audio control with state tracking
- **DTMF**: Flexible tone sending with queue management
- **Call Transfer**: Both blind and attended transfer with consultation

All features include:
- Type-safe TypeScript interfaces
- Reactive state management
- Event-driven architecture
- Comprehensive error handling
- Best practice examples

For more information, see:
- [API Reference](/api/)
- [Examples Repository](https://github.com/yourusername/vuesip-examples)
- [SIP Client Guide](/guide/sip-client)
