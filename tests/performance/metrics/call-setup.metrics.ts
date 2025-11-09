/**
 * Call Setup Performance Metrics
 *
 * Measures and validates call setup performance against budgets.
 * Collects statistical data to identify performance regressions.
 *
 * Run with: pnpm vitest tests/performance/metrics
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  measureTime,
  measureMultiple,
  assertWithinTimeBudget,
  assertMetricsWithinBudget,
  trackMemory,
  PERFORMANCE_BUDGETS,
  printTimingResult,
  printMetrics,
} from '../setup'
import { EventBus } from '../../../src/core/EventBus'
import { SessionManager } from '../../../src/core/SessionManager'
import { createMockRTCSession } from '../../utils/test-helpers'
import { PERFORMANCE } from '../../../src/utils/constants'

// Call setup specific performance budgets based on PERFORMANCE constants
const CALL_SETUP_BUDGETS = {
  SESSION_CREATION: PERFORMANCE.MAX_EVENT_PROPAGATION_TIME, // 10ms - very fast operation
  STD_DEV_THRESHOLD: PERFORMANCE.MAX_EVENT_PROPAGATION_TIME / 2, // 5ms - low variance expected
  AVERAGE_LATENCY: PERFORMANCE.MAX_EVENT_PROPAGATION_TIME * 2, // 20ms - average operation time
  P95_LATENCY: PERFORMANCE.MAX_EVENT_PROPAGATION_TIME * 3, // 30ms - 95th percentile
  P99_LATENCY: PERFORMANCE.MAX_STATE_UPDATE_LATENCY, // 50ms - 99th percentile
  MAX_LATENCY: PERFORMANCE.MAX_STATE_UPDATE_LATENCY * 2, // 100ms - maximum acceptable
  MAX_MIN_RATIO: 10, // Maximum ratio between slowest and fastest operations
  MEMORY_DELTA_MB: 5, // Maximum memory growth in MB
} as const

describe('Call Setup Performance Metrics', () => {
  let eventBus: EventBus
  let sessionManager: SessionManager

  beforeEach(() => {
    eventBus = new EventBus()
    sessionManager = new SessionManager(eventBus)
  })

  afterEach(() => {
    sessionManager.cleanup()
  })

  // ============================================================================
  // Single Operation Timing
  // ============================================================================

  it('should create session within time budget', async () => {
    const result = await measureTime(
      'session-creation',
      async () => {
        const session = createMockRTCSession()
        sessionManager.addSession(session)
        return session
      },
      { trackMemory: true }
    )

    printTimingResult(result)

    // Session creation should be very fast
    expect(result.duration).toBeLessThan(CALL_SETUP_BUDGETS.SESSION_CREATION)
  })

  it('should emit events within time budget', async () => {
    const session = createMockRTCSession()
    sessionManager.addSession(session)

    const result = await measureTime(
      'event-emission',
      () => {
        eventBus.emit('call:incoming', { sessionId: session.id })
      },
      { trackMemory: true }
    )

    printTimingResult(result)

    assertWithinTimeBudget(result, PERFORMANCE_BUDGETS.eventPropagationTime)
  })

  // ============================================================================
  // Statistical Performance Analysis
  // ============================================================================

  it('should maintain consistent session creation performance', async () => {
    const metrics = await measureMultiple(
      'session-creation-consistency',
      async () => {
        const session = createMockRTCSession()
        sessionManager.addSession(session)
        sessionManager.removeSession(session.id)
      },
      1000 // 1000 iterations
    )

    printMetrics(metrics)

    // Validate P95 is within budget
    assertMetricsWithinBudget(metrics, PERFORMANCE_BUDGETS.stateUpdateLatency, 'p95')

    // Check consistency (low standard deviation)
    expect(metrics.stdDev).toBeLessThan(CALL_SETUP_BUDGETS.STD_DEV_THRESHOLD)
  })

  it('should maintain fast event propagation under load', async () => {
    // Add some listeners to simulate realistic conditions
    for (let i = 0; i < 10; i++) {
      eventBus.on('call:incoming', () => {
        // Simulate some work
        const start = performance.now()
        while (performance.now() - start < 0.1) {
          // Busy wait for 0.1ms
        }
      })
    }

    const metrics = await measureMultiple(
      'event-propagation-with-listeners',
      () => {
        eventBus.emit('call:incoming', { data: 'test' })
      },
      1000
    )

    printMetrics(metrics)

    // P99 should still be within budget even with listeners
    assertMetricsWithinBudget(metrics, PERFORMANCE_BUDGETS.eventPropagationTime, 'p99')
  })

  // ============================================================================
  // Memory Performance Metrics
  // ============================================================================

  it('should track memory usage during session lifecycle', async () => {
    const memoryResult = await trackMemory(async () => {
      // Create and manage multiple sessions
      const sessions = Array.from({ length: 10 }, () => createMockRTCSession())

      sessions.forEach((session) => {
        sessionManager.addSession(session)
        eventBus.emit('call:incoming', { sessionId: session.id })
      })

      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 100))

      sessions.forEach((session) => {
        eventBus.emit('call:terminated', { sessionId: session.id })
        sessionManager.removeSession(session.id)
      })
    })

    console.log(`\n📊 Memory Usage:`)
    console.log(
      `   Before: ${(memoryResult.memoryBefore.usedHeapSize / 1024 / 1024).toFixed(2)} MB`
    )
    console.log(`   After: ${(memoryResult.memoryAfter.usedHeapSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`   Delta: ${(memoryResult.memoryDelta / 1024 / 1024).toFixed(2)} MB`)

    // Memory delta should be minimal after cleanup
    expect(memoryResult.memoryDelta).toBeLessThan(CALL_SETUP_BUDGETS.MEMORY_DELTA_MB * 1024 * 1024)
  })

  // ============================================================================
  // Percentile Analysis
  // ============================================================================

  it('should analyze session management latency distribution', async () => {
    const metrics = await measureMultiple(
      'session-management-latency',
      async () => {
        const session = createMockRTCSession()
        sessionManager.addSession(session)

        // Emit multiple events
        eventBus.emit('call:ringing', { sessionId: session.id })
        eventBus.emit('call:accepted', { sessionId: session.id })
        eventBus.emit('call:terminated', { sessionId: session.id })

        sessionManager.removeSession(session.id)
      },
      500
    )

    printMetrics(metrics)

    // Validate different percentiles
    expect(metrics.average).toBeLessThan(CALL_SETUP_BUDGETS.AVERAGE_LATENCY)
    expect(metrics.p95).toBeLessThan(CALL_SETUP_BUDGETS.P95_LATENCY)
    expect(metrics.p99).toBeLessThan(CALL_SETUP_BUDGETS.P99_LATENCY)
    expect(metrics.max).toBeLessThan(CALL_SETUP_BUDGETS.MAX_LATENCY)

    // Distribution should be relatively tight
    expect(metrics.max / metrics.min).toBeLessThan(CALL_SETUP_BUDGETS.MAX_MIN_RATIO)
  })

  // ============================================================================
  // Warm-up Effects Analysis
  // ============================================================================

  it('should demonstrate JIT warm-up benefits', async () => {
    // Measure cold start
    const coldMetrics = await measureMultiple(
      'cold-start',
      async () => {
        const session = createMockRTCSession()
        sessionManager.addSession(session)
        sessionManager.removeSession(session.id)
      },
      10 // Just 10 iterations
    )

    // Warm up (let JIT optimize)
    for (let i = 0; i < 100; i++) {
      const session = createMockRTCSession()
      sessionManager.addSession(session)
      sessionManager.removeSession(session.id)
    }

    // Measure after warm-up
    const warmMetrics = await measureMultiple(
      'warm-start',
      async () => {
        const session = createMockRTCSession()
        sessionManager.addSession(session)
        sessionManager.removeSession(session.id)
      },
      100
    )

    console.log(`\n📊 JIT Warm-up Analysis:`)
    console.log(`   Cold Average: ${coldMetrics.average.toFixed(2)}ms`)
    console.log(`   Warm Average: ${warmMetrics.average.toFixed(2)}ms`)
    console.log(
      `   Improvement: ${(((coldMetrics.average - warmMetrics.average) / coldMetrics.average) * 100).toFixed(1)}%`
    )

    // Warm-up should improve performance (or at least not regress)
    expect(warmMetrics.average).toBeLessThanOrEqual(coldMetrics.average * 1.1)
  })
})
