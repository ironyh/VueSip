/**
 * Composables Entry Point
 *
 * Exports all Vue composables for VueSip library.
 *
 * @module composables
 */

// Core composables
export { useSipClient, type UseSipClientReturn } from './useSipClient'
export {
  useSipRegistration,
  type UseSipRegistrationReturn,
  type RegistrationOptions,
} from './useSipRegistration'
export {
  useCallSession,
  type UseCallSessionReturn,
  type CallSessionOptions,
} from './useCallSession'
export {
  useMediaDevices,
  type UseMediaDevicesReturn,
  type DeviceTestOptions,
} from './useMediaDevices'
export {
  useDTMF,
  type UseDTMFReturn,
  type DTMFSequenceOptions,
  type DTMFSendResult,
} from './useDTMF'

// Advanced composables
export { useCallHistory, type UseCallHistoryReturn } from './useCallHistory'
export { useCallControls, type UseCallControlsReturn, type ActiveTransfer } from './useCallControls'
export { usePresence, type UsePresenceReturn } from './usePresence'
export { useMessaging, type UseMessagingReturn, type Conversation } from './useMessaging'
export { useConference, type UseConferenceReturn } from './useConference'

// Constants
export {
  REGISTRATION_CONSTANTS,
  PRESENCE_CONSTANTS,
  MESSAGING_CONSTANTS,
  CONFERENCE_CONSTANTS,
  TRANSFER_CONSTANTS,
  HISTORY_CONSTANTS,
  CALL_CONSTANTS,
  MEDIA_CONSTANTS,
  DTMF_CONSTANTS,
  TIMEOUTS,
  RETRY_CONFIG,
} from './constants'
