/**
 * IndexedDB Adapter
 *
 * Storage adapter implementation using browser's IndexedDB API.
 * Suitable for storing large amounts of structured data like call history.
 *
 * Features:
 * - Asynchronous storage with Promise-based API
 * - Support for complex data structures
 * - Automatic database versioning
 * - Transaction-based operations
 * - Error handling and logging
 *
 * @module storage/IndexedDBAdapter
 */

import type { StorageAdapter, StorageResult, StorageConfig } from '../types/storage.types'
import { createLogger } from '../utils/logger'

const logger = createLogger('storage:indexedDB')

/**
 * IndexedDB adapter implementation
 *
 * Uses browser's IndexedDB API for storing structured data.
 * Particularly useful for storing call history and other large datasets.
 *
 * @example
 * ```typescript
 * const adapter = new IndexedDBAdapter({
 *   prefix: 'vuesip',
 *   version: '1'
 * })
 *
 * await adapter.initialize()
 *
 * // Store call history
 * await adapter.set('call:123', {
 *   id: '123',
 *   remoteUri: 'sip:user@example.com',
 *   duration: 120
 * })
 *
 * // Retrieve call
 * const result = await adapter.get('call:123')
 * ```
 */
export class IndexedDBAdapter implements StorageAdapter {
  readonly name = 'IndexedDBAdapter'
  private readonly config: Required<StorageConfig>
  private readonly dbName: string
  private readonly storeName = 'keyvalue'
  private readonly dbVersion = 1
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  /**
   * Create a new IndexedDB adapter
   * @param config - Storage configuration
   */
  constructor(config: StorageConfig = {}) {
    this.config = {
      prefix: config.prefix || 'vuesip',
      version: config.version || '1',
      encryption: config.encryption || { enabled: false },
    }

    this.dbName = `${this.config.prefix}_${this.config.version}`

    logger.debug('IndexedDBAdapter created', {
      dbName: this.dbName,
      storeName: this.storeName,
    })
  }

  /**
   * Check if IndexedDB is available
   * @returns True if IndexedDB is available
   */
  private isIndexedDBAvailable(): boolean {
    return typeof indexedDB !== 'undefined'
  }

  /**
   * Initialize the database
   * Creates the database and object store if they don't exist
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    if (this.db) {
      return // Already initialized
    }

    if (this.initPromise) {
      return this.initPromise // Initialization in progress
    }

    this.initPromise = this._initialize()
    return this.initPromise
  }

  /**
   * Internal initialization method
   */
  private async _initialize(): Promise<void> {
    if (!this.isIndexedDBAvailable()) {
      throw new Error('IndexedDB is not available')
    }

    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        const error = request.error || new Error('Failed to open database')
        logger.error('Failed to open IndexedDB:', error)
        reject(error)
      }

