/**
 * Persistence Helpers
 *
 * Utilities for integrating storage adapters with reactive stores.
 * Provides automatic save/load functionality for store persistence.
 *
 * @module storage/persistence
 */

import { watch, type WatchSource } from 'vue'
import type { StorageAdapter } from '../types/storage.types'
import { createLogger } from '../utils/logger'

const logger = createLogger('storage:persistence')

/**
 * Options for store persistence
 */
export interface PersistenceOptions<T> {
  /** Storage adapter to use */
  adapter: StorageAdapter
  /** Storage key */
  key: string
  /** State getter function */
  getState: () => T
  /** State setter function */
  setState: (state: T) => void
  /** Watch source for automatic save */
  watchSource?: WatchSource<T>
  /** Debounce delay for automatic saves (ms, default: 300) */
  debounce?: number
  /** Whether to load state on initialization (default: true) */
  autoLoad?: boolean
  /** Transform function for serialization (optional) */
  serialize?: (state: T) => unknown
  /** Transform function for deserialization (optional) */
  deserialize?: (data: unknown) => T
}

/**
 * Persistence manager for a store
 */
export class PersistenceManager<T> {
  private adapter: StorageAdapter
  private key: string
  private getState: () => T
  private setState: (state: T) => void
  private serialize?: (state: T) => unknown
  private deserialize?: (data: unknown) => T
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private debounceDelay: number
  private unwatchFn?: () => void

  constructor(options: PersistenceOptions<T>) {
    this.adapter = options.adapter
    this.key = options.key
    this.getState = options.getState
    this.setState = options.setState
    this.serialize = options.serialize
    this.deserialize = options.deserialize
    this.debounceDelay = options.debounce ?? 300

    // Auto-load if enabled
    if (options.autoLoad !== false) {
      this.load().catch((error) => {
        logger.error(`Failed to auto-load state for key ${this.key}:`, error)
      })
    }

    // Setup automatic save if watch source provided
    if (options.watchSource) {
      this.setupAutoSave(options.watchSource)
    }
  }

  /**
   * Setup automatic save on state changes
   */
  private setupAutoSave(watchSource: WatchSource<T>): void {
    this.unwatchFn = watch(
      watchSource,
      () => {
        this.debouncedSave()
      },
      { deep: true }
    )
  }

  /**
   * Save state with debouncing
   */
  private debouncedSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }

    this.saveTimer = setTimeout(() => {
      this.save().catch((error) => {
        logger.error(`Failed to auto-save state for key ${this.key}:`, error)
      })
    }, this.debounceDelay)
  }

  /**
   * Save current state to storage
   * @returns Promise that resolves when save is complete
   */
  async save(): Promise<void> {
    try {
      const state = this.getState()
      const dataToStore = this.serialize ? this.serialize(state) : state

      const result = await this.adapter.set(this.key, dataToStore)

      if (!result.success) {
        throw new Error(result.error || 'Failed to save state')
      }

      logger.debug(`State saved for key: ${this.key}`)
    } catch (error) {
      logger.error(`Failed to save state for key ${this.key}:`, error)
      throw error
    }
  }

  /**
   * Load state from storage
   * @returns Promise that resolves when load is complete
   */
  async load(): Promise<void> {
    try {
      const result = await this.adapter.get<unknown>(this.key)

      if (!result.success) {
        throw new Error(result.error || 'Failed to load state')
      }

      if (result.data !== undefined) {
        const state = this.deserialize ? this.deserialize(result.data) : (result.data as T)
        this.setState(state)
        logger.debug(`State loaded for key: ${this.key}`)
      } else {
        logger.debug(`No saved state found for key: ${this.key}`)
      }
    } catch (error) {
      logger.error(`Failed to load state for key ${this.key}:`, error)
      throw error
    }
  }

  /**
   * Clear state from storage
   * @returns Promise that resolves when clear is complete
   */
  async clear(): Promise<void> {
    try {
      const result = await this.adapter.remove(this.key)

      if (!result.success) {
        throw new Error(result.error || 'Failed to clear state')
      }

      logger.debug(`State cleared for key: ${this.key}`)
    } catch (error) {
      logger.error(`Failed to clear state for key ${this.key}:`, error)
      throw error
    }
  }

  /**
   * Stop automatic saving and cleanup
   */
  destroy(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }

    if (this.unwatchFn) {
      this.unwatchFn()
      this.unwatchFn = undefined
    }

    logger.debug(`Persistence manager destroyed for key: ${this.key}`)
  }
}

/**
 * Create a persistence manager for a store
 *
 * @param options - Persistence options
 * @returns Persistence manager instance
 *
 * @example
 * ```typescript
 * const persistence = createPersistence({
 *   adapter: new LocalStorageAdapter(),
 *   key: STORAGE_KEYS.USER_PREFERENCES,
 *   getState: () => state.userPreferences,
 *   setState: (prefs) => state.userPreferences = prefs,
 *   watchSource: () => state.userPreferences
 * })
 *
 * // Manual operations
 * await persistence.save()
 * await persistence.load()
 * await persistence.clear()
 *
 * // Cleanup when done
 * persistence.destroy()
 * ```
 */
export function createPersistence<T>(options: PersistenceOptions<T>): PersistenceManager<T> {
  return new PersistenceManager(options)
}
