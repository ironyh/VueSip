/**
 * Storage Module
 *
 * Exports all storage adapters and utilities for data persistence.
 *
 * @module storage
 */

export { LocalStorageAdapter } from './LocalStorageAdapter'
export { SessionStorageAdapter } from './SessionStorageAdapter'
export { IndexedDBAdapter } from './IndexedDBAdapter'
export { createPersistence, PersistenceManager } from './persistence'
export type { PersistenceOptions } from './persistence'
