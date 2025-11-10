<template>
  <div class="sip-messaging-demo">
    <h2>📨 SIP Instant Messaging</h2>
    <p class="description">Send and receive instant messages over SIP using the MESSAGE method.</p>

    <!-- Connection Status -->
    <div class="status-section">
      <div :class="['status-badge', connectionState]">
        {{ connectionState.toUpperCase() }}
      </div>
      <div class="unread-badge" v-if="unreadCount > 0">
        {{ unreadCount }} unread
      </div>
    </div>

    <!-- SIP Configuration -->
    <div class="config-section">
      <h3>SIP Configuration</h3>
      <div class="form-group">
        <label>SIP Server URI</label>
        <input v-model="sipServerUri" type="text" placeholder="sip:example.com" />
      </div>
      <div class="form-group">
        <label>Username</label>
        <input v-model="username" type="text" placeholder="user123" />
      </div>
      <div class="form-group">
        <label>Password</label>
        <input v-model="password" type="password" placeholder="password" />
      </div>
      <button @click="toggleConnection" :disabled="isConnecting">
        {{ isConnected ? 'Disconnect' : isConnecting ? 'Connecting...' : 'Connect' }}
      </button>
    </div>

    <!-- Messaging Interface -->
    <div v-if="isConnected" class="messaging-container">
      <div class="messaging-layout">
        <!-- Conversations Sidebar -->
        <aside class="conversations-sidebar">
          <div class="sidebar-header">
            <h3>Conversations</h3>
            <button @click="showNewConversation = true" class="new-chat-btn">
              ➕
            </button>
          </div>

          <div class="conversations-list">
            <div
              v-for="conv in conversations"
              :key="conv.id"
              :class="['conversation-item', { active: currentConversationId === conv.id }]"
              @click="selectConversation(conv.id)"
            >
              <div class="conversation-avatar">
                {{ getInitials(conv.name) }}
              </div>
              <div class="conversation-info">
                <div class="conversation-header">
                  <div class="conversation-name">{{ conv.name }}</div>
                  <div class="conversation-time">{{ conv.lastMessageTime }}</div>
                </div>
                <div class="conversation-preview">
                  <span v-if="conv.unreadCount > 0" class="unread-indicator">
                    {{ conv.unreadCount }}
                  </span>
                  <span class="preview-text">{{ conv.lastMessage }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="quick-contacts">
            <h4>Quick Start</h4>
            <button @click="simulateIncomingMessage" class="quick-btn">
              💬 Simulate Incoming
            </button>
          </div>
        </aside>

        <!-- Chat Area -->
        <main class="chat-area">
          <div v-if="currentConversation" class="chat-container">
            <!-- Chat Header -->
            <div class="chat-header">
              <div class="chat-info">
                <div class="chat-avatar">
                  {{ getInitials(currentConversation.name) }}
                </div>
                <div class="chat-details">
                  <div class="chat-name">{{ currentConversation.name }}</div>
                  <div class="chat-uri">{{ currentConversation.uri }}</div>
                </div>
              </div>
              <div class="chat-actions">
                <button @click="clearConversation" class="icon-btn">
                  🗑️
                </button>
              </div>
            </div>

            <!-- Messages -->
            <div class="messages-container" ref="messagesContainer">
              <div
                v-for="message in currentConversation.messages"
                :key="message.id"
                :class="['message', message.direction]"
              >
                <div class="message-bubble">
                  <div class="message-content">{{ message.content }}</div>
                  <div class="message-meta">
                    <span class="message-time">{{ message.timestamp }}</span>
                    <span v-if="message.direction === 'outbound'" class="message-status">
                      {{ getMessageStatusIcon(message.status) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Typing Indicator -->
              <div v-if="currentConversation.isTyping" class="typing-indicator">
                <div class="typing-bubble">
                  <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Message Input -->
            <div class="message-input-container">
              <textarea
                v-model="messageText"
                @keydown.enter.exact.prevent="sendMessage"
                @input="handleTyping"
                placeholder="Type a message..."
                rows="1"
                ref="messageInput"
              ></textarea>
              <button
                @click="sendMessage"
                :disabled="!messageText.trim()"
                class="send-btn"
              >
                ➤
              </button>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="empty-state">
            <div class="empty-icon">💬</div>
            <h3>No conversation selected</h3>
            <p>Select a conversation from the sidebar or start a new one</p>
          </div>
        </main>
      </div>
    </div>

    <!-- New Conversation Modal -->
    <div v-if="showNewConversation" class="modal-overlay" @click="showNewConversation = false">
      <div class="modal-content" @click.stop>
        <h3>New Conversation</h3>
        <div class="form-group">
          <label>Recipient SIP URI</label>
          <input
            v-model="newConversationUri"
            type="text"
            placeholder="sip:user@example.com"
            @keyup.enter="startNewConversation"
          />
        </div>
        <div class="modal-actions">
          <button @click="startNewConversation" :disabled="!newConversationUri.trim()">
            Start Chat
          </button>
          <button @click="showNewConversation = false" class="cancel-btn">
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Messaging Settings -->
    <div v-if="isConnected" class="settings-section">
      <h3>Messaging Settings</h3>
      <div class="settings-grid">
        <label>
          <input type="checkbox" v-model="sendTypingIndicator" />
          Send typing indicator
        </label>
        <label>
          <input type="checkbox" v-model="sendDeliveryReceipt" />
          Send delivery receipts
        </label>
        <label>
          <input type="checkbox" v-model="playNotificationSound" />
          Play notification sound
        </label>
        <label>
          <input type="checkbox" v-model="showNotifications" />
          Show desktop notifications
        </label>
      </div>
    </div>

    <!-- Message Statistics -->
    <div v-if="isConnected && messageStats.totalSent + messageStats.totalReceived > 0" class="stats-section">
      <h3>Message Statistics</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ messageStats.totalSent }}</div>
          <div class="stat-label">Messages Sent</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ messageStats.totalReceived }}</div>
          <div class="stat-label">Messages Received</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ conversations.length }}</div>
          <div class="stat-label">Conversations</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ messageStats.failedMessages }}</div>
          <div class="stat-label">Failed</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useSipClient } from '../../src/composables/useSipClient'

