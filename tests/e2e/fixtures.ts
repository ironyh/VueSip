/**
 * E2E Test Fixtures
 *
 * Provides utilities and mocks for E2E testing
 */

import { test as base, Page } from '@playwright/test'

/**
 * Mock SIP server configuration
 */
export interface MockSipServerConfig {
  uri: string
  username: string
  password: string
  autoRegister?: boolean
}

/**
 * Mock media device
 */
export interface MockMediaDevice {
  deviceId: string
  kind: 'audioinput' | 'audiooutput' | 'videoinput'
  label: string
  groupId: string
}

/**
 * Extended test fixtures
 */
export interface TestFixtures {
  /**
   * Configure mock SIP server responses
   */
  mockSipServer: (config?: Partial<MockSipServerConfig>) => Promise<void>

  /**
   * Configure mock media devices
   */
  mockMediaDevices: (devices?: MockMediaDevice[]) => Promise<void>

  /**
   * Simulate incoming call
   */
  simulateIncomingCall: (remoteUri: string) => Promise<void>

  /**
   * Configure SIP settings in the app
   */
  configureSip: (config: MockSipServerConfig) => Promise<void>

  /**
   * Wait for connection state
   */
  waitForConnectionState: (state: 'connected' | 'disconnected') => Promise<void>

  /**
   * Wait for registration state
   */
  waitForRegistrationState: (state: 'registered' | 'unregistered') => Promise<void>
}

/**
 * Default mock media devices
 */
const defaultMockDevices: MockMediaDevice[] = [
  {
    deviceId: 'default-mic',
    kind: 'audioinput',
    label: 'Default Microphone',
    groupId: 'group1',
  },
  {
    deviceId: 'mic-2',
    kind: 'audioinput',
    label: 'External Microphone',
    groupId: 'group2',
  },
  {
    deviceId: 'default-speaker',
    kind: 'audiooutput',
    label: 'Default Speaker',
    groupId: 'group1',
  },
  {
    deviceId: 'speaker-2',
    kind: 'audiooutput',
    label: 'External Speaker',
    groupId: 'group2',
  },
  {
    deviceId: 'default-camera',
    kind: 'videoinput',
    label: 'Default Camera',
    groupId: 'group3',
  },
]

/**
 * Mock WebSocket responses
 */
function mockWebSocketResponses(page: Page) {
  return page.addInitScript(() => {
    // Store original WebSocket
    const OriginalWebSocket = window.WebSocket

    // Mock WebSocket implementation
    class MockWebSocket extends EventTarget {
      url: string
      readyState = 0 // CONNECTING
      static CONNECTING = 0
      static OPEN = 1
      static CLOSING = 2
      static CLOSED = 3

      constructor(url: string) {
        super()
        this.url = url

        // Simulate connection after a delay
        setTimeout(() => {
          this.readyState = 1 // OPEN
          const openEvent = new Event('open')
          this.dispatchEvent(openEvent)
        }, 100)
      }

      send(data: string) {
        // Simulate SIP responses
        console.log('Mock WS send:', data)

        // Auto-respond to REGISTER
        if (data.includes('REGISTER')) {
          setTimeout(() => {
            const response =
              'SIP/2.0 200 OK\r\n' +
              'Via: SIP/2.0/WS fake;branch=z9hG4bK123\r\n' +
              'From: <sip:testuser@example.com>;tag=123\r\n' +
              'To: <sip:testuser@example.com>;tag=456\r\n' +
              'Call-ID: test-call-id\r\n' +
              'CSeq: 1 REGISTER\r\n' +
              'Contact: <sip:testuser@example.com>;expires=600\r\n' +
              'Content-Length: 0\r\n\r\n'

            const messageEvent = new MessageEvent('message', { data: response })
            this.dispatchEvent(messageEvent)
          }, 100)
        }

        // Auto-respond to INVITE
        if (data.includes('INVITE')) {
          setTimeout(() => {
            // Send 100 Trying
            const trying =
              'SIP/2.0 100 Trying\r\n' +
              'Via: SIP/2.0/WS fake;branch=z9hG4bK123\r\n' +
              'From: <sip:testuser@example.com>;tag=123\r\n' +
              'To: <sip:destination@example.com>\r\n' +
              'Call-ID: test-call-id-2\r\n' +
              'CSeq: 1 INVITE\r\n' +
              'Content-Length: 0\r\n\r\n'

            this.dispatchEvent(new MessageEvent('message', { data: trying }))

            // Send 180 Ringing
            setTimeout(() => {
              const ringing =
                'SIP/2.0 180 Ringing\r\n' +
                'Via: SIP/2.0/WS fake;branch=z9hG4bK123\r\n' +
                'From: <sip:testuser@example.com>;tag=123\r\n' +
                'To: <sip:destination@example.com>;tag=789\r\n' +
                'Call-ID: test-call-id-2\r\n' +
                'CSeq: 1 INVITE\r\n' +
                'Content-Length: 0\r\n\r\n'

              this.dispatchEvent(new MessageEvent('message', { data: ringing }))
            }, 100)
          }, 50)
        }
      }

      close() {
        this.readyState = 3 // CLOSED
        const closeEvent = new CloseEvent('close', { code: 1000, reason: 'Normal closure' })
        this.dispatchEvent(closeEvent)
      }
    }

    // Replace global WebSocket
    ;(window as any).WebSocket = MockWebSocket
  })
}

