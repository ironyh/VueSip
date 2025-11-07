# Presence and Messaging Guide

This guide explains how to use SIP presence (SUBSCRIBE/NOTIFY/PUBLISH) and instant messaging (SIP MESSAGE) in VueSip. Learn how to track user availability, send messages, and manage composing indicators.

## Table of Contents

- [Quick Start](#quick-start)
- [Presence Management](#presence-management)
  - [Setting Your Status](#setting-your-status)
  - [Watching Other Users](#watching-other-users)
  - [Presence Events](#presence-events)
  - [Auto-Refresh](#auto-refresh)
- [Instant Messaging](#instant-messaging)
  - [Sending Messages](#sending-messages)
  - [Receiving Messages](#receiving-messages)
  - [Message Status Tracking](#message-status-tracking)
  - [Composing Indicators](#composing-indicators)
- [Conversations](#conversations)
- [Message Management](#message-management)
- [Best Practices](#best-practices)
- [Advanced Examples](#advanced-examples)

## Quick Start

### Presence Quick Start

```typescript
import { useSipClient, usePresence } from 'vuesip'

const { sipClient } = useSipClient()
const { setStatus, subscribe, watchedUsers } = usePresence(sipClient)

// Set your status
await setStatus(PresenceState.Available)

// Watch another user
await subscribe('sip:alice@example.com')

// Check their status
const aliceStatus = watchedUsers.value.get('sip:alice@example.com')
console.log(`Alice is: ${aliceStatus?.state}`)
```

### Messaging Quick Start

```typescript
import { useSipClient, useMessaging } from 'vuesip'

const { sipClient } = useSipClient()
const { sendMessage, messages, unreadCount } = useMessaging(sipClient)

// Send a message
await sendMessage('sip:bob@example.com', 'Hello!')

// Check unread count
console.log(`Unread messages: ${unreadCount.value}`)
```

## Presence Management

The `usePresence` composable provides complete SIP presence functionality using SUBSCRIBE/NOTIFY/PUBLISH methods.

### Setting Your Status

Publish your presence status to let others know your availability:

```typescript
import { ref } from 'vue'
import { useSipClient, usePresence, PresenceState } from 'vuesip'

const { sipClient } = useSipClient()
const { setStatus, currentStatus, currentState } = usePresence(sipClient)

// Set to Available
await setStatus(PresenceState.Available)

// Set to Away with custom message
await setStatus(PresenceState.Away, {
  statusMessage: 'At lunch, back at 1pm'
})

// Set to Busy
await setStatus(PresenceState.Busy, {
  statusMessage: 'In a meeting'
})

// Set to Offline
await setStatus(PresenceState.Offline)

// Custom status with custom message
await setStatus(PresenceState.Custom, {
  statusMessage: 'Working from home'
})

// Set with custom expiry time (in seconds)
await setStatus(PresenceState.Available, {
  statusMessage: 'Available for calls',
  expires: 7200 // 2 hours
})
```

#### Presence States

VueSip supports the following presence states:

| State | Description |
|-------|-------------|
| `Available` | User is online and available |
| `Away` | User is away from their device |
| `Busy` | User is busy / do not disturb |
| `Offline` | User is offline |
| `Custom` | Custom status with message |

#### Current Status

Access your current presence status:

```typescript
const { currentStatus, currentState } = usePresence(sipClient)

// Get current state enum value
console.log(currentState.value) // 'available'

// Get full status object
console.log(currentStatus.value)
// {
//   uri: 'sip:self@example.com',
//   state: 'available',
//   statusMessage: 'Working from home',
//   lastUpdated: Date
// }
```

### Watching Other Users

Subscribe to other users' presence to receive real-time status updates:

```typescript
const {
  subscribe,
  unsubscribe,
  watchedUsers,
  subscriptions,
  subscriptionCount,
  getStatus
} = usePresence(sipClient)

// Subscribe to a user's presence
const subscriptionId = await subscribe('sip:alice@example.com')

// Subscribe with custom options
await subscribe('sip:bob@example.com', {
  expires: 7200, // Subscription expires in 2 hours
  extraHeaders: ['X-Custom-Header: value']
})

// Get a specific user's status
const aliceStatus = getStatus('sip:alice@example.com')
if (aliceStatus) {
  console.log(`Alice: ${aliceStatus.state}`)
  console.log(`Message: ${aliceStatus.statusMessage}`)
  console.log(`Last updated: ${aliceStatus.lastUpdated}`)
}

// Check all watched users
watchedUsers.value.forEach((status, uri) => {
  console.log(`${uri}: ${status.state} - ${status.statusMessage}`)
})

// Get subscription count
console.log(`Watching ${subscriptionCount.value} users`)

// Unsubscribe from a user
await unsubscribe('sip:alice@example.com')

// Unsubscribe from all users
await unsubscribeAll()
```

#### Subscription Details

Monitor active subscriptions:

```typescript
const { subscriptions } = usePresence(sipClient)

// Get subscription details
subscriptions.value.forEach((subscription, uri) => {
  console.log({
    id: subscription.id,
    targetUri: subscription.targetUri,
    state: subscription.state, // 'pending' | 'active' | 'terminated'
    expires: subscription.expires,
    lastStatus: subscription.lastStatus
  })
})
```

### Presence Events

Listen for presence events to react to status changes:

```typescript
const { onPresenceEvent } = usePresence(sipClient)

// Register event listener
const unsubscribe = onPresenceEvent((event) => {
  switch (event.type) {
    case 'updated':
      console.log(`${event.uri} status changed to ${event.status?.state}`)
      console.log(`Message: ${event.status?.statusMessage}`)
      break

    case 'subscribed':
      console.log(`Subscribed to ${event.uri}`)
      break

    case 'unsubscribed':
      console.log(`Unsubscribed from ${event.uri}`)
      break

    case 'error':
      console.error(`Presence error for ${event.uri}:`, event.error)
      break
  }
})

// Later: unregister the listener
unsubscribe()
```

#### Event Types

| Event Type | Description | Properties |
|------------|-------------|------------|
| `updated` | User's presence status changed | `uri`, `status`, `timestamp` |
| `subscribed` | Successfully subscribed to user | `uri`, `subscription`, `timestamp` |
| `unsubscribed` | Unsubscribed from user | `uri`, `subscription`, `timestamp` |
| `error` | Subscription error occurred | `uri`, `error`, `timestamp` |

### Auto-Refresh

Subscriptions automatically refresh at 90% of their expiry time to maintain continuous presence updates:

```typescript
// Subscribe with 1 hour expiry
await subscribe('sip:alice@example.com', {
  expires: 3600 // 1 hour
})

// Subscription will auto-refresh at 54 minutes (90% of 60 minutes)
// No manual intervention required!
```

The auto-refresh:
- Automatically unsubscribes and re-subscribes before expiry
- Maintains the same subscription options
- Handles errors gracefully
- Is cleared when you manually unsubscribe

## Instant Messaging

The `useMessaging` composable provides SIP MESSAGE functionality for instant messaging.

### Sending Messages

Send instant messages to other users:

```typescript
import { ref } from 'vue'
import { useSipClient, useMessaging, MessageContentType } from 'vuesip'

const { sipClient } = useSipClient()
const { sendMessage, messages } = useMessaging(sipClient)

// Send a simple text message
const messageId = await sendMessage('sip:bob@example.com', 'Hello!')

// Send with content type
await sendMessage('sip:bob@example.com', '{"data":"value"}', {
  contentType: MessageContentType.JSON
})

// Send HTML message
await sendMessage('sip:bob@example.com', '<p>Hello <strong>World</strong></p>', {
  contentType: MessageContentType.HTML
})

// Send with extra headers
await sendMessage('sip:bob@example.com', 'Hello!', {
  extraHeaders: ['X-Custom-Header: value']
})

// Request delivery notification
await sendMessage('sip:bob@example.com', 'Important message', {
  requestDeliveryNotification: true
})

// Request read notification
await sendMessage('sip:bob@example.com', 'Please confirm receipt', {
  requestReadNotification: true
})
```

#### Content Types

| Content Type | Description | Use Case |
|--------------|-------------|----------|
| `MessageContentType.Text` | Plain text (default) | Simple messages |
| `MessageContentType.HTML` | HTML content | Rich formatted messages |
| `MessageContentType.JSON` | JSON data | Structured data exchange |
| `MessageContentType.Custom` | Custom type | Application-specific |

### Receiving Messages

Messages are automatically received and stored. Listen for incoming messages:

```typescript
const { messages, onMessagingEvent } = useMessaging(sipClient)

// Listen for all messaging events
const unsubscribe = onMessagingEvent((event) => {
  switch (event.type) {
    case 'received':
      console.log(`New message from ${event.message.from}`)
      console.log(`Content: ${event.message.content}`)
      // Show notification, play sound, etc.
      break

    case 'sent':
      console.log('Message sent successfully')
      break

    case 'failed':
      console.error('Message failed to send:', event.error)
      break

    case 'delivered':
      console.log('Message delivered')
      break

    case 'read':
      console.log('Message read')
      break
  }
})

// Access all messages
messages.value.forEach((message) => {
  console.log({
    id: message.id,
    from: message.from,
    to: message.to,
    content: message.content,
    direction: message.direction, // 'incoming' | 'outgoing'
    status: message.status,
    timestamp: message.timestamp,
    isRead: message.isRead
  })
})
```

### Message Status Tracking

Track the lifecycle of each message:

```typescript
const { messages, getMessagesForUri } = useMessaging(sipClient)

// Get messages for specific user
const bobMessages = getMessagesForUri('sip:bob@example.com')

bobMessages.forEach((msg) => {
  console.log(`Status: ${msg.status}`)
  console.log(`Created: ${msg.timestamp}`)
  console.log(`Sent: ${msg.sentAt}`)
  console.log(`Delivered: ${msg.deliveredAt}`)
  console.log(`Read: ${msg.readAt}`)
})
```

#### Message Status Values

| Status | Description |
|--------|-------------|
| `Pending` | Message queued for sending |
| `Sending` | Message being sent |
| `Sent` | Message sent successfully |
| `Delivered` | Message delivered to recipient |
| `Read` | Message read by recipient |
| `Failed` | Message failed to send |

### Composing Indicators

Send and receive "user is typing" indicators:

```typescript
const { sendComposingIndicator, composingIndicators } = useMessaging(sipClient)

// Send composing indicator when user starts typing
const handleInput = async (text: string) => {
  if (text.length > 0) {
    await sendComposingIndicator('sip:bob@example.com', true)
  } else {
    await sendComposingIndicator('sip:bob@example.com', false)
  }
}

// Check if other users are composing
const bobIndicator = composingIndicators.value.get('sip:bob@example.com')
if (bobIndicator?.isComposing) {
  console.log('Bob is typing...')
}
```

Composing indicators:
- Automatically timeout after 10 seconds if not refreshed
- Can be sent as "composing" (user is typing) or "idle" (user stopped)
- Are non-critical and won't throw errors if they fail

## Conversations

Messages are automatically grouped into conversations by peer URI:

```typescript
const { conversations } = useMessaging(sipClient)

// Access conversations (Map of URI -> Conversation)
conversations.value.forEach((conv, uri) => {
  console.log({
    uri: conv.uri,
    displayName: conv.displayName,
    messages: conv.messages, // All messages in conversation
    unreadCount: conv.unreadCount, // Unread messages in this conversation
    lastMessageAt: conv.lastMessageAt, // Timestamp of last message
    isComposing: conv.isComposing // Is peer currently typing
  })
})

// Get specific conversation
const aliceConv = conversations.value.get('sip:alice@example.com')
if (aliceConv) {
  console.log(`${aliceConv.unreadCount} unread messages from Alice`)
  console.log(`Last message: ${aliceConv.lastMessageAt}`)
}
```

Conversations automatically:
- Group messages by peer URI
- Track unread counts per conversation
- Sort messages by timestamp
- Update when new messages arrive
- Reflect composing indicator state

## Message Management

### Mark Messages as Read

```typescript
const { markAsRead, markAllAsRead } = useMessaging(sipClient)

// Mark specific message as read
markAsRead('msg-123')

// Mark all messages from a user as read
markAllAsRead('sip:alice@example.com')

// Mark all messages as read
markAllAsRead()
```

### Delete Messages

```typescript
const { deleteMessage, clearMessages } = useMessaging(sipClient)

// Delete specific message
deleteMessage('msg-123')

// Clear all messages from a user
clearMessages('sip:alice@example.com')

// Clear all messages
clearMessages()
```

### Filter and Search Messages

```typescript
const { getFilteredMessages, MessageDirection, MessageStatus } = useMessaging(sipClient)

// Filter by direction
const incoming = getFilteredMessages({
  direction: MessageDirection.Incoming
})

// Filter by status
const unread = getFilteredMessages({
  status: MessageStatus.Delivered
})

// Filter by date range
const recent = getFilteredMessages({
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-12-31')
})

// Search message content
const searchResults = getFilteredMessages({
  searchQuery: 'hello'
})

// Combine multiple filters
const results = getFilteredMessages({
  uri: 'sip:alice@example.com',
  direction: MessageDirection.Incoming,
  status: MessageStatus.Delivered,
  searchQuery: 'meeting',
  dateFrom: new Date('2024-01-01')
})
```

### Unread Count

Track total unread messages:

```typescript
const { unreadCount } = useMessaging(sipClient)

// Display badge count
console.log(`${unreadCount.value} unread messages`)

// Watch for changes
watch(unreadCount, (count) => {
  if (count > 0) {
    updateBadge(count)
    playNotificationSound()
  }
})
```

## Best Practices

### Presence Best Practices

1. **Set status on connection:**
```typescript
const { isConnected } = useSipClient()
const { setStatus } = usePresence(sipClient)

watch(isConnected, async (connected) => {
  if (connected) {
    await setStatus(PresenceState.Available)
  }
})
```

2. **Update status based on user activity:**
```typescript
let idleTimeout: number

const handleActivity = () => {
  clearTimeout(idleTimeout)
  setStatus(PresenceState.Available)

  idleTimeout = window.setTimeout(() => {
    setStatus(PresenceState.Away, {
      statusMessage: 'Idle for 10 minutes'
    })
  }, 10 * 60 * 1000) // 10 minutes
}
```

3. **Set offline before unload:**
```typescript
onBeforeUnmount(async () => {
  await setStatus(PresenceState.Offline)
})

// Or in browser
window.addEventListener('beforeunload', () => {
  setStatus(PresenceState.Offline)
})
```

4. **Handle subscription limits:**
```typescript
const MAX_SUBSCRIPTIONS = 50

const { subscribe, subscriptionCount } = usePresence(sipClient)

const safeSubscribe = async (uri: string) => {
  if (subscriptionCount.value >= MAX_SUBSCRIPTIONS) {
    console.warn('Subscription limit reached')
    return
  }
  await subscribe(uri)
}
```

### Messaging Best Practices

1. **Handle errors gracefully:**
```typescript
const { sendMessage } = useMessaging(sipClient)

const safeSendMessage = async (to: string, content: string) => {
  try {
    await sendMessage(to, content)
    showSuccess('Message sent')
  } catch (error) {
    showError('Failed to send message')
    console.error(error)
  }
}
```

2. **Implement retry logic for failed messages:**
```typescript
const retryMessage = async (messageId: string, maxRetries = 3) => {
  const message = messages.value.find(m => m.id === messageId)
  if (!message || message.status !== MessageStatus.Failed) return

  for (let i = 0; i < maxRetries; i++) {
    try {
      await sendMessage(message.to, message.content)
      deleteMessage(messageId) // Remove failed message
      return
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}
```

3. **Auto-mark messages as read when viewed:**
```typescript
const { markAllAsRead } = useMessaging(sipClient)

const openConversation = (uri: string) => {
  // Open conversation UI
  showConversation(uri)

  // Mark all messages from this user as read
  markAllAsRead(uri)
}
```

4. **Debounce composing indicators:**
```typescript
import { useDebounceFn } from '@vueuse/core'

const { sendComposingIndicator } = useMessaging(sipClient)

const sendComposing = useDebounceFn((to: string, isComposing: boolean) => {
  sendComposingIndicator(to, isComposing)
}, 500)

const handleInput = (to: string, text: string) => {
  sendComposing(to, text.length > 0)
}
```

5. **Limit message history:**
```typescript
const MAX_MESSAGES = 1000

watch(messages, (msgs) => {
  if (msgs.length > MAX_MESSAGES) {
    // Keep only the most recent messages
    const toRemove = msgs
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(0, msgs.length - MAX_MESSAGES)

    toRemove.forEach(msg => deleteMessage(msg.id))
  }
})
```

## Advanced Examples

### Complete Presence Integration

```typescript
<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useSipClient, usePresence, PresenceState } from 'vuesip'

const { sipClient, isConnected } = useSipClient()
const {
  setStatus,
  subscribe,
  unsubscribe,
  watchedUsers,
  currentState,
  onPresenceEvent
} = usePresence(sipClient)

const buddyList = ref([
  'sip:alice@example.com',
  'sip:bob@example.com',
  'sip:charlie@example.com'
])

// Set status on connection
watch(isConnected, async (connected) => {
  if (connected) {
    await setStatus(PresenceState.Available, {
      statusMessage: 'Online'
    })

    // Subscribe to buddy list
    for (const buddy of buddyList.value) {
      await subscribe(buddy)
    }
  }
})

// Listen for presence updates
onPresenceEvent((event) => {
  if (event.type === 'updated') {
    console.log(`${event.uri} is now ${event.status?.state}`)
    // Update UI, show notification, etc.
  }
})

// Change status
const changeStatus = async (state: PresenceState, message?: string) => {
  await setStatus(state, { statusMessage: message })
}

// Cleanup
onBeforeUnmount(async () => {
  await setStatus(PresenceState.Offline)
  await unsubscribeAll()
})
</script>

<template>
  <div class="presence-panel">
    <div class="my-status">
      <h3>My Status: {{ currentState }}</h3>
      <button @click="changeStatus(PresenceState.Available)">Available</button>
      <button @click="changeStatus(PresenceState.Away)">Away</button>
      <button @click="changeStatus(PresenceState.Busy)">Busy</button>
    </div>

    <div class="buddy-list">
      <h3>Contacts</h3>
      <div v-for="(status, uri) in watchedUsers" :key="uri" class="buddy">
        <span class="status-indicator" :class="status.state"></span>
        <span class="uri">{{ uri }}</span>
        <span class="status-message">{{ status.statusMessage }}</span>
      </div>
    </div>
  </div>
</template>
```

### Complete Messaging Integration

```typescript
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSipClient, useMessaging } from 'vuesip'

const { sipClient } = useSipClient()
const {
  sendMessage,
  messages,
  conversations,
  unreadCount,
  composingIndicators,
  sendComposingIndicator,
  markAllAsRead,
  onMessagingEvent
} = useMessaging(sipClient)

const currentChat = ref<string | null>(null)
const messageInput = ref('')

// Get current conversation messages
const currentMessages = computed(() => {
  if (!currentChat.value) return []
  return conversations.value.get(currentChat.value)?.messages || []
})

// Check if peer is typing
const peerIsTyping = computed(() => {
  if (!currentChat.value) return false
  return composingIndicators.value.get(currentChat.value)?.isComposing || false
})

// Send message
const handleSend = async () => {
  if (!messageInput.value.trim() || !currentChat.value) return

  await sendMessage(currentChat.value, messageInput.value)
  messageInput.value = ''
  await sendComposingIndicator(currentChat.value, false)
}

// Handle input (send composing indicator)
let composingTimer: number
watch(messageInput, (value) => {
  if (!currentChat.value) return

  clearTimeout(composingTimer)

  if (value.length > 0) {
    sendComposingIndicator(currentChat.value, true)

    // Auto-clear after 10 seconds
    composingTimer = window.setTimeout(() => {
      sendComposingIndicator(currentChat.value!, false)
    }, 10000)
  } else {
    sendComposingIndicator(currentChat.value, false)
  }
})

// Open conversation
const openChat = (uri: string) => {
  currentChat.value = uri
  markAllAsRead(uri)
}

// Listen for new messages
onMessagingEvent((event) => {
  if (event.type === 'received') {
    // Show notification if not in current chat
    if (event.message.from !== currentChat.value) {
      showNotification(`New message from ${event.message.from}`)
    } else {
      // Auto-mark as read if viewing conversation
      markAllAsRead(event.message.from)
    }
  }
})
</script>

<template>
  <div class="messaging-app">
    <!-- Conversation list -->
    <aside class="conversation-list">
      <h2>Messages <span class="badge">{{ unreadCount }}</span></h2>
      <div
        v-for="(conv, uri) in conversations"
        :key="uri"
        class="conversation-item"
        :class="{ active: uri === currentChat }"
        @click="openChat(uri)"
      >
        <div class="conv-header">
          <span class="uri">{{ conv.displayName || uri }}</span>
          <span v-if="conv.unreadCount > 0" class="unread-badge">
            {{ conv.unreadCount }}
          </span>
        </div>
        <div class="conv-preview">
          <span v-if="conv.isComposing" class="typing">typing...</span>
          <span v-else class="last-message">
            {{ conv.messages[conv.messages.length - 1]?.content }}
          </span>
        </div>
      </div>
    </aside>

    <!-- Chat window -->
    <main class="chat-window">
      <div v-if="currentChat" class="chat-content">
        <header class="chat-header">
          <h3>{{ currentChat }}</h3>
        </header>

        <div class="messages">
          <div
            v-for="msg in currentMessages"
            :key="msg.id"
            class="message"
            :class="msg.direction"
          >
            <div class="message-content">{{ msg.content }}</div>
            <div class="message-meta">
              {{ msg.timestamp.toLocaleTimeString() }}
              <span v-if="msg.direction === 'outgoing'" class="status">
                {{ msg.status }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="peerIsTyping" class="typing-indicator">
          typing...
        </div>

        <footer class="chat-input">
          <input
            v-model="messageInput"
            type="text"
            placeholder="Type a message..."
            @keyup.enter="handleSend"
          />
          <button @click="handleSend">Send</button>
        </footer>
      </div>
      <div v-else class="no-chat">
        Select a conversation to start messaging
      </div>
    </main>
  </div>
</template>
```

### Combined Presence and Messaging

```typescript
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSipClient, usePresence, useMessaging, PresenceState } from 'vuesip'

const { sipClient } = useSipClient()
const { watchedUsers, subscribe } = usePresence(sipClient)
const { conversations, sendMessage } = useMessaging(sipClient)

// Combine presence and messaging data
const contacts = computed(() => {
  const result = []

  for (const [uri, conv] of conversations.value) {
    const presence = watchedUsers.value.get(uri)
    result.push({
      uri,
      presence: presence?.state || PresenceState.Offline,
      statusMessage: presence?.statusMessage,
      unreadCount: conv.unreadCount,
      lastMessage: conv.messages[conv.messages.length - 1],
      isComposing: conv.isComposing
    })
  }

  return result.sort((a, b) => {
    // Sort by unread count, then by last message time
    if (a.unreadCount !== b.unreadCount) {
      return b.unreadCount - a.unreadCount
    }
    return (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0)
  })
})

// Quick message to available user
const quickMessage = async (uri: string) => {
  const presence = watchedUsers.value.get(uri)
  if (presence?.state === PresenceState.Available) {
    await sendMessage(uri, 'Quick hello!')
  } else {
    console.log('User not available')
  }
}
</script>

<template>
  <div class="contact-list">
    <div v-for="contact in contacts" :key="contact.uri" class="contact">
      <div class="presence-indicator" :class="contact.presence"></div>
      <div class="contact-info">
        <div class="contact-name">{{ contact.uri }}</div>
        <div class="contact-status">{{ contact.statusMessage }}</div>
        <div v-if="contact.isComposing" class="composing">typing...</div>
      </div>
      <div v-if="contact.unreadCount > 0" class="unread-badge">
        {{ contact.unreadCount }}
      </div>
      <button @click="quickMessage(contact.uri)">Message</button>
    </div>
  </div>
</template>
```

## Summary

This guide covered:

- **Presence Management**: Setting your status, watching other users, presence events, and auto-refresh
- **Instant Messaging**: Sending/receiving messages, message status tracking, and composing indicators
- **Conversations**: Automatic grouping and management
- **Message Management**: Reading, deleting, filtering, and searching messages
- **Best Practices**: Error handling, resource management, and performance optimization
- **Advanced Examples**: Complete implementations combining presence and messaging

For more information, see:
- [API Reference - usePresence](/api/composables/usePresence)
- [API Reference - useMessaging](/api/composables/useMessaging)
- [SIP Protocol Guide](/guide/sip-protocol)