      request.onsuccess = () => {
        this.db = request.result
        logger.debug('IndexedDB opened successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName)
          logger.debug('Created object store:', this.storeName)
        }
      }
    })
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initialize()
    }
  }

  /**
   * Get a value from storage
   * @param key - Storage key
   * @returns Promise resolving to the value or undefined if not found
   */
  async get<T = unknown>(key: string): Promise<StorageResult<T>> {
    try {
      await this.ensureInitialized()

      if (!this.db) {
        return {
          success: false,
          error: 'Database not initialized',
        }
      }

      return new Promise((resolve) => {
        const db = this.db // TypeScript narrowing
        if (!db) {
          return resolve({ success: false, error: 'Database not initialized' })
        }

        const transaction = db.transaction([this.storeName], 'readonly')
        const store = transaction.objectStore(this.storeName)
        const request = store.get(key)

        request.onsuccess = () => {
          const value = request.result
          logger.debug(`Retrieved value: ${key}`, { found: value !== undefined })
          resolve({
            success: true,
            data: value as T,
          })
        }

        request.onerror = () => {
          const error = request.error || new Error('Failed to get value')
          logger.error(`Failed to get value for key ${key}:`, error)
          resolve({
            success: false,
            error: error.message,
          })
        }
      })
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
    try {
      await this.ensureInitialized()

      if (!this.db) {
        return {
          success: false,
          error: 'Database not initialized',
        }
      }

      return new Promise((resolve) => {
        const db = this.db // TypeScript narrowing
        if (!db) {
          return resolve({ success: false, error: 'Database not initialized' })
        }

        const transaction = db.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.put(value, key)

        request.onsuccess = () => {
          logger.debug(`Stored value: ${key}`)
          resolve({ success: true })
        }

        request.onerror = () => {
          const error = request.error || new Error('Failed to set value')
          logger.error(`Failed to set value for key ${key}:`, error)
          resolve({
            success: false,
            error: error.message,
          })
        }
      })
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
    try {
      await this.ensureInitialized()

      if (!this.db) {
        return {
          success: false,
          error: 'Database not initialized',
        }
      }

      return new Promise((resolve) => {
        const db = this.db // TypeScript narrowing
        if (!db) {
          return resolve({ success: false, error: 'Database not initialized' })
        }

        const transaction = db.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.delete(key)

        request.onsuccess = () => {
          logger.debug(`Removed value: ${key}`)
          resolve({ success: true })
        }

        request.onerror = () => {
          const error = request.error || new Error('Failed to remove value')
          logger.error(`Failed to remove value for key ${key}:`, error)
          resolve({
            success: false,
            error: error.message,
          })
        }
      })
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
    try {
      await this.ensureInitialized()

      if (!this.db) {
        return {
          success: false,
          error: 'Database not initialized',
        }
      }

      return new Promise((resolve) => {
        const db = this.db // TypeScript narrowing
        if (!db) {
          return resolve({ success: false, error: 'Database not initialized' })
        }

        const transaction = db.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)

        if (!prefix) {
          // Clear all
          const request = store.clear()

          request.onsuccess = () => {
            logger.debug('Cleared all values')
            resolve({ success: true })
          }

          request.onerror = () => {
            const error = request.error || new Error('Failed to clear storage')
            logger.error('Failed to clear storage:', error)
            resolve({
              success: false,
              error: error.message,
            })
          }
        } else {
          // Clear with prefix filter
          const request = store.openCursor()
          const keysToDelete: string[] = []

          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
            if (cursor) {
              const key = cursor.key as string
              if (key.startsWith(prefix)) {
                keysToDelete.push(key)
              }
              cursor.continue()
            } else {
              // Delete all matching keys
              keysToDelete.forEach((key) => store.delete(key))
              logger.debug(`Cleared ${keysToDelete.length} values with prefix: ${prefix}`)
              resolve({ success: true })
            }
          }

          request.onerror = () => {
            const error = request.error || new Error('Failed to clear storage')
            logger.error('Failed to clear storage:', error)
            resolve({
              success: false,
              error: error.message,
            })
          }
        }
      })
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
    try {
      await this.ensureInitialized()

      if (!this.db) {
        return false
      }

      return new Promise((resolve) => {
        const db = this.db // TypeScript narrowing
        if (!db) {
          return resolve(false)
        }

        const transaction = db.transaction([this.storeName], 'readonly')
        const store = transaction.objectStore(this.storeName)
        const request = store.getKey(key)

        request.onsuccess = () => {
          resolve(request.result !== undefined)
        }

        request.onerror = () => {
          resolve(false)
        }
      })
    } catch {
      return false
    }
  }

  /**
   * Get all keys in storage (with optional prefix filter)
   * @param prefix - Optional prefix to filter keys
   * @returns Promise resolving to array of keys
   */
  async keys(prefix?: string): Promise<string[]> {
    try {
      await this.ensureInitialized()

      if (!this.db) {
        return []
      }

      return new Promise((resolve) => {
        const db = this.db // TypeScript narrowing
        if (!db) {
          return resolve([])
        }

        const transaction = db.transaction([this.storeName], 'readonly')
        const store = transaction.objectStore(this.storeName)
        const request = store.getAllKeys()

        request.onsuccess = () => {
          let keys = request.result as string[]

          if (prefix) {
            keys = keys.filter((key) => key.startsWith(prefix))
          }

          resolve(keys)
        }

        request.onerror = () => {
          logger.error('Failed to get keys:', request.error)
          resolve([])
        }
      })
    } catch (error) {
      logger.error('Failed to get keys:', error)
      return []
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initPromise = null
      logger.debug('IndexedDB closed')
    }
  }

  /**
   * Delete the entire database
   * WARNING: This will delete all data!
   */
  async deleteDatabase(): Promise<void> {
    if (!this.isIndexedDBAvailable()) {
      throw new Error('IndexedDB is not available')
    }

    // Close connection first
    await this.close()

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName)

      request.onsuccess = () => {
        logger.debug('Database deleted:', this.dbName)
        resolve()
      }

      request.onerror = () => {
        const error = request.error || new Error('Failed to delete database')
        logger.error('Failed to delete database:', error)
        reject(error)
      }
    })
  }
}