/**
 * Mock getUserMedia
 */
function mockGetUserMedia(page: Page, devices: MockMediaDevice[]) {
  return page.addInitScript((devicesJson: string) => {
    const devices = JSON.parse(devicesJson)

    // Mock getUserMedia
    navigator.mediaDevices.getUserMedia = async (constraints: MediaStreamConstraints) => {
      console.log('Mock getUserMedia called with:', constraints)

      // Create mock media stream
      const stream = new MediaStream()

      // Add mock audio track if requested
      if (constraints.audio) {
        const audioTrack = {
          id: 'mock-audio-track',
          kind: 'audio' as const,
          label: 'Mock Audio Track',
          enabled: true,
          muted: false,
          readyState: 'live' as const,
          stop: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
          getSettings: () => ({}),
          getCapabilities: () => ({}),
          getConstraints: () => ({}),
          applyConstraints: async () => {},
          clone: function () {
            return this
          },
          onended: null,
          onmute: null,
          onunmute: null,
          contentHint: '',
        } as any

        stream.addTrack(audioTrack)
      }

      // Add mock video track if requested
      if (constraints.video) {
        const videoTrack = {
          id: 'mock-video-track',
          kind: 'video' as const,
          label: 'Mock Video Track',
          enabled: true,
          muted: false,
          readyState: 'live' as const,
          stop: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
          getSettings: () => ({}),
          getCapabilities: () => ({}),
          getConstraints: () => ({}),
          applyConstraints: async () => {},
          clone: function () {
            return this
          },
          onended: null,
          onmute: null,
          onunmute: null,
          contentHint: '',
        } as any

        stream.addTrack(videoTrack)
      }

      return stream
    }

    // Mock enumerateDevices
    navigator.mediaDevices.enumerateDevices = async () => {
      return devices.map(
        (d: MockMediaDevice) =>
          ({
            deviceId: d.deviceId,
            kind: d.kind,
            label: d.label,
            groupId: d.groupId,
            toJSON: () => d,
          }) as MediaDeviceInfo
      )
    }
  }, JSON.stringify(devices))
}

/**
 * Mock RTCPeerConnection
 */
