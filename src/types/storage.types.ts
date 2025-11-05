/**
 * Storage Type Definitions
 *
 * Defines types for storage adapters and persistence layer.
 * Supports multiple storage backends (LocalStorage, SessionStorage, IndexedDB)
 * with optional encryption for sensitive data.
 *
 * @module types/storage
 */

/**
 * Storage operation result
 */
export interface StorageResult<T = unknown> {
  /** Whether the operation succeeded */
  success: boolean
  /** The data (if successful) */
  data?: T
  /** Error message (if failed) */
  error?: string
}

/**
 * Storage adapter interface
 *
 * All storage adapters must implement this interface
 */
export interface StorageAdapter {
  /** Adapter name (for debugging) */
  readonly name: string

  /**
   * Get a value from storage
   * @param key - Storage key
   * @returns Promise resolving to the value or null if not found
   */
  get<T = unknown>(key: string): Promise<StorageResult<T>>

  /**
   * Set a value in storage
   * @param key - Storage key
   * @param value - Value to store
   * @returns Promise resolving to success status
   */
  set<T = unknown>(key: string, value: T): Promise<StorageResult<void>>

  /**
   * Remove a value from storage
   * @param key - Storage key
   * @returns Promise resolving to success status
   */
  remove(key: string): Promise<StorageResult<void>>

  /**
   * Clear all values from storage (with optional prefix filter)
   * @param prefix - Optional prefix to filter keys
   * @returns Promise resolving to success status
   */
  clear(prefix?: string): Promise<StorageResult<void>>

  /**
   * Check if a key exists in storage
   * @param key - Storage key
   * @returns Promise resolving to true if key exists
   */
  has(key: string): Promise<boolean>

  /**
   * Get all keys in storage (with optional prefix filter)
   * @param prefix - Optional prefix to filter keys
   * @returns Promise resolving to array of keys
   */
  keys(prefix?: string): Promise<string[]>
}

/**
 * Storage encryption options
 */
export interface EncryptionOptions {
  /** Whether to encrypt the data */
  enabled: boolean
  /** Encryption algorithm (default: AES-GCM) */
  algorithm?: 'AES-GCM' | 'AES-CBC'
  /** Key derivation function iterations (default: 100000) */
  iterations?: number
  /** Salt for key derivation (will be generated if not provided) */
  salt?: string
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  /** Encrypted data as base64 string */
  data: string
  /** Initialization vector as base64 string */
  iv: string
  /** Salt used for key derivation as base64 string */
  salt: string
  /** Algorithm used */
  algorithm: string
  /** Key derivation iterations */
  iterations: number
  /** Version (for future migrations) */
  version: number
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  /** Storage key prefix (default: 'vuesip') */
  prefix?: string
  /** Storage version (for migrations, default: '1') */
  version?: string
  /** Encryption configuration for sensitive data */
  encryption?: EncryptionOptions
}

/**
 * Storage key constants
 *
 * All storage keys use the namespace pattern: vuesip:{version}:{category}:{key}
 */
export const STORAGE_KEYS = {
  /** SIP configuration (encrypted) */
  SIP_CONFIG: 'sip:config',
  /** SIP credentials (encrypted) */
  SIP_CREDENTIALS: 'sip:credentials',
  /** Media configuration */
  MEDIA_CONFIG: 'media:config',
  /** User preferences */
  USER_PREFERENCES: 'user:preferences',
  /** Selected audio input device */
  DEVICE_AUDIO_INPUT: 'device:audio-input',
  /** Selected audio output device */
  DEVICE_AUDIO_OUTPUT: 'device:audio-output',
  /** Selected video input device */
  DEVICE_VIDEO_INPUT: 'device:video-input',
  /** Device permissions status */
  DEVICE_PERMISSIONS: 'device:permissions',
  /** Call history (IndexedDB) */
  CALL_HISTORY: 'call:history',
  /** Registration state */
  REGISTRATION_STATE: 'registration:state',
  /** Last registration time */
  REGISTRATION_LAST_TIME: 'registration:last-time',
} as const

/**
 * Storage key type
 */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

/**
 * Stored SIP credentials (to be encrypted)
 */
export interface StoredSipCredentials {
  /** SIP username */
  username: string
  /** SIP password */
  password: string
  /** Authorization username (if different from username) */
  authorizationUsername?: string
  /** HA1 hash (if using pre-computed hash) */
  ha1?: string
}

/**
 * Stored SIP configuration (to be encrypted)
 */
export interface StoredSipConfig {
  /** WebSocket URI */
  uri: string
  /** Credentials */
  credentials: StoredSipCredentials
  /** Display name */
  displayName?: string
  /** Contact URI */
  contactUri?: string
  /** Instance ID */
  instanceId?: string
}

/**
 * Stored media configuration
 */
export interface StoredMediaConfig {
  /** Audio constraints */
  audio?: MediaTrackConstraints
  /** Video constraints */
  video?: MediaTrackConstraints | boolean
  /** STUN/TURN servers */
  iceServers?: RTCIceServer[]
}

/**
 * Stored user preferences
 */
export interface StoredUserPreferences {
  /** Auto-answer incoming calls */
  autoAnswer?: boolean
  /** Auto-answer delay in milliseconds */
  autoAnswerDelay?: number
  /** Enable audio by default */
  enableAudio?: boolean
  /** Enable video by default */
  enableVideo?: boolean
  /** Enable call history */
  enableCallHistory?: boolean
  /** Call history max entries */
  callHistoryMaxEntries?: number
  /** Enable debug logging */
  debug?: boolean
}

/**
 * Stored device selection
 */
export interface StoredDeviceSelection {
  /** Selected audio input device ID */
  audioInput?: string
  /** Selected audio output device ID */
  audioOutput?: string
  /** Selected video input device ID */
  videoInput?: string
}

/**
 * Stored device permissions
 */
export interface StoredDevicePermissions {
  /** Microphone permission status */
  microphone: 'granted' | 'denied' | 'prompt' | 'not-requested'
  /** Camera permission status */
  camera: 'granted' | 'denied' | 'prompt' | 'not-requested'
  /** Speaker permission status */
  speaker: 'granted' | 'denied' | 'prompt' | 'not-requested'
  /** Last updated timestamp */
  lastUpdated: number
}
