/**
 * AnalyticsPlugin Validation Tests
 *
 * Tests for event data validation features:
 * - Empty/null event data validation
 * - Event payload size limits
 * - Serialization error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AnalyticsPlugin } from '../../../src/plugins/AnalyticsPlugin'
import { createMockPluginContext } from '../../utils/test-helpers'

describe('AnalyticsPlugin - Validation', () => {
  describe('Empty Event Tracking Validation', () => {
    let plugin: AnalyticsPlugin
    let context: ReturnType<typeof createMockPluginContext>

    beforeEach(async () => {
      plugin = new AnalyticsPlugin()
      context = createMockPluginContext()
      await plugin.install(context, {
        endpoint: 'https://test.com',
        validateEventData: true, // Enable validation
        batchEvents: false, // Disable batching for easier testing
      })
    })

    afterEach(async () => {
      await plugin.uninstall(context)
    })

    it('should reject null event data when validation enabled', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      plugin.trackEvent('test:event', null as any)

      expect(consoleSpy).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid event data'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('should accept undefined event data', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      plugin.trackEvent('test:event', undefined)

      // Should not warn about invalid data
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Invalid event data'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('should accept empty object event data', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      plugin.trackEvent('test:event', {})

      // Should not warn about invalid data
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Invalid event data'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('should reject array event data', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      plugin.trackEvent('test:event', [] as any)

      expect(consoleSpy).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid event data'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('should reject non-object event data', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      plugin.trackEvent('test:event', 'string' as any)
      plugin.trackEvent('test:event', 123 as any)
      plugin.trackEvent('test:event', true as any)

      expect(consoleSpy).toHaveBeenCalledTimes(3)

      consoleSpy.mockRestore()
    })

    it('should allow disabling validation', async () => {
      await plugin.uninstall(context)

      plugin = new AnalyticsPlugin()
      await plugin.install(context, {
        endpoint: 'https://test.com',
        validateEventData: false, // Disable validation
        batchEvents: false,
      })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Null should be allowed when validation disabled
      plugin.trackEvent('test:event', null as any)

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Invalid event data'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Large Event Payload Size Limits', () => {
    let plugin: AnalyticsPlugin
    let context: ReturnType<typeof createMockPluginContext>

    beforeEach(async () => {
      plugin = new AnalyticsPlugin()
      context = createMockPluginContext()
      await plugin.install(context, {
        endpoint: 'https://test.com',
        maxPayloadSize: 1000, // 1KB limit for testing
        batchEvents: false,
      })
    })

    afterEach(async () => {
      await plugin.uninstall(context)
    })

    it('should reject events exceeding payload size limit', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Create large event data
      const largeData = {
        bigArray: new Array(1000).fill('x'.repeat(100)),
      }

      plugin.trackEvent('test:event', largeData)

      expect(consoleSpy).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Event payload too large'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('should accept events within payload size limit', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Small event data
      const smallData = {
        message: 'test',
      }

      plugin.trackEvent('test:event', smallData)

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Event payload too large'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('should use default 100KB limit', async () => {
      await plugin.uninstall(context)

      plugin = new AnalyticsPlugin()
      await plugin.install(context, {
        endpoint: 'https://test.com',
        // maxPayloadSize not specified, should default to 100KB
        batchEvents: false,
      })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Create data under 100KB
      const mediumData = {
        data: 'x'.repeat(50000), // 50KB
      }

      plugin.trackEvent('test:event', mediumData)

      // Should not exceed 100KB default limit
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Event payload too large'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('should handle serialization failures', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Create circular reference that will fail JSON.stringify
      const circular: any = { prop: 'value' }
      circular.circular = circular

      plugin.trackEvent('test:event', circular)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to serialize event'),
        expect.anything(),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })
  })
})
