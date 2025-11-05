/**
 * SessionStorage Adapter
 *
 * Storage adapter implementation using browser's sessionStorage API.
 * Suitable for temporary storage of session-specific data that should be
 * cleared when the browser tab is closed.
 *
 * Features:
 * - Automatic JSON serialization/deserialization
 * - Namespaced keys with version prefix
 * - Optional encryption support
 * - Error handling and logging
 * - Data cleared on tab close
 *
 * @module storage/SessionStorageAdapter
 */

import type {
  StorageAdapter,
  StorageResult,
  StorageConfig,
  EncryptedData,
} from '../types/storage.types'
import { encrypt, decrypt, isCryptoAvailable } from '../utils/encryption'
import { createLogger } from '../utils/logger'

const logger = createLogger('storage:sessionStorage')

/**
 * SessionStorage adapter implementation
 *
 * Uses browser's sessionStorage API with automatic JSON serialization
 * and optional encryption support. Data persists only for the browser session.
 *
 * @example
 * ```typescript
 * const adapter = new SessionStorageAdapter({
 *   prefix: 'vuesip',
 *   version: '1'
 * })
 *
 * // Store temporary session data
 * await adapter.set('session:token', { token: 'abc123' })
 *
 * // Retrieve data
 * const result = await adapter.get('session:token')
 * if (result.success) {
 *   console.log(result.data)
 * }
 * ```
 */
export class SessionStorageAdapter implements StorageAdapter {
  readonly name = 'SessionStorageAdapter'
  private readonly config: Required<StorageConfig>
  private readonly encryptionPassword?: string

  /**
   * Create a new SessionStorage adapter
   * @param config - Storage configuration
   * @param encryptionPassword - Optional password for encrypting sensitive data
   */
  constructor(config: StorageConfig = {}, encryptionPassword?: string) {
    this.config = {
      prefix: config.prefix || 'vuesip',
      version: config.version || '1',
      encryption: config.encryption || { enabled: false },
    }
    this.encryptionPassword = encryptionPassword

    // Check sessionStorage availability
    if (!this.isSessionStorageAvailable()) {
      logger.warn('sessionStorage is not available')
    }

    logger.debug('SessionStorageAdapter initialized', {
      prefix: this.config.prefix,
      version: this.config.version,
      encryption: this.config.encryption.enabled,
    })
  }

