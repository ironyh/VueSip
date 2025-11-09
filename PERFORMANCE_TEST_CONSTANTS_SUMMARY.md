# Performance Test Constants Refactoring Summary

This document summarizes the refactoring of magic numbers into well-named constants across all performance test files.

## Completed Files

### 1. `/home/user/VueSip/tests/performance/load-tests/rapid-operations.test.ts` ✅

**Constants Added:**

```typescript
// Test cycle counts
const TEST_CYCLES = {
  RAPID_CALL_CREATION: 150, // High number to detect memory leaks over time
  REGISTRATION: 50, // Lower due to async overhead
  MUTE_UNMUTE: 200, // Synchronous operations, can test more
  DEVICE_SWITCHING: 50, // Device operations are expensive
  STABILITY_TEST: 100, // Moderate count for stability
  MEMORY_LEAK_DETECTION: 50, // With proper cleanup
  STREAM_CLEANUP: 30, // Stream cleanup validation
} as const

// Event and performance test counts
const PERFORMANCE_TEST_COUNTS = {
  EVENT_EMISSIONS: 1000, // Large number for event propagation
  EVENT_SUBSCRIBERS: 20, // Multi-listener performance
  SUBSCRIBER_EVENTS: 100, // Events per subscriber test
  STATE_UPDATES: 500, // State update latency
  CONCURRENT_CALLS: 5, // Deadlock testing
} as const

// Memory snapshot frequencies
const SNAPSHOT_INTERVALS = {
  HIGH_FREQUENCY: 25, // Every 25 iterations
  MEDIUM_FREQUENCY: 10, // Every 10 iterations
  LOW_FREQUENCY: 50, // Every 50 iterations
} as const

// Async wait times (milliseconds)
const ASYNC_WAIT_TIMES = {
  IMMEDIATE: 1, // Very short wait
  CLEANUP: 5, // Short wait for cleanup
  CONCURRENT_OPS: 10, // Medium wait
} as const

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  MOCK_CALL_CREATION: 100, // Max time for mocked calls (ms)
  MOCK_DEVICE_SWITCH: 100, // Max time for device switching (ms)
  MAX_MEMORY_GROWTH: 100 * 1024 * 1024, // 100MB
  LEAK_DETECTION_MEMORY: 50 * 1024 * 1024, // 50MB
  MAX_DEGRADATION_RATIO: 1.5, // 50% degradation allowance
} as const

// Warmup configurations
const WARMUP = {
  CALL_CREATION: 10, // Stabilize before measurement
} as const
```

**Key Replacements:**

- Line 282: `CYCLES = 150` → `TEST_CYCLES.RAPID_CALL_CREATION`
- Line 321: `i % 25` → `i % SNAPSHOT_INTERVALS.HIGH_FREQUENCY`
- Line 348: `100` → `PERFORMANCE_THRESHOLDS.MOCK_CALL_CREATION`
- Line 351: `100 * 1024 * 1024` → `PERFORMANCE_THRESHOLDS.MAX_MEMORY_GROWTH`
- All wait times, snapshot intervals, and iteration counts replaced

---

### 2. `/home/user/VueSip/tests/performance/load-tests/memory-leaks.test.ts` ✅

**Constants Added:**

