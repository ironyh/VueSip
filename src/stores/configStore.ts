/**
 * Configuration Store
 *
 * Reactive store for managing SIP client configuration, media configuration,
 * and user preferences with validation support.
 *
 * @module stores/configStore
 */

import { reactive, computed, readonly } from 'vue'
import type {
  SipClientConfig,
  MediaConfiguration,
  UserPreferences,
  ValidationResult,
} from '../types/config.types'
import { createLogger } from '../utils/logger'
import { validateSipConfig, validateMediaConfig } from '../utils/validators'
import {
  DEFAULT_REGISTER_EXPIRES,
  DEFAULT_AUDIO_CONSTRAINTS,
  DEFAULT_VIDEO_CONSTRAINTS,
} from '../utils/constants'

const log = createLogger('ConfigStore')

/**
 * Configuration store state interface
 */
interface ConfigStoreState {
  /** SIP client configuration */
  sipConfig: SipClientConfig | null
  /** Media configuration */
  mediaConfig: MediaConfiguration
  /** User preferences */
  userPreferences: UserPreferences
  /** Last validation result */
  lastValidation: ValidationResult | null
  /** Configuration timestamp */
  configTimestamp: Date | null
}

/**
 * Internal reactive state
 */
const state = reactive<ConfigStoreState>({
  sipConfig: null,
  mediaConfig: {
    audio: DEFAULT_AUDIO_CONSTRAINTS,
    video: DEFAULT_VIDEO_CONSTRAINTS,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  userPreferences: {
    enableAudio: true,
    enableVideo: false,
    autoAnswer: false,
  },
  lastValidation: null,
  configTimestamp: null,
})

/**
 * Computed values
 */
const computed_values = {
  /** Whether SIP configuration is set */
  hasSipConfig: computed(() => state.sipConfig !== null),

  /** Whether configuration is valid */
  isConfigValid: computed(() => state.lastValidation?.valid === true && state.sipConfig !== null),

  /** Has validation errors */
  hasValidationErrors: computed(
    () => state.lastValidation !== null && (state.lastValidation.errors?.length ?? 0) > 0
  ),

  /** Has validation warnings */
  hasValidationWarnings: computed(
    () => state.lastValidation !== null && (state.lastValidation.warnings?.length ?? 0) > 0
  ),

  /** Get merged media constraints */
  mergedMediaConstraints: computed(() => {
    const constraints: MediaStreamConstraints = {}

    if (state.userPreferences.enableAudio) {
      constraints.audio = state.mediaConfig.audio || true
    } else {
      constraints.audio = false
    }

    if (state.userPreferences.enableVideo) {
      constraints.video = state.mediaConfig.video || true
    } else {
      constraints.video = false
    }

    return constraints
  }),
}

/**
 * Configuration Store
 *
 * Manages application configuration with validation and reactive state.
 */
export const configStore = {
  // ============================================================================
  // State Access (readonly to prevent direct mutation)
  // ============================================================================

  /**
   * Get SIP configuration (readonly)
   */
  get sipConfig() {
    return state.sipConfig ? readonly(state.sipConfig) : null
  },

  /**
   * Get media configuration (readonly)
   */
  get mediaConfig() {
    return readonly(state.mediaConfig)
  },

  /**
   * Get user preferences (readonly)
   */
  get userPreferences() {
    return readonly(state.userPreferences)
  },

  /**
   * Get last validation result
   */
  get lastValidation() {
    return state.lastValidation
  },

  /**
   * Get configuration timestamp
   */
  get configTimestamp() {
    return state.configTimestamp
  },

  /**
   * Check if has SIP configuration
   */
  get hasSipConfig() {
    return computed_values.hasSipConfig.value
  },

  /**
   * Check if configuration is valid
   */
  get isConfigValid() {
    return computed_values.isConfigValid.value
  },

  /**
   * Check if has validation errors
   */
  get hasValidationErrors() {
    return computed_values.hasValidationErrors.value
  },

  /**
   * Check if has validation warnings
   */
  get hasValidationWarnings() {
    return computed_values.hasValidationWarnings.value
  },

  /**
   * Get merged media constraints
   */
  get mergedMediaConstraints() {
    return computed_values.mergedMediaConstraints.value
  },

  // ============================================================================
  // Configuration Management
  // ============================================================================

  /**
   * Set SIP configuration
   *
   * @param config - SIP client configuration
   * @param validate - Whether to validate configuration (default: true)
   * @returns Validation result
   */
  setSipConfig(config: SipClientConfig, validate: boolean = true): ValidationResult {
    // Validate if requested
    let validationResult: ValidationResult = { valid: true }
    if (validate) {
      validationResult = validateSipConfig(config)
      state.lastValidation = validationResult

      if (!validationResult.valid) {
        log.error('SIP configuration validation failed', validationResult.errors)
        return validationResult
      }

      if (validationResult.warnings && validationResult.warnings.length > 0) {
        log.warn('SIP configuration warnings', validationResult.warnings)
      }
    }

    // Store configuration
    state.sipConfig = { ...config }
    state.configTimestamp = new Date()
    log.info('SIP configuration updated', { uri: config.sipUri })

    return validationResult
  },

  /**
   * Update SIP configuration (partial update)
   *
   * @param updates - Partial SIP configuration updates
   * @param validate - Whether to validate after update (default: true)
   * @returns Validation result
   */
  updateSipConfig(updates: Partial<SipClientConfig>, validate: boolean = true): ValidationResult {
    if (!state.sipConfig) {
      const error = 'Cannot update SIP config: no config set'
      log.error(error)
      return {
        valid: false,
        errors: [error],
      }
    }

    const updatedConfig = { ...state.sipConfig, ...updates }
    return this.setSipConfig(updatedConfig, validate)
  },

  /**
   * Set media configuration
   *
   * @param config - Media configuration
   * @param validate - Whether to validate configuration (default: true)
   * @returns Validation result
   */
  setMediaConfig(config: MediaConfiguration, validate: boolean = true): ValidationResult {
    // Validate if requested
    let validationResult: ValidationResult = { valid: true }
    if (validate) {
      validationResult = validateMediaConfig(config)

      if (!validationResult.valid) {
        log.error('Media configuration validation failed', validationResult.errors)
        return validationResult
      }

      if (validationResult.warnings && validationResult.warnings.length > 0) {
        log.warn('Media configuration warnings', validationResult.warnings)
      }
    }

    // Store configuration
    state.mediaConfig = { ...config }
    state.configTimestamp = new Date()
    log.info('Media configuration updated')

    return validationResult
  },

  /**
   * Update media configuration (partial update)
   *
   * @param updates - Partial media configuration updates
   * @param validate - Whether to validate after update (default: true)
   * @returns Validation result
   */
  updateMediaConfig(
    updates: Partial<MediaConfiguration>,
    validate: boolean = true
  ): ValidationResult {
    const updatedConfig = { ...state.mediaConfig, ...updates }
    return this.setMediaConfig(updatedConfig, validate)
  },

  /**
   * Set user preferences
   *
   * @param preferences - User preferences
   */
  setUserPreferences(preferences: UserPreferences): void {
    state.userPreferences = { ...preferences }
    state.configTimestamp = new Date()
    log.info('User preferences updated', preferences)
  },

  /**
   * Update user preferences (partial update)
   *
   * @param updates - Partial user preferences updates
   */
  updateUserPreferences(updates: Partial<UserPreferences>): void {
    state.userPreferences = { ...state.userPreferences, ...updates }
    state.configTimestamp = new Date()
    log.info('User preferences updated', updates)
  },

  /**
   * Clear SIP configuration
   */
  clearSipConfig(): void {
    state.sipConfig = null
    state.lastValidation = null
    log.info('SIP configuration cleared')
  },

  // ============================================================================
  // Validation
  // ============================================================================

  /**
   * Validate current SIP configuration
   *
   * @returns Validation result
   */
  validateSipConfig(): ValidationResult {
    if (!state.sipConfig) {
      const result: ValidationResult = {
        valid: false,
        errors: ['No SIP configuration set'],
      }
      state.lastValidation = result
      return result
    }

    const result = validateSipConfig(state.sipConfig)
    state.lastValidation = result
    return result
  },

  /**
   * Validate current media configuration
   *
   * @returns Validation result
   */
  validateMediaConfig(): ValidationResult {
    return validateMediaConfig(state.mediaConfig)
  },

  /**
   * Validate all configurations
   *
   * @returns Combined validation result
   */
  validateAll(): ValidationResult {
    const sipValidation = this.validateSipConfig()
    const mediaValidation = this.validateMediaConfig()

    const combinedErrors = [...(sipValidation.errors || []), ...(mediaValidation.errors || [])]

    const combinedWarnings = [
      ...(sipValidation.warnings || []),
      ...(mediaValidation.warnings || []),
    ]

    const result: ValidationResult = {
      valid: sipValidation.valid && mediaValidation.valid,
      errors: combinedErrors.length > 0 ? combinedErrors : undefined,
      warnings: combinedWarnings.length > 0 ? combinedWarnings : undefined,
    }

    state.lastValidation = result
    return result
  },

  // ============================================================================
  // Specific Configuration Getters
  // ============================================================================

  /**
   * Get WebSocket URI
   *
   * @returns WebSocket URI or null
   */
  getWebSocketUri(): string | null {
    return state.sipConfig?.uri || null
  },

  /**
   * Get SIP URI
   *
   * @returns SIP URI or null
   */
  getSipUri(): string | null {
    return state.sipConfig?.sipUri || null
  },

  /**
   * Get display name
   *
   * @returns Display name or null
   */
  getDisplayName(): string | null {
    return state.sipConfig?.displayName || null
  },

  /**
   * Get registration expires
   *
   * @returns Expires time in seconds
   */
  getRegistrationExpires(): number {
    return state.sipConfig?.registrationOptions?.expires || DEFAULT_REGISTER_EXPIRES
  },

  /**
   * Get max concurrent calls
   *
   * @returns Max concurrent calls
   */
  getMaxConcurrentCalls(): number {
    return state.sipConfig?.sessionOptions?.maxConcurrentCalls || 1
  },

  /**
   * Check if debug mode is enabled
   *
   * @returns True if debug mode enabled
   */
  isDebugMode(): boolean {
    return state.sipConfig?.debug === true
  },

  /**
   * Check if auto-register is enabled
   *
   * @returns True if auto-register enabled
   */
  isAutoRegisterEnabled(): boolean {
    return state.sipConfig?.registrationOptions?.autoRegister !== false
  },

  /**
   * Check if auto-answer is enabled
   *
   * @returns True if auto-answer enabled
   */
  isAutoAnswerEnabled(): boolean {
    return state.userPreferences.autoAnswer === true
  },

  /**
   * Get auto-answer delay
   *
   * @returns Auto-answer delay in milliseconds
   */
  getAutoAnswerDelay(): number {
    return state.userPreferences.autoAnswerDelay || 0
  },

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Export configuration as JSON
   *
   * @param includeCredentials - Whether to include credentials (default: false)
   * @returns Configuration as JSON string
   */
  exportConfig(includeCredentials: boolean = false): string {
    const exportData: Record<string, unknown> = {
      mediaConfig: state.mediaConfig,
      userPreferences: state.userPreferences,
    }

    if (state.sipConfig) {
      if (includeCredentials) {
        exportData.sipConfig = state.sipConfig
      } else {
        // Exclude sensitive data
        const { password: _password, ha1: _ha1, ...safeConfig } = state.sipConfig
        exportData.sipConfig = safeConfig
      }
    }

    return JSON.stringify(exportData, null, 2)
  },

  /**
   * Import configuration from JSON
   *
   * @param json - JSON string to import
   * @param validate - Whether to validate (default: true)
   * @returns Validation result
   */
  importConfig(json: string, validate: boolean = true): ValidationResult {
    try {
      const data = JSON.parse(json)

      // Import each configuration section
      if (data.sipConfig) {
        const sipResult = this.setSipConfig(data.sipConfig, validate)
        if (!sipResult.valid) {
          return sipResult
        }
      }

      if (data.mediaConfig) {
        const mediaResult = this.setMediaConfig(data.mediaConfig, validate)
        if (!mediaResult.valid) {
          return mediaResult
        }
      }

      if (data.userPreferences) {
        this.setUserPreferences(data.userPreferences)
      }

      log.info('Configuration imported successfully')
      return { valid: true }
    } catch (error) {
      const errorMsg = `Failed to import configuration: ${error}`
      log.error(errorMsg)
      return {
        valid: false,
        errors: [errorMsg],
      }
    }
  },

  /**
   * Reset the store to initial state
   */
  reset(): void {
    state.sipConfig = null
    state.mediaConfig = {
      audio: DEFAULT_AUDIO_CONSTRAINTS,
      video: DEFAULT_VIDEO_CONSTRAINTS,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    }
    state.userPreferences = {
      enableAudio: true,
      enableVideo: false,
      autoAnswer: false,
    }
    state.lastValidation = null
    state.configTimestamp = null
    log.info('Configuration store reset to initial state')
  },

  /**
   * Get store statistics
   *
   * @returns Object with store statistics
   */
  getStatistics() {
    return {
      hasSipConfig: computed_values.hasSipConfig.value,
      isConfigValid: computed_values.isConfigValid.value,
      hasValidationErrors: computed_values.hasValidationErrors.value,
      hasValidationWarnings: computed_values.hasValidationWarnings.value,
      configTimestamp: state.configTimestamp,
      lastValidation: state.lastValidation,
      sipUri: this.getSipUri(),
      isDebugMode: this.isDebugMode(),
      isAutoRegisterEnabled: this.isAutoRegisterEnabled(),
      isAutoAnswerEnabled: this.isAutoAnswerEnabled(),
    }
  },
}
