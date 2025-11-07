# Call History Guide

This guide covers the call history management features in VueSip, including tracking call history, filtering and searching, export functionality, and persistence mechanisms.

## Overview

VueSip provides comprehensive call history management through the `useCallHistory` composable. All call history is automatically tracked and persisted to IndexedDB for long-term storage, ensuring your call records are preserved across browser sessions.

**Key Features:**
- **Automatic Tracking** - All calls are automatically logged to history
- **Filtering & Search** - Powerful filtering by direction, date range, tags, and more
- **Export** - Export history to JSON or CSV formats
- **Persistence** - Automatic persistence to IndexedDB
- **Statistics** - Generate call statistics and identify frequent contacts
- **Pagination** - Built-in pagination support for large datasets

## Table of Contents

- [Basic Usage](#basic-usage)
- [Tracking Call History](#tracking-call-history)
- [Filtering History](#filtering-history)
- [Searching History](#searching-history)
- [Export Functionality](#export-functionality)
- [Statistics and Analytics](#statistics-and-analytics)
- [Persistence](#persistence)
- [Managing History](#managing-history)
- [Best Practices](#best-practices)

---

## Basic Usage

### Initializing useCallHistory

The `useCallHistory` composable provides reactive access to call history and management methods:

```typescript
import { useCallHistory } from 'vuesip/composables'

const {
  // Reactive State
  history,
  filteredHistory,
  totalCalls,
  missedCallsCount,
  currentFilter,

  // Methods
  getHistory,
  searchHistory,
  clearHistory,
  deleteEntry,
  exportHistory,
  getStatistics,
  setFilter,
  getMissedCalls,
  getRecentCalls
} = useCallHistory()
```

### Displaying Call History

```vue
<template>
  <div class="call-history">
    <h2>Call History ({{ totalCalls }} calls)</h2>

    <div class="missed-calls-badge" v-if="missedCallsCount > 0">
      {{ missedCallsCount }} missed calls
    </div>

    <div
      v-for="entry in history"
      :key="entry.id"
      class="history-entry"
    >
      <div class="entry-info">
        <span class="direction">{{ entry.direction }}</span>
        <span class="remote">{{ entry.remoteDisplayName || entry.remoteUri }}</span>
        <span class="time">{{ formatTime(entry.startTime) }}</span>
        <span class="duration">{{ formatDuration(entry.duration) }}</span>
      </div>

      <div class="entry-status">
        <span v-if="entry.wasMissed" class="badge missed">Missed</span>
        <span v-if="entry.hasVideo" class="badge video">Video</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCallHistory } from 'vuesip/composables'

const {
  history,
  totalCalls,
  missedCallsCount
} = useCallHistory()

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>
```

---

## Tracking Call History

### Automatic Call Tracking

VueSip automatically tracks all calls when they end. Each call creates a `CallHistoryEntry` with comprehensive information:

```typescript
interface CallHistoryEntry {
  id: string                      // Unique entry ID
  direction: CallDirection        // 'incoming' or 'outgoing'
  remoteUri: string              // Remote party's SIP URI
  remoteDisplayName?: string     // Display name (if available)
  localUri: string               // Your SIP URI
  startTime: Date                // When call started
  answerTime?: Date              // When call was answered
  endTime: Date                  // When call ended
  duration: number               // Call duration in seconds
  ringDuration?: number          // Ring duration in seconds
  finalState: CallState          // Final call state
  terminationCause: string       // Why call ended
  wasAnswered: boolean           // Whether call was answered
  wasMissed: boolean            // Whether call was missed
  hasVideo: boolean             // Whether call had video
  tags?: readonly string[]      // Custom tags
  metadata?: Record<string, any> // Custom metadata
}
```

### Accessing Call History

```typescript
import { watch } from 'vue'
import { useCallHistory } from 'vuesip/composables'

const { history, totalCalls } = useCallHistory()

// Watch for new calls added to history
watch(history, (newHistory, oldHistory) => {
  if (newHistory.length > oldHistory.length) {
    const latestCall = newHistory[0] // Most recent first
    console.log('New call logged:', latestCall)

    if (latestCall.wasMissed) {
      // Show notification for missed call
      showMissedCallNotification(latestCall)
    }
  }
})
```

### Getting Recent Calls

```typescript
const { getRecentCalls } = useCallHistory()

// Get last 10 calls (default)
const recent = getRecentCalls()

// Get last 5 calls
const lastFive = getRecentCalls(5)

// Display in UI
recent.forEach(call => {
  console.log(`${call.remoteDisplayName}: ${call.duration}s`)
})
```

### Getting Missed Calls Only

```typescript
const { getMissedCalls, missedCallsCount } = useCallHistory()

// Get all missed calls
const missed = getMissedCalls()

console.log(`You have ${missedCallsCount.value} missed calls`)

missed.forEach(call => {
  console.log(`Missed call from ${call.remoteDisplayName || call.remoteUri}`)
  console.log(`  Time: ${call.startTime}`)
})
```

---

## Filtering History

### Using Filters

The `getHistory` method accepts a comprehensive filter object:

```typescript
import { useCallHistory } from 'vuesip/composables'
import { CallDirection } from 'vuesip'

const { getHistory } = useCallHistory()

// Filter by direction
const incoming = getHistory({
  direction: CallDirection.Incoming
})

// Filter by answered/unanswered
const unanswered = getHistory({
  wasAnswered: false
})

// Filter missed calls
const missed = getHistory({
  wasMissed: true
})

// Filter video calls
const videoCalls = getHistory({
  hasVideo: true
})
```

### Date Range Filtering

```typescript
// Get calls from the last 7 days
const lastWeek = new Date()
lastWeek.setDate(lastWeek.getDate() - 7)

const recentCalls = getHistory({
  dateFrom: lastWeek,
  dateTo: new Date()
})

// Get calls from specific month
const januaryCalls = getHistory({
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-01-31')
})
```

### Filtering by Remote URI

```typescript
// Get all calls with a specific contact
const contactCalls = getHistory({
  remoteUri: 'alice@example.com'
})

// Partial match also works
const aliceCalls = getHistory({
  remoteUri: 'alice'
})
```

### Tag-Based Filtering

```typescript
// Filter by tags
const importantCalls = getHistory({
  tags: ['important']
})

const workCalls = getHistory({
  tags: ['work', 'business']
})
```

### Combining Multiple Filters

```typescript
// Complex filter: incoming video calls from last month, answered
const result = getHistory({
  direction: CallDirection.Incoming,
  hasVideo: true,
  wasAnswered: true,
  dateFrom: new Date('2024-10-01'),
  dateTo: new Date('2024-10-31')
})

console.log(`Found ${result.entries.length} calls`)
```

### Reactive Filtering

Use `setFilter` and `filteredHistory` for reactive filtering:

```typescript
import { ref, watch } from 'vue'
import { useCallHistory } from 'vuesip/composables'

const { filteredHistory, setFilter, currentFilter } = useCallHistory()

// Set a filter
setFilter({
  direction: CallDirection.Incoming
})

// filteredHistory is now reactive and contains only incoming calls
watch(filteredHistory, (filtered) => {
  console.log(`Showing ${filtered.length} filtered calls`)
})

// Clear filter
setFilter(null)
```

### Sorting

```typescript
// Sort by start time (most recent first - default)
const chronological = getHistory({
  sortBy: 'startTime',
  sortOrder: 'desc'
})

// Sort by duration (longest first)
const byDuration = getHistory({
  sortBy: 'duration',
  sortOrder: 'desc'
})

// Sort by remote URI (alphabetically)
const alphabetical = getHistory({
  sortBy: 'remoteUri',
  sortOrder: 'asc'
})
```

### Pagination

```typescript
// Get first 10 calls
const page1 = getHistory({
  limit: 10,
  offset: 0
})

// Get next 10 calls
const page2 = getHistory({
  limit: 10,
  offset: 10
})

// Check if more results available
if (page1.hasMore) {
  console.log(`Total: ${page1.totalCount}, showing ${page1.entries.length}`)
}
```

### Complete Filter Example

```vue
<template>
  <div class="history-filters">
    <!-- Direction Filter -->
    <select v-model="filters.direction">
      <option :value="undefined">All Directions</option>
      <option value="incoming">Incoming</option>
      <option value="outgoing">Outgoing</option>
    </select>

    <!-- Call Status Filter -->
    <select v-model="filters.wasAnswered">
      <option :value="undefined">All Calls</option>
      <option :value="true">Answered</option>
      <option :value="false">Unanswered</option>
    </select>

    <!-- Date Range -->
    <input
      v-model="filters.dateFrom"
      type="date"
      placeholder="From"
    />
    <input
      v-model="filters.dateTo"
      type="date"
      placeholder="To"
    />

    <!-- Apply Filters -->
    <button @click="applyFilters">Apply</button>
    <button @click="clearFilters">Clear</button>

    <!-- Results -->
    <div class="results">
      <p>{{ result.totalCount }} calls found</p>
      <div v-for="entry in result.entries" :key="entry.id">
        {{ entry.remoteDisplayName }}: {{ entry.duration }}s
      </div>

      <!-- Pagination -->
      <div class="pagination" v-if="result.hasMore">
        <button @click="loadMore">Load More</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useCallHistory } from 'vuesip/composables'
import type { HistoryFilter } from 'vuesip'

const { getHistory } = useCallHistory()

const filters = reactive<HistoryFilter>({
  direction: undefined,
  wasAnswered: undefined,
  dateFrom: undefined,
  dateTo: undefined,
  limit: 20,
  offset: 0
})

const result = ref(getHistory(filters))

function applyFilters() {
  filters.offset = 0
  result.value = getHistory(filters)
}

function clearFilters() {
  filters.direction = undefined
  filters.wasAnswered = undefined
  filters.dateFrom = undefined
  filters.dateTo = undefined
  filters.offset = 0
  result.value = getHistory()
}

function loadMore() {
  filters.offset = (filters.offset || 0) + (filters.limit || 20)
  const nextPage = getHistory(filters)
  result.value.entries.push(...nextPage.entries)
  result.value.hasMore = nextPage.hasMore
}
</script>
```

---

## Searching History

### Basic Search

The `searchHistory` method searches through remote URIs and display names:

```typescript
import { useCallHistory } from 'vuesip/composables'

const { searchHistory } = useCallHistory()

// Search by name or URI
const results = searchHistory('alice')

console.log(`Found ${results.totalCount} matches`)
results.entries.forEach(entry => {
  console.log(entry.remoteDisplayName || entry.remoteUri)
})
```

### Search is Case-Insensitive

```typescript
// All of these will match "Alice Smith"
searchHistory('alice')
searchHistory('ALICE')
searchHistory('Alice')
searchHistory('smith')
```

### Search with Filters

Combine search with filters for precise results:

```typescript
// Search for "alice" in incoming calls only
const incomingFromAlice = searchHistory('alice', {
  direction: CallDirection.Incoming
})

// Search for "bob" in answered video calls
const bobVideoCalls = searchHistory('bob', {
  wasAnswered: true,
  hasVideo: true
})

// Search within date range
const recentAliceCalls = searchHistory('alice', {
  dateFrom: new Date('2024-10-01'),
  dateTo: new Date('2024-10-31')
})
```

### Search with Pagination

```typescript
// Search with pagination
const searchResults = searchHistory('john', {
  limit: 10,
  offset: 0
})

if (searchResults.hasMore) {
  // Load next page
  const nextPage = searchHistory('john', {
    limit: 10,
    offset: 10
  })
}
```

### Real-time Search Component

```vue
<template>
  <div class="call-search">
    <input
      v-model="searchQuery"
      type="text"
      placeholder="Search calls..."
      @input="onSearchInput"
    />

    <div class="search-results">
      <p v-if="isSearching">Searching...</p>

      <div v-else-if="searchResults.totalCount > 0">
        <p>{{ searchResults.totalCount }} results found</p>

        <div
          v-for="entry in searchResults.entries"
          :key="entry.id"
          class="result-item"
        >
          <div class="result-name">
            {{ entry.remoteDisplayName || entry.remoteUri }}
          </div>
          <div class="result-details">
            <span>{{ entry.direction }}</span>
            <span>{{ formatDate(entry.startTime) }}</span>
            <span>{{ entry.duration }}s</span>
          </div>
        </div>
      </div>

      <p v-else-if="searchQuery">No results found</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCallHistory } from 'vuesip/composables'
import type { HistorySearchResult } from 'vuesip'

const { searchHistory } = useCallHistory()

const searchQuery = ref('')
const isSearching = ref(false)
const searchResults = ref<HistorySearchResult>({
  entries: [],
  totalCount: 0,
  hasMore: false
})

// Debounced search
let searchTimeout: number | undefined

function onSearchInput() {
  isSearching.value = true

  clearTimeout(searchTimeout)

  searchTimeout = setTimeout(() => {
    if (searchQuery.value.trim()) {
      searchResults.value = searchHistory(searchQuery.value, {
        limit: 50,
        sortBy: 'startTime',
        sortOrder: 'desc'
      })
    } else {
      searchResults.value = {
        entries: [],
        totalCount: 0,
        hasMore: false
      }
    }
    isSearching.value = false
  }, 300) // 300ms debounce
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
</script>
```

---

## Export Functionality

### Export to JSON

Export call history to JSON format:

```typescript
import { useCallHistory } from 'vuesip/composables'

const { exportHistory } = useCallHistory()

// Export all history to JSON
try {
  await exportHistory({
    format: 'json',
    filename: 'call-history'
  })
  console.log('History exported successfully')
} catch (error) {
  console.error('Export failed:', error)
}
```

### Export to CSV

Export call history to CSV format for spreadsheet applications:

```typescript
// Export to CSV
await exportHistory({
  format: 'csv',
  filename: 'my-calls'
})

// Exported file will include columns:
// - ID
// - Direction
// - Remote URI
// - Remote Display Name
// - Local URI
// - Start Time
// - Answer Time
// - End Time
// - Duration (seconds)
// - Ring Duration (seconds)
// - Final State
// - Termination Cause
// - Was Answered
// - Was Missed
// - Has Video
// - Tags
```

### Export with Filters

Export only specific calls using filters:

```typescript
// Export only incoming calls
await exportHistory({
  format: 'csv',
  filename: 'incoming-calls',
  filter: {
    direction: CallDirection.Incoming
  }
})

// Export missed calls from last month
await exportHistory({
  format: 'json',
  filename: 'missed-calls-october',
  filter: {
    wasMissed: true,
    dateFrom: new Date('2024-10-01'),
    dateTo: new Date('2024-10-31')
  }
})

// Export calls with specific contact
await exportHistory({
  format: 'csv',
  filename: 'alice-calls',
  filter: {
    remoteUri: 'alice@example.com'
  }
})
```

### Include Metadata

Include custom metadata in exports:

```typescript
await exportHistory({
  format: 'csv',
  filename: 'detailed-history',
  includeMetadata: true
})
```

### Export Component

```vue
<template>
  <div class="export-controls">
    <h3>Export Call History</h3>

    <!-- Format Selection -->
    <div class="form-group">
      <label>Format:</label>
      <select v-model="exportFormat">
        <option value="json">JSON</option>
        <option value="csv">CSV</option>
      </select>
    </div>

    <!-- Filter Selection -->
    <div class="form-group">
      <label>Export:</label>
      <select v-model="exportFilter">
        <option value="all">All Calls</option>
        <option value="incoming">Incoming Only</option>
        <option value="outgoing">Outgoing Only</option>
        <option value="missed">Missed Calls</option>
        <option value="video">Video Calls</option>
      </select>
    </div>

    <!-- Date Range -->
    <div class="form-group">
      <label>Date Range (optional):</label>
      <input v-model="dateFrom" type="date" />
      <input v-model="dateTo" type="date" />
    </div>

    <!-- Include Metadata -->
    <div class="form-group">
      <label>
        <input v-model="includeMetadata" type="checkbox" />
        Include metadata
      </label>
    </div>

    <!-- Export Button -->
    <button
      class="btn btn-primary"
      :disabled="isExporting"
      @click="handleExport"
    >
      {{ isExporting ? 'Exporting...' : 'Export' }}
    </button>

    <!-- Status Messages -->
    <div v-if="exportError" class="error">
      {{ exportError }}
    </div>
    <div v-if="exportSuccess" class="success">
      History exported successfully!
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCallHistory } from 'vuesip/composables'
import { CallDirection } from 'vuesip'
import type { HistoryExportFormat, HistoryFilter } from 'vuesip'

const { exportHistory } = useCallHistory()

const exportFormat = ref<HistoryExportFormat>('csv')
const exportFilter = ref('all')
const dateFrom = ref('')
const dateTo = ref('')
const includeMetadata = ref(false)
const isExporting = ref(false)
const exportError = ref('')
const exportSuccess = ref(false)

async function handleExport() {
  isExporting.value = true
  exportError.value = ''
  exportSuccess.value = false

  try {
    // Build filter based on selection
    const filter: HistoryFilter = {}

    switch (exportFilter.value) {
      case 'incoming':
        filter.direction = CallDirection.Incoming
        break
      case 'outgoing':
        filter.direction = CallDirection.Outgoing
        break
      case 'missed':
        filter.wasMissed = true
        break
      case 'video':
        filter.hasVideo = true
        break
    }

    // Add date range if specified
    if (dateFrom.value) {
      filter.dateFrom = new Date(dateFrom.value)
    }
    if (dateTo.value) {
      filter.dateTo = new Date(dateTo.value)
    }

    // Export
    await exportHistory({
      format: exportFormat.value,
      filename: `call-history-${Date.now()}`,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      includeMetadata: includeMetadata.value
    })

    exportSuccess.value = true

    // Clear success message after 3 seconds
    setTimeout(() => {
      exportSuccess.value = false
    }, 3000)

  } catch (error) {
    exportError.value = error instanceof Error
      ? error.message
      : 'Export failed'
  } finally {
    isExporting.value = false
  }
}
</script>
```

---

## Statistics and Analytics

### Getting Call Statistics

Generate comprehensive statistics about your call history:

```typescript
import { useCallHistory } from 'vuesip/composables'

const { getStatistics } = useCallHistory()

const stats = getStatistics()

console.log(`Total calls: ${stats.totalCalls}`)
console.log(`Incoming: ${stats.incomingCalls}`)
console.log(`Outgoing: ${stats.outgoingCalls}`)
console.log(`Answered: ${stats.answeredCalls}`)
console.log(`Missed: ${stats.missedCalls}`)
console.log(`Video calls: ${stats.videoCalls}`)
console.log(`Total duration: ${stats.totalDuration}s`)
console.log(`Average duration: ${stats.averageDuration.toFixed(1)}s`)
```

### Frequent Contacts

Identify your most frequent contacts:

```typescript
const stats = getStatistics()

console.log('Top 10 frequent contacts:')
stats.frequentContacts.forEach((contact, index) => {
  console.log(`${index + 1}. ${contact.displayName || contact.uri}: ${contact.count} calls`)
})
```

### Statistics with Filters

Get statistics for specific time periods or call types:

```typescript
// Statistics for last month
const lastMonth = getStatistics({
  dateFrom: new Date('2024-10-01'),
  dateTo: new Date('2024-10-31')
})

// Statistics for incoming calls only
const incomingStats = getStatistics({
  direction: CallDirection.Incoming
})

// Statistics for answered video calls
const videoStats = getStatistics({
  hasVideo: true,
  wasAnswered: true
})
```

### Statistics Dashboard Component

```vue
<template>
  <div class="call-statistics">
    <h2>Call Statistics</h2>

    <!-- Time Period Selector -->
    <select v-model="timePeriod" @change="updateStats">
      <option value="all">All Time</option>
      <option value="today">Today</option>
      <option value="week">This Week</option>
      <option value="month">This Month</option>
      <option value="year">This Year</option>
    </select>

    <!-- Overview Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalCalls }}</div>
        <div class="stat-label">Total Calls</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">{{ stats.incomingCalls }}</div>
        <div class="stat-label">Incoming</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">{{ stats.outgoingCalls }}</div>
        <div class="stat-label">Outgoing</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">{{ stats.missedCalls }}</div>
        <div class="stat-label">Missed</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">{{ stats.videoCalls }}</div>
        <div class="stat-label">Video Calls</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">{{ formatDuration(stats.totalDuration) }}</div>
        <div class="stat-label">Total Duration</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">{{ formatDuration(Math.round(stats.averageDuration)) }}</div>
        <div class="stat-label">Avg Duration</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">{{ answerRate }}%</div>
        <div class="stat-label">Answer Rate</div>
      </div>
    </div>

    <!-- Frequent Contacts -->
    <div class="frequent-contacts">
      <h3>Frequent Contacts</h3>
      <div
        v-for="(contact, index) in stats.frequentContacts"
        :key="contact.uri"
        class="contact-item"
      >
        <span class="rank">{{ index + 1 }}</span>
        <span class="name">{{ contact.displayName || contact.uri }}</span>
        <span class="count">{{ contact.count }} calls</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCallHistory } from 'vuesip/composables'
import type { HistoryFilter } from 'vuesip'

const { getStatistics } = useCallHistory()

const timePeriod = ref('all')
const stats = ref(getStatistics())

const answerRate = computed(() => {
  if (stats.value.totalCalls === 0) return 0
  return Math.round((stats.value.answeredCalls / stats.value.totalCalls) * 100)
})

function updateStats() {
  const filter: HistoryFilter = {}

  const now = new Date()

  switch (timePeriod.value) {
    case 'today':
      filter.dateFrom = new Date(now.setHours(0, 0, 0, 0))
      break

    case 'week':
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      weekStart.setHours(0, 0, 0, 0)
      filter.dateFrom = weekStart
      break

    case 'month':
      filter.dateFrom = new Date(now.getFullYear(), now.getMonth(), 1)
      break

    case 'year':
      filter.dateFrom = new Date(now.getFullYear(), 0, 1)
      break
  }

  stats.value = getStatistics(
    Object.keys(filter).length > 0 ? filter : undefined
  )
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}
</script>
```

---

## Persistence

### Automatic Persistence

Call history is automatically persisted to IndexedDB, ensuring your data is preserved across browser sessions.

#### How it Works

1. **Automatic Tracking**: When a call ends, VueSip automatically creates a history entry
2. **IndexedDB Storage**: The entry is saved to IndexedDB (not localStorage)
3. **Automatic Loading**: When your application starts, history is loaded from IndexedDB
4. **Debounced Saves**: Changes are debounced (300ms default) to optimize performance

### Initializing Persistence

Persistence is initialized when you set up VueSip:

```typescript
import { createApp } from 'vue'
import { initializeStorePersistence } from 'vuesip'

const app = createApp(App)

// Initialize persistence with default settings
await initializeStorePersistence({
  enabled: true,        // Enable persistence
  autoLoad: true,       // Auto-load on startup
  debounce: 300        // Debounce saves by 300ms
})

app.mount('#app')
```

### Custom Storage Configuration

Configure storage with custom settings:

```typescript
import { initializeStorePersistence } from 'vuesip'

await initializeStorePersistence({
  storage: {
    prefix: 'myapp',      // Storage key prefix
    version: '1'          // Storage version
  },
  enabled: true,
  autoLoad: true,
  debounce: 500          // 500ms debounce
})
```

### Manual Save and Load

You can manually save or load history:

```typescript
import { saveAllStores, loadAllStores } from 'vuesip'

// Manually save all stores (including history)
await saveAllStores()

// Manually load all stores
await loadAllStores()
```

### Storage Quota Management

Monitor and manage IndexedDB storage quota:

```typescript
import { getStorageQuota, checkStorageWarning } from 'vuesip'

// Get storage quota information
const quota = await getStorageQuota()
console.log(`Using ${quota.usage} of ${quota.quota} bytes`)
console.log(`${quota.percentUsed}% used`)

// Check if storage is running low (default: 80% threshold)
const isLow = await checkStorageWarning(80)
if (isLow) {
  console.warn('Storage quota running low!')
}
```

### Clearing Old History

Automatically clear old history entries to free up space:

```typescript
import { clearOldCallHistory } from 'vuesip'

// Clear oldest 20% of call history
const removedCount = await clearOldCallHistory(20)
console.log(`Removed ${removedCount} old history entries`)

// Clear oldest 50% (more aggressive)
await clearOldCallHistory(50)
```

### Storage Management Component

```vue
<template>
  <div class="storage-management">
    <h3>Storage Management</h3>

    <!-- Storage Info -->
    <div v-if="storageInfo" class="storage-info">
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: storageInfo.percentUsed + '%' }"
          :class="{ warning: storageInfo.percentUsed > 80 }"
        ></div>
      </div>

      <p>
        Using {{ formatBytes(storageInfo.usage) }} of
        {{ formatBytes(storageInfo.quota) }}
        ({{ storageInfo.percentUsed.toFixed(1) }}%)
      </p>

      <div v-if="storageInfo.percentUsed > 80" class="warning-message">
        Storage quota running low! Consider clearing old history.
      </div>
    </div>

    <!-- History Info -->
    <div class="history-info">
      <p>Total calls in history: {{ totalCalls }}</p>
    </div>

    <!-- Management Actions -->
    <div class="actions">
      <button
        class="btn"
        :disabled="isClearing"
        @click="clearOldEntries(20)"
      >
        Clear 20% Oldest
      </button>

      <button
        class="btn"
        :disabled="isClearing"
        @click="clearOldEntries(50)"
      >
        Clear 50% Oldest
      </button>

      <button
        class="btn btn-danger"
        :disabled="isClearing"
        @click="clearAllHistory"
      >
        Clear All History
      </button>
    </div>

    <div v-if="clearMessage" class="message">
      {{ clearMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  useCallHistory,
  getStorageQuota,
  clearOldCallHistory
} from 'vuesip'

const { totalCalls, clearHistory } = useCallHistory()

const storageInfo = ref<any>(null)
const isClearing = ref(false)
const clearMessage = ref('')

onMounted(async () => {
  await loadStorageInfo()
})

async function loadStorageInfo() {
  try {
    storageInfo.value = await getStorageQuota()
  } catch (error) {
    console.error('Failed to get storage info:', error)
  }
}

async function clearOldEntries(percentage: number) {
  isClearing.value = true
  clearMessage.value = ''

  try {
    const removed = await clearOldCallHistory(percentage)
    clearMessage.value = `Cleared ${removed} old entries`

    // Refresh storage info
    await loadStorageInfo()

  } catch (error) {
    clearMessage.value = 'Failed to clear history'
  } finally {
    isClearing.value = false
  }
}

async function clearAllHistory() {
  if (!confirm('Are you sure you want to clear all call history?')) {
    return
  }

  isClearing.value = true
  clearMessage.value = ''

  try {
    await clearHistory()
    clearMessage.value = 'All history cleared'

    // Refresh storage info
    await loadStorageInfo()

  } catch (error) {
    clearMessage.value = 'Failed to clear history'
  } finally {
    isClearing.value = false
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
</script>
```

---

## Managing History

### Deleting Individual Entries

Remove specific history entries:

```typescript
import { useCallHistory } from 'vuesip/composables'

const { deleteEntry } = useCallHistory()

// Delete by entry ID
try {
  await deleteEntry('call-123')
  console.log('Entry deleted')
} catch (error) {
  console.error('Failed to delete entry:', error)
}
```

### Clearing All History

Remove all history entries:

```typescript
const { clearHistory } = useCallHistory()

// Clear all history
try {
  await clearHistory()
  console.log('All history cleared')
} catch (error) {
  console.error('Failed to clear history:', error)
}
```

### History Management Component

```vue
<template>
  <div class="history-management">
    <div
      v-for="entry in history"
      :key="entry.id"
      class="history-entry"
    >
      <div class="entry-info">
        <span>{{ entry.remoteDisplayName || entry.remoteUri }}</span>
        <span>{{ formatDate(entry.startTime) }}</span>
      </div>

      <button
        class="btn-delete"
        @click="handleDelete(entry.id)"
      >
        Delete
      </button>
    </div>

    <div class="actions">
      <button
        class="btn btn-danger"
        :disabled="totalCalls === 0"
        @click="handleClearAll"
      >
        Clear All History ({{ totalCalls }} calls)
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCallHistory } from 'vuesip/composables'

const {
  history,
  totalCalls,
  deleteEntry,
  clearHistory
} = useCallHistory()

async function handleDelete(entryId: string) {
  if (!confirm('Delete this call from history?')) {
    return
  }

  try {
    await deleteEntry(entryId)
  } catch (error) {
    console.error('Failed to delete entry:', error)
    alert('Failed to delete entry')
  }
}

async function handleClearAll() {
  if (!confirm(`Clear all ${totalCalls.value} calls from history?`)) {
    return
  }

  try {
    await clearHistory()
  } catch (error) {
    console.error('Failed to clear history:', error)
    alert('Failed to clear history')
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
</script>
```

---

## Best Practices

### 1. Use Reactive State

Leverage Vue's reactivity for automatic UI updates:

```typescript
import { watch } from 'vue'
import { useCallHistory } from 'vuesip/composables'

const { history, totalCalls, missedCallsCount } = useCallHistory()

// UI automatically updates when history changes
watch(history, (newHistory) => {
  console.log(`History updated: ${newHistory.length} calls`)
})

// Show notification for new missed calls
watch(missedCallsCount, (newCount, oldCount) => {
  if (newCount > oldCount) {
    showNotification('New missed call')
  }
})
```

### 2. Implement Pagination

Always paginate large history lists:

```typescript
// Good: Paginated
const page1 = getHistory({
  limit: 50,
  offset: 0
})

// Bad: Loading thousands of entries at once
const allCalls = getHistory() // Could be thousands
```

### 3. Debounce Search Input

Prevent excessive search operations:

```typescript
let searchTimeout: number | undefined

function onSearchInput(query: string) {
  clearTimeout(searchTimeout)

  searchTimeout = setTimeout(() => {
    const results = searchHistory(query)
    // Update UI with results
  }, 300) // 300ms debounce
}
```

### 4. Use Filters Efficiently

Combine filters instead of filtering multiple times:

```typescript
// Good: Single filtered query
const result = getHistory({
  direction: CallDirection.Incoming,
  wasAnswered: true,
  dateFrom: lastWeek
})

// Bad: Multiple filter operations
const incoming = getHistory({ direction: CallDirection.Incoming })
const answered = incoming.entries.filter(e => e.wasAnswered)
const recent = answered.filter(e => e.startTime >= lastWeek)
```

### 5. Monitor Storage Usage

Regularly check storage quota and clean up old entries:

```typescript
import { checkStorageWarning, clearOldCallHistory } from 'vuesip'

async function manageStorage() {
  const isLow = await checkStorageWarning(80)

  if (isLow) {
    // Automatically clear oldest 20%
    await clearOldCallHistory(20)
    console.log('Cleaned up old call history')
  }
}

// Check every hour
setInterval(manageStorage, 3600000)
```

### 6. Handle Errors Gracefully

Always handle potential errors:

```typescript
try {
  await exportHistory({ format: 'csv', filename: 'calls' })
  showSuccessMessage('History exported')
} catch (error) {
  console.error('Export failed:', error)
  showErrorMessage('Failed to export history')
}
```

### 7. Provide User Feedback

Keep users informed of operations:

```typescript
const isExporting = ref(false)
const exportStatus = ref('')

async function exportCalls() {
  isExporting.value = true
  exportStatus.value = 'Exporting...'

  try {
    await exportHistory({ format: 'csv', filename: 'calls' })
    exportStatus.value = 'Export complete!'
  } catch (error) {
    exportStatus.value = 'Export failed'
  } finally {
    isExporting.value = false
  }
}
```

### 8. Validate Export Filters

Ensure valid filter combinations before exporting:

```typescript
function validateExportFilter(filter: HistoryFilter): boolean {
  // Validate date range
  if (filter.dateFrom && filter.dateTo) {
    if (filter.dateFrom > filter.dateTo) {
      alert('Invalid date range')
      return false
    }
  }

  return true
}

async function exportWithValidation(filter: HistoryFilter) {
  if (!validateExportFilter(filter)) {
    return
  }

  await exportHistory({ format: 'csv', filter })
}
```

### 9. Cache Statistics

Cache statistics for better performance:

```typescript
const statsCache = ref<HistoryStatistics | null>(null)
const cacheTime = ref<number>(0)
const CACHE_DURATION = 60000 // 1 minute

function getStatisticsWithCache(): HistoryStatistics {
  const now = Date.now()

  if (statsCache.value && (now - cacheTime.value < CACHE_DURATION)) {
    return statsCache.value
  }

  const stats = getStatistics()
  statsCache.value = stats
  cacheTime.value = now

  return stats
}
```

### 10. Use Proper Data Formatting

Format data consistently for display:

```typescript
// Create reusable formatters
const formatters = {
  date: (date: Date) => new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date),

  duration: (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  },

  uri: (uri: string) => {
    // Remove sip: prefix for display
    return uri.replace(/^sips?:/, '')
  }
}

// Use consistently
const formattedTime = formatters.date(entry.startTime)
const formattedDuration = formatters.duration(entry.duration)
```

### 11. Implement Confirmation Dialogs

Always confirm destructive operations:

```typescript
async function clearAllHistory() {
  // Confirm before clearing
  if (!confirm(`Are you sure you want to clear all ${totalCalls.value} calls?`)) {
    return
  }

  try {
    await clearHistory()
    showSuccessMessage('History cleared')
  } catch (error) {
    showErrorMessage('Failed to clear history')
  }
}
```

### 12. Handle Empty States

Provide helpful messages for empty history:

```vue
<template>
  <div class="call-history">
    <div v-if="totalCalls === 0" class="empty-state">
      <p>No call history yet</p>
      <p>Your call history will appear here after your first call</p>
    </div>

    <div v-else-if="filteredHistory.length === 0" class="empty-state">
      <p>No calls match your filter</p>
      <button @click="clearFilters">Clear Filters</button>
    </div>

    <div v-else>
      <!-- Show history entries -->
    </div>
  </div>
</template>
```

---

## Summary

VueSip provides comprehensive call history management with:

- **Automatic Tracking**: All calls are automatically logged with detailed information
- **Powerful Filtering**: Filter by direction, date range, tags, status, and more
- **Fast Searching**: Case-insensitive search across URIs and display names
- **Flexible Export**: Export to JSON or CSV with optional filtering
- **Rich Statistics**: Generate insights about call patterns and frequent contacts
- **Persistent Storage**: Automatic persistence to IndexedDB with quota management
- **Easy Management**: Simple APIs for deleting entries and clearing history

All features include:
- Type-safe TypeScript interfaces
- Reactive Vue 3 state management
- Comprehensive error handling
- Pagination support for large datasets
- Storage quota monitoring
- Best practice examples

For more information, see:
- [API Reference](/api/)
- [Device Management Guide](/guide/device-management)
- [Call Controls Guide](/guide/call-controls)
