/**
 * Constants for Agent Testing Framework
 *
 * Centralized configuration values to avoid magic numbers
 */

/**
 * Timing constants (all values in milliseconds)
 */
export const TIMING = {
  /** Delay to allow event processing in async operations */
  EVENT_PROCESSING_DELAY: 50,

  /** Polling interval for checking conditions */
  POLLING_INTERVAL: 100,

  /** Default timeout for waiting operations */
  DEFAULT_WAIT_TIMEOUT: 5000,

  /** Delay before cleanup to ensure all operations complete */
  CLEANUP_DELAY: 150,

  /** Network latency buffer for tests */
  NETWORK_LATENCY_BUFFER: 200,
} as const

/**
 * Collection size limits to prevent unbounded growth
 */
export const LIMITS = {
  /** Maximum number of events to store in NetworkSimulator */
  MAX_NETWORK_EVENTS: 1000,

  /** Maximum number of messages to store per agent */
  MAX_MESSAGES: 500,

  /** Maximum number of errors to track per agent */
  MAX_ERRORS: 100,
} as const

/**
 * Network simulation constants
 */
export const NETWORK = {
  /** Minimum latency in milliseconds */
  MIN_LATENCY: 0,

  /** Maximum latency in milliseconds */
  MAX_LATENCY: 10000,

  /** Minimum packet loss percentage */
  MIN_PACKET_LOSS: 0,

  /** Maximum packet loss percentage */
  MAX_PACKET_LOSS: 100,

  /** Minimum bandwidth in kbps */
  MIN_BANDWIDTH: 0,

  /** Maximum bandwidth in kbps */
  MAX_BANDWIDTH: 1000000,
} as const

/**
 * Default configuration values
 */
export const DEFAULTS = {
  /** Default WebSocket server URI */
  WS_SERVER: 'wss://sip.example.com',

  /** Default SIP domain */
  SIP_DOMAIN: 'example.com',

  /** Default password for test agents */
  DEFAULT_PASSWORD: 'password',

  /** Default display name suffix */
  DISPLAY_NAME_SUFFIX: '',
} as const
