// TODO: Add support for both jssip and sip.js libraries
// Current implementation uses sip.js API (Session)
// Future: Create adapter pattern to support both jssip.RTCSession and sip.js.Session
// @ts-expect-error - sip.js not installed yet, will support both libraries
import { Session } from 'sip.js'
import type { Ref } from 'vue'

export interface UseSipDtmfReturn {
  sendDtmf: (digit: string) => Promise<void>
  sendDtmfSequence: (digits: string, interval?: number) => Promise<void>
}

export function useSipDtmf(currentSession: Ref<Session | null>): UseSipDtmfReturn {
  const sendDtmf = async (digit: string) => {
    if (!currentSession.value) {
      throw new Error('No active session')
    }

    // Validate DTMF digit
    if (!/^[0-9*#A-D]$/.test(digit)) {
      throw new Error('Invalid DTMF digit')
    }

    try {
      // Send DTMF via RTP if available
      const sdh = currentSession.value.sessionDescriptionHandler as any
      const pc = sdh?.peerConnection
      if (pc) {
        const senders = pc.getSenders()
        const audioSender = senders.find((sender: RTCRtpSender) => sender.track?.kind === 'audio')

        if (audioSender && 'dtmf' in audioSender) {
          const dtmfSender = (audioSender as any).dtmf
          if (dtmfSender) {
            dtmfSender.insertDTMF(digit, 160, 70)
          }
        }
      }
    } catch (err) {
      throw new Error(`Failed to send DTMF: ${err}`)
    }
  }

  const sendDtmfSequence = async (digits: string, interval = 160) => {
    for (const digit of digits) {
      await sendDtmf(digit)
      await new Promise((resolve) => setTimeout(resolve, interval))
    }
  }

  return {
    sendDtmf,
    sendDtmfSequence,
  }
}
