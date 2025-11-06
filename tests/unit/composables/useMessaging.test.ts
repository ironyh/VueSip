/**
 * Tests for useMessaging composable
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import { useMessaging } from '@/composables/useMessaging'
import {
  MessageStatus,
  MessageDirection,
  MessageContentType,
  type Message,
} from '@/types/messaging.types'
import type { SipClient } from '@/core/SipClient'
import { MESSAGING_CONSTANTS } from '@/composables/constants'

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('useMessaging', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSipClient: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let incomingMessageHandler: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let composingIndicatorHandler: any

  beforeEach(() => {
    vi.useFakeTimers()

    incomingMessageHandler = null
    composingIndicatorHandler = null

    // Mock SIP client with messaging methods
    mockSipClient = {
      sendMessage: vi.fn().mockResolvedValue(undefined),
      getConfig: vi.fn().mockReturnValue({ uri: 'sip:self@example.com' }),
      onIncomingMessage: vi.fn((handler) => {
        incomingMessageHandler = handler
      }),
      onComposingIndicator: vi.fn((handler) => {
        composingIndicatorHandler = handler
      }),
    }
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // Helper to create a mock message
  const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
    id: `msg-${Date.now()}-${Math.random()}`,
    direction: MessageDirection.Incoming,
    from: 'sip:alice@example.com',
    to: 'sip:self@example.com',
    content: 'Test message',
    contentType: MessageContentType.Text,
    status: MessageStatus.Delivered,
    timestamp: new Date(),
    isRead: false,
    ...overrides,
  })

  // ==========================================================================
  // Initialization and Default State
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { messages, conversations, unreadCount, composingIndicators } =
        useMessaging(sipClientRef)

      expect(messages.value).toEqual([])
      expect(conversations.value.size).toBe(0)
      expect(unreadCount.value).toBe(0)
      expect(composingIndicators.value.size).toBe(0)
    })

    it('should setup incoming message handler when SIP client provided', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      useMessaging(sipClientRef)

      expect(mockSipClient.onIncomingMessage).toHaveBeenCalled()
      expect(mockSipClient.onComposingIndicator).toHaveBeenCalled()
    })

    it('should handle null SIP client gracefully', () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { messages, unreadCount } = useMessaging(sipClientRef)

      expect(messages.value).toEqual([])
      expect(unreadCount.value).toBe(0)
    })
  })

  // ==========================================================================
  // sendMessage() Method
  // ==========================================================================

  describe('sendMessage() method', () => {
    it('should send a message successfully', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { sendMessage, messages } = useMessaging(sipClientRef)

      const messageId = await sendMessage('sip:bob@example.com', 'Hello!')

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:bob@example.com',
        'Hello!',
        expect.objectContaining({
          contentType: MessageContentType.Text,
        })
      )
      expect(messageId).toBeTruthy()
      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].content).toBe('Hello!')
      expect(messages.value[0].status).toBe(MessageStatus.Sent)
      expect(messages.value[0].direction).toBe(MessageDirection.Outgoing)
    })

    it('should send message with custom content type', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { sendMessage } = useMessaging(sipClientRef)

      await sendMessage('sip:bob@example.com', '{"data":"test"}', {
        contentType: MessageContentType.JSON,
      })

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:bob@example.com',
        '{"data":"test"}',
        expect.objectContaining({
          contentType: MessageContentType.JSON,
        })
      )
    })

    it('should send message with extra headers', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { sendMessage } = useMessaging(sipClientRef)

      await sendMessage('sip:bob@example.com', 'Hello!', {
        extraHeaders: ['X-Custom: value'],
      })

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:bob@example.com',
        'Hello!',
        expect.objectContaining({
          extraHeaders: ['X-Custom: value'],
        })
      )
    })

    it('should send message with delivery notification request', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { sendMessage } = useMessaging(sipClientRef)

      await sendMessage('sip:bob@example.com', 'Hello!', {
        requestDeliveryNotification: true,
      })

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:bob@example.com',
        'Hello!',
        expect.objectContaining({
          extraHeaders: expect.arrayContaining(['Disposition-Notification: delivery']),
        })
      )
    })

    it('should send message with read notification request', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { sendMessage } = useMessaging(sipClientRef)

      await sendMessage('sip:bob@example.com', 'Hello!', {
        requestReadNotification: true,
      })

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:bob@example.com',
        'Hello!',
        expect.objectContaining({
          extraHeaders: expect.arrayContaining(['Disposition-Notification: display']),
        })
      )
    })

    it('should mark outgoing messages as read', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { sendMessage, messages } = useMessaging(sipClientRef)

      await sendMessage('sip:bob@example.com', 'Hello!')

      expect(messages.value[0].isRead).toBe(true)
    })

    it('should throw error when SIP client is not initialized', async () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { sendMessage } = useMessaging(sipClientRef)

      await expect(sendMessage('sip:bob@example.com', 'Hello!')).rejects.toThrow(
        'SIP client not initialized'
      )
    })

    it('should handle send failure and update message status', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      mockSipClient.sendMessage.mockRejectedValue(new Error('Network error'))
      const { sendMessage, messages } = useMessaging(sipClientRef)

      await expect(sendMessage('sip:bob@example.com', 'Hello!')).rejects.toThrow('Network error')

      expect(messages.value[0].status).toBe(MessageStatus.Failed)
    })

    it('should emit sent event on successful send', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { sendMessage, onMessagingEvent } = useMessaging(sipClientRef)

      const eventCallback = vi.fn()
      onMessagingEvent(eventCallback)

      await sendMessage('sip:bob@example.com', 'Hello!')

      expect(eventCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sent',
          message: expect.objectContaining({
            content: 'Hello!',
          }),
        })
      )
    })

    it('should emit failed event on send failure', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      mockSipClient.sendMessage.mockRejectedValue(new Error('Send failed'))
      const { sendMessage, onMessagingEvent } = useMessaging(sipClientRef)

      const eventCallback = vi.fn()
      onMessagingEvent(eventCallback)

      await sendMessage('sip:bob@example.com', 'Hello!').catch(() => {})

      expect(eventCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'failed',
          error: 'Send failed',
        })
      )
    })
  })

  // ==========================================================================
  // markAsRead() Method
  // ==========================================================================

  describe('markAsRead() method', () => {
    it('should mark message as read', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, markAsRead } = useMessaging(sipClientRef)

      // Add a message manually
      const message = createMockMessage({ isRead: false })
      messages.value.push(message)

      markAsRead(message.id)

      expect(message.isRead).toBe(true)
      expect(message.readAt).toBeInstanceOf(Date)
      expect(message.status).toBe(MessageStatus.Read)
    })

    it('should handle marking already-read message', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, markAsRead } = useMessaging(sipClientRef)

      const message = createMockMessage({ isRead: true })
      messages.value.push(message)
      const readAt = message.readAt

      markAsRead(message.id)

      // Should remain unchanged
      expect(message.readAt).toBe(readAt)
    })

    it('should handle non-existent message ID', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { markAsRead } = useMessaging(sipClientRef)

      // Should not throw
      expect(() => markAsRead('non-existent')).not.toThrow()
    })

    it('should emit read event when message is marked as read', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, markAsRead, onMessagingEvent } = useMessaging(sipClientRef)

      const eventCallback = vi.fn()
      onMessagingEvent(eventCallback)

      const message = createMockMessage({ isRead: false })
      messages.value.push(message)

      markAsRead(message.id)

      expect(eventCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'read',
          message: expect.objectContaining({ id: message.id }),
        })
      )
    })
  })

  // ==========================================================================
  // markAllAsRead() Method
  // ==========================================================================

  describe('markAllAsRead() method', () => {
    it('should mark all unread messages as read', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, markAllAsRead } = useMessaging(sipClientRef)

      messages.value.push(
        createMockMessage({ id: 'msg1', isRead: false }),
        createMockMessage({ id: 'msg2', isRead: false }),
        createMockMessage({ id: 'msg3', isRead: true })
      )

      markAllAsRead()

      expect(messages.value.filter((m) => !m.isRead)).toHaveLength(0)
      expect(messages.value[0].isRead).toBe(true)
      expect(messages.value[1].isRead).toBe(true)
    })

    it('should mark all messages from specific URI as read', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, markAllAsRead } = useMessaging(sipClientRef)

      messages.value.push(
        createMockMessage({ from: 'sip:alice@example.com', isRead: false }),
        createMockMessage({ from: 'sip:bob@example.com', isRead: false }),
        createMockMessage({ from: 'sip:alice@example.com', isRead: false })
      )

      markAllAsRead('sip:alice@example.com')

      const aliceMessages = messages.value.filter((m) => m.from === 'sip:alice@example.com')
      const bobMessages = messages.value.filter((m) => m.from === 'sip:bob@example.com')

      expect(aliceMessages.every((m) => m.isRead)).toBe(true)
      expect(bobMessages.some((m) => !m.isRead)).toBe(true)
    })

    it('should handle no unread messages', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, markAllAsRead } = useMessaging(sipClientRef)

      messages.value.push(createMockMessage({ isRead: true }), createMockMessage({ isRead: true }))

      expect(() => markAllAsRead()).not.toThrow()
    })
  })

  // ==========================================================================
  // deleteMessage() Method
  // ==========================================================================

  describe('deleteMessage() method', () => {
    it('should delete a message', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, deleteMessage } = useMessaging(sipClientRef)

      const message = createMockMessage({ id: 'msg-to-delete' })
      messages.value.push(message, createMockMessage({ id: 'msg-keep' }))

      deleteMessage('msg-to-delete')

      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].id).toBe('msg-keep')
    })

    it('should handle deleting non-existent message', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, deleteMessage } = useMessaging(sipClientRef)

      messages.value.push(createMockMessage())

      expect(() => deleteMessage('non-existent')).not.toThrow()
      expect(messages.value).toHaveLength(1)
    })
  })

  // ==========================================================================
  // clearMessages() Method
  // ==========================================================================

  describe('clearMessages() method', () => {
    it('should clear all messages when no URI provided', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, clearMessages } = useMessaging(sipClientRef)

      messages.value.push(
        createMockMessage({ from: 'sip:alice@example.com' }),
        createMockMessage({ from: 'sip:bob@example.com' }),
        createMockMessage({ from: 'sip:charlie@example.com' })
      )

      clearMessages()

      expect(messages.value).toHaveLength(0)
    })

    it('should clear messages from specific URI', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, clearMessages } = useMessaging(sipClientRef)

      messages.value.push(
        createMockMessage({ from: 'sip:alice@example.com', to: 'sip:self@example.com' }),
        createMockMessage({ from: 'sip:self@example.com', to: 'sip:alice@example.com' }),
        createMockMessage({ from: 'sip:bob@example.com', to: 'sip:self@example.com' })
      )

      clearMessages('sip:alice@example.com')

      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].from).toBe('sip:bob@example.com')
    })

    it('should clear messages to specific URI', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, clearMessages } = useMessaging(sipClientRef)

      messages.value.push(
        createMockMessage({ from: 'sip:self@example.com', to: 'sip:alice@example.com' }),
        createMockMessage({ from: 'sip:self@example.com', to: 'sip:bob@example.com' })
      )

      clearMessages('sip:alice@example.com')

      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].to).toBe('sip:bob@example.com')
    })
  })

  // ==========================================================================
  // getMessagesForUri() Method
  // ==========================================================================

  describe('getMessagesForUri() method', () => {
    it('should get messages for specific URI', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, getMessagesForUri } = useMessaging(sipClientRef)

      messages.value.push(
        createMockMessage({ from: 'sip:alice@example.com', timestamp: new Date('2024-01-01') }),
        createMockMessage({ from: 'sip:bob@example.com', timestamp: new Date('2024-01-02') }),
        createMockMessage({ to: 'sip:alice@example.com', timestamp: new Date('2024-01-03') })
      )

      const result = getMessagesForUri('sip:alice@example.com')

      expect(result).toHaveLength(2)
      expect(
        result.every((m) => m.from === 'sip:alice@example.com' || m.to === 'sip:alice@example.com')
      ).toBe(true)
    })

    it('should sort messages by timestamp', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, getMessagesForUri } = useMessaging(sipClientRef)

      const msg1 = createMockMessage({
        from: 'sip:alice@example.com',
        timestamp: new Date('2024-01-03'),
      })
      const msg2 = createMockMessage({
        from: 'sip:alice@example.com',
        timestamp: new Date('2024-01-01'),
      })
      const msg3 = createMockMessage({
        from: 'sip:alice@example.com',
        timestamp: new Date('2024-01-02'),
      })

      messages.value.push(msg1, msg2, msg3)

      const result = getMessagesForUri('sip:alice@example.com')

      expect(result[0]).toStrictEqual(msg2) // Earliest
      expect(result[1]).toStrictEqual(msg3)
      expect(result[2]).toStrictEqual(msg1) // Latest
    })

    it('should return empty array for URI with no messages', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { getMessagesForUri } = useMessaging(sipClientRef)

      const result = getMessagesForUri('sip:nonexistent@example.com')

      expect(result).toEqual([])
    })
  })

  // ==========================================================================
  // getFilteredMessages() Method
  // ==========================================================================

  describe('getFilteredMessages() method', () => {
    it('should filter messages by URI', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, getFilteredMessages } = useMessaging(sipClientRef)

      messages.value.push(
        createMockMessage({ from: 'sip:alice@example.com' }),
        createMockMessage({ from: 'sip:bob@example.com' })
      )

      const result = getFilteredMessages({ uri: 'sip:alice@example.com' })

      expect(result).toHaveLength(1)
      expect(result[0].from).toBe('sip:alice@example.com')
    })

    it('should filter messages by direction', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, getFilteredMessages } = useMessaging(sipClientRef)

      messages.value.push(
        createMockMessage({ direction: MessageDirection.Incoming }),
        createMockMessage({ direction: MessageDirection.Outgoing })
      )

      const result = getFilteredMessages({ direction: MessageDirection.Incoming })

      expect(result).toHaveLength(1)
      expect(result[0].direction).toBe(MessageDirection.Incoming)
    })

    it('should filter messages by status', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, getFilteredMessages } = useMessaging(sipClientRef)

      messages.value.push(
        createMockMessage({ status: MessageStatus.Delivered }),
        createMockMessage({ status: MessageStatus.Read }),
        createMockMessage({ status: MessageStatus.Failed })
      )

      const result = getFilteredMessages({ status: MessageStatus.Read })

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe(MessageStatus.Read)
    })

    it('should filter messages by content type', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, getFilteredMessages } = useMessaging(sipClientRef)

      messages.value.push(
        createMockMessage({ contentType: MessageContentType.Text }),
        createMockMessage({ contentType: MessageContentType.JSON })
      )

      const result = getFilteredMessages({ contentType: MessageContentType.JSON })

      expect(result).toHaveLength(1)
      expect(result[0].contentType).toBe(MessageContentType.JSON)
    })

    it('should filter messages by date range (from)', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, getFilteredMessages } = useMessaging(sipClientRef)

      messages.value.push(
        createMockMessage({ timestamp: new Date('2024-01-01') }),
        createMockMessage({ timestamp: new Date('2024-01-15') }),
        createMockMessage({ timestamp: new Date('2024-01-31') })
      )

      const result = getFilteredMessages({ dateFrom: new Date('2024-01-15') })

      expect(result).toHaveLength(2)
    })

    it('should filter messages by date range (to)', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, getFilteredMessages } = useMessaging(sipClientRef)

      messages.value.push(
        createMockMessage({ timestamp: new Date('2024-01-01') }),
        createMockMessage({ timestamp: new Date('2024-01-15') }),
        createMockMessage({ timestamp: new Date('2024-01-31') })
      )

      const result = getFilteredMessages({ dateTo: new Date('2024-01-15') })

      expect(result).toHaveLength(2)
    })

    it('should filter messages by search query', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, getFilteredMessages } = useMessaging(sipClientRef)

      messages.value.push(
        createMockMessage({ content: 'Hello World' }),
        createMockMessage({ content: 'Goodbye' }),
        createMockMessage({ content: 'hello there' })
      )

      const result = getFilteredMessages({ searchQuery: 'hello' })

      expect(result).toHaveLength(2)
      expect(result.every((m) => m.content.toLowerCase().includes('hello'))).toBe(true)
    })

    it('should combine multiple filters', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, getFilteredMessages } = useMessaging(sipClientRef)

      messages.value.push(
        createMockMessage({
          from: 'sip:alice@example.com',
          direction: MessageDirection.Incoming,
          content: 'Hello',
        }),
        createMockMessage({
          from: 'sip:alice@example.com',
          direction: MessageDirection.Incoming,
          content: 'Goodbye',
        }),
        createMockMessage({
          from: 'sip:bob@example.com',
          direction: MessageDirection.Incoming,
          content: 'Hello',
        })
      )

      const result = getFilteredMessages({
        uri: 'sip:alice@example.com',
        direction: MessageDirection.Incoming,
        searchQuery: 'hello',
      })

      expect(result).toHaveLength(1)
      expect(result[0].from).toBe('sip:alice@example.com')
      expect(result[0].content).toBe('Hello')
    })
  })

  // ==========================================================================
  // sendComposingIndicator() Method
  // ==========================================================================

  describe('sendComposingIndicator() method', () => {
    it('should send composing indicator', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { sendComposingIndicator } = useMessaging(sipClientRef)

      await sendComposingIndicator('sip:bob@example.com', true)

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:bob@example.com',
        'composing',
        expect.objectContaining({
          contentType: MessageContentType.Text,
          extraHeaders: ['Content-Disposition: notification'],
        })
      )
    })

    it('should send idle indicator', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { sendComposingIndicator } = useMessaging(sipClientRef)

      await sendComposingIndicator('sip:bob@example.com', false)

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:bob@example.com',
        'idle',
        expect.any(Object)
      )
    })

    it('should throw error when SIP client is not initialized', async () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { sendComposingIndicator } = useMessaging(sipClientRef)

      await expect(sendComposingIndicator('sip:bob@example.com', true)).rejects.toThrow(
        'SIP client not initialized'
      )
    })

    it('should not throw on composing indicator failure', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      mockSipClient.sendMessage.mockRejectedValue(new Error('Failed'))
      const { sendComposingIndicator } = useMessaging(sipClientRef)

      // Should not throw
      await expect(sendComposingIndicator('sip:bob@example.com', true)).resolves.toBeUndefined()
    })
  })

  // ==========================================================================
  // Incoming Messages
  // ==========================================================================

  describe('Incoming Messages', () => {
    it('should handle incoming message', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages } = useMessaging(sipClientRef)

      // Simulate incoming message
      incomingMessageHandler('sip:alice@example.com', 'Hello!')

      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].from).toBe('sip:alice@example.com')
      expect(messages.value[0].content).toBe('Hello!')
      expect(messages.value[0].direction).toBe(MessageDirection.Incoming)
      expect(messages.value[0].status).toBe(MessageStatus.Delivered)
      expect(messages.value[0].isRead).toBe(false)
    })

    it('should handle incoming message with custom content type', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages } = useMessaging(sipClientRef)

      incomingMessageHandler('sip:alice@example.com', '{"data":"test"}', MessageContentType.JSON)

      expect(messages.value[0].contentType).toBe(MessageContentType.JSON)
    })

    it('should emit received event for incoming message', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { onMessagingEvent } = useMessaging(sipClientRef)

      const eventCallback = vi.fn()
      onMessagingEvent(eventCallback)

      incomingMessageHandler('sip:alice@example.com', 'Hello!')

      expect(eventCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'received',
          message: expect.objectContaining({
            content: 'Hello!',
          }),
        })
      )
    })
  })

  // ==========================================================================
  // Composing Indicators
  // ==========================================================================

  describe('Composing Indicators', () => {
    it('should handle composing indicator', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { composingIndicators } = useMessaging(sipClientRef)

      composingIndicatorHandler('sip:alice@example.com', true)

      const indicator = composingIndicators.value.get('sip:alice@example.com')
      expect(indicator).toBeDefined()
      expect(indicator?.isComposing).toBe(true)
      expect(indicator?.uri).toBe('sip:alice@example.com')
    })

    it('should auto-clear composing indicator after timeout', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { composingIndicators } = useMessaging(sipClientRef)

      composingIndicatorHandler('sip:alice@example.com', true)

      const indicator = composingIndicators.value.get('sip:alice@example.com')
      expect(indicator?.isComposing).toBe(true)

      // Advance time past timeout
      await vi.advanceTimersByTimeAsync(MESSAGING_CONSTANTS.COMPOSING_IDLE_TIMEOUT)

      expect(indicator?.isComposing).toBe(false)
    })

    it('should clear existing timeout when new composing indicator received', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { composingIndicators } = useMessaging(sipClientRef)

      composingIndicatorHandler('sip:alice@example.com', true)

      // Send another composing before timeout
      await vi.advanceTimersByTimeAsync(MESSAGING_CONSTANTS.COMPOSING_IDLE_TIMEOUT / 2)
      composingIndicatorHandler('sip:alice@example.com', true)

      // Advance to what would have been the first timeout
      await vi.advanceTimersByTimeAsync(MESSAGING_CONSTANTS.COMPOSING_IDLE_TIMEOUT / 2)

      // Should still be composing (timeout was reset)
      const indicator = composingIndicators.value.get('sip:alice@example.com')
      expect(indicator?.isComposing).toBe(true)
    })

    it('should handle idle composing indicator', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { composingIndicators } = useMessaging(sipClientRef)

      composingIndicatorHandler('sip:alice@example.com', true)
      composingIndicatorHandler('sip:alice@example.com', false)

      const indicator = composingIndicators.value.get('sip:alice@example.com')
      expect(indicator?.isComposing).toBe(false)
    })
  })

  // ==========================================================================
  // Computed: conversations
  // ==========================================================================

  describe('conversations computed', () => {
    it('should group messages by peer URI', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, conversations } = useMessaging(sipClientRef)

      messages.value.push(
        createMockMessage({ from: 'sip:alice@example.com', direction: MessageDirection.Incoming }),
        createMockMessage({ to: 'sip:alice@example.com', direction: MessageDirection.Outgoing }),
        createMockMessage({ from: 'sip:bob@example.com', direction: MessageDirection.Incoming })
      )

      expect(conversations.value.size).toBe(2)
      expect(conversations.value.get('sip:alice@example.com')).toBeDefined()
      expect(conversations.value.get('sip:bob@example.com')).toBeDefined()
    })

    it('should calculate unread count per conversation', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, conversations } = useMessaging(sipClientRef)

      messages.value.push(
        createMockMessage({ from: 'sip:alice@example.com', isRead: false }),
        createMockMessage({ from: 'sip:alice@example.com', isRead: false }),
        createMockMessage({ from: 'sip:alice@example.com', isRead: true }),
        createMockMessage({
          to: 'sip:alice@example.com',
          direction: MessageDirection.Outgoing,
          isRead: true,
        })
      )

      const conv = conversations.value.get('sip:alice@example.com')
      expect(conv?.unreadCount).toBe(2)
    })

    it('should set last message timestamp', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, conversations } = useMessaging(sipClientRef)

      const latestTimestamp = new Date('2024-01-03')
      messages.value.push(
        createMockMessage({ from: 'sip:alice@example.com', timestamp: new Date('2024-01-01') }),
        createMockMessage({ from: 'sip:alice@example.com', timestamp: latestTimestamp }),
        createMockMessage({ from: 'sip:alice@example.com', timestamp: new Date('2024-01-02') })
      )

      const conv = conversations.value.get('sip:alice@example.com')
      expect(conv?.lastMessageAt?.getTime()).toBe(latestTimestamp.getTime())
    })

    it('should sort messages within conversation by timestamp', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, conversations } = useMessaging(sipClientRef)

      const msg1 = createMockMessage({
        from: 'sip:alice@example.com',
        timestamp: new Date('2024-01-03'),
      })
      const msg2 = createMockMessage({
        from: 'sip:alice@example.com',
        timestamp: new Date('2024-01-01'),
      })
      const msg3 = createMockMessage({
        from: 'sip:alice@example.com',
        timestamp: new Date('2024-01-02'),
      })

      messages.value.push(msg1, msg2, msg3)

      const conv = conversations.value.get('sip:alice@example.com')
      expect(conv?.messages[0]).toStrictEqual(msg2)
      expect(conv?.messages[1]).toStrictEqual(msg3)
      expect(conv?.messages[2]).toStrictEqual(msg1)
    })

    it('should reflect composing indicator state', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, conversations } = useMessaging(sipClientRef)

      messages.value.push(createMockMessage({ from: 'sip:alice@example.com' }))

      composingIndicatorHandler('sip:alice@example.com', true)

      const conv = conversations.value.get('sip:alice@example.com')
      expect(conv?.isComposing).toBe(true)
    })
  })

  // ==========================================================================
  // Computed: unreadCount
  // ==========================================================================

  describe('unreadCount computed', () => {
    it('should count all unread incoming messages', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, unreadCount } = useMessaging(sipClientRef)

      messages.value.push(
        createMockMessage({ direction: MessageDirection.Incoming, isRead: false }),
        createMockMessage({ direction: MessageDirection.Incoming, isRead: false }),
        createMockMessage({ direction: MessageDirection.Incoming, isRead: true }),
        createMockMessage({ direction: MessageDirection.Outgoing, isRead: false })
      )

      expect(unreadCount.value).toBe(2)
    })

    it('should update when messages are marked as read', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { messages, unreadCount, markAsRead } = useMessaging(sipClientRef)

      const msg = createMockMessage({ direction: MessageDirection.Incoming, isRead: false })
      messages.value.push(msg)

      expect(unreadCount.value).toBe(1)

      markAsRead(msg.id)

      expect(unreadCount.value).toBe(0)
    })
  })

  // ==========================================================================
  // onMessagingEvent() Method
  // ==========================================================================

  describe('onMessagingEvent() method', () => {
    it('should register event listener', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { onMessagingEvent } = useMessaging(sipClientRef)

      const callback = vi.fn()
      const unsubscribe = onMessagingEvent(callback)

      incomingMessageHandler('sip:alice@example.com', 'Hello!')

      expect(callback).toHaveBeenCalled()
      expect(unsubscribe).toBeTypeOf('function')
    })

    it('should unregister event listener', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { onMessagingEvent } = useMessaging(sipClientRef)

      const callback = vi.fn()
      const unsubscribe = onMessagingEvent(callback)

      incomingMessageHandler('sip:alice@example.com', 'Hello!')
      expect(callback).toHaveBeenCalledTimes(1)

      callback.mockClear()
      unsubscribe()

      incomingMessageHandler('sip:bob@example.com', 'Hi!')
      expect(callback).not.toHaveBeenCalled()
    })

    it('should support multiple event listeners', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { onMessagingEvent } = useMessaging(sipClientRef)

      const callback1 = vi.fn()
      const callback2 = vi.fn()
      const callback3 = vi.fn()

      onMessagingEvent(callback1)
      onMessagingEvent(callback2)
      onMessagingEvent(callback3)

      incomingMessageHandler('sip:alice@example.com', 'Hello!')

      expect(callback1).toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
      expect(callback3).toHaveBeenCalled()
    })

    it('should handle errors in event listeners gracefully', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { onMessagingEvent } = useMessaging(sipClientRef)

      const faultyCallback = vi.fn().mockImplementation(() => {
        throw new Error('Listener error')
      })
      const normalCallback = vi.fn()

      onMessagingEvent(faultyCallback)
      onMessagingEvent(normalCallback)

      incomingMessageHandler('sip:alice@example.com', 'Hello!')

      expect(faultyCallback).toHaveBeenCalled()
      expect(normalCallback).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty message content', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { sendMessage } = useMessaging(sipClientRef)

      await sendMessage('sip:bob@example.com', '')

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:bob@example.com',
        '',
        expect.any(Object)
      )
    })

    it('should handle very long message content', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { sendMessage } = useMessaging(sipClientRef)

      const longContent = 'x'.repeat(10000)
      await sendMessage('sip:bob@example.com', longContent)

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:bob@example.com',
        longContent,
        expect.any(Object)
      )
    })

    it('should handle special characters in message content', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { sendMessage, messages } = useMessaging(sipClientRef)

      const specialContent = 'Hello 你好 👋 <script>alert("xss")</script>'
      await sendMessage('sip:bob@example.com', specialContent)

      expect(messages.value[0].content).toBe(specialContent)
    })

    it('should handle URIs with special characters', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { sendMessage } = useMessaging(sipClientRef)

      const complexUri = 'sip:user+tag@subdomain.example.com:5060;transport=tcp'
      await sendMessage(complexUri, 'Hello!')

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        complexUri,
        'Hello!',
        expect.any(Object)
      )
    })
  })
})
