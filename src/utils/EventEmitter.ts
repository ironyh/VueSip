/**
 * EventEmitter - Simple type-safe event emitter
 *
 * Provides a lightweight event emitter implementation with TypeScript support.
 * Used as a base for adapters and other event-driven components.
 */

export type EventHandler<T = any> = (data: T) => void

/**
 * EventEmitter base class
 *
 * Provides event subscription, emission, and cleanup capabilities.
 */
export class EventEmitter<TEvents extends Record<string, any> = Record<string, any>> {
  private listeners: Map<keyof TEvents, Set<EventHandler>> = new Map()

  /**
   * Subscribe to an event
   *
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  on<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }

    const handlers = this.listeners.get(event)!
    handlers.add(handler)

    // Return unsubscribe function
    return () => {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.listeners.delete(event)
      }
    }
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first emission)
   *
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  once<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void {
    const wrappedHandler = (data: TEvents[K]) => {
      handler(data)
      unsubscribe()
    }

    const unsubscribe = this.on(event, wrappedHandler)
    return unsubscribe
  }

  /**
   * Unsubscribe from an event
   *
   * @param event - Event name
   * @param handler - Event handler function to remove (optional - removes all if not specified)
   */
  off<K extends keyof TEvents>(event: K, handler?: EventHandler<TEvents[K]>): void {
    const handlers = this.listeners.get(event)
    if (!handlers) return

    if (handler) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.listeners.delete(event)
      }
    } else {
      // Remove all handlers for this event
      this.listeners.delete(event)
    }
  }

  /**
   * Emit an event
   *
   * @param event - Event name
   * @param data - Event data
   */
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    const handlers = this.listeners.get(event)
    if (!handlers) return

    // Create a copy of handlers to avoid issues if handlers modify the set during iteration
    const handlersArray = Array.from(handlers)
    for (const handler of handlersArray) {
      try {
        handler(data)
      } catch (error) {
        console.error(`Error in event handler for "${String(event)}":`, error)
      }
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.listeners.clear()
  }

  /**
   * Get the number of listeners for an event
   *
   * @param event - Event name
   * @returns Number of listeners
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    const handlers = this.listeners.get(event)
    return handlers ? handlers.size : 0
  }

  /**
   * Get all event names that have listeners
   *
   * @returns Array of event names
   */
  eventNames(): Array<keyof TEvents> {
    return Array.from(this.listeners.keys())
  }
}
