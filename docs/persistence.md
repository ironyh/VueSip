# VueSip Persistence Guide

## Overview

VueSip provides a comprehensive persistence layer for automatically saving and restoring application state across browser sessions. The persistence system uses multiple storage backends (localStorage, sessionStorage, IndexedDB) with automatic encryption for sensitive data.

## Features

- ✅ **Automatic State Persistence** - State changes are automatically saved after a debounce period
- ✅ **Multiple Storage Backends** - localStorage for preferences, IndexedDB for large data
- ✅ **Encryption Support** - Automatic encryption for sensitive data (credentials, passwords)
- ✅ **Storage Quota Management** - Monitor and manage storage usage
- ✅ **Error Recovery** - Graceful handling of partial storage failures
- ✅ **Vue 3 Integration** - Reactive state with automatic persistence

---

## Quick Start

### Basic Setup

```typescript
import { initializeStorePersistence } from 'vuesip'

// Initialize with default settings
await initializeStorePersistence()

// That's it! All stores will automatically persist their state
```

### With Custom Configuration

```typescript
await initializeStorePersistence({
  storage: {
    prefix: 'myapp', // Storage key prefix
    version: '1', // Storage version for migrations
  },
  encryptionPassword: 'your-secure-password', // For encrypting sensitive data
  debounce: 500, // Save delay in ms (default: 300)
  autoLoad: true, // Load state on init (default: true)
})
```

---

## What Gets Persisted

### Automatically Persisted Data

1. **SIP Configuration** (encrypted)
   - Server URI
   - Credentials
   - Display name
   - Registration settings

2. **Media Configuration**
   - Audio/video constraints
   - ICE servers
   - Media preferences

3. **User Preferences**
   - Auto-answer settings
   - Audio/video enable flags
   - Debug settings

4. **Device Selection**
   - Selected audio input
   - Selected audio output
   - Selected video input
   - Device permissions

5. **Call History** (IndexedDB)
   - Past calls
   - Call duration
   - Timestamps

6. **Registration State**
   - Current registration status
   - Expiry time
   - Retry count

---

## API Reference

### Initialize Persistence

```typescript
import { initializeStorePersistence } from 'vuesip'

await initializeStorePersistence({
  storage: {
    prefix: 'vuesip', // Default: 'vuesip'
    version: '1', // Default: '1'
    encryption: {
      enabled: true, // Default: true
      algorithm: 'AES-GCM', // Default: 'AES-GCM'
      iterations: 100000, // Default: 100000
    },
  },
  encryptionPassword: 'secure-password',
  enabled: true, // Default: true
  autoLoad: true, // Default: true
  debounce: 300, // Default: 300ms
})
```

### Manual Save/Load Operations

```typescript
import { saveAllStores, loadAllStores, clearAllStores } from 'vuesip'

// Manually save all stores
await saveAllStores()

// Manually load all stores
await loadAllStores()

// Clear all persisted data
await clearAllStores()
```

### Storage Quota Management

```typescript
import {
  getStorageQuota,
  getStorageUsageSummary,
  checkStorageWarning,
  clearOldCallHistory,
} from 'vuesip'

// Get storage quota information
const quota = await getStorageQuota()
console.log(`Using ${quota.usagePercent}% of storage`)
console.log(`${quota.available} bytes available`)

// Get detailed usage summary
const summary = await getStorageUsageSummary()
console.log(summary.overall)
console.log(summary.localStorage)
console.log(summary.indexedDB)

// Check if storage is running low
const isLow = await checkStorageWarning(80) // 80% threshold
if (isLow) {
  console.warn('Storage usage is high!')
}

// Clear old call history entries (LRU strategy)
const removed = await clearOldCallHistory(20) // Remove oldest 20%
console.log(`Removed ${removed} old call history entries`)
```

---

## Storage Backends

### LocalStorage

**Used for:**

- SIP configuration (encrypted)
- Media configuration
- User preferences
- Device selection
- Registration state

**Characteristics:**

- Synchronous API
- ~5-10MB quota (browser-dependent)
- Persists across browser sessions
- Shared across all tabs

**Example:**

```typescript
import { LocalStorageAdapter } from 'vuesip'

const adapter = new LocalStorageAdapter(
  {
    prefix: 'myapp',
    version: '1',
  },
  'encryption-password'
)

await adapter.set('user:preferences', { theme: 'dark' })
const result = await adapter.get('user:preferences')
```

### SessionStorage

**Used for:**

- Temporary session data
- One-time tokens
- Session-specific state

**Characteristics:**

- Synchronous API
- ~5-10MB quota
- Cleared when tab closes
- Not shared across tabs

**Example:**

```typescript
import { SessionStorageAdapter } from 'vuesip'

const adapter = new SessionStorageAdapter({
  prefix: 'myapp',
  version: '1',
})

await adapter.set('session:token', '12345')
```