```typescript
// Iteration counts for memory leak tests
const TEST_ITERATIONS = {
  CALL_CYCLES: 100, // Standard leak detection
  MEMORY_RELEASE: 50, // Testing memory release
  EVENT_LISTENERS: 100, // Event listener cycles
  EVENT_BUS_INSTANCES: 100, // EventBus lifecycle
  EVENT_EMISSIONS: 1000, // Event buildup testing
  MEDIA_STREAMS: 100, // Media stream cycles
  MEDIA_MANAGER_INSTANCES: 50, // MediaManager lifecycle
  FULL_CALL_LIFECYCLE: 100, // Complete call cycles
  LONG_RUNNING_OPS: 50, // Long session operations
  CONCURRENT_CALLS: 5, // Concurrent memory validation
  GC_DEMONSTRATION: 100, // GC effectiveness
  TRACK_STOPS: 10, // Track cleanup validation
} as const

// Warmup iterations
const WARMUP = {
  CALL_CREATION: 10, // Stabilize memory
  FULL_LIFECYCLE: 5, // Full lifecycle warmup
} as const

// Memory snapshot frequencies
const SNAPSHOT_INTERVALS = {
  DETAILED: 20, // Every 20 iterations
  MEDIUM: 10, // Every 10 iterations
} as const

// Async wait times (milliseconds)
const WAIT_TIMES = {
  CLEANUP_SHORT: 5, // Short cleanup wait
  CLEANUP_MEDIUM: 50, // Medium cleanup wait
  CLEANUP_LONG: 100, // Long cleanup wait
  LONG_RUNNING_OP: 10, // Operation wait
} as const

// GC wait times (milliseconds)
const GC_WAIT_TIMES = {
  SHORT: 50, // Short GC wait
  STANDARD: 100, // Standard GC wait
} as const

// Memory retention thresholds (ratios)
const MEMORY_RETENTION = {
  CALL_RELEASE: 0.2, // 20% retention after release
  COMPONENT_CLEANUP: 0.3, // 30% retention after cleanup
  MAX_GROWTH_RATE: 0.5, // 50% max growth rate
} as const

// Memory growth thresholds (bytes)
const MEMORY_THRESHOLDS = {
  EVENT_LISTENERS: 5 * 1024 * 1024, // 5 MB
  EVENT_EMISSIONS: 3 * 1024 * 1024, // 3 MB
  MEDIA_STREAMS: 10 * 1024 * 1024, // 10 MB
  LONG_RUNNING: 5 * 1024 * 1024, // 5 MB
} as const
```

**Key Replacements:**

- Line 110: `iterations = 100` → `TEST_ITERATIONS.CALL_CYCLES`
- Line 114: `i < 10` → `i < WARMUP.CALL_CREATION`
- Line 159: `i % 20` → `i % SNAPSHOT_INTERVALS.DETAILED`
- Line 191: `0.5` → `MEMORY_RETENTION.MAX_GROWTH_RATE`
- Line 245: `0.2` → `MEMORY_RETENTION.CALL_RELEASE`
- Line 282: `5 * 1024 * 1024` → `MEMORY_THRESHOLDS.EVENT_LISTENERS`
- All wait times and memory thresholds replaced

---

### 3. `/home/user/VueSip/tests/performance/load-tests/concurrent-calls.test.ts` ✅ (Partially)

**Constants Added:**

```typescript
// Call count configurations
const CALL_COUNTS = {
  BASELINE: 1, // Single call baseline
  MODERATE: 3, // Moderate load
  RECOMMENDED_MAX: 5, // Recommended maximum
  STRESS: 10, // Stress test
} as const

// Scaling test configurations
const SCALING_TEST_CALLS = [1, 3, 5] as const

// Wait times (milliseconds)
const WAIT_TIMES = {
  RAPID_SEQUENTIAL: 10, // Between rapid calls
  CALL_ESTABLISHMENT: 50, // Call setup wait
  MEMORY_STABILIZATION: 100, // Memory stabilization
  CLEANUP: 50, // Cleanup operations
} as const

// Network settings
const NETWORK_SETTINGS = {
  LATENCY: 10, // Network latency (ms)
  CONNECTION_DELAY: 10, // Connection delay (ms)
} as const

// Performance limits
const PERFORMANCE_LIMITS = {
  EVENT_LOOP_LATENCY: 100, // Event loop threshold (ms)
  MEMORY_LEAK: 10 * 1024 * 1024, // 10MB leak threshold
  MAX_DEGRADATION_MULTIPLIER: 3, // 3x max degradation
} as const

// Memory leak test iterations
const LEAK_TEST_ITERATIONS = 3
```

**Recommended Replacements:**

