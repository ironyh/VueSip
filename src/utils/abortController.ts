/**
 * AbortController utility functions for async operation cancellation
 * @packageDocumentation
 */

/**
 * Create a standard abort error
 * @param message - Error message
 * @returns DOMException with 'AbortError' name
 */
export function createAbortError(message = 'Operation aborted'): DOMException {
  return new DOMException(message, 'AbortError')
}

/**
 * Check if an error is an abort error
 * @param error - Error to check
 * @returns True if error is an AbortError
 */
export function isAbortError(error: unknown): error is DOMException {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * Sleep for a duration with abort support
 * @param ms - Milliseconds to sleep
 * @param signal - Optional abort signal
 * @returns Promise that resolves after the duration or rejects if aborted
 * @example
 * ```typescript
 * const controller = new AbortController()
 * try {
 *   await abortableSleep(1000, controller.signal)
 * } catch (error) {
 *   if (isAbortError(error)) {
 *     console.log('Sleep was aborted')
 *   }
 * }
 * ```
 */
export function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError())
      return
    }

    const abortHandler = () => {
      clearTimeout(timeoutId)
      reject(createAbortError())
    }

    const timeoutId = setTimeout(() => {
      // Clean up event listener when timeout completes successfully
      signal?.removeEventListener('abort', abortHandler)
      resolve()
    }, ms)

    signal?.addEventListener('abort', abortHandler, { once: true })
  })
}

/**
 * Throw if signal is aborted
 * @param signal - Optional abort signal
 * @throws DOMException if signal is aborted
 */
export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createAbortError()
  }
}