### IndexedDB

**Used for:**

- Call history
- Large datasets
- Structured data

**Characteristics:**

- Asynchronous API
- Much larger quota (~50MB+)
- Persists across sessions
- Better performance for large data

**Example:**

```typescript
import { IndexedDBAdapter } from 'vuesip'

const adapter = new IndexedDBAdapter({
  prefix: 'myapp',
  version: '1',
})

await adapter.initialize()
await adapter.set('call:history', callHistoryArray)
```

---

## Encryption

### Automatic Encryption

Sensitive data is automatically encrypted based on key patterns:

- `*credentials*`
- `*password*`
- `*secret*`
- `*auth*`
- `*token*`

```typescript
// This will be automatically encrypted
await adapter.set('sip:credentials', {
  username: 'user',
  password: 'secret123',
})
```

### Encryption Algorithm

- **Algorithm:** AES-GCM (256-bit)
- **Key Derivation:** PBKDF2 with SHA-256
- **Iterations:** 100,000 (configurable)
- **Salt:** Random 16-byte salt per encryption
- **IV:** Random 12-byte IV per encryption

### Security Best Practices

1. **Use Strong Passwords**

   ```typescript
   import { generateEncryptionKey } from 'vuesip'

   const password = generateEncryptionKey() // 32-byte random key
   ```

2. **Never Hardcode Passwords**

   ```typescript
   // ❌ Bad
   const password = 'hardcoded-password'

   // ✅ Good - prompt user or use secure storage
   const password = await getUserPassword()
   ```

3. **Consider Key Rotation**

   ```typescript
   // Re-encrypt with new password periodically
   const oldData = await adapter.get('encrypted:data')
   await adapter.remove('encrypted:data')

   // Reinitialize with new password
   const newAdapter = new LocalStorageAdapter(config, newPassword)
   await newAdapter.set('encrypted:data', oldData)
   ```

---

## Storage Quota Management

### Monitoring Usage

```typescript
import { getStorageQuota, formatBytes } from 'vuesip'

// Check storage periodically
setInterval(async () => {
  const quota = await getStorageQuota()

  if (quota.usagePercent > 80) {
    console.warn(`Storage at ${quota.usagePercent.toFixed(1)}%`)
    console.warn(`${formatBytes(quota.available)} remaining`)
  }
}, 60000) // Check every minute
```

### Automatic Cleanup

```typescript
import { clearOldCallHistory, checkStorageWarning } from 'vuesip'

// Automatic cleanup when storage is low
async function manageStorage() {
  const isLow = await checkStorageWarning(80)

  if (isLow) {
    // Remove oldest 20% of call history
    const removed = await clearOldCallHistory(20)
    console.log(`Freed up space by removing ${removed} entries`)
  }
}

// Run periodically
setInterval(manageStorage, 300000) // Every 5 minutes
```

### LRU Strategy

```typescript
import { clearOldDataLRU } from 'vuesip'

// Custom LRU cleanup for any data
await clearOldDataLRU(
  // Get data with timestamps
  () =>
    myData.map((item) => ({
      id: item.id,
      timestamp: item.createdAt,
    })),

  // Remove function
  (ids) => {
    ids.forEach((id) => removeDataById(id))
  },

  25 // Remove oldest 25%
)
```

---

## Error Handling

### Graceful Degradation

The persistence system is designed to handle failures gracefully:

```typescript
// Even if localStorage fails, the app continues working
await initializeStorePersistence() // Never throws

// Individual store failures don't affect others
// If device store fails, config store still persists
```

### Handling Quota Exceeded

```typescript
import { hasEnoughSpace, QuotaExceededError } from 'vuesip'

// Check before large writes
if (await hasEnoughSpace(1024 * 1024)) {
  // 1MB
  await adapter.set('large:data', largeObject)
} else {
  console.warn('Not enough storage space')
  await clearOldCallHistory(30) // Free up space
}
```

### Error Events

```typescript
import { storePersistence } from 'vuesip'

try {
  await storePersistence.initialize(config)
} catch (error) {
  // This rarely happens due to error recovery
  console.error('Persistence init failed:', error)
}
```

---

## Advanced Usage

### Custom Storage Adapters

Implement custom storage backends:

```typescript
import type { StorageAdapter, StorageResult } from 'vuesip'

class CustomStorageAdapter implements StorageAdapter {
  readonly name = 'CustomAdapter'

  async get<T>(key: string): Promise<StorageResult<T>> {
    // Your implementation
    return { success: true, data: ... }
  }

  async set<T>(key: string, value: T): Promise<StorageResult<void>> {
    // Your implementation
    return { success: true }
  }

  async remove(key: string): Promise<StorageResult<void>> {
    // Your implementation
  }

  async clear(prefix?: string): Promise<StorageResult<void>> {
    // Your implementation
  }

  async has(key: string): Promise<boolean> {
    // Your implementation
  }

  async keys(prefix?: string): Promise<string[]> {
    // Your implementation
  }
}
```