- Line 193: `100` → `PERFORMANCE_LIMITS.EVENT_LOOP_LATENCY`
- Line 209: `networkLatency: 10` → `networkLatency: NETWORK_SETTINGS.LATENCY`
- Line 395: `testConcurrentCalls(10)` → `testConcurrentCalls(CALL_COUNTS.STRESS)`
- Line 532: `10 * 1024 * 1024` → `PERFORMANCE_LIMITS.MEMORY_LEAK`
- Line 560: `for (const callCount of [1, 3, 5])` → `for (const callCount of SCALING_TEST_CALLS)`

---

## Files Requiring Completion

### 4. `/home/user/VueSip/tests/performance/load-tests/event-listeners.test.ts`

**Recommended Constants:**

```typescript
// Listener count test cases
const LISTENER_TEST_SIZES = {
  SMALL: 10, // Small listener count
  MEDIUM: 50, // Medium listener count
  LARGE: 100, // Large listener count
  VERY_LARGE: 500, // Very large listener count
} as const

// Performance multipliers for different listener counts
const PERFORMANCE_MULTIPLIERS = {
  SMALL: 5, // 5x multiplier for 50 listeners
  MEDIUM: 10, // 10x multiplier for 100 listeners
  LARGE: 50, // 50x multiplier for 500 listeners
} as const

// Event test configurations
const EVENT_TEST_CONFIG = {
  RAPID_EMISSIONS: 100, // Rapid successive emissions
  MULTI_EVENT_LISTENERS: 20, // Listeners per event type
  MULTI_EVENT_MULTIPLIER: 25, // Multiplier for multi-event test
} as const

// Cleanup performance thresholds (milliseconds)
const CLEANUP_THRESHOLDS = {
  HUNDRED_LISTENERS: 50, // 50ms for 100 listeners
  DESTROY_ALL: 10, // 10ms to destroy all
  REMOVE_ALL: 10, // 10ms to remove all
  DESTROY_MANY_EVENTS: 20, // 20ms to destroy many events
} as const

// Async handler delay
const ASYNC_HANDLER_DELAY = 1

// Scalability test sizes
const SCALABILITY_SIZES = [10, 50, 100, 500] as const
const SCALING_TOLERANCE = 10 // 10x tolerance for linear scaling

// Mixed operations test counts
const MIXED_OPERATIONS = {
  ADD_LISTENERS: 100, // Regular listeners to add
  ADD_ONCE_LISTENERS: 100, // Once listeners to add
  CALL_INCOMING_LISTENERS: 50, // Call:incoming listeners
  TOTAL_THRESHOLD: 100, // Total operation threshold (ms)
} as const

// Error handling test counts
const ERROR_HANDLING = {
  FAILING_HANDLERS: 50, // Handlers that throw
  SUCCESSFUL_HANDLERS: 50, // Successful handlers
  ASYNC_FAILING: 25, // Async failing handlers
  ASYNC_SUCCESSFUL: 25, // Async successful handlers
} as const

// Memory leak test
const MEMORY_LEAK_ITERATIONS = 100
```

**Key Lines to Replace:**

- Lines 64, 80, 97, 114: listener counts (10, 50, 100, 500)
- Lines 92, 109, 126, 157: performance multipliers
- Line 252: `emitCount = 100`
- Line 306, 345, 357, 387, 463: cleanup thresholds
- Line 398: `listenerCounts = [10, 50, 100, 500]`

---

### 5. `/home/user/VueSip/tests/performance/load-tests/large-call-history.test.ts`

**Recommended Constants:**

