/**
 * AnalyticsPlugin Lifecycle Tests
 *
 * Tests for plugin lifecycle management:
 * - Installation and uninstallation
 * - Multiple install protection
 * - Resource cleanup (timers, listeners)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AnalyticsPlugin } from '../../../src/plugins/AnalyticsPlugin'
import { createMockPluginContext, checkEventBusListeners } from '../../utils/test-helpers'

describe('AnalyticsPlugin - Lifecycle', () => {
  describe('Multiple Install Protection', () => {
    let plugin: AnalyticsPlugin
    let context: ReturnType<typeof createMockPluginContext>

    beforeEach(() => {
      plugin = new AnalyticsPlugin()
      context = createMockPluginContext()
    })

    afterEach(async () => {
      try {
        await plugin.uninstall(context)
      } catch {
        // Ignore if already uninstalled
      }
    })

    it('should prevent double installation', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await plugin.install(context, { endpoint: 'https://test.com' })
      await plugin.install(context, { endpoint: 'https://test.com' })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('already installed'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('should allow reinstallation after uninstall', async () => {
      await plugin.install(context, { endpoint: 'https://test.com' })
      await plugin.uninstall(context)

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await plugin.install(context, { endpoint: 'https://test.com' })

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('already installed'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('should not start duplicate timers on double install', async () => {
      await plugin.install(context, {
        endpoint: 'https://test.com',
        batchEvents: true,
        sendInterval: 1000,
      })

      const batchTimerBefore = (plugin as any).batchTimer

      await plugin.install(context, {
        endpoint: 'https://test.com',
        batchEvents: true,
        sendInterval: 1000,
      })

      const batchTimerAfter = (plugin as any).batchTimer

      expect(batchTimerAfter).toBe(batchTimerBefore)
    })

    it('should not register duplicate event listeners on double install', async () => {
      const eventBus = context.eventBus

      await plugin.install(context, { endpoint: 'https://test.com' })

      const listenersBefore = checkEventBusListeners(eventBus)

      await plugin.install(context, { endpoint: 'https://test.com' })

      const listenersAfter = checkEventBusListeners(eventBus)

      expect(listenersAfter).toBe(listenersBefore)
    })
  })

  describe('Batch Timer Memory Leak', () => {
    let plugin: AnalyticsPlugin
    let context: ReturnType<typeof createMockPluginContext>

    beforeEach(() => {
      plugin = new AnalyticsPlugin()
      context = createMockPluginContext()
    })

    it('should cleanup timer when install fails', async () => {
      const originalMethod = (plugin as any).registerEventListeners
      ;(plugin as any).registerEventListeners = vi.fn(() => {
        throw new Error('Registration failed')
      })

      await expect(
        plugin.install(context, {
          endpoint: 'https://test.com',
          batchEvents: true,
          sendInterval: 1000,
        })
      ).rejects.toThrow('Registration failed')

      const batchTimer = (plugin as any).batchTimer
      expect(batchTimer).toBeNull()

      const cleanupFunctions = (plugin as any).cleanupFunctions
      expect(cleanupFunctions).toHaveLength(0)

      ;(plugin as any).registerEventListeners = originalMethod
    })

    it('should not leak timer if trackEvent throws', async () => {
      const originalTrackEvent = plugin.trackEvent
      plugin.trackEvent = vi.fn(() => {
        throw new Error('Track failed')
      })

      await expect(
        plugin.install(context, {
          endpoint: 'https://test.com',
          batchEvents: true,
        })
      ).rejects.toThrow('Track failed')

      const batchTimer = (plugin as any).batchTimer
      expect(batchTimer).toBeNull()

      plugin.trackEvent = originalTrackEvent
    })
  })
})
