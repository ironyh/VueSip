/**
 * SIP Adapter Factory
 *
 * Factory for creating SIP adapter instances based on configuration.
 * Supports multiple SIP libraries through a unified adapter interface.
 */

import type { ISipAdapter, AdapterConfig } from './types'
import type { SipClientConfig } from '../types'

/**
 * Adapter Factory Class
 *
 * Creates and configures SIP adapter instances based on the selected library.
 */
export class AdapterFactory {
  /**
   * Create a SIP adapter instance
   *
   * @param sipConfig - SIP client configuration
   * @param adapterConfig - Adapter selection configuration
   * @returns Configured SIP adapter instance
   *
   * @example
   * ```typescript
   * // Using JsSIP (default)
   * const adapter = await AdapterFactory.createAdapter(sipConfig, {
   *   library: 'jssip'
   * })
   *
   * // Using SIP.js
   * const adapter = await AdapterFactory.createAdapter(sipConfig, {
   *   library: 'sipjs'
   * })
   *
   * // Using custom adapter
   * const adapter = await AdapterFactory.createAdapter(sipConfig, {
   *   library: 'custom',
   *   customAdapter: myCustomAdapter
   * })
   * ```
   */
  static async createAdapter(
    sipConfig: SipClientConfig,
    adapterConfig: AdapterConfig
  ): Promise<ISipAdapter> {
    let adapter: ISipAdapter

    switch (adapterConfig.library) {
      case 'jssip': {
        // TODO: Implement JsSIP adapter
        // Dynamically import JsSIP adapter when implemented
        // const { JsSipAdapter } = await import('./jssip/JsSipAdapter')
        // adapter = new JsSipAdapter(adapterConfig.libraryOptions)
        throw new Error(
          'JsSIP adapter is not yet implemented. Use the core SipClient directly for now.'
        )
      }

      case 'sipjs': {
        // TODO: Implement SIP.js adapter
        // Dynamically import SIP.js adapter when implemented
        // const { SipJsAdapter } = await import('./sipjs/SipJsAdapter')
        // adapter = new SipJsAdapter(adapterConfig.libraryOptions)
        throw new Error(
          'SIP.js adapter is not yet implemented. Use the core SipClient directly for now.'
        )
      }

      case 'custom': {
        if (!adapterConfig.customAdapter) {
          throw new Error(
            'Custom adapter must be provided when library is set to "custom"'
          )
        }
        adapter = adapterConfig.customAdapter
        break
      }

      default: {
        const exhaustiveCheck: never = adapterConfig.library
        throw new Error(`Unsupported adapter library: ${exhaustiveCheck}`)
      }
    }

    // Initialize the adapter with SIP configuration
    await adapter.initialize(sipConfig)

    return adapter
  }

  /**
   * Check if a SIP library is available
   *
   * @param library - Library name to check
   * @returns True if the library adapter is available
   */
  static async isLibraryAvailable(_library: 'jssip' | 'sipjs'): Promise<boolean> {
    // TODO: Re-enable when adapters are implemented
    // try {
    //   switch (library) {
    //     case 'jssip': {
    //       await import('./jssip/JsSipAdapter')
    //       return true
    //     }
    //     case 'sipjs': {
    //       await import('./sipjs/SipJsAdapter')
    //       return true
    //     }
    //     default:
    //       return false
    //   }
    // } catch (error) {
    //   return false
    // }
    return false // Adapters not yet implemented
  }

  /**
   * Get available SIP libraries
   *
   * @returns Array of available library names
   */
  static async getAvailableLibraries(): Promise<Array<'jssip' | 'sipjs'>> {
    const libraries: Array<'jssip' | 'sipjs'> = []

    if (await AdapterFactory.isLibraryAvailable('jssip')) {
      libraries.push('jssip')
    }

    if (await AdapterFactory.isLibraryAvailable('sipjs')) {
      libraries.push('sipjs')
    }

    return libraries
  }

  /**
   * Get adapter information
   *
   * @param library - Library to get info for
   * @returns Adapter metadata
   */
  static async getAdapterInfo(
    library: 'jssip' | 'sipjs'
  ): Promise<{
    adapterName: string
    adapterVersion: string
    libraryName: string
    libraryVersion: string
  } | null> {
    try {
      // Create a temporary instance to get metadata
      const tempConfig: SipClientConfig = {
        uri: 'wss://example.com',
        sipUri: 'sip:temp@example.com',
        password: 'temp',
      }

      const adapter = await AdapterFactory.createAdapter(tempConfig, {
        library,
      })

      const info = {
        adapterName: adapter.adapterName,
        adapterVersion: adapter.adapterVersion,
        libraryName: adapter.libraryName,
        libraryVersion: adapter.libraryVersion,
      }

      // Clean up
      await adapter.destroy()

      return info
    } catch (error) {
      return null
    }
  }
}

/**
 * Convenience function to create an adapter
 *
 * @param sipConfig - SIP client configuration
 * @param library - SIP library to use (default: 'jssip')
 * @returns Configured SIP adapter instance
 */
export async function createSipAdapter(
  sipConfig: SipClientConfig,
  library: 'jssip' | 'sipjs' = 'jssip'
): Promise<ISipAdapter> {
  return AdapterFactory.createAdapter(sipConfig, { library })
}