```typescript
// History size test cases
const HISTORY_TEST_SIZES = {
  SMALL: 100, // Small history
  MEDIUM: 500, // Medium history
  LARGE: 1000, // Large history
  VERY_LARGE: 5000, // Very large history
} as const

// Performance thresholds (milliseconds)
const PERFORMANCE_THRESHOLDS = {
  SMALL_HISTORY: 50, // 50ms for 100 entries
  MEDIUM_HISTORY: 100, // 100ms for 500 entries
  LARGE_HISTORY: 200, // 200ms for 1000 entries
  VERY_LARGE_HISTORY: 500, // 500ms for 5000 entries
  MAX_HISTORY: 250, // Max history size threshold
} as const

// Filtering and searching thresholds (milliseconds)
const OPERATION_THRESHOLDS = {
  BASIC_FILTER: 100, // Basic filtering
  MULTIPLE_FILTERS: 150, // Multiple filters
  SEARCH: 100, // Search operations
  SEARCH_WITH_FILTER: 150, // Search + filter
  SORTING: 150, // Sorting operations
  PAGINATION: 150, // Pagination
} as const

// Statistics computation thresholds (milliseconds)
const STATS_THRESHOLDS = {
  SMALL: 50, // 100 entries
  MEDIUM: 100, // 500 entries
  LARGE: 150, // 1000 entries
  VERY_LARGE: 300, // 5000 entries
} as const

// Pagination configurations
const PAGINATION = {
  SMALL_PAGE: 10, // Small page size
  MEDIUM_PAGE: 50, // Medium page size
  LARGE_OFFSET: 900, // Large offset for testing
  TOTAL_PAGES_TIME: 500, // Time for all pages (ms)
} as const

// Filter scaling test
const FILTER_SCALING_SIZES = [100, 500, 1000, 5000] as const
const SCALING_TOLERANCES = {
  RATIO_1: 10, // 500 vs 100
  RATIO_2: 5, // 1000 vs 500
  RATIO_3: 10, // 5000 vs 1000
} as const

// Concurrent operations
const CONCURRENT_OPS = {
  REPEATED_OPERATIONS: 100, // Repeated ops count
  DELETION_COUNT: 100, // Deletions to perform
  RAPID_FILTER_CHANGES: 100, // Filter change count
} as const

// General thresholds
const GENERAL_THRESHOLDS = {
  EMPTY_HISTORY: 10, // Empty history ops (ms)
  CLEANUP: 50, // Cleanup threshold (ms)
  DELETION: 100, // Deletion threshold (ms)
  CONCURRENT_READS: 200, // Concurrent reads (ms)
  FILTER_CHANGES: 50, // Filter changes (ms)
  LARGE_PAGE_REQUEST: 500, // Large page (ms)
} as const
```

**Key Lines to Replace:**

- Lines 128, 139, 150, 162: performance thresholds for different sizes
- Lines 194, 204, 214, 224, 238, 248: filter thresholds
- Line 269: `counts = [100, 500, 1000, 5000]`
- Lines 289-291: scaling tolerances
- Lines 508, 518, 528, 538: statistics thresholds
- Lines 440, 452: pagination configs
- Lines 580, 608, 657: concurrent operation counts

---

## Benefits of This Refactoring

1. **Self-Documenting Code**: Constants explain WHY specific values were chosen
2. **Easier Maintenance**: Change thresholds in one place
3. **Better Testing**: Clear relationship between test configurations
4. **Type Safety**: `as const` provides compile-time checking
5. **Consistency**: Similar tests use the same named values
6. **Onboarding**: New developers understand test parameters quickly

## Pattern Used

```typescript
// Group related constants logically
const CATEGORY_NAME = {
  /** JSDoc explaining why this specific value */
  CONSTANT_NAME: value,
} as const

// Use descriptive names that explain intent
// ✅ GOOD: RAPID_CALL_CREATION: 150
// ❌ BAD: CALLS: 150

// Add comments explaining thresholds
const MEMORY_THRESHOLDS = {
  EVENT_LISTENERS: 5 * 1024 * 1024, // 5 MB - based on expected event overhead
} as const
```

## Next Steps

To complete the refactoring for the remaining files:

1. **event-listeners.test.ts**: Add constants at the top, replace lines with listener counts, multipliers, and thresholds
2. **large-call-history.test.ts**: Add constants, replace all history sizes, thresholds, and iteration counts

The pattern is established - just follow the examples from rapid-operations.test.ts and memory-leaks.test.ts.