function mockRTCPeerConnection(page: Page) {
  return page.addInitScript(() => {
    // Store original RTCPeerConnection
    const OriginalRTCPeerConnection = window.RTCPeerConnection

    class MockRTCPeerConnection extends EventTarget {
      localDescription: RTCSessionDescription | null = null
      remoteDescription: RTCSessionDescription | null = null
      signalingState: RTCSignalingState = 'stable'
      iceConnectionState: RTCIceConnectionState = 'new'
      connectionState: RTCPeerConnectionState = 'new'
      iceGatheringState: RTCIceGatheringState = 'new'

      constructor(configuration?: RTCConfiguration) {
        super()
        console.log('Mock RTCPeerConnection created with config:', configuration)

        // Simulate ICE gathering
        setTimeout(() => {
          this.iceGatheringState = 'complete'
          const event = new Event('icegatheringstatechange')
          this.dispatchEvent(event)
        }, 100)

        // Simulate connection
        setTimeout(() => {
          this.iceConnectionState = 'connected'
          this.connectionState = 'connected'
          this.dispatchEvent(new Event('iceconnectionstatechange'))
          this.dispatchEvent(new Event('connectionstatechange'))
        }, 200)
      }

      async createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit> {
        return {
          type: 'offer',
          sdp: 'v=0\r\no=- 123 456 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE audio\r\n',
        }
      }

      async createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
        return {
          type: 'answer',
          sdp: 'v=0\r\no=- 789 012 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE audio\r\n',
        }
      }

      async setLocalDescription(description?: RTCSessionDescriptionInit): Promise<void> {
        this.localDescription = description as RTCSessionDescription
        this.signalingState = description?.type === 'offer' ? 'have-local-offer' : 'stable'
      }

      async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
        this.remoteDescription = description as RTCSessionDescription
        this.signalingState = description.type === 'offer' ? 'have-remote-offer' : 'stable'
      }

      addTrack(track: MediaStreamTrack, ...streams: MediaStream[]): RTCRtpSender {
        return {} as RTCRtpSender
      }

      addIceCandidate(candidate?: RTCIceCandidateInit): Promise<void> {
        return Promise.resolve()
      }

      close(): void {
        this.connectionState = 'closed'
        this.iceConnectionState = 'closed'
      }

      getStats(): Promise<RTCStatsReport> {
        return Promise.resolve(new Map() as RTCStatsReport)
      }

      getSenders(): RTCRtpSender[] {
        return []
      }

      getReceivers(): RTCRtpReceiver[] {
        return []
      }

      getTransceivers(): RTCRtpTransceiver[] {
        return []
      }
    }

    // Replace global RTCPeerConnection
    ;(window as any).RTCPeerConnection = MockRTCPeerConnection
  })
}

/**
 * Extended test with fixtures
 */
export const test = base.extend<TestFixtures>({
  mockSipServer: async ({ page }, use) => {
    await use(async (config?: Partial<MockSipServerConfig>) => {
      await mockWebSocketResponses(page)
      await mockRTCPeerConnection(page)
    })
  },

  mockMediaDevices: async ({ page }, use) => {
    await use(async (devices?: MockMediaDevice[]) => {
      await mockGetUserMedia(page, devices || defaultMockDevices)
    })
  },

  simulateIncomingCall: async ({ page }, use) => {
    await use(async (remoteUri: string) => {
      // Inject script to simulate incoming call
      await page.evaluate((uri: string) => {
        // This would trigger an incoming call in the actual implementation
        console.log('Simulating incoming call from:', uri)
        // Note: This is a placeholder - actual implementation would need
        // to trigger the VueSip library's incoming call handler
      }, remoteUri)
    })
  },

  configureSip: async ({ page }, use) => {
    await use(async (config: MockSipServerConfig) => {
      // Fill in SIP configuration
      await page.click('[data-testid="settings-button"]')
      await page.fill('[data-testid="sip-uri-input"]', config.username)
      await page.fill('[data-testid="password-input"]', config.password)
      await page.fill('[data-testid="server-uri-input"]', config.uri)
      await page.click('[data-testid="save-settings-button"]')
      await page.click('[data-testid="settings-button"]') // Close settings
    })
  },

  waitForConnectionState: async ({ page }, use) => {
    await use(async (state: 'connected' | 'disconnected') => {
      const regex = state === 'connected' ? /connected/i : /disconnected/i
      await page.waitForSelector(`[data-testid="connection-status"]:has-text("${state}")`, {
        timeout: 10000,
      })
    })
  },

  waitForRegistrationState: async ({ page }, use) => {
    await use(async (state: 'registered' | 'unregistered') => {
      const regex = state === 'registered' ? /registered/i : /unregistered/i
      await page.waitForSelector(`[data-testid="registration-status"]:has-text("${state}")`, {
        timeout: 10000,
      })
    })
  },
})

export { expect } from '@playwright/test'