  /**
   * Check if sessionStorage is available
   * @returns True if sessionStorage is available
   */
  private isSessionStorageAvailable(): boolean {
    try {
      const test = '__vuesip_test__'
      sessionStorage.setItem(test, test)
      sessionStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  /**
   * Build namespaced storage key
   * @param key - Base key
   * @returns Namespaced key
   */
  private buildKey(key: string): string {
    return `${this.config.prefix}:${this.config.version}:${key}`
  }

  /**
   * Determine if key should be encrypted
   * @param key - Storage key
   * @returns True if key should be encrypted
   */
  private shouldEncrypt(key: string): boolean {
    // Encrypt keys containing 'credentials', 'password', or 'secret'
    const sensitivePatterns = ['credentials', 'password', 'secret', 'auth', 'token']
    return sensitivePatterns.some((pattern) => key.toLowerCase().includes(pattern))
  }

  /**
   * Get a value from storage
   * @param key - Storage key
   * @returns Promise resolving to the value or null if not found
   */
  async get<T = unknown>(key: string): Promise<StorageResult<T>> {
    if (!this.isSessionStorageAvailable()) {
      return {
        success: false,
        error: 'sessionStorage is not available',
      }
    }

    try {
      const fullKey = this.buildKey(key)
      const value = sessionStorage.getItem(fullKey)

      if (value === null) {
        logger.debug(`Key not found: ${fullKey}`)
        return {
          success: true,
          data: undefined,
        }
      }

      // Try to parse as JSON
      let parsed: unknown
      try {
        parsed = JSON.parse(value)
      } catch {
        // If parsing fails, return as string
        logger.debug(`Retrieved value (raw string): ${fullKey}`)
        return {
          success: true,
          data: value as T,
        }
      }

      // Check if data is encrypted
      if (this.shouldEncrypt(key) && this.isEncryptedData(parsed) && this.encryptionPassword) {
        try {
          const decrypted = await decrypt<T>(parsed, this.encryptionPassword)
          logger.debug(`Retrieved and decrypted value: ${fullKey}`)
          return {
            success: true,
            data: decrypted,
          }
        } catch (error) {
          logger.error(`Failed to decrypt data for key ${fullKey}:`, error)
          return {
            success: false,
            error: `Decryption failed: ${(error as Error).message}`,
          }
        }
      }

      logger.debug(`Retrieved value: ${fullKey}`)
      return {
        success: true,
        data: parsed as T,
      }
    } catch (error) {
      logger.error(`Failed to get value for key ${key}:`, error)
      return {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  /**
   * Set a value in storage
   * @param key - Storage key
   * @param value - Value to store
   * @returns Promise resolving to success status
   */
  async set<T = unknown>(key: string, value: T): Promise<StorageResult<void>> {
    if (!this.isSessionStorageAvailable()) {
      return {
        success: false,
        error: 'sessionStorage is not available',
      }
    }

    try {
      const fullKey = this.buildKey(key)
      let dataToStore: string

      // Encrypt if necessary
      if (this.shouldEncrypt(key) && this.config.encryption.enabled && this.encryptionPassword) {
        if (!isCryptoAvailable()) {
          logger.warn(`Web Crypto API not available, storing data unencrypted: ${fullKey}`)
          dataToStore = JSON.stringify(value)
        } else {
          try {
            const encrypted = await encrypt(value, this.encryptionPassword, this.config.encryption)
            dataToStore = JSON.stringify(encrypted)
            logger.debug(`Stored encrypted value: ${fullKey}`)
          } catch (error) {
            logger.error(`Failed to encrypt data for key ${fullKey}:`, error)
            return {
              success: false,
              error: `Encryption failed: ${(error as Error).message}`,
            }
          }
        }
      } else {
        // Store as JSON
        dataToStore = JSON.stringify(value)
        logger.debug(`Stored value: ${fullKey}`)
      }

      sessionStorage.setItem(fullKey, dataToStore)

      return { success: true }
    } catch (error) {
      logger.error(`Failed to set value for key ${key}:`, error)
      return {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  /**
   * Remove a value from storage
   * @param key - Storage key
   * @returns Promise resolving to success status
   */
  async remove(key: string): Promise<StorageResult<void>> {
    if (!this.isSessionStorageAvailable()) {
      return {
        success: false,
        error: 'sessionStorage is not available',
      }
    }

    try {
      const fullKey = this.buildKey(key)
      sessionStorage.removeItem(fullKey)
      logger.debug(`Removed value: ${fullKey}`)
      return { success: true }
    } catch (error) {
      logger.error(`Failed to remove value for key ${key}:`, error)
      return {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  /**
   * Clear all values from storage (with optional prefix filter)
   * @param prefix - Optional prefix to filter keys
   * @returns Promise resolving to success status
   */
  async clear(prefix?: string): Promise<StorageResult<void>> {
    if (!this.isSessionStorageAvailable()) {
      return {
        success: false,
        error: 'sessionStorage is not available',
      }
    }

    try {
      const fullPrefix = prefix
        ? this.buildKey(prefix)
        : `${this.config.prefix}:${this.config.version}:`

      const keysToRemove: string[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith(fullPrefix)) {
          keysToRemove.push(key)
        }
      }

      keysToRemove.forEach((key) => sessionStorage.removeItem(key))
      logger.debug(`Cleared ${keysToRemove.length} values with prefix: ${fullPrefix}`)

      return { success: true }
    } catch (error) {
      logger.error('Failed to clear storage:', error)
      return {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  /**
   * Check if a key exists in storage
   * @param key - Storage key
   * @returns Promise resolving to true if key exists
   */
  async has(key: string): Promise<boolean> {
    if (!this.isSessionStorageAvailable()) {
      return false
    }

    const fullKey = this.buildKey(key)
    return sessionStorage.getItem(fullKey) !== null
  }

  /**
   * Get all keys in storage (with optional prefix filter)
   * @param prefix - Optional prefix to filter keys
   * @returns Promise resolving to array of keys
   */
  async keys(prefix?: string): Promise<string[]> {
    if (!this.isSessionStorageAvailable()) {
      return []
    }

    const fullPrefix = prefix
      ? this.buildKey(prefix)
      : `${this.config.prefix}:${this.config.version}:`

    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && key.startsWith(fullPrefix)) {
        // Remove the full prefix to return the base key
        const baseKey = key.substring(`${this.config.prefix}:${this.config.version}:`.length)
        keys.push(baseKey)
      }
    }

    return keys
  }

  /**
   * Check if data is encrypted
   * @param data - Data to check
   * @returns True if data is encrypted
   */
  private isEncryptedData(data: unknown): data is EncryptedData {
    if (typeof data !== 'object' || data === null) {
      return false
    }

    const obj = data as Record<string, unknown>
    return (
      typeof obj.data === 'string' &&
      typeof obj.iv === 'string' &&
      typeof obj.salt === 'string' &&
      typeof obj.algorithm === 'string' &&
      typeof obj.version === 'number' &&
      (typeof obj.iterations === 'number' || obj.iterations === undefined) // optional for backward compatibility
    )
  }
}