### Selective Persistence

```typescript
// Disable persistence for specific features
const config = configStore.exportConfig(false) // Exclude credentials

// Store only non-sensitive data
await myCustomAdapter.set('safe:config', config)
```

### Persistence Migration

```typescript
// Version-based migrations
const currentVersion = '2'
const storedVersion = localStorage.getItem('vuesip:version')

if (storedVersion !== currentVersion) {
  // Run migration
  await migrateFromV1ToV2()
  localStorage.setItem('vuesip:version', currentVersion)
}
```

---

## Troubleshooting

### Persistence Not Working

1. **Check if persistence is enabled:**

   ```typescript
   console.log(storePersistence.getStatistics())
   ```

2. **Verify storage is available:**

   ```typescript
   import { isStorageAvailable } from 'vuesip'

   console.log('localStorage:', isStorageAvailable('localStorage'))
   console.log('indexedDB:', isStorageAvailable('indexedDB'))
   ```

3. **Check for quota issues:**
   ```typescript
   const quota = await getStorageQuota()
   if (quota.available < 1024 * 1024) {
     // < 1MB
     console.warn('Storage almost full!')
   }
   ```

### Data Not Persisting

- Ensure `watchSource` is configured (fixed in latest version)
- Check debounce delay - changes save after 300ms by default
- Verify no browser extensions are blocking storage
- Check browser's storage settings (some browsers have strict policies)

### Decryption Errors

- Ensure same encryption password is used for encrypt/decrypt
- Check if encryption key/password changed
- Verify data wasn't corrupted

### Performance Issues

- Reduce debounce delay for faster saves: `debounce: 100`
- Limit call history size: `callHistoryMaxEntries: 100`
- Clear old data regularly with LRU strategy

---

## Best Practices

### 1. Initialize Early

```typescript
// In your app's main entry point
async function initializeApp() {
  await initializeStorePersistence()
  // Now mount your app
  app.mount('#app')
}
```

### 2. Monitor Storage Health

```typescript
// Periodic health checks
setInterval(async () => {
  const summary = await getStorageUsageSummary()

  if (!summary.localStorage.available) {
    console.error('localStorage unavailable!')
  }

  if (summary.overall.usagePercent > 90) {
    await clearOldCallHistory(30)
  }
}, 60000)
```

### 3. Handle Browser Differences

```typescript
// Some browsers have different quota limits
const quota = await getStorageQuota()

if (quota.supported && quota.quota < 50 * 1024 * 1024) {
  // Less than 50MB - use conservative limits
  configStore.updateUserPreferences({
    callHistoryMaxEntries: 50,
  })
}
```

### 4. Secure Credential Storage

```typescript
// Never log encryption passwords
// Never store passwords in plain text
// Use Web Crypto API's secure random for passwords

import { generateEncryptionKey } from 'vuesip'
const securePassword = generateEncryptionKey()
```

---

## Browser Compatibility

| Feature           | Chrome | Firefox | Safari | Edge |
| ----------------- | ------ | ------- | ------ | ---- |
| localStorage      | ✅     | ✅      | ✅     | ✅   |
| sessionStorage    | ✅     | ✅      | ✅     | ✅   |
| IndexedDB         | ✅     | ✅      | ✅     | ✅   |
| Web Crypto API    | ✅     | ✅      | ✅     | ✅   |
| Storage Quota API | ✅     | ✅      | ⚠️     | ✅   |

⚠️ = Partial support or fallback behavior

---

## Performance Considerations

### Debounce Tuning

```typescript
// Fast saves (may impact performance)
debounce: 100

// Standard (balanced)
debounce: 300 // Default

// Conservative (better performance)
debounce: 1000
```

### Large Data Sets

```typescript
// Use IndexedDB for large data
const callHistory = await indexedDBAdapter.get('call:history')

// Limit stored history
configStore.updateUserPreferences({
  callHistoryMaxEntries: 100, // Keep only last 100 calls
})
```

### Encryption Performance

```typescript
// Adjust iterations (lower = faster, less secure)
encryption: {
  enabled: true,
  iterations: 50000 // Default: 100000
}
```

---

## Examples

See the [examples](../examples) directory for complete working examples:

- `basic-persistence.ts` - Basic setup
- `with-encryption.ts` - Encrypted storage
- `quota-management.ts` - Storage management
- `custom-adapter.ts` - Custom storage backend

---

## Related Documentation

- [Configuration Guide](./configuration.md)
- [Security Best Practices](./security.md)
- [API Reference](./api-reference.md)
- [Migration Guide](./migration.md)
