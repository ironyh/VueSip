/**
 * EventBus Performance Benchmarks
 *
 * Micro-benchmarks for the EventBus implementation.
 * These tests compare different EventBus operations to identify bottlenecks.
 *
 * Run with: pnpm vitest tests/performance/benchmarks
 */

import { describe, bench, beforeEach, afterEach } from 'vitest'
import { EventBus } from '../../../src/core/EventBus'

describe('EventBus Performance', () => {
  let eventBus: EventBus

  beforeEach(() => {
    eventBus = new EventBus()
  })

  afterEach(async () => {
    const result = eventBus.destroy()
    if (result && typeof result.then === 'function') {
      await result
    }
  })

  // ============================================================================
  // Event Emission Benchmarks
  // ============================================================================

  bench('emit event with no listeners', () => {
    eventBus.emit('test:event', { data: 'test' })
  })

  bench('emit event with 1 listener', () => {
    const off = eventBus.on('test:event', () => {})
    eventBus.emit('test:event', { data: 'test' })
    off()
  })

  bench('emit event with 10 listeners', () => {
    const offs: (() => void)[] = []
    for (let i = 0; i < 10; i++) {
      offs.push(eventBus.on('test:event', () => {}))
    }
    eventBus.emit('test:event', { data: 'test' })

    // Cleanup
    offs.forEach((off) => off())
  })

  bench('emit event with 100 listeners', () => {
    const offs: (() => void)[] = []
    for (let i = 0; i < 100; i++) {
      offs.push(eventBus.on('test:event', () => {}))
    }
    eventBus.emit('test:event', { data: 'test' })

    // Cleanup
    offs.forEach((off) => off())
  })

  // ============================================================================
  // Listener Registration Benchmarks
  // ============================================================================

  bench('register listener with on()', () => {
    const off = eventBus.on('test:event', () => {})
    off()
  })

  bench('register listener with once()', () => {
    const off = eventBus.once('test:event', () => {})
    off()
  })

  bench('register and unregister listener', () => {
    const off = eventBus.on('test:event', () => {})
    off()
  })

  // ============================================================================
  // Listener Count Benchmarks
  // ============================================================================

  bench('listenerCount with no listeners', () => {
    eventBus.listenerCount('test:event')
  })

  bench('listenerCount with 10 listeners', () => {
    const offs: (() => void)[] = []
    for (let i = 0; i < 10; i++) {
      offs.push(eventBus.on('test:event', () => {}))
    }
    eventBus.listenerCount('test:event')

    // Cleanup
    offs.forEach((off) => off())
  })

  // ============================================================================
  // Wildcard Event Benchmarks
  // ============================================================================

  bench('emit wildcard event with no listeners', () => {
    eventBus.emit('call:*', { data: 'test' })
  })

  bench('emit specific event with wildcard listener', () => {
    const off = eventBus.on('call:*', () => {})
    eventBus.emit('call:incoming', { data: 'test' })
    off()
  })

  // ============================================================================
  // Complex Event Data Benchmarks
  // ============================================================================

  bench('emit event with small payload (1 KB)', () => {
    const payload = { data: 'x'.repeat(1024) }
    eventBus.emit('test:event', payload)
  })

  bench('emit event with large payload (100 KB)', () => {
    const payload = { data: 'x'.repeat(100 * 1024) }
    eventBus.emit('test:event', payload)
  })

  // ============================================================================
  // Memory Management Benchmarks
  // ============================================================================

  bench('add and remove 100 listeners', () => {
    const handlers = []
    for (let i = 0; i < 100; i++) {
      const off = eventBus.on('test:event', () => {})
      handlers.push(off)
    }
    handlers.forEach((off) => off())
  })
})
