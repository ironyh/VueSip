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
import { withSetup } from '../../utils/test-helpers'

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
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      expect(result.messages.value).toEqual([])
      expect(result.conversations.value.size).toBe(0)
      expect(result.unreadCount.value).toBe(0)
      expect(result.composingIndicators.value.size).toBe(0)

      unmount()
    })

    it('should setup incoming message handler when SIP client provided', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { unmount } = withSetup(() => useMessaging(sipClientRef))

      expect(mockSipClient.onIncomingMessage).toHaveBeenCalled()
      expect(mockSipClient.onComposingIndicator).toHaveBeenCalled()

      unmount()
    })

    it('should handle null SIP client gracefully', () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      expect(result.messages.value).toEqual([])
      expect(result.unreadCount.value).toBe(0)

      unmount()
    })
  })

  // ==========================================================================
  // sendMessage() Method
  // ==========================================================================

  describe('sendMessage() method', () => {
    it('should send a message successfully', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      const messageId = await result.sendMessage('sip:bob@example.com', 'Hello!')

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:bob@example.com',
        'Hello!',
        expect.objectContaining({
          contentType: MessageContentType.Text,
        })
      )
      expect(messageId).toBeTruthy()
      expect(result.messages.value).toHaveLength(1)
      expect(result.messages.value[0].content).toBe('Hello!')
      expect(result.messages.value[0].status).toBe(MessageStatus.Sent)
      expect(result.messages.value[0].direction).toBe(MessageDirection.Outgoing)

      unmount()
    })

    it('should send message with custom content type', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      await result.sendMessage('sip:bob@example.com', '{"data":"test"}', {
        contentType: MessageContentType.JSON,
      })

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:bob@example.com',
        '{"data":"test"}',
        expect.objectContaining({
          contentType: MessageContentType.JSON,
        })
      )

      unmount()
    })

    it('should send message with extra headers', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      await result.sendMessage('sip:bob@example.com', 'Hello!', {
        extraHeaders: ['X-Custom: value'],
      })

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:bob@example.com',
        'Hello!',
        expect.objectContaining({
          extraHeaders: ['X-Custom: value'],
        })
      )

      unmount()
    })

    it('should send message with delivery notification request', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      await result.sendMessage('sip:bob@example.com', 'Hello!', {
        requestDeliveryNotification: true,
      })

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:bob@example.com',
        'Hello!',
        expect.objectContaining({
          extraHeaders: expect.arrayContaining(['Disposition-Notification: delivery']),
        })
      )

      unmount()
    })

    it('should send message with read notification request', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      await result.sendMessage('sip:bob@example.com', 'Hello!', {
        requestReadNotification: true,
      })

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:bob@example.com',
        'Hello!',
        expect.objectContaining({
          extraHeaders: expect.arrayContaining(['Disposition-Notification: display']),
        })
      )

      unmount()
    })

    it('should mark outgoing messages as read', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      await result.sendMessage('sip:bob@example.com', 'Hello!')

      expect(result.messages.value[0].isRead).toBe(true)

      unmount()
    })

    it('should throw error when SIP client is not initialized', async () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      await expect(result.sendMessage('sip:bob@example.com', 'Hello!')).rejects.toThrow(
        'SIP client not initialized'
      )

      unmount()
    })

    it('should handle send failure and update message status', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      mockSipClient.sendMessage.mockRejectedValue(new Error('Network error'))
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      await expect(result.sendMessage('sip:bob@example.com', 'Hello!')).rejects.toThrow('Network error')

      expect(result.messages.value[0].status).toBe(MessageStatus.Failed)

      unmount()
    })

    it('should emit sent event on successful send', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      const eventCallback = vi.fn()
      result.onMessagingEvent(eventCallback)

      await result.sendMessage('sip:bob@example.com', 'Hello!')

      expect(eventCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sent',
          message: expect.objectContaining({
            content: 'Hello!',
          }),
        })
      )

      unmount()
    })

    it('should emit failed event on send failure', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      mockSipClient.sendMessage.mockRejectedValue(new Error('Send failed'))
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      const eventCallback = vi.fn()
      result.onMessagingEvent(eventCallback)

      await result.sendMessage('sip:bob@example.com', 'Hello!').catch(() => {})

      expect(eventCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'failed',
          error: 'Send failed',
        })
      )

      unmount()
    })
  })

  // ==========================================================================
  // markAsRead() Method
  // ==========================================================================

  describe('markAsRead() method', () => {
    it('should mark message as read', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      // Add a message manually
      const message = createMockMessage({ isRead: false })
      result.messages.value.push(message)

      result.markAsRead(message.id)

      expect(message.isRead).toBe(true)
      expect(message.readAt).toBeInstanceOf(Date)
      expect(message.status).toBe(MessageStatus.Read)

      unmount()
    })

    it('should handle marking already-read message', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      const message = createMockMessage({ isRead: true })
      result.messages.value.push(message)
      const readAt = message.readAt

      result.markAsRead(message.id)

      // Should remain unchanged
      expect(message.readAt).toBe(readAt)

      unmount()
    })

    it('should handle non-existent message ID', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      // Should not throw
      expect(() => result.markAsRead('non-existent')).not.toThrow()

      unmount()
    })

    it('should emit read event when message is marked as read', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      const eventCallback = vi.fn()
      result.onMessagingEvent(eventCallback)

      const message = createMockMessage({ isRead: false })
      result.messages.value.push(message)

      result.markAsRead(message.id)

      expect(eventCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'read',
          message: expect.objectContaining({ id: message.id }),
        })
      )

      unmount()
    })
  })

  // ==========================================================================
  // markAllAsRead() Method
  // ==========================================================================

  describe('markAllAsRead() method', () => {
    it('should mark all unread messages as read', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      result.messages.value.push(
        createMockMessage({ id: 'msg1', isRead: false }),
        createMockMessage({ id: 'msg2', isRead: false }),
        createMockMessage({ id: 'msg3', isRead: true })
      )

      result.markAllAsRead()

      expect(result.messages.value.filter((m) => !m.isRead)).toHaveLength(0)
      expect(result.messages.value[0].isRead).toBe(true)
      expect(result.messages.value[1].isRead).toBe(true)

      unmount()
    })

    it('should mark all messages from specific URI as read', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      result.messages.value.push(
        createMockMessage({ from: 'sip:alice@example.com', isRead: false }),
        createMockMessage({ from: 'sip:bob@example.com', isRead: false }),
        createMockMessage({ from: 'sip:alice@example.com', isRead: false })
      )

      result.markAllAsRead('sip:alice@example.com')

      const aliceMessages = result.messages.value.filter((m) => m.from === 'sip:alice@example.com')
      const bobMessages = result.messages.value.filter((m) => m.from === 'sip:bob@example.com')

      expect(aliceMessages.every((m) => m.isRead)).toBe(true)
      expect(bobMessages.some((m) => !m.isRead)).toBe(true)

      unmount()
    })

    it('should handle no unread messages', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      result.messages.value.push(createMockMessage({ isRead: true }), createMockMessage({ isRead: true }))

      expect(() => result.markAllAsRead()).not.toThrow()

      unmount()
    })
  })

  // ==========================================================================
  // deleteMessage() Method
  // ==========================================================================

  describe('deleteMessage() method', () => {
    it('should delete a message', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      const message = createMockMessage({ id: 'msg-to-delete' })
      result.messages.value.push(message, createMockMessage({ id: 'msg-keep' }))

      result.deleteMessage('msg-to-delete')

      expect(result.messages.value).toHaveLength(1)
      expect(result.messages.value[0].id).toBe('msg-keep')

      unmount()
    })

    it('should handle deleting non-existent message', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      result.messages.value.push(createMockMessage())

      expect(() => result.deleteMessage('non-existent')).not.toThrow()
      expect(result.messages.value).toHaveLength(1)

      unmount()
    })
  })

  // ==========================================================================
  // clearMessages() Method
  // ==========================================================================

  describe('clearMessages() method', () => {
    it('should clear all messages when no URI provided', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      result.messages.value.push(
        createMockMessage({ from: 'sip:alice@example.com' }),
        createMockMessage({ from: 'sip:bob@example.com' }),
        createMockMessage({ from: 'sip:charlie@example.com' })
      )

      result.clearMessages()

      expect(result.messages.value).toHaveLength(0)

      unmount()
    })

    it('should clear messages from specific URI', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      result.messages.value.push(
        createMockMessage({ from: 'sip:alice@example.com', to: 'sip:self@example.com' }),
        createMockMessage({ from: 'sip:self@example.com', to: 'sip:alice@example.com' }),
        createMockMessage({ from: 'sip:bob@example.com', to: 'sip:self@example.com' })
      )

      result.clearMessages('sip:alice@example.com')

      expect(result.messages.value).toHaveLength(1)
      expect(result.messages.value[0].from).toBe('sip:bob@example.com')

      unmount()
    })

    it('should clear messages to specific URI', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      result.messages.value.push(
        createMockMessage({ from: 'sip:self@example.com', to: 'sip:alice@example.com' }),
        createMockMessage({ from: 'sip:self@example.com', to: 'sip:bob@example.com' })
      )

      result.clearMessages('sip:alice@example.com')

      expect(result.messages.value).toHaveLength(1)
      expect(result.messages.value[0].to).toBe('sip:bob@example.com')

      unmount()
    })
  })

  // ==========================================================================
  // getMessagesForUri() Method
  // ==========================================================================

  describe('getMessagesForUri() method', () => {
    it('should get messages for specific URI', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      result.messages.value.push(
        createMockMessage({ from: 'sip:alice@example.com', timestamp: new Date('2024-01-01') }),
        createMockMessage({ from: 'sip:bob@example.com', timestamp: new Date('2024-01-02') }),
        createMockMessage({ to: 'sip:alice@example.com', timestamp: new Date('2024-01-03') })
      )

      const messages = result.getMessagesForUri('sip:alice@example.com')

      expect(messages).toHaveLength(2)
      expect(
        messages.every((m) => m.from === 'sip:alice@example.com' || m.to === 'sip:alice@example.com')
      ).toBe(true)

      unmount()
    })

    it('should sort messages by timestamp', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

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

      result.messages.value.push(msg1, msg2, msg3)

      const messages = result.getMessagesForUri('sip:alice@example.com')

      expect(messages[0]).toStrictEqual(msg2) // Earliest
      expect(messages[1]).toStrictEqual(msg3)
      expect(messages[2]).toStrictEqual(msg1) // Latest

      unmount()
    })

    it('should return empty array for URI with no messages', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      const messages = result.getMessagesForUri('sip:nonexistent@example.com')

      expect(messages).toEqual([])

      unmount()
    })
  })

  // ==========================================================================
  // getFilteredMessages() Method
  // ==========================================================================

  describe('getFilteredMessages() method', () => {
    it('should filter messages by URI', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      result.messages.value.push(
        createMockMessage({ from: 'sip:alice@example.com' }),
        createMockMessage({ from: 'sip:bob@example.com' })
      )

      const messages = result.getFilteredMessages({ uri: 'sip:alice@example.com' })

      expect(messages).toHaveLength(1)
      expect(messages[0].from).toBe('sip:alice@example.com')

      unmount()
    })

    it('should filter messages by direction', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      result.messages.value.push(
        createMockMessage({ direction: MessageDirection.Incoming }),
        createMockMessage({ direction: MessageDirection.Outgoing })
      )

      const messages = result.getFilteredMessages({ direction: MessageDirection.Incoming })

      expect(messages).toHaveLength(1)
      expect(messages[0].direction).toBe(MessageDirection.Incoming)

      unmount()
    })

    it('should filter messages by status', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      result.messages.value.push(
        createMockMessage({ status: MessageStatus.Delivered }),
        createMockMessage({ status: MessageStatus.Read }),
        createMockMessage({ status: MessageStatus.Failed })
      )

      const messages = result.getFilteredMessages({ status: MessageStatus.Read })

      expect(messages).toHaveLength(1)
      expect(messages[0].status).toBe(MessageStatus.Read)

      unmount()
    })

    it('should filter messages by content type', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      result.messages.value.push(
        createMockMessage({ contentType: MessageContentType.Text }),
        createMockMessage({ contentType: MessageContentType.JSON })
      )

      const messages = result.getFilteredMessages({ contentType: MessageContentType.JSON })

      expect(messages).toHaveLength(1)
      expect(messages[0].contentType).toBe(MessageContentType.JSON)

      unmount()
    })

    it('should filter messages by date range (from)', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      result.messages.value.push(
        createMockMessage({ timestamp: new Date('2024-01-01') }),
        createMockMessage({ timestamp: new Date('2024-01-15') }),
        createMockMessage({ timestamp: new Date('2024-01-31') })
      )

      const messages = result.getFilteredMessages({ dateFrom: new Date('2024-01-15') })

      expect(messages).toHaveLength(2)

      unmount()
    })

    it('should filter messages by date range (to)', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      result.messages.value.push(
        createMockMessage({ timestamp: new Date('2024-01-01') }),
        createMockMessage({ timestamp: new Date('2024-01-15') }),
        createMockMessage({ timestamp: new Date('2024-01-31') })
      )

      const messages = result.getFilteredMessages({ dateTo: new Date('2024-01-15') })

      expect(messages).toHaveLength(2)

      unmount()
    })

    it('should filter messages by search query', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      result.messages.value.push(
        createMockMessage({ content: 'Hello World' }),
        createMockMessage({ content: 'Goodbye' }),
        createMockMessage({ content: 'hello there' })
      )

      const messages = result.getFilteredMessages({ searchQuery: 'hello' })

      expect(messages).toHaveLength(2)
      expect(messages.every((m) => m.content.toLowerCase().includes('hello'))).toBe(true)

      unmount()
    })

    it('should combine multiple filters', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      result.messages.value.push(
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

      const messages = result.getFilteredMessages({
        uri: 'sip:alice@example.com',
        direction: MessageDirection.Incoming,
        searchQuery: 'hello',
      })

      expect(messages).toHaveLength(1)
      expect(messages[0].from).toBe('sip:alice@example.com')
      expect(messages[0].content).toBe('Hello')

      unmount()
    })
  })

  // ==========================================================================
  // sendComposingIndicator() Method
  // ==========================================================================

  describe('sendComposingIndicator() method', () => {
    it('should send composing indicator', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      await result.sendComposingIndicator('sip:bob@example.com', true)

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:bob@example.com',
        'composing',
        expect.objectContaining({
          contentType: MessageContentType.Text,
          extraHeaders: ['Content-Disposition: notification'],
        })
      )

      unmount()
    })

    it('should send idle indicator', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      await result.sendComposingIndicator('sip:bob@example.com', false)

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:bob@example.com',
        'idle',
        expect.any(Object)
      )

      unmount()
    })

    it('should throw error when SIP client is not initialized', async () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      await expect(result.sendComposingIndicator('sip:bob@example.com', true)).rejects.toThrow(
        'SIP client not initialized'
      )

      unmount()
    })

    it('should not throw on composing indicator failure', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      mockSipClient.sendMessage.mockRejectedValue(new Error('Failed'))
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      // Should not throw
      await expect(result.sendComposingIndicator('sip:bob@example.com', true)).resolves.toBeUndefined()

      unmount()
    })
  })

  // ==========================================================================
  // Incoming Messages
  // ==========================================================================

  describe('Incoming Messages', () => {
    it('should handle incoming message', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      // Simulate incoming message
      incomingMessageHandler('sip:alice@example.com', 'Hello!')

      expect(result.messages.value).toHaveLength(1)
      expect(result.messages.value[0].from).toBe('sip:alice@example.com')
      expect(result.messages.value[0].content).toBe('Hello!')
      expect(result.messages.value[0].direction).toBe(MessageDirection.Incoming)
      expect(result.messages.value[0].status).toBe(MessageStatus.Delivered)
      expect(result.messages.value[0].isRead).toBe(false)

      unmount()
    })

    it('should handle incoming message with custom content type', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      incomingMessageHandler('sip:alice@example.com', '{"data":"test"}', MessageContentType.JSON)

      expect(result.messages.value[0].contentType).toBe(MessageContentType.JSON)

      unmount()
    })

    it('should emit received event for incoming message', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      const eventCallback = vi.fn()
      result.onMessagingEvent(eventCallback)

      incomingMessageHandler('sip:alice@example.com', 'Hello!')

      expect(eventCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'received',
          message: expect.objectContaining({
            content: 'Hello!',
          }),
        })
      )

      unmount()
    })
  })

  // ==========================================================================
  // Composing Indicators
  // ==========================================================================

  describe('Composing Indicators', () => {
    it('should handle composing indicator', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      composingIndicatorHandler('sip:alice@example.com', true)

      const indicator = result.composingIndicators.value.get('sip:alice@example.com')
      expect(indicator).toBeDefined()
      expect(indicator?.isComposing).toBe(true)
      expect(indicator?.uri).toBe('sip:alice@example.com')

      unmount()
    })

    it('should auto-clear composing indicator after timeout', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      composingIndicatorHandler('sip:alice@example.com', true)

      const indicator = result.composingIndicators.value.get('sip:alice@example.com')
      expect(indicator?.isComposing).toBe(true)

      // Advance time past timeout
      await vi.advanceTimersByTimeAsync(MESSAGING_CONSTANTS.COMPOSING_IDLE_TIMEOUT)

      expect(indicator?.isComposing).toBe(false)

      unmount()
    })

    it('should clear existing timeout when new composing indicator received', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      composingIndicatorHandler('sip:alice@example.com', true)

      // Send another composing before timeout
      await vi.advanceTimersByTimeAsync(MESSAGING_CONSTANTS.COMPOSING_IDLE_TIMEOUT / 2)
      composingIndicatorHandler('sip:alice@example.com', true)

      // Advance to what would have been the first timeout
      await vi.advanceTimersByTimeAsync(MESSAGING_CONSTANTS.COMPOSING_IDLE_TIMEOUT / 2)

      // Should still be composing (timeout was reset)
      const indicator = result.composingIndicators.value.get('sip:alice@example.com')
      expect(indicator?.isComposing).toBe(true)

      unmount()
    })

    it('should handle idle composing indicator', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      composingIndicatorHandler('sip:alice@example.com', true)
      composingIndicatorHandler('sip:alice@example.com', false)

      const indicator = result.composingIndicators.value.get('sip:alice@example.com')
      expect(indicator?.isComposing).toBe(false)

      unmount()
    })
  })

  // ==========================================================================
  // Computed: conversations
  // ==========================================================================

  describe('conversations computed', () => {
    it('should group messages by peer URI', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      result.messages.value.push(
        createMockMessage({ from: 'sip:alice@example.com', direction: MessageDirection.Incoming }),
        createMockMessage({ to: 'sip:alice@example.com', direction: MessageDirection.Outgoing }),
        createMockMessage({ from: 'sip:bob@example.com', direction: MessageDirection.Incoming })
      )

      expect(result.conversations.value.size).toBe(2)
      expect(result.conversations.value.get('sip:alice@example.com')).toBeDefined()
      expect(result.conversations.value.get('sip:bob@example.com')).toBeDefined()

      unmount()
    })

    it('should calculate unread count per conversation', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      result.messages.value.push(
        createMockMessage({ from: 'sip:alice@example.com', isRead: false }),
        createMockMessage({ from: 'sip:alice@example.com', isRead: false }),
        createMockMessage({ from: 'sip:alice@example.com', isRead: true }),
        createMockMessage({
          to: 'sip:alice@example.com',
          direction: MessageDirection.Outgoing,
          isRead: true,
        })
      )

      const conv = result.conversations.value.get('sip:alice@example.com')
      expect(conv?.unreadCount).toBe(2)

      unmount()
    })

    it('should set last message timestamp', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      const latestTimestamp = new Date('2024-01-03')
      result.messages.value.push(
        createMockMessage({ from: 'sip:alice@example.com', timestamp: new Date('2024-01-01') }),
        createMockMessage({ from: 'sip:alice@example.com', timestamp: latestTimestamp }),
        createMockMessage({ from: 'sip:alice@example.com', timestamp: new Date('2024-01-02') })
      )

      const conv = result.conversations.value.get('sip:alice@example.com')
      expect(conv?.lastMessageAt?.getTime()).toBe(latestTimestamp.getTime())

      unmount()
    })

    it('should sort messages within conversation by timestamp', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

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

      result.messages.value.push(msg1, msg2, msg3)

      const conv = result.conversations.value.get('sip:alice@example.com')
      expect(conv?.messages[0]).toStrictEqual(msg2)
      expect(conv?.messages[1]).toStrictEqual(msg3)
      expect(conv?.messages[2]).toStrictEqual(msg1)

      unmount()
    })

    it('should reflect composing indicator state', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      result.messages.value.push(createMockMessage({ from: 'sip:alice@example.com' }))

      composingIndicatorHandler('sip:alice@example.com', true)

      const conv = result.conversations.value.get('sip:alice@example.com')
      expect(conv?.isComposing).toBe(true)

      unmount()
    })
  })

  // ==========================================================================
  // Computed: unreadCount
  // ==========================================================================

  describe('unreadCount computed', () => {
    it('should count all unread incoming messages', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      result.messages.value.push(
        createMockMessage({ direction: MessageDirection.Incoming, isRead: false }),
        createMockMessage({ direction: MessageDirection.Incoming, isRead: false }),
        createMockMessage({ direction: MessageDirection.Incoming, isRead: true }),
        createMockMessage({ direction: MessageDirection.Outgoing, isRead: false })
      )

      expect(result.unreadCount.value).toBe(2)

      unmount()
    })

    it('should update when messages are marked as read', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      const msg = createMockMessage({ direction: MessageDirection.Incoming, isRead: false })
      result.messages.value.push(msg)

      expect(result.unreadCount.value).toBe(1)

      result.markAsRead(msg.id)

      expect(result.unreadCount.value).toBe(0)

      unmount()
    })
  })

  // ==========================================================================
  // onMessagingEvent() Method
  // ==========================================================================

  describe('onMessagingEvent() method', () => {
    it('should register event listener', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      const callback = vi.fn()
      const unsubscribe = result.onMessagingEvent(callback)

      incomingMessageHandler('sip:alice@example.com', 'Hello!')

      expect(callback).toHaveBeenCalled()
      expect(unsubscribe).toBeTypeOf('function')

      unmount()
    })

    it('should unregister event listener', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      const callback = vi.fn()
      const unsubscribe = result.onMessagingEvent(callback)

      incomingMessageHandler('sip:alice@example.com', 'Hello!')
      expect(callback).toHaveBeenCalledTimes(1)

      callback.mockClear()
      unsubscribe()

      incomingMessageHandler('sip:bob@example.com', 'Hi!')
      expect(callback).not.toHaveBeenCalled()

      unmount()
    })

    it('should support multiple event listeners', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      const callback1 = vi.fn()
      const callback2 = vi.fn()
      const callback3 = vi.fn()

      result.onMessagingEvent(callback1)
      result.onMessagingEvent(callback2)
      result.onMessagingEvent(callback3)

      incomingMessageHandler('sip:alice@example.com', 'Hello!')

      expect(callback1).toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
      expect(callback3).toHaveBeenCalled()

      unmount()
    })

    it('should handle errors in event listeners gracefully', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      const faultyCallback = vi.fn().mockImplementation(() => {
        throw new Error('Listener error')
      })
      const normalCallback = vi.fn()

      result.onMessagingEvent(faultyCallback)
      result.onMessagingEvent(normalCallback)

      incomingMessageHandler('sip:alice@example.com', 'Hello!')

      expect(faultyCallback).toHaveBeenCalled()
      expect(normalCallback).toHaveBeenCalled()

      unmount()
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty message content', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      await result.sendMessage('sip:bob@example.com', '')

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:bob@example.com',
        '',
        expect.any(Object)
      )

      unmount()
    })

    it('should handle very long message content', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      const longContent = 'x'.repeat(10000)
      await result.sendMessage('sip:bob@example.com', longContent)

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:bob@example.com',
        longContent,
        expect.any(Object)
      )

      unmount()
    })

    it('should handle special characters in message content', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      const specialContent = 'Hello 你好 👋 <script>alert("xss")</script>'
      await result.sendMessage('sip:bob@example.com', specialContent)

      expect(result.messages.value[0].content).toBe(specialContent)

      unmount()
    })

    it('should handle URIs with special characters', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useMessaging(sipClientRef))

      const complexUri = 'sip:user+tag@subdomain.example.com:5060;transport=tcp'
      await result.sendMessage(complexUri, 'Hello!')

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        complexUri,
        'Hello!',
        expect.any(Object)
      )

      unmount()
    })
  })
})