// SIP Configuration
const sipServerUri = ref('sip:example.com')
const username = ref('')
const password = ref('')

// SIP Client
const { sipClient, connectionState, isConnected, isConnecting, connect, disconnect } =
  useSipClient()

// Message State
interface Message {
  id: string
  content: string
  direction: 'inbound' | 'outbound'
  timestamp: string
  status: 'sending' | 'sent' | 'delivered' | 'failed'
}

interface Conversation {
  id: string
  name: string
  uri: string
  messages: Message[]
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  isTyping: boolean
}

const conversations = ref<Conversation[]>([])
const currentConversationId = ref<string | null>(null)
const messageText = ref('')
const showNewConversation = ref(false)
const newConversationUri = ref('')

// Settings
const sendTypingIndicator = ref(true)
const sendDeliveryReceipt = ref(true)
const playNotificationSound = ref(true)
const showNotifications = ref(true)

// Stats
const messageStats = ref({
  totalSent: 0,
  totalReceived: 0,
  failedMessages: 0,
})

// Refs
const messagesContainer = ref<HTMLDivElement | null>(null)
const messageInput = ref<HTMLTextAreaElement | null>(null)

// Typing state
let typingTimer: number | null = null

// Computed
const currentConversation = computed(() => {
  return conversations.value.find(c => c.id === currentConversationId.value)
})

const unreadCount = computed(() => {
  return conversations.value.reduce((sum, conv) => sum + conv.unreadCount, 0)
})

// Connection Toggle
const toggleConnection = async () => {
  if (isConnected.value) {
    await disconnect()
  } else {
    await connect({
      uri: sipServerUri.value,
      username: username.value,
      password: password.value,
    })
  }
}

// Select Conversation
const selectConversation = (convId: string) => {
  currentConversationId.value = convId

  // Mark as read
  const conv = conversations.value.find(c => c.id === convId)
  if (conv) {
    conv.unreadCount = 0
  }

  // Focus input
  nextTick(() => {
    messageInput.value?.focus()
    scrollToBottom()
  })
}

// Start New Conversation
const startNewConversation = () => {
  if (!newConversationUri.value.trim()) return

  const uri = newConversationUri.value.trim()

  // Check if conversation already exists
  const existing = conversations.value.find(c => c.uri === uri)
  if (existing) {
    currentConversationId.value = existing.id
    showNewConversation.value = false
    newConversationUri.value = ''
    return
  }

  // Create new conversation
  const convId = `conv-${Date.now()}`
  const name = uri.split('@')[0].replace('sip:', '')

  const newConv: Conversation = {
    id: convId,
    name,
    uri,
    messages: [],
    lastMessage: 'No messages yet',
    lastMessageTime: '',
    unreadCount: 0,
    isTyping: false,
  }

  conversations.value.unshift(newConv)
  currentConversationId.value = convId
  showNewConversation.value = false
  newConversationUri.value = ''

  nextTick(() => {
    messageInput.value?.focus()
  })
}

