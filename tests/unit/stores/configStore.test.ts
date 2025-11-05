/**
 * Configuration Store Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { configStore } from '../../../src/stores/configStore'
import type {
  SipClientConfig,
  MediaConfiguration,
  UserPreferences,
} from '../../../src/types/config.types'

describe('configStore', () => {
  // Helper to create mock SIP configuration
  const createMockSipConfig = (overrides?: Partial<SipClientConfig>): SipClientConfig => ({
    uri: 'wss://sip.example.com:7443',
    sipUri: 'sip:alice@example.com',
    password: 'secret123',
    displayName: 'Alice',
    ...overrides,
  })

  // Helper to create mock media configuration
  const createMockMediaConfig = (overrides?: Partial<MediaConfiguration>): MediaConfiguration => ({
    audio: true,
    video: false,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    ...overrides,
  })

  beforeEach(() => {
    configStore.reset()
  })

  describe('Initial State', () => {
    it('should start with no SIP configuration', () => {
      expect(configStore.hasSipConfig).toBe(false)
      expect(configStore.sipConfig).toBeNull()
    })

    it('should have default media configuration', () => {
      const mediaConfig = configStore.mediaConfig
      expect(mediaConfig.echoCancellation).toBe(true)
      expect(mediaConfig.noiseSuppression).toBe(true)
      expect(mediaConfig.autoGainControl).toBe(true)
    })

    it('should have default user preferences', () => {
      const prefs = configStore.userPreferences
      expect(prefs.enableAudio).toBe(true)
      expect(prefs.enableVideo).toBe(false)
      expect(prefs.autoAnswer).toBe(false)
    })

    it('should not be valid initially', () => {
      expect(configStore.isConfigValid).toBe(false)
    })
  })

  describe('SIP Configuration', () => {
    it('should set SIP configuration', () => {
      const config = createMockSipConfig()
      const result = configStore.setSipConfig(config)

      expect(result.valid).toBe(true)
      expect(configStore.hasSipConfig).toBe(true)
      expect(configStore.sipConfig?.sipUri).toBe('sip:alice@example.com')
    })

    it('should validate SIP configuration by default', () => {
      const invalidConfig = createMockSipConfig({
        uri: 'invalid-uri', // Invalid WebSocket URI
      })

      const result = configStore.setSipConfig(invalidConfig)

      expect(result.valid).toBe(false)
      expect(result.errors).toBeTruthy()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it('should skip validation when requested', () => {
      const invalidConfig = createMockSipConfig({
        uri: 'invalid-uri',
      })

      const result = configStore.setSipConfig(invalidConfig, false)

      // Should succeed because validation was skipped
      expect(result.valid).toBe(true)
      expect(configStore.hasSipConfig).toBe(true)
    })

    it('should update SIP configuration partially', () => {
      const config = createMockSipConfig()
      configStore.setSipConfig(config)

      const result = configStore.updateSipConfig({
        displayName: 'Alice Updated',
      })

      expect(result.valid).toBe(true)
      expect(configStore.sipConfig?.displayName).toBe('Alice Updated')
      expect(configStore.sipConfig?.sipUri).toBe('sip:alice@example.com') // Unchanged
    })

    it('should not update if no config is set', () => {
      const result = configStore.updateSipConfig({
        displayName: 'Alice',
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Cannot update SIP config: no config set')
    })

    it('should clear SIP configuration', () => {
      const config = createMockSipConfig()
      configStore.setSipConfig(config)

      configStore.clearSipConfig()

      expect(configStore.hasSipConfig).toBe(false)
      expect(configStore.sipConfig).toBeNull()
    })

    it('should update config timestamp', () => {
      const config = createMockSipConfig()
      const before = new Date()
      configStore.setSipConfig(config)
      const after = new Date()

      const timestamp = configStore.configTimestamp
      expect(timestamp).toBeTruthy()
      expect(timestamp!.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(timestamp!.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('Media Configuration', () => {
    it('should set media configuration', () => {
      const config = createMockMediaConfig({
        audio: { sampleRate: 48000 },
        video: { width: 1920, height: 1080 },
      })

      const result = configStore.setMediaConfig(config)

      expect(result.valid).toBe(true)
      expect(configStore.mediaConfig.audio).toEqual({ sampleRate: 48000 })
    })

    it('should update media configuration partially', () => {
      const result = configStore.updateMediaConfig({
        echoCancellation: false,
      })

      expect(result.valid).toBe(true)
      expect(configStore.mediaConfig.echoCancellation).toBe(false)
      expect(configStore.mediaConfig.noiseSuppression).toBe(true) // Unchanged
    })

    it('should validate media configuration', () => {
      const result = configStore.validateMediaConfig()
      expect(result.valid).toBe(true)
    })
  })

  describe('User Preferences', () => {
    it('should set user preferences', () => {
      const prefs: UserPreferences = {
        enableAudio: true,
        enableVideo: true,
        autoAnswer: true,
        autoAnswerDelay: 1000,
      }

      configStore.setUserPreferences(prefs)

      expect(configStore.userPreferences.enableVideo).toBe(true)
      expect(configStore.userPreferences.autoAnswer).toBe(true)
    })

    it('should update user preferences partially', () => {
      configStore.updateUserPreferences({
        autoAnswer: true,
      })

      expect(configStore.userPreferences.autoAnswer).toBe(true)
      expect(configStore.userPreferences.enableAudio).toBe(true) // Unchanged
    })
  })

  describe('Validation', () => {
    it('should validate current SIP config', () => {
      const config = createMockSipConfig()
      configStore.setSipConfig(config, false) // Set without validation

      const result = configStore.validateSipConfig()

      expect(result.valid).toBe(true)
    })

    it('should fail validation with no SIP config', () => {
      const result = configStore.validateSipConfig()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('No SIP configuration set')
    })

    it('should validate all configurations', () => {
      const config = createMockSipConfig()
      configStore.setSipConfig(config)

      const result = configStore.validateAll()

      expect(result.valid).toBe(true)
    })

    it('should track last validation result', () => {
      const config = createMockSipConfig()
      configStore.setSipConfig(config)

      expect(configStore.lastValidation).toBeTruthy()
      expect(configStore.lastValidation?.valid).toBe(true)
    })

    it('should detect validation errors', () => {
      const invalidConfig = createMockSipConfig({ uri: 'invalid' })
      configStore.setSipConfig(invalidConfig)

      expect(configStore.hasValidationErrors).toBe(true)
    })
  })

  describe('Configuration Getters', () => {
    it('should get WebSocket URI', () => {
      const config = createMockSipConfig()
      configStore.setSipConfig(config)

      expect(configStore.getWebSocketUri()).toBe('wss://sip.example.com:7443')
    })

    it('should get SIP URI', () => {
      const config = createMockSipConfig()
      configStore.setSipConfig(config)

      expect(configStore.getSipUri()).toBe('sip:alice@example.com')
    })

    it('should get display name', () => {
      const config = createMockSipConfig()
      configStore.setSipConfig(config)

      expect(configStore.getDisplayName()).toBe('Alice')
    })

    it('should get registration expires with default', () => {
      expect(configStore.getRegistrationExpires()).toBe(600) // Default
    })

    it('should get registration expires from config', () => {
      const config = createMockSipConfig({
        registrationOptions: { expires: 3600 },
      })
      configStore.setSipConfig(config)

      expect(configStore.getRegistrationExpires()).toBe(3600)
    })

    it('should get max concurrent calls', () => {
      const config = createMockSipConfig({
        sessionOptions: { maxConcurrentCalls: 5 },
      })
      configStore.setSipConfig(config)

      expect(configStore.getMaxConcurrentCalls()).toBe(5)
    })

    it('should check if debug mode is enabled', () => {
      const config = createMockSipConfig({ debug: true })
      configStore.setSipConfig(config)

      expect(configStore.isDebugMode()).toBe(true)
    })

    it('should check if auto-register is enabled', () => {
      const config = createMockSipConfig({
        registrationOptions: { autoRegister: false },
      })
      configStore.setSipConfig(config)

      expect(configStore.isAutoRegisterEnabled()).toBe(false)
    })

    it('should check if auto-answer is enabled', () => {
      configStore.updateUserPreferences({ autoAnswer: true })

      expect(configStore.isAutoAnswerEnabled()).toBe(true)
    })

    it('should get auto-answer delay', () => {
      configStore.updateUserPreferences({ autoAnswerDelay: 2000 })

      expect(configStore.getAutoAnswerDelay()).toBe(2000)
    })
  })

  describe('Merged Media Constraints', () => {
    it('should merge media config with user preferences', () => {
      configStore.updateUserPreferences({
        enableAudio: true,
        enableVideo: true,
      })

      const constraints = configStore.mergedMediaConstraints

      expect(constraints.audio).toBeTruthy()
      expect(constraints.video).toBeTruthy()
    })

    it('should disable audio if user preference is false', () => {
      configStore.updateUserPreferences({
        enableAudio: false,
      })

      const constraints = configStore.mergedMediaConstraints

      expect(constraints.audio).toBe(false)
    })

    it('should disable video if user preference is false', () => {
      configStore.updateUserPreferences({
        enableVideo: false,
      })

      const constraints = configStore.mergedMediaConstraints

      expect(constraints.video).toBe(false)
    })
  })

  describe('Import/Export', () => {
    it('should export configuration as JSON', () => {
      const config = createMockSipConfig()
      configStore.setSipConfig(config)

      const exported = configStore.exportConfig(false)
      const parsed = JSON.parse(exported)

      expect(parsed.sipConfig).toBeTruthy()
      expect(parsed.mediaConfig).toBeTruthy()
      expect(parsed.userPreferences).toBeTruthy()
    })

    it('should exclude credentials by default', () => {
      const config = createMockSipConfig({ password: 'secret' })
      configStore.setSipConfig(config)

      const exported = configStore.exportConfig(false)
      const parsed = JSON.parse(exported)

      expect(parsed.sipConfig.password).toBeUndefined()
      expect(parsed.sipConfig.sipUri).toBe('sip:alice@example.com')
    })

    it('should include credentials when requested', () => {
      const config = createMockSipConfig({ password: 'secret' })
      configStore.setSipConfig(config)

      const exported = configStore.exportConfig(true)
      const parsed = JSON.parse(exported)

      expect(parsed.sipConfig.password).toBe('secret')
    })

    it('should import configuration from JSON', () => {
      const config = createMockSipConfig()
      configStore.setSipConfig(config)

      const exported = configStore.exportConfig(true)

      // Reset and import
      configStore.reset()
      const result = configStore.importConfig(exported)

      expect(result.valid).toBe(true)
      expect(configStore.hasSipConfig).toBe(true)
      expect(configStore.sipConfig?.sipUri).toBe('sip:alice@example.com')
    })

    it('should handle invalid JSON import', () => {
      const result = configStore.importConfig('invalid json{')

      expect(result.valid).toBe(false)
      expect(result.errors).toBeTruthy()
    })

    it('should validate during import', () => {
      const invalidConfig = JSON.stringify({
        sipConfig: { uri: 'invalid', sipUri: 'invalid', password: 'pass' },
      })

      const result = configStore.importConfig(invalidConfig, true)

      expect(result.valid).toBe(false)
    })

    it('should skip validation during import when requested', () => {
      const invalidConfig = JSON.stringify({
        sipConfig: { uri: 'invalid', sipUri: 'invalid', password: 'pass' },
      })

      const result = configStore.importConfig(invalidConfig, false)

      expect(result.valid).toBe(true)
    })
  })

  describe('Store Reset', () => {
    it('should reset store to initial state', () => {
      const config = createMockSipConfig()
      configStore.setSipConfig(config)
      configStore.updateUserPreferences({ autoAnswer: true })

      configStore.reset()

      expect(configStore.hasSipConfig).toBe(false)
      expect(configStore.userPreferences.autoAnswer).toBe(false)
      expect(configStore.lastValidation).toBeNull()
      expect(configStore.configTimestamp).toBeNull()
    })
  })

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      const config = createMockSipConfig({ debug: true })
      configStore.setSipConfig(config)

      const stats = configStore.getStatistics()

      expect(stats.hasSipConfig).toBe(true)
      expect(stats.isConfigValid).toBe(true)
      expect(stats.sipUri).toBe('sip:alice@example.com')
      expect(stats.isDebugMode).toBe(true)
    })

    it('should show validation errors in statistics', () => {
      const invalidConfig = createMockSipConfig({ uri: 'invalid' })
      configStore.setSipConfig(invalidConfig)

      const stats = configStore.getStatistics()

      expect(stats.hasValidationErrors).toBe(true)
      expect(stats.isConfigValid).toBe(false)
    })
  })

  describe('Computed Properties', () => {
    it('should compute hasSipConfig correctly', () => {
      expect(configStore.hasSipConfig).toBe(false)

      const config = createMockSipConfig()
      configStore.setSipConfig(config)

      expect(configStore.hasSipConfig).toBe(true)
    })

    it('should compute isConfigValid correctly', () => {
      expect(configStore.isConfigValid).toBe(false)

      const config = createMockSipConfig()
      configStore.setSipConfig(config)

      expect(configStore.isConfigValid).toBe(true)
    })

    it('should compute hasValidationErrors correctly', () => {
      expect(configStore.hasValidationErrors).toBe(false)

      const invalidConfig = createMockSipConfig({ uri: 'invalid' })
      configStore.setSipConfig(invalidConfig)

      expect(configStore.hasValidationErrors).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle null/undefined in partial updates', () => {
      const config = createMockSipConfig()
      configStore.setSipConfig(config)

      const result = configStore.updateSipConfig({
        displayName: undefined,
      })

      expect(result.valid).toBe(true)
    })

    it('should handle empty configuration objects', () => {
      const emptyConfig: SipClientConfig = {
        uri: 'wss://sip.example.com:7443',
        sipUri: 'sip:test@example.com',
        password: 'pass',
      }

      const result = configStore.setSipConfig(emptyConfig)
      expect(result.valid).toBe(true)
    })

    it('should return null for getters when no config is set', () => {
      expect(configStore.getWebSocketUri()).toBeNull()
      expect(configStore.getSipUri()).toBeNull()
      expect(configStore.getDisplayName()).toBeNull()
    })
  })
})
