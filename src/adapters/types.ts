/**
 * SIP Adapter Types
 *
 * This module defines the adapter interfaces that allow VueSip to work
 * with different SIP libraries (JsSIP, SIP.js, etc.) through a unified API.
 *
 * The adapter pattern provides:
 * - Library-agnostic SIP operations
 * - Runtime library selection
 * - Consistent event model
 * - Type safety across adapters
 */

import type { EventEmitter } from '../utils/EventEmitter'
import type {
  SipClientConfig,
  ConnectionState,
  RegistrationState,
  CallDirection,
  CallState,
} from '../types'

/**
 * Configuration for SIP adapter selection
 */
export interface AdapterConfig {
  /**
   * SIP library to use
   * - 'jssip': JsSIP library (default)
   * - 'sipjs': SIP.js library
   * - 'custom': Custom adapter implementation
   */
  library: 'jssip' | 'sipjs' | 'custom'

  /**
   * Custom adapter instance (when library is 'custom')
   */
  customAdapter?: ISipAdapter

  /**
   * Library-specific configuration options
   */
  libraryOptions?: Record<string, any>
}

/**
 * SIP Adapter Interface
 *
 * This interface defines the contract that all SIP library adapters must implement.
 * It provides a unified API for SIP operations regardless of the underlying library.
 */
export interface ISipAdapter extends EventEmitter {
  /**
   * Adapter metadata
   */
  readonly adapterName: string
  readonly adapterVersion: string
  readonly libraryName: string
  readonly libraryVersion: string

  /**
   * Connection state
   */
  readonly isConnected: boolean
  readonly connectionState: ConnectionState

  /**
   * Registration state
   */
  readonly isRegistered: boolean
  readonly registrationState: RegistrationState

  /**
   * Initialize the adapter with configuration
   */
  initialize(config: SipClientConfig): Promise<void>

  /**
   * Connect to the SIP server
   */
  connect(): Promise<void>

  /**
   * Disconnect from the SIP server
   */
  disconnect(): Promise<void>

  /**
   * Register with the SIP server
   */
  register(): Promise<void>

  /**
   * Unregister from the SIP server
   */
  unregister(): Promise<void>

  /**
   * Make an outgoing call
   *
   * @param target - SIP URI or phone number to call
   * @param options - Call options (audio, video, etc.)
   * @returns Call session instance
   */
  call(target: string, options?: CallOptions): Promise<ICallSession>

  /**
   * Send a SIP MESSAGE
   *
   * @param target - Destination SIP URI
   * @param content - Message content
   * @param contentType - Content type (default: 'text/plain')
   */
  sendMessage(target: string, content: string, contentType?: string): Promise<void>

  /**
   * Send DTMF tones on active call
   *
   * @param callId - Call session ID
   * @param tone - DTMF tone(s) to send
   */
  sendDTMF(callId: string, tone: string): Promise<void>

  /**
   * Subscribe to presence updates
   *
   * @param target - SIP URI to subscribe to
   * @param expires - Subscription duration in seconds
   */
  subscribe(target: string, event: string, expires?: number): Promise<void>

  /**
   * Unsubscribe from presence updates
   *
   * @param target - SIP URI to unsubscribe from
   */
  unsubscribe(target: string, event: string): Promise<void>

  /**
   * Publish presence information
   *
   * @param event - Event type (e.g., 'presence')
   * @param state - Presence state
   */
  publish(event: string, state: any): Promise<void>

  /**
   * Get active call sessions
   */
  getActiveCalls(): ICallSession[]

  /**
   * Get call session by ID
   */
  getCallSession(callId: string): ICallSession | null

  /**
   * Cleanup and destroy the adapter
   */
  destroy(): Promise<void>
}

/**
 * Call Session Interface
 *
 * Represents an individual SIP call session with standardized operations
 * across different SIP libraries.
 */
export interface ICallSession extends EventEmitter {
  /**
   * Unique session identifier
   */
  readonly id: string

  /**
   * Call direction
   */
  readonly direction: CallDirection

  /**
   * Call state
   */
  readonly state: CallState

  /**
   * Remote party URI
   */
  readonly remoteUri: string

  /**
   * Remote party display name
   */
  readonly remoteDisplayName: string | null

  /**
   * Call start time (when call was established)
   */
  readonly startTime: Date | null

  /**
   * Call end time
   */
  readonly endTime: Date | null

  /**
   * Call duration in seconds
   */
  readonly duration: number

  /**
   * Local media stream
   */
  readonly localStream: MediaStream | null

  /**
   * Remote media stream
   */
  readonly remoteStream: MediaStream | null

  /**
   * Whether call is on hold
   */
  readonly isOnHold: boolean

  /**
   * Whether call is muted
   */
  readonly isMuted: boolean

  /**
   * Answer incoming call
   *
   * @param options - Answer options (audio, video, etc.)
   */
  answer(options?: AnswerOptions): Promise<void>

  /**
   * Reject/decline incoming call
   *
   * @param statusCode - SIP status code (default: 486 Busy Here)
   */
  reject(statusCode?: number): Promise<void>

  /**
   * Terminate/hang up the call
   */
  terminate(): Promise<void>

  /**
   * Put call on hold
   */
  hold(): Promise<void>

  /**
   * Resume call from hold
   */
  unhold(): Promise<void>