// Send Message
const sendMessage = async () => {
  if (!messageText.value.trim() || !currentConversation.value) return

  const message: Message = {
    id: `msg-${Date.now()}`,
    content: messageText.value.trim(),
    direction: 'outbound',
    timestamp: new Date().toLocaleTimeString(),
    status: 'sending',
  }

  currentConversation.value.messages.push(message)
  currentConversation.value.lastMessage = message.content
  currentConversation.value.lastMessageTime = message.timestamp

  messageStats.value.totalSent++

  messageText.value = ''

  scrollToBottom()

  // Simulate message sending
  setTimeout(() => {
    message.status = 'sent'

    if (sendDeliveryReceipt.value) {
      setTimeout(() => {
        message.status = 'delivered'
      }, 1000)
    }
  }, 500)

  console.log('Sent MESSAGE to:', currentConversation.value.uri, message.content)
}

// Handle Typing
const handleTyping = () => {
  if (!sendTypingIndicator.value || !currentConversation.value) return

  // Clear existing timer
  if (typingTimer) {
    clearTimeout(typingTimer)
  }

  // Send typing notification
  console.log('Sending typing indicator to:', currentConversation.value.uri)

  // Stop typing after 2 seconds of inactivity
  typingTimer = window.setTimeout(() => {
    console.log('Stopped typing')
  }, 2000)
}

// Receive Message
const receiveMessage = (fromUri: string, content: string) => {
  // Find or create conversation
  let conv = conversations.value.find(c => c.uri === fromUri)

  if (!conv) {
    const convId = `conv-${Date.now()}`
    const name = fromUri.split('@')[0].replace('sip:', '')

    conv = {
      id: convId,
      name,
      uri: fromUri,
      messages: [],
      lastMessage: '',
      lastMessageTime: '',
      unreadCount: 0,
      isTyping: false,
    }

    conversations.value.unshift(conv)
  }

  const message: Message = {
    id: `msg-${Date.now()}`,
    content,
    direction: 'inbound',
    timestamp: new Date().toLocaleTimeString(),
    status: 'delivered',
  }

  conv.messages.push(message)
  conv.lastMessage = content
  conv.lastMessageTime = message.timestamp

  // Increment unread if not current conversation
  if (currentConversationId.value !== conv.id) {
    conv.unreadCount++
  }

  messageStats.value.totalReceived++

  // Play notification
  if (playNotificationSound.value) {
    console.log('Playing notification sound')
  }

  // Show desktop notification
  if (showNotifications.value && currentConversationId.value !== conv.id) {
    showDesktopNotification(conv.name, content)
  }

  // Scroll to bottom if current conversation
  if (currentConversationId.value === conv.id) {
    nextTick(() => scrollToBottom())
  }
}

// Clear Conversation
const clearConversation = () => {
  if (!currentConversation.value) return

  if (confirm(`Clear all messages in this conversation?`)) {
    currentConversation.value.messages = []
    currentConversation.value.lastMessage = 'No messages yet'
    currentConversation.value.lastMessageTime = ''
  }
}

// Simulate Incoming Message
const simulateIncomingMessage = () => {
  const messages = [
    'Hey, how are you?',
    'Got a minute to talk?',
    'Check out this link!',
    'Thanks for your help earlier',
    'Are you available for a call?',
  ]

  const randomMessage = messages[Math.floor(Math.random() * messages.length)]
  const fromUri = `sip:user${Math.floor(Math.random() * 100)}@example.com`

  receiveMessage(fromUri, randomMessage)

  // Simulate typing indicator
  const conv = conversations.value.find(c => c.uri === fromUri)
  if (conv && Math.random() > 0.5) {
    conv.isTyping = true
    setTimeout(() => {
      conv.isTyping = false

      // Send another message
      setTimeout(() => {
        const followUp = 'Let me know when you\'re free!'
        receiveMessage(fromUri, followUp)
      }, 1500)
    }, 2000)
  }
}

// Desktop Notification
const showDesktopNotification = (title: string, body: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
    })
  }
}

