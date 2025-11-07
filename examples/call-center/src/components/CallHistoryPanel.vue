<template>
  <div class="call-history-panel card">
    <div class="history-header">
      <h2>Call History</h2>
      <button
        class="btn btn-secondary btn-sm"
        @click="showFilters = !showFilters"
        :aria-label="showFilters ? 'Hide filters' : 'Show filters'"
        :aria-expanded="showFilters"
      >
        Filters
      </button>
    </div>

    <!-- Filters -->
    <div v-if="showFilters" class="filters-section">
      <div class="filter-row">
        <div class="filter-group">
          <label>Direction</label>
          <select v-model="filters.direction">
            <option :value="null">All</option>
            <option value="incoming">Incoming</option>
            <option value="outgoing">Outgoing</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Status</label>
          <select v-model="filters.status">
            <option :value="null">All</option>
            <option value="answered">Answered</option>
            <option value="missed">Missed</option>
          </select>
        </div>
      </div>

      <div class="filter-row">
        <div class="filter-group">
          <label>From Date</label>
          <input v-model="filters.dateFrom" type="date" />
        </div>

        <div class="filter-group">
          <label>To Date</label>
          <input v-model="filters.dateTo" type="date" />
        </div>
      </div>

      <div class="filter-actions">
        <button class="btn btn-primary btn-sm" @click="applyFilters">
          Apply Filters
        </button>
        <button class="btn btn-secondary btn-sm" @click="clearFilters">
          Clear
        </button>
      </div>
    </div>

    <!-- Export Button -->
    <div class="export-section">
      <button class="btn btn-secondary btn-sm" @click="handleExport">
        Export History
      </button>
    </div>

    <!-- History List -->
    <div class="history-list">
      <div v-if="history.length === 0" class="empty-state">
        <p>No call history</p>
      </div>

      <div v-else class="history-table">
        <table>
          <thead>
            <tr>
              <th>Contact</th>
              <th>Type</th>
              <th>Duration</th>
              <th>Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="entry in displayedHistory"
              :key="entry.id"
              :class="{ missed: entry.wasMissed && !entry.wasAnswered }"
            >
              <td>
                <div class="contact-cell">
                  <div class="contact-name">
                    {{ entry.remoteDisplayName || formatUri(entry.remoteUri) }}
                  </div>
                  <div class="contact-uri">{{ formatUri(entry.remoteUri) }}</div>
                </div>
              </td>
              <td>
                <span class="type-badge" :class="entry.direction">
                  <svg v-if="entry.direction === 'incoming'" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="17 11 12 6 7 11"></polyline>
                    <polyline points="17 18 12 13 7 18"></polyline>
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="7 13 12 18 17 13"></polyline>
                    <polyline points="7 6 12 11 17 6"></polyline>
                  </svg>
                  {{ entry.direction }}
                </span>
                <span v-if="entry.wasMissed && !entry.wasAnswered" class="missed-badge">
                  Missed
                </span>
              </td>
              <td>{{ formatDuration(entry.duration) }}</td>
              <td>
                <div class="time-cell">
                  <div>{{ formatDate(entry.startTime) }}</div>
                  <div class="time-small">{{ formatTime(entry.startTime) }}</div>
                </div>
              </td>
              <td>
                <button
                  class="btn btn-sm btn-primary"
                  @click="$emit('call-back', entry.remoteUri)"
                  :aria-label="`Call back ${entry.remoteDisplayName || formatUri(entry.remoteUri)}`"
                >
                  Call
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination" role="navigation" aria-label="Call history pagination">
        <button
          class="btn btn-sm btn-secondary"
          :disabled="currentPage === 1"
          @click="currentPage--"
          aria-label="Go to previous page"
        >
          Previous
        </button>
        <span class="page-info" aria-live="polite" aria-atomic="true">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <button
          class="btn btn-sm btn-secondary"
          :disabled="currentPage === totalPages"
          @click="currentPage++"
          aria-label="Go to next page"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// ============================================================================
// Types
// ============================================================================