  /**
   * Mute local audio
   */
  mute(): Promise<void>

  /**
   * Unmute local audio
   */
  unmute(): Promise<void>

  /**
   * Send DTMF tone(s)
   *
   * @param tone - DTMF tone(s) to send (0-9, *, #, A-D)
   * @param options - DTMF options (duration, gap)
   */
  sendDTMF(tone: string, options?: DTMFOptions): Promise<void>

  /**
   * Transfer call (blind transfer)
   *
   * @param target - SIP URI to transfer to
   */
  transfer(target: string): Promise<void>

  /**
   * Transfer call (attended/supervised transfer)
   *
   * @param target - Call session to transfer to
   */
  attendedTransfer(target: ICallSession): Promise<void>

  /**
   * Renegotiate media (e.g., add video to audio-only call)
   *
   * @param options - Renegotiation options
   */
  renegotiate(options?: RenegotiateOptions): Promise<void>

  /**
   * Get call statistics
   */
  getStats(): Promise<CallStatistics>
}

/**
 * Call Options
 */
export interface CallOptions {
  /**
   * Media constraints
   */
  mediaConstraints?: MediaStreamConstraints

  /**
   * Extra SIP headers to include
   */
  extraHeaders?: string[]

  /**
   * Anonymous call (hide caller ID)
   */
  anonymous?: boolean

  /**
   * Custom SDP
   */
  customSDP?: string

  /**
   * RTCPeerConnection configuration
   */
  pcConfig?: RTCConfiguration
}

/**
 * Answer Options
 */
export interface AnswerOptions {
  /**
   * Media constraints for answering
   */
  mediaConstraints?: MediaStreamConstraints

  /**
   * Extra SIP headers to include in answer
   */
  extraHeaders?: string[]

  /**
   * RTCPeerConnection configuration
   */
  pcConfig?: RTCConfiguration
}

/**
 * DTMF Options
 */
export interface DTMFOptions {
  /**
   * Duration of each tone in milliseconds
   */
  duration?: number

  /**
   * Gap between tones in milliseconds
   */
  interToneGap?: number

  /**
   * Transport method: 'RFC2833' (RTP) or 'INFO' (SIP INFO)
   */
  transport?: 'RFC2833' | 'INFO'
}

/**
 * Renegotiate Options
 */
export interface RenegotiateOptions {
  /**
   * Updated media constraints
   */
  mediaConstraints?: MediaStreamConstraints

  /**
   * Use UPDATE instead of re-INVITE
   */
  useUpdate?: boolean
}

/**
 * Call Statistics
 */
export interface CallStatistics {
  /**
   * Audio statistics
   */
  audio?: {
    /** Bytes sent */
    bytesSent: number
    /** Bytes received */
    bytesReceived: number
    /** Packets sent */
    packetsSent: number
    /** Packets received */
    packetsReceived: number
    /** Packets lost */
    packetsLost: number
    /** Jitter in milliseconds */
    jitter: number
    /** Round-trip time in milliseconds */
    roundTripTime: number
    /** Current bitrate */
    bitrate: number
  }

  /**
   * Video statistics
   */
  video?: {
    /** Bytes sent */
    bytesSent: number
    /** Bytes received */
    bytesReceived: number
    /** Packets sent */
    packetsSent: number
    /** Packets received */
    packetsReceived: number
    /** Packets lost */
    packetsLost: number
    /** Frame rate */
    frameRate: number
    /** Resolution */
    resolution: { width: number; height: number }
    /** Current bitrate */
    bitrate: number
  }

  /**
   * Connection statistics
   */
  connection?: {
    /** Local ICE candidate type */
    localCandidateType: string
    /** Remote ICE candidate type */
    remoteCandidateType: string
    /** Available outgoing bitrate */
    availableOutgoingBitrate: number
    /** Available incoming bitrate */
    availableIncomingBitrate: number
  }
}

/**
 * Adapter Events
 *
 * Standardized events emitted by all SIP adapters
 */
export interface AdapterEvents {
  // Connection events
  'connection:connecting': void
  'connection:connected': void
  'connection:disconnected': { reason?: string }
  'connection:failed': { error: Error }

  // Registration events
  'registration:registering': void
  'registration:registered': { expires: number }
  'registration:unregistered': void
  'registration:failed': { error: Error; statusCode?: number }

  // Call events
  'call:incoming': { session: ICallSession }
  'call:outgoing': { session: ICallSession }

  // Message events
  'message:received': { from: string; content: string; contentType: string }

  // Presence events
  'presence:notification': { from: string; state: string; note?: string }

  // Error events
  'error': { error: Error; context: string }
}

/**
 * Call Session Events
 *
 * Standardized events emitted by call sessions
 */
export interface CallSessionEvents {
  'progress': { statusCode: number; reasonPhrase: string }
  'accepted': void
  'confirmed': void
  'ended': { cause: string; statusCode?: number }
  'failed': { cause: string; statusCode?: number }
  'hold': void
  'unhold': void
  'muted': void
  'unmuted': void
  'dtmf': { tone: string }
  'referred': { target: string }
  'localStream': { stream: MediaStream }
  'remoteStream': { stream: MediaStream }
  'iceConnectionStateChange': { state: RTCIceConnectionState }
  'iceGatheringStateChange': { state: RTCIceGatheringState }
  'signalingStateChange': { state: RTCSignalingState }
}
