/**
 * Store exports
 *
 * Central export point for all VueSip stores.
 *
 * @module stores
 */

export { callStore } from './callStore'
export { registrationStore } from './registrationStore'
export { deviceStore } from './deviceStore'
export { configStore } from './configStore'

// Persistence
export {
  storePersistence,
  initializeStorePersistence,
  saveAllStores,
  loadAllStores,
  clearAllStores,
  destroyStorePersistence,
  getStorageQuota,
  getStorageUsageSummary,
  checkStorageWarning,
  clearOldCallHistory,
} from './persistence'
export type { PersistenceConfig } from './persistence'