interface CallHistoryEntry {
  id: string
  direction: 'incoming' | 'outgoing'
  remoteUri: string
  remoteDisplayName?: string
  localUri: string
  startTime: Date
  endTime: Date
  answerTime?: Date
  duration: number
  finalState: string
  wasAnswered: boolean
  wasMissed: boolean
  hasVideo: boolean
  terminationCause: string
  ringDuration?: number
  tags?: string[]
  metadata?: Record<string, unknown>
}

// ============================================================================
// Props & Emits
// ============================================================================

const props = defineProps<{
  history: readonly CallHistoryEntry[]
  totalCount: number
}>()

const emit = defineEmits<{
  filter: [filter: Record<string, unknown> | null]
  export: [options: { format: string; filename?: string; includeMetadata?: boolean }]
  'call-back': [uri: string]
}>()

// ============================================================================
// State
// ============================================================================

const showFilters = ref(false)
const currentPage = ref(1)
const itemsPerPage = 10

const filters = ref({
  direction: null as 'incoming' | 'outgoing' | null,
  status: null as 'answered' | 'missed' | null,
  dateFrom: '',
  dateTo: '',
})

// ============================================================================
// Computed
// ============================================================================

const displayedHistory = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return props.history.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(props.history.length / itemsPerPage)
})

// ============================================================================
// Methods
// ============================================================================

const formatUri = (uri: string): string => {
  const match = uri.match(/sip:([^@]+)/)
  return match ? match[1] : uri
}

const formatDuration = (seconds: number): string => {
  if (seconds === 0) return '0s'

  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hrs > 0) {
    return `${hrs}h ${mins}m`
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`
  }
  return `${secs}s`
}

const formatDate = (date: Date): string => {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString()
  }
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const applyFilters = () => {
  const filter: Record<string, unknown> = {}

  if (filters.value.direction) {
    filter.direction = filters.value.direction
  }

  if (filters.value.status === 'answered') {
    filter.wasAnswered = true
  } else if (filters.value.status === 'missed') {
    filter.wasMissed = true
    filter.wasAnswered = false
  }

  if (filters.value.dateFrom) {
    filter.dateFrom = new Date(filters.value.dateFrom)
  }

  if (filters.value.dateTo) {
    const dateTo = new Date(filters.value.dateTo)
    dateTo.setHours(23, 59, 59, 999)
    filter.dateTo = dateTo
  }

  emit('filter', Object.keys(filter).length > 0 ? filter : null)
  currentPage.value = 1
}

const clearFilters = () => {
  filters.value = {
    direction: null,
    status: null,
    dateFrom: '',
    dateTo: '',
  }
  emit('filter', null)
  currentPage.value = 1
}

const handleExport = () => {
  emit('export', {
    format: 'csv',
    filename: 'call-history',
    includeMetadata: false,
  })
}
</script>

<style scoped>
.call-history-panel {
  background: white;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 200px);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.history-header h2 {
  font-size: 1.125rem;
  color: #111827;
}

.filters-section {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.filter-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.filter-row:last-of-type {
  margin-bottom: 0;
}

.filter-group {
  display: flex;
  flex-direction: column;
}

.filter-group label {
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
  color: #6b7280;
}

.filter-group select,
.filter-group input {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  justify-content: flex-end;
}

.export-section {
  margin-bottom: 1rem;
  display: flex;
  justify-content: flex-end;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.history-table {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

th {
  text-align: left;
  padding: 0.75rem;
  background: #f9fafb;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #6b7280;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 1;
}

td {
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

tr:hover {
  background: #f9fafb;
}

tr.missed {
  background: #fef3c7;
}

tr.missed:hover {
  background: #fde68a;
}

.contact-cell {
  display: flex;
  flex-direction: column;
}

.contact-name {
  font-weight: 500;
  color: #111827;
  margin-bottom: 0.125rem;
}

.contact-uri {
  font-size: 0.75rem;
  color: #6b7280;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.type-badge.incoming {
  background: #dbeafe;
  color: #1e40af;
}

.type-badge.outgoing {
  background: #d1fae5;
  color: #065f46;
}

.missed-badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.time-cell {
  display: flex;
  flex-direction: column;
}

.time-small {
  font-size: 0.75rem;
  color: #6b7280;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.page-info {
  font-size: 0.875rem;
  color: #6b7280;
}
</style>
