/**
 * VueSip Plugin System
 *
 * Provides a comprehensive, extensible plugin architecture for VueSip with support for
 * lifecycle management, dependency resolution, version compatibility, hook-based extensibility,
 * and built-in plugins for analytics and call recording.
 *
 * ## Core Components
 *
 * - **{@link PluginManager}**: Central orchestrator for plugin lifecycle management
 *   - Handles plugin registration, installation, and uninstallation
 *   - Manages plugin dependencies and version compatibility
 *   - Coordinates plugin configuration updates
 *   - Provides plugin state tracking and statistics
 *
 * - **{@link HookManager}**: Event-driven extensibility system
 *   - Priority-based hook execution (Highest=1000 to Lowest=-1000)
 *   - Support for async/sync hook handlers
 *   - Plugin-specific hook registration and cleanup
 *   - Comprehensive hook statistics and debugging
 *
 * ## Built-in Plugins
 *
 * - **{@link AnalyticsPlugin}**: Usage analytics and event tracking
 *   - Configurable event batching and filtering
 *   - Automatic session tracking with user identification
 *   - Queue management with FIFO overflow handling
 *   - Wildcard pattern support for event filtering
 *
 * - **{@link RecordingPlugin}**: Call recording capabilities
 *   - Audio and video recording with MediaRecorder API
 *   - Automatic or manual recording control
 *   - IndexedDB storage with automatic cleanup
 *   - Configurable recording formats and quality
 *
 * ## Quick Start
 *
 * @example Basic plugin system setup
 * ```typescript
 * import { PluginManager, createAnalyticsPlugin, createRecordingPlugin } from '@/plugins'
 *
 * // Create plugin manager
 * const pluginManager = new PluginManager(
 *   sipClient,
 *   mediaManager,
 *   config,
 *   activeCalls,
 *   '1.0.0' // VueSip version
 * )
 *
 * // Register built-in plugins
 * await pluginManager.register(createAnalyticsPlugin(), {
 *   enabled: true,
 *   endpoint: 'https://analytics.example.com/events',
 *   batchEvents: true
 * })
 *
 * await pluginManager.register(createRecordingPlugin(), {
 *   enabled: true,
 *   autoStart: true,
 *   recordingOptions: { audio: true, video: false }
 * })
 * ```
 *
 * @example Creating a custom plugin
 * ```typescript
 * import type { VueSipPlugin } from '@/plugins/PluginManager'
 *
 * const myPlugin: VueSipPlugin = {
 *   name: 'my-custom-plugin',
 *   version: '1.0.0',
 *   description: 'Custom plugin for VueSip',
 *
 *   async install(context, config) {
 *     // Register hook handlers
 *     context.hooks.register('callStarted', async (data) => {
 *       console.log('Call started:', data.callId)
 *     }, { priority: 0 }, this.name)
 *   },
 *
 *   async uninstall(context) {
 *     // Cleanup is automatic - hook manager removes all hooks for this plugin
 *   }
 * }
 *
 * // Register custom plugin
 * await pluginManager.register(myPlugin, { enabled: true })
 * ```
 *
 * @example Using hook priorities
 * ```typescript
 * import { HookPriority } from '@/plugins/HookManager'
 *
 * // Critical validation - runs first
 * context.hooks.register('callStarted', async (data) => {
 *   if (!isValidCall(data)) throw new Error('Invalid call')
 * }, { priority: HookPriority.Highest }, 'validator-plugin')
 *
 * // Normal processing
 * context.hooks.register('callStarted', async (data) => {
 *   await setupCallResources(data)
 * }, { priority: HookPriority.Normal }, 'setup-plugin')
 *
 * // Final cleanup - runs last
 * context.hooks.register('callEnded', async (data) => {
 *   await logCallMetrics(data)
 * }, { priority: HookPriority.Lowest }, 'metrics-plugin')
 * ```
 *
 * ## Plugin Lifecycle
 *
 * Plugins progress through these states:
 * 1. **Registered**: Plugin added to manager, pending installation
 * 2. **Installing**: Plugin's install() method executing
 * 3. **Installed**: Plugin fully operational
 * 4. **Uninstalling**: Plugin's uninstall() method executing
 * 5. **Failed**: Installation or operation failed
 *
 * ## Hook Execution Model
 *
 * Hooks execute in strict priority order:
 * - **Highest (1000)**: Critical pre-processing, validation, blocking operations
 * - **High (500)**: Important setup, early intervention
 * - **Normal (0)**: Standard plugin operations (default)
 * - **Low (-500)**: Post-processing, cleanup
 * - **Lowest (-1000)**: Final cleanup, logging, auditing
 *
 * Within the same priority, hooks execute in registration order (FIFO).
 *
 * @packageDocumentation
 */

export { HookManager } from './HookManager'
export { PluginManager } from './PluginManager'

// Built-in plugins
export { AnalyticsPlugin, createAnalyticsPlugin } from './AnalyticsPlugin'
export { RecordingPlugin, createRecordingPlugin } from './RecordingPlugin'
