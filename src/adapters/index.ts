/**
 * SIP Adapters Export
 *
 * This module exports the adapter interfaces, factory, and types
 * for SIP library abstraction in VueSip.
 */

export type {
  ISipAdapter,
  ICallSession,
  AdapterConfig,
  CallOptions,
  AnswerOptions,
  DTMFOptions,
  RenegotiateOptions,
  CallStatistics,
  AdapterEvents,
  CallSessionEvents,
} from './types'

export { AdapterFactory, createSipAdapter } from './AdapterFactory'