// Request notification permission
const requestNotificationPermission = () => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

// Helpers
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const getMessageStatusIcon = (status: string): string => {
  switch (status) {
    case 'sending': return '○'
    case 'sent': return '✓'
    case 'delivered': return '✓✓'
    case 'failed': return '✗'
    default: return ''
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Lifecycle
onMounted(() => {
  requestNotificationPermission()
})
</script>

<style scoped>
.sip-messaging-demo {
  max-width: 1400px;
  margin: 0 auto;
}

.description {
  color: #666;
  margin-bottom: 2rem;
}

.status-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.status-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.875rem;
}

.status-badge.connected {
  background-color: #10b981;
  color: white;
}

.status-badge.disconnected {
  background-color: #6b7280;
  color: white;
}

.status-badge.connecting {
  background-color: #f59e0b;
  color: white;
}

.unread-badge {
  background: #ef4444;
  color: white;
  padding: 0.375rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
}

.config-section,
.settings-section,
.stats-section {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.125rem;
}

h4 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  text-transform: uppercase;
  color: #6b7280;
  letter-spacing: 0.05em;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

button {
  padding: 0.625rem 1.25rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover:not(:disabled) {
  background-color: #2563eb;
}

button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.messaging-container {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.messaging-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  height: 600px;
}

/* Sidebar */
.conversations-sidebar {
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  background: white;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1rem;
}

.new-chat-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 50%;
  font-size: 1.25rem;
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #f3f4f6;
}

.conversation-item:hover {
  background: #f9fafb;
}

.conversation-item.active {
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
}

.conversation-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.conversation-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: #111827;
}

.conversation-time {
  font-size: 0.75rem;
  color: #9ca3af;
}

.conversation-preview {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.875rem;
}

.unread-indicator {
  background: #3b82f6;
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.preview-text {
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-contacts {
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
}

.quick-btn {
  width: 100%;
  font-size: 0.75rem;
}

/* Chat Area */
.chat-area {
  background: white;
  display: flex;
  flex-direction: column;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.chat-info {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.chat-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
}

.chat-name {
  font-weight: 600;
  font-size: 0.875rem;
}

.chat-uri {
  font-size: 0.75rem;
  color: #6b7280;
}

.chat-actions {
  display: flex;
  gap: 0.5rem;
}

.icon-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  font-size: 1rem;
  background: transparent;
  color: #6b7280;
}

.icon-btn:hover {
  background: #f3f4f6;
  color: #111827;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.message {
  display: flex;
}

.message.outbound {
  justify-content: flex-end;
}

.message.inbound {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 70%;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  word-wrap: break-word;
}

.message.outbound .message-bubble {
  background: #3b82f6;
  color: white;
  border-bottom-right-radius: 4px;
}

.message.inbound .message-bubble {
  background: #f3f4f6;
  color: #111827;
  border-bottom-left-radius: 4px;
}

.message-content {
  margin-bottom: 0.25rem;
  line-height: 1.5;
}

.message-meta {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  font-size: 0.75rem;
  opacity: 0.8;
}

.message.inbound .message-meta {
  justify-content: flex-start;
}

.typing-indicator {
  display: flex;
}

.typing-bubble {
  background: #f3f4f6;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  border-bottom-left-radius: 4px;
}

.typing-dots {
  display: flex;
  gap: 0.25rem;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9ca3af;
  animation: typing 1.4s ease-in-out infinite;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-4px);
  }
}

.message-input-container {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
}

.message-input-container textarea {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  resize: none;
  font-family: inherit;
  font-size: 0.875rem;
  max-height: 120px;
}

.send-btn {
  width: 48px;
  height: 48px;
  padding: 0;
  border-radius: 50%;
  font-size: 1.25rem;
  background: #3b82f6;
}

.send-btn:hover:not(:disabled) {
  background: #2563eb;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: #6b7280;
}

.empty-state p {
  margin: 0;
  font-size: 0.875rem;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  min-width: 400px;
  max-width: 90vw;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.cancel-btn {
  background: #6b7280;
}

.cancel-btn:hover {
  background: #4b5563;
}

/* Settings */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.settings-grid label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.settings-grid input[type="checkbox"] {
  width: auto;
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Responsive */
@media (max-width: 768px) {
  .messaging-layout {
    grid-template-columns: 1fr;
  }

  .conversations-sidebar {
    display: none;
  }
}
</style>
